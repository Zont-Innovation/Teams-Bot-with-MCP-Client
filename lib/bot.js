"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EchoBot = void 0;
const botbuilder_1 = require("botbuilder");
const openaiService_1 = require("./services/openaiService");
const mcpClient_1 = require("./services/mcpClient");
class EchoBot extends botbuilder_1.ActivityHandler {
    constructor(openaiApiKey, mcpServerPath) {
        super();
        // Initialize MCP client and OpenAI service
        this.mcpClient = new mcpClient_1.MCPClient(mcpServerPath);
        this.openaiService = new openaiService_1.OpenAIService(openaiApiKey, this.mcpClient);
        // Connect to MCP server on initialization
        this.initializeMCPClient();
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage((context, next) => __awaiter(this, void 0, void 0, function* () {
            const userMessage = context.activity.text;
            try {
                console.log(`Processing message: ${userMessage}`);
                // Send typing indicator to show bot is working
                yield context.sendActivity({ type: 'typing' });
                // Ensure MCP client is connected
                if (!this.mcpClient.isClientConnected()) {
                    yield this.mcpClient.connect();
                }
                // Process message through OpenAI with MCP tools
                const response = yield this.openaiService.processMessage(userMessage);
                // Send response back to Teams
                yield context.sendActivity(botbuilder_1.MessageFactory.text(response, response));
                console.log('Response sent successfully');
            }
            catch (error) {
                console.error('Error processing message:', error);
                // Send detailed error message to user
                const errorMessage = `❌ **Error Processing Request**\n\n${error instanceof Error ? error.message : String(error)}\n\nPlease try again or contact support if the issue persists.`;
                yield context.sendActivity(botbuilder_1.MessageFactory.text(errorMessage, errorMessage));
            }
            // By calling next() you ensure that the next BotHandler is run.
            yield next();
        }));
        this.onMembersAdded((context, next) => __awaiter(this, void 0, void 0, function* () {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome! I\'m your Sitecore content management assistant powered by AI. I can help you search and replace content in Sitecore. Just ask me what you need!';
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    yield context.sendActivity(botbuilder_1.MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            yield next();
        }));
    }
    /**
     * Initialize MCP client connection
     */
    initializeMCPClient() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.mcpClient.connect();
                console.log('MCP Client initialized successfully');
            }
            catch (error) {
                console.error('Failed to initialize MCP client:', error);
                console.error('Bot will attempt to reconnect when receiving messages');
            }
        });
    }
    /**
     * Cleanup method to disconnect MCP client
     */
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.mcpClient.disconnect();
        });
    }
}
exports.EchoBot = EchoBot;
//# sourceMappingURL=bot.js.map