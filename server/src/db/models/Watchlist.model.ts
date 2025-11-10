/**
 * Watchlist Model
 * Represents stocks in user's watchlist
 */

import mongoose, { Document, Model } from "mongoose";
import { WatchlistSchema } from "../schemas.js";

export interface IWatchlist extends Document {
  ticker: string;
  notes?: string;
  addedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const Watchlist: Model<IWatchlist> = mongoose.model<IWatchlist>(
  "Watchlist",
  WatchlistSchema,
  "watchlist"
);
