import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { writeFileSync } from 'fs';

async function testGetCompanyFacts() {
  // Create transport to connect to MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['/Users/bdaniels/personal/stocks-insider/mcp-server/dist/index.js']
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {
      tools: {}
    }
  });

  try {
    await client.connect(transport);
    
    // Call get_company_facts for South Bow Corp
    const result = await client.callTool({
      name: 'get_company_facts',
      arguments: { cik: '0002019061' }
    });

    const response = result.content[0]?.text || 'No response';
    
    // Write response to file
    writeFileSync('/Users/bdaniels/personal/stocks-insider/server/resp_sobo_facts.txt', response);
    console.log('Response written to resp_sobo_facts.txt');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testGetCompanyFacts();