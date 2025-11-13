/**
 * Financial Ratios Model
 * Represents computed financial ratios and metrics
 */

import mongoose, { Document, Model } from "mongoose";
import { FinancialRatiosSchema } from "../schemas.js";

export interface IFinancialRatios extends Document {
  ticker: string;
  cik: string;
  entityName: string;
  metrics: {
    roe?: Map<string, number>;
    roa?: Map<string, number>;
    profitMargin?: Map<string, number>;
    currentRatio?: Map<string, number>;
    debtToEquity?: Map<string, number>;
    revenueGrowth?: Map<string, number>;
    epsGrowth?: Map<string, number>;
    freeCashFlow?: Map<string, number>;
  };
  calculatedAt: Date;
}

export const FinancialRatios: Model<IFinancialRatios> = mongoose.model<IFinancialRatios>(
  "FinancialRatios",
  FinancialRatiosSchema,
  "financial_ratios"
);
