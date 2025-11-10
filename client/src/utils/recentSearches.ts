/**
 * Utilities for managing recently searched stocks in localStorage
 */

import { RecentlySearchedStock } from '../types';

const STORAGE_KEY = 'recentlySearchedStocks';
const MAX_RECENT_SEARCHES = 5;

/**
 * Get all recently searched stocks from localStorage
 */
export function getRecentSearches(): RecentlySearchedStock[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as RecentlySearchedStock[];
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error loading recent searches:', error);
    return [];
  }
}

/**
 * Add a stock to recently searched list
 * If the stock already exists, update its timestamp
 * Keep only the most recent MAX_RECENT_SEARCHES items
 */
export function addRecentSearch(ticker: string, companyName: string): void {
  try {
    const existing = getRecentSearches();

    // Remove existing entry for this ticker (if any)
    const filtered = existing.filter(
      item => item.ticker.toUpperCase() !== ticker.toUpperCase()
    );

    // Add new entry at the beginning
    const updated: RecentlySearchedStock[] = [
      {
        ticker: ticker.toUpperCase(),
        companyName,
        timestamp: Date.now()
      },
      ...filtered
    ].slice(0, MAX_RECENT_SEARCHES);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
}

/**
 * Clear all recently searched stocks
 */
export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing recent searches:', error);
  }
}
