/**
 * RS Rating Routes
 * Endpoints for calculating and retrieving IBD-style Relative Strength ratings
 */

import { Request, Response as ExpressResponse, Router } from "express";
import {
  getOrCalculateRSRating,
  calculateRSRating,
} from "../services/rsCalculator.js";
import { type ApiError } from "../services/stockData.js";
import { HTTP_STATUS, ERROR_MESSAGES, RS_CACHE_HOURS } from "../constants.js";
import { normalizeTicker, isValidTicker } from "../utils/validation.js";
import { handleApiError, sendBadRequest } from "../utils/errorHandler.js";

const router = Router();

/**
 * GET /api/rs?ticker=AAPL
 * Get RS rating (cached or calculate)
 */
router.get("/", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    // Get cached rating or calculate if not cached/stale
    const rsRating = await getOrCalculateRSRating(ticker, RS_CACHE_HOURS);
    res.json(rsRating);
  } catch (error) {
    console.error("Error calculating RS rating:", error);
    handleApiError(res, error, ERROR_MESSAGES.RS_RATING_ERROR);
  }
});

/**
 * POST /api/rs/refresh?ticker=AAPL
 * Force recalculation of RS rating
 */
router.post("/refresh", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    console.log(`[API] Forcing RS rating refresh for ${ticker}`);
    const rsRating = await calculateRSRating(ticker);
    res.json({
      success: true,
      message: "RS rating refreshed successfully",
      data: rsRating,
    });
  } catch (error) {
    console.error("Error refreshing RS rating:", error);
    handleApiError(res, error, "Unable to refresh RS rating. Please try again later.");
  }
});

export default router;
