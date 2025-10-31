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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
/**
 * OpenAI Service
 * Handles interactions with OpenAI API including function calling for MCP tools
 */
class OpenAIService {
    constructor(apiKey, mcpClient) {
        this.systemPrompt = `You are a Sitecore content management expert assistant. You help users manage and modify content in Sitecore using available tools.

You have access to tools that can search and replace text in Sitecore content items. When users ask you to modify content, use these tools to help them.

Key capabilities:
- Search and replace text in Sitecore content
- Work with Sitecore content paths and items
- Understand Sitecore content structure

Always be helpful, accurate, and provide clear feedback about operations performed.`;
        this.openai = new openai_1.default({
            apiKey: apiKey
        });
        this.mcpClient = mcpClient;
    }
    /**
     * Process a user message with OpenAI, using MCP tools when needed
     */
    processMessage(userMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get available MCP tools
                const mcpTools = yield this.mcpClient.listTools();
                // Convert MCP tools to OpenAI function format
                const functions = this.convertMCPToolsToOpenAIFunctions(mcpTools);
                // Initial OpenAI call
                let messages = [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: userMessage }
                ];
                let response = yield this.openai.chat.completions.create({
                    model: 'gpt-4-turbo',
                    messages: messages,
                    tools: functions,
                    tool_choice: 'auto'
                });
                let assistantMessage = response.choices[0].message;
                // Handle function calls in a loop (for multi-turn function calling)
                while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                    console.log('OpenAI requested tool calls:', assistantMessage.tool_calls.length);
                    // Add assistant's message to conversation
                    messages.push(assistantMessage);
                    // Execute each tool call
                    for (const toolCall of assistantMessage.tool_calls) {
                        // Check if this is a function tool call
                        if (toolCall.type !== 'function') {
                            continue;
                        }
                        const functionName = toolCall.function.name;
                        const functionArgs = JSON.parse(toolCall.function.arguments);
                        console.log(`Executing MCP tool: ${functionName}`, functionArgs);
                        try {
                            // Call the MCP tool
                            const toolResponse = yield this.mcpClient.callTool(functionName, functionArgs);
                            // Extract text from MCP response
                            const toolResult = this.extractTextFromMCPResponse(toolResponse);
                            // Add tool response to conversation
                            messages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: toolResult
                            });
                            console.log(`Tool ${functionName} executed successfully`);
                        }
                        catch (error) {
                            console.error(`Error executing tool ${functionName}:`, error);
                            // Add error to conversation
                            messages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
                            });
                        }
                    }
                    // Get next response from OpenAI
                    response = yield this.openai.chat.completions.create({
                        model: 'gpt-4-turbo',
                        messages: messages,
                        tools: functions,
                        tool_choice: 'auto'
                    });
                    assistantMessage = response.choices[0].message;
                }
                // Return final response
                return assistantMessage.content || 'I apologize, but I could not generate a response.';
            }
            catch (error) {
                console.error('Error processing message with OpenAI:', error);
                throw error;
            }
        });
    }
    /**
     * Convert MCP tools to OpenAI function format
     */
    convertMCPToolsToOpenAIFunctions(mcpTools) {
        return mcpTools.map(tool => {
            const parameters = {
                type: 'object',
                properties: {},
                required: []
            };
            // Convert input schema to OpenAI format
            if (tool.inputSchema && tool.inputSchema.properties) {
                parameters.properties = tool.inputSchema.properties;
                // Extract required fields
                if (tool.inputSchema.required) {
                    parameters.required = tool.inputSchema.required;
                }
            }
            return {
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description || '',
                    parameters: parameters
                }
            };
        });
    }
    /**
     * Extract text content from MCP response
     */
    extractTextFromMCPResponse(response) {
        if (!response || !response.content) {
            return 'Operation completed successfully.';
        }
        // MCP responses have content array
        if (Array.isArray(response.content)) {
            const textContent = response.content
                .filter((item) => item.type === 'text')
                .map((item) => item.text)
                .join('\n\n');
            return textContent || 'Operation completed successfully.';
        }
        return String(response.content);
    }
}
exports.OpenAIService = OpenAIService;
//# sourceMappingURL=openaiService.js.map