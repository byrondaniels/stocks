/**
 * Shared MCP (Model Context Protocol) utilities
 * Centralizes MCP client creation and configuration
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Creates an MCP client connection to SEC EDGAR server
 *
 * The MCP server path is configured via environment variable.
 * This allows the path to be different on different systems.
 *
 * @returns Connected MCP client instance
 * @throws {Error} If MCP_SERVER_PATH is not configured
 *
 * @example
 * const mcpClient = await createMCPClient();
 * try {
 *   const result = await mcpClient.callTool({ name: 'search_company', arguments: { query: 'AAPL' } });
 * } finally {
 *   await mcpClient.close();
 * }
 */
export async function createMCPClient(): Promise<Client> {
  const mcpServerPath = process.env.MCP_SERVER_PATH;

  if (!mcpServerPath) {
    throw new Error(
      'MCP_SERVER_PATH environment variable is not configured. ' +
      'Please set it to the path of your MCP server (e.g., /path/to/mcp-server/dist/index.js)'
    );
  }

  const transport = new StdioClientTransport({
    command: 'node',
    args: [mcpServerPath]
  });

  const client = new Client(
    {
      name: 'stocks-analyzer',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  await client.connect(transport);
  return client;
}

/**
 * Safely executes an operation with an MCP client, ensuring cleanup
 *
 * @param operation - Async function that receives the MCP client
 * @returns Result from the operation
 *
 * @example
 * const searchResult = await withMCPClient(async (client) => {
 *   const result = await client.callTool({ name: 'search_company', arguments: { query: 'AAPL' } });
 *   return JSON.parse(result.content[0]?.text || '{}');
 * });
 */
export async function withMCPClient<T>(
  operation: (client: Client) => Promise<T>
): Promise<T> {
  const client = await createMCPClient();
  try {
    return await operation(client);
  } finally {
    await client.close();
  }
}
