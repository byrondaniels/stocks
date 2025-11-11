/**
 * Financial Modeling Prep API Integration
 * Provides ownership, financials, and metrics data
 */

import type { StockPrice, FinancialMetrics, CompanyProfile, ApiError } from "./types.js";
import { FMP_KEY, FMP_BASE, FMP_DAILY_LIMIT } from "./config.js";
import {
  fmpRateLimit,
  canMakeRequest,
  recordRequest,
  enforceInterval,
} from "./rate-limiter.js";
import { fetchWithRetry, handleApiError } from "./utils.js";

export async function fetchFMPQuote(ticker: string): Promise<StockPrice> {
  if (!FMP_KEY) {
    throw new Error('FMP API key not configured');
  }

  if (!canMakeRequest(fmpRateLimit, FMP_DAILY_LIMIT)) {
    const error: ApiError = {
      message: 'FMP daily rate limit exceeded',
      code: 'RATE_LIMIT',
      retryAfter: 86400,
    };
    throw error;
  }

  await enforceInterval(fmpRateLimit);

  const url = `${FMP_BASE}/quote/${ticker}?apikey=${FMP_KEY}`;

  try {
    const response = await fetchWithRetry(url);
    recordRequest(fmpRateLimit);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error('Ticker not found');
    }

    const quote = data[0];

    const price: StockPrice = {
      ticker: ticker.toUpperCase(),
      price: quote.price || 0,
      change: quote.change || 0,
      changePercent: quote.changesPercentage || 0,
      volume: quote.volume || 0,
      timestamp: new Date().toISOString(),
      source: 'fmp',
    };

    return price;
  } catch (error) {
    return handleApiError(error, 'FMP');
  }
}


export async function fetchFMPFinancials(ticker: string): Promise<FinancialMetrics> {
  if (!FMP_KEY) {
    throw new Error('FMP API key not configured');
  }

  if (!canMakeRequest(fmpRateLimit, FMP_DAILY_LIMIT)) {
    const error: ApiError = {
      message: 'FMP daily rate limit exceeded',
      code: 'RATE_LIMIT',
      retryAfter: 86400,
    };
    throw error;
  }

  await enforceInterval(fmpRateLimit);

  // Fetch multiple endpoints for comprehensive CANSLIM data
  const ratiosUrl = `${FMP_BASE}/ratios-ttm/${ticker}?apikey=${FMP_KEY}`;
  const keyMetricsUrl = `${FMP_BASE}/key-metrics-ttm/${ticker}?apikey=${FMP_KEY}`;
  const growthUrl = `${FMP_BASE}/financial-growth/${ticker}?period=quarter&limit=4&apikey=${FMP_KEY}`;

  try {
    // Fetch ratios
    const ratiosResponse = await fetchWithRetry(ratiosUrl);
    recordRequest(fmpRateLimit);

    if (!ratiosResponse.ok) {
      throw new Error(`HTTP ${ratiosResponse.status}: ${ratiosResponse.statusText}`);
    }

    const ratiosData = await ratiosResponse.json();

    if (!ratiosData || ratiosData.length === 0) {
      throw new Error('Ticker not found');
    }

    const ratios = ratiosData[0];

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Fetch key metrics
    let keyMetrics: any = {};

    if (canMakeRequest(fmpRateLimit, FMP_DAILY_LIMIT)) {
      const metricsResponse = await fetchWithRetry(keyMetricsUrl);
      recordRequest(fmpRateLimit);

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        if (metricsData && metricsData.length > 0) {
          keyMetrics = metricsData[0];
        }
      }
    }

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Fetch growth metrics
    let growthMetrics: any[] = [];

    if (canMakeRequest(fmpRateLimit, FMP_DAILY_LIMIT)) {
      const growthResponse = await fetchWithRetry(growthUrl);
      recordRequest(fmpRateLimit);

      if (growthResponse.ok) {
        const growthData = await growthResponse.json();
        if (growthData && Array.isArray(growthData)) {
          growthMetrics = growthData;
        }
      }
    }

    // Calculate quarterly growth
    const latestQuarterlyGrowth = growthMetrics[0] || {};

    const financialMetrics: FinancialMetrics = {
      ticker: ticker.toUpperCase(),
      currentEPS: keyMetrics.peRatioTTM ? 1 / keyMetrics.peRatioTTM : 0,
      epsGrowthQuarterly: (latestQuarterlyGrowth.epsgrowth || 0) * 100,
      epsGrowthAnnual: (latestQuarterlyGrowth.netIncomeGrowth || 0) * 100,
      annualEarningsGrowth: (latestQuarterlyGrowth.netIncomeGrowth || 0) * 100,
      salesGrowthQuarterly: (latestQuarterlyGrowth.revenueGrowth || 0) * 100,
      roe: (ratios.returnOnEquityTTM || 0) * 100,
      debtToEquity: ratios.debtEquityRatioTTM || 0,
      currentRatio: ratios.currentRatioTTM || 0,
      priceToEarnings: ratios.priceEarningsRatioTTM || 0,
      priceToBook: ratios.priceToBookRatioTTM || 0,
      profitMargin: (ratios.netProfitMarginTTM || 0) * 100,
      source: 'fmp',
      timestamp: new Date().toISOString(),
    };

    return financialMetrics;
  } catch (error) {
    return handleApiError(error, 'FMP');
  }
}

export async function fetchFMPProfile(ticker: string): Promise<CompanyProfile> {
  if (!FMP_KEY) {
    throw new Error('FMP API key not configured');
  }

  if (!canMakeRequest(fmpRateLimit, FMP_DAILY_LIMIT)) {
    const error: ApiError = {
      message: 'FMP daily rate limit exceeded',
      code: 'RATE_LIMIT',
      retryAfter: 86400,
    };
    throw error;
  }

  await enforceInterval(fmpRateLimit);

  const url = `${FMP_BASE}/profile/${ticker}?apikey=${FMP_KEY}`;

  try {
    const response = await fetchWithRetry(url);
    recordRequest(fmpRateLimit);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error('Ticker not found');
    }

    const profile = data[0];

    const companyProfile: CompanyProfile = {
      ticker: ticker.toUpperCase(),
      name: profile.companyName || profile.symbol || '',
      sector: profile.sector || null,
      industry: profile.industry || null,
      description: profile.description || undefined,
      ceo: profile.ceo || undefined,
      employees: profile.fullTimeEmployees ? parseInt(profile.fullTimeEmployees) : undefined,
      country: profile.country || undefined,
      website: profile.website || undefined,
      source: 'fmp',
      timestamp: new Date().toISOString(),
    };

    return companyProfile;
  } catch (error) {
    return handleApiError(error, 'FMP');
  }
}
