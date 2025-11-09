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

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

export interface OwnershipData {
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
