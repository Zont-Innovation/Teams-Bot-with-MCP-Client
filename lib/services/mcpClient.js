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
exports.MCPClient = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const child_process_1 = require("child_process");
/**
 * MCP Client Service
 * Manages connection to the local MCP server and handles tool execution
 */
class MCPClient {
    constructor(serverPath) {
        this.serverPath = serverPath;
        this.client = null;
        this.transport = null;
        this.serverProcess = null;
        this.isConnected = false;
    }
    /**
     * Connect to the MCP server
     */
    connect() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isConnected) {
                console.log('MCP Client already connected');
                return;
            }
            try {
                console.log(`Starting MCP server from: ${this.serverPath}`);
                // Spawn the MCP server process
                this.serverProcess = (0, child_process_1.spawn)('node', [this.serverPath], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: false
                });
                // Log stderr for debugging
                (_a = this.serverProcess.stderr) === null || _a === void 0 ? void 0 : _a.on('data', (data) => {
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
                this.transport = new stdio_js_1.StdioClientTransport({
                    command: 'node',
                    args: [this.serverPath]
                });
                // Create MCP client
                this.client = new index_js_1.Client({
                    name: 'teams-bot-mcp-client',
                    version: '1.0.0'
                }, {
                    capabilities: {}
                });
                // Connect to the server
                yield this.client.connect(this.transport);
                this.isConnected = true;
                console.log('MCP Client connected successfully');
                // List available tools
                const tools = yield this.listTools();
                console.log('Available MCP tools:', tools.map(t => t.name).join(', '));
            }
            catch (error) {
                console.error('Failed to connect to MCP server:', error);
                throw error;
            }
        });
    }
    /**
     * List available tools from the MCP server
     */
    listTools() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.client) {
                throw new Error('MCP Client not connected');
            }
            try {
                const response = yield this.client.listTools();
                return response.tools || [];
            }
            catch (error) {
                console.error('Failed to list MCP tools:', error);
                throw error;
            }
        });
    }
    /**
     * Call a tool on the MCP server
     */
    callTool(toolName, args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.client) {
                throw new Error('MCP Client not connected');
            }
            try {
                console.log(`Calling MCP tool: ${toolName}`, args);
                const response = yield this.client.callTool({
                    name: toolName,
                    arguments: args
                });
                console.log('MCP tool response:', response);
                return response;
            }
            catch (error) {
                console.error(`Failed to call MCP tool ${toolName}:`, error);
                throw error;
            }
        });
    }
    /**
     * Disconnect from the MCP server
     */
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConnected) {
                return;
            }
            try {
                if (this.client) {
                    yield this.client.close();
                    this.client = null;
                }
                if (this.serverProcess) {
                    this.serverProcess.kill();
                    this.serverProcess = null;
                }
                this.transport = null;
                this.isConnected = false;
                console.log('MCP Client disconnected');
            }
            catch (error) {
                console.error('Error disconnecting MCP client:', error);
            }
        });
    }
    /**
     * Check if client is connected
     */
    isClientConnected() {
        return this.isConnected;
    }
}
exports.MCPClient = MCPClient;
//# sourceMappingURL=mcpClient.js.map