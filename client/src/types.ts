// Portfolio data types matching the backend API

export interface InsiderSummary {
  totalBuyShares: number;
  totalSellShares: number;
  netShares: number;
}

export interface InsiderTransaction {
  date: string | null;
  insider: string;
  formType: string;
  transactionCode?: string;
  type: "buy" | "sell" | "exercise" | "other";
  shares: number;
  price?: number | null;
  securityTitle?: string;
  source: string;
  note?: string;
}

export interface InsiderData {
  ticker: string;
  cik: string;
  summary: InsiderSummary;
  transactions: InsiderTransaction[];
}

export interface PortfolioStock {
  ticker: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  insiderActivity?: InsiderSummary;
  lastUpdated?: string;
}

export interface AddStockFormData {
  ticker: string;
  shares: string;
  purchasePrice: string;
  purchaseDate: string;
}

export interface RecentlySearchedStock {
  ticker: string;
  companyName: string;
  timestamp: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

export interface WatchlistStock {
  ticker: string;
  notes?: string;
  addedDate: string;
  currentPrice?: number;
  movingAverage50?: number | null;
  percentageDifference?: number | null;
  priceCount?: number;
  latestDate?: string;
  insiderActivity?: InsiderSummary;
}

export interface AddWatchlistFormData {
  ticker: string;
  notes?: string;
}

export interface OwnershipBreakdown {
  insiderShares: number;
  insiderPercent: number;
  institutionalShares: number;
  institutionalPercent: number;
  beneficialShares: number;
  beneficialPercent: number;
  publicShares: number;
  publicPercent: number;
  floatShares: number;
}

export interface OwnershipHolder {
  name: string;
  shares: number;
  percentOwnership: number;
  type: 'insider' | 'beneficial' | 'institutional';
  source: string;
  lastTransactionDate?: string;
  filingDate?: string;
  formType?: string;
}

export interface OwnershipDataQuality {
  hasInsiderData: boolean;
  hasBeneficialOwnerData: boolean;
  hasInstitutionalData: boolean;
  hasSharesOutstanding: boolean;
}

export interface OwnershipData {
  ticker: string;
  companyName: string;
  sharesOutstanding: number;
  breakdown: OwnershipBreakdown;
  insiders: OwnershipHolder[];
  beneficialOwners: OwnershipHolder[];
  institutionalHolders: OwnershipHolder[];
  topHolders: OwnershipHolder[];
  lastUpdated: string;
  dataQuality: OwnershipDataQuality;
  source: string;
}

// Legacy interface for backward compatibility
export interface LegacyOwnershipData {
  ticker: string;
  insiderOwnership: number; // percentage
  institutionalOwnership: number; // percentage
  publicOwnership: number; // percentage
  floatShares: number;
  sharesOutstanding: number;
  source: 'fmp' | 'sec' | 'mock';
  timestamp: string;
}

export interface PriceHistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MovingAverageData {
  currentPrice: number | null;
  movingAverage50: number | null;
  percentageDifference: number | null;
  priceCount: number;
  latestDate?: string;
}

export interface CANSLIMComponentScore {
  score: number;
  explanation: string;
}

export interface CANSLIMMetrics {
  currentEarningsGrowth: number | null;
  annualEarningsGrowth: number | null;
  isNearHighs: boolean;
  distanceFromHigh: number;
  volumeRatio: number | null;
  currentPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  averageVolume: number;
  currentVolume: number;
}

export interface CANSLIMAnalysis {
  overallAnalysis: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface CANSLIMScore {
  ticker: string;
  score: number;
  components: {
    C: CANSLIMComponentScore;
    A: CANSLIMComponentScore;
    N: CANSLIMComponentScore;
    S: CANSLIMComponentScore;
  };
  metrics: CANSLIMMetrics;
  analysis: CANSLIMAnalysis;
  calculatedAt: string;
}

export interface MarketHealthData {
  vix: {
    value: number;
    change: number;
    changePercent: number;
    level: 'low' | 'moderate' | 'high' | 'extreme';
    lastUpdated: string;
  };
  breadth: {
    nyseAdvances: number;
    nyseDeclines: number;
    advanceDeclineRatio: number;
    newHighs: number;
    newLows: number;
    highLowRatio: number;
    lastUpdated: string;
  };
  fearGreed: {
    value: number;
    rating: 'extreme-fear' | 'fear' | 'neutral' | 'greed' | 'extreme-greed';
    lastUpdated: string;
  };
  indices: {
    sp500: {
      value: number;
      change: number;
      changePercent: number;
    };
    dow: {
      value: number;
      change: number;
      changePercent: number;
    };
    nasdaq: {
      value: number;
      change: number;
      changePercent: number;
    };
  };
}
