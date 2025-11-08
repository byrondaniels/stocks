/**
 * InsiderTransaction Model
 * Stores cached SEC insider trading data
 */

import mongoose, { Document, Model } from "mongoose";
import { InsiderTransactionSchema } from "../schemas.js";

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

export const InsiderTransaction: Model<IInsiderTransaction> =
  mongoose.model<IInsiderTransaction>(
    "InsiderTransaction",
    InsiderTransactionSchema,
    "insiderTransactions"
  );
