// Portfolio data types matching the backend API

export interface PortfolioStock {
  ticker: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice?: number;
  profitLoss?: number;
  profitLossPercent?: number;
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
