// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';

/**
 * MCP Client Service
 * Manages connection to the local MCP server and handles tool execution
 */
export class MCPClient {
    private client: Client | null = null;
    private transport: StdioClientTransport | null = null;
    private serverProcess: ChildProcess | null = null;
    private isConnected: boolean = false;

    constructor(private serverPath: string) {}

    /**
     * Connect to the MCP server
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            console.log('MCP Client already connected');
            return;
        }

        try {
            console.log(`Starting MCP server from: ${this.serverPath}`);

            // Spawn the MCP server process
            this.serverProcess = spawn('node', [this.serverPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: false
            });

            // Log stderr for debugging
            this.serverProcess.stderr?.on('data', (data) => {
                console.log(`[MCP Server] ${data.toString()}`);
            });

            // Handle process errors
            this.serverProcess.on('error', (error) => {
                console.error('MCP Server process error:', error);
            });

            this.serverProcess.on('exit', (code) => {
                console.log(`MCP Server process exited with code ${code}`);
                this.isConnected = false;
            });

            // Create transport using the spawned process
            this.transport = new StdioClientTransport({
                command: 'node',
                args: [this.serverPath]
            });

            // Create MCP client
            this.client = new Client({
                name: 'teams-bot-mcp-client',
                version: '1.0.0'
            }, {
                capabilities: {}
            });

            // Connect to the server
            await this.client.connect(this.transport);
            this.isConnected = true;

            console.log('MCP Client connected successfully');

            // List available tools
            const tools = await this.listTools();
            console.log('Available MCP tools:', tools.map(t => t.name).join(', '));
        } catch (error) {
            console.error('Failed to connect to MCP server:', error);
            throw error;
        }
    }

    /**
     * List available tools from the MCP server
     */
    async listTools(): Promise<any[]> {
        if (!this.client) {
            throw new Error('MCP Client not connected');
        }

        try {
            const response = await this.client.listTools();
            return response.tools || [];
        } catch (error) {
            console.error('Failed to list MCP tools:', error);
            throw error;
        }
    }

    /**
     * Call a tool on the MCP server
     */
    async callTool(toolName: string, args: Record<string, any>): Promise<any> {
        if (!this.client) {
            throw new Error('MCP Client not connected');
        }

        try {
            console.log(`Calling MCP tool: ${toolName}`, args);
            const response = await this.client.callTool({
                name: toolName,
                arguments: args
            });
            console.log('MCP tool response:', response);
            return response;
        } catch (error) {
            console.error(`Failed to call MCP tool ${toolName}:`, error);
            throw error;
        }
    }

    /**
     * Disconnect from the MCP server
     */
    async disconnect(): Promise<void> {
        if (!this.isConnected) {
            return;
        }

        try {
            if (this.client) {
                await this.client.close();
                this.client = null;
            }

            if (this.serverProcess) {
                this.serverProcess.kill();
                this.serverProcess = null;
            }

            this.transport = null;
            this.isConnected = false;

            console.log('MCP Client disconnected');
        } catch (error) {
            console.error('Error disconnecting MCP client:', error);
        }
    }

    /**
     * Check if client is connected
     */
    isClientConnected(): boolean {
        return this.isConnected;
    }
}
