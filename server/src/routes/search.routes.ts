/**
 * Search History Routes
 * Endpoints for storing and retrieving search history
 */

import { Request, Response as ExpressResponse, Router } from "express";
import { SearchHistory } from "../db/models/index.ts";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants.ts";
import { normalizeTicker, isValidTicker } from "../../../shared/validation.ts";
import { sendBadRequest, sendInternalError } from "../utils/errorHandler.ts";

const router = Router();

/**
 * GET /api/search/history
 * Get recent search history (last 20 searches, most recent first)
 */
router.get("/history", async (req: Request, res: ExpressResponse) => {
  try {
    const recentSearches = await SearchHistory.find({})
      .sort({ searchedAt: -1 })
      .limit(20)
      .select("ticker companyName searchedAt");

    res.json({
      searches: recentSearches,
      count: recentSearches.length,
    });
  } catch (error) {
    console.error("Error fetching search history:", error);
    sendInternalError(res, ERROR_MESSAGES.DATABASE_ERROR);
  }
});

/**
 * POST /api/search/history
 * Add a search to history
 * Body: { ticker: string, companyName?: string }
 */
router.post("/history", async (req: Request, res: ExpressResponse) => {
  const { ticker: rawTicker, companyName } = req.body;

  if (!rawTicker || typeof rawTicker !== "string") {
    sendBadRequest(res, "Ticker is required");
    return;
  }

  const ticker = normalizeTicker(rawTicker);

  if (!isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    // Check if this exact ticker+companyName combination already exists recently
    const existingSearch = await SearchHistory.findOne({
      ticker,
      ...(companyName && { companyName }),
    }).sort({ searchedAt: -1 });

    // If the same search exists within the last hour, update its timestamp
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (existingSearch && existingSearch.searchedAt > oneHourAgo) {
      existingSearch.searchedAt = new Date();
      await existingSearch.save();
      
      res.status(HTTP_STATUS.OK).json({
        message: "Search updated",
        search: existingSearch,
      });
      return;
    }

    // Create new search record
    const newSearch = new SearchHistory({
      ticker,
      companyName: companyName || undefined,
      searchedAt: new Date(),
    });

    await newSearch.save();

    // Clean up old searches (keep only last 100)
    const searchCount = await SearchHistory.countDocuments();
    if (searchCount > 100) {
      const oldSearches = await SearchHistory.find({})
        .sort({ searchedAt: -1 })
        .skip(100)
        .select("_id");
      
      await SearchHistory.deleteMany({
        _id: { $in: oldSearches.map(s => s._id) },
      });
    }

    res.status(HTTP_STATUS.CREATED).json({
      message: "Search recorded",
      search: newSearch,
    });
  } catch (error) {
    console.error("Error saving search history:", error);
    sendInternalError(res, ERROR_MESSAGES.DATABASE_ERROR);
  }
});

/**
 * GET /api/search/recent?limit=10
 * Get unique recent searches (deduplicated by ticker)
 */
router.get("/recent", async (req: Request, res: ExpressResponse) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

  try {
    // Get unique tickers with their most recent search data
    const recentSearches = await SearchHistory.aggregate([
      {
        $sort: { searchedAt: -1 },
      },
      {
        $group: {
          _id: "$ticker",
          ticker: { $first: "$ticker" },
          companyName: { $first: "$companyName" },
          searchedAt: { $first: "$searchedAt" },
        },
      },
      {
        $sort: { searchedAt: -1 },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 0,
          ticker: 1,
          companyName: 1,
          searchedAt: 1,
        },
      },
    ]);

    res.json({
      searches: recentSearches,
      count: recentSearches.length,
    });
  } catch (error) {
    console.error("Error fetching recent searches:", error);
    sendInternalError(res, ERROR_MESSAGES.DATABASE_ERROR);
  }
});

export default router;