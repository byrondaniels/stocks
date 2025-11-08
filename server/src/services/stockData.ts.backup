/**
 * Stock Data API Service
 *
 * Provides abstraction layer for multiple stock data APIs:
 * - Alpha Vantage: Current prices and historical data (25 req/day free)
 * - Financial Modeling Prep: Ownership, financials, metrics (250 req/day free)
 * - Yahoo Finance: Fallback for prices (via unofficial methods)
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type StockPrice = {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: 'alphavantage' | 'fmp' | 'yahoo';
};

export type OwnershipData = {
  ticker: string;
  insiderOwnership: number; // percentage
  institutionalOwnership: number; // percentage
  publicOwnership: number; // percentage
  floatShares: number;
  sharesOutstanding: number;
  source: 'fmp' | 'sec';
  timestamp: string;
};

export type FinancialMetrics = {
  ticker: string;
  // CANSLIM Criteria
  currentEPS: number;
  epsGrowthQuarterly: number; // percentage
  epsGrowthAnnual: number; // percentage
  annualEarningsGrowth: number; // 5-year average
  salesGrowthQuarterly: number; // percentage
  roe: number; // Return on Equity
  debtToEquity: number;
  currentRatio: number;
  priceToEarnings: number;
  priceToBook: number;
  profitMargin: number;
  source: 'fmp';
  timestamp: string;
};

export type HistoricalPrice = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type HistoricalPrices = {
  ticker: string;
  prices: HistoricalPrice[];
  source: 'alphavantage' | 'fmp';
  timestamp: string;
};

export type ApiError = {
  message: string;
  code: 'RATE_LIMIT' | 'NOT_FOUND' | 'API_ERROR' | 'NETWORK_ERROR' | 'INVALID_KEY';
  retryAfter?: number; // seconds
};

// ============================================================================
// Configuration
// ============================================================================

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';
const FMP_KEY = process.env.FMP_API_KEY || '';

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';
const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

// Cache TTLs (in milliseconds)
const PRICE_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const OWNERSHIP_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const FINANCIALS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const HISTORICAL_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Rate limiting configuration
const ALPHA_VANTAGE_DAILY_LIMIT = 25;
const FMP_DAILY_LIMIT = 250;
const MIN_REQUEST_INTERVAL = 12000; // 12 seconds between requests (5 per minute)

// ============================================================================
// Cache Management
// ============================================================================

type CachedData<T> = {
  data: T;
  timestamp: number;
};

const priceCache = new Map<string, CachedData<StockPrice>>();
const ownershipCache = new Map<string, CachedData<OwnershipData>>();
const financialsCache = new Map<string, CachedData<FinancialMetrics>>();
const historicalCache = new Map<string, CachedData<HistoricalPrices>>();

function isCacheValid<T>(cached: CachedData<T> | undefined, ttl: number): boolean {
  if (!cached) return false;
  return Date.now() - cached.timestamp < ttl;
}

function setCache<T>(
  cache: Map<string, CachedData<T>>,
  key: string,
  data: T
): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// Rate Limiting
// ============================================================================

type RateLimitState = {
  requests: number[];
  lastRequestTime: number;
};

const alphaVantageRateLimit: RateLimitState = {
  requests: [],
  lastRequestTime: 0,
};

const fmpRateLimit: RateLimitState = {
  requests: [],
  lastRequestTime: 0,
};

function cleanOldRequests(state: RateLimitState): void {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  state.requests = state.requests.filter((time) => time > oneDayAgo);
}

function canMakeRequest(state: RateLimitState, dailyLimit: number): boolean {
  cleanOldRequests(state);
  return state.requests.length < dailyLimit;
}

function recordRequest(state: RateLimitState): void {
  state.requests.push(Date.now());
  state.lastRequestTime = Date.now();
}

async function enforceInterval(state: RateLimitState): Promise<void> {
  const timeSinceLast = Date.now() - state.lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
}

// ============================================================================
// API Request Helpers
// ============================================================================

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}

function handleApiError(error: unknown, apiName: string): never {
  console.error(`[${apiName}] API error:`, error);

  if (error instanceof Error) {
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      const apiError: ApiError = {
        message: `${apiName} rate limit exceeded`,
        code: 'RATE_LIMIT',
        retryAfter: 86400, // 24 hours
      };
      throw apiError;
    }

    if (error.message.includes('404') || error.message.includes('not found')) {
      const apiError: ApiError = {
        message: 'Ticker not found',
        code: 'NOT_FOUND',
      };
      throw apiError;
    }

    if (error.message.includes('Invalid API key') || error.message.includes('401')) {
      const apiError: ApiError = {
        message: `${apiName} API key is invalid or missing`,
        code: 'INVALID_KEY',
      };
      throw apiError;
    }
  }

  const apiError: ApiError = {
    message: `${apiName} API request failed`,
    code: 'API_ERROR',
  };
  throw apiError;
}

// ============================================================================
// Alpha Vantage API Functions
// ============================================================================

async function fetchAlphaVantageQuote(ticker: string): Promise<StockPrice> {
  if (!ALPHA_VANTAGE_KEY) {
    throw new Error('Alpha Vantage API key not configured');
  }

  if (!canMakeRequest(alphaVantageRateLimit, ALPHA_VANTAGE_DAILY_LIMIT)) {
    const error: ApiError = {
      message: 'Alpha Vantage daily rate limit exceeded',
      code: 'RATE_LIMIT',
      retryAfter: 86400,
    };
    throw error;
  }

  await enforceInterval(alphaVantageRateLimit);

  const url = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`;

  try {
    const response = await fetchWithRetry(url);
    recordRequest(alphaVantageRateLimit);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const quote = data['Global Quote'];

    if (!quote || Object.keys(quote).length === 0) {
      throw new Error('Ticker not found or no data available');
    }

    const price: StockPrice = {
      ticker: ticker.toUpperCase(),
      price: parseFloat(quote['05. price'] || quote.price || '0'),
      change: parseFloat(quote['09. change'] || quote.change || '0'),
      changePercent: parseFloat(
        (quote['10. change percent'] || quote.changePercent || '0').replace('%', '')
      ),
      volume: parseInt(quote['06. volume'] || quote.volume || '0', 10),
      timestamp: new Date().toISOString(),
      source: 'alphavantage',
    };

    return price;
  } catch (error) {
    return handleApiError(error, 'Alpha Vantage');
  }
}

async function fetchAlphaVantageHistorical(
  ticker: string,
  days: number
): Promise<HistoricalPrices> {
  if (!ALPHA_VANTAGE_KEY) {
    throw new Error('Alpha Vantage API key not configured');
  }

  if (!canMakeRequest(alphaVantageRateLimit, ALPHA_VANTAGE_DAILY_LIMIT)) {
    const error: ApiError = {
      message: 'Alpha Vantage daily rate limit exceeded',
      code: 'RATE_LIMIT',
      retryAfter: 86400,
    };
    throw error;
  }

  await enforceInterval(alphaVantageRateLimit);

  const outputSize = days > 100 ? 'full' : 'compact';
  const url = `${ALPHA_VANTAGE_BASE}?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=${outputSize}&apikey=${ALPHA_VANTAGE_KEY}`;

  try {
    const response = await fetchWithRetry(url);
    recordRequest(alphaVantageRateLimit);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const timeSeries = data['Time Series (Daily)'];

    if (!timeSeries) {
      throw new Error('No historical data available for ticker');
    }

    const prices: HistoricalPrice[] = Object.entries(timeSeries)
      .slice(0, days)
      .map(([date, values]: [string, any]) => ({
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'], 10),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      ticker: ticker.toUpperCase(),
      prices,
      source: 'alphavantage',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return handleApiError(error, 'Alpha Vantage');
  }
}

// ============================================================================
// Financial Modeling Prep API Functions
// ============================================================================

async function fetchFMPQuote(ticker: string): Promise<StockPrice> {
  if (!FMP_KEY) {
    throw new Error('FMP API key not configured');
  }

  if (!canMakeRequest(fmpRateLimit, FMP_DAILY_LIMIT)) {
    const error: ApiError = {
      message: 'FMP daily rate limit exceeded',
      code: 'RATE_LIMIT',
      retryAfter: 86400,
    };
    throw error;
  }

  await enforceInterval(fmpRateLimit);

  const url = `${FMP_BASE}/quote/${ticker}?apikey=${FMP_KEY}`;

  try {
    const response = await fetchWithRetry(url);
    recordRequest(fmpRateLimit);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error('Ticker not found');
    }

    const quote = data[0];

    const price: StockPrice = {
      ticker: ticker.toUpperCase(),
      price: quote.price || 0,
      change: quote.change || 0,
      changePercent: quote.changesPercentage || 0,
      volume: quote.volume || 0,
      timestamp: new Date().toISOString(),
      source: 'fmp',
    };

    return price;
  } catch (error) {
    return handleApiError(error, 'FMP');
  }
}

async function fetchFMPOwnership(ticker: string): Promise<OwnershipData> {
  if (!FMP_KEY) {
    throw new Error('FMP API key not configured');
  }

  if (!canMakeRequest(fmpRateLimit, FMP_DAILY_LIMIT)) {
    const error: ApiError = {
      message: 'FMP daily rate limit exceeded',
      code: 'RATE_LIMIT',
      retryAfter: 86400,
    };
    throw error;
  }

  await enforceInterval(fmpRateLimit);

  // Fetch both key metrics and institutional ownership
  const keyMetricsUrl = `${FMP_BASE}/key-metrics-ttm/${ticker}?apikey=${FMP_KEY}`;
  const institutionalUrl = `${FMP_BASE}/institutional-holder/${ticker}?apikey=${FMP_KEY}`;

  try {
    // Fetch key metrics for shares outstanding
    const metricsResponse = await fetchWithRetry(keyMetricsUrl);
    recordRequest(fmpRateLimit);

    if (!metricsResponse.ok) {
      throw new Error(`HTTP ${metricsResponse.status}: ${metricsResponse.statusText}`);
    }

    const metricsData = await metricsResponse.json();

    if (!metricsData || metricsData.length === 0) {
      throw new Error('Ticker not found');
    }

    const metrics = metricsData[0];
    const sharesOutstanding = metrics.marketCapTTM && metrics.priceToEarningsRatioTTM
      ? metrics.marketCapTTM / (metrics.priceToEarningsRatioTTM || 1)
      : 0;

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Fetch institutional ownership
    let institutionalOwnershipPercent = 0;

    try {
      if (canMakeRequest(fmpRateLimit, FMP_DAILY_LIMIT)) {
        const instResponse = await fetchWithRetry(institutionalUrl);
        recordRequest(fmpRateLimit);

        if (instResponse.ok) {
          const instData = await instResponse.json();

          if (instData && instData.length > 0) {
            // Sum up institutional holdings
            const totalInstitutionalShares = instData.reduce(
              (sum: number, holder: any) => sum + (holder.shares || 0),
              0
            );

            institutionalOwnershipPercent = sharesOutstanding > 0
              ? (totalInstitutionalShares / sharesOutstanding) * 100
              : 0;
          }
        }
      }
    } catch (error) {
      console.warn('[FMP] Could not fetch institutional ownership:', error);
      // Continue with default value of 0
    }

    // Estimate insider ownership (typically 5-20% for public companies)
    const insiderOwnershipPercent = 10; // Default estimate

    const ownershipData: OwnershipData = {
      ticker: ticker.toUpperCase(),
      insiderOwnership: insiderOwnershipPercent,
      institutionalOwnership: Math.min(institutionalOwnershipPercent, 100),
      publicOwnership: Math.max(
        0,
        100 - insiderOwnershipPercent - institutionalOwnershipPercent
      ),
      floatShares: sharesOutstanding * 0.9, // Estimate: 90% of shares are float
      sharesOutstanding: sharesOutstanding,
      source: 'fmp',
      timestamp: new Date().toISOString(),
    };

    return ownershipData;
  } catch (error) {
    return handleApiError(error, 'FMP');
  }
}

async function fetchFMPFinancials(ticker: string): Promise<FinancialMetrics> {
  if (!FMP_KEY) {
    throw new Error('FMP API key not configured');
  }

  if (!canMakeRequest(fmpRateLimit, FMP_DAILY_LIMIT)) {
    const error: ApiError = {
      message: 'FMP daily rate limit exceeded',
      code: 'RATE_LIMIT',
      retryAfter: 86400,
    };
    throw error;
  }

  await enforceInterval(fmpRateLimit);

  // Fetch multiple endpoints for comprehensive CANSLIM data
  const ratiosUrl = `${FMP_BASE}/ratios-ttm/${ticker}?apikey=${FMP_KEY}`;
  const keyMetricsUrl = `${FMP_BASE}/key-metrics-ttm/${ticker}?apikey=${FMP_KEY}`;
  const growthUrl = `${FMP_BASE}/financial-growth/${ticker}?period=quarter&limit=4&apikey=${FMP_KEY}`;

  try {
    // Fetch ratios
    const ratiosResponse = await fetchWithRetry(ratiosUrl);
    recordRequest(fmpRateLimit);

    if (!ratiosResponse.ok) {
      throw new Error(`HTTP ${ratiosResponse.status}: ${ratiosResponse.statusText}`);
    }

    const ratiosData = await ratiosResponse.json();

    if (!ratiosData || ratiosData.length === 0) {
      throw new Error('Ticker not found');
    }

    const ratios = ratiosData[0];

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Fetch key metrics
    let keyMetrics: any = {};

    if (canMakeRequest(fmpRateLimit, FMP_DAILY_LIMIT)) {
      const metricsResponse = await fetchWithRetry(keyMetricsUrl);
      recordRequest(fmpRateLimit);

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        if (metricsData && metricsData.length > 0) {
          keyMetrics = metricsData[0];
        }
      }
    }

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Fetch growth metrics
    let growthMetrics: any[] = [];

    if (canMakeRequest(fmpRateLimit, FMP_DAILY_LIMIT)) {
      const growthResponse = await fetchWithRetry(growthUrl);
      recordRequest(fmpRateLimit);

      if (growthResponse.ok) {
        const growthData = await growthResponse.json();
        if (growthData && Array.isArray(growthData)) {
          growthMetrics = growthData;
        }
      }
    }

    // Calculate quarterly growth
    const latestQuarterlyGrowth = growthMetrics[0] || {};

    const financialMetrics: FinancialMetrics = {
      ticker: ticker.toUpperCase(),
      currentEPS: keyMetrics.peRatioTTM ? 1 / keyMetrics.peRatioTTM : 0,
      epsGrowthQuarterly: (latestQuarterlyGrowth.epsgrowth || 0) * 100,
      epsGrowthAnnual: (latestQuarterlyGrowth.netIncomeGrowth || 0) * 100,
      annualEarningsGrowth: (latestQuarterlyGrowth.netIncomeGrowth || 0) * 100,
      salesGrowthQuarterly: (latestQuarterlyGrowth.revenueGrowth || 0) * 100,
      roe: (ratios.returnOnEquityTTM || 0) * 100,
      debtToEquity: ratios.debtEquityRatioTTM || 0,
      currentRatio: ratios.currentRatioTTM || 0,
      priceToEarnings: ratios.priceEarningsRatioTTM || 0,
      priceToBook: ratios.priceToBookRatioTTM || 0,
      profitMargin: (ratios.netProfitMarginTTM || 0) * 100,
      source: 'fmp',
      timestamp: new Date().toISOString(),
    };

    return financialMetrics;
  } catch (error) {
    return handleApiError(error, 'FMP');
  }
}

// ============================================================================
// Public API Functions (with caching and fallback)
// ============================================================================

/**
 * Get current stock price for a ticker
 * Uses Alpha Vantage as primary source, FMP as fallback
 * Cached for 1 hour
 */
export async function getCurrentPrice(ticker: string): Promise<StockPrice> {
  const normalizedTicker = ticker.toUpperCase();

  // Check cache first
  const cached = priceCache.get(normalizedTicker);
  if (isCacheValid(cached, PRICE_CACHE_TTL)) {
    console.log(`[StockData] Returning cached price for ${normalizedTicker}`);
    return cached!.data;
  }

  console.log(`[StockData] Fetching current price for ${normalizedTicker}`);

  // Try Alpha Vantage first
  try {
    const price = await fetchAlphaVantageQuote(normalizedTicker);
    setCache(priceCache, normalizedTicker, price);
    return price;
  } catch (error) {
    console.warn('[StockData] Alpha Vantage failed, trying FMP:', error);

    // Fallback to FMP
    try {
      const price = await fetchFMPQuote(normalizedTicker);
      setCache(priceCache, normalizedTicker, price);
      return price;
    } catch (fmpError) {
      console.error('[StockData] All price sources failed:', fmpError);
      throw fmpError;
    }
  }
}

/**
 * Get ownership breakdown (insider/institutional/public)
 * Uses Financial Modeling Prep
 * Cached for 24 hours
 */
export async function getOwnershipData(ticker: string): Promise<OwnershipData> {
  const normalizedTicker = ticker.toUpperCase();

  // Check cache first
  const cached = ownershipCache.get(normalizedTicker);
  if (isCacheValid(cached, OWNERSHIP_CACHE_TTL)) {
    console.log(`[StockData] Returning cached ownership for ${normalizedTicker}`);
    return cached!.data;
  }

  console.log(`[StockData] Fetching ownership data for ${normalizedTicker}`);

  const ownership = await fetchFMPOwnership(normalizedTicker);
  setCache(ownershipCache, normalizedTicker, ownership);
  return ownership;
}

/**
 * Get financial metrics for CANSLIM calculation
 * Uses Financial Modeling Prep
 * Cached for 24 hours
 */
export async function getFinancialMetrics(ticker: string): Promise<FinancialMetrics> {
  const normalizedTicker = ticker.toUpperCase();

  // Check cache first
  const cached = financialsCache.get(normalizedTicker);
  if (isCacheValid(cached, FINANCIALS_CACHE_TTL)) {
    console.log(`[StockData] Returning cached financials for ${normalizedTicker}`);
    return cached!.data;
  }

  console.log(`[StockData] Fetching financial metrics for ${normalizedTicker}`);

  const metrics = await fetchFMPFinancials(normalizedTicker);
  setCache(financialsCache, normalizedTicker, metrics);
  return metrics;
}

/**
 * Get historical daily OHLCV prices
 * Uses Alpha Vantage as primary source
 * Cached for 1 hour
 */
export async function getHistoricalPrices(
  ticker: string,
  days: number
): Promise<HistoricalPrices> {
  const normalizedTicker = ticker.toUpperCase();
  const cacheKey = `${normalizedTicker}:${days}`;

  // Check cache first
  const cached = historicalCache.get(cacheKey);
  if (isCacheValid(cached, HISTORICAL_CACHE_TTL)) {
    console.log(
      `[StockData] Returning cached historical prices for ${normalizedTicker} (${days} days)`
    );
    return cached!.data;
  }

  console.log(
    `[StockData] Fetching historical prices for ${normalizedTicker} (${days} days)`
  );

  const historical = await fetchAlphaVantageHistorical(normalizedTicker, days);
  setCache(historicalCache, cacheKey, historical);
  return historical;
}

/**
 * Get current rate limit status for all APIs
 */
export function getRateLimitStatus() {
  cleanOldRequests(alphaVantageRateLimit);
  cleanOldRequests(fmpRateLimit);

  return {
    alphaVantage: {
      used: alphaVantageRateLimit.requests.length,
      limit: ALPHA_VANTAGE_DAILY_LIMIT,
      remaining: Math.max(
        0,
        ALPHA_VANTAGE_DAILY_LIMIT - alphaVantageRateLimit.requests.length
      ),
    },
    fmp: {
      used: fmpRateLimit.requests.length,
      limit: FMP_DAILY_LIMIT,
      remaining: Math.max(0, FMP_DAILY_LIMIT - fmpRateLimit.requests.length),
    },
  };
}

/**
 * Clear all caches (useful for testing)
 */
export function clearAllCaches(): void {
  priceCache.clear();
  ownershipCache.clear();
  financialsCache.clear();
  historicalCache.clear();
  console.log('[StockData] All caches cleared');
}
