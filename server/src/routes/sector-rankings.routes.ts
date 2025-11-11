/**
 * Sector Group Rankings Routes
 * Endpoints for calculating and retrieving sector/industry group rankings
 */

import { Request, Response as ExpressResponse, Router } from "express";
import {
  getOrCalculateSectorGroupRankings,
  calculateSectorGroupRankings,
  getSectorGroupRanking,
} from "../services/sectorGroupRankings.js";
import { handleApiError } from "../utils/errorHandler.js";

const router = Router();

/**
 * GET /api/sector-rankings
 * Get all sector group rankings (cached or calculate)
 */
router.get("/", async (_req: Request, res: ExpressResponse) => {
  try {
    const rankings = await getOrCalculateSectorGroupRankings(24); // 24-hour cache
    res.json(rankings);
  } catch (error) {
    console.error("Error fetching sector rankings:", error);
    handleApiError(res, error, "Unable to fetch sector rankings. Please try again later.");
  }
});

/**
 * POST /api/sector-rankings/refresh
 * Force recalculation of sector group rankings
 */
router.post("/refresh", async (_req: Request, res: ExpressResponse) => {
  try {
    console.log("[API] Forcing sector rankings refresh");
    const rankings = await calculateSectorGroupRankings();
    res.json({
      success: true,
      message: "Sector rankings refreshed successfully",
      data: rankings,
    });
  } catch (error) {
    console.error("Error refreshing sector rankings:", error);
    handleApiError(res, error, "Unable to refresh sector rankings. Please try again later.");
  }
});

/**
 * GET /api/sector-rankings/:etf
 * Get ranking for a specific ETF
 */
router.get("/:etf", async (req: Request, res: ExpressResponse) => {
  const etf = req.params.etf?.toUpperCase();

  if (!etf) {
    res.status(400).json({ error: "ETF ticker is required" });
    return;
  }

  try {
    const ranking = await getSectorGroupRanking(etf);

    if (!ranking) {
      res.status(404).json({ error: `No ranking found for ETF: ${etf}` });
      return;
    }

    res.json(ranking);
  } catch (error) {
    console.error(`Error fetching ranking for ${etf}:`, error);
    handleApiError(res, error, "Unable to fetch ETF ranking. Please try again later.");
  }
});

export default router;
