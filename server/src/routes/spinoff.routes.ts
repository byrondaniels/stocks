/**
 * Spinoff Analysis Routes
 * Endpoints for analyzing potential spinoff investments
 */

import { Request, Response as ExpressResponse, Router } from "express";
import { analyzeSpinoffWithGemini } from "../services/spinoffAnalyzer.js";
import { ERROR_MESSAGES } from "../constants.js";
import { normalizeTicker, isValidTicker } from "../../../shared/validation.js";
import { handleApiError, sendBadRequest } from "../utils/errorHandler.js";
import { SpinoffAnalysisModel } from "../db/models/SpinoffAnalysis.model.js";

const router = Router();

// Cache duration for spinoff analysis (24 hours)
const SPINOFF_CACHE_HOURS = 24;

/**
 * GET /api/spinoff?ticker=GOOGL
 * Get spinoff analysis (cached or calculate)
 */
router.get("/", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    // Check for cached analysis
    const cacheExpiry = new Date(Date.now() - SPINOFF_CACHE_HOURS * 60 * 60 * 1000);
    const cachedAnalysis = await SpinoffAnalysisModel.findOne({
      ticker: ticker,
      timestamp: { $gte: cacheExpiry }
    }).sort({ timestamp: -1 });

    if (cachedAnalysis) {
      console.log(`[Spinoff] Returning cached analysis for ${ticker}`);
      res.json(cachedAnalysis.analysis);
      return;
    }

    // No cache or stale - run fresh analysis
    console.log(`[Spinoff] Running fresh analysis for ${ticker}`);
    const analysis = await analyzeSpinoffWithGemini(ticker);

    // Cache the result
    await SpinoffAnalysisModel.create({
      ticker: ticker,
      analysis: analysis,
      timestamp: new Date()
    });

    res.json(analysis);
  } catch (error) {
    console.error("Error analyzing spinoff:", error);
    handleApiError(res, error, "Unable to analyze spinoff. Please try again later.");
  }
});

/**
 * POST /api/spinoff/refresh?ticker=GOOGL
 * Force fresh spinoff analysis (bypass cache)
 */
router.post("/refresh", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    console.log(`[API] Forcing spinoff analysis refresh for ${ticker}`);
    const analysis = await analyzeSpinoffWithGemini(ticker);

    // Update cache
    await SpinoffAnalysisModel.findOneAndUpdate(
      { ticker: ticker },
      {
        ticker: ticker,
        analysis: analysis,
        timestamp: new Date()
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: "Spinoff analysis refreshed successfully",
      data: analysis,
    });
  } catch (error) {
    console.error("Error refreshing spinoff analysis:", error);
    handleApiError(res, error, "Unable to refresh spinoff analysis. Please try again later.");
  }
});

export default router;
