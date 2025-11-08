/**
 * Alpha Vantage API Integration
 * Provides current prices and historical data
 */

import type { StockPrice, HistoricalPrice, HistoricalPrices, ApiError } from "./types.js";
import { ALPHA_VANTAGE_KEY, ALPHA_VANTAGE_BASE, ALPHA_VANTAGE_DAILY_LIMIT } from "./config.js";
import {
  alphaVantageRateLimit,
  canMakeRequest,
  recordRequest,
  enforceInterval,
} from "./rate-limiter.js";
import { fetchWithRetry, handleApiError } from "./utils.js";

export async function fetchAlphaVantageQuote(ticker: string): Promise<StockPrice> {
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

export async function fetchAlphaVantageHistorical(
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
