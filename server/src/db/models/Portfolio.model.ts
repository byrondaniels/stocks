/**
 * Portfolio Model
 * Represents stocks in user's portfolio
 */

import mongoose, { Document, Model } from "mongoose";
import { PortfolioSchema } from "../schemas.js";

export interface IPortfolio extends Document {
  ticker: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: Date;
  lastUpdated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const Portfolio: Model<IPortfolio> = mongoose.model<IPortfolio>(
  "Portfolio",
  PortfolioSchema,
  "portfolio"
);
