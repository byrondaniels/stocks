/**
 * Spinoff Quality Analysis Service
 * Evaluates spinoff opportunities based on parent company quality, business quality, and financial structure
 * Returns boolean criteria indicating whether each requirement is met
 */

import { getFinancialMetrics } from "./sec/financial-metrics-service.js";
import { fetchFMPProfile } from "./stock-data/fmp.js";
import { fetchYahooCompanySummary } from "./stock-data/yahoo-finance.js";
import { lookupSpinoff } from "./spinoffLookup.service.js";
import { callGeminiJSON } from "../utils/gemini.utils.js";

/**
 * Parent company quality evaluation - boolean criteria
 */
export interface ParentCompanyQuality {
  /** Market cap > $5B OR free cash flow > $500M */
  meetsCapitalThreshold: boolean | null;
  /** Positive free cash flow in last 12 months */
  hasPositiveFCF: boolean | null;
  /** Management with successful operational track record */
  hasStrongManagement: boolean | null;
  /** Clear strategic rationale (focus/value unlock, NOT distress) */
  hasHealthyRationale: boolean | null;
}

/**
 * Business quality evaluation - boolean criteria
 */
export interface BusinessQuality {
  /** Annual revenue > $500M */
  meetsRevenueThreshold: boolean | null;
  /** Market-leading or strong #2-3 position in industry */
  hasStrongMarketPosition: boolean | null;
  /** Located in stable developed markets (US, Canada, EU, Australia, Japan) */
  inStableMarket: boolean | null;
  /** Can operate independently from day 1 */
  hasStandaloneViability: boolean | null;
  /** Has defensible competitive moats */
  hasCompetitiveMoats: boolean | null;
}

/**
 * Financial structure evaluation - boolean criteria
 */
export interface FinancialStructure {
  /** Debt/EBITDA ratio < 4x */
  meetsDebtThreshold: boolean | null;
  /** At least 12 months cash runway */
  hasSufficientCashRunway: boolean | null;
  /** Capital requirements clearly defined and manageable */
  hasManageableCapitalRequirements: boolean | null;
  /** No poison pill debt structures or onerous parent guarantees */
  hasCleanDebtStructure: boolean | null;
}

/**
 * Overall spinoff quality analysis result
 */
export interface SpinoffQualityAnalysis {
  ticker: string;
  companyName: string;
  isSpinoff: boolean;
  parentCompanyName: string | null;
  parentTicker: string | null;
  parentCompanyQuality: ParentCompanyQuality;
  businessQuality: BusinessQuality;
  financialStructure: FinancialStructure;
  criteriaMetCount: number; // Number of criteria that are true
  criteriaTotalCount: number; // Total number of non-null criteria
  passPercentage: number; // Percentage of criteria met (0-100)
  overallRating: "Strong" | "Moderate" | "Weak" | "Insufficient Data";
  analyzedAt: Date;
}

/**
 * Stable developed markets for spinoff evaluation
 */
const STABLE_MARKETS = ["US", "USA", "United States", "Canada", "CA", "UK", "United Kingdom",
                        "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium",
                        "Switzerland", "Sweden", "Norway", "Denmark", "Finland", "Austria",
                        "Australia", "AU", "Japan", "JP"];

/**
 * Checks if a country is in a stable developed market
 */
function isStableDevelopedMarket(country: string | null): boolean | null {
  if (!country) return null;
  return STABLE_MARKETS.some(market =>
    country.toLowerCase().includes(market.toLowerCase())
  );
}

/**
 * Gets the most recent year's value from a metrics object
 */
function getLatestValue(metrics: Record<string, number> | undefined): number | null {
  if (!metrics || Object.keys(metrics).length === 0) return null;

  const years = Object.keys(metrics).sort().reverse();
  const latestYear = years[0];
  return metrics[latestYear] ?? null;
}

/**
 * Performs spinoff quality analysis for a given ticker
 *
 * Evaluates based on:
 * - Parent company quality (if applicable)
 * - Business quality metrics
 * - Financial structure health
 *
 * Returns boolean values for each criterion indicating whether it's met.
 * Note: Some fields return null when data is not currently available.
 *
 * @param ticker - Stock ticker symbol to analyze
 * @returns Complete quality analysis with boolean criteria
 * @throws {Error} If ticker is invalid or required data cannot be fetched
 *
 * @example
 * const analysis = await analyzeSpinoffQuality('SOBO');
 * console.log(analysis.overallRating);  // "Strong"
 * console.log(analysis.businessQuality.meetsRevenueThreshold);  // true
 */
export async function analyzeSpinoffQuality(ticker: string): Promise<SpinoffQualityAnalysis> {
  const normalizedTicker = ticker.toUpperCase().trim();

  console.log(`[Spinoff Quality] Starting analysis for ${normalizedTicker}`);

  // Step 1: Look up spinoff information
  const spinoffInfo = await lookupSpinoff(normalizedTicker);

  // Step 2: Fetch Yahoo Finance company summary (market cap, revenue)
  let yahooSummary;
  try {
    yahooSummary = await fetchYahooCompanySummary(normalizedTicker);
  } catch (error) {
    console.error(`[Spinoff Quality] Error fetching Yahoo summary:`, error);
    yahooSummary = null;
  }

  // Step 3: Fetch financial metrics from SEC
  let financialMetrics;
  try {
    financialMetrics = await getFinancialMetrics(normalizedTicker);
  } catch (error) {
    console.error(`[Spinoff Quality] Error fetching financial metrics:`, error);
    financialMetrics = null;
  }

  // Step 4: Fetch company profile from FMP
  let companyProfile;
  try {
    companyProfile = await fetchFMPProfile(normalizedTicker);
  } catch (error) {
    console.error(`[Spinoff Quality] Error fetching company profile:`, error);
    companyProfile = null;
  }

  // Step 5: Analyze parent company if this is a spinoff
  let parentAnalysis: ParentCompanyQuality | null = null;
  if (spinoffInfo.isSpinoff && spinoffInfo.parentTicker) {
    parentAnalysis = await analyzeParentCompany(spinoffInfo.parentTicker);
  } else {
    // Default parent quality for non-spinoffs (all null)
    parentAnalysis = {
      meetsCapitalThreshold: null,
      hasPositiveFCF: null,
      hasStrongManagement: null,
      hasHealthyRationale: null,
    };
  }

  // Step 6: Evaluate business quality
  const businessQuality = evaluateBusinessQuality(
    normalizedTicker,
    yahooSummary,
    companyProfile
  );

  // Step 7: Evaluate financial structure
  const financialStructure = evaluateFinancialStructure(
    normalizedTicker,
    financialMetrics
  );

  // Step 8: Use Gemini AI for qualitative boolean assessments
  const qualitativeAnalysis = await getQualitativeAnalysis(
    normalizedTicker,
    companyProfile?.name || normalizedTicker,
    spinoffInfo,
    businessQuality,
    parentAnalysis
  );

  // Merge AI analysis into our results
  if (parentAnalysis && spinoffInfo.isSpinoff) {
    parentAnalysis.hasStrongManagement = qualitativeAnalysis.hasStrongManagement;
    parentAnalysis.hasHealthyRationale = qualitativeAnalysis.hasHealthyRationale;
  }

  businessQuality.hasStrongMarketPosition = qualitativeAnalysis.hasStrongMarketPosition;
  businessQuality.hasStandaloneViability = qualitativeAnalysis.hasStandaloneViability;
  businessQuality.hasCompetitiveMoats = qualitativeAnalysis.hasCompetitiveMoats;

  financialStructure.hasManageableCapitalRequirements = qualitativeAnalysis.hasManageableCapitalRequirements;
  financialStructure.hasCleanDebtStructure = qualitativeAnalysis.hasCleanDebtStructure;

  // Step 9: Calculate overall score and rating
  const { metCount, totalCount, passPercentage, rating } = calculateOverallScore(
    parentAnalysis,
    businessQuality,
    financialStructure,
    spinoffInfo.isSpinoff
  );

  return {
    ticker: normalizedTicker,
    companyName: companyProfile?.name || normalizedTicker,
    isSpinoff: spinoffInfo.isSpinoff,
    parentCompanyName: spinoffInfo.parentCompany,
    parentTicker: spinoffInfo.parentTicker,
    parentCompanyQuality: parentAnalysis,
    businessQuality,
    financialStructure,
    criteriaMetCount: metCount,
    criteriaTotalCount: totalCount,
    passPercentage,
    overallRating: rating,
    analyzedAt: new Date(),
  };
}

/**
 * Analyzes parent company quality for a spinoff
 */
async function analyzeParentCompany(parentTicker: string): Promise<ParentCompanyQuality> {
  console.log(`[Spinoff Quality] Analyzing parent company ${parentTicker}`);

  // Fetch parent Yahoo summary for market cap
  let parentYahoo;
  try {
    parentYahoo = await fetchYahooCompanySummary(parentTicker);
  } catch (error) {
    console.error(`[Spinoff Quality] Error fetching parent Yahoo data:`, error);
    parentYahoo = null;
  }

  // Fetch parent financial metrics for FCF
  let parentMetrics;
  try {
    parentMetrics = await getFinancialMetrics(parentTicker);
  } catch (error) {
    console.error(`[Spinoff Quality] Error fetching parent metrics:`, error);
    parentMetrics = null;
  }

  // Check market cap > $5B OR FCF > $500M
  const marketCapBillions = parentYahoo?.marketCapBillions ?? null;
  const freeCashFlow = getLatestValue(parentMetrics?.metrics.freeCashFlow);
  const freeCashFlowMillions = freeCashFlow ? freeCashFlow / 1_000_000 : null;

  let meetsCapitalThreshold: boolean | null = null;
  if (marketCapBillions !== null && marketCapBillions > 5) {
    meetsCapitalThreshold = true;
  } else if (freeCashFlowMillions !== null && freeCashFlowMillions > 500) {
    meetsCapitalThreshold = true;
  } else if (marketCapBillions !== null || freeCashFlowMillions !== null) {
    meetsCapitalThreshold = false;
  }

  // Check for positive FCF
  const hasPositiveFCF = freeCashFlowMillions !== null ? freeCashFlowMillions > 0 : null;

  return {
    meetsCapitalThreshold,
    hasPositiveFCF,
    hasStrongManagement: null, // Will be filled by AI analysis
    hasHealthyRationale: null, // Will be filled by AI analysis
  };
}

/**
 * Evaluates business quality metrics
 */
function evaluateBusinessQuality(
  ticker: string,
  yahooSummary: any,
  companyProfile: any
): BusinessQuality {
  console.log(`[Spinoff Quality] Evaluating business quality for ${ticker}`);

  // Check revenue > $500M from Yahoo Finance
  const revenueMillions = yahooSummary?.revenueMillions ?? null;
  const meetsRevenueThreshold = revenueMillions !== null ? revenueMillions > 500 : null;

  // Get country from FMP profile
  const country = companyProfile?.country || null;
  const inStableMarket = isStableDevelopedMarket(country);

  return {
    meetsRevenueThreshold,
    hasStrongMarketPosition: null, // Will be filled by AI analysis
    inStableMarket,
    hasStandaloneViability: null, // Will be filled by AI analysis
    hasCompetitiveMoats: null, // Will be filled by AI analysis
  };
}

/**
 * Evaluates financial structure health
 */
function evaluateFinancialStructure(
  ticker: string,
  financialMetrics: any
): FinancialStructure {
  console.log(`[Spinoff Quality] Evaluating financial structure for ${ticker}`);

  // Debt/EBITDA calculation not currently available - would need EBITDA from raw SEC data
  const meetsDebtThreshold: boolean | null = null;

  // Cash runway calculation not currently available - would need detailed cash flow analysis
  const hasSufficientCashRunway: boolean | null = null;

  return {
    meetsDebtThreshold,
    hasSufficientCashRunway,
    hasManageableCapitalRequirements: null, // Will be filled by AI analysis
    hasCleanDebtStructure: null, // Will be filled by AI analysis
  };
}

/**
 * AI-powered qualitative analysis interface - boolean criteria
 */
interface QualitativeAnalysis {
  hasStrongManagement: boolean | null;
  hasHealthyRationale: boolean | null;
  hasStrongMarketPosition: boolean | null;
  hasStandaloneViability: boolean | null;
  hasCompetitiveMoats: boolean | null;
  hasManageableCapitalRequirements: boolean | null;
  hasCleanDebtStructure: boolean | null;
}

/**
 * Uses Gemini AI to perform qualitative boolean analysis
 */
async function getQualitativeAnalysis(
  ticker: string,
  companyName: string,
  spinoffInfo: any,
  businessQuality: BusinessQuality,
  parentQuality: ParentCompanyQuality | null
): Promise<QualitativeAnalysis> {
  console.log(`[Spinoff Quality] Requesting AI qualitative analysis for ${ticker}`);

  const prompt = buildQualitativeAnalysisPrompt(
    ticker,
    companyName,
    spinoffInfo,
    businessQuality,
    parentQuality
  );

  const fallback: QualitativeAnalysis = {
    hasStrongManagement: null,
    hasHealthyRationale: null,
    hasStrongMarketPosition: null,
    hasStandaloneViability: null,
    hasCompetitiveMoats: null,
    hasManageableCapitalRequirements: null,
    hasCleanDebtStructure: null,
  };

  try {
    const analysis = await callGeminiJSON<QualitativeAnalysis>(
      "gemini-2.0-flash",
      prompt,
      fallback,
      {
        tools: [{
          googleSearch: {}
        }]
      }
    );

    return analysis;
  } catch (error) {
    console.error(`[Spinoff Quality] Error in AI analysis:`, error);
    return fallback;
  }
}

/**
 * Builds prompt for Gemini AI qualitative boolean analysis
 */
function buildQualitativeAnalysisPrompt(
  ticker: string,
  companyName: string,
  spinoffInfo: any,
  businessQuality: BusinessQuality,
  parentQuality: ParentCompanyQuality | null
): string {
  const isSpinoff = spinoffInfo.isSpinoff;
  const parentInfo = isSpinoff
    ? `This is a spinoff from ${spinoffInfo.parentCompany} (${spinoffInfo.parentTicker}).`
    : `This is NOT a recent spinoff.`;

  return `You are a financial analyst evaluating ${companyName} (${ticker}) as a potential spinoff investment opportunity.

${parentInfo}

Your task is to provide BOOLEAN (true/false) assessments for the following criteria. Use web search to gather current, accurate information.

${isSpinoff ? `
**Parent Company Analysis (${spinoffInfo.parentTicker}):**
1. **hasStrongManagement**: Does the parent company's management have a successful operational track record (not just financial engineering)? Return true if yes, false if no, null if insufficient data.

2. **hasHealthyRationale**: Is the strategic rationale for this spinoff healthy (e.g., to unlock value, increase focus) rather than financial distress? Return true if healthy rationale, false if distress-driven, null if insufficient data.
` : ''}

**Business Quality Analysis (${ticker}):**
3. **hasStrongMarketPosition**: Is ${companyName} a market leader OR strong #2-3 position in its industry? Return true if leading or strong #2-3, false if lower position, null if insufficient data.

4. **hasStandaloneViability**: Can this company operate independently from day 1 with its own operations, supply chain, and management? Return true if viable, false if dependent, null if insufficient data.

5. **hasCompetitiveMoats**: Does the company have defensible competitive advantages (brand, network effects, regulatory barriers, patents, economies of scale)? Return true if has strong moats, false if weak/no moats, null if insufficient data.

**Financial Structure Analysis:**
6. **hasManageableCapitalRequirements**: Are the company's capital requirements clearly defined and manageable given the business model? Return true if manageable, false if excessive/concerning, null if insufficient data.

7. **hasCleanDebtStructure**: Is the debt structure clean without "poison pill" structures, parent guarantees, or unusual financial obligations? Return true if clean, false if concerning structures, null if insufficient data.

Return your analysis as a JSON object with ONLY boolean or null values:
{
  ${isSpinoff ? `"hasStrongManagement": true | false | null,
  "hasHealthyRationale": true | false | null,
  ` : `"hasStrongManagement": null,
  "hasHealthyRationale": null,
  `}"hasStrongMarketPosition": true | false | null,
  "hasStandaloneViability": true | false | null,
  "hasCompetitiveMoats": true | false | null,
  "hasManageableCapitalRequirements": true | false | null,
  "hasCleanDebtStructure": true | false | null
}

IMPORTANT: Return ONLY boolean values (true/false) or null. Do not return strings or explanations.
Be strict: only return true if the criterion is clearly met, false if clearly not met, null if you cannot determine.`;
}

/**
 * Calculates overall score and rating based on boolean criteria
 */
function calculateOverallScore(
  parentQuality: ParentCompanyQuality | null,
  businessQuality: BusinessQuality,
  financialStructure: FinancialStructure,
  isSpinoff: boolean
): { metCount: number; totalCount: number; passPercentage: number; rating: "Strong" | "Moderate" | "Weak" | "Insufficient Data" } {
  let metCount = 0;
  let totalCount = 0;

  // Helper to count boolean criteria
  const countCriteria = (value: boolean | null) => {
    if (value !== null) {
      totalCount++;
      if (value === true) {
        metCount++;
      }
    }
  };

  // Parent company criteria (only if this is a spinoff)
  if (isSpinoff && parentQuality) {
    countCriteria(parentQuality.meetsCapitalThreshold);
    countCriteria(parentQuality.hasPositiveFCF);
    countCriteria(parentQuality.hasStrongManagement);
    countCriteria(parentQuality.hasHealthyRationale);
  }

  // Business quality criteria
  countCriteria(businessQuality.meetsRevenueThreshold);
  countCriteria(businessQuality.hasStrongMarketPosition);
  countCriteria(businessQuality.inStableMarket);
  countCriteria(businessQuality.hasStandaloneViability);
  countCriteria(businessQuality.hasCompetitiveMoats);

  // Financial structure criteria
  countCriteria(financialStructure.meetsDebtThreshold);
  countCriteria(financialStructure.hasSufficientCashRunway);
  countCriteria(financialStructure.hasManageableCapitalRequirements);
  countCriteria(financialStructure.hasCleanDebtStructure);

  // Calculate pass percentage
  const passPercentage = totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0;

  // Determine rating
  let rating: "Strong" | "Moderate" | "Weak" | "Insufficient Data";
  if (totalCount === 0) {
    rating = "Insufficient Data";
  } else if (passPercentage >= 75) {
    rating = "Strong";
  } else if (passPercentage >= 50) {
    rating = "Moderate";
  } else {
    rating = "Weak";
  }

  return { metCount, totalCount, passPercentage, rating };
}
