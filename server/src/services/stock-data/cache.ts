/**
 * Cache Management for Stock Data
 */

import type {
  StockPrice,
  OwnershipData,
  FinancialMetrics,
  HistoricalPrices,
  CompanyProfile,
} from "./types.js";

type CachedData<T> = {
  data: T;
  timestamp: number;
};

export const priceCache = new Map<string, CachedData<StockPrice>>();
export const ownershipCache = new Map<string, CachedData<OwnershipData>>();
export const financialsCache = new Map<string, CachedData<FinancialMetrics>>();
export const historicalCache = new Map<string, CachedData<HistoricalPrices>>();
export const profileCache = new Map<string, CachedData<CompanyProfile>>();

export function isCacheValid<T>(cached: CachedData<T> | undefined, ttl: number): boolean {
  if (!cached) return false;
  return Date.now() - cached.timestamp < ttl;
}

export function setCache<T>(
  cache: Map<string, CachedData<T>>,
  key: string,
  data: T
): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearAllCaches(): void {
  priceCache.clear();
  ownershipCache.clear();
  financialsCache.clear();
  historicalCache.clear();
  profileCache.clear();
  console.log('[StockData] All caches cleared');
}
