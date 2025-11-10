/**
 * CANSLIM Score Routes
 * Endpoints for calculating and retrieving CANSLIM scores
 */

import { Request, Response as ExpressResponse, Router } from "express";
import {
  getOrCalculateCANSLIMScore,
  calculateCANSLIMScore,
} from "../services/canslimCalculator.js";
import { ERROR_MESSAGES, CANSLIM_CACHE_HOURS } from "../constants.js";
import { normalizeTicker, isValidTicker } from "../../../shared/validation.js";
import { handleApiError, sendBadRequest } from "../utils/errorHandler.js";

const router = Router();

/**
 * GET /api/canslim?ticker=AAPL
 * Get CANSLIM score (cached or calculate)
 */
router.get("/", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    // Get cached score or calculate if not cached/stale
    const canslimScore = await getOrCalculateCANSLIMScore(ticker, CANSLIM_CACHE_HOURS);
    res.json(canslimScore);
  } catch (error) {
    console.error("Error calculating CANSLIM score:", error);
    handleApiError(res, error, ERROR_MESSAGES.CANSLIM_SCORE_ERROR);
  }
});

/**
 * POST /api/canslim/refresh?ticker=AAPL
 * Force recalculation of CANSLIM score
 */
router.post("/refresh", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    console.log(`[API] Forcing CANSLIM score refresh for ${ticker}`);
    const canslimScore = await calculateCANSLIMScore(ticker);
    res.json({
      success: true,
      message: "CANSLIM score refreshed successfully",
      data: canslimScore,
    });
  } catch (error) {
    console.error("Error refreshing CANSLIM score:", error);
    handleApiError(res, error, "Unable to refresh CANSLIM score. Please try again later.");
  }
});

export default router;
