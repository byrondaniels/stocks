/**
 * Stock Data Routes
 * Endpoints for stock prices, ownership, financials, and historical data
 */

import { Request, Response as ExpressResponse, Router } from "express";
import {
  getCurrentPrice,
  getOwnershipData,
  getFinancialMetrics,
  getHistoricalPrices,
  getRateLimitStatus,
  clearAllCaches,
  type ApiError,
} from "../services/stockData.js";
import {
  HTTP_STATUS,
  ERROR_MESSAGES,
  HISTORICAL_DAYS_DEFAULT,
  HISTORICAL_DAYS_MIN,
  HISTORICAL_DAYS_MAX,
} from "../constants.js";
import { normalizeTicker, isValidTicker } from "../../../shared/validation.js";
import { handleApiError, sendBadRequest } from "../utils/errorHandler.js";
import { getCompanyName } from "../services/sec/ticker-map.js";

const router = Router();

/**
 * GET /api/stock/price?ticker=AAPL
 * Get current stock price
 */
router.get("/price", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    const price = await getCurrentPrice(ticker);
    res.json(price);
  } catch (error) {
    console.error(error);
    handleApiError(res, error, ERROR_MESSAGES.STOCK_DATA_ERROR);
  }
});

/**
 * GET /api/stock/ownership?ticker=AAPL
 * Get institutional ownership data
 */
router.get("/ownership", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    const ownership = await getOwnershipData(ticker);
    res.json(ownership);
  } catch (error) {
    console.error(error);
    handleApiError(res, error, ERROR_MESSAGES.OWNERSHIP_DATA_ERROR);
  }
});

/**
 * GET /api/stock/financials?ticker=AAPL
 * Get financial metrics for a stock
 */
router.get("/financials", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    const financials = await getFinancialMetrics(ticker);
    res.json(financials);
  } catch (error) {
    console.error(error);
    handleApiError(res, error, "Unable to retrieve financial metrics from external APIs.");
  }
});

/**
 * GET /api/stock/historical?ticker=AAPL&days=50
 * Get historical price data
 */
router.get("/historical", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);
  const rawDays = (req.query.days as string | undefined) ?? String(HISTORICAL_DAYS_DEFAULT);
  const days = parseInt(rawDays, 10);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  if (isNaN(days) || days < HISTORICAL_DAYS_MIN || days > HISTORICAL_DAYS_MAX) {
    sendBadRequest(res, `Invalid days parameter. Must be between ${HISTORICAL_DAYS_MIN} and ${HISTORICAL_DAYS_MAX}.`);
    return;
  }

  try {
    const historical = await getHistoricalPrices(ticker, days);
    res.json(historical);
  } catch (error) {
    console.error(error);
    handleApiError(res, error, ERROR_MESSAGES.HISTORICAL_DATA_ERROR);
  }
});

/**
 * GET /api/stock/rate-limits
 * Get rate limit status for all APIs
 */
router.get("/rate-limits", (_req: Request, res: ExpressResponse) => {
  const status = getRateLimitStatus();
  res.json(status);
});

/**
 * POST /api/stock/clear-cache
 * Clear all caches
 */
router.post("/clear-cache", (_req: Request, res: ExpressResponse) => {
  clearAllCaches();
  res.json({ success: true, message: "All caches cleared" });
});

/**
 * GET /api/stock/company-name?ticker=AAPL
 * Get company name for a ticker symbol
 */
router.get("/company-name", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    const companyName = await getCompanyName(ticker);
    if (!companyName) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: "Company name not found for ticker"
      });
      return;
    }
    res.json({ ticker, companyName });
  } catch (error) {
    console.error(error);
    handleApiError(res, error, "Unable to retrieve company name.");
  }
});

export default router;
