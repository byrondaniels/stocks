# CLAUDE.md - AI Assistant Development Guide

## Overview

This is a comprehensive guide for AI assistants (like Claude Code) working with the Stock Portfolio & Analysis Application. This document explains the codebase structure, development workflows, conventions, and best practices to help you work effectively with this project.

**Project Type**: Full-stack TypeScript monorepo
**Tech Stack**: React + Vite (frontend), Node.js + Express (backend), MongoDB (database)
**Purpose**: Stock portfolio management with AI-powered CANSLIM analysis, insider trading tracking, and market health monitoring

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Architecture](#project-architecture)
3. [Directory Structure](#directory-structure)
4. [Development Workflows](#development-workflows)
5. [Key Conventions](#key-conventions)
6. [Common Tasks](#common-tasks)
7. [API Patterns](#api-patterns)
8. [Database Models](#database-models)
9. [Testing Guidelines](#testing-guidelines)
10. [Best Practices for AI Assistants](#best-practices-for-ai-assistants)

---

## Quick Start

### Essential Files to Read First

When starting work on this codebase, read these files in order:

1. **README.md** - Project overview, setup instructions, API documentation
2. **CONTRIBUTING.md** - Code patterns, component guidelines, type safety rules
3. **AI_COMPREHENSION_GUIDE.md** - Documentation patterns that help AI understand code
4. **This file (CLAUDE.md)** - Comprehensive AI assistant guide

### Environment Setup

```bash
# 1. Install dependencies
make install

# 2. Configure environment
cp server/.env.example server/.env
# Edit server/.env with required API keys

# 3. Start MongoDB
make docker-up

# 4. Start development servers
make dev
```

### Key Commands

```bash
make dev              # Start both frontend and backend
make test             # Run server tests
make build            # Build for production
make docker-up        # Start MongoDB
make docker-status    # Check MongoDB status
```

---

## Project Architecture

### Monorepo Structure

This is a **monorepo** with three main packages:

- **client/** - React frontend (Vite + TypeScript)
- **server/** - Express backend (Node.js + TypeScript)
- **shared/** - Shared validation utilities used by both client and server

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build tool, dev server)
- React Router v7 (routing)
- Recharts (data visualization)
- React Hot Toast (notifications)

**Backend:**
- Node.js 18+ with TypeScript
- Express.js (REST API)
- Mongoose (MongoDB ODM)
- Google Gemini AI (CANSLIM analysis)
- External APIs: Alpha Vantage, Financial Modeling Prep, SEC Edgar

**Database:**
- MongoDB 7.0 (runs in Docker)
- Port: 27011 (mapped from container's 27017)
- Connection: `mongodb://localhost:27011/stocks`

### Data Flow

```
User Request
    ↓
React Component
    ↓
API Call (fetch)
    ↓
Express Route Handler
    ↓
Service Layer (business logic)
    ↓
External APIs / Database
    ↓
Response (JSON)
    ↓
React Component (update state)
```

### Caching Strategy

- **Stock prices**: 1 hour TTL
- **Ownership data**: 24 hours TTL
- **Financial metrics**: 24 hours TTL
- **Historical prices**: 1 hour TTL
- **Insider transactions**: 5 minutes (in-memory), 24 hours (MongoDB)
- **CANSLIM scores**: 24 hours TTL

### Rate Limiting

- **Alpha Vantage**: 25 requests/day, 12-second intervals
- **FMP**: 250 requests/day, 12-second intervals
- **SEC**: 250ms politeness delay between requests

---

## Directory Structure

### Client Structure

```
client/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AddStockForm.tsx
│   │   ├── StockCard.tsx
│   │   ├── PortfolioTable.tsx
│   │   ├── CANSLIMScore/    # Subdirectory for complex components
│   │   ├── StockDetail/
│   │   └── index.ts         # Barrel export (IMPORTANT!)
│   ├── pages/               # Route-level page components
│   │   ├── Portfolio.tsx
│   │   ├── StockDetail.tsx
│   │   ├── Watchlist.tsx
│   │   ├── MarketHealth.tsx
│   │   └── index.ts         # Barrel export
│   ├── hooks/               # Custom React hooks
│   │   └── index.ts         # Barrel export
│   ├── utils/               # Utility functions
│   │   └── index.ts         # Barrel export
│   ├── styles/              # Global styles
│   ├── types.ts             # TypeScript type definitions
│   ├── constants.ts         # Client-side constants
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── package.json
└── vite.config.ts
```

### Server Structure

```
server/
├── src/
│   ├── routes/              # API route handlers
│   │   ├── portfolio.routes.ts
│   │   ├── stock-data.routes.ts
│   │   ├── canslim.routes.ts
│   │   ├── insider.routes.ts
│   │   ├── ownership.routes.ts
│   │   └── watchlist.routes.ts
│   ├── services/            # Business logic & external API integrations
│   │   ├── enrichment.service.ts    # Stock data enrichment
│   │   ├── stockData.ts             # Market data API
│   │   ├── priceHistory.ts          # Historical prices
│   │   ├── canslimCalculator.ts     # CANSLIM scoring
│   │   ├── rsCalculator.ts          # RS rating calculation
│   │   ├── gemini.ts                # AI analysis (centralized Gemini API)
│   │   ├── spinoffAnalyzer.ts       # Spinoff analysis
│   │   ├── spinoffLookup.service.ts # Spinoff lookup
│   │   ├── stock-data/              # External API clients
│   │   │   ├── config.ts
│   │   │   └── types.ts
│   │   ├── sec/                     # SEC Edgar integration
│   │   │   ├── insider-service.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── index.ts                 # Barrel export
│   ├── prompts/             # AI prompt templates (centralized)
│   │   ├── canslim-analysis.prompt.ts
│   │   ├── sector-industry.prompt.ts
│   │   ├── spinoff-analysis.prompt.ts
│   │   ├── spinoff-lookup.prompt.ts
│   │   └── index.ts         # Barrel export
│   ├── db/
│   │   ├── models/          # Mongoose models
│   │   │   ├── Portfolio.model.ts
│   │   │   ├── Watchlist.model.ts
│   │   │   ├── InsiderTransaction.model.ts
│   │   │   └── index.ts
│   │   ├── schemas.ts       # MongoDB schemas
│   │   └── connection.ts    # Database connection
│   ├── middleware/          # Express middleware
│   │   └── tickerValidation.ts
│   ├── utils/               # Shared utilities
│   │   ├── errorHandler.ts  # Error handling utilities
│   │   ├── calculations.ts  # Math calculations
│   │   ├── gemini.utils.ts  # Gemini AI utilities (parsing, API calls)
│   │   ├── cache.utils.ts   # Caching utilities (cache-or-calculate pattern)
│   │   ├── mcp.utils.ts     # MCP client utilities
│   │   └── index.ts         # Barrel export
│   ├── __tests__/           # Test files
│   ├── constants.ts         # Server-side constants
│   └── index.ts             # Server entry point
├── package.json
└── tsconfig.json
```

### Shared Structure

```
shared/
├── validation.ts     # Ticker validation shared between client & server
└── package.json
```

---

## Development Workflows

### Starting Development

```bash
# Option 1: Start both services in parallel (requires tmux)
make dev

# Option 2: Start services in separate terminals
# Terminal 1:
make server-dev

# Terminal 2:
make client-dev
```

### Running Tests

```bash
make test              # Run all tests once
make test-watch        # Run tests in watch mode
make test-coverage     # Run tests with coverage report
```

### Building for Production

```bash
make build             # Build both client and server
make server-build      # Build server only
make client-build      # Build client only
```

### Database Management

```bash
make docker-up         # Start MongoDB container
make docker-down       # Stop MongoDB container
make docker-status     # Check MongoDB status
make docker-logs       # View MongoDB logs
make mongo-shell       # Open MongoDB shell
make docker-clean      # Remove container and volumes (deletes all data!)
```

### Code Quality

```bash
# Linting (run in respective directories)
cd server && npm run lint
cd client && npm run lint

# Fix linting issues
cd server && npm run lint:fix
cd client && npm run lint:fix
```

---

## Key Conventions

### 1. Type Safety - NO `any` Types

**Always use explicit types**. Avoid `any` types except in error boundaries.

✅ **Good:**
```typescript
interface PriceData {
  price: number;
  timestamp: string;
  volume: number;
}

export async function getCurrentPrice(ticker: string): Promise<PriceData> {
  // Implementation
}
```

❌ **Bad:**
```typescript
export async function getCurrentPrice(ticker: string): Promise<any> {
  // Implementation
}
```

### 2. Barrel Exports - Always Use Them

**Use barrel exports (index.ts) for cleaner imports.**

✅ **Good:**
```typescript
// Use barrel exports
import { AddStockForm, StockCard, PortfolioTable } from '../components';
import { useTickerValidation } from '../hooks';
import { formatCurrency, formatShares } from '../utils';
```

❌ **Bad:**
```typescript
// Don't use deep imports
import { AddStockForm } from '../components/AddStockForm';
import { StockCard } from '../components/StockCard';
```

### 3. JSDoc Comments - Document Everything Public

**All public functions, components, and hooks must have JSDoc comments with examples.**

✅ **Good:**
```typescript
/**
 * Validates and normalizes a ticker symbol
 *
 * Performs the following operations:
 * 1. Trims whitespace
 * 2. Converts to uppercase
 * 3. Validates format (1-5 letters, optional .suffix)
 *
 * @param ticker - The ticker symbol to validate
 * @returns Object with normalized ticker and validation status
 *
 * @example
 * const result = validateAndNormalizeTicker('aapl');
 * // Returns: { ticker: 'AAPL', isValid: true }
 *
 * const result2 = validateAndNormalizeTicker('brk.b');
 * // Returns: { ticker: 'BRK.B', isValid: true }
 */
export function validateAndNormalizeTicker(ticker: string): {
  ticker: string;
  isValid: boolean;
} {
  // Implementation
}
```

### 4. Component Size - Keep Under 200 Lines

If a component exceeds 200 lines, split it into smaller components.

✅ **Good:**
```typescript
// StockDetail.tsx (main component ~150 lines)
export function StockDetail() {
  return (
    <div>
      <StockHeader data={stockData} />
      <PriceChart prices={prices} />
      <FinancialMetrics metrics={metrics} />
      <InsiderActivity transactions={transactions} />
    </div>
  );
}

// Extract sub-components
// StockHeader.tsx
export function StockHeader({ data }: { data: StockData }) {
  // 50 lines of header logic
}
```

### 5. Shared Validation - Use the Shared Module

**Always use shared validation utilities for ticker validation.**

✅ **Good:**
```typescript
import { normalizeTicker, isValidTicker } from '../../../shared/validation';

const ticker = normalizeTicker(userInput);
if (!isValidTicker(ticker)) {
  throw new Error('Invalid ticker format');
}
```

❌ **Bad:**
```typescript
// Don't create new validation logic
const ticker = userInput.trim().toUpperCase();
if (!/^[A-Z]+$/.test(ticker)) {
  throw new Error('Invalid ticker');
}
```

### 6. Constants - Centralized Configuration

**Use centralized constants instead of magic numbers.**

Location:
- Server constants: `server/src/constants.ts`
- Client constants: `client/src/constants.ts`

✅ **Good:**
```typescript
import { HTTP_STATUS, ERROR_MESSAGES } from './constants';

if (!ticker) {
  return res.status(HTTP_STATUS.BAD_REQUEST).json({
    error: ERROR_MESSAGES.TICKER_REQUIRED
  });
}
```

❌ **Bad:**
```typescript
if (!ticker) {
  return res.status(400).json({
    error: 'Ticker is required'
  });
}
```

### 7. Error Handling - Consistent Patterns

**Use consistent error handling across the application.**

```typescript
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants';

try {
  const data = await fetchStockData(ticker);
  res.json(data);
} catch (error) {
  console.error('Error fetching stock data:', error);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: ERROR_MESSAGES.STOCK_DATA_ERROR
  });
}
```

### 8. Ticker Validation Middleware

**Use the ticker validation middleware for all ticker-based routes.**

```typescript
import { validateTickerQuery } from '../middleware/tickerValidation';

// The middleware normalizes and validates the ticker
router.get('/', validateTickerQuery, async (req, res) => {
  // Access the normalized ticker
  const ticker = req.normalizedTicker; // Already validated!
  // ... rest of handler
});
```

---

## Common Tasks

### Adding a New Component

1. Create component file: `client/src/components/MyComponent.tsx`
2. Add TypeScript interfaces for props
3. Add JSDoc with @example
4. Export from `client/src/components/index.ts`

**Example:**
```typescript
/**
 * Displays stock performance metrics
 *
 * @example
 * <PerformanceCard
 *   ticker="AAPL"
 *   profitLoss={1234.56}
 *   profitLossPercent={12.5}
 * />
 */
export interface PerformanceCardProps {
  /** Stock ticker symbol */
  ticker: string;
  /** Dollar amount profit/loss */
  profitLoss: number;
  /** Percentage profit/loss */
  profitLossPercent: number;
}

export function PerformanceCard({
  ticker,
  profitLoss,
  profitLossPercent
}: PerformanceCardProps) {
  return (
    <div className="performance-card">
      <h3>{ticker}</h3>
      <p>P/L: ${profitLoss.toFixed(2)}</p>
      <p>P/L %: {profitLossPercent.toFixed(2)}%</p>
    </div>
  );
}
```

### Adding a New API Endpoint

1. Create route handler: `server/src/routes/myroute.routes.ts`
2. Use ticker validation middleware
3. Add TypeScript return types
4. Document with JSDoc
5. Register route in `server/src/index.ts`

**Example:**
```typescript
import { Router } from 'express';
import { validateTickerQuery } from '../middleware/tickerValidation';
import { HTTP_STATUS } from '../constants';

const router = Router();

/**
 * GET /api/myroute?ticker=AAPL
 * Fetches custom data for a stock
 */
router.get('/', validateTickerQuery, async (req, res) => {
  try {
    const ticker = req.normalizedTicker; // Already validated!
    const data = await myService.getData(ticker);
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to fetch data'
    });
  }
});

export default router;
```

### Adding a New Service

1. Create service file: `server/src/services/myService.ts`
2. Define interfaces for input/output
3. Add comprehensive JSDoc with examples
4. Export from `server/src/services/index.ts`

**Example:**
```typescript
/**
 * Custom metric calculation service
 */

/** Input parameters for metric calculation */
export interface MetricParams {
  /** Stock ticker symbol */
  ticker: string;
  /** Number of days for analysis */
  days: number;
}

/** Calculated metric results */
export interface MetricResult {
  /** Metric score (0-100) */
  score: number;
  /** Rating (A-F) */
  rating: string;
  /** Calculation timestamp */
  calculatedAt: string;
}

/**
 * Calculates custom metric for a stock
 *
 * Algorithm:
 * 1. Fetch historical prices for specified days
 * 2. Calculate volatility
 * 3. Generate score 0-100
 * 4. Assign letter grade
 *
 * @param params - Calculation parameters
 * @returns Promise with metric results
 * @throws {Error} If ticker is invalid or data unavailable
 *
 * @example
 * const result = await calculateMetric({
 *   ticker: 'AAPL',
 *   days: 90
 * });
 * console.log(result.score);  // 87
 * console.log(result.rating); // 'A'
 */
export async function calculateMetric(
  params: MetricParams
): Promise<MetricResult> {
  // Implementation
}
```

### Adding a New Custom Hook

1. Create hook file: `client/src/hooks/useMyHook.ts`
2. Document what it does and when to use it
3. Add usage example
4. Export from `client/src/hooks/index.ts`

**Example:**
```typescript
/**
 * Custom hook for fetching stock data with auto-refresh
 *
 * Features:
 * - Automatic data fetching on mount
 * - Manual refresh capability
 * - Loading and error states
 * - Automatic cleanup
 *
 * @param ticker - Stock ticker symbol
 * @param refreshInterval - Auto-refresh interval in ms (default: 60000)
 * @returns Object with data, loading, error, and refresh function
 *
 * @example
 * function StockCard({ ticker }) {
 *   const { data, loading, error, refresh } = useStockData(ticker);
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <div>
 *       <h2>{data.name}</h2>
 *       <p>${data.price}</p>
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 */
export function useStockData(
  ticker: string,
  refreshInterval = 60000
) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Implementation

  return { data, loading, error, refresh };
}
```

### Adding a New Database Model

1. Create model file: `server/src/db/models/MyModel.model.ts`
2. Define schema with proper types
3. Export model
4. Add to `server/src/db/models/index.ts`

**Example:**
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IMyModel extends Document {
  ticker: string;
  value: number;
  timestamp: Date;
}

const MyModelSchema = new Schema<IMyModel>({
  ticker: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  value: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for efficient queries
MyModelSchema.index({ ticker: 1, timestamp: -1 });

export const MyModel = mongoose.model<IMyModel>('MyModel', MyModelSchema);
```

---

## API Patterns

### Enrichment Service Pattern

**For fetching stock data with price/DMA/insider info, use the enrichment service.**

```typescript
import {
  enrichPortfolioArray,
  enrichStockArray
} from '../services/enrichment.service';

// For portfolio items (includes purchase info)
const portfolioStocks = await Portfolio.find().lean();
const enriched = await enrichPortfolioArray(portfolioStocks);

// For watchlist items (no purchase info)
const watchlistStocks = await Watchlist.find().lean();
const enriched = await enrichStockArray(watchlistStocks);
```

### RESTful API Conventions

**Follow RESTful patterns for all endpoints.**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/resource` | Get all resources |
| GET | `/api/resource/:id` | Get single resource |
| POST | `/api/resource` | Create new resource |
| PUT | `/api/resource/:id` | Update resource |
| DELETE | `/api/resource/:id` | Delete resource |
| POST | `/api/resource/action` | Perform action |

### Response Format

**Consistent JSON response format:**

**Success:**
```json
{
  "ticker": "AAPL",
  "currentPrice": 150.25,
  "movingAverage50": 148.30
}
```

**Error:**
```json
{
  "error": "Stock not found in portfolio"
}
```

### API Endpoints Reference

**Portfolio:**
- `GET /api/portfolio` - Get all portfolio stocks
- `GET /api/portfolio/:ticker` - Get single stock
- `POST /api/portfolio` - Add stock
- `PUT /api/portfolio/:ticker` - Update stock
- `DELETE /api/portfolio/:ticker` - Delete stock
- `POST /api/portfolio/refresh-all` - Refresh all prices
- `POST /api/portfolio/:ticker/refresh` - Refresh single price

**Stock Data:**
- `GET /api/stock/price?ticker=AAPL` - Get current price
- `GET /api/stock/financials?ticker=AAPL` - Get financial metrics
- `GET /api/stock/historical?ticker=AAPL&days=50` - Get historical prices

**CANSLIM:**
- `GET /api/canslim?ticker=AAPL` - Get CANSLIM score (cached)
- `POST /api/canslim/refresh?ticker=AAPL` - Force recalculate

**Insider Trading:**
- `GET /api/insiders?ticker=AAPL` - Get insider transactions

**Ownership:**
- `GET /api/ownership?ticker=AAPL` - Get ownership breakdown

**Watchlist:**
- `GET /api/watchlist` - Get all watchlist stocks
- `POST /api/watchlist` - Add to watchlist
- `DELETE /api/watchlist/:ticker` - Remove from watchlist

---

## Database Models

### Available Models

Located in `server/src/db/models/`:

1. **Portfolio** - User's portfolio stocks
   - Fields: ticker, shares, purchasePrice, purchaseDate

2. **Watchlist** - Stocks to watch
   - Fields: ticker, notes, addedDate

3. **InsiderTransaction** - Cached insider trading data
   - Fields: ticker, cik, transactions[], summary, lastFetched

4. **StockPrice** - Cached stock prices
   - Fields: ticker, price, timestamp, source

5. **StockMetrics** - Cached financial metrics
   - Fields: ticker, metrics, timestamp

6. **SECCompanyTicker** - SEC CIK to ticker mapping
   - Fields: cik, ticker, title

7. **SearchHistory** - Recently searched stocks
   - Fields: ticker, companyName, timestamp

8. **SpinoffAnalysis** - Spinoff analysis data
   - Fields: ticker, analysis, calculatedAt

### Model Usage Example

```typescript
import { Portfolio } from '../db/models';

// Create
const stock = new Portfolio({
  ticker: 'AAPL',
  shares: 100,
  purchasePrice: 150.00,
  purchaseDate: new Date()
});
await stock.save();

// Find
const stocks = await Portfolio.find();
const appleStock = await Portfolio.findOne({ ticker: 'AAPL' });

// Update
await Portfolio.updateOne(
  { ticker: 'AAPL' },
  { $set: { shares: 150 } }
);

// Delete
await Portfolio.deleteOne({ ticker: 'AAPL' });
```

---

## Testing Guidelines

### Test Location

Tests are located in `server/src/__tests__/`

### Running Tests

```bash
make test              # Run all tests
make test-watch        # Run in watch mode
make test-coverage     # Run with coverage
```

### Test Patterns

**Basic test structure:**
```typescript
describe('calculateMetric', () => {
  it('should calculate score for valid ticker', async () => {
    const result = await calculateMetric({
      ticker: 'AAPL',
      days: 90
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.rating);
  });

  it('should throw error for invalid ticker', async () => {
    await expect(calculateMetric({
      ticker: 'INVALID',
      days: 90
    })).rejects.toThrow();
  });
});
```

### Test Coverage Goals

- Unit tests for all service functions
- Integration tests for API endpoints
- Test both success and error cases
- Mock external API calls

---

## Best Practices for AI Assistants

### 1. Always Read Documentation First

Before making changes, read:
1. This file (CLAUDE.md)
2. CONTRIBUTING.md
3. AI_COMPREHENSION_GUIDE.md
4. Relevant component/service documentation

### 2. Use Barrel Exports

Always import from barrel exports (index.ts) for cleaner code organization.

### 3. Follow Type Safety Rules

- No `any` types (except error boundaries)
- Explicit return types for all functions
- Interface definitions for all data structures

### 4. Document Everything

- JSDoc comments for all public functions
- Include @param, @returns, @throws tags
- Add @example with real usage examples

### 5. Check Existing Patterns

Before creating new patterns:
1. Search for similar existing code
2. Follow established conventions
3. Reuse existing utilities and hooks

### 6. Keep Components Small

- Components should be under 200 lines
- Extract sub-components when needed
- Use custom hooks to share logic

### 7. Use Centralized Constants

- Never use magic numbers or strings
- Add new constants to constants.ts
- Reference constants in code

### 8. Test Your Changes

- Add tests for new functionality
- Run existing tests to ensure no regressions
- Aim for high test coverage

### 9. Validate Tickers Properly

- Always use shared validation utilities
- Use ticker validation middleware for routes
- Never create custom validation logic

### 10. Handle Errors Consistently

- Use HTTP_STATUS constants
- Use ERROR_MESSAGES constants
- Always log errors before responding
- Provide meaningful error messages

### 11. Respect Rate Limits

- Be aware of API rate limits
- Use cached data when appropriate
- Implement proper retry logic
- Don't abuse refresh endpoints

### 12. Understand Data Flow

```
User Input → Validation → API Call → Service Layer →
External API/DB → Response → Component State → UI Update
```

### 13. Code Organization Checklist

When adding new code, ensure:
- [ ] Types are defined in appropriate location
- [ ] JSDoc comments are complete
- [ ] Barrel export is updated
- [ ] Constants are used (not magic values)
- [ ] Error handling is consistent
- [ ] Tests are added/updated
- [ ] Component is under 200 lines
- [ ] No `any` types used

### 14. Git Commit Messages

Follow this format:
```
<type>: <short description>

<detailed description if needed>

Examples:
- feat: add spinoff analysis endpoint
- fix: correct CANSLIM score calculation
- refactor: extract StockHeader component
- docs: update API documentation
- test: add tests for portfolio routes
```

### 15. When in Doubt

- Check CONTRIBUTING.md for patterns
- Look at similar existing code
- Search for JSDoc @example tags
- Review test files for usage examples

---

## File Organization Rules

### Component Files

```
ComponentName.tsx         # Component implementation
ComponentName.css         # Component styles (if needed)
ComponentName.test.tsx    # Component tests (if applicable)
```

### Service Files

```
serviceName.ts           # Service implementation
serviceName.test.ts      # Service tests
```

### Always Update Barrel Exports

When adding new files, update the corresponding index.ts:

```typescript
// components/index.ts
export { AddStockForm } from './AddStockForm';
export { StockCard } from './StockCard';
export { MyNewComponent } from './MyNewComponent'; // Add new exports
```

---

## Environment Variables

### Required API Keys

All configured in `server/.env`:

```bash
# SEC Edgar (Required)
SEC_USER_AGENT=your-app/1.0 (email@example.com)

# Alpha Vantage (Required)
ALPHA_VANTAGE_API_KEY=your_key

# Financial Modeling Prep (Required)
FMP_API_KEY=your_key

# Google Gemini AI (Required)
GEMINI_API_KEY=your_key

# MCP Server (Optional - for spinoff analysis)
MCP_SERVER_PATH=/path/to/mcp-server/dist/index.js

# MongoDB (Required)
MONGODB_URI=mongodb://localhost:27011/stocks

# Server (Optional)
PORT=3001
```

### Getting API Keys

1. **SEC Edgar**: No key needed, just provide user agent with email
2. **Alpha Vantage**: https://www.alphavantage.co/support/#api-key
3. **Financial Modeling Prep**: https://site.financialmodelingprep.com/developer/docs
4. **Google Gemini**: https://aistudio.google.com/app/apikey
5. **MCP Server**: Optional - only needed for spinoff analysis features

---

## Shared Utilities and Prompts

### Prompts Directory (server/src/prompts/)

All AI prompts for Gemini are centralized in the `prompts/` directory:

- **canslim-analysis.prompt.ts** - CANSLIM score analysis prompt
- **sector-industry.prompt.ts** - Sector/industry classification prompt
- **spinoff-analysis.prompt.ts** - Spinoff investment analysis prompts
- **spinoff-lookup.prompt.ts** - Spinoff identification prompt

**Usage:**
```typescript
import { buildCANSLIMPrompt, buildSectorIndustryPrompt } from '../prompts';

const prompt = buildCANSLIMPrompt(metrics);
```

### Gemini Utilities (server/src/utils/gemini.utils.ts)

Centralized utilities for Gemini AI interactions:

- **validateGeminiAPIKey()** - Validates API key is configured
- **parseGeminiJSON<T>(text)** - Parses JSON from Gemini response
- **parseGeminiJSONSafe<T>(text, fallback)** - Safe parsing with fallback
- **callGemini(model, prompt, config)** - Makes Gemini API call
- **callGeminiJSON<T>(model, prompt, fallback, config)** - API call + JSON parsing

**Usage:**
```typescript
import { validateGeminiAPIKey, callGeminiJSON } from '../utils/gemini.utils';

validateGeminiAPIKey();

const result = await callGeminiJSON<MyType>(
  'gemini-2.0-flash',
  prompt,
  fallbackValue
);
```

### Cache Utilities (server/src/utils/cache.utils.ts)

Shared caching utilities for analysis data:

- **getCachedAnalysis<T>(ticker, metricType, ttlHours)** - Retrieves cached data
- **storeAnalysis<T>(ticker, metricType, data)** - Stores data in cache
- **getCachedOrCalculate<T>(ticker, config, calculator)** - Cache-or-calculate pattern
- **isCacheValid(timestamp, ttlHours)** - Checks cache validity

**Usage:**
```typescript
import { getCachedOrCalculate } from '../utils/cache.utils';

const rating = await getCachedOrCalculate(
  'AAPL',
  { metricType: 'rs-rating', ttlHours: 24 },
  async () => calculateRSRating('AAPL')
);
```

### MCP Utilities (server/src/utils/mcp.utils.ts)

MCP (Model Context Protocol) client utilities for SEC Edgar data:

- **createMCPClient()** - Creates and connects MCP client
- **withMCPClient<T>(operation)** - Safely executes operation with auto-cleanup

**Usage:**
```typescript
import { withMCPClient } from '../utils/mcp.utils';

const data = await withMCPClient(async (client) => {
  const result = await client.callTool({
    name: 'search_company',
    arguments: { query: 'AAPL' }
  });
  return JSON.parse(result.content[0]?.text || '{}');
});
```

**Note:** Requires `MCP_SERVER_PATH` environment variable to be configured.

---

## Common Pitfalls to Avoid

### 1. Don't Use `any` Types

❌ Bad: `function getData(): Promise<any>`
✅ Good: `function getData(): Promise<StockData>`

### 2. Don't Skip Barrel Exports

❌ Bad: `import { Foo } from '../components/Foo'`
✅ Good: `import { Foo } from '../components'`

### 3. Don't Create Duplicate Validation

❌ Bad: Creating new ticker validation logic
✅ Good: Using `shared/validation.ts`

### 4. Don't Use Magic Numbers

❌ Bad: `res.status(400).json({ error: 'Bad request' })`
✅ Good: `res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_MESSAGES.INVALID_TICKER })`

### 5. Don't Skip JSDoc

❌ Bad: No documentation on public functions
✅ Good: Comprehensive JSDoc with examples

### 6. Don't Make Components Too Large

❌ Bad: 500-line components
✅ Good: Components under 200 lines, extracted sub-components

### 7. Don't Ignore Error Handling

❌ Bad: `const data = await api.call()` (no try-catch)
✅ Good: Proper try-catch with meaningful error messages

### 8. Don't Forget to Update Tests

❌ Bad: Adding new features without tests
✅ Good: Writing tests for all new functionality

---

## Additional Resources

### Documentation Files

- **README.md** - Project overview and setup
- **CONTRIBUTING.md** - Contribution guidelines
- **AI_COMPREHENSION_GUIDE.md** - AI-friendly code patterns
- **CODEBASE_ANALYSIS.md** - Detailed architecture analysis
- **REFACTORING_CHECKLIST.md** - Refactoring tasks and priorities
- **REFACTORING_ROADMAP.md** - Long-term improvement plans

### Key External Docs

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

---

## Summary Checklist for AI Assistants

When working on this codebase, always:

✅ Read relevant documentation before starting
✅ Use TypeScript with explicit types (no `any`)
✅ Add JSDoc comments with examples
✅ Use barrel exports for imports
✅ Keep components under 200 lines
✅ Use centralized constants
✅ Follow existing patterns
✅ Use shared validation utilities
✅ Handle errors consistently
✅ Add/update tests
✅ Update barrel exports when adding files
✅ Check rate limits for external APIs
✅ Use the enrichment service for stock data
✅ Use ticker validation middleware for routes
✅ Follow RESTful API conventions

---

**Last Updated**: 2025-11-13
**Version**: 1.0
**Maintainer**: Development Team

For questions or clarifications, refer to the documentation files listed above or examine existing code patterns for guidance.
