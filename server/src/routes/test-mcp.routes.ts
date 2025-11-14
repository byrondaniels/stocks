/**
 * Simple test route for MCP functionality
 */
import { Request, Response as ExpressResponse, Router } from "express";
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { GoogleGenAI } from '@google/genai';

const router = Router();

/**
 * GET /api/test-mcp?ticker=AAPL
 * Simple test of MCP data retrieval and Gemini analysis
 */
router.get("/", async (req: Request, res: ExpressResponse) => {
  const ticker = req.query.ticker as string || 'AAPL';

  let mcpClient: Client | null = null;
  try {
    console.log(`[MCP-Test] Testing data retrieval for ${ticker}...`);

    // Connect to MCP
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['/Users/bdaniels/personal/stocks-insider/mcp-server/dist/index.js']
    });

    mcpClient = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, {
      capabilities: { tools: {} }
    });

    await mcpClient.connect(transport);

    // Get company info
    const searchResult = await mcpClient.callTool({
      name: 'search_company',
      arguments: { query: ticker }
    });

    const searchData = JSON.parse(searchResult.content[0]?.text || '{}');
    if (!searchData.success || !searchData.data?.length) {
      return res.json({
        success: false,
        error: 'Company not found'
      });
    }

    const company = searchData.data[0];

    // Get financial data
    const factsResult = await mcpClient.callTool({
      name: 'get_company_facts',
      arguments: { cik: company.cik }
    });

    const factsData = JSON.parse(factsResult.content[0]?.text || '{}');
    if (!factsData.success) {
      return res.json({
        success: false,
        error: 'Failed to get financial data',
        details: factsData.error
      });
    }

    const metrics = factsData.data.keyMetrics.metrics || {};

    // Analyze the data
    const revenue = metrics.revenue;
    const netIncome = metrics.netIncome;

    let profitMargin = null;
    if (revenue?.value && netIncome?.value) {
      profitMargin = ((netIncome.value / revenue.value) * 100).toFixed(2) + '%';
    }

    const analysisText = JSON.stringify({
      company: company.name,
      revenue_billions: revenue ? (revenue.value / 1e9).toFixed(1) : null,
      net_income_billions: netIncome ? (netIncome.value / 1e9).toFixed(1) : null,
      profit_margin_percent: profitMargin,
      data_source: `SEC EDGAR ${revenue?.period || 'N/A'}`
    });

    return res.json({
      success: true,
      company: company,
      raw_metrics: {
        available_metrics: Object.keys(metrics),
        revenue: revenue,
        net_income: netIncome
      },
      analysis: analysisText
    });

  } catch (error) {
    console.error('[TEST] Error:', error);
    return res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch (e) {
        console.error('[MCP-Test] Error closing client:', e);
      }
    }
  }
});

export default router;