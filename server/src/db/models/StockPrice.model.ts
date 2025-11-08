/**
 * StockPrice Model
 * Stores historical daily stock prices
 */

import mongoose, { Document, Model } from "mongoose";
import { StockPriceSchema } from "../schemas.js";

export interface IStockPrice extends Document {
  ticker: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const StockPrice: Model<IStockPrice> = mongoose.model<IStockPrice>(
  "StockPrice",
  StockPriceSchema,
  "stockPrices"
);
