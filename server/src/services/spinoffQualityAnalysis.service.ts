/**
 * Spinoff Quality Analysis Service
 * Evaluates spinoff opportunities based on parent company quality, business quality, and financial structure
 */

import { getFinancialMetrics } from "./sec/financial-metrics-service.js";
import { fetchFMPProfile, fetchFMPQuote } from "./stock-data/fmp.js";
import { lookupSpinoff } from "./spinoffLookup.service.js";
import { callGeminiJSON } from "../utils/gemini.utils.js";

/**
 * Parent company quality evaluation
 */
export interface ParentCompanyQuality {
  /** Market cap > $5B (in billions, null if not available) */
  marketCapBillions: number | null;
  /** Annual free cash flow > $500M (in millions, null if not available) */
  freeCashFlowMillions: number | null;
  /** Meets market cap or FCF threshold */
  meetsThreshold: boolean | null;
  /** Has positive free cash flow in last 12 months */
  positiveFCF: boolean | null;
  /** Management has successful operational track record (AI-evaluated, null if not available) */
  managementTrackRecord: string | null;
  /** Clear strategic rationale for separation (AI-evaluated, null if not available) */
  strategicRationale: string | null;
}

/**
 * Business quality evaluation
 */
export interface BusinessQuality {
  /** Current annual revenue in millions */
  revenueMillions: number | null;
  /** Revenue meets $500M threshold */
  meetsRevenueThreshold: boolean | null;
  /** Market position (AI-evaluated: "Leading", "#2-3", "Lower", null if not available) */
  marketPosition: string | null;
  /** Country of operations */
  country: string | null;
  /** Located in stable developed market (US, Canada, EU, Australia, Japan) */
  inStableMarket: boolean | null;
  /** Can operate independently from day 1 (AI-evaluated, null if not available) */
  standaloneViability: string | null;
  /** Has defensible competitive moats (AI-evaluated, null if not available) */
  competitiveMoats: string | null;
}

/**
 * Financial structure evaluation
 */
export interface FinancialStructure {
  /** Debt to EBITDA ratio (null if EBITDA not available) */
  debtToEBITDA: number | null;
  /** Meets debt/EBITDA < 4x threshold */
  meetsDebtThreshold: boolean | null;
  /** Estimated cash runway in months (null - not currently available) */
  cashRunwayMonths: number | null;
  /** Capital requirements assessment (AI-evaluated, null if not available) */
  capitalRequirements: string | null;
  /** Debt structure assessment (AI-evaluated for poison pills, null if not available) */
  debtStructure: string | null;
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
  overallScore: number; // 0-100 based on available criteria
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
 * Note: Some fields return null when data is not currently available through APIs.
 * Fields marked as "AI-evaluated" use Gemini AI for qualitative assessment.
 *
 * @param ticker - Stock ticker symbol to analyze
 * @returns Complete quality analysis with scores and ratings
 * @throws {Error} If ticker is invalid or required data cannot be fetched
 *
 * @example
 * const analysis = await analyzeSpinoffQuality('SOBO');
 * console.log(analysis.overallRating);  // "Strong"
 * console.log(analysis.businessQuality.revenueMillions);  // 650
 */
export async function analyzeSpinoffQuality(ticker: string): Promise<SpinoffQualityAnalysis> {
  const normalizedTicker = ticker.toUpperCase().trim();

  console.log(`[Spinoff Quality] Starting analysis for ${normalizedTicker}`);

  // Step 1: Look up spinoff information
  const spinoffInfo = await lookupSpinoff(normalizedTicker);

  // Step 2: Fetch financial metrics from SEC
  let financialMetrics;
  try {
    financialMetrics = await getFinancialMetrics(normalizedTicker);
  } catch (error) {
    console.error(`[Spinoff Quality] Error fetching financial metrics:`, error);
    financialMetrics = null;
  }

  // Step 3: Fetch company profile from FMP
  let companyProfile;
  try {
    companyProfile = await fetchFMPProfile(normalizedTicker);
  } catch (error) {
    console.error(`[Spinoff Quality] Error fetching company profile:`, error);
    companyProfile = null;
  }

  // Step 4: Fetch current market data for market cap calculation
  let marketData;
  try {
    marketData = await fetchFMPQuote(normalizedTicker);
  } catch (error) {
    console.error(`[Spinoff Quality] Error fetching market data:`, error);
    marketData = null;
  }

  // Step 5: Analyze parent company if this is a spinoff
  let parentAnalysis: ParentCompanyQuality | null = null;
  if (spinoffInfo.isSpinoff && spinoffInfo.parentTicker) {
    parentAnalysis = await analyzeParentCompany(spinoffInfo.parentTicker);
  } else {
    // Default parent quality for non-spinoffs
    parentAnalysis = {
      marketCapBillions: null,
      freeCashFlowMillions: null,
      meetsThreshold: null,
      positiveFCF: null,
      managementTrackRecord: null,
      strategicRationale: null,
    };
  }

  // Step 6: Evaluate business quality
  const businessQuality = evaluateBusinessQuality(
    normalizedTicker,
    financialMetrics,
    companyProfile
  );

  // Step 7: Evaluate financial structure
  const financialStructure = evaluateFinancialStructure(
    normalizedTicker,
    financialMetrics
  );

  // Step 8: Use Gemini AI for qualitative assessments (market position, moats, etc.)
  const qualitativeAnalysis = await getQualitativeAnalysis(
    normalizedTicker,
    companyProfile?.name || normalizedTicker,
    spinoffInfo,
    businessQuality,
    parentAnalysis
  );

  // Merge AI analysis into our results
  if (parentAnalysis && spinoffInfo.isSpinoff) {
    parentAnalysis.managementTrackRecord = qualitativeAnalysis.managementTrackRecord;
    parentAnalysis.strategicRationale = qualitativeAnalysis.strategicRationale;
  }

  businessQuality.marketPosition = qualitativeAnalysis.marketPosition;
  businessQuality.standaloneViability = qualitativeAnalysis.standaloneViability;
  businessQuality.competitiveMoats = qualitativeAnalysis.competitiveMoats;

  financialStructure.capitalRequirements = qualitativeAnalysis.capitalRequirements;
  financialStructure.debtStructure = qualitativeAnalysis.debtStructure;

  // Step 9: Calculate overall score and rating
  const { score, rating } = calculateOverallScore(
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
    overallScore: score,
    overallRating: rating,
    analyzedAt: new Date(),
  };
}

/**
 * Analyzes parent company quality for a spinoff
 */
async function analyzeParentCompany(parentTicker: string): Promise<ParentCompanyQuality> {
  console.log(`[Spinoff Quality] Analyzing parent company ${parentTicker}`);

  // Fetch parent financial metrics
  let parentMetrics;
  try {
    parentMetrics = await getFinancialMetrics(parentTicker);
  } catch (error) {
    console.error(`[Spinoff Quality] Error fetching parent metrics:`, error);
    parentMetrics = null;
  }

  // Fetch parent market data for market cap
  let parentMarketData;
  try {
    parentMarketData = await fetchFMPQuote(parentTicker);
  } catch (error) {
    console.error(`[Spinoff Quality] Error fetching parent market data:`, error);
    parentMarketData = null;
  }

  // Calculate market cap (price * volume is a rough proxy, but we'd need shares outstanding)
  // For now, we'll mark this as null since we don't have shares outstanding
  const marketCapBillions: number | null = null;

  // Get free cash flow from SEC data
  const freeCashFlow = getLatestValue(parentMetrics?.metrics.freeCashFlow);
  const freeCashFlowMillions = freeCashFlow ? freeCashFlow / 1_000_000 : null;

  // Check if meets threshold (either market cap > $5B OR FCF > $500M)
  let meetsThreshold: boolean | null = null;
  if (marketCapBillions !== null && marketCapBillions > 5) {
    meetsThreshold = true;
  } else if (freeCashFlowMillions !== null && freeCashFlowMillions > 500) {
    meetsThreshold = true;
  } else if (marketCapBillions !== null || freeCashFlowMillions !== null) {
    meetsThreshold = false;
  }

  // Check for positive FCF
  const positiveFCF = freeCashFlowMillions !== null ? freeCashFlowMillions > 0 : null;

  return {
    marketCapBillions,
    freeCashFlowMillions,
    meetsThreshold,
    positiveFCF,
    managementTrackRecord: null, // Will be filled by AI analysis
    strategicRationale: null, // Will be filled by AI analysis
  };
}

/**
 * Evaluates business quality metrics
 */
function evaluateBusinessQuality(
  ticker: string,
  financialMetrics: any,
  companyProfile: any
): BusinessQuality {
  console.log(`[Spinoff Quality] Evaluating business quality for ${ticker}`);

  // Get revenue from SEC data (using various revenue fields)
  // SEC data uses "Revenues" or "RevenueFromContractWithCustomerExcludingAssessedTax"
  // For now, we'll mark as null since we need to calculate it from raw SEC data
  const revenueMillions: number | null = null;

  const meetsRevenueThreshold = revenueMillions !== null ? revenueMillions > 500 : null;

  // Get country from FMP profile
  const country = companyProfile?.country || null;
  const inStableMarket = isStableDevelopedMarket(country);

  return {
    revenueMillions,
    meetsRevenueThreshold,
    marketPosition: null, // Will be filled by AI analysis
    country,
    inStableMarket,
    standaloneViability: null, // Will be filled by AI analysis
    competitiveMoats: null, // Will be filled by AI analysis
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

  // Calculate Debt/EBITDA ratio
  // We have debtToEquity from metrics, but not EBITDA directly
  // EBITDA = Net Income + Interest + Taxes + Depreciation + Amortization
  // For now, we'll use debt/equity as a proxy and note debt/EBITDA is not available
  const debtToEBITDA: number | null = null;
  const meetsDebtThreshold = debtToEBITDA !== null ? debtToEBITDA < 4 : null;

  return {
    debtToEBITDA,
    meetsDebtThreshold,
    cashRunwayMonths: null, // Not currently available
    capitalRequirements: null, // Will be filled by AI analysis
    debtStructure: null, // Will be filled by AI analysis
  };
}

/**
 * AI-powered qualitative analysis interface
 */
interface QualitativeAnalysis {
  managementTrackRecord: string | null;
  strategicRationale: string | null;
  marketPosition: string | null;
  standaloneViability: string | null;
  competitiveMoats: string | null;
  capitalRequirements: string | null;
  debtStructure: string | null;
}

/**
 * Uses Gemini AI to perform qualitative analysis
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
    managementTrackRecord: null,
    strategicRationale: null,
    marketPosition: null,
    standaloneViability: null,
    competitiveMoats: null,
    capitalRequirements: null,
    debtStructure: null,
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
 * Builds prompt for Gemini AI qualitative analysis
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

Your task is to provide qualitative assessments for the following areas. Use web search to gather current, accurate information.

${isSpinoff ? `
**Parent Company Analysis (${spinoffInfo.parentTicker}):**
1. **managementTrackRecord**: Evaluate the parent company's management team. Do they have a successful operational track record (not just financial engineering)? Provide a brief assessment (1-2 sentences) or null if insufficient data.

2. **strategicRationale**: What is the strategic rationale for this spinoff? Is it to unlock value/increase focus, or is it due to financial distress? Provide a brief assessment (1-2 sentences) or null if insufficient data.
` : ''}

**Business Quality Analysis (${ticker}):**
3. **marketPosition**: What is ${companyName}'s market position in its industry? Is it a market leader, strong #2-3 position, or lower? Answer with one of: "Leading", "#2-3", "Lower", or null if insufficient data.

4. **standaloneViability**: Can this company operate independently from day 1? Does it have its own operations, supply chain, and management? Provide a brief assessment (1-2 sentences) or null if insufficient data.

5. **competitiveMoats**: What are the company's defensible competitive advantages or moats? (e.g., brand strength, network effects, regulatory barriers, patents, economies of scale). Provide a brief assessment (1-2 sentences) or null if insufficient data.

**Financial Structure Analysis:**
6. **capitalRequirements**: What are the company's capital requirements? Are they clearly defined and manageable given the business model? Provide a brief assessment (1-2 sentences) or null if insufficient data.

7. **debtStructure**: Analyze the debt structure. Are there any concerning "poison pill" debt structures, parent guarantees, or unusual financial obligations? Provide a brief assessment (1-2 sentences) or null if insufficient data.

Return your analysis as a JSON object with the following structure:
{
  ${isSpinoff ? `"managementTrackRecord": "string or null",
  "strategicRationale": "string or null",
  ` : `"managementTrackRecord": null,
  "strategicRationale": null,
  `}"marketPosition": "Leading" | "#2-3" | "Lower" | null,
  "standaloneViability": "string or null",
  "competitiveMoats": "string or null",
  "capitalRequirements": "string or null",
  "debtStructure": "string or null"
}

Be factual and objective. If you cannot find sufficient information for a field, return null for that field.`;
}

/**
 * Calculates overall score and rating based on all criteria
 */
function calculateOverallScore(
  parentQuality: ParentCompanyQuality | null,
  businessQuality: BusinessQuality,
  financialStructure: FinancialStructure,
  isSpinoff: boolean
): { score: number; rating: "Strong" | "Moderate" | "Weak" | "Insufficient Data" } {
  let totalPoints = 0;
  let maxPoints = 0;

  // Parent company criteria (only if this is a spinoff)
  if (isSpinoff && parentQuality) {
    // Market cap or FCF threshold (10 points)
    maxPoints += 10;
    if (parentQuality.meetsThreshold === true) totalPoints += 10;
    else if (parentQuality.meetsThreshold === false) totalPoints += 0;

    // Positive FCF (10 points)
    maxPoints += 10;
    if (parentQuality.positiveFCF === true) totalPoints += 10;
    else if (parentQuality.positiveFCF === false) totalPoints += 0;

    // Management track record (10 points) - subjective AI evaluation
    maxPoints += 10;
    if (parentQuality.managementTrackRecord) {
      // Simple heuristic: positive keywords = points
      const positive = /strong|successful|proven|excellent|good/i.test(parentQuality.managementTrackRecord);
      const negative = /weak|poor|failed|concerning/i.test(parentQuality.managementTrackRecord);
      if (positive && !negative) totalPoints += 10;
      else if (!positive && !negative) totalPoints += 5;
    }

    // Strategic rationale (10 points) - subjective AI evaluation
    maxPoints += 10;
    if (parentQuality.strategicRationale) {
      const positive = /unlock|value|focus|strategic|growth/i.test(parentQuality.strategicRationale);
      const negative = /distress|debt|struggling|forced/i.test(parentQuality.strategicRationale);
      if (positive && !negative) totalPoints += 10;
      else if (!positive && !negative) totalPoints += 5;
    }
  }

  // Business quality criteria
  // Revenue threshold (15 points)
  maxPoints += 15;
  if (businessQuality.meetsRevenueThreshold === true) totalPoints += 15;
  else if (businessQuality.meetsRevenueThreshold === false) totalPoints += 0;

  // Market position (15 points)
  maxPoints += 15;
  if (businessQuality.marketPosition === "Leading") totalPoints += 15;
  else if (businessQuality.marketPosition === "#2-3") totalPoints += 10;
  else if (businessQuality.marketPosition === "Lower") totalPoints += 0;

  // Stable market (10 points)
  maxPoints += 10;
  if (businessQuality.inStableMarket === true) totalPoints += 10;
  else if (businessQuality.inStableMarket === false) totalPoints += 0;

  // Standalone viability (10 points) - subjective AI evaluation
  maxPoints += 10;
  if (businessQuality.standaloneViability) {
    const positive = /yes|capable|proven|independent|strong/i.test(businessQuality.standaloneViability);
    const negative = /no|dependent|weak|concerning/i.test(businessQuality.standaloneViability);
    if (positive && !negative) totalPoints += 10;
    else if (!positive && !negative) totalPoints += 5;
  }

  // Competitive moats (10 points) - subjective AI evaluation
  maxPoints += 10;
  if (businessQuality.competitiveMoats) {
    const hasMultipleMoats = (businessQuality.competitiveMoats.match(/,/g) || []).length > 0;
    const positive = /strong|significant|defensible|sustainable/i.test(businessQuality.competitiveMoats);
    if (hasMultipleMoats || positive) totalPoints += 10;
    else totalPoints += 5;
  }

  // Financial structure criteria
  // Debt/EBITDA threshold (10 points)
  maxPoints += 10;
  if (financialStructure.meetsDebtThreshold === true) totalPoints += 10;
  else if (financialStructure.meetsDebtThreshold === false) totalPoints += 0;

  // Capital requirements (5 points) - subjective AI evaluation
  maxPoints += 5;
  if (financialStructure.capitalRequirements) {
    const positive = /manageable|reasonable|low|moderate/i.test(financialStructure.capitalRequirements);
    const negative = /high|excessive|concerning/i.test(financialStructure.capitalRequirements);
    if (positive && !negative) totalPoints += 5;
    else if (!positive && !negative) totalPoints += 3;
  }

  // Debt structure (5 points) - subjective AI evaluation
  maxPoints += 5;
  if (financialStructure.debtStructure) {
    const positive = /clean|healthy|no concerns|reasonable/i.test(financialStructure.debtStructure);
    const negative = /poison|concerning|risky|onerous/i.test(financialStructure.debtStructure);
    if (positive && !negative) totalPoints += 5;
    else if (!positive && !negative) totalPoints += 3;
  }

  // Calculate percentage score
  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  // Determine rating
  let rating: "Strong" | "Moderate" | "Weak" | "Insufficient Data";
  if (maxPoints === 0) {
    rating = "Insufficient Data";
  } else if (score >= 75) {
    rating = "Strong";
  } else if (score >= 50) {
    rating = "Moderate";
  } else {
    rating = "Weak";
  }

  return { score, rating };
}
