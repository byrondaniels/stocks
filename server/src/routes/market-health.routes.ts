/**
 * Market Health Routes
 * Endpoints for overall market health indicators (VIX, breadth, fear/greed)
 */

import { Request, Response as ExpressResponse, Router } from "express";
import { getMarketHealthData } from "../services/marketHealth.js";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants.js";
import { handleApiError } from "../utils/errorHandler.js";
import { getCurrentPrice } from "../services/stockData.js";
import { fetchAndStoreHistoricalPrices, calculateMovingAverage } from "../services/priceHistory.js";
import { checkHindenburgOmenWithMarketData } from "../services/hindenburgOmen.js";

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

/**
 * GET /api/market-health/extension-meter
 * Get percentage above 50DMA for key market symbols
 */
router.get("/extension-meter", async (req: Request, res: ExpressResponse) => {
  try {
    // Symbols to track: SPY, QQQ (NASDAQ), NVDA, GLD (GOLD)
    const symbols = ['SPY', 'QQQ', 'NVDA', 'GLD'];
    const extensionData = [];

    for (const symbol of symbols) {
      try {
        // Ensure we have historical data
        await fetchAndStoreHistoricalPrices(symbol, 60);

        // Get current price
        const priceData = await getCurrentPrice(symbol);
        const currentPrice = priceData.price;

        // Calculate 50DMA
        const ma50 = await calculateMovingAverage(symbol, 50);

        if (currentPrice && ma50) {
          // Calculate percentage above/below 50DMA
          const percentageExtension = ((currentPrice - ma50) / ma50) * 100;

          extensionData.push({
            symbol,
            displayName: symbol === 'QQQ' ? 'NASDAQ' : symbol === 'GLD' ? 'GOLD' : symbol,
            currentPrice,
            ma50,
            percentageExtension,
            lastUpdated: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Error fetching extension data for ${symbol}:`, error);
        // Continue with other symbols even if one fails
        extensionData.push({
          symbol,
          displayName: symbol === 'QQQ' ? 'NASDAQ' : symbol === 'GLD' ? 'GOLD' : symbol,
          error: 'Failed to fetch data'
        });
      }
    }

    res.json({ success: true, data: extensionData });
  } catch (error) {
    console.error("Extension meter error:", error);
    handleApiError(res, error, ERROR_MESSAGES.STOCK_DATA_ERROR);
  }
});

/**
 * GET /api/market-health/hindenburg-omen
 * Check for Hindenburg Omen signal
 *
 * Query parameters:
 * - newHighs: Number of new 52-week highs (optional)
 * - newLows: Number of new 52-week lows (optional)
 * - issuesTraded: Total number of issues traded (default: 3000)
 * - date: Date to check (ISO format, optional, defaults to today)
 */
router.get("/hindenburg-omen", async (req: Request, res: ExpressResponse) => {
  try {
    // Ensure we have historical data for SPY
    await fetchAndStoreHistoricalPrices('SPY', 60);

    // Get query parameters
    const newHighsParam = req.query.newHighs as string | undefined;
    const newLowsParam = req.query.newLows as string | undefined;
    const issuesTradedParam = req.query.issuesTraded as string | undefined;
    const dateParam = req.query.date as string | undefined;

    // If no highs/lows provided, fetch current market health data
    let newHighs: number;
    let newLows: number;

    if (!newHighsParam || !newLowsParam) {
      const healthData = await getMarketHealthData();
      newHighs = healthData.breadth.newHighs;
      newLows = healthData.breadth.newLows;
    } else {
      newHighs = parseInt(newHighsParam);
      newLows = parseInt(newLowsParam);
    }

    const issuesTraded = issuesTradedParam ? parseInt(issuesTradedParam) : 3000;
    const date = dateParam ? new Date(dateParam) : undefined;

    // Check Hindenburg Omen
    const omenResult = await checkHindenburgOmenWithMarketData(
      newHighs,
      newLows,
      issuesTraded,
      date
    );

    res.json({ success: true, data: omenResult });
  } catch (error) {
    console.error("Hindenburg Omen error:", error);
    handleApiError(res, error, ERROR_MESSAGES.STOCK_DATA_ERROR);
  }
});

export default router;
