/**
 * Shared caching utilities for analysis data
 * Provides cache-or-calculate pattern and database storage helpers
 */

import { StockMetrics } from '../db/models';

/**
 * Cache configuration for analysis data
 */
export interface CacheConfig {
  /** Cache TTL in hours (default: 24) */
  ttlHours?: number;
  /** Metric type identifier */
  metricType: string;
  /** Whether to force refresh */
  forceRefresh?: boolean;
}

/**
 * Checks if cached data is still valid based on TTL
 *
 * @param timestamp - Timestamp of cached data
 * @param ttlHours - Time-to-live in hours
 * @returns True if cache is still valid
 */
export function isCacheValid(timestamp: Date, ttlHours: number = 24): boolean {
  const cacheAge = Date.now() - new Date(timestamp).getTime();
  const maxAge = ttlHours * 60 * 60 * 1000;
  return cacheAge < maxAge;
}

/**
 * Retrieves cached analysis data from database
 *
 * @param ticker - Stock ticker symbol
 * @param metricType - Type of metric to retrieve
 * @param ttlHours - Cache TTL in hours
 * @returns Cached data or null if not found/expired
 */
export async function getCachedAnalysis<T>(
  ticker: string,
  metricType: string,
  ttlHours: number = 24
): Promise<T | null> {
  const result = await StockMetrics.findOne({
    ticker: ticker.toUpperCase(),
    metricType
  });

  if (!result) {
    return null;
  }

  if (!isCacheValid(result.calculatedAt, ttlHours)) {
    return null;
  }

  return result.data as T;
}

/**
 * Stores analysis data in database cache
 *
 * @param ticker - Stock ticker symbol
 * @param metricType - Type of metric being stored
 * @param data - Analysis data to store
 */
export async function storeAnalysis<T>(
  ticker: string,
  metricType: string,
  data: T
): Promise<void> {
  await StockMetrics.updateOne(
    { ticker: ticker.toUpperCase(), metricType },
    {
      ticker: ticker.toUpperCase(),
      metricType,
      data,
      calculatedAt: new Date()
    },
    { upsert: true }
  );
}

/**
 * Cache-or-calculate pattern for analysis operations
 *
 * @param ticker - Stock ticker symbol
 * @param config - Cache configuration
 * @param calculator - Function that calculates the data if not cached
 * @returns Cached or freshly calculated data
 *
 * @example
 * const rsRating = await getCachedOrCalculate(
 *   'AAPL',
 *   { metricType: 'rs-rating', ttlHours: 24 },
 *   async () => calculateRSRating('AAPL')
 * );
 */
export async function getCachedOrCalculate<T>(
  ticker: string,
  config: CacheConfig,
  calculator: () => Promise<T>
): Promise<T> {
  const normalizedTicker = ticker.toUpperCase();
  const ttlHours = config.ttlHours ?? 24;

  // Check cache first (unless force refresh)
  if (!config.forceRefresh) {
    const cached = await getCachedAnalysis<T>(
      normalizedTicker,
      config.metricType,
      ttlHours
    );

    if (cached !== null) {
      console.log(
        `[Cache] Using cached ${config.metricType} for ${normalizedTicker}`
      );
      return cached;
    }
  }

  // Calculate fresh data
  console.log(
    `[Cache] Calculating fresh ${config.metricType} for ${normalizedTicker}`
  );
  const data = await calculator();

  // Store in cache
  await storeAnalysis(normalizedTicker, config.metricType, data);

  return data;
}
