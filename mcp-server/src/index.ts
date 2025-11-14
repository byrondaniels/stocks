/**
 * SEC EDGAR MCP Server
 * Provides MCP tools for accessing SEC EDGAR financial data
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { searchCompany, getFilings, getCompanyFacts, getFinancialStatements } from './sec-edgar-api.js';

// Create MCP server  
const server = new FastMCP({
  name: 'sec-edgar-server',
  version: '1.0.0'
});

// Tool: Search Company
server.addTool({
  name: 'search_company',
  description: 'Search for a company by ticker symbol or name to get CIK',
  parameters: z.object({
    query: z.string().describe('Company ticker symbol or name to search for')
  }),
  execute: async (args) => {
    try {
      const { query } = args;
      console.log(`[MCP] Searching for company: ${query}`);
      
      const results = await searchCompany(query);
      
      return JSON.stringify({
        success: true,
        data: results,
        message: `Found ${results.length} companies matching "${query}"`
      }, null, 2);
    } catch (error) {
      console.error('[MCP] Error in search_company:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      }, null, 2);
    }
  }
});

// Tool: Get Filings
server.addTool({
  name: 'get_filings',
  description: 'Get recent SEC filings for a company by CIK',
  parameters: z.object({
    cik: z.string().describe('Company CIK (Central Index Key)'),
    form: z.enum(['10-K', '10-Q', '8-K', 'DEF 14A', 'Form 10', 'S-1', 'S-4']).optional().describe('Filter by form type'),
    count: z.number().min(1).max(100).default(10).describe('Number of filings to retrieve')
  }),
  execute: async (args) => {
    try {
      const { cik, form, count = 10 } = args;
      console.log(`[MCP] Getting filings for CIK: ${cik}, form: ${form || 'all'}`);
      
      const filings = await getFilings(cik, form, count);
      
      return JSON.stringify({
        success: true,
        data: filings,
        message: `Found ${filings.length} filings for CIK ${cik}`
      }, null, 2);
    } catch (error) {
      console.error('[MCP] Error in get_filings:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      }, null, 2);
    }
  }
});

// Tool: Get Financial Statements
server.addTool({
  name: 'get_financial_statements',
  description: 'Extract financial data from XBRL filing',
  parameters: z.object({
    cik: z.string().describe('Company CIK (Central Index Key)'),
    accessionNumber: z.string().describe('Filing accession number (e.g., "0000320193-23-000077")')
  }),
  execute: async (args) => {
    try {
      const { cik, accessionNumber } = args;
      console.log(`[MCP] Getting financial statements for CIK: ${cik}, filing: ${accessionNumber}`);
      
      const statements = await getFinancialStatements(cik, accessionNumber);
      
      return JSON.stringify({
        success: true,
        data: statements,
        message: `Extracted ${statements.length} financial statement items`
      }, null, 2);
    } catch (error) {
      console.error('[MCP] Error in get_financial_statements:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      }, null, 2);
    }
  }
});

// Tool: Get Company Facts
server.addTool({
  name: 'get_company_facts',
  description: 'Get standardized financial facts for a company',
  parameters: z.object({
    cik: z.string().describe('Company CIK (Central Index Key)')
  }),
  execute: async (args) => {
    try {
      const { cik } = args;
      console.log(`[MCP] Getting company facts for CIK: ${cik}`);
      
      const facts = await getCompanyFacts(cik);
      
      // Extract key metrics for easier consumption
      const keyMetrics: any = {
        company: facts.entityName,
        cik: facts.cik,
        sic: facts.sic,
        sicDescription: facts.sicDescription,
        metrics: {}
      };

      if (facts?.facts) {
        const usgaap = facts.facts['us-gaap'] || {};
        
        // Extract recent values for key metrics
        const extractLatestValue = (concept: string) => {
          const data = usgaap[concept];
          if (data?.units?.USD) {
            const latest = data.units.USD[data.units.USD.length - 1];
            return {
              value: latest?.val,
              period: latest?.end || latest?.period,
              label: data.label
            };
          }
          return null;
        };

        // Key financial metrics
        const keyConceptMap = {
          revenue: 'Revenues',
          netIncome: 'NetIncomeLoss',
          totalAssets: 'Assets',
          totalLiabilities: 'Liabilities',
          stockholdersEquity: 'StockholdersEquity',
          operatingIncome: 'OperatingIncomeLoss',
          interestExpense: 'InterestExpense',
          cashAndEquivalents: 'CashAndCashEquivalentsAtCarryingValue',
          currentAssets: 'AssetsCurrent',
          currentLiabilities: 'LiabilitiesCurrent'
        };

        for (const [key, concept] of Object.entries(keyConceptMap)) {
          const metric = extractLatestValue(concept);
          if (metric) {
            keyMetrics.metrics[key] = metric;
          }
        }
      }
      
      return JSON.stringify({
        success: true,
        data: {
          raw: facts,
          keyMetrics: keyMetrics
        },
        message: `Retrieved company facts for ${facts.entityName || cik}`
      }, null, 2);
    } catch (error) {
      console.error('[MCP] Error in get_company_facts:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      }, null, 2);
    }
  }
});

// Start the server
const PORT = parseInt(process.env.MCP_PORT || '3002');

async function startServer() {
  try {
    // Start with stdio transport for MCP client connections
    await server.start({
      transportType: 'stdio'
    });
    console.error(`🚀 SEC EDGAR MCP Server running on STDIO`);
    console.error(`📊 Available tools:`);
    console.error(`   - search_company: Find company by ticker/name`);
    console.error(`   - get_filings: Get SEC filings by CIK`);
    console.error(`   - get_financial_statements: Extract XBRL financial data`);
    console.error(`   - get_company_facts: Get standardized financial metrics`);
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down SEC EDGAR MCP Server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down SEC EDGAR MCP Server...');
  server.stop();
  process.exit(0);
});

startServer();