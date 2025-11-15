/**
 * Yahoo Finance API Integration
 * Provides current prices and historical data as fallback
 * No API key required - free tier with no strict rate limits
 */

import yahooFinance from 'yahoo-finance2';
import type { StockPrice, HistoricalPrice, HistoricalPrices, ApiError } from "./types.js";

// Initialize YahooFinance instance (for v2.11+ compatibility)
const yf = new yahooFinance();

/**
 * Fetch current quote from Yahoo Finance
 */
export async function fetchYahooQuote(ticker: string): Promise<StockPrice> {
  try {
    const quote: any = await yf.quote(ticker);

    if (!quote || !quote.regularMarketPrice) {
      throw new Error('Ticker not found or no data available');
    }

    const price: StockPrice = {
      ticker: ticker.toUpperCase(),
      price: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      volume: quote.regularMarketVolume || 0,
      timestamp: new Date().toISOString(),
      source: 'yahoo',
    };

    return price;
  } catch (error: any) {
    const apiError: ApiError = {
      message: error.message || 'Yahoo Finance API error',
      code: 'API_ERROR',
    };
    throw apiError;
  }
}

/**
 * Fetch historical data from Yahoo Finance
 */
export async function fetchYahooHistorical(
  ticker: string,
  days: number
): Promise<HistoricalPrices> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result: any = await yf.historical(ticker, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    });

    if (!result || result.length === 0) {
      throw new Error('No historical data available for ticker');
    }

    const prices: HistoricalPrice[] = result.map((item: any) => ({
      date: item.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      open: item.open || 0,
      high: item.high || 0,
      low: item.low || 0,
      close: item.close || 0,
      volume: item.volume || 0,
    }))
    .sort((a: HistoricalPrice, b: HistoricalPrice) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, days);

    return {
      ticker: ticker.toUpperCase(),
      prices,
      source: 'alphavantage', // Keep as alphavantage for compatibility with existing code
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    const apiError: ApiError = {
      message: error.message || 'Yahoo Finance API error',
      code: 'API_ERROR',
    };
    throw apiError;
  }
}

/**
 * Company summary information from Yahoo Finance
 */
export interface YahooCompanySummary {
  ticker: string;
  marketCap: number | null;
  marketCapBillions: number | null;
  sharesOutstanding: number | null;
  revenue: number | null;
  revenueMillions: number | null;
  timestamp: string;
}

/**
 * Fetch company summary data including market cap from Yahoo Finance
 */
export async function fetchYahooCompanySummary(ticker: string): Promise<YahooCompanySummary> {
  try {
    const quote: any = await yf.quote(ticker);

    if (!quote) {
      throw new Error('Ticker not found or no data available');
    }

    const marketCap = quote.marketCap || null;
    const sharesOutstanding = quote.sharesOutstanding || null;
    const revenue = quote.trailingAnnualRevenue || null;

    return {
      ticker: ticker.toUpperCase(),
      marketCap,
      marketCapBillions: marketCap ? marketCap / 1_000_000_000 : null,
      sharesOutstanding,
      revenue,
      revenueMillions: revenue ? revenue / 1_000_000 : null,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    const apiError: ApiError = {
      message: error.message || 'Yahoo Finance API error',
      code: 'API_ERROR',
    };
    throw apiError;
  }
}
