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

const router = Router();

const TICKER_REGEX = /^[A-Z]{1,5}(\.[A-Z0-9]{1,4})?$/;

/**
 * GET /api/stock/price?ticker=AAPL
 * Get current stock price
 */
router.get("/price", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    const price = await getCurrentPrice(ticker);
    res.json(price);
  } catch (error) {
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
    console.error(error);
    res.status(502).json({
      error: "Unable to retrieve stock price from external APIs.",
    });
  }
});

/**
 * GET /api/stock/ownership?ticker=AAPL
 * Get institutional ownership data
 */
router.get("/ownership", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    const ownership = await getOwnershipData(ticker);
    res.json(ownership);
  } catch (error) {
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
    console.error(error);
    res.status(502).json({
      error: "Unable to retrieve ownership data from external APIs.",
    });
  }
});

/**
 * GET /api/stock/financials?ticker=AAPL
 * Get financial metrics for a stock
 */
router.get("/financials", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    const financials = await getFinancialMetrics(ticker);
    res.json(financials);
  } catch (error) {
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
    console.error(error);
    res.status(502).json({
      error: "Unable to retrieve financial metrics from external APIs.",
    });
  }
});

/**
 * GET /api/stock/historical?ticker=AAPL&days=50
 * Get historical price data
 */
router.get("/historical", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();
  const rawDays = (req.query.days as string | undefined) ?? "50";
  const days = parseInt(rawDays, 10);

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  if (isNaN(days) || days < 1 || days > 365) {
    res.status(400).json({
      error: "Invalid days parameter. Must be between 1 and 365.",
    });
    return;
  }

  try {
    const historical = await getHistoricalPrices(ticker, days);
    res.json(historical);
  } catch (error) {
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
    console.error(error);
    res.status(502).json({
      error: "Unable to retrieve historical prices from external APIs.",
    });
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

export default router;
