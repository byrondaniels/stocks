/**
 * Price History Service
 *
 * Handles fetching and storing historical stock prices,
 * calculating moving averages, and managing price data updates.
 */

import { StockPrice } from '../db/index.js';
import { getHistoricalPrices } from './stockData.js';

/**
 * Fetch and store historical prices for a ticker
 *
 * Fetches price data from external API and stores it in the database.
 * Uses upsert to avoid duplicates. Useful for initial data population
 * or refreshing historical data.
 *
 * @param ticker Stock ticker symbol
 * @param days Number of days of historical data to fetch (default: 50)
 * @returns Number of price records stored
 *
 * @example
 * // Fetch 50 days of historical data for AAPL
 * const count = await fetchAndStoreHistoricalPrices('AAPL');
 * console.log(`Stored ${count} price records`);
 *
 * @example
 * // Fetch 200 days for more comprehensive analysis
 * const count = await fetchAndStoreHistoricalPrices('TSLA', 200);
 */
export async function fetchAndStoreHistoricalPrices(
  ticker: string,
  days: number = 50
): Promise<number> {
  const normalizedTicker = ticker.toUpperCase();

  console.log(`[PriceHistory] Fetching ${days} days of historical data for ${normalizedTicker}`);

  try {
    // Fetch historical prices from external API
    const historicalData = await getHistoricalPrices(normalizedTicker, days);

    if (!historicalData.prices || historicalData.prices.length === 0) {
      console.warn(`[PriceHistory] No historical data returned for ${normalizedTicker}`);
      return 0;
    }

    console.log(`[PriceHistory] Received ${historicalData.prices.length} price records for ${normalizedTicker}`);

    // Store prices in database (upsert to avoid duplicates)
    let storedCount = 0;

    for (const price of historicalData.prices) {
      try {
        await StockPrice.updateOne(
          {
            ticker: normalizedTicker,
            date: new Date(price.date),
          },
          {
            ticker: normalizedTicker,
            date: new Date(price.date),
            open: price.open,
            high: price.high,
            low: price.low,
            close: price.close,
            volume: price.volume,
          },
          {
            upsert: true, // Insert if doesn't exist, update if it does
          }
        );
        storedCount++;
      } catch (error) {
        console.error(`[PriceHistory] Error storing price for ${normalizedTicker} on ${price.date}:`, error);
        // Continue with other prices even if one fails
      }
    }

    console.log(`[PriceHistory] Stored ${storedCount} price records for ${normalizedTicker}`);
    return storedCount;
  } catch (error) {
    console.error(`[PriceHistory] Failed to fetch/store historical prices for ${normalizedTicker}:`, error);
    throw error;
  }
}

/**
 * Calculate the N-day moving average from stored prices
 *
 * Fetches the most recent N days of closing prices and calculates
 * their average. Returns null if less than 20 days of data available.
 *
 * @param ticker Stock ticker symbol
 * @param days Number of days for moving average (default: 50)
 * @returns Moving average value or null if insufficient data
 *
 * @example
 * // Calculate 50-day moving average
 * const ma50 = await calculateMovingAverage('AAPL');
 * console.log(`50DMA: $${ma50?.toFixed(2)}`);
 *
 * @example
 * // Calculate 200-day moving average
 * const ma200 = await calculateMovingAverage('AAPL', 200);
 */
export async function calculateMovingAverage(
  ticker: string,
  days: number = 50
): Promise<number | null> {
  const normalizedTicker = ticker.toUpperCase();

  try {
    // Fetch the most recent N days of prices from database
    const prices = await StockPrice.find({ ticker: normalizedTicker })
      .sort({ date: -1 }) // Most recent first
      .limit(days)
      .lean();

    if (prices.length < days) {
      console.warn(
        `[PriceHistory] Insufficient data for ${days}-day MA. Found ${prices.length} days for ${normalizedTicker}`
      );
      // Still calculate MA if we have some data (at least 20 days)
      if (prices.length < 20) {
        return null;
      }
    }

    // Calculate average of closing prices
    const sum = prices.reduce((acc: number, price: any) => acc + price.close, 0);
    const average = sum / prices.length;

    console.log(
      `[PriceHistory] Calculated ${prices.length}-day MA for ${normalizedTicker}: ${average.toFixed(2)}`
    );

    return average;
  } catch (error) {
    console.error(`[PriceHistory] Error calculating moving average for ${normalizedTicker}:`, error);
    return null;
  }
}

/**
 * Get the most recent price data for a ticker from database
 * @param ticker Stock ticker symbol
 * @returns Most recent price record or null
 */
export async function getLatestStoredPrice(ticker: string) {
  const normalizedTicker = ticker.toUpperCase();

  try {
    const latestPrice = await StockPrice.findOne({ ticker: normalizedTicker })
      .sort({ date: -1 })
      .lean();

    return latestPrice;
  } catch (error) {
    console.error(`[PriceHistory] Error fetching latest price for ${normalizedTicker}:`, error);
    return null;
  }
}

/**
 * Get price history summary for a ticker
 * @param ticker Stock ticker symbol
 * @returns Object containing price count, date range, and 50DMA
 */
export async function getPriceHistorySummary(ticker: string) {
  const normalizedTicker = ticker.toUpperCase();

  try {
    const priceCount = await StockPrice.countDocuments({ ticker: normalizedTicker });

    if (priceCount === 0) {
      return {
        ticker: normalizedTicker,
        priceCount: 0,
        oldestDate: null,
        latestDate: null,
        movingAverage50: null,
      };
    }

    // Get oldest and newest dates
    const oldestPrice = await StockPrice.findOne({ ticker: normalizedTicker })
      .sort({ date: 1 })
      .lean();

    const latestPrice = await StockPrice.findOne({ ticker: normalizedTicker })
      .sort({ date: -1 })
      .lean();

    // Calculate 50-day moving average
    const movingAverage50 = await calculateMovingAverage(normalizedTicker, 50);

    return {
      ticker: normalizedTicker,
      priceCount,
      oldestDate: oldestPrice?.date || null,
      latestDate: latestPrice?.date || null,
      movingAverage50,
    };
  } catch (error) {
    console.error(`[PriceHistory] Error getting price summary for ${normalizedTicker}:`, error);
    throw error;
  }
}

/**
 * Calculate 50DMA statistics including percentage difference from current price
 *
 * Combines current price with 50-day moving average to calculate how far
 * the stock price is from its 50DMA. Positive values indicate price is above
 * the MA (bullish), negative values indicate price is below (bearish).
 *
 * @param ticker Stock ticker symbol
 * @returns Object with 50DMA, current price, percentage difference, and metadata
 *
 * @example
 * const stats = await calculate50DMA('AAPL');
 * console.log(`Current: $${stats.currentPrice}`);              // e.g., 185.92
 * console.log(`50DMA: $${stats.movingAverage50}`);            // e.g., 180.45
 * console.log(`% Difference: ${stats.percentageDifference}%`); // e.g., 3.03
 * console.log(`Data points: ${stats.priceCount}`);            // e.g., 50
 *
 * if (stats.percentageDifference > 0) {
 *   console.log('Price is above 50DMA (bullish)');
 * }
 */
export async function calculate50DMA(ticker: string) {
  const normalizedTicker = ticker.toUpperCase();

  try {
    // Get the most recent price (current price)
    const latestPrice = await getLatestStoredPrice(normalizedTicker);

    // Calculate 50-day moving average
    const movingAverage50 = await calculateMovingAverage(normalizedTicker, 50);

    // If we don't have enough data, return null values
    if (!latestPrice || !movingAverage50) {
      return {
        currentPrice: latestPrice?.close || null,
        movingAverage50: movingAverage50,
        percentageDifference: null,
        priceCount: await StockPrice.countDocuments({ ticker: normalizedTicker }),
      };
    }

    // Calculate percentage difference: ((current - MA) / MA) * 100
    // Positive means price is above 50DMA, negative means below
    const percentageDifference = ((latestPrice.close - movingAverage50) / movingAverage50) * 100;

    return {
      currentPrice: latestPrice.close,
      movingAverage50: movingAverage50,
      percentageDifference: percentageDifference,
      priceCount: await StockPrice.countDocuments({ ticker: normalizedTicker }),
      latestDate: latestPrice.date,
    };
  } catch (error) {
    console.error(`[PriceHistory] Error calculating 50DMA stats for ${normalizedTicker}:`, error);
    throw error;
  }
}

/**
 * Delete all stored prices for a ticker
 * @param ticker Stock ticker symbol
 * @returns Number of deleted records
 */
export async function deleteStoredPrices(ticker: string): Promise<number> {
  const normalizedTicker = ticker.toUpperCase();

  try {
    const result = await StockPrice.deleteMany({ ticker: normalizedTicker });
    console.log(`[PriceHistory] Deleted ${result.deletedCount} price records for ${normalizedTicker}`);
    return result.deletedCount || 0;
  } catch (error) {
    console.error(`[PriceHistory] Error deleting prices for ${normalizedTicker}:`, error);
    throw error;
  }
}
