/**
 * SearchHistory Model
 * Represents user search history for tickers/companies
 */

import mongoose, { Document, Model } from "mongoose";

export interface ISearchHistory extends Document {
  ticker: string;
  companyName?: string;
  searchedAt: Date;
}

const SearchHistorySchema = new mongoose.Schema(
  {
    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    searchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying of recent searches
SearchHistorySchema.index({ searchedAt: -1 });

// Compound index for deduplication
SearchHistorySchema.index({ ticker: 1, companyName: 1 });

export const SearchHistory: Model<ISearchHistory> = mongoose.model<ISearchHistory>(
  "SearchHistory",
  SearchHistorySchema,
  "searchHistory"
);