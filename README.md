# Stocks Insider Proof of Concept

This project demonstrates a TypeScript full-stack application that provides comprehensive stock data including:
- Recent insider transactions (Forms 3/4/5) from the U.S. SEC
- Current stock prices and historical data
- Ownership breakdown (insider/institutional/public)
- Financial metrics for CANSLIM analysis

## Project layout

- `server` – Express + TypeScript API that integrates multiple data sources with intelligent caching and rate limiting
- `client` – Vite + React TypeScript single-page app with ticker validation and transaction tables

## Prerequisites

- Node.js 18+
- npm

## API Keys Setup

This application integrates with multiple free-tier stock data APIs. You'll need to sign up for API keys:

### Required API Keys

1. **Alpha Vantage** (Stock prices & historical data)
   - Sign up: https://www.alphavantage.co/support/#api-key
   - Free tier: 25 requests/day
   - Used for: Current prices, historical OHLCV data

2. **Financial Modeling Prep** (Ownership & financial metrics)
   - Sign up: https://site.financialmodelingprep.com/developer/docs
   - Free tier: 250 requests/day
   - Used for: Ownership data, financial ratios, CANSLIM metrics

3. **SEC Edgar API** (Insider transactions)
   - No API key required
   - Requires User-Agent header with contact info

### Environment Variables

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Then edit `.env` with your credentials:

```bash
# SEC Edgar API Configuration
SEC_USER_AGENT="stocks-insider-poc/1.0 (your-email@example.com)"

# Alpha Vantage API Key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here

# Financial Modeling Prep API Key
FMP_API_KEY=your_fmp_api_key_here

# Server Configuration
PORT=3001
```

## Running the API (`/server`)

```bash
cd server
npm install
npm run dev
```

The development server starts on http://localhost:3001.

### API Endpoints

The server provides the following endpoints:

**Insider Transactions:**
- `GET /api/insiders?ticker=AAPL` - Get recent insider transactions

**Stock Data:**
- `GET /api/stock/price?ticker=AAPL` - Get current stock price
- `GET /api/stock/ownership?ticker=AAPL` - Get ownership breakdown
- `GET /api/stock/financials?ticker=AAPL` - Get financial metrics (CANSLIM)
- `GET /api/stock/historical?ticker=AAPL&days=50` - Get historical prices
- `GET /api/stock/rate-limits` - Check API rate limit status
- `POST /api/stock/clear-cache` - Clear all cached data

### Caching Strategy

The API implements intelligent caching to minimize external API calls:
- **Stock prices**: Cached for 1 hour
- **Ownership data**: Cached for 24 hours
- **Financial metrics**: Cached for 24 hours
- **Historical prices**: Cached for 1 hour
- **Insider transactions**: Persisted to `server/data/insiders.json` for 24 hours

### Rate Limiting

The server enforces rate limits to prevent quota exhaustion:
- Alpha Vantage: Max 25 requests/day, 12-second interval between requests
- FMP: Max 250 requests/day, 12-second interval between requests
- SEC: 250ms politeness delay between requests

When rate limits are exceeded, the API returns a 429 status with `retryAfter` information.

## Running the client (`/client`)

```bash
cd client
npm install
npm run dev
```

Vite serves the React app on http://localhost:5173 and proxies `/api` requests to the Express backend.

## Optional `make` helpers

From the repository root you can use:

- `make server-dev` – run the Express API with `SEC_USER_AGENT` applied.
- `make client-dev` – start the Vite dev server.
- `make server-build` / `make client-build` – compile each project.
- `make install` – install dependencies for both services.

## Notes

- The stack runs locally with no external database; normalized insider lookups persist to `server/data/insiders.json` via LowDB.
- Persisted entries are reused for 24 hours so repeat lookups avoid refetching the SEC data unless the cache expires.
- The API limits requests to the three most recent Form 3/4/5 filings per ticker and caches ticker lookups to reduce load against SEC endpoints.
- If you deploy the client separately, configure an environment variable (e.g. `VITE_API_BASE_URL`) or update the fetch call to point at the deployed API host.
