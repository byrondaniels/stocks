/**
 * Sector Group Rankings Service
 * Calculates and ranks sector/industry groups based on RS scores vs SPY
 */

import { getHistoricalPrices } from './stockData';
import { StockMetrics } from '../db/models';
import { SECTOR_TO_ETF, INDUSTRY_TO_ETF } from './stock-data/sector-etf-map.js';

// Lookback windows (trading days)
const LOOKBACK_3M = 63;
const LOOKBACK_6M = 126;
const LOOKBACK_12M = 252;

// Weights (recent matters more)
const WEIGHT_3M = 0.4;
const WEIGHT_6M = 0.3;
const WEIGHT_12M = 0.3;

// Throttling configuration
const FETCH_DELAY_MS = 1000; // 1 second delay between fetches

export interface SectorGroupRanking {
  etf: string;
  groupName: string; // Primary sector/industry name
  groupType: 'sector' | 'industry';
  rsScore: number; // 1-99 rating vs SPY
  rawScore: number; // Raw weighted excess return
  rank: number; // 1 = strongest
  calculatedAt: Date;
}

export interface SectorGroupRankingsResult {
  rankings: SectorGroupRanking[];
  totalGroups: number;
  calculatedAt: Date;
}

/**
 * Core helper: Calculate weighted excess return vs benchmark
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
 */
function normalizeToRS(rsRaw: number): number {
  // Clamp to [-0.5, 0.5]
  const clamped = Math.max(-0.5, Math.min(0.5, rsRaw));

  // Map to 1-99
  const score = Math.round(1 + (clamped + 0.5) * 98);

  return Math.max(1, Math.min(99, score));
}

/**
 * Get all unique ETFs from sector and industry mappings
 */
function getAllUniqueETFs(): Map<string, { name: string; type: 'sector' | 'industry' }> {
  const etfMap = new Map<string, { name: string; type: 'sector' | 'industry' }>();

  // Add sector ETFs
  for (const [sectorName, etf] of Object.entries(SECTOR_TO_ETF)) {
    if (!etfMap.has(etf)) {
      etfMap.set(etf, { name: sectorName, type: 'sector' });
    }
  }

  // Add industry ETFs (prefer industry name if ETF already exists)
  for (const [industryName, etf] of Object.entries(INDUSTRY_TO_ETF)) {
    if (!etfMap.has(etf)) {
      etfMap.set(etf, { name: industryName, type: 'industry' });
    }
  }

  return etfMap;
}

/**
 * Sleep helper for throttling
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate RS score for a single ETF vs SPY
 */
async function calculateETFRating(
  etf: string,
  groupName: string,
  groupType: 'sector' | 'industry',
  spyData: { prices: Array<{ close: number }> }
): Promise<SectorGroupRanking | null> {
  try {
    console.log(`[Sector Rankings] Fetching data for ${etf} (${groupName})...`);

    const etfData = await getHistoricalPrices(etf, LOOKBACK_12M);

    if (!etfData || etfData.prices.length < LOOKBACK_12M) {
      console.warn(`[Sector Rankings] Insufficient data for ${etf}`);
      return null;
    }

    const rawScore = weightedExcess(etfData.prices, spyData.prices);

    if (rawScore === null) {
      console.warn(`[Sector Rankings] Could not calculate score for ${etf}`);
      return null;
    }

    const rsScore = normalizeToRS(rawScore);

    return {
      etf,
      groupName,
      groupType,
      rsScore,
      rawScore,
      rank: 0, // Will be set after sorting
      calculatedAt: new Date()
    };
  } catch (error) {
    console.error(`[Sector Rankings] Error calculating rating for ${etf}:`, error);
    return null;
  }
}

/**
 * Calculate and rank all sector groups
 * Uses throttling to avoid API rate limits
 */
export async function calculateSectorGroupRankings(): Promise<SectorGroupRankingsResult> {
  console.log('[Sector Rankings] Starting sector group rankings calculation...');

  try {
    // Fetch SPY data first
    console.log('[Sector Rankings] Fetching SPY benchmark data...');
    const spyData = await getHistoricalPrices('SPY', LOOKBACK_12M);

    if (!spyData || spyData.prices.length < LOOKBACK_12M) {
      throw new Error('Insufficient SPY data for benchmark');
    }

    // Get all unique ETFs
    const etfMap = getAllUniqueETFs();
    console.log(`[Sector Rankings] Found ${etfMap.size} unique ETFs to analyze`);

    // Calculate ratings for each ETF with throttling
    const rankings: SectorGroupRanking[] = [];
    let processed = 0;

    for (const [etf, { name, type }] of etfMap.entries()) {
      const rating = await calculateETFRating(etf, name, type, spyData);

      if (rating) {
        rankings.push(rating);
      }

      processed++;

      // Throttle: wait between requests (except for the last one)
      if (processed < etfMap.size) {
        console.log(`[Sector Rankings] Throttling... (${processed}/${etfMap.size})`);
        await sleep(FETCH_DELAY_MS);
      }
    }

    // Sort by raw score (descending) and assign ranks
    rankings.sort((a, b) => b.rawScore - a.rawScore);
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    console.log(`[Sector Rankings] Successfully ranked ${rankings.length} sector groups`);

    const result: SectorGroupRankingsResult = {
      rankings,
      totalGroups: rankings.length,
      calculatedAt: new Date()
    };

    // Store in database
    await storeSectorGroupRankings(result);

    return result;
  } catch (error) {
    console.error('[Sector Rankings] Error calculating sector group rankings:', error);
    throw error;
  }
}

/**
 * Get cached sector group rankings from database
 */
export async function getCachedSectorGroupRankings(): Promise<SectorGroupRankingsResult | null> {
  const result = await StockMetrics.findOne({
    ticker: 'SECTOR_RANKINGS',
    dataType: 'sector_rankings'
  }).sort({ fetchedAt: -1 });

  if (!result) {
    return null;
  }

  return result.data as SectorGroupRankingsResult;
}

/**
 * Get sector group rankings (cached or calculate if needed)
 *
 * @param maxAgeHours Maximum age of cached data in hours (default: 24)
 */
export async function getOrCalculateSectorGroupRankings(
  maxAgeHours: number = 24
): Promise<SectorGroupRankingsResult> {
  // Try to get cached rankings
  const cached = await getCachedSectorGroupRankings();

  if (cached) {
    const ageHours = (Date.now() - new Date(cached.calculatedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < maxAgeHours) {
      console.log(`[Sector Rankings] Returning cached rankings (age: ${ageHours.toFixed(1)}h)`);
      return cached;
    }
  }

  console.log('[Sector Rankings] Cache miss or stale, calculating fresh rankings...');
  return await calculateSectorGroupRankings();
}

/**
 * Store sector group rankings in database
 */
async function storeSectorGroupRankings(result: SectorGroupRankingsResult): Promise<void> {
  await StockMetrics.updateOne(
    { ticker: 'SECTOR_RANKINGS', dataType: 'sector_rankings' },
    {
      ticker: 'SECTOR_RANKINGS',
      dataType: 'sector_rankings',
      data: result,
      fetchedAt: new Date()
    },
    { upsert: true }
  );

  console.log('[Sector Rankings] Stored rankings in database');
}

/**
 * Get the ranking for a specific ETF
 */
export async function getSectorGroupRanking(etf: string): Promise<SectorGroupRanking | null> {
  const rankings = await getOrCalculateSectorGroupRankings();
  return rankings.rankings.find(r => r.etf === etf) || null;
}
