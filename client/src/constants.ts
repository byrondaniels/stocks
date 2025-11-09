/**
 * Centralized constants for the client application
 */

// ============================================================================
// Historical Data Constants
// ============================================================================

export const HISTORICAL_DAYS_DEFAULT = 50;

// ============================================================================
// Ticker Constants
// ============================================================================

export const TICKER_MAX_LENGTH = 9;

// ============================================================================
// Rate Limiting Constants
// ============================================================================

export const RATE_LIMIT_MS = 60000; // 1 minute

// ============================================================================
// Chart Color Constants
// ============================================================================

export const CHART_COLORS = {
  INSTITUTIONAL: "#0088FE",
  INSIDER: "#00C49F",
  PUBLIC: "#FFBB28",
  PRIMARY: "#8884d8",
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  INVALID_TICKER: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
  TICKER_REQUIRED: "Please enter a ticker symbol",
  SHARES_POSITIVE: "Shares must be a positive number",
  PRICE_POSITIVE: "Purchase price must be a positive number",
} as const;
