import mongoose, { Document, Model } from "mongoose";
import {
  PortfolioSchema,
  StockPriceSchema,
  StockMetricsSchema,
  InsiderTransactionSchema,
} from "./schemas.js";

/**
 * TypeScript interfaces for documents
 */

export interface IPortfolio extends Document {
  ticker: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStockPrice extends Document {
  ticker: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IStockMetrics extends Document {
  ticker: string;
  dataType: "ownership" | "canslim" | "financials";
  data: Record<string, any>;
  fetchedAt: Date;
}

export interface ITransaction {
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

export interface ISummary {
  totalBuyShares: number;
  totalSellShares: number;
  netShares: number;
}

export interface IInsiderTransaction extends Document {
  ticker: string;
  cik: string;
  transactions: ITransaction[];
  summary: ISummary;
  fetchedAt: Date;
}

/**
 * Create and export models
 */

export const Portfolio: Model<IPortfolio> = mongoose.model<IPortfolio>(
  "Portfolio",
  PortfolioSchema,
  "portfolio"
);

export const StockPrice: Model<IStockPrice> = mongoose.model<IStockPrice>(
  "StockPrice",
  StockPriceSchema,
  "stockPrices"
);

export const StockMetrics: Model<IStockMetrics> =
  mongoose.model<IStockMetrics>(
    "StockMetrics",
    StockMetricsSchema,
    "stockMetrics"
  );

export const InsiderTransaction: Model<IInsiderTransaction> =
  mongoose.model<IInsiderTransaction>(
    "InsiderTransaction",
    InsiderTransactionSchema,
    "insiderTransactions"
  );
