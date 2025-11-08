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
  type: "buy" | "sell" | "other";
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
  source: 'fmp' | 'sec';
  timestamp: string;
}
