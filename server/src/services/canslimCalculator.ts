import {
  getFinancialMetrics,
  getCurrentPrice,
  getHistoricalPrices,
  type FinancialMetrics,
  type StockPrice,
  type HistoricalPrices
} from './stockData';
import {
  analyzeCANSLIMWithGemini,
  type CANSLIMMetrics,
} from './gemini';
import { StockMetrics } from '../db/models';

/**
 * Complete CANSLIM score data stored in database
 */
export interface CANSLIMScore {
  ticker: string;
  score: number; // 0-100
  components: {
    C: { score: number; explanation: string };
    A: { score: number; explanation: string };
    N: { score: number; explanation: string };
    S: { score: number; explanation: string };
  };
  metrics: {
    currentEarningsGrowth: number | null;
    annualEarningsGrowth: number | null;
    isNearHighs: boolean;
    distanceFromHigh: number;
    volumeRatio: number | null;
    currentPrice: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    averageVolume: number;
    currentVolume: number;
  };
  analysis: {
    overallAnalysis: string;
    strengths: string[];
    weaknesses: string[];
    recommendation: string;
  };
  calculatedAt: Date;
}

/**
 * Calculates CANSLIM score for a stock ticker
 * Fetches required data, computes metrics, analyzes with Gemini, and stores result
 */
export async function calculateCANSLIMScore(ticker: string): Promise<CANSLIMScore> {
  const normalizedTicker = ticker.toUpperCase();

  console.log(`[CANSLIM] Calculating CANSLIM score for ${normalizedTicker}`);

  // Step 1: Fetch all required data in parallel
  const [financials, currentPrice, historicalPrices] = await Promise.all([
    getFinancialMetrics(normalizedTicker),
    getCurrentPrice(normalizedTicker),
    getHistoricalPrices(normalizedTicker, 252) // ~1 year of trading days
  ]);

  // Step 2: Calculate CANSLIM metrics
  const metrics = calculateMetrics(financials, currentPrice, historicalPrices);

  // Step 3: Analyze with Gemini AI
  const analysis = await analyzeCANSLIMWithGemini(metrics);

  // Step 4: Build the complete score object
  const canslimScore: CANSLIMScore = {
    ticker: normalizedTicker,
    score: analysis.totalScore,
    components: analysis.components,
    metrics: {
      currentEarningsGrowth: metrics.currentEarningsGrowth,
      annualEarningsGrowth: metrics.annualEarningsGrowth,
      isNearHighs: metrics.isNearHighs,
      distanceFromHigh: metrics.distanceFromHigh,
      volumeRatio: metrics.volumeRatio,
      currentPrice: metrics.currentPrice,
      fiftyTwoWeekHigh: metrics.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: metrics.fiftyTwoWeekLow,
      averageVolume: metrics.averageVolume,
      currentVolume: metrics.currentVolume
    },
    analysis: {
      overallAnalysis: analysis.overallAnalysis,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendation: analysis.recommendation
    },
    calculatedAt: new Date()
  };

  // Step 5: Store in database
  await storeCANSLIMScore(normalizedTicker, canslimScore);

  console.log(`[CANSLIM] Successfully calculated score for ${normalizedTicker}: ${canslimScore.score}/100`);

  return canslimScore;
}

/**
 * Retrieves cached CANSLIM score from database
 */
export async function getCANSLIMScore(ticker: string): Promise<CANSLIMScore | null> {
  const normalizedTicker = ticker.toUpperCase();

  const result = await StockMetrics.findOne({
    ticker: normalizedTicker,
    dataType: 'canslim'
  }).sort({ fetchedAt: -1 });

  if (!result) {
    return null;
  }

  return result.data as CANSLIMScore;
}

/**
 * Gets CANSLIM score from cache or calculates if not cached/stale
 */
export async function getOrCalculateCANSLIMScore(
  ticker: string,
  maxAgeHours: number = 24
): Promise<CANSLIMScore> {
  const normalizedTicker = ticker.toUpperCase();

  // Try to get cached score
  const cached = await getCANSLIMScore(normalizedTicker);

  if (cached) {
    const ageHours = (Date.now() - new Date(cached.calculatedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < maxAgeHours) {
      console.log(`[CANSLIM] Returning cached score for ${normalizedTicker} (age: ${ageHours.toFixed(1)}h)`);
      return cached;
    }
  }

  // Calculate fresh score
  return await calculateCANSLIMScore(normalizedTicker);
}

/**
 * Calculates the individual CANSLIM metrics from raw data
 */
function calculateMetrics(
  financials: FinancialMetrics,
  currentPrice: StockPrice,
  historicalPrices: HistoricalPrices
): CANSLIMMetrics {
  // C - Current Earnings (Quarterly EPS Growth)
  const currentEarningsGrowth = financials.epsGrowthQuarterly;

  // A - Annual Earnings (Use annualEarningsGrowth from financials)
  // If annualEarningsGrowth is available, use it. Otherwise use epsGrowthAnnual
  const annualEarningsGrowth = financials.annualEarningsGrowth || financials.epsGrowthAnnual;

  // N - New Highs (52-week high/low calculation)
  const { fiftyTwoWeekHigh, fiftyTwoWeekLow } = calculate52WeekHighLow(historicalPrices);
  const distanceFromHigh = ((fiftyTwoWeekHigh - currentPrice.price) / fiftyTwoWeekHigh) * 100;
  const isNearHighs = distanceFromHigh <= 15;

  // S - Supply & Demand (Volume analysis)
  const { averageVolume, currentVolume, volumeRatio } = calculateVolumeMetrics(
    currentPrice,
    historicalPrices
  );

  return {
    currentEarningsGrowth,
    annualEarningsGrowth,
    isNearHighs,
    distanceFromHigh,
    volumeRatio,
    ticker: currentPrice.ticker,
    currentPrice: currentPrice.price,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    averageVolume,
    currentVolume
  };
}

/**
 * Calculates 52-week high and low from historical prices
 */
function calculate52WeekHighLow(historicalPrices: HistoricalPrices): {
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
} {
  if (historicalPrices.prices.length === 0) {
    return { fiftyTwoWeekHigh: 0, fiftyTwoWeekLow: 0 };
  }

  let high = historicalPrices.prices[0].high;
  let low = historicalPrices.prices[0].low;

  for (const price of historicalPrices.prices) {
    if (price.high > high) high = price.high;
    if (price.low < low) low = price.low;
  }

  return {
    fiftyTwoWeekHigh: high,
    fiftyTwoWeekLow: low
  };
}

/**
 * Calculates volume metrics (average volume and current volume ratio)
 */
function calculateVolumeMetrics(
  currentPrice: StockPrice,
  historicalPrices: HistoricalPrices
): {
  averageVolume: number;
  currentVolume: number;
  volumeRatio: number | null;
} {
  const currentVolume = currentPrice.volume;

  if (historicalPrices.prices.length === 0) {
    return {
      averageVolume: currentVolume,
      currentVolume,
      volumeRatio: null
    };
  }

  // Calculate average volume over the period
  const totalVolume = historicalPrices.prices.reduce((sum, price) => sum + price.volume, 0);
  const averageVolume = totalVolume / historicalPrices.prices.length;

  const volumeRatio = averageVolume > 0 ? currentVolume / averageVolume : null;

  return {
    averageVolume,
    currentVolume,
    volumeRatio
  };
}

/**
 * Stores CANSLIM score in the database
 */
async function storeCANSLIMScore(ticker: string, score: CANSLIMScore): Promise<void> {
  await StockMetrics.updateOne(
    { ticker, dataType: 'canslim' },
    {
      ticker,
      dataType: 'canslim',
      data: score,
      fetchedAt: new Date()
    },
    { upsert: true }
  );

  console.log(`[CANSLIM] Stored score for ${ticker} in database`);
}
