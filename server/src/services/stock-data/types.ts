/**
 * Stock Data Type Definitions
 */

export type StockPrice = {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: 'alphavantage' | 'fmp' | 'yahoo';
};


export type FinancialMetrics = {
  ticker: string;
  // CANSLIM Criteria
  currentEPS: number;
  epsGrowthQuarterly: number; // percentage
  epsGrowthAnnual: number; // percentage
  annualEarningsGrowth: number; // 5-year average
  salesGrowthQuarterly: number; // percentage
  roe: number; // Return on Equity
  debtToEquity: number;
  currentRatio: number;
  priceToEarnings: number;
  priceToBook: number;
  profitMargin: number;
  source: 'fmp';
  timestamp: string;
};

export type HistoricalPrice = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type HistoricalPrices = {
  ticker: string;
  prices: HistoricalPrice[];
  source: 'alphavantage' | 'fmp';
  timestamp: string;
};

export type CompanyProfile = {
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  description?: string;
  ceo?: string;
  employees?: number;
  country?: string;
  website?: string;
  source: 'fmp';
  timestamp: string;
};
export type VolumeAnalysis = {
  ticker: string;
  date: string;
  totalVolume: number;
  upVolume: number;
  downVolume: number;
  upVolumePercent: number;
  downVolumePercent: number;
  netVolume: number;
  upDownRatio: number;
  daysAnalyzed: number;
};

export type ApiError = {
  message: string;
  code: 'RATE_LIMIT' | 'NOT_FOUND' | 'API_ERROR' | 'NETWORK_ERROR' | 'INVALID_KEY';
  retryAfter?: number; // seconds
};
