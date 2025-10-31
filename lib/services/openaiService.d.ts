import { MCPClient } from './mcpClient';
/**
 * OpenAI Service
 * Handles interactions with OpenAI API including function calling for MCP tools
 */
export declare class OpenAIService {
    private openai;
    private mcpClient;
    private model;
    private systemPrompt;
    constructor(apiKey: string, endpoint: string | undefined, model: string, mcpClient: MCPClient);
    /**
     * Process a user message with OpenAI, using MCP tools when needed
     */
    processMessage(userMessage: string): Promise<string>;
    /**
     * Convert MCP tools to OpenAI function format
     */
    private convertMCPToolsToOpenAIFunctions;
    /**
     * Extract text content from MCP response
     */
    private extractTextFromMCPResponse;
}
