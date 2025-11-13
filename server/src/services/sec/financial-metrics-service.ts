/**
 * Financial Metrics Service
 * Orchestrates fetching, calculating, and storing financial metrics
 */

import { loadTickerInfoMap } from "./ticker-map.js";
import { fetchCompanyFacts } from "./edgar-api.js";
import { calculateFinancialMetrics, FinancialMetrics } from "./financial-calculator.js";
import { SECCompanyFacts, FinancialRatios } from "../../db/models/index.js";

export interface FinancialMetricsResult {
  ticker: string;
  cik: string;
  entityName: string;
  metrics: {
    roe: Record<string, number>;
    roa: Record<string, number>;
    profitMargin: Record<string, number>;
    currentRatio: Record<string, number>;
    debtToEquity: Record<string, number>;
    revenueGrowth: Record<string, number>;
    epsGrowth: Record<string, number>;
    freeCashFlow: Record<string, number>;
  };
  calculatedAt: Date;
  rawDataFetchedAt: Date;
}

/**
 * Convert Map to plain object for storage
 */
function mapToObject(map: Map<string, number>): Record<string, number> {
  const obj: Record<string, number> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

/**
 * Convert FinancialMetrics (with Maps) to plain objects
 */
function metricsToPlainObject(metrics: FinancialMetrics) {
  return {
    roe: mapToObject(metrics.roe),
    roa: mapToObject(metrics.roa),
    profitMargin: mapToObject(metrics.profitMargin),
    currentRatio: mapToObject(metrics.currentRatio),
    debtToEquity: mapToObject(metrics.debtToEquity),
    revenueGrowth: mapToObject(metrics.revenueGrowth),
    epsGrowth: mapToObject(metrics.epsGrowth),
    freeCashFlow: mapToObject(metrics.freeCashFlow),
  };
}

/**
 * Get or fetch financial metrics for a ticker
 * Uses cached data if available and fresh, otherwise fetches and computes
 */
export async function getFinancialMetrics(
  ticker: string,
  forceRefresh: boolean = false
): Promise<FinancialMetricsResult> {
  const upperTicker = ticker.toUpperCase();

  console.log(`[Financial Metrics] Request for ${upperTicker}, forceRefresh: ${forceRefresh}`);

  // Check if we have recent cached metrics
  if (!forceRefresh) {
    const cachedMetrics = await FinancialRatios.findOne({ ticker: upperTicker });
    if (cachedMetrics) {
      console.log(`[Financial Metrics] Using cached metrics for ${upperTicker}`);

      return {
        ticker: cachedMetrics.ticker,
        cik: cachedMetrics.cik,
        entityName: cachedMetrics.entityName,
        metrics: {
          roe: mapToObject(cachedMetrics.metrics.roe || new Map()),
          roa: mapToObject(cachedMetrics.metrics.roa || new Map()),
          profitMargin: mapToObject(cachedMetrics.metrics.profitMargin || new Map()),
          currentRatio: mapToObject(cachedMetrics.metrics.currentRatio || new Map()),
          debtToEquity: mapToObject(cachedMetrics.metrics.debtToEquity || new Map()),
          revenueGrowth: mapToObject(cachedMetrics.metrics.revenueGrowth || new Map()),
          epsGrowth: mapToObject(cachedMetrics.metrics.epsGrowth || new Map()),
          freeCashFlow: mapToObject(cachedMetrics.metrics.freeCashFlow || new Map()),
        },
        calculatedAt: cachedMetrics.calculatedAt,
        rawDataFetchedAt: cachedMetrics.calculatedAt, // Same for now
      };
    }
  }

  // Get CIK for ticker
  console.log(`[Financial Metrics] Looking up CIK for ${upperTicker}...`);
  const tickerMap = await loadTickerInfoMap();
  const tickerInfo = tickerMap.get(upperTicker);

  if (!tickerInfo) {
    throw new Error(`Ticker ${upperTicker} not found in SEC database`);
  }

  const { cik, companyName } = tickerInfo;
  console.log(`[Financial Metrics] Found CIK ${cik} for ${companyName}`);

  // Check if we have recent raw facts data
  let companyFacts;
  const cachedFacts = await SECCompanyFacts.findOne({ ticker: upperTicker });

  if (cachedFacts && !forceRefresh) {
    console.log(`[Financial Metrics] Using cached raw facts for ${upperTicker}`);
    companyFacts = {
      cik: cachedFacts.cik,
      entityName: cachedFacts.entityName,
      facts: cachedFacts.facts,
    };
  } else {
    // Fetch from SEC API
    console.log(`[Financial Metrics] Fetching fresh data from SEC for ${cik}...`);
    companyFacts = await fetchCompanyFacts(cik);

    // Store raw facts with 24hr expiration (TTL index handles deletion)
    await SECCompanyFacts.updateOne(
      { ticker: upperTicker },
      {
        $set: {
          ticker: upperTicker,
          cik,
          entityName: companyFacts.entityName,
          facts: companyFacts.facts,
          fetchedAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log(`[Financial Metrics] Stored raw facts for ${upperTicker}`);
  }

  // Calculate financial metrics
  console.log(`[Financial Metrics] Calculating financial metrics...`);
  const metrics = calculateFinancialMetrics(companyFacts);

  // Store calculated metrics
  const metricsPlain = metricsToPlainObject(metrics);
  const calculatedAt = new Date();

  await FinancialRatios.updateOne(
    { ticker: upperTicker },
    {
      $set: {
        ticker: upperTicker,
        cik,
        entityName: companyFacts.entityName,
        metrics: metricsPlain,
        calculatedAt,
      },
    },
    { upsert: true }
  );

  console.log(`[Financial Metrics] Stored calculated metrics for ${upperTicker}`);

  return {
    ticker: upperTicker,
    cik,
    entityName: companyFacts.entityName,
    metrics: metricsPlain,
    calculatedAt,
    rawDataFetchedAt: cachedFacts?.fetchedAt || new Date(),
  };
}
