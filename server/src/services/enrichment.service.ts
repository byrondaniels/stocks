/**
 * Stock Data Enrichment Service
 * Provides shared logic for enriching stock data with price, DMA stats, and insider activity
 */

import { getCurrentPrice } from "./stockData.js";
import { calculate50DMA } from "./priceHistory.js";
import { getInsiderTransactions } from "./sec/insider-service.js";
import { calculateProfitLoss } from "../utils/calculations.js";
import type { Summary } from "./sec/types.js";

/**
 * Base stock data with required ticker field
 * Additional fields from database can be present (notes, addedDate, etc.)
 */
export interface BaseStockData {
  /** Stock ticker symbol (e.g., 'AAPL', 'BRK.B') */
  ticker: string;
  /** Optional notes about the stock */
  notes?: string;
  /** Date when stock was added to portfolio/watchlist */
  addedDate?: Date;
  /** Any other database fields */
  [key: string]: unknown;
}

/**
 * Portfolio-specific stock data including purchase details
 */
export interface PortfolioStockData extends BaseStockData {
  /** Original purchase price in USD */
  purchasePrice: number;
  /** Number of shares owned */
  shares: number;
  /** Date of purchase */
  purchaseDate?: Date;
}

/**
 * Stock data enriched with real-time pricing and technical analysis
 */
export interface EnrichedStockData extends BaseStockData {
  /** Current market price in USD */
  currentPrice?: number;
  /** 50-day moving average (null if insufficient data) */
  movingAverage50?: number | null;
  /** Percentage difference from 50DMA (positive = above MA) */
  percentageDifference?: number | null;
  /** Number of price points used in calculations */
  priceCount?: number;
  /** Latest date in historical price data (ISO 8601 format) */
  latestDate?: string | null;
  /** Summary of insider buy/sell activity from SEC filings */
  insiderActivity?: Summary | null;
}

/**
 * Portfolio stock enriched with profit/loss calculations
 */
export interface EnrichedPortfolioData extends EnrichedStockData {
  /** Dollar amount profit or loss */
  profitLoss?: number;
  /** Percentage profit or loss */
  profitLossPercent?: number;
}

/**
 * Enriches a single stock with current price, 50DMA stats, and insider activity
 *
 * Fetches data from three sources in parallel:
 * 1. Market API (Alpha Vantage or FMP) for current price
 * 2. Database for 50-day moving average calculation
 * 3. SEC EDGAR for insider transaction summary
 *
 * @param stock - The base stock data containing at least a ticker
 * @returns Enriched stock data with price information
 *
 * @throws {Error} If ticker is invalid
 *
 * @example
 * const watchlistItem = { ticker: 'AAPL', notes: 'Watch for entry' };
 * const enriched = await enrichStockData(watchlistItem);
 * console.log(enriched.currentPrice);     // e.g., 185.92
 * console.log(enriched.movingAverage50);  // e.g., 180.45
 */
export async function enrichStockData(stock: BaseStockData): Promise<EnrichedStockData> {
  try {
    // Get current price
    const priceData = await getCurrentPrice(stock.ticker);
    const currentPrice = priceData.price;

    // Get 50DMA stats and insider activity in parallel
    const [dmaStats, insiderData] = await Promise.all([
      calculate50DMA(stock.ticker),
      getInsiderTransactions(stock.ticker).catch(() => null), // Don't fail if insider data unavailable
    ]);

    return {
      ...stock,
      currentPrice,
      movingAverage50: dmaStats.movingAverage50,
      percentageDifference: dmaStats.percentageDifference,
      priceCount: dmaStats.priceCount,
      latestDate: dmaStats.latestDate,
      insiderActivity: insiderData?.summary || null,
    };
  } catch (error) {
    // If we can't get current price, fall back to DMA data
    const [dmaStats, insiderData] = await Promise.all([
      calculate50DMA(stock.ticker),
      getInsiderTransactions(stock.ticker).catch(() => null),
    ]);

    return {
      ...stock,
      currentPrice: dmaStats.currentPrice,
      movingAverage50: dmaStats.movingAverage50,
      percentageDifference: dmaStats.percentageDifference,
      priceCount: dmaStats.priceCount,
      latestDate: dmaStats.latestDate,
      insiderActivity: insiderData?.summary || null,
    };
  }
}

/**
 * Enriches a portfolio stock with price data and profit/loss calculations
 *
 * Includes all enrichment from enrichStockData() plus:
 * - Profit/loss calculation in dollars
 * - Profit/loss percentage
 *
 * @param stock - Portfolio stock data with purchase price and shares
 * @returns Enriched portfolio data including profit/loss
 *
 * @throws {Error} If ticker is invalid or required fields are missing
 *
 * @example
 * const portfolioItem = {
 *   ticker: 'AAPL',
 *   purchasePrice: 150.00,
 *   shares: 100,
 *   purchaseDate: new Date('2024-01-01')
 * };
 * const enriched = await enrichPortfolioStock(portfolioItem);
 * console.log(enriched.profitLoss);        // e.g., 3592.00
 * console.log(enriched.profitLossPercent); // e.g., 23.95
 */
export async function enrichPortfolioStock(stock: PortfolioStockData): Promise<EnrichedPortfolioData> {
  try {
    // Get current price for profit/loss calculation
    const priceData = await getCurrentPrice(stock.ticker);
    const currentPrice = priceData.price;

    // Calculate profit/loss
    const { profitLoss, profitLossPercent } = calculateProfitLoss(
      currentPrice,
      stock.purchasePrice,
      stock.shares
    );

    // Get 50DMA stats and insider activity in parallel
    const [dmaStats, insiderData] = await Promise.all([
      calculate50DMA(stock.ticker),
      getInsiderTransactions(stock.ticker).catch(() => null),
    ]);

    return {
      ...stock,
      currentPrice,
      profitLoss,
      profitLossPercent,
      movingAverage50: dmaStats.movingAverage50,
      percentageDifference: dmaStats.percentageDifference,
      priceCount: dmaStats.priceCount,
      latestDate: dmaStats.latestDate,
      insiderActivity: insiderData?.summary || null,
    };
  } catch (error) {
    // If we can't get current price, fall back to DMA data
    const [dmaStats, insiderData] = await Promise.all([
      calculate50DMA(stock.ticker),
      getInsiderTransactions(stock.ticker).catch(() => null),
    ]);

    return {
      ...stock,
      currentPrice: dmaStats.currentPrice,
      movingAverage50: dmaStats.movingAverage50,
      percentageDifference: dmaStats.percentageDifference,
      priceCount: dmaStats.priceCount,
      latestDate: dmaStats.latestDate,
      insiderActivity: insiderData?.summary || null,
    };
  }
}

/**
 * Enriches an array of stocks with price and DMA data
 *
 * Processes all stocks in parallel for performance.
 * Each stock is enriched independently - if one fails, others continue.
 *
 * @param stocks - Array of stock data (watchlist items)
 * @returns Promise resolving to array of enriched stocks
 *
 * @example
 * const watchlistItems = await Watchlist.find().lean();
 * const enriched = await enrichStockArray(watchlistItems);
 */
export async function enrichStockArray(stocks: BaseStockData[]): Promise<EnrichedStockData[]> {
  return Promise.all(stocks.map(enrichStockData));
}

/**
 * Enriches an array of portfolio stocks with price, profit/loss, and DMA data
 *
 * Processes all stocks in parallel for performance.
 * Each stock is enriched independently - if one fails, others continue.
 *
 * @param stocks - Array of portfolio stock data
 * @returns Promise resolving to array of enriched portfolio stocks
 *
 * @example
 * const portfolioItems = await Portfolio.find().lean();
 * const enriched = await enrichPortfolioArray(portfolioItems);
 */
export async function enrichPortfolioArray(stocks: PortfolioStockData[]): Promise<EnrichedPortfolioData[]> {
  return Promise.all(stocks.map(enrichPortfolioStock));
}
