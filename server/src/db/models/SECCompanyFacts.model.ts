/**
 * SEC Company Facts Model
 * Represents raw company facts data from SEC EDGAR API
 */

import mongoose, { Document, Model } from "mongoose";
import { SECCompanyFactsSchema } from "../schemas.js";

export interface ISECCompanyFacts extends Document {
  ticker: string;
  cik: string;
  entityName: string;
  facts: any; // Complete SEC facts object
  fetchedAt: Date;
}

export const SECCompanyFacts: Model<ISECCompanyFacts> = mongoose.model<ISECCompanyFacts>(
  "SECCompanyFacts",
  SECCompanyFactsSchema,
  "sec_company_facts"
);
