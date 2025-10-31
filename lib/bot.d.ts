import { ActivityHandler } from 'botbuilder';
export declare class EchoBot extends ActivityHandler {
    private openaiService;
    private mcpClient;
    constructor(openaiApiKey: string, openaiEndpoint: string | undefined, openaiModel: string, mcpServerPath: string);
    /**
     * Initialize MCP client connection
     */
    private initializeMCPClient;
    /**
     * Cleanup method to disconnect MCP client
     */
    dispose(): Promise<void>;
}
