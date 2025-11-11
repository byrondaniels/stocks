import {
  getHistoricalPrices,
} from './stockData';
import { StockMetrics } from '../db/models';
import { getETFForStock, getETFMatchDescription } from './stock-data/sector-etf-map.js';
import { getSectorIndustryWithGemini } from './gemini.js';

/**
 * Relative Strength Rating - New Methodology
 * Calculates sector strength and stock strength relative to benchmarks
 */
export interface RSRating {
  ticker: string;
  sectorRS: number; // 1-99 (Industry ETF vs SPY)
  stockRS: number;  // 1-99 (Stock vs Industry ETF)
  sectorETF: string | null; // Which ETF was used, or null if fallback to SPY
  sector: string | null; // The stock's sector
  industry: string | null; // The stock's industry
  calculatedAt: Date;
}

// Lookback windows (trading days)
const LOOKBACK_3M = 63;
const LOOKBACK_6M = 126;
const LOOKBACK_12M = 252;

// Weights (recent matters more)
const WEIGHT_3M = 0.4;
const WEIGHT_6M = 0.3;
const WEIGHT_12M = 0.3;

/**
 * Core helper: Calculate weighted excess return vs benchmark
 *
 * @param assetPrices Historical prices for the asset (most recent first)
 * @param benchmarkPrices Historical prices for the benchmark (most recent first)
 * @returns RS_raw: weighted excess return across 3-12 months
 */
function weightedExcess(
  assetPrices: Array<{ close: number }>,
  benchmarkPrices: Array<{ close: number }>
): number | null {
  // Need at least 252 days of data
  if (assetPrices.length < LOOKBACK_12M || benchmarkPrices.length < LOOKBACK_12M) {
    return null;
  }

  const assetCurrent = assetPrices[0].close;
  const benchmarkCurrent = benchmarkPrices[0].close;

  // 3-month returns
  const asset3m = assetPrices[LOOKBACK_3M - 1]?.close;
  const benchmark3m = benchmarkPrices[LOOKBACK_3M - 1]?.close;
  const R3 = asset3m ? (assetCurrent / asset3m - 1) : 0;
  const B3 = benchmark3m ? (benchmarkCurrent / benchmark3m - 1) : 0;
  const E3 = R3 - B3;

  // 6-month returns
  const asset6m = assetPrices[LOOKBACK_6M - 1]?.close;
  const benchmark6m = benchmarkPrices[LOOKBACK_6M - 1]?.close;
  const R6 = asset6m ? (assetCurrent / asset6m - 1) : 0;
  const B6 = benchmark6m ? (benchmarkCurrent / benchmark6m - 1) : 0;
  const E6 = R6 - B6;

  // 12-month returns
  const asset12m = assetPrices[LOOKBACK_12M - 1]?.close;
  const benchmark12m = benchmarkPrices[LOOKBACK_12M - 1]?.close;
  const R12 = asset12m ? (assetCurrent / asset12m - 1) : 0;
  const B12 = benchmark12m ? (benchmarkCurrent / benchmark12m - 1) : 0;
  const E12 = R12 - B12;

  // Weighted excess return
  const rsRaw = WEIGHT_3M * E3 + WEIGHT_6M * E6 + WEIGHT_12M * E12;

  return rsRaw;
}

/**
 * Normalize RS_raw to 1-99 scale
 * Assumes typical excess range of [-0.5, +0.5] (-50% to +50%)
 *
 * @param rsRaw Raw excess return (e.g., -0.2 for -20% underperformance)
 * @returns Score from 1-99
 */
function normalizeToRS(rsRaw: number): number {
  // Clamp to [-0.5, 0.5]
  const clamped = Math.max(-0.5, Math.min(0.5, rsRaw));

  // Map to 1-99
  const score = Math.round(1 + (clamped + 0.5) * 98);

  return Math.max(1, Math.min(99, score));
}

/**
 * Calculates new RS rating for a stock
 *
 * Sector Strength: Industry ETF vs SPY
 * Stock Strength: Stock vs Industry ETF (or SPY if no ETF mapping)
 *
 * @param ticker Stock ticker symbol
 * @returns RS rating object with sectorRS and stockRS
 */
export async function calculateRSRating(ticker: string): Promise<RSRating> {
  const normalizedTicker = ticker.toUpperCase();

  console.log(`[RS] Calculating RS rating for ${normalizedTicker}`);

  try {
    // Use Gemini to determine sector and industry
    let sector: string | null = null;
    let industry: string | null = null;
    let industryETF: string | null = null;

    try {
      const classification = await getSectorIndustryWithGemini(normalizedTicker);
      sector = classification.sector;
      industry = classification.industry;
      industryETF = getETFForStock(sector, industry);

      if (industryETF) {
        const matchDesc = getETFMatchDescription(industryETF, sector, industry);
        console.log(`[RS] ${normalizedTicker} - Matched to ${matchDesc} (confidence: ${classification.confidence})`);
      } else {
        console.log(`[RS] ${normalizedTicker} - No ETF match for sector: ${sector}, industry: ${industry}`);
      }
    } catch (geminiError) {
      console.warn(`[RS] ${normalizedTicker} - Could not determine sector/industry with Gemini:`, geminiError);
      // Continue with null ETF
    }

    // Fetch historical data
    const [stockData, spyData, etfData] = await Promise.all([
      getHistoricalPrices(normalizedTicker, LOOKBACK_12M),
      getHistoricalPrices('SPY', LOOKBACK_12M),
      industryETF ? getHistoricalPrices(industryETF, LOOKBACK_12M).catch(() => null) : null
    ]);

    let sectorRS: number;
    let stockRS: number;

    if (industryETF && etfData && etfData.prices.length >= LOOKBACK_12M) {
      // Case 1: Have ETF mapping and data, calculate both sector and stock RS

      // Sector Strength: ETF vs SPY
      const sectorRaw = weightedExcess(etfData.prices, spyData.prices);
      sectorRS = sectorRaw !== null ? normalizeToRS(sectorRaw) : 50;

      // Stock Strength: Stock vs ETF
      const stockRaw = weightedExcess(stockData.prices, etfData.prices);
      stockRS = stockRaw !== null ? normalizeToRS(stockRaw) : 50;

      console.log(`[RS] ${normalizedTicker} - ETF: ${industryETF}, SectorRS: ${sectorRS}, StockRS: ${stockRS}`);
    } else {
      // Case 2: No ETF mapping or insufficient ETF data - compare stock to SPY
      console.log(`[RS] ${normalizedTicker} - Using SPY fallback`);

      // Both metrics compare to SPY
      const stockRaw = weightedExcess(stockData.prices, spyData.prices);
      const rsScore = stockRaw !== null ? normalizeToRS(stockRaw) : 50;

      sectorRS = 50; // Neutral since we don't have sector data
      stockRS = rsScore; // Stock vs SPY
      industryETF = null; // Clear ETF since we're not using it
    }

    const rsRating: RSRating = {
      ticker: normalizedTicker,
      sectorRS,
      stockRS,
      sectorETF: industryETF,
      sector,
      industry,
      calculatedAt: new Date()
    };

    // Store in database
    await storeRSRating(normalizedTicker, rsRating);

    console.log(`[RS] Successfully calculated RS rating for ${normalizedTicker}`);

    return rsRating;
  } catch (error) {
    console.error(`[RS] Error calculating RS for ${normalizedTicker}:`, error);

    // Return neutral ratings on error
    const fallbackRating: RSRating = {
      ticker: normalizedTicker,
      sectorRS: 50,
      stockRS: 50,
      sectorETF: null,
      sector: null,
      industry: null,
      calculatedAt: new Date()
    };

    return fallbackRating;
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
 * @param ticker Stock ticker symbol
 * @param maxAgeHours Maximum age of cached rating in hours (default: 24)
 * @returns RS rating object (cached or freshly calculated)
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
