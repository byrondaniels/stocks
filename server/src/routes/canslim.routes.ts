/**
 * CANSLIM Score Routes
 * Endpoints for calculating and retrieving CANSLIM scores
 */

import { Request, Response as ExpressResponse, Router } from "express";
import {
  getOrCalculateCANSLIMScore,
  calculateCANSLIMScore,
} from "../services/canslimCalculator.js";
import { type ApiError } from "../services/stockData.js";

const router = Router();

const TICKER_REGEX = /^[A-Z]{1,5}(\.[A-Z0-9]{1,4})?$/;

/**
 * GET /api/canslim?ticker=AAPL
 * Get CANSLIM score (cached or calculate)
 */
router.get("/", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    // Get cached score or calculate if not cached/stale (24 hour cache)
    const canslimScore = await getOrCalculateCANSLIMScore(ticker, 24);
    res.json(canslimScore);
  } catch (error) {
    console.error("Error calculating CANSLIM score:", error);
    const apiError = error as ApiError;

    if (apiError.code === "RATE_LIMIT") {
      res.status(429).json({
        error: apiError.message,
        retryAfter: apiError.retryAfter,
      });
      return;
    }

    if (apiError.code === "NOT_FOUND") {
      res.status(404).json({ error: apiError.message });
      return;
    }

    res.status(502).json({
      error: "Unable to calculate CANSLIM score. Please try again later.",
    });
  }
});

/**
 * POST /api/canslim/refresh?ticker=AAPL
 * Force recalculation of CANSLIM score
 */
router.post("/refresh", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
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
    const apiError = error as ApiError;

    if (apiError.code === "RATE_LIMIT") {
      res.status(429).json({
        error: apiError.message,
        retryAfter: apiError.retryAfter,
      });
      return;
    }

    if (apiError.code === "NOT_FOUND") {
      res.status(404).json({ error: apiError.message });
      return;
    }

    res.status(502).json({
      error: "Unable to refresh CANSLIM score. Please try again later.",
    });
  }
});

export default router;
