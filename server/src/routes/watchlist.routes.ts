/**
 * Watchlist Management Routes
 * CRUD operations for watchlist stocks with price tracking
 */

import { Request, Response as ExpressResponse, Router } from "express";
import { Watchlist } from "../db/index.js";
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
import {
  HTTP_STATUS,
  ERROR_MESSAGES,
  HISTORICAL_DAYS_DEFAULT,
} from "../constants.js";
import {
  normalizeTicker,
  isValidTicker,
} from "../utils/validation.js";
import { sendBadRequest, sendNotFound, sendInternalError } from "../utils/errorHandler.js";

const router = Router();

/**
 * GET /api/watchlist
 * Get all watchlist stocks with their latest price data and 50DMA
 */
router.get("/", async (_req: Request, res: ExpressResponse) => {
  try {
    const watchlistStocks = await Watchlist.find().sort({ addedDate: -1 }).lean();

    // Enrich each watchlist item with current price, 50DMA stats, and insider activity
    const enrichedWatchlist = await Promise.all(
      watchlistStocks.map(async (stock: any) => {
        try {
          // Get current price
          const priceData = await getCurrentPrice(stock.ticker);
          const currentPrice = priceData.price;

          // Get 50DMA stats and insider activity in parallel
          const [dmaStats, insiderData] = await Promise.all([
            calculate50DMA(stock.ticker),
            getInsiderTransactions(stock.ticker).catch(() => null), // Don't fail if insider data unavailable
          ]);

          return {
            ...stock,
            currentPrice,
            movingAverage50: dmaStats.movingAverage50,
            percentageDifference: dmaStats.percentageDifference,
            priceCount: dmaStats.priceCount,
            latestDate: dmaStats.latestDate,
            insiderActivity: insiderData?.summary || null,
          };
        } catch (error) {
          // If we can't get current price, return with DMA data
          const [dmaStats, insiderData] = await Promise.all([
            calculate50DMA(stock.ticker),
            getInsiderTransactions(stock.ticker).catch(() => null),
          ]);
          return {
            ...stock,
            currentPrice: dmaStats.currentPrice,
            movingAverage50: dmaStats.movingAverage50,
            percentageDifference: dmaStats.percentageDifference,
            priceCount: dmaStats.priceCount,
            latestDate: dmaStats.latestDate,
            insiderActivity: insiderData?.summary || null,
          };
        }
      })
    );

    res.json({
      success: true,
      count: enrichedWatchlist.length,
      watchlist: enrichedWatchlist,
    });
  } catch (error) {
    console.error("[Watchlist] Error fetching watchlist:", error);
    sendInternalError(res, "Failed to retrieve watchlist");
  }
});

/**
 * GET /api/watchlist/:ticker
 * Get detailed view for one watchlist stock
 */
router.get("/:ticker", async (req: Request, res: ExpressResponse) => {
  const ticker = normalizeTicker(req.params.ticker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    const watchlistItem = await Watchlist.findOne({ ticker }).lean();

    if (!watchlistItem) {
      sendNotFound(res, ERROR_MESSAGES.STOCK_NOT_FOUND);
      return;
    }

    try {
      const priceData = await getCurrentPrice(ticker);
      const currentPrice = priceData.price;

      res.json({
        ticker: watchlistItem.ticker,
        notes: watchlistItem.notes,
        addedDate: watchlistItem.addedDate,
        currentPrice,
      });
    } catch (error) {
      // If we can't get current price, return without it
      res.json({
        ticker: watchlistItem.ticker,
        notes: watchlistItem.notes,
        addedDate: watchlistItem.addedDate,
      });
    }
  } catch (error) {
    console.error(error);
    sendInternalError(res, "Unable to retrieve stock from watchlist.");
  }
});

/**
 * POST /api/watchlist
 * Add a new stock to the watchlist and fetch historical prices
 * Body: { ticker, notes? }
 */
router.post("/", async (req: Request, res: ExpressResponse) => {
  const { ticker: rawTicker, notes } = req.body;

  // Validate required fields
  if (!rawTicker) {
    sendBadRequest(res, "Missing required field: ticker");
    return;
  }

  const ticker = normalizeTicker(rawTicker);

  // Validate ticker format
  if (!isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER_FORMAT);
    return;
  }

  try {
    // Check if ticker already exists in watchlist
    const existing = await Watchlist.findOne({ ticker });
    if (existing) {
      res.status(HTTP_STATUS.CONFLICT).json({
        error: `Stock ${ticker} already exists in watchlist. Use PUT to update.`,
      });
      return;
    }

    // Create watchlist entry
    const watchlistEntry = new Watchlist({
      ticker,
      notes: notes || "",
      addedDate: new Date(),
    });

    await watchlistEntry.save();

    console.log(`[Watchlist] Added ${ticker} to watchlist`);

    // Fetch and store historical prices in the background
    fetchAndStoreHistoricalPrices(ticker, HISTORICAL_DAYS_DEFAULT)
      .then((count) => {
        console.log(`[Watchlist] Stored ${count} historical prices for ${ticker}`);
      })
      .catch((error) => {
        console.error(`[Watchlist] Failed to fetch historical prices for ${ticker}:`, error);
      });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: `Successfully added ${ticker} to watchlist. Historical prices are being fetched.`,
      watchlist: {
        ticker: watchlistEntry.ticker,
        notes: watchlistEntry.notes,
        addedDate: watchlistEntry.addedDate,
      },
    });
  } catch (error) {
    console.error("[Watchlist] Error adding stock to watchlist:", error);
    sendInternalError(res, "Failed to add stock to watchlist");
  }
});

/**
 * PUT /api/watchlist/:ticker
 * Update watchlist stock notes
 */
router.put("/:ticker", async (req: Request, res: ExpressResponse) => {
  const ticker = normalizeTicker(req.params.ticker);
  const { notes } = req.body;

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  if (notes === undefined) {
    sendBadRequest(res, "No notes field provided to update.");
    return;
  }

  try {
    const updatedItem = await Watchlist.findOneAndUpdate(
      { ticker },
      { $set: { notes } },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      sendNotFound(res, ERROR_MESSAGES.STOCK_NOT_FOUND);
      return;
    }

    res.json({
      ticker: updatedItem.ticker,
      notes: updatedItem.notes,
      addedDate: updatedItem.addedDate,
    });
  } catch (error) {
    console.error(error);
    sendInternalError(res, "Unable to update stock in watchlist.");
  }
});

/**
 * DELETE /api/watchlist/:ticker
 * Remove a stock from the watchlist
 */
router.delete("/:ticker", async (req: Request, res: ExpressResponse) => {
  const ticker = normalizeTicker(req.params.ticker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    const deletedItem = await Watchlist.findOneAndDelete({ ticker });

    if (!deletedItem) {
      sendNotFound(res, ERROR_MESSAGES.STOCK_NOT_FOUND);
      return;
    }

    console.log(`[Watchlist] Removed ${ticker} from watchlist`);

    res.json({
      success: true,
      message: `Stock ${ticker} removed from watchlist.`,
      removed: {
        ticker: deletedItem.ticker,
        notes: deletedItem.notes,
      },
    });
  } catch (error) {
    console.error("[Watchlist] Error removing stock from watchlist:", error);
    sendInternalError(res, "Failed to remove stock from watchlist");
  }
});

/**
 * POST /api/watchlist/refresh-all
 * Manually refresh price history for all stocks in the watchlist
 */
router.post("/refresh-all", async (_req: Request, res: ExpressResponse) => {
  try {
    // Get all watchlist stocks
    const watchlistStocks = await Watchlist.find().lean();

    if (watchlistStocks.length === 0) {
      res.json({
        success: true,
        message: "No stocks in watchlist to refresh",
        results: [],
      });
      return;
    }

    console.log(`[Watchlist] Refreshing price history for ${watchlistStocks.length} stocks`);

    // Refresh all stocks (sequentially to avoid rate limits)
    const results = [];
    for (const stock of watchlistStocks) {
      try {
        const storedCount = await fetchAndStoreHistoricalPrices(stock.ticker, HISTORICAL_DAYS_DEFAULT);
        const movingAverage50 = await calculateMovingAverage(stock.ticker, 50);

        results.push({
          ticker: stock.ticker,
          success: true,
          storedPrices: storedCount,
          movingAverage50,
        });

        console.log(`[Watchlist] Refreshed ${stock.ticker} - stored ${storedCount} prices`);
      } catch (error) {
        console.error(`[Watchlist] Failed to refresh ${stock.ticker}:`, error);
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
      message: `Refreshed ${successCount} of ${watchlistStocks.length} stocks`,
      successCount,
      failureCount,
      results,
    });
  } catch (error) {
    console.error("[Watchlist] Error during refresh-all:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: "Failed to refresh watchlist",
      details: (error as Error).message || "Unknown error",
    });
  }
});

/**
 * POST /api/watchlist/:ticker/refresh
 * Manually refresh price history for a specific ticker
 */
router.post("/:ticker/refresh", async (req: Request, res: ExpressResponse) => {
  const ticker = normalizeTicker(req.params.ticker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER_FORMAT);
    return;
  }

  try {
    // Check if ticker exists in watchlist
    const watchlistEntry = await Watchlist.findOne({ ticker });

    if (!watchlistEntry) {
      sendNotFound(res, `${ticker} not found in watchlist`);
      return;
    }

    // Fetch and store historical prices
    console.log(`[Watchlist] Manually refreshing price history for ${ticker}`);

    const storedCount = await fetchAndStoreHistoricalPrices(ticker, HISTORICAL_DAYS_DEFAULT);

    // Calculate 50DMA
    const movingAverage50 = await calculateMovingAverage(ticker, 50);

    // Get summary
    const summary = await getPriceHistorySummary(ticker);

    res.json({
      success: true,
      message: `Successfully refreshed price history for ${ticker}`,
      ticker,
      storedPrices: storedCount,
      movingAverage50,
      summary,
    });
  } catch (error) {
    console.error(`[Watchlist] Error refreshing prices for ${ticker}:`, error);

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
