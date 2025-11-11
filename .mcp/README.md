# MCP Setup for Spinoff Analysis

This directory contains Model Context Protocol (MCP) configuration for integrating SEC EDGAR data into the spinoff analysis feature.

## What is MCP?

Model Context Protocol (MCP) is a standard for connecting AI models to external data sources and tools. It allows the Gemini AI to directly query SEC EDGAR filings, financial statements, and company data.

## Setup Instructions

### Option 1: Using Official SEC EDGAR MCP Server (Recommended)

The SEC EDGAR MCP server will be automatically invoked via `npx` when needed. No installation required - it will run on-demand.

### Option 2: Manual Installation

If you prefer to install the MCP server globally:

```bash
npm install -g @modelcontextprotocol/server-sec-edgar
```

### Configuration

The MCP configuration is defined in `mcp-config.json`. It includes these tools:

1. **search_company**: Find company CIK by name or ticker
2. **get_filings**: Retrieve SEC filings (10-K, 8-K, Form 10, etc.)
3. **get_financial_statements**: Extract XBRL financial data
4. **get_company_facts**: Get standardized company facts

### Environment Variables

Ensure your `.env` file includes:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

### Testing MCP Connection

The spinoff analyzer will automatically attempt to use MCP tools when available. If MCP tools are not accessible, it will fall back to using available financial APIs and web scraping.

## Usage

When analyzing a spinoff, the system will:

1. Search for the company using `search_company`
2. Retrieve recent filings using `get_filings`
3. Extract financial data using `get_financial_statements`
4. Gather company facts using `get_company_facts`
5. Apply the spinoff analysis framework
6. Return comprehensive analysis with exact data sources

## Troubleshooting

- **MCP not connecting**: Check that Node.js and npx are available in your PATH
- **No data returned**: Verify the company ticker is valid and has SEC filings
- **Rate limiting**: SEC EDGAR has rate limits; add delays between requests if needed

## Notes

- MCP integration is optional - the analyzer will work without it but may have less accurate data
- SEC EDGAR data is public but subject to fair use policies
- Financial data may have reporting delays (typically quarterly)
