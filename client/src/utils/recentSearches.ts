/**
 * Utilities for managing recently searched stocks using MongoDB API
 */

import { RecentlySearchedStock } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const MAX_RECENT_SEARCHES = 10;

/**
 * Get all recently searched stocks from MongoDB API
 */
export async function getRecentSearches(): Promise<RecentlySearchedStock[]> {
  try {
    const response = await fetch(`${API_BASE}/api/search/recent?limit=${MAX_RECENT_SEARCHES}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch recent searches: ${response.status}`);
    }

    const data = await response.json();
    return data.searches.map((search: any) => ({
      ticker: search.ticker,
      companyName: search.companyName || search.ticker,
      timestamp: new Date(search.searchedAt).getTime(),
    }));
  } catch (error) {
    console.error('Error loading recent searches:', error);
    return [];
  }
}

/**
 * Add a stock to recently searched list via MongoDB API
 * The server handles deduplication and cleanup
 */
export async function addRecentSearch(ticker: string, companyName: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/search/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticker: ticker.toUpperCase(),
        companyName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save search: ${response.status}`);
    }
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
}

/**
 * Clear all recently searched stocks
 * Note: This would need a server endpoint to clear all searches
 * For now, this is a no-op as we typically don't want to delete search history
 */
export function clearRecentSearches(): void {
  console.warn('Clear recent searches not implemented for MongoDB storage');
  // Could implement DELETE /api/search/history if needed
}
