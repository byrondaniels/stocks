# Contributing to Stock Portfolio Application

This guide helps you understand the codebase structure and contribute effectively, especially when using AI-assisted development tools like Claude Code.

## 📁 Project Structure

```
stocks/
├── shared/              # Shared utilities (client + server)
│   └── validation.ts    # Ticker validation logic
│
├── client/src/
│   ├── components/      # Reusable UI components
│   │   └── index.ts     # Barrel export (use this!)
│   ├── pages/           # Page-level components
│   │   └── index.ts     # Barrel export
│   ├── hooks/           # Custom React hooks
│   │   └── index.ts     # Barrel export
│   ├── utils/           # Client utilities
│   │   └── index.ts     # Barrel export
│   └── types.ts         # TypeScript type definitions
│
└── server/src/
    ├── routes/          # API endpoint definitions
    ├── services/        # Business logic
    │   ├── enrichment.service.ts    # Stock data enrichment
    │   ├── stockData.ts             # Market data API
    │   ├── priceHistory.ts          # Historical prices
    │   ├── canslimCalculator.ts     # CANSLIM scoring
    │   ├── rsCalculator.ts          # RS rating
    │   ├── stock-data/              # External API clients
    │   ├── sec/                     # SEC insider data
    │   └── index.ts                 # Barrel export
    ├── middleware/      # Express middleware
    │   └── tickerValidation.ts      # Ticker validation
    ├── db/models/       # MongoDB models
    └── utils/           # Server utilities
```

## 🎯 Key Patterns and Best Practices

### 1. **Always Use Barrel Exports**

✅ **Good:**
```typescript
// Use barrel exports for cleaner imports
import { AddStockForm, StockCard } from '../components';
import { useTickerValidation } from '../hooks';
import { formatCurrency, formatShares } from '../utils';
```

❌ **Bad:**
```typescript
// Don't use deep imports
import { AddStockForm } from '../components/AddStockForm';
import { StockCard } from '../components/StockCard';
```

### 2. **Type Everything - No `any`**

✅ **Good:**
```typescript
/**
 * Fetches current stock price from market API
 * @param ticker - Stock ticker symbol (e.g., 'AAPL')
 * @returns Promise with price data
 */
export async function getCurrentPrice(ticker: string): Promise<PriceData> {
  const result = await alphaVantageClient.getQuote(ticker);
  return {
    price: result.price,
    timestamp: new Date().toISOString()
  };
}
```

❌ **Bad:**
```typescript
// AI cannot understand what this returns
export async function getCurrentPrice(ticker: string): Promise<any> {
  return await alphaVantageClient.getQuote(ticker);
}
```

### 3. **Document with JSDoc + Examples**

✅ **Good:**
```typescript
/**
 * Custom hook for validating ticker symbols in forms
 *
 * Provides reusable validation logic that checks:
 * - Ticker is not empty
 * - Ticker matches format: 1-5 letters with optional .suffix
 *
 * @returns Object with validateTicker function
 *
 * @example
 * function MyForm() {
 *   const { validateTicker } = useTickerValidation();
 *
 *   const error = validateTicker(formData.ticker);
 *   if (error) {
 *     setErrors({ ticker: error });
 *   }
 * }
 */
export function useTickerValidation() {
  // ...
}
```

❌ **Bad:**
```typescript
// No docs - AI doesn't know how to use this
export function useTickerValidation() {
  // ...
}
```

### 4. **Component Size: Keep Under 200 Lines**

If a component exceeds 200 lines, consider splitting:

✅ **Good:**
```typescript
// StockDetail.tsx (main component)
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

// StockHeader.tsx (extracted)
export function StockHeader({ data }: { data: StockData }) {
  // 50 lines of header logic
}
```

❌ **Bad:**
```typescript
// StockDetail.tsx (596 lines - too large!)
export function StockDetail() {
  // All logic in one file
}
```

### 5. **Use Shared Validation**

All validation should use the shared module:

✅ **Good:**
```typescript
import { normalizeTicker, isValidTicker } from '../../../shared/validation';

const ticker = normalizeTicker(input);
if (!isValidTicker(ticker)) {
  throw new Error('Invalid ticker');
}
```

❌ **Bad:**
```typescript
// Don't create new validation logic
const ticker = input.trim().toUpperCase();
if (!/^[A-Z]+$/.test(ticker)) {
  throw new Error('Invalid ticker');
}
```

### 6. **Use Enrichment Service**

For fetching stock data with price/DMA/insider info:

✅ **Good:**
```typescript
import { enrichPortfolioArray, enrichStockArray } from '../services/enrichment.service';

// For portfolio items
const portfolioStocks = await Portfolio.find().lean();
const enriched = await enrichPortfolioArray(portfolioStocks);

// For watchlist items
const watchlistStocks = await Watchlist.find().lean();
const enriched = await enrichStockArray(watchlistStocks);
```

❌ **Bad:**
```typescript
// Don't manually fetch price, DMA, and insider data
const stocks = await Portfolio.find();
for (const stock of stocks) {
  const price = await getCurrentPrice(stock.ticker);
  const dma = await calculate50DMA(stock.ticker);
  const insider = await getInsiderTransactions(stock.ticker);
  // ...
}
```

## 🔧 Common Tasks

### Adding a New Component

1. Create the component file in `client/src/components/MyComponent.tsx`
2. Add proper TypeScript interfaces for props
3. Add JSDoc with @example
4. Export from `client/src/components/index.ts`

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

export function PerformanceCard({ ticker, profitLoss, profitLossPercent }: PerformanceCardProps) {
  // Implementation
}
```

### Adding a New API Endpoint

1. Create route handler in `server/src/routes/myroute.routes.ts`
2. Use ticker validation middleware for consistency
3. Add proper TypeScript return types
4. Document with JSDoc

```typescript
import { Router } from 'express';
import { validateTickerQuery } from '../middleware/tickerValidation.js';

const router = Router();

/**
 * GET /api/myroute?ticker=AAPL
 * Fetches custom data for a stock
 */
router.get('/', validateTickerQuery, async (req, res) => {
  const ticker = req.normalizedTicker; // Already validated!

  const data = await myService.getData(ticker);
  res.json(data);
});

export default router;
```

### Adding a New Service

1. Create service file in `server/src/services/myService.ts`
2. Define interfaces for input/output
3. Add comprehensive JSDoc with examples
4. Export from `server/src/services/index.ts`

```typescript
/**
 * Calculates custom stock metrics
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
}

/**
 * Calculates custom metric for a stock
 *
 * Algorithm:
 * 1. Fetch historical prices
 * 2. Calculate volatility
 * 3. Generate score 0-100
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
export async function calculateMetric(params: MetricParams): Promise<MetricResult> {
  // Implementation
}
```

### Adding a New Custom Hook

1. Create hook file in `client/src/hooks/useMyHook.ts`
2. Document what it does and when to use it
3. Add usage example
4. Export from `client/src/hooks/index.ts`

```typescript
/**
 * Custom hook for fetching stock data with auto-refresh
 *
 * Features:
 * - Automatic data fetching on mount
 * - Manual refresh with rate limiting
 * - Loading and error states
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
export function useStockData(ticker: string, refreshInterval = 60000) {
  // Implementation
}
```

## 📊 Type Definitions

Always define clear interfaces with JSDoc comments:

```typescript
/**
 * Stock price data from market API
 */
export interface PriceData {
  /** Current trading price in USD */
  price: number;
  /** ISO 8601 timestamp of price quote */
  timestamp: string;
  /** Trading volume */
  volume?: number;
  /** Previous close price */
  previousClose?: number;
}
```

## 🧪 Testing

When adding tests, follow these patterns:

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

## 🚀 Quick Start for AI-Assisted Development

When using Claude Code or similar AI tools:

1. **Always read the comprehensive docs** in AI_COMPREHENSION_GUIDE.md first
2. **Use barrel exports** - AI understands module relationships better
3. **Check existing patterns** - Look at similar code before creating new patterns
4. **Ask for types** - Request type definitions if unclear
5. **Reference examples** - Point AI to JSDoc examples for guidance

## 📚 Additional Resources

- **CODEBASE_ANALYSIS.md** - Detailed architecture and refactoring opportunities
- **REFACTORING_CHECKLIST.md** - Task list with priorities and effort estimates
- **AI_COMPREHENSION_GUIDE.md** - Best practices for AI-friendly code
- **REFACTORING_ROADMAP.md** - Long-term improvement plans

## ❓ Questions?

If you're unsure about a pattern or need clarification:

1. Check existing code for similar examples
2. Look for JSDoc comments and @example tags
3. Review the analysis documents
4. Search for related test files

---

**Remember**: Clear types + good documentation = faster AI-assisted development!
