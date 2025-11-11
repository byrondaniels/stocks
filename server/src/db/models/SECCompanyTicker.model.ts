/**
 * SEC Company Ticker Model
 * Represents SEC company ticker to CIK mapping
 */

import mongoose, { Document, Model } from "mongoose";
import { SECCompanyTickerSchema } from "../schemas.js";

export interface ISECCompanyTicker extends Document {
  ticker: string;
  cik: string;
  companyName: string;
  fetchedAt: Date;
}

export const SECCompanyTicker: Model<ISECCompanyTicker> = mongoose.model<ISECCompanyTicker>(
  "SECCompanyTicker",
  SECCompanyTickerSchema,
  "sec_company_tickers"
);
