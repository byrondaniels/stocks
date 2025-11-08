/**
 * Portfolio Management Routes
 * CRUD operations for portfolio stocks with price tracking
 */

import { Request, Response as ExpressResponse, Router } from "express";
import { Portfolio } from "../db/index.js";
import {
  getCurrentPrice,
  type ApiError,
} from "../services/stockData.js";
import {
  fetchAndStoreHistoricalPrices,
  calculateMovingAverage,
  getPriceHistorySummary,
  calculate50DMA,
} from "../services/priceHistory.js";

const router = Router();

const TICKER_REGEX = /^[A-Z]{1,5}(\.[A-Z0-9]{1,4})?$/;

/**
 * GET /api/portfolio
 * Get all portfolio stocks with their latest price data, profit/loss, and 50DMA
 */
router.get("/", async (_req: Request, res: ExpressResponse) => {
  try {
    const portfolioStocks = await Portfolio.find().sort({ createdAt: -1 }).lean();

    // Enrich each portfolio item with current price, profit/loss, and 50DMA stats
    const enrichedPortfolio = await Promise.all(
      portfolioStocks.map(async (stock: any) => {
        try {
          // Get current price for profit/loss calculation
          const priceData = await getCurrentPrice(stock.ticker);
          const currentPrice = priceData.price;

          // Calculate profit/loss
          const profitLoss = (currentPrice - stock.purchasePrice) * stock.shares;
          const profitLossPercent = ((currentPrice - stock.purchasePrice) / stock.purchasePrice) * 100;

          // Get 50DMA stats
          const dmaStats = await calculate50DMA(stock.ticker);

          return {
            ...stock,
            currentPrice,
            profitLoss: parseFloat(profitLoss.toFixed(2)),
            profitLossPercent: parseFloat(profitLossPercent.toFixed(2)),
            movingAverage50: dmaStats.movingAverage50,
            percentageDifference: dmaStats.percentageDifference,
            priceCount: dmaStats.priceCount,
            latestDate: dmaStats.latestDate,
          };
        } catch (error) {
          // If we can't get current price or DMA, return basic data
          const dmaStats = await calculate50DMA(stock.ticker);
          return {
            ...stock,
            currentPrice: dmaStats.currentPrice,
            movingAverage50: dmaStats.movingAverage50,
            percentageDifference: dmaStats.percentageDifference,
            priceCount: dmaStats.priceCount,
            latestDate: dmaStats.latestDate,
          };
        }
      })
    );

    res.json({
      success: true,
      count: enrichedPortfolio.length,
      portfolio: enrichedPortfolio,
    });
  } catch (error) {
    console.error("[Portfolio] Error fetching portfolio:", error);
    res.status(500).json({
      error: "Failed to retrieve portfolio",
    });
  }
});

/**
 * GET /api/portfolio/:ticker
 * Get detailed view for one stock
 */
router.get("/:ticker", async (req: Request, res: ExpressResponse) => {
  const ticker = req.params.ticker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    const portfolioItem = await Portfolio.findOne({ ticker }).lean();

    if (!portfolioItem) {
      res.status(404).json({
        error: `Stock ${ticker} not found in portfolio.`,
      });
      return;
    }

    try {
      const priceData = await getCurrentPrice(ticker);
      const currentPrice = priceData.price;
      const profitLoss = (currentPrice - portfolioItem.purchasePrice) * portfolioItem.shares;
      const profitLossPercent = ((currentPrice - portfolioItem.purchasePrice) / portfolioItem.purchasePrice) * 100;

      res.json({
        ticker: portfolioItem.ticker,
        shares: portfolioItem.shares,
        purchasePrice: portfolioItem.purchasePrice,
        purchaseDate: portfolioItem.purchaseDate.toISOString(),
        currentPrice,
        profitLoss: parseFloat(profitLoss.toFixed(2)),
        profitLossPercent: parseFloat(profitLossPercent.toFixed(2)),
      });
    } catch (error) {
      // If we can't get current price, return without profit/loss metrics
      res.json({
        ticker: portfolioItem.ticker,
        shares: portfolioItem.shares,
        purchasePrice: portfolioItem.purchasePrice,
        purchaseDate: portfolioItem.purchaseDate.toISOString(),
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to retrieve stock from portfolio.",
    });
  }
});

/**
 * POST /api/portfolio
 * Add a new stock to the portfolio and fetch historical prices
 * Body: { ticker, shares, purchasePrice, purchaseDate }
 */
router.post("/", async (req: Request, res: ExpressResponse) => {
  const { ticker: rawTicker, shares, purchasePrice, purchaseDate } = req.body;

  // Validate required fields
  if (!rawTicker || shares === undefined || purchasePrice === undefined || !purchaseDate) {
    res.status(400).json({
      error: "Missing required fields: ticker, shares, purchasePrice, purchaseDate",
    });
    return;
  }

  const ticker = rawTicker.trim().toUpperCase();

  // Validate ticker format
  if (!TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker format. Use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  // Validate numeric values
  if (typeof shares !== "number" || shares <= 0) {
    res.status(400).json({
      error: "Shares must be a positive number",
    });
    return;
  }

  if (typeof purchasePrice !== "number" || purchasePrice <= 0) {
    res.status(400).json({
      error: "Purchase price must be a positive number",
    });
    return;
  }

  // Validate date format
  const date = new Date(purchaseDate);
  if (isNaN(date.getTime())) {
    res.status(400).json({
      error: "Invalid purchase date. Please use ISO date format (YYYY-MM-DD).",
    });
    return;
  }

  try {
    // Check if ticker already exists in portfolio
    const existing = await Portfolio.findOne({ ticker });
    if (existing) {
      res.status(409).json({
        error: `Stock ${ticker} already exists in portfolio. Use PUT to update.`,
      });
      return;
    }

    // Create portfolio entry
    const portfolioEntry = new Portfolio({
      ticker,
      shares,
      purchasePrice,
      purchaseDate: date,
      lastUpdated: new Date(),
    });

    await portfolioEntry.save();

    console.log(`[Portfolio] Added ${ticker} to portfolio`);

    // Fetch and store 50 days of historical prices in the background
    fetchAndStoreHistoricalPrices(ticker, 50)
      .then((count) => {
        console.log(`[Portfolio] Stored ${count} historical prices for ${ticker}`);
      })
      .catch((error) => {
        console.error(`[Portfolio] Failed to fetch historical prices for ${ticker}:`, error);
      });

    res.status(201).json({
      success: true,
      message: `Successfully added ${ticker} to portfolio. Historical prices are being fetched.`,
      portfolio: {
        ticker: portfolioEntry.ticker,
        shares: portfolioEntry.shares,
        purchasePrice: portfolioEntry.purchasePrice,
        purchaseDate: portfolioEntry.purchaseDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Portfolio] Error adding stock to portfolio:", error);
    res.status(500).json({
      error: "Failed to add stock to portfolio",
    });
  }
});

/**
 * PUT /api/portfolio/:ticker
 * Update stock (shares, purchase price, purchase date)
 */
router.put("/:ticker", async (req: Request, res: ExpressResponse) => {
  const ticker = req.params.ticker.trim().toUpperCase();
  const { shares, purchasePrice, purchaseDate } = req.body;

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  // Build update object with only provided fields
  const updateFields: any = {};

  if (shares !== undefined) {
    if (typeof shares !== "number" || shares <= 0) {
      res.status(400).json({
        error: "Shares must be a positive number.",
      });
      return;
    }
    updateFields.shares = shares;
  }

  if (purchasePrice !== undefined) {
    if (typeof purchasePrice !== "number" || purchasePrice <= 0) {
      res.status(400).json({
        error: "Purchase price must be a positive number.",
      });
      return;
    }
    updateFields.purchasePrice = purchasePrice;
  }

  if (purchaseDate !== undefined) {
    const date = new Date(purchaseDate);
    if (isNaN(date.getTime())) {
      res.status(400).json({
        error: "Invalid purchase date. Please use ISO date format (YYYY-MM-DD).",
      });
      return;
    }
    updateFields.purchaseDate = date;
  }

  // Check if there are any fields to update
  if (Object.keys(updateFields).length === 0) {
    res.status(400).json({
      error: "No fields to update. Provide shares, purchasePrice, or purchaseDate.",
    });
    return;
  }

  try {
    const updatedItem = await Portfolio.findOneAndUpdate(
      { ticker },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      res.status(404).json({
        error: `Stock ${ticker} not found in portfolio.`,
      });
      return;
    }

    res.json({
      ticker: updatedItem.ticker,
      shares: updatedItem.shares,
      purchasePrice: updatedItem.purchasePrice,
      purchaseDate: updatedItem.purchaseDate.toISOString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to update stock in portfolio.",
    });
  }
});

/**
 * DELETE /api/portfolio/:ticker
 * Remove a stock from the portfolio
 */
router.delete("/:ticker", async (req: Request, res: ExpressResponse) => {
  const ticker = req.params.ticker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    const deletedItem = await Portfolio.findOneAndDelete({ ticker });

    if (!deletedItem) {
      res.status(404).json({
        error: `Stock ${ticker} not found in portfolio.`,
      });
      return;
    }

    console.log(`[Portfolio] Removed ${ticker} from portfolio`);

    res.json({
      success: true,
      message: `Stock ${ticker} removed from portfolio.`,
      removed: {
        ticker: deletedItem.ticker,
        shares: deletedItem.shares,
        purchasePrice: deletedItem.purchasePrice,
      },
    });
  } catch (error) {
    console.error("[Portfolio] Error removing stock from portfolio:", error);
    res.status(500).json({
      error: "Failed to remove stock from portfolio",
    });
  }
});

/**
 * POST /api/portfolio/:ticker/refresh
 * Manually refresh price history for a specific ticker
 */
router.post("/:ticker/refresh", async (req: Request, res: ExpressResponse) => {
  const ticker = req.params.ticker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker format",
    });
    return;
  }

  try {
    // Check if ticker exists in portfolio
    const portfolioEntry = await Portfolio.findOne({ ticker });

    if (!portfolioEntry) {
      res.status(404).json({
        error: `${ticker} not found in portfolio`,
      });
      return;
    }

    // Fetch and store historical prices
    console.log(`[Portfolio] Manually refreshing price history for ${ticker}`);

    const storedCount = await fetchAndStoreHistoricalPrices(ticker, 50);

    // Calculate 50DMA
    const movingAverage50 = await calculateMovingAverage(ticker, 50);

    // Update lastUpdated timestamp
    portfolioEntry.lastUpdated = new Date();
    await portfolioEntry.save();

    // Get summary
    const summary = await getPriceHistorySummary(ticker);

    res.json({
      success: true,
      message: `Successfully refreshed price history for ${ticker}`,
      ticker,
      storedPrices: storedCount,
      movingAverage50,
      summary,
      lastUpdated: portfolioEntry.lastUpdated,
    });
  } catch (error) {
    console.error(`[Portfolio] Error refreshing prices for ${ticker}:`, error);

    const apiError = error as ApiError;
    if (apiError.code === "RATE_LIMIT") {
      res.status(429).json({
        error: apiError.message,
        retryAfter: apiError.retryAfter,
      });
      return;
    }

    res.status(500).json({
      error: "Failed to refresh price history",
      details: apiError.message || "Unknown error",
    });
  }
});

export default router;
