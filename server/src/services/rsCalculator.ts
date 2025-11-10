import {
  getCurrentPrice,
  getHistoricalPrices,
  type StockPrice,
  type HistoricalPrices
} from './stockData';
import { StockMetrics } from '../db/models';
import { Portfolio } from '../db/models';

/**
 * IBD-style Relative Strength (RS) Rating
 * Ranks a stock's price performance against all other stocks on a scale of 1-99
 */
export interface RSRating {
  ticker: string;
  rating: number; // 1-99 (percentile rank)
  pricePerformance: {
    month3: number;  // 3-month price change %
    month6: number;  // 6-month price change %
    month9: number;  // 9-month price change %
    month12: number; // 12-month price change %
    weightedScore: number; // Combined weighted score
  };
  calculatedAt: Date;
}

/**
 * Calculates IBD-style RS rating for a stock
 *
 * The rating compares the stock's price performance to all other stocks in the portfolio
 * using Investor's Business Daily methodology:
 * - 40% weight on most recent 3 months
 * - 20% weight each on months 4-6, 7-9, and 10-12
 * - Returns percentile rank (1-99) where higher is better
 *
 * @param ticker Stock ticker symbol
 * @returns RS rating object with percentile rank and performance breakdown
 *
 * @example
 * const rsRating = await calculateRSRating('AAPL');
 * console.log(`RS Rating: ${rsRating.rating}/99`);              // e.g., 87/99
 * console.log(`3-month: ${rsRating.pricePerformance.month3}%`); // e.g., 15.5%
 * console.log(`12-month: ${rsRating.pricePerformance.month12}%`); // e.g., 28.3%
 *
 * if (rsRating.rating >= 80) {
 *   console.log('Strong relative strength - potential leader');
 * }
 */
export async function calculateRSRating(ticker: string): Promise<RSRating> {
  const normalizedTicker = ticker.toUpperCase();

  console.log(`[RS] Calculating RS rating for ${normalizedTicker}`);

  // Step 1: Get price performance for the target stock
  const targetPerformance = await calculatePricePerformance(normalizedTicker);

  // Step 2: Get all other tickers from portfolio to compare against
  const allTickers = await getAllPortfolioTickers();

  // Step 3: Calculate performance for all stocks
  const allPerformances = await Promise.allSettled(
    allTickers.map(async (t) => ({
      ticker: t,
      performance: await calculatePricePerformance(t)
    }))
  );

  // Filter out failed calculations
  const validPerformances = allPerformances
    .filter((result): result is PromiseFulfilledResult<{ ticker: string; performance: number }> =>
      result.status === 'fulfilled' && result.value.performance !== null
    )
    .map(result => result.value);

  // Step 4: Calculate percentile rank
  const rating = calculatePercentileRank(targetPerformance, validPerformances.map(p => p.performance));

  // Step 5: Get detailed performance breakdown
  const performanceBreakdown = await calculatePerformanceBreakdown(normalizedTicker);

  const rsRating: RSRating = {
    ticker: normalizedTicker,
    rating,
    pricePerformance: performanceBreakdown,
    calculatedAt: new Date()
  };

  // Step 6: Store in database
  await storeRSRating(normalizedTicker, rsRating);

  console.log(`[RS] Successfully calculated RS rating for ${normalizedTicker}: ${rating}/99`);

  return rsRating;
}

/**
 * Calculates the weighted price performance score for a stock
 *
 * IBD methodology applies different weights to different time periods:
 * - Most recent 3 months: 40% weight (emphasizes recent momentum)
 * - Months 4-6: 20% weight
 * - Months 7-9: 20% weight
 * - Months 10-12: 20% weight
 *
 * Requires at least 60 days of historical data to calculate.
 *
 * @param ticker Stock ticker symbol
 * @returns Weighted performance score (percentage)
 *
 * @example
 * const score = await calculatePricePerformance('AAPL');
 * console.log(`Weighted RS Score: ${score.toFixed(2)}%`); // e.g., 22.35%
 */
async function calculatePricePerformance(ticker: string): Promise<number> {
  try {
    // Get 12 months of historical data (~252 trading days)
    const historicalPrices = await getHistoricalPrices(ticker, 252);

    if (historicalPrices.prices.length < 60) {
      console.log(`[RS] Insufficient data for ${ticker}`);
      return 0;
    }

    const prices = historicalPrices.prices;
    const currentPrice = prices[0].close; // Most recent price

    // Calculate price at different time periods (approximately)
    const price3MonthsAgo = getPriceAtDaysAgo(prices, 63);   // ~3 months
    const price6MonthsAgo = getPriceAtDaysAgo(prices, 126);  // ~6 months
    const price9MonthsAgo = getPriceAtDaysAgo(prices, 189);  // ~9 months
    const price12MonthsAgo = getPriceAtDaysAgo(prices, 252); // ~12 months

    // Calculate percentage changes for each period
    const change3Month = price3MonthsAgo ? ((currentPrice - price3MonthsAgo) / price3MonthsAgo) * 100 : 0;
    const change6to3Month = price6MonthsAgo && price3MonthsAgo
      ? ((price3MonthsAgo - price6MonthsAgo) / price6MonthsAgo) * 100 : 0;
    const change9to6Month = price9MonthsAgo && price6MonthsAgo
      ? ((price6MonthsAgo - price9MonthsAgo) / price9MonthsAgo) * 100 : 0;
    const change12to9Month = price12MonthsAgo && price9MonthsAgo
      ? ((price9MonthsAgo - price12MonthsAgo) / price12MonthsAgo) * 100 : 0;

    // Apply IBD weighting: 40% recent 3 months, 20% each for older quarters
    const weightedScore = (
      change3Month * 0.4 +
      change6to3Month * 0.2 +
      change9to6Month * 0.2 +
      change12to9Month * 0.2
    );

    return weightedScore;
  } catch (error) {
    console.error(`[RS] Error calculating performance for ${ticker}:`, error);
    return 0;
  }
}

/**
 * Calculates detailed performance breakdown for display
 */
async function calculatePerformanceBreakdown(ticker: string): Promise<{
  month3: number;
  month6: number;
  month9: number;
  month12: number;
  weightedScore: number;
}> {
  try {
    const historicalPrices = await getHistoricalPrices(ticker, 252);

    if (historicalPrices.prices.length < 60) {
      return { month3: 0, month6: 0, month9: 0, month12: 0, weightedScore: 0 };
    }

    const prices = historicalPrices.prices;
    const currentPrice = prices[0].close;

    const price3MonthsAgo = getPriceAtDaysAgo(prices, 63);
    const price6MonthsAgo = getPriceAtDaysAgo(prices, 126);
    const price9MonthsAgo = getPriceAtDaysAgo(prices, 189);
    const price12MonthsAgo = getPriceAtDaysAgo(prices, 252);

    const month3 = price3MonthsAgo ? ((currentPrice - price3MonthsAgo) / price3MonthsAgo) * 100 : 0;
    const month6 = price6MonthsAgo ? ((currentPrice - price6MonthsAgo) / price6MonthsAgo) * 100 : 0;
    const month9 = price9MonthsAgo ? ((currentPrice - price9MonthsAgo) / price9MonthsAgo) * 100 : 0;
    const month12 = price12MonthsAgo ? ((currentPrice - price12MonthsAgo) / price12MonthsAgo) * 100 : 0;

    // Calculate weighted score for IBD methodology
    const change6to3Month = price6MonthsAgo && price3MonthsAgo
      ? ((price3MonthsAgo - price6MonthsAgo) / price6MonthsAgo) * 100 : 0;
    const change9to6Month = price9MonthsAgo && price6MonthsAgo
      ? ((price6MonthsAgo - price9MonthsAgo) / price9MonthsAgo) * 100 : 0;
    const change12to9Month = price12MonthsAgo && price9MonthsAgo
      ? ((price9MonthsAgo - price12MonthsAgo) / price12MonthsAgo) * 100 : 0;

    const weightedScore = (
      month3 * 0.4 +
      change6to3Month * 0.2 +
      change9to6Month * 0.2 +
      change12to9Month * 0.2
    );

    return { month3, month6, month9, month12, weightedScore };
  } catch (error) {
    console.error(`[RS] Error calculating breakdown for ${ticker}:`, error);
    return { month3: 0, month6: 0, month9: 0, month12: 0, weightedScore: 0 };
  }
}

/**
 * Gets the price at approximately N trading days ago
 */
function getPriceAtDaysAgo(prices: Array<{ close: number }>, daysAgo: number): number | null {
  const index = Math.min(daysAgo - 1, prices.length - 1);
  return index >= 0 && index < prices.length ? prices[index].close : null;
}

/**
 * Calculates percentile rank (1-99) of target score compared to all scores
 */
function calculatePercentileRank(targetScore: number, allScores: number[]): number {
  if (allScores.length === 0) {
    return 50; // Default to middle if no comparison data
  }

  // Count how many scores are below the target
  const belowCount = allScores.filter(score => score < targetScore).length;

  // Calculate percentile (1-99 scale)
  const percentile = Math.round((belowCount / allScores.length) * 99);

  // Ensure it's between 1 and 99
  return Math.max(1, Math.min(99, percentile || 1));
}

/**
 * Gets all unique tickers from the portfolio
 */
async function getAllPortfolioTickers(): Promise<string[]> {
  try {
    const portfolioStocks = await Portfolio.find({}).select('ticker');
    const tickers = portfolioStocks.map(stock => stock.ticker.toUpperCase());
    return [...new Set(tickers)]; // Remove duplicates
  } catch (error) {
    console.error('[RS] Error fetching portfolio tickers:', error);
    return [];
  }
}

/**
 * Retrieves cached RS rating from database
 */
export async function getRSRating(ticker: string): Promise<RSRating | null> {
  const normalizedTicker = ticker.toUpperCase();

  const result = await StockMetrics.findOne({
    ticker: normalizedTicker,
    dataType: 'rs'
  }).sort({ fetchedAt: -1 });

  if (!result) {
    return null;
  }

  return result.data as RSRating;
}

/**
 * Gets RS rating from cache or calculates if not cached/stale
 *
 * Attempts to retrieve a cached RS rating from the database. If the cached
 * rating is older than maxAgeHours, recalculates a fresh rating.
 *
 * @param ticker Stock ticker symbol
 * @param maxAgeHours Maximum age of cached rating in hours (default: 24)
 * @returns RS rating object (cached or freshly calculated)
 *
 * @example
 * // Get RS rating, using cache if less than 24 hours old
 * const rsRating = await getOrCalculateRSRating('AAPL');
 *
 * @example
 * // Force calculation if cache is older than 1 hour
 * const freshRating = await getOrCalculateRSRating('AAPL', 1);
 */
export async function getOrCalculateRSRating(
  ticker: string,
  maxAgeHours: number = 24
): Promise<RSRating> {
  const normalizedTicker = ticker.toUpperCase();

  // Try to get cached rating
  const cached = await getRSRating(normalizedTicker);

  if (cached) {
    const ageHours = (Date.now() - new Date(cached.calculatedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < maxAgeHours) {
      console.log(`[RS] Returning cached RS rating for ${normalizedTicker} (age: ${ageHours.toFixed(1)}h)`);
      return cached;
    }
  }

  // Calculate fresh rating
  return await calculateRSRating(normalizedTicker);
}

/**
 * Stores RS rating in the database
 */
async function storeRSRating(ticker: string, rating: RSRating): Promise<void> {
  await StockMetrics.updateOne(
    { ticker, dataType: 'rs' },
    {
      ticker,
      dataType: 'rs',
      data: rating,
      fetchedAt: new Date()
    },
    { upsert: true }
  );

  console.log(`[RS] Stored RS rating for ${ticker} in database`);
}
