/**
 * Insider Trading Routes
 * Endpoints for SEC insider transaction data
 */

import { Request, Response as ExpressResponse, Router } from "express";
import { getInsiderTransactions } from "../services/sec/index.js";

const router = Router();

const TICKER_REGEX = /^[A-Z]{1,5}(\.[A-Z0-9]{1,4})?$/;

/**
 * GET /api/insiders?ticker=AAPL
 * Fetch insider transactions for a given ticker from SEC data
 */
router.get("/", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error:
        "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    const result = await getInsiderTransactions(ticker);
    if (!result) {
      res.status(404).json({ error: `Ticker ${ticker} not found in SEC data.` });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(502).json({
      error: "Unable to retrieve insider transactions from the SEC.",
    });
  }
});

export default router;
