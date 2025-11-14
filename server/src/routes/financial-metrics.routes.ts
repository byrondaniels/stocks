/**
 * Financial Metrics API Routes
 * Endpoints for retrieving computed financial ratios
 */

import { Router, Request, Response } from "express";
import { getFinancialMetrics } from "../services/sec/financial-metrics-service.js";
import { validateTickerParam } from "../middleware/tickerValidation.js";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants.js";

const router = Router();

/**
 * GET /api/financial-metrics/:ticker
 * Get financial metrics for a ticker
 *
 * Query parameters:
 * - refresh: boolean (optional) - Force refresh from SEC API
 *
 * Response:
 * {
 *   ticker: string,
 *   cik: string,
 *   entityName: string,
 *   metrics: {
 *     roe: { "2023": 0.15, "2024": 0.18 },
 *     roa: { "2023": 0.08, "2024": 0.09 },
 *     profitMargin: { "2023": 0.12, "2024": 0.14 },
 *     currentRatio: { "2023": 1.5, "2024": 1.8 },
 *     debtToEquity: { "2023": 0.6, "2024": 0.5 },
 *     revenueGrowth: { "2024": 0.10 },
 *     epsGrowth: { "2024": 0.15 },
 *     freeCashFlow: { "2023": 5000000, "2024": 6000000 }
 *   },
 *   calculatedAt: "2025-11-13T20:00:00.000Z",
 *   rawDataFetchedAt: "2025-11-13T19:00:00.000Z"
 * }
 */
router.get(
  "/:ticker",
  validateTickerParam,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ticker } = req.params;
      const forceRefresh = req.query.refresh === "true";

      const metrics = await getFinancialMetrics(ticker, forceRefresh);

      res.status(HTTP_STATUS.OK).json(metrics);
    } catch (error: any) {
      console.error("[Financial Metrics API] Error:", error);

      if (error.message?.includes("not found")) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          error: ERROR_MESSAGES.INVALID_TICKER,
          details: error.message,
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: "Unable to fetch financial metrics",
        details: error.message,
      });
    }
  }
);

export default router;
