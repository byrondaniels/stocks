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
import { getInsiderTransactions } from "../services/sec/insider-service.js";
import { enrichPortfolioArray } from "../services/enrichment.service.js";
import {
  HTTP_STATUS,
  ERROR_MESSAGES,
  HISTORICAL_DAYS_DEFAULT,
} from "../constants.js";
import {
  normalizeTicker,
  isValidTicker,
  isPositiveNumber,
} from "../../../shared/validation.js";
import { calculateProfitLoss } from "../utils/calculations.js";
import { sendBadRequest, sendNotFound, sendInternalError } from "../utils/errorHandler.js";

const router = Router();

/**
 * GET /api/portfolio
 * Get all portfolio stocks with their latest price data, profit/loss, and 50DMA
 */
router.get("/", async (_req: Request, res: ExpressResponse) => {
  try {
    const portfolioStocks = await Portfolio.find().sort({ createdAt: -1 }).lean();

    // Enrich each portfolio item with current price, profit/loss, 50DMA stats, and insider activity
    const enrichedPortfolio = await enrichPortfolioArray(portfolioStocks as any);

    res.json({
      success: true,
      count: enrichedPortfolio.length,
      portfolio: enrichedPortfolio,
    });
  } catch (error) {
    console.error("[Portfolio] Error fetching portfolio:", error);
    sendInternalError(res, "Failed to retrieve portfolio");
  }
});

/**
 * GET /api/portfolio/:ticker
 * Get detailed view for one stock
 */
router.get("/:ticker", async (req: Request, res: ExpressResponse) => {
  const ticker = normalizeTicker(req.params.ticker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    const portfolioItem = await Portfolio.findOne({ ticker }).lean();

    if (!portfolioItem) {
      sendNotFound(res, ERROR_MESSAGES.STOCK_NOT_FOUND);
      return;
    }

    try {
      const priceData = await getCurrentPrice(ticker);
      const currentPrice = priceData.price;
      const { profitLoss, profitLossPercent } = calculateProfitLoss(
        currentPrice,
        portfolioItem.purchasePrice,
        portfolioItem.shares
      );

      res.json({
        ticker: portfolioItem.ticker,
        shares: portfolioItem.shares,
        purchasePrice: portfolioItem.purchasePrice,
        purchaseDate: portfolioItem.purchaseDate.toISOString(),
        currentPrice,
        profitLoss,
        profitLossPercent,
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
    sendInternalError(res, "Unable to retrieve stock from portfolio.");
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
    sendBadRequest(res, "Missing required fields: ticker, shares, purchasePrice, purchaseDate");
    return;
  }

  const ticker = normalizeTicker(rawTicker);

  // Validate ticker format
  if (!isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER_FORMAT);
    return;
  }

  // Validate numeric values
  if (!isPositiveNumber(shares)) {
    sendBadRequest(res, ERROR_MESSAGES.SHARES_POSITIVE);
    return;
  }

  if (!isPositiveNumber(purchasePrice)) {
    sendBadRequest(res, ERROR_MESSAGES.PRICE_POSITIVE);
    return;
  }

  // Validate date format
  const date = new Date(purchaseDate);
  if (isNaN(date.getTime())) {
    sendBadRequest(res, "Invalid purchase date. Please use ISO date format (YYYY-MM-DD).");
    return;
  }

  try {
    // Check if ticker already exists in portfolio
    const existing = await Portfolio.findOne({ ticker });
    if (existing) {
      res.status(HTTP_STATUS.CONFLICT).json({
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

    // Fetch and store historical prices in the background
    fetchAndStoreHistoricalPrices(ticker, HISTORICAL_DAYS_DEFAULT)
      .then((count) => {
        console.log(`[Portfolio] Stored ${count} historical prices for ${ticker}`);
      })
      .catch((error) => {
        console.error(`[Portfolio] Failed to fetch historical prices for ${ticker}:`, error);
      });

    res.status(HTTP_STATUS.CREATED).json({
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
    sendInternalError(res, "Failed to add stock to portfolio");
  }
});

/**
 * PUT /api/portfolio/:ticker
 * Update stock (shares, purchase price, purchase date)
 */
router.put("/:ticker", async (req: Request, res: ExpressResponse) => {
  const ticker = normalizeTicker(req.params.ticker);
  const { shares, purchasePrice, purchaseDate } = req.body;

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  // Build update object with only provided fields
  const updateFields: any = {};

  if (shares !== undefined) {
    if (!isPositiveNumber(shares)) {
      sendBadRequest(res, ERROR_MESSAGES.SHARES_POSITIVE);
      return;
    }
    updateFields.shares = shares;
  }

  if (purchasePrice !== undefined) {
    if (!isPositiveNumber(purchasePrice)) {
      sendBadRequest(res, ERROR_MESSAGES.PRICE_POSITIVE);
      return;
    }
    updateFields.purchasePrice = purchasePrice;
  }

  if (purchaseDate !== undefined) {
    const date = new Date(purchaseDate);
    if (isNaN(date.getTime())) {
      sendBadRequest(res, "Invalid purchase date. Please use ISO date format (YYYY-MM-DD).");
      return;
    }
    updateFields.purchaseDate = date;
  }

  // Check if there are any fields to update
  if (Object.keys(updateFields).length === 0) {
    sendBadRequest(res, "No fields to update. Provide shares, purchasePrice, or purchaseDate.");
    return;
  }

  try {
    const updatedItem = await Portfolio.findOneAndUpdate(
      { ticker },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      sendNotFound(res, ERROR_MESSAGES.STOCK_NOT_FOUND);
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
    sendInternalError(res, "Unable to update stock in portfolio.");
  }
});

/**
 * DELETE /api/portfolio/:ticker
 * Remove a stock from the portfolio
 */
router.delete("/:ticker", async (req: Request, res: ExpressResponse) => {
  const ticker = normalizeTicker(req.params.ticker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    const deletedItem = await Portfolio.findOneAndDelete({ ticker });

    if (!deletedItem) {
      sendNotFound(res, ERROR_MESSAGES.STOCK_NOT_FOUND);
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
    sendInternalError(res, "Failed to remove stock from portfolio");
  }
});

/**
 * POST /api/portfolio/refresh-all
 * Manually refresh price history for all stocks in the portfolio
 */
router.post("/refresh-all", async (_req: Request, res: ExpressResponse) => {
  try {
    // Get all portfolio stocks
    const portfolioStocks = await Portfolio.find().lean();

    if (portfolioStocks.length === 0) {
      res.json({
        success: true,
        message: "No stocks in portfolio to refresh",
        results: [],
      });
      return;
    }

    console.log(`[Portfolio] Refreshing price history for ${portfolioStocks.length} stocks`);

    // Refresh all stocks (sequentially to avoid rate limits)
    const results = [];
    for (const stock of portfolioStocks) {
      try {
        const storedCount = await fetchAndStoreHistoricalPrices(stock.ticker, HISTORICAL_DAYS_DEFAULT);
        const movingAverage50 = await calculateMovingAverage(stock.ticker, 50);

        // Update lastUpdated timestamp
        await Portfolio.findOneAndUpdate(
          { ticker: stock.ticker },
          { lastUpdated: new Date() }
        );

        results.push({
          ticker: stock.ticker,
          success: true,
          storedPrices: storedCount,
          movingAverage50,
        });

        console.log(`[Portfolio] Refreshed ${stock.ticker} - stored ${storedCount} prices`);
      } catch (error) {
        console.error(`[Portfolio] Failed to refresh ${stock.ticker}:`, error);
        results.push({
          ticker: stock.ticker,
          success: false,
          error: (error as Error).message || "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      message: `Refreshed ${successCount} of ${portfolioStocks.length} stocks`,
      successCount,
      failureCount,
      results,
    });
  } catch (error) {
    console.error("[Portfolio] Error during refresh-all:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: "Failed to refresh portfolio",
      details: (error as Error).message || "Unknown error",
    });
  }
});

/**
 * POST /api/portfolio/:ticker/refresh
 * Manually refresh price history for a specific ticker
 */
router.post("/:ticker/refresh", async (req: Request, res: ExpressResponse) => {
  const ticker = normalizeTicker(req.params.ticker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER_FORMAT);
    return;
  }

  try {
    // Check if ticker exists in portfolio
    const portfolioEntry = await Portfolio.findOne({ ticker });

    if (!portfolioEntry) {
      sendNotFound(res, `${ticker} not found in portfolio`);
      return;
    }

    // Fetch and store historical prices
    console.log(`[Portfolio] Manually refreshing price history for ${ticker}`);

    const storedCount = await fetchAndStoreHistoricalPrices(ticker, HISTORICAL_DAYS_DEFAULT);

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
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        error: apiError.message,
        retryAfter: apiError.retryAfter,
      });
      return;
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: "Failed to refresh price history",
      details: apiError.message || "Unknown error",
    });
  }
});

export default router;
