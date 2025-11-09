/**
 * Insider Trading Routes
 * Endpoints for SEC insider transaction data
 */

import { Request, Response as ExpressResponse, Router } from "express";
import { getInsiderTransactions } from "../services/sec/index.js";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants.js";
import { normalizeTicker, isValidTicker } from "../utils/validation.js";
import { sendBadRequest, sendNotFound } from "../utils/errorHandler.js";

const router = Router();

/**
 * GET /api/insiders?ticker=AAPL
 * Fetch insider transactions for a given ticker from SEC data
 */
router.get("/", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);

  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }

  try {
    const result = await getInsiderTransactions(ticker);
    if (!result) {
      sendNotFound(res, `Ticker ${ticker} not found in SEC data.`);
      return;
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(HTTP_STATUS.BAD_GATEWAY).json({
      error: ERROR_MESSAGES.INSIDER_DATA_ERROR,
    });
  }
});

export default router;
