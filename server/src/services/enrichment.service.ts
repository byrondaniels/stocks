/**
 * Stock Data Enrichment Service
 * Provides shared logic for enriching stock data with price, DMA stats, and insider activity
 */

import { getCurrentPrice } from "./stockData.js";
import { calculate50DMA } from "./priceHistory.js";
import { getInsiderTransactions } from "./sec/insider-service.js";
import { calculateProfitLoss } from "../utils/calculations.js";

export interface BaseStockData {
  ticker: string;
  [key: string]: any;
}

export interface PortfolioStockData extends BaseStockData {
  purchasePrice: number;
  shares: number;
}

export interface EnrichedStockData extends BaseStockData {
  currentPrice?: number;
  movingAverage50?: number | null;
  percentageDifference?: number | null;
  priceCount?: number;
  latestDate?: string | null;
  insiderActivity?: any;
}

export interface EnrichedPortfolioData extends EnrichedStockData {
  profitLoss?: number;
  profitLossPercent?: number;
}

/**
 * Enriches a single stock with current price, 50DMA stats, and insider activity
 * @param stock - The base stock data containing at least a ticker
 * @returns Enriched stock data with price information
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
 * @param stock - Portfolio stock data with purchase price and shares
 * @returns Enriched portfolio data including profit/loss
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
 * @param stocks - Array of stock data
 * @returns Promise resolving to array of enriched stocks
 */
export async function enrichStockArray(stocks: BaseStockData[]): Promise<EnrichedStockData[]> {
  return Promise.all(stocks.map(enrichStockData));
}

/**
 * Enriches an array of portfolio stocks with price, profit/loss, and DMA data
 * @param stocks - Array of portfolio stock data
 * @returns Promise resolving to array of enriched portfolio stocks
 */
export async function enrichPortfolioArray(stocks: PortfolioStockData[]): Promise<EnrichedPortfolioData[]> {
  return Promise.all(stocks.map(enrichPortfolioStock));
}
