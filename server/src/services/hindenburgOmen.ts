/**
 * Hindenburg Omen Service
 * Detects the Hindenburg Omen market crash indicator
 *
 * Criteria:
 * 1. New 52-week highs and lows both exceed 2.2% of issues traded
 * 2. New highs can't be more than twice the new lows
 * 3. Market index must be in uptrend (50-day ROC > 0)
 * 4. McClellan Oscillator must be negative
 *
 * Once triggered, signal is active for 30 trading days
 */

import { StockPrice } from '../db/index.js';
import { getCurrentPrice } from './stockData.js';
import { calculateMovingAverage } from './priceHistory.js';

interface HindenburgOmenResult {
  date: string;
  isActive: boolean;
  isMet: boolean;
  criteria: {
    highLowThreshold: {
      met: boolean;
      newHighs: number;
      newLows: number;
      threshold: number;
      newHighsPercent: number;
      newLowsPercent: number;
    };
    highLowRatio: {
      met: boolean;
      newHighs: number;
      newLows: number;
      ratio: number;
    };
    uptrend: {
      met: boolean;
      currentPrice: number;
      fiftyDayROC: number;
    };
    mcclellanOscillator: {
      met: boolean;
      value: number;
    };
  };
  activationDate?: string;
  daysRemaining?: number;
}

/**
 * Calculate the McClellan Oscillator
 * MCO = 19-day EMA of (Advances - Declines) - 39-day EMA of (Advances - Declines)
 */
async function calculateMcClellanOscillator(
  symbol: string = 'SPY',
  historicalDays: number = 50
): Promise<number> {
  try {
    // For simplicity, we'll estimate using advance/decline line
    // In a production system, you'd want to store daily A/D data

    // Get historical prices to estimate market direction
    const prices = await StockPrice.find({ ticker: symbol })
      .sort({ date: -1 })
      .limit(historicalDays)
      .lean();

    if (prices.length < 39) {
      console.warn('[HindenburgOmen] Insufficient data for MCO calculation');
      return 0;
    }

    // Sort chronologically
    prices.reverse();

    // Calculate daily price changes as proxy for A/D line
    const adLine: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i].close - prices[i - 1].close;
      adLine.push(change);
    }

    // Calculate 19-day EMA
    const ema19 = calculateEMA(adLine.slice(-19), 19);

    // Calculate 39-day EMA
    const ema39 = calculateEMA(adLine, 39);

    // MCO = EMA19 - EMA39
    const mco = ema19 - ema39;

    return parseFloat(mco.toFixed(2));
  } catch (error) {
    console.error('[HindenburgOmen] Error calculating MCO:', error);
    return 0;
  }
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(data: number[], period: number): number {
  if (data.length < period) {
    // If not enough data, just return simple average
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  const multiplier = 2 / (period + 1);

  // Start with SMA for first value
  let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate 50-day Rate of Change
 * ROC = ((Current Price - Price 50 days ago) / Price 50 days ago) * 100
 */
async function calculate50DayROC(symbol: string): Promise<number> {
  try {
    const prices = await StockPrice.find({ ticker: symbol })
      .sort({ date: -1 })
      .limit(51)
      .lean();

    if (prices.length < 51) {
      console.warn('[HindenburgOmen] Insufficient data for 50-day ROC');
      return 0;
    }

    const currentPrice = prices[0].close;
    const price50DaysAgo = prices[50].close;

    const roc = ((currentPrice - price50DaysAgo) / price50DaysAgo) * 100;

    return parseFloat(roc.toFixed(2));
  } catch (error) {
    console.error('[HindenburgOmen] Error calculating ROC:', error);
    return 0;
  }
}

/**
 * Check if Hindenburg Omen criteria are met for a given date
 */
export async function checkHindenburgOmen(
  date?: Date,
  newHighs?: number,
  newLows?: number,
  issuesTraded: number = 3000
): Promise<HindenburgOmenResult> {
  const checkDate = date || new Date();
  const symbol = 'SPY'; // Use SPY as market proxy

  try {
    // Default values if not provided (typical NYSE values)
    const highCount = newHighs ?? 150;
    const lowCount = newLows ?? 80;
    const threshold = 2.2; // 2.2% threshold

    // Criterion 1: Both highs and lows exceed 2.2% threshold
    const highsPercent = (highCount / issuesTraded) * 100;
    const lowsPercent = (lowCount / issuesTraded) * 100;
    const criterion1Met = highsPercent >= threshold && lowsPercent >= threshold;

    // Criterion 2: Highs can't be more than 2x the lows
    const highLowRatio = lowCount > 0 ? highCount / lowCount : 999;
    const criterion2Met = highLowRatio <= 2.0;

    // Criterion 3: Market in uptrend (50-day ROC > 0)
    const roc50 = await calculate50DayROC(symbol);
    const criterion3Met = roc50 > 0;

    // Get current price for context
    const latestPrice = await StockPrice.findOne({ ticker: symbol })
      .sort({ date: -1 })
      .lean();
    const currentPrice = latestPrice?.close || 0;

    // Criterion 4: McClellan Oscillator is negative
    const mco = await calculateMcClellanOscillator(symbol);
    const criterion4Met = mco < 0;

    // All criteria must be met
    const allCriteriaMet = criterion1Met && criterion2Met && criterion3Met && criterion4Met;

    const result: HindenburgOmenResult = {
      date: checkDate.toISOString(),
      isActive: allCriteriaMet,
      isMet: allCriteriaMet,
      criteria: {
        highLowThreshold: {
          met: criterion1Met,
          newHighs: highCount,
          newLows: lowCount,
          threshold: threshold,
          newHighsPercent: parseFloat(highsPercent.toFixed(2)),
          newLowsPercent: parseFloat(lowsPercent.toFixed(2)),
        },
        highLowRatio: {
          met: criterion2Met,
          newHighs: highCount,
          newLows: lowCount,
          ratio: parseFloat(highLowRatio.toFixed(2)),
        },
        uptrend: {
          met: criterion3Met,
          currentPrice: currentPrice,
          fiftyDayROC: roc50,
        },
        mcclellanOscillator: {
          met: criterion4Met,
          value: mco,
        },
      },
    };

    // If signal is active, set activation date
    if (allCriteriaMet) {
      result.activationDate = checkDate.toISOString();
      result.daysRemaining = 30; // Active for 30 trading days
    }

    return result;
  } catch (error) {
    console.error('[HindenburgOmen] Error checking Hindenburg Omen:', error);

    // Return default result on error
    return {
      date: checkDate.toISOString(),
      isActive: false,
      isMet: false,
      criteria: {
        highLowThreshold: {
          met: false,
          newHighs: 0,
          newLows: 0,
          threshold: 2.2,
          newHighsPercent: 0,
          newLowsPercent: 0,
        },
        highLowRatio: {
          met: false,
          newHighs: 0,
          newLows: 0,
          ratio: 0,
        },
        uptrend: {
          met: false,
          currentPrice: 0,
          fiftyDayROC: 0,
        },
        mcclellanOscillator: {
          met: false,
          value: 0,
        },
      },
    };
  }
}

/**
 * Check Hindenburg Omen with real market breadth data
 */
export async function checkHindenburgOmenWithMarketData(
  newHighs: number,
  newLows: number,
  issuesTraded: number = 3000,
  date?: Date
): Promise<HindenburgOmenResult> {
  return checkHindenburgOmen(date, newHighs, newLows, issuesTraded);
}
