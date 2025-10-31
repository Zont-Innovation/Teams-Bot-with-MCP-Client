// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActivityHandler, MessageFactory } from 'botbuilder';
import { OpenAIService } from './services/openaiService';
import { MCPClient } from './services/mcpClient';

export class EchoBot extends ActivityHandler {
    private openaiService: OpenAIService;
    private mcpClient: MCPClient;

    constructor(openaiApiKey: string, openaiEndpoint: string | undefined, openaiModel: string, mcpServerPath: string) {
        super();

        // Initialize MCP client and OpenAI service
        this.mcpClient = new MCPClient(mcpServerPath);
        this.openaiService = new OpenAIService(openaiApiKey, openaiEndpoint, openaiModel, this.mcpClient);

        // Connect to MCP server on initialization
        this.initializeMCPClient();

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            const userMessage = context.activity.text;

            try {
                console.log(`Processing message: ${userMessage}`);

                // Send typing indicator to show bot is working
                await context.sendActivity({ type: 'typing' });

                // Ensure MCP client is connected
                if (!this.mcpClient.isClientConnected()) {
                    await this.mcpClient.connect();
                }

                // Process message through OpenAI with MCP tools
                const response = await this.openaiService.processMessage(userMessage);

                // Send response back to Teams
                await context.sendActivity(MessageFactory.text(response, response));

                console.log('Response sent successfully');
            } catch (error) {
                console.error('Error processing message:', error);

                // Send detailed error message to user
                const errorMessage = `❌ **Error Processing Request**\n\n${error instanceof Error ? error.message : String(error)}\n\nPlease try again or contact support if the issue persists.`;
                await context.sendActivity(MessageFactory.text(errorMessage, errorMessage));
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome! I\'m your Sitecore content management assistant powered by AI. I can help you search and replace content in Sitecore. Just ask me what you need!';
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    /**
     * Initialize MCP client connection
     */
    private async initializeMCPClient(): Promise<void> {
        try {
            await this.mcpClient.connect();
            console.log('MCP Client initialized successfully');
        } catch (error) {
            console.error('Failed to initialize MCP client:', error);
            console.error('Bot will attempt to reconnect when receiving messages');
        }
    }

    /**
     * Cleanup method to disconnect MCP client
     */
    async dispose(): Promise<void> {
        await this.mcpClient.disconnect();
    }
}
