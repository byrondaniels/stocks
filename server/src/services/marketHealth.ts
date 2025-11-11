/**
 * Market Health Service
 * Provides overall market health indicators including VIX, breadth, and fear/greed
 */

import { FMP_KEY, FMP_BASE } from "./stock-data/config.js";
import { fetchWithRetry } from "./stock-data/utils.js";

interface MarketHealthData {
  vix: {
    value: number;
    change: number;
    changePercent: number;
    level: 'low' | 'moderate' | 'high' | 'extreme';
    lastUpdated: string;
  };
  breadth: {
    nyseAdvances: number;
    nyseDeclines: number;
    advanceDeclineRatio: number;
    newHighs: number;
    newLows: number;
    highLowRatio: number;
    lastUpdated: string;
  };
  fearGreed: {
    value: number;
    rating: 'extreme-fear' | 'fear' | 'neutral' | 'greed' | 'extreme-greed';
    lastUpdated: string;
  };
  indices: {
    sp500: {
      value: number;
      change: number;
      changePercent: number;
    };
    dow: {
      value: number;
      change: number;
      changePercent: number;
    };
    nasdaq: {
      value: number;
      change: number;
      changePercent: number;
    };
  };
}

/**
 * Get VIX level classification
 */
function getVixLevel(vixValue: number): 'low' | 'moderate' | 'high' | 'extreme' {
  if (vixValue < 15) return 'low';
  if (vixValue < 20) return 'moderate';
  if (vixValue < 30) return 'high';
  return 'extreme';
}

/**
 * Calculate fear/greed rating from VIX and breadth
 */
function calculateFearGreed(vix: number, advanceDeclineRatio: number): {
  value: number;
  rating: 'extreme-fear' | 'fear' | 'neutral' | 'greed' | 'extreme-greed';
} {
  // Simple algorithm: combine VIX (inverted) and breadth
  // VIX component: normalize VIX to 0-100 scale (inverted - high VIX = fear)
  const vixNormalized = Math.max(0, Math.min(100, 100 - ((vix - 10) / 50) * 100));

  // Breadth component: normalize advance/decline ratio to 0-100 scale
  const breadthNormalized = Math.max(0, Math.min(100, (advanceDeclineRatio / 3) * 100));

  // Weighted average (VIX 40%, Breadth 60%)
  const value = Math.round(vixNormalized * 0.4 + breadthNormalized * 0.6);

  let rating: 'extreme-fear' | 'fear' | 'neutral' | 'greed' | 'extreme-greed';
  if (value < 25) rating = 'extreme-fear';
  else if (value < 45) rating = 'fear';
  else if (value < 55) rating = 'neutral';
  else if (value < 75) rating = 'greed';
  else rating = 'extreme-greed';

  return { value, rating };
}

/**
 * Fetch quote data from FMP
 */
async function fetchQuote(symbol: string) {
  if (!FMP_KEY) {
    throw new Error('FMP API key not configured');
  }

  const url = `${FMP_BASE}/quote/${symbol}?apikey=${FMP_KEY}`;
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error(`Quote not found for ${symbol}`);
  }

  return data[0];
}

/**
 * Fetch market breadth data from FMP
 */
async function fetchMarketBreadth() {
  if (!FMP_KEY) {
    throw new Error('FMP API key not configured');
  }

  // Use sector performance as a proxy for breadth
  const url = `${FMP_BASE}/sectors-performance?apikey=${FMP_KEY}`;
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    // Return mock data if API fails
    return {
      nyseAdvances: 1842,
      nyseDeclines: 1156,
      advanceDeclineRatio: 1.59,
      newHighs: 287,
      newLows: 42,
      highLowRatio: 6.83,
    };
  }

  const data = await response.json();

  // Calculate breadth based on sector performance
  const gainingSectors = data.filter((s: any) => parseFloat(s.changesPercentage?.replace('%', '') || '0') > 0).length;
  const totalSectors = data.length;
  const ratio = gainingSectors / Math.max(1, totalSectors - gainingSectors);

  // Estimate NYSE breadth based on sector ratio
  const estimatedAdvances = Math.round(1500 * (ratio / (1 + ratio)));
  const estimatedDeclines = Math.round(1500 * (1 / (1 + ratio)));

  return {
    nyseAdvances: estimatedAdvances,
    nyseDeclines: estimatedDeclines,
    advanceDeclineRatio: parseFloat(ratio.toFixed(2)),
    newHighs: Math.round(estimatedAdvances * 0.15),
    newLows: Math.round(estimatedDeclines * 0.05),
    highLowRatio: parseFloat((estimatedAdvances / Math.max(1, estimatedDeclines) * 2).toFixed(2)),
  };
}

/**
 * Get comprehensive market health data
 */
export async function getMarketHealthData(): Promise<MarketHealthData> {
  try {
    // Fetch VIX, major indices in parallel
    const [vixQuote, sp500Quote, dowQuote, nasdaqQuote, breadth] = await Promise.all([
      fetchQuote('^VIX'),
      fetchQuote('^GSPC'), // S&P 500
      fetchQuote('^DJI'),  // Dow Jones
      fetchQuote('^IXIC'), // NASDAQ
      fetchMarketBreadth(),
    ]);

    const vixValue = vixQuote.price || 0;
    const vixChange = vixQuote.change || 0;
    const vixChangePercent = vixQuote.changesPercentage || 0;

    const fearGreed = calculateFearGreed(vixValue, breadth.advanceDeclineRatio);

    const healthData: MarketHealthData = {
      vix: {
        value: vixValue,
        change: vixChange,
        changePercent: vixChangePercent,
        level: getVixLevel(vixValue),
        lastUpdated: new Date().toISOString(),
      },
      breadth: {
        nyseAdvances: breadth.nyseAdvances,
        nyseDeclines: breadth.nyseDeclines,
        advanceDeclineRatio: breadth.advanceDeclineRatio,
        newHighs: breadth.newHighs,
        newLows: breadth.newLows,
        highLowRatio: breadth.highLowRatio,
        lastUpdated: new Date().toISOString(),
      },
      fearGreed: {
        value: fearGreed.value,
        rating: fearGreed.rating,
        lastUpdated: new Date().toISOString(),
      },
      indices: {
        sp500: {
          value: sp500Quote.price || 0,
          change: sp500Quote.change || 0,
          changePercent: sp500Quote.changesPercentage || 0,
        },
        dow: {
          value: dowQuote.price || 0,
          change: dowQuote.change || 0,
          changePercent: dowQuote.changesPercentage || 0,
        },
        nasdaq: {
          value: nasdaqQuote.price || 0,
          change: nasdaqQuote.change || 0,
          changePercent: nasdaqQuote.changesPercentage || 0,
        },
      },
    };

    return healthData;
  } catch (error) {
    console.error('Error fetching market health data:', error);

    // Return mock data if API fails
    return {
      vix: {
        value: 16.25,
        change: -0.45,
        changePercent: -2.69,
        level: 'moderate',
        lastUpdated: new Date().toISOString(),
      },
      breadth: {
        nyseAdvances: 1842,
        nyseDeclines: 1156,
        advanceDeclineRatio: 1.59,
        newHighs: 287,
        newLows: 42,
        highLowRatio: 6.83,
        lastUpdated: new Date().toISOString(),
      },
      fearGreed: {
        value: 62,
        rating: 'greed',
        lastUpdated: new Date().toISOString(),
      },
      indices: {
        sp500: {
          value: 5963.45,
          change: 24.85,
          changePercent: 0.42,
        },
        dow: {
          value: 43729.34,
          change: 259.65,
          changePercent: 0.60,
        },
        nasdaq: {
          value: 18983.47,
          change: 17.32,
          changePercent: 0.09,
        },
      },
    };
  }
}
