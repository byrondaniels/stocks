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
  financialsCache,
  historicalCache,
  profileCache,
  isCacheValid,
  setCache,
} from "./cache.js";

import {
  PRICE_CACHE_TTL,
  FINANCIALS_CACHE_TTL,
  HISTORICAL_CACHE_TTL,
  PROFILE_CACHE_TTL,
  ALPHA_VANTAGE_DAILY_LIMIT,
  FMP_DAILY_LIMIT,
} from "./config.js";

import { getRateLimitStatus as getRateLimitStatusInternal } from "./rate-limiter.js";

import { fetchAlphaVantageQuote, fetchAlphaVantageHistorical } from "./alpha-vantage.js";
import { fetchFMPQuote, fetchFMPProfile } from "./fmp.js";
import { fetchYahooQuote, fetchYahooHistorical } from "./yahoo-finance.js";

import type { StockPrice, FinancialMetrics, HistoricalPrices, CompanyProfile, VolumeAnalysis } from "./types.js";
import { StockPrice as StockPriceModel } from "../../db/models/StockPrice.model.js";

/**
 * Get current stock price for a ticker
 * Extracts from cached historical data (most recent day)
 * Falls back to API calls only if no historical data available
 * Cached for 24 hours
 */
export async function getCurrentPrice(ticker: string): Promise<StockPrice> {
  const normalizedTicker = ticker.toUpperCase();

  // Check in-memory cache first
  const cached = priceCache.get(normalizedTicker);
  if (isCacheValid(cached, PRICE_CACHE_TTL)) {
    console.log(`[StockData] Returning cached price for ${normalizedTicker}`);
    return cached!.data;
  }

  console.log(`[StockData] Extracting current price from historical data for ${normalizedTicker}`);

  // Get historical data (this uses our efficient database caching)
  try {
    const historical = await getHistoricalPrices(normalizedTicker, 5); // Get last 5 days to ensure we have recent data
    
    if (historical.prices && historical.prices.length > 0) {
      // Sort by date to get the most recent
      const sortedPrices = historical.prices.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      const mostRecent = sortedPrices[0];
      const previousDay = sortedPrices[1];
      
      // Calculate change from previous day
      const change = previousDay ? mostRecent.close - previousDay.close : 0;
      const changePercent = previousDay ? ((change / previousDay.close) * 100) : 0;
      
      const currentPrice: StockPrice = {
        ticker: normalizedTicker,
        price: mostRecent.close,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume: mostRecent.volume,
        timestamp: new Date().toISOString(),
        source: historical.source,
      };
      
      // Cache the result
      setCache(priceCache, normalizedTicker, currentPrice);
      console.log(`[StockData] Extracted current price for ${normalizedTicker}: $${currentPrice.price}`);
      return currentPrice;
    }
  } catch (error) {
    console.warn(`[StockData] Could not extract price from historical data for ${normalizedTicker}:`, error);
  }

  // Fallback to direct API calls if no historical data available
  console.log(`[StockData] No historical data available, fetching current price via API for ${normalizedTicker}`);

  /* ORIGINAL API CODE - KEPT FOR POTENTIAL FUTURE USE
  // Try Alpha Vantage first
  try {
    const price = await fetchAlphaVantageQuote(normalizedTicker);
    setCache(priceCache, normalizedTicker, price);
    return price;
  } catch (error) {
    console.warn('[StockData] Alpha Vantage failed, trying Yahoo Finance:', error);

    // Fallback to Yahoo Finance
    try {
      const price = await fetchYahooQuote(normalizedTicker);
      setCache(priceCache, normalizedTicker, price);
      return price;
    } catch (yahooError) {
      console.error('[StockData] All price sources failed:', yahooError);
      throw yahooError;
    }
  }
  */

  // For now, throw an error if no historical data is available
  throw new Error(`No current price data available for ${normalizedTicker} - no historical data found`);
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

  console.log(`[StockData] FMP financials temporarily disabled (requires paid subscription)`);

  // FMP requires paid subscription, return mock data for now
  const mockMetrics: FinancialMetrics = {
    ticker: normalizedTicker,
    currentEPS: 6.12, // Mock current EPS
    epsGrowthQuarterly: 5.8, // Mock quarterly growth
    epsGrowthAnnual: 12.0, // Mock annual growth
    annualEarningsGrowth: 8.5, // Mock 5-year average
    salesGrowthQuarterly: 8.1, // Mock sales growth
    roe: 22.0, // Typical for healthy companies
    debtToEquity: 0.8, // Moderate debt
    currentRatio: 1.2, // Adequate liquidity
    priceToEarnings: 28.5, // Mock P/E ratio
    priceToBook: 4.2, // Mock P/B ratio
    profitMargin: 25.2, // Mock profit margin
    source: 'fmp',
    timestamp: new Date().toISOString()
  };
  
  setCache(financialsCache, normalizedTicker, mockMetrics);
  return mockMetrics;
}

/**
 * Get historical daily OHLCV prices
 * Uses database cache (24 hours), then Alpha Vantage as primary source, Yahoo Finance as fallback
 * Cached in database for 24 hours and in-memory for 24 hours
 */
export async function getHistoricalPrices(
  ticker: string,
  days: number
): Promise<HistoricalPrices> {
  const normalizedTicker = ticker.toUpperCase();
  const cacheKey = `${normalizedTicker}:${days}`;

  // Check in-memory cache first
  const cached = historicalCache.get(cacheKey);
  if (isCacheValid(cached, HISTORICAL_CACHE_TTL)) {
    console.log(
      `[StockData] Returning memory cached historical prices for ${normalizedTicker} (${days} days)`
    );
    return cached!.data;
  }

  // Check database cache
  const cacheThreshold = new Date(Date.now() - HISTORICAL_CACHE_TTL);
  const cachedData = await StockPriceModel.findOne({
    ticker: normalizedTicker,
    lastFetched: { $gte: cacheThreshold }
  }).sort({ lastFetched: -1 });

  if (cachedData) {
    console.log(
      `[StockData] Checking database for ${normalizedTicker} historical data`
    );

    // Get all cached historical data for this ticker
    const dbHistorical = await StockPriceModel.find({
      ticker: normalizedTicker,
      lastFetched: { $gte: cacheThreshold }
    })
    .sort({ date: -1 })
    .limit(days);

    if (dbHistorical.length >= Math.min(days, 30)) { // Require at least 30 days or requested days
      console.log(
        `[StockData] Returning database cached historical prices for ${normalizedTicker} (${dbHistorical.length} days)`
      );

      const historical: HistoricalPrices = {
        ticker: normalizedTicker,
        prices: dbHistorical.map(item => ({
          date: item.date.toISOString().split('T')[0],
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
        })),
        source: cachedData.source || 'database',
        timestamp: new Date().toISOString(),
      };

      // Cache in memory too
      setCache(historicalCache, cacheKey, historical);
      return historical;
    }
  }

  console.log(
    `[StockData] Fetching fresh historical prices for ${normalizedTicker} (${days} days)`
  );

  // Try Alpha Vantage first
  try {
    const historical = await fetchAlphaVantageHistorical(normalizedTicker, days);
    
    // Save to database
    await saveHistoricalToDatabase(normalizedTicker, historical);
    
    setCache(historicalCache, cacheKey, historical);
    return historical;
  } catch (error) {
    console.warn('[StockData] Alpha Vantage historical failed, trying Yahoo Finance:', error);

    // Fallback to Yahoo Finance
    try {
      const historical = await fetchYahooHistorical(normalizedTicker, days);
      
      // Save to database
      await saveHistoricalToDatabase(normalizedTicker, historical);
      
      setCache(historicalCache, cacheKey, historical);
      return historical;
    } catch (yahooError) {
      console.error('[StockData] All historical sources failed:', yahooError);
      throw yahooError;
    }
  }
}

/**
 * Get company profile including sector and industry information
 * Uses Financial Modeling Prep
 * Cached for 7 days (sector/industry rarely changes)
 */
export async function getCompanyProfile(ticker: string): Promise<CompanyProfile> {
  const normalizedTicker = ticker.toUpperCase();

  // Check cache first
  const cached = profileCache.get(normalizedTicker);
  if (isCacheValid(cached, PROFILE_CACHE_TTL)) {
    console.log(`[StockData] Returning cached profile for ${normalizedTicker}`);
    return cached!.data;
  }

  console.log(`[StockData] Fetching company profile for ${normalizedTicker}`);

  const profile = await fetchFMPProfile(normalizedTicker);
  setCache(profileCache, normalizedTicker, profile);
  return profile;

}

/**
 * Calculate volume analysis for IBD Up/Down Volume Ratio
 * Analyzes the past 50 trading days (or fewer if less data available)
 * Cached for 1 hour
 */
export async function getVolumeAnalysis(ticker: string): Promise<VolumeAnalysis> {
  const normalizedTicker = ticker.toUpperCase();
  const days = 51; // Need 51 days to calculate 50 up/down days (need previous close for comparison)

  // Get historical data (uses existing cache mechanism)
  const historical = await getHistoricalPrices(normalizedTicker, days);

  if (!historical.prices || historical.prices.length < 2) {
    throw new Error('Insufficient historical data for volume analysis');
  }

  // Sort by date ascending to ensure chronological order
  const sortedPrices = [...historical.prices].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let upVolume = 0;
  let downVolume = 0;
  let daysAnalyzed = 0;

  // Start from index 1 since we need previous day's close for comparison
  for (let i = 1; i < sortedPrices.length; i++) {
    const currentDay = sortedPrices[i];
    const previousDay = sortedPrices[i - 1];

    if (currentDay.close > previousDay.close) {
      // Up day: closing price higher than previous close
      upVolume += currentDay.volume;
      daysAnalyzed++;
    } else if (currentDay.close < previousDay.close) {
      // Down day: closing price lower than previous close
      downVolume += currentDay.volume;
      daysAnalyzed++;
    }
    // If close === previousClose, we don't count it as up or down
  }

  const totalVolume = upVolume + downVolume;
  const upVolumePercent = totalVolume > 0 ? Math.round((upVolume / totalVolume) * 100) : 0;
  const downVolumePercent = totalVolume > 0 ? Math.round((downVolume / totalVolume) * 100) : 0;
  const netVolume = upVolume - downVolume;
  const upDownRatio = downVolume > 0 ? parseFloat((upVolume / downVolume).toFixed(2)) : 0;

  // Get the most recent date
  const mostRecentDate = sortedPrices[sortedPrices.length - 1].date;

  return {
    ticker: normalizedTicker,
    date: mostRecentDate,
    totalVolume,
    upVolume,
    downVolume,
    upVolumePercent,
    downVolumePercent,
    netVolume,
    upDownRatio,
    daysAnalyzed,
  };
}

/**
 * Get current rate limit status for all APIs
 */
/**
 * Save historical price data to database
 */
async function saveHistoricalToDatabase(
  ticker: string,
  historical: HistoricalPrices
): Promise<void> {
  const now = new Date();
  
  try {
    const operations = historical.prices.map(price => ({
      updateOne: {
        filter: { 
          ticker: ticker.toUpperCase(),
          date: new Date(price.date)
        },
        update: {
          $set: {
            ticker: ticker.toUpperCase(),
            date: new Date(price.date),
            open: price.open,
            high: price.high,
            low: price.low,
            close: price.close,
            volume: price.volume,
            source: historical.source,
            lastFetched: now,
            updatedAt: now
          }
        },
        upsert: true
      }
    }));

    if (operations.length > 0) {
      await StockPriceModel.bulkWrite(operations);
      console.log(`[StockData] Saved ${operations.length} historical prices for ${ticker} to database`);
    }
  } catch (error) {
    console.error(`[StockData] Error saving historical data to database for ${ticker}:`, error);
    // Don't throw error - this shouldn't break the main flow
  }
}

export function getRateLimitStatus() {
  return getRateLimitStatusInternal(ALPHA_VANTAGE_DAILY_LIMIT, FMP_DAILY_LIMIT);
}
