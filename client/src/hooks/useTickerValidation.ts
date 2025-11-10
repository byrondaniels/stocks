/**
 * Custom hook for ticker validation
 * Provides reusable ticker validation logic for forms
 */

import { TICKER_REGEX, normalizeTicker } from '../../../shared/validation';

export interface TickerValidationResult {
  error: string | undefined;
  normalizedTicker: string;
}

/**
 * Custom hook for validating ticker symbols in forms
 * @returns Object with validateTicker function
 *
 * @example
 * const { validateTicker } = useTickerValidation();
 * const error = validateTicker(formData.ticker);
 * if (error) {
 *   newErrors.ticker = error;
 * }
 */
export function useTickerValidation() {
  /**
   * Validates a ticker symbol and returns an error message if invalid
   * @param ticker - The ticker symbol to validate
   * @returns Error message if invalid, undefined if valid
   */
  const validateTicker = (ticker: string): string | undefined => {
    const trimmed = normalizeTicker(ticker);

    if (!trimmed) {
      return 'Ticker is required';
    }

    if (!TICKER_REGEX.test(trimmed)) {
      return 'Invalid ticker format (e.g., AAPL or BRK.B)';
    }

    return undefined;
  };

  /**
   * Validates a ticker and returns both the error and normalized ticker
   * @param ticker - The ticker symbol to validate
   * @returns Object with error message and normalized ticker
   */
  const validateAndNormalize = (ticker: string): TickerValidationResult => {
    const normalizedTicker = normalizeTicker(ticker);
    const error = validateTicker(ticker);

    return {
      error,
      normalizedTicker,
    };
  };

  return {
    validateTicker,
    validateAndNormalize,
  };
}
