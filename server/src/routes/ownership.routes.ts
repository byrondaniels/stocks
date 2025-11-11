/**
 * Detailed Ownership Routes
 * Endpoints for retrieving stock ownership from free SEC sources
 */

import { Request, Response as ExpressResponse, Router } from "express";
import { getDetailedOwnership } from "../services/ownership/index.js";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants.js";
import { normalizeTicker, isValidTicker } from "../../../shared/validation.js";
import { handleApiError, sendBadRequest } from "../utils/errorHandler.js";

const router = Router();

/**
 * GET /api/ownership/detailed?ticker=AAPL
 * Get detailed stock ownership from free SEC sources
 *
 * This endpoint aggregates ownership data from:
 * - Form 3, 4, 5: Insider transactions
 * - Schedule 13D/13G: Beneficial owners with >5% ownership
 * - Form 13F: Institutional holdings (future enhancement)
 *
 * Returns:
 * - Ownership breakdown (insider, institutional, beneficial, public percentages)
 * - List of insiders with their holdings
 * - List of beneficial owners (>5%)
 * - Top holders across all categories
 * - Float shares calculation
 *
 * Note: All data is sourced from SEC EDGAR filings (free)
 */
router.get("/detailed", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    const ownership = await getDetailedOwnership(ticker);

    if (!ownership) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: "Ownership data not found for ticker. Company may not have recent SEC filings.",
        ticker,
      });
      return;
    }

    res.json(ownership);
  } catch (error) {
    console.error(`Error fetching detailed ownership for ${ticker}:`, error);
    handleApiError(res, error, ERROR_MESSAGES.OWNERSHIP_DATA_ERROR);
  }
});

/**
 * GET /api/ownership/summary?ticker=AAPL
 * Get simplified ownership summary
 *
 * Returns just the ownership breakdown percentages without detailed holder lists
 */
router.get("/summary", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    const ownership = await getDetailedOwnership(ticker);

    if (!ownership) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: "Ownership data not found for ticker",
        ticker,
      });
      return;
    }

    // Return only the summary data
    res.json({
      ticker: ownership.ticker,
      companyName: ownership.companyName,
      sharesOutstanding: ownership.sharesOutstanding,
      breakdown: ownership.breakdown,
      topHolders: ownership.topHolders.slice(0, 10), // Top 10 only
      lastUpdated: ownership.lastUpdated,
      dataQuality: ownership.dataQuality,
      source: ownership.source,
    });
  } catch (error) {
    console.error(`Error fetching ownership summary for ${ticker}:`, error);
    handleApiError(res, error, ERROR_MESSAGES.OWNERSHIP_DATA_ERROR);
  }
});

export default router;
