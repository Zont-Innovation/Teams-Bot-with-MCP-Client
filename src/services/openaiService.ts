// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import OpenAI from 'openai';
import { MCPClient } from './mcpClient';

/**
 * OpenAI Service
 * Handles interactions with OpenAI API including function calling for MCP tools
 */
export class OpenAIService {
    private openai: OpenAI;
    private mcpClient: MCPClient;
    private model: string;
    private systemPrompt: string = `You are a Sitecore content management expert assistant. You help users manage and modify content in Sitecore using available tools.

CRITICAL FORMATTING RULES:
1. Keep responses BRIEF and CONCISE
2. Put a period (.) after each metric number to separate them
3. Do NOT include "Dry run" parameter in output

Response format for operations:
- First line: State what was done in one clear sentence with the path
- Blank line
- Then list all metrics with a period after each number value

EXACT format to follow:
"The search and replacement of the text 'SiteCore' to 'Sitecore' has been completed successfully under the path /sitecore/content/Zont.

Total items scanned: 200. Items with hits: 196. Field replacements made: 579. Elapsed time: 13s."

Do NOT include:
- Dry run parameter
- Verbose pleasantries or filler text
- Explanations of what you're about to do`;

    constructor(apiKey: string, endpoint: string | undefined, model: string, mcpClient: MCPClient) {
        this.model = model;
        this.mcpClient = mcpClient;

        // Detect if endpoint is Azure-based
        const isAzure = endpoint && (
            endpoint.includes('cognitiveservices.azure.com') ||
            endpoint.includes('openai.azure.com')
        );

        if (isAzure) {
            // Configure for Azure AI Foundry / Azure OpenAI
            const baseURL = `${endpoint!.replace(/\/$/, '')}/openai/deployments/${model}`;

            this.openai = new OpenAI({
                apiKey: apiKey,
                baseURL: baseURL,
                defaultQuery: { 'api-version': '2024-06-01' },
                defaultHeaders: {
                    'api-key': apiKey
                }
            });
            console.log('OpenAI client configured for Azure AI Foundry');
            console.log('Base URL:', baseURL);
        } else if (endpoint) {
            // Use custom endpoint (e.g., OpenAI with custom baseURL)
            this.openai = new OpenAI({
                apiKey: apiKey,
                baseURL: endpoint.replace(/\/$/, '')
            });
            console.log('OpenAI client configured with custom endpoint');
            console.log('Base URL:', endpoint);
        } else {
            // Use OpenAI directly with default endpoint
            this.openai = new OpenAI({
                apiKey: apiKey
            });
            console.log('OpenAI client configured for OpenAI direct (default endpoint)');
        }
    }

    /**
     * Process a user message with OpenAI, using MCP tools when needed
     */
    async processMessage(userMessage: string): Promise<string> {
        try {
            // Get available MCP tools
            const mcpTools = await this.mcpClient.listTools();

            // Convert MCP tools to OpenAI function format
            const functions = this.convertMCPToolsToOpenAIFunctions(mcpTools);

            // Initial OpenAI call
            let messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: userMessage }
            ];

            let response = await this.openai.chat.completions.create({
                model: this.model,
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
                        const toolResponse = await this.mcpClient.callTool(functionName, functionArgs);

                        // Extract text from MCP response
                        const toolResult = this.extractTextFromMCPResponse(toolResponse);

                        // Add tool response to conversation
                        messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: toolResult
                        });

                        console.log(`Tool ${functionName} executed successfully`);
                    } catch (error) {
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
                response = await this.openai.chat.completions.create({
                    model: this.model,
                    messages: messages,
                    tools: functions,
                    tool_choice: 'auto'
                });

                assistantMessage = response.choices[0].message;
            }

            // Return final response
            return assistantMessage.content || 'I apologize, but I could not generate a response.';
        } catch (error) {
            console.error('Error processing message with OpenAI:', error);
            throw error;
        }
    }

    /**
     * Convert MCP tools to OpenAI function format
     */
    private convertMCPToolsToOpenAIFunctions(mcpTools: any[]): OpenAI.Chat.ChatCompletionTool[] {
        return mcpTools.map(tool => {
            const parameters: any = {
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
    private extractTextFromMCPResponse(response: any): string {
        if (!response || !response.content) {
            return 'Operation completed successfully.';
        }

        // MCP responses have content array
        if (Array.isArray(response.content)) {
            const textContent = response.content
                .filter((item: any) => item.type === 'text')
                .map((item: any) => item.text)
                .join('\n\n');

            return textContent || 'Operation completed successfully.';
        }

        return String(response.content);
    }
}
