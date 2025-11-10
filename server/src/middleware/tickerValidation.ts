/**
 * Ticker Validation Middleware
 * Provides reusable middleware for validating and normalizing ticker symbols
 */

import { Request, Response as ExpressResponse, NextFunction } from "express";
import { normalizeTicker, isValidTicker } from "../../../shared/validation.js";
import { ERROR_MESSAGES } from "../constants.js";
import { sendBadRequest } from "../utils/errorHandler.js";

// Extend Express Request type to include normalizedTicker
declare global {
  namespace Express {
    interface Request {
      normalizedTicker?: string;
    }
  }
}

/**
 * Middleware to validate and normalize ticker from query parameter
 * Attaches the normalized ticker to req.normalizedTicker
 *
 * @example
 * router.get("/price", validateTickerQuery, async (req, res) => {
 *   const price = await getCurrentPrice(req.normalizedTicker);
 *   res.json(price);
 * });
 */
export function validateTickerQuery(
  req: Request,
  res: ExpressResponse,
  next: NextFunction
): void {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  req.normalizedTicker = ticker;
  next();
}

/**
 * Middleware to validate and normalize ticker from path parameter
 * Attaches the normalized ticker to req.normalizedTicker
 *
 * @example
 * router.get("/:ticker", validateTickerParam, async (req, res) => {
 *   const stock = await getStock(req.normalizedTicker);
 *   res.json(stock);
 * });
 */
export function validateTickerParam(
  req: Request,
  res: ExpressResponse,
  next: NextFunction
): void {
  const rawTicker = req.params.ticker ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  req.normalizedTicker = ticker;
  next();
}

/**
 * Middleware to validate and normalize ticker from request body
 * Attaches the normalized ticker to req.normalizedTicker
 *
 * @example
 * router.post("/", validateTickerBody, async (req, res) => {
 *   const result = await createStock(req.normalizedTicker, req.body);
 *   res.json(result);
 * });
 */
export function validateTickerBody(
  req: Request,
  res: ExpressResponse,
  next: NextFunction
): void {
  const rawTicker = req.body.ticker ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  req.normalizedTicker = ticker;
  next();
}
