/**
 * Stock Data Service Configuration
 */

// API Keys
export const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';
export const FMP_KEY = process.env.FMP_API_KEY || '';

// API Base URLs
export const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';
export const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

// Cache TTLs (in milliseconds)
export const PRICE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const FINANCIALS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const HISTORICAL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const PROFILE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days (sector/industry rarely changes)

// Rate limiting configuration
export const ALPHA_VANTAGE_DAILY_LIMIT = 25;
export const FMP_DAILY_LIMIT = 250;
export const MIN_REQUEST_INTERVAL = 12000; // 12 seconds between requests (5 per minute)
