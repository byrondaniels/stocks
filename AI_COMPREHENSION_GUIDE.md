# AI Comprehension Improvement Guide

## How AI Understands Your Code

### 1. Type Clarity (Most Important for AI)

**Bad - AI Cannot Understand:**
```typescript
// enrichment.service.ts
export interface BaseStockData {
  ticker: string;
  [key: string]: any;  // What properties can be added? AI doesn't know
}

export async function enrichStockData(stock: BaseStockData): Promise<EnrichedStockData> {
  // What fields does EnrichedStockData have? Not obvious to AI
}
```

**Good - AI Can Complete Tasks:**
```typescript
export interface BaseStockData {
  /** Stock ticker symbol (e.g., 'AAPL', 'BRK.B') */
  ticker: string;
  
  /** Optional: current market price in USD */
  currentPrice?: number;
  
  /** Optional: purchase price for portfolio items */
  purchasePrice?: number;
  
  /** Optional: number of shares owned */
  shares?: number;
}

export interface EnrichedStockData extends BaseStockData {
  /** Current trading price fetched from market API */
  currentPrice: number;
  
  /** 50-day moving average calculated from historical prices */
  movingAverage50: number | null;
  
  /** Percentage difference from 50-day MA (positive = above MA) */
  percentageDifference: number | null;
  
  /** Number of price data points used in calculation */
  priceCount: number;
  
  /** Latest date in price data */
  latestDate?: string | null;
  
  /** Summary of insider buy/sell activity */
  insiderActivity: {
    totalBuyShares: number;
    totalSellShares: number;
    netShares: number;
  } | null;
}

/**
 * Enriches stock data with real-time pricing and technical metrics
 * 
 * Combines data from three sources:
 * 1. Market pricing API (Alpha Vantage or FMP)
 * 2. Stored historical prices (50-day moving average)
 * 3. SEC filings (insider transaction summary)
 * 
 * @param stock - Base stock data (requires 'ticker' field minimum)
 * @returns Promise<EnrichedStockData> with all pricing and activity data
 * 
 * @throws {Error} If ticker is invalid or all price sources fail
 * 
 * @example
 * // Enrich portfolio stock
 * const stock = { ticker: 'AAPL', shares: 100, purchasePrice: 150 };
 * const enriched = await enrichStockData(stock);
 * 
 * // AI can now predict:
 * console.log(enriched.currentPrice);      // number
 * console.log(enriched.movingAverage50);   // number | null
 * console.log(enriched.insiderActivity);   // object | null
 */
export async function enrichStockData(stock: BaseStockData): Promise<EnrichedStockData> {
  // ... implementation
}
```

### 2. Documentation Patterns That Help AI

#### Pattern 1: JSDoc with Examples
```typescript
/**
 * Calculates profit/loss for a stock position
 * 
 * Uses the formula:
 * - Profit/Loss = (currentPrice - purchasePrice) * shares
 * - Percent = ((currentPrice - purchasePrice) / purchasePrice) * 100
 * 
 * @param currentPrice - Current trading price in USD
 * @param purchasePrice - Original purchase price in USD
 * @param shares - Number of shares owned
 * @returns Object with absolute and percentage profit/loss
 * 
 * @example
 * // Win scenario
 * calculateProfitLoss(200, 150, 10)
 * // Returns: { profitLoss: 500, profitLossPercent: 33.33 }
 * 
 * // Loss scenario
 * calculateProfitLoss(120, 150, 10)
 * // Returns: { profitLoss: -300, profitLossPercent: -20.00 }
 */
export function calculateProfitLoss(
  currentPrice: number,
  purchasePrice: number,
  shares: number
): ProfitLossResult {
  const profitLoss = (currentPrice - purchasePrice) * shares;
  const profitLossPercent = ((currentPrice - purchasePrice) / purchasePrice) * 100;
  
  return {
    profitLoss: parseFloat(profitLoss.toFixed(2)),
    profitLossPercent: parseFloat(profitLossPercent.toFixed(2))
  };
}
```

#### Pattern 2: Error Boundaries with Clear Types
```typescript
// BAD - AI doesn't know what errors can happen
try {
  const result = await fetchData();
} catch (error) {
  // any error could happen
}

// GOOD - AI understands error scenarios
interface APIError {
  code: 'RATE_LIMIT' | 'NOT_FOUND' | 'INVALID_TICKER' | 'NETWORK_ERROR';
  message: string;
  retryAfter?: number; // seconds to wait before retry
}

async function fetchStockPrice(ticker: string): Promise<StockPrice> {
  try {
    return await apiCall(ticker);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw {
        code: 'RATE_LIMIT',
        message: 'API rate limit exceeded',
        retryAfter: 3600
      } as APIError;
    }
    if (error instanceof NotFoundError) {
      throw {
        code: 'NOT_FOUND',
        message: `Ticker ${ticker} not found`
      } as APIError;
    }
    throw {
      code: 'NETWORK_ERROR',
      message: 'Failed to fetch price data'
    } as APIError;
  }
}
```

#### Pattern 3: Explicit Return Types
```typescript
// BAD - AI can't predict what data flows where
export async function getStockData(ticker: string) {
  const data = await fetch(...);
  return data;
}

// GOOD - AI knows exactly what to expect
interface StockData {
  ticker: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

/** Fetches current trading data for a stock ticker */
export async function getStockData(ticker: string): Promise<StockData> {
  const response = await fetch(`/api/stock/${ticker}`);
  const data = await response.json();
  
  return {
    ticker: data.symbol,
    currentPrice: data.price,
    change: data.change,
    changePercent: data.changePercent,
    volume: data.volume,
    timestamp: new Date().toISOString()
  };
}
```

### 3. Hook Documentation (Critical for React Components)

```typescript
/**
 * Manages fetching and caching async data with refresh capability
 * 
 * This hook handles:
 * - Initial data fetching on component mount
 * - Automatic retries on failure (exponential backoff)
 * - Manual refresh with loading states
 * - Cache invalidation with customizable TTL
 * 
 * @param fetchFn - Function that returns a Promise with the data
 * @param options.refreshFn - Optional function to refresh data differently
 * @param options.cacheSeconds - How long to cache results (default: 3600)
 * @param options.onSuccess - Callback when fetch succeeds
 * @param options.onError - Callback when fetch fails
 * 
 * @returns Object with:
 *   - data: The fetched data (null while loading)
 *   - loading: Boolean indicating if initial fetch is in progress
 *   - error: Error message if fetch failed
 *   - refreshing: Boolean indicating if manual refresh is in progress
 *   - refetch: Function to manually trigger data fetch
 *   - refresh: Function to trigger refresh endpoint if available
 * 
 * @example
 * // Use for CANSLIM scoring
 * const { data: score, loading, error, refresh } = useAsyncDataWithRefresh({
 *   fetchFn: () => fetch(`/api/canslim?ticker=${ticker}`).then(r => r.json()),
 *   refreshFn: () => fetch(`/api/canslim/refresh?ticker=${ticker}`, { method: 'POST' }).then(r => r.json()),
 *   cacheSeconds: 3600
 * });
 * 
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 * return (
 *   <div>
 *     <h1>CANSLIM Score: {score?.score}</h1>
 *     <button onClick={() => refresh()}>Refresh</button>
 *   </div>
 * );
 */
export function useAsyncDataWithRefresh<T>(
  options: UseAsyncDataOptions<T>
): UseAsyncDataReturn<T> {
  // ... implementation
}
```

### 4. Component Props Documentation

```typescript
/**
 * Displays stock price history as a line chart with trend analysis
 * 
 * Features:
 * - Responsive chart that adapts to container width
 * - Color coding: green for gains, red for losses
 * - Compact mode for inline sparklines
 * - Tooltip with detailed price information
 * - Automatic date formatting
 */
interface PriceLineChartProps {
  /** Array of OHLCV price data points, sorted newest to oldest */
  data: PriceHistoryPoint[];
  
  /** Stock ticker symbol for chart title */
  ticker: string;
  
  /** If true, shows compact sparkline version (no axes, labels) */
  compact?: boolean;
  
  /** Chart height in pixels (default: 250). Ignored in compact mode */
  height?: number;
}

export function PriceLineChart({
  data,
  ticker,
  compact = false,
  height = 250
}: PriceLineChartProps) {
  // ...
}
```

## Priority: What Matters Most to AI

### 1st Priority: Type Definitions
- Clear, explicit types (not `any`)
- Field descriptions in JSDoc
- Return type annotations

### 2nd Priority: Function Documentation  
- JSDoc with @param, @returns, @throws
- Usage examples
- Error scenarios

### 3rd Priority: Code Organization
- Logical file grouping
- Index files for exports
- Consistent naming patterns

### 4th Priority: Comments
- Explain "why", not "what"
- Document business logic
- Clarify non-obvious decisions

## Files to Focus On First

### Phase 1 (This Week)
1. `/client/src/types.ts` - Add JSDoc to all interfaces
2. `/server/src/services/enrichment.service.ts` - Fix `any` type, add examples
3. Create `/client/src/hooks/useAsyncDataWithRefresh.ts` - New reusable hook
4. Create all missing index.ts files

### Phase 2 (Next Week)
5. `/server/src/services/gemini.ts` - Document CANSLIM methodology
6. `/server/src/services/priceHistory.ts` - Add examples to complex functions
7. All route files - Document API endpoints

### Phase 3 (Following Week)
8. Decompose large components (StockDetail, Portfolio, CANSLIMScore)
9. Extract components from InsiderLookup
10. Cleanup naming and finish documentation

## Testing AI Comprehension

After improvements, AI should be able to:

1. Generate correct API calls without examples
```typescript
// AI should predict this works:
const canslimScore = await getOrCalculateCANSLIMScore('AAPL');
console.log(canslimScore.score); // AI knows this is a number 0-100
```

2. Suggest appropriate error handling
```typescript
// AI should suggest:
try {
  const data = await fetchStockData();
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    // Wait and retry
  } else if (error.code === 'NOT_FOUND') {
    // Show user message
  }
}
```

3. Extract duplicated logic into shared utilities
4. Create components with proper prop types
5. Suggest test cases based on documented scenarios

## Metrics to Track

After implementing improvements:

- Type safety: 0 `any` types (except error boundaries)
- Documentation: 100% public functions have JSDoc
- Code reuse: <5% duplicate logic
- Component size: 0 components >200 lines
- Naming clarity: All files have unambiguous names

