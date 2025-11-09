/**
 * Shared calculation utilities for portfolio and stock operations
 */

import { DECIMAL_PRECISION } from "../constants.js";

export interface ProfitLossResult {
  profitLoss: number;
  profitLossPercent: number;
}

/**
 * Calculates profit/loss and percentage for a stock position
 * @param currentPrice - Current stock price
 * @param purchasePrice - Original purchase price
 * @param shares - Number of shares owned
 * @returns Object containing profit/loss amount and percentage
 */
export function calculateProfitLoss(
  currentPrice: number,
  purchasePrice: number,
  shares: number
): ProfitLossResult {
  const profitLoss = (currentPrice - purchasePrice) * shares;
  const profitLossPercent =
    ((currentPrice - purchasePrice) / purchasePrice) * 100;

  return {
    profitLoss: parseFloat(profitLoss.toFixed(DECIMAL_PRECISION.CURRENCY)),
    profitLossPercent: parseFloat(
      profitLossPercent.toFixed(DECIMAL_PRECISION.PERCENTAGE)
    ),
  };
}

/**
 * Rounds a number to a specific decimal precision
 * @param value - The value to round
 * @param precision - Number of decimal places
 * @returns The rounded value
 */
export function roundToPrecision(value: number, precision: number): number {
  return parseFloat(value.toFixed(precision));
}
