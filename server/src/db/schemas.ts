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
 * Stores historical stock price data with caching metadata
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
    source: {
      type: String,
      required: false,
    },
    lastFetched: {
      type: Date,
      required: false,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Add createdAt and updatedAt for cache management
  }
);

// Compound indexes for efficient queries
StockPriceSchema.index({ ticker: 1, date: -1 });
StockPriceSchema.index({ date: -1 });
StockPriceSchema.index({ ticker: 1, lastFetched: -1 });

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
      enum: ["ownership", "canslim", "financials", "detailed-ownership", "rs"],
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

/**
 * Search History Collection Schema
 * Stores user search history
 */
export const SearchHistorySchema = new Schema(
  {
    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    searchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Index for efficient queries
SearchHistorySchema.index({ ticker: 1 });
SearchHistorySchema.index({ searchedAt: -1 });

/**
 * Spinoff Analysis Collection Schema
 * Stores cached spinoff analysis results
 */
export const SpinoffAnalysisSchema = new Schema(
  {
    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    analysis: {
      type: Schema.Types.Mixed, // Stores complete SpinoffAnalysis object
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Index for efficient queries
SpinoffAnalysisSchema.index({ ticker: 1 });
SpinoffAnalysisSchema.index({ timestamp: -1 });

// TTL index - automatically delete documents after 7 days (spinoff data ages quickly)
SpinoffAnalysisSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

/**
 * SEC Company Facts Collection Schema
 * Stores raw company facts data from SEC EDGAR API
 */
export const SECCompanyFactsSchema = new Schema(
  {
    ticker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    cik: {
      type: String,
      required: true,
    },
    entityName: {
      type: String,
      required: true,
    },
    facts: {
      type: Schema.Types.Mixed, // Stores the complete facts object from SEC API
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
SECCompanyFactsSchema.index({ ticker: 1 });
SECCompanyFactsSchema.index({ cik: 1 });
SECCompanyFactsSchema.index({ fetchedAt: -1 });

// TTL index - automatically delete documents after 24 hours
SECCompanyFactsSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 86400 });

/**
 * Financial Ratios Collection Schema
 * Stores computed financial ratios and metrics
 */
export const FinancialRatiosSchema = new Schema(
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
    entityName: {
      type: String,
      required: true,
    },
    metrics: {
      // Return on Equity (Net Income / Shareholders' Equity)
      roe: {
        type: Map,
        of: Number, // Map<year, value>
      },
      // Return on Assets (Net Income / Total Assets)
      roa: {
        type: Map,
        of: Number,
      },
      // Profit Margin (Net Income / Revenue)
      profitMargin: {
        type: Map,
        of: Number,
      },
      // Current Ratio (Current Assets / Current Liabilities)
      currentRatio: {
        type: Map,
        of: Number,
      },
      // Debt-to-Equity Ratio (Total Debt / Shareholders' Equity)
      debtToEquity: {
        type: Map,
        of: Number,
      },
      // Revenue Growth Rate ((Current Revenue - Prior Revenue) / Prior Revenue)
      revenueGrowth: {
        type: Map,
        of: Number,
      },
      // EPS Growth ((Current EPS - Prior EPS) / Prior EPS)
      epsGrowth: {
        type: Map,
        of: Number,
      },
      // Free Cash Flow (Operating Cash Flow - Capital Expenditures)
      freeCashFlow: {
        type: Map,
        of: Number,
      },
    },
    calculatedAt: {
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
FinancialRatiosSchema.index({ ticker: 1 });
FinancialRatiosSchema.index({ cik: 1 });
FinancialRatiosSchema.index({ calculatedAt: -1 });
