/**
 * Price History Service
 *
 * Handles fetching and storing historical stock prices,
 * calculating moving averages, and managing price data updates.
 */

import { StockPrice } from '../db/index.js';
import { getHistoricalPrices, type HistoricalPrice } from './stockData.js';

/**
 * Fetch and store historical prices for a ticker
 * @param ticker Stock ticker symbol
 * @param days Number of days of historical data to fetch (default: 50)
 * @returns Number of price records stored
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
 * @param ticker Stock ticker symbol
 * @param days Number of days for moving average (default: 50)
 * @returns Moving average value or null if insufficient data
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
 * @param ticker Stock ticker symbol
 * @returns Object with 50DMA, current price, and percentage difference
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
