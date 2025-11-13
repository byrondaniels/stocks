/**
 * Financial Ratios Calculator
 * Computes financial ratios from SEC EDGAR company facts
 */

import { CompanyFactsResponse } from "./edgar-api.js";

export interface FinancialMetrics {
  roe: Map<string, number>; // Return on Equity
  roa: Map<string, number>; // Return on Assets
  profitMargin: Map<string, number>; // Profit Margin
  currentRatio: Map<string, number>; // Current Ratio
  debtToEquity: Map<string, number>; // Debt-to-Equity Ratio
  revenueGrowth: Map<string, number>; // Revenue Growth Rate
  epsGrowth: Map<string, number>; // EPS Growth
  freeCashFlow: Map<string, number>; // Free Cash Flow
}

/**
 * Extract the most recent value for a specific fiscal year from units array
 */
function getValueForYear(
  units: Array<{ end: string; val: number; fy: number }>,
  year: number
): number | null {
  const matches = units.filter((u) => u.fy === year);
  if (matches.length === 0) return null;

  // Return the most recent filing for that year
  return matches[matches.length - 1].val;
}

/**
 * Get a concept value from the facts object
 */
function getConceptValue(
  facts: any,
  taxonomy: string,
  tag: string,
  year: number,
  unit: string = "USD"
): number | null {
  try {
    const concept = facts[taxonomy]?.[tag];
    if (!concept) return null;

    const unitData = concept.units?.[unit];
    if (!unitData || !Array.isArray(unitData)) return null;

    return getValueForYear(unitData, year);
  } catch (error) {
    return null;
  }
}

/**
 * Get all available fiscal years from the facts
 */
function getAvailableFiscalYears(facts: any): number[] {
  const years = new Set<number>();

  // Iterate through all taxonomies and concepts to find years
  Object.values(facts).forEach((taxonomy: any) => {
    Object.values(taxonomy).forEach((concept: any) => {
      if (concept.units) {
        Object.values(concept.units).forEach((unitData: any) => {
          if (Array.isArray(unitData)) {
            unitData.forEach((dataPoint: any) => {
              if (dataPoint.fy) {
                years.add(dataPoint.fy);
              }
            });
          }
        });
      }
    });
  });

  return Array.from(years).sort((a, b) => b - a); // Most recent first
}

/**
 * Calculate financial metrics from company facts
 */
export function calculateFinancialMetrics(
  companyFacts: CompanyFactsResponse
): FinancialMetrics {
  const metrics: FinancialMetrics = {
    roe: new Map(),
    roa: new Map(),
    profitMargin: new Map(),
    currentRatio: new Map(),
    debtToEquity: new Map(),
    revenueGrowth: new Map(),
    epsGrowth: new Map(),
    freeCashFlow: new Map(),
  };

  const { facts } = companyFacts;
  const years = getAvailableFiscalYears(facts);

  console.log(`[Financial Calculator] Processing ${years.length} fiscal years...`);

  for (const year of years) {
    // Get required values for calculations
    const netIncome = getConceptValue(facts, "us-gaap", "NetIncomeLoss", year);
    const totalAssets = getConceptValue(facts, "us-gaap", "Assets", year);
    const stockholdersEquity = getConceptValue(
      facts,
      "us-gaap",
      "StockholdersEquity",
      year
    );
    const revenues = getConceptValue(facts, "us-gaap", "Revenues", year);
    const currentAssets = getConceptValue(facts, "us-gaap", "AssetsCurrent", year);
    const currentLiabilities = getConceptValue(
      facts,
      "us-gaap",
      "LiabilitiesCurrent",
      year
    );
    const totalLiabilities = getConceptValue(facts, "us-gaap", "Liabilities", year);
    const operatingCashFlow = getConceptValue(
      facts,
      "us-gaap",
      "NetCashProvidedByUsedInOperatingActivities",
      year
    );
    const capex = getConceptValue(
      facts,
      "us-gaap",
      "PaymentsToAcquirePropertyPlantAndEquipment",
      year
    );
    const epsBasic = getConceptValue(
      facts,
      "us-gaap",
      "EarningsPerShareBasic",
      year,
      "USD/shares"
    );

    const yearKey = year.toString();

    // ROE = Net Income / Shareholders' Equity
    if (netIncome !== null && stockholdersEquity !== null && stockholdersEquity !== 0) {
      metrics.roe.set(yearKey, netIncome / stockholdersEquity);
    }

    // ROA = Net Income / Total Assets
    if (netIncome !== null && totalAssets !== null && totalAssets !== 0) {
      metrics.roa.set(yearKey, netIncome / totalAssets);
    }

    // Profit Margin = Net Income / Revenue
    if (netIncome !== null && revenues !== null && revenues !== 0) {
      metrics.profitMargin.set(yearKey, netIncome / revenues);
    }

    // Current Ratio = Current Assets / Current Liabilities
    if (
      currentAssets !== null &&
      currentLiabilities !== null &&
      currentLiabilities !== 0
    ) {
      metrics.currentRatio.set(yearKey, currentAssets / currentLiabilities);
    }

    // Debt-to-Equity = Total Liabilities / Shareholders' Equity
    if (
      totalLiabilities !== null &&
      stockholdersEquity !== null &&
      stockholdersEquity !== 0
    ) {
      metrics.debtToEquity.set(yearKey, totalLiabilities / stockholdersEquity);
    }

    // Free Cash Flow = Operating Cash Flow - Capital Expenditures
    if (operatingCashFlow !== null && capex !== null) {
      // capex is usually negative in SEC filings, but we want to subtract it
      metrics.freeCashFlow.set(yearKey, operatingCashFlow - Math.abs(capex));
    }

    // Revenue Growth Rate = (Current Revenue - Prior Revenue) / Prior Revenue
    if (revenues !== null) {
      const priorRevenues = getConceptValue(facts, "us-gaap", "Revenues", year - 1);
      if (priorRevenues !== null && priorRevenues !== 0) {
        metrics.revenueGrowth.set(
          yearKey,
          (revenues - priorRevenues) / priorRevenues
        );
      }
    }

    // EPS Growth = (Current EPS - Prior EPS) / Prior EPS
    if (epsBasic !== null) {
      const priorEPS = getConceptValue(
        facts,
        "us-gaap",
        "EarningsPerShareBasic",
        year - 1,
        "USD/shares"
      );
      if (priorEPS !== null && priorEPS !== 0) {
        metrics.epsGrowth.set(yearKey, (epsBasic - priorEPS) / priorEPS);
      }
    }
  }

  // Log summary
  console.log(`[Financial Calculator] Calculated metrics:`);
  console.log(`  - ROE: ${metrics.roe.size} years`);
  console.log(`  - ROA: ${metrics.roa.size} years`);
  console.log(`  - Profit Margin: ${metrics.profitMargin.size} years`);
  console.log(`  - Current Ratio: ${metrics.currentRatio.size} years`);
  console.log(`  - Debt-to-Equity: ${metrics.debtToEquity.size} years`);
  console.log(`  - Revenue Growth: ${metrics.revenueGrowth.size} years`);
  console.log(`  - EPS Growth: ${metrics.epsGrowth.size} years`);
  console.log(`  - Free Cash Flow: ${metrics.freeCashFlow.size} years`);

  return metrics;
}
