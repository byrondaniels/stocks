/**
 * StockMetrics Model
 * Stores cached stock metrics (ownership, CANSLIM scores, financials)
 */

import mongoose, { Document, Model } from "mongoose";
import { StockMetricsSchema } from "../schemas.js";

export interface IStockMetrics extends Document {
  ticker: string;
  dataType: "ownership" | "canslim" | "financials" | "detailed-ownership" | "rs";
  data: Record<string, any>;
  fetchedAt: Date;
}

export const StockMetrics: Model<IStockMetrics> =
  mongoose.model<IStockMetrics>(
    "StockMetrics",
    StockMetricsSchema,
    "stockMetrics"
  );
