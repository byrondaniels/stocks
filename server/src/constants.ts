/**
 * Centralized constants for the server application
 */

// ============================================================================
// Time Constants
// ============================================================================

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// ============================================================================
// HTTP Status Codes
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  INVALID_TICKER: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
  INVALID_TICKER_FORMAT: "Invalid ticker format",
  TICKER_REQUIRED: "Ticker is required",
  SHARES_POSITIVE: "Shares must be a positive number",
  PRICE_POSITIVE: "Purchase price must be a positive number",
  STOCK_NOT_FOUND: "Stock not found in portfolio",
  PORTFOLIO_NOT_FOUND: "Portfolio not found",
  CANSLIM_SCORE_ERROR: "Unable to calculate CANSLIM score. Please try again later.",
  STOCK_DATA_ERROR: "Unable to fetch stock data. Please try again later.",
  OWNERSHIP_DATA_ERROR: "Unable to fetch ownership data. Please try again later.",
  HISTORICAL_DATA_ERROR: "Unable to fetch historical data. Please try again later.",
  INSIDER_DATA_ERROR: "Unable to fetch insider data. Please try again later.",
  DATABASE_ERROR: "Database operation failed. Please try again later.",
} as const;

// ============================================================================
// Historical Data Constants
// ============================================================================

export const HISTORICAL_DAYS_DEFAULT = 50;
export const HISTORICAL_DAYS_MIN = 1;
export const HISTORICAL_DAYS_MAX = 365;

// ============================================================================
// CANSLIM Constants
// ============================================================================

export const CANSLIM_CACHE_HOURS = 24;

// ============================================================================
// Formatting Constants
// ============================================================================

export const DECIMAL_PRECISION = {
  CURRENCY: 2,
  PERCENTAGE: 2,
  SHARES: 0,
} as const;

// ============================================================================
// Ticker Constants
// ============================================================================

export const TICKER_MAX_LENGTH = 9;

// ============================================================================
// SEC API Constants
// ============================================================================

export const SEC_CONFIG = {
  SUBMISSIONS_URL: "https://data.sec.gov/submissions/",
  TICKER_URL: "https://www.sec.gov/files/company_tickers.json",
  ARCHIVES_URL: "https://www.sec.gov/Archives/edgar/data",
  MIN_REQUEST_INTERVAL_MS: 250,
  SUBMISSION_CACHE_MS: 15 * MS_PER_MINUTE,
  TRANSACTION_CACHE_MS: 5 * MS_PER_MINUTE,
  MAX_FILINGS_TO_PROCESS: 3,
} as const;
