/**
 * Shared validation utilities
 * Used by both client and server for consistent validation
 */

// Ticker validation regex: 1-5 uppercase letters with optional .suffix
export const TICKER_REGEX = /^[A-Z]{1,5}(\.[A-Z0-9]{1,4})?$/;

/**
 * Normalizes a ticker symbol by trimming whitespace and converting to uppercase
 * @param ticker - The ticker symbol to normalize
 * @returns The normalized ticker symbol
 */
export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

/**
 * Validates if a ticker symbol is in the correct format
 * @param ticker - The ticker symbol to validate
 * @returns True if the ticker is valid, false otherwise
 */
export function isValidTicker(ticker: string): boolean {
  return TICKER_REGEX.test(ticker);
}

/**
 * Validates if a number is positive
 * @param value - The value to validate
 * @returns True if the value is a positive number, false otherwise
 */
export function isPositiveNumber(value: unknown): boolean {
  return typeof value === "number" && value > 0;
}

/**
 * Validates and normalizes a ticker symbol
 * @param ticker - The ticker symbol to validate and normalize
 * @returns Object with normalized ticker and validation status
 */
export function validateAndNormalizeTicker(ticker: string): {
  ticker: string;
  isValid: boolean;
} {
  const normalized = normalizeTicker(ticker);
  return {
    ticker: normalized,
    isValid: isValidTicker(normalized),
  };
}
