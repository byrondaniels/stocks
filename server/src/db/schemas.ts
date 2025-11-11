import { Schema } from "mongoose";

/**
 * Portfolio Collection Schema
 * Stores user stock holdings
 */
export const PortfolioSchema = new Schema(
  {
    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    shares: {
      type: Number,
      required: true,
      min: 0,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    lastUpdated: {
      type: Date,
      required: false,
      index: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Indexes for portfolio
PortfolioSchema.index({ ticker: 1 });
PortfolioSchema.index({ purchaseDate: -1 });

/**
 * Stock Prices Collection Schema
 * Stores historical stock price data
 */
export const StockPriceSchema = new Schema(
  {
    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    open: {
      type: Number,
      required: true,
      min: 0,
    },
    high: {
      type: Number,
      required: true,
      min: 0,
    },
    low: {
      type: Number,
      required: true,
      min: 0,
    },
    close: {
      type: Number,
      required: true,
      min: 0,
    },
    volume: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: false, // Historical data doesn't need timestamps
  }
);

// Compound indexes for efficient queries
StockPriceSchema.index({ ticker: 1, date: -1 });
StockPriceSchema.index({ date: -1 });

// Unique constraint to prevent duplicate price entries for same date
StockPriceSchema.index({ ticker: 1, date: 1 }, { unique: true });

/**
 * Stock Metrics Collection Schema
 * Flexible schema for various stock metrics (ownership, CANSLIM, financials)
 */
export const StockMetricsSchema = new Schema(
  {
    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    dataType: {
      type: String,
      required: true,
      enum: ["ownership", "canslim", "financials"],
      index: true,
    },
    data: {
      type: Schema.Types.Mixed, // Flexible JSON object
      required: true,
    },
    fetchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Compound indexes for efficient queries
StockMetricsSchema.index({ ticker: 1, dataType: 1 });
StockMetricsSchema.index({ fetchedAt: -1 });

/**
 * Insider Transactions Collection Schema
 * Migrated from LowDB cache
 */
export const InsiderTransactionSchema = new Schema(
  {
    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true, // One document per ticker
    },
    cik: {
      type: String,
      required: true,
    },
    transactions: {
      type: [
        {
          date: { type: String },
          insider: { type: String, required: true },
          formType: { type: String, required: true },
          transactionCode: { type: String },
          type: {
            type: String,
            enum: ["buy", "sell", "exercise", "other"],
            required: true,
          },
          shares: { type: Number, required: true },
          price: { type: Number },
          securityTitle: { type: String },
          source: { type: String, required: true },
          note: { type: String },
        },
      ],
      required: true,
      default: [],
    },
    summary: {
      type: {
        totalBuyShares: { type: Number, required: true },
        totalSellShares: { type: Number, required: true },
        netShares: { type: Number, required: true },
      },
      required: true,
    },
    fetchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// TTL index - automatically delete documents after 24 hours
InsiderTransactionSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 86400 });

// Index for efficient lookups
InsiderTransactionSchema.index({ ticker: 1 });

/**
 * Watchlist Collection Schema
 * Stores tickers user wants to watch/track
 */
export const WatchlistSchema = new Schema(
  {
    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true, // Each ticker can only be added once to watchlist
    },
    notes: {
      type: String,
      required: false,
      trim: true,
    },
    addedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Indexes for watchlist
WatchlistSchema.index({ ticker: 1 });
WatchlistSchema.index({ addedDate: -1 });

/**
 * SEC Company Ticker Collection Schema
 * Stores SEC company ticker to CIK mapping
 */
export const SECCompanyTickerSchema = new Schema(
  {
    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
    },
    cik: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    fetchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Index for efficient lookups
SECCompanyTickerSchema.index({ ticker: 1 });
SECCompanyTickerSchema.index({ fetchedAt: -1 });

// TTL index - automatically delete documents after 30 days
SECCompanyTickerSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 2592000 });
