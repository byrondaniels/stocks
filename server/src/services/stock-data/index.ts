/**
 * Stock Data Service - Main API
 * Provides abstraction layer for multiple stock data APIs with caching and fallback
 */

// Export types
export * from "./types.js";

// Export cache management
export { clearAllCaches } from "./cache.js";

// Import internal modules
import {
  priceCache,
  ownershipCache,
  financialsCache,
  historicalCache,
  isCacheValid,
  setCache,
} from "./cache.js";

import {
  PRICE_CACHE_TTL,
  OWNERSHIP_CACHE_TTL,
  FINANCIALS_CACHE_TTL,
  HISTORICAL_CACHE_TTL,
  ALPHA_VANTAGE_DAILY_LIMIT,
  FMP_DAILY_LIMIT,
} from "./config.js";

import { getRateLimitStatus as getRateLimitStatusInternal } from "./rate-limiter.js";

import { fetchAlphaVantageQuote, fetchAlphaVantageHistorical } from "./alpha-vantage.js";
import { fetchFMPQuote, fetchFMPOwnership, fetchFMPFinancials } from "./fmp.js";

import type { StockPrice, OwnershipData, FinancialMetrics, HistoricalPrices } from "./types.js";

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
  return getRateLimitStatusInternal(ALPHA_VANTAGE_DAILY_LIMIT, FMP_DAILY_LIMIT);
}
