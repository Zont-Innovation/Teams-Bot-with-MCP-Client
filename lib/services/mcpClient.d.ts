/**
 * MCP Client Service
 * Manages connection to the local MCP server and handles tool execution
 */
export declare class MCPClient {
    private serverPath;
    private client;
    private transport;
    private serverProcess;
    private isConnected;
    constructor(serverPath: string);
    /**
     * Connect to the MCP server
     */
    connect(): Promise<void>;
    /**
     * List available tools from the MCP server
     */
    listTools(): Promise<any[]>;
    /**
     * Call a tool on the MCP server
     */
    callTool(toolName: string, args: Record<string, any>): Promise<any>;
    /**
     * Disconnect from the MCP server
     */
    disconnect(): Promise<void>;
    /**
     * Check if client is connected
     */
    isClientConnected(): boolean;
}
