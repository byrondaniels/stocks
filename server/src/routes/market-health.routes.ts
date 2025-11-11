/**
 * Market Health Routes
 * Endpoints for overall market health indicators (VIX, breadth, fear/greed)
 */

import { Request, Response as ExpressResponse, Router } from "express";
import { getMarketHealthData } from "../services/marketHealth.js";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants.js";
import { handleApiError } from "../utils/errorHandler.js";

const router = Router();

/**
 * GET /api/market-health
 * Get overall market health indicators
 */
router.get("/", async (req: Request, res: ExpressResponse) => {
  try {
    const healthData = await getMarketHealthData();
    res.json({ success: true, data: healthData });
  } catch (error) {
    console.error("Market health error:", error);
    handleApiError(res, error, ERROR_MESSAGES.STOCK_DATA_ERROR);
  }
});

export default router;
