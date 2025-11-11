import { GoogleGenAI } from '@google/genai';

// Initialize Gemini AI with new SDK
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

/**
 * CANSLIM metrics interface for scoring
 */
export interface CANSLIMMetrics {
  // C - Current Earnings: Quarterly EPS growth % (YoY)
  currentEarningsGrowth: number | null;

  // A - Annual Earnings: Annual EPS growth % (3-year average)
  annualEarningsGrowth: number | null;

  // N - New Highs: Is stock within 15% of 52-week high?
  isNearHighs: boolean;
  distanceFromHigh: number; // percentage

  // S - Supply & Demand: Trading volume vs. average
  volumeRatio: number | null; // current volume / average volume

  // Additional context
  ticker: string;
  currentPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  averageVolume: number;
  currentVolume: number;
}

/**
 * Individual component score breakdown
 */
export interface CANSLIMComponentScore {
  score: number; // 0-25
  explanation: string;
}

/**
 * Complete CANSLIM analysis result from Gemini
 */
export interface CANSLIMAnalysis {
  totalScore: number; // 0-100
  components: {
    C: CANSLIMComponentScore; // Current Earnings
    A: CANSLIMComponentScore; // Annual Earnings
    N: CANSLIMComponentScore; // New Highs
    S: CANSLIMComponentScore; // Supply & Demand
  };
  overallAnalysis: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

/**
 * Analyzes CANSLIM metrics using Gemini AI and returns scored analysis
 *
 * Uses Google's Gemini 2.0 Flash model to evaluate stock metrics according to
 * William O'Neil's CANSLIM methodology. Each component (C, A, N, S) is scored
 * 0-25 points for a total score out of 100.
 *
 * CANSLIM Components:
 * - C: Current quarterly earnings growth (YoY)
 * - A: Annual earnings growth (3-year average)
 * - N: New highs (proximity to 52-week high)
 * - S: Supply & Demand (volume analysis)
 *
 * @param metrics - Stock metrics including earnings, price, and volume data
 * @returns Complete CANSLIM analysis with scores, strengths, weaknesses, and recommendation
 * @throws {Error} If GEMINI_API_KEY is not configured or API call fails
 *
 * @example
 * const metrics = {
 *   ticker: 'AAPL',
 *   currentEarningsGrowth: 28.5,
 *   annualEarningsGrowth: 22.3,
 *   isNearHighs: true,
 *   distanceFromHigh: 3.2,
 *   volumeRatio: 1.8,
 *   currentPrice: 185.92,
 *   fiftyTwoWeekHigh: 192.15,
 *   fiftyTwoWeekLow: 124.17,
 *   averageVolume: 58000000,
 *   currentVolume: 104400000
 * };
 * const analysis = await analyzeCANSLIMWithGemini(metrics);
 * console.log(analysis.totalScore);  // e.g., 87
 * console.log(analysis.recommendation);  // e.g., "Strong buy - excellent CANSLIM profile"
 */
export async function analyzeCANSLIMWithGemini(
  metrics: CANSLIMMetrics
): Promise<CANSLIMAnalysis> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = buildCANSLIMPrompt(metrics);

  try {
    // Use new SDK API with v1 model (gemini-2.0-flash)
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    });

    const text = response.text;

    if (!text) {
      throw new Error('No response text received from Gemini API');
    }

    // Parse JSON response from Gemini
    const analysis = parseGeminiResponse(text);

    return analysis;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error(`Failed to analyze CANSLIM metrics: ${error}`);
  }
}

/**
 * Builds the prompt for Gemini to analyze CANSLIM metrics
 *
 * Constructs a detailed prompt that:
 * - Explains the CANSLIM methodology
 * - Provides the stock's metrics
 * - Defines scoring criteria for each component
 * - Specifies the expected JSON response format
 *
 * @param metrics - Stock metrics to include in the prompt
 * @returns Formatted prompt string for Gemini API
 *
 * @example
 * const prompt = buildCANSLIMPrompt(metrics);
 * // Returns a comprehensive prompt with scoring guidelines
 */
function buildCANSLIMPrompt(metrics: CANSLIMMetrics): string {
  return `You are a stock analysis expert specializing in the CANSLIM investment methodology created by William O'Neil.

Analyze the following stock metrics and provide a CANSLIM score breakdown:

**Stock:** ${metrics.ticker}
**Current Price:** $${metrics.currentPrice.toFixed(2)}

**CANSLIM Metrics:**

1. **C - Current Earnings (Quarterly EPS Growth YoY):**
   - Growth Rate: ${metrics.currentEarningsGrowth !== null ? `${metrics.currentEarningsGrowth.toFixed(2)}%` : 'N/A'}

2. **A - Annual Earnings (3-year average EPS growth):**
   - Growth Rate: ${metrics.annualEarningsGrowth !== null ? `${metrics.annualEarningsGrowth.toFixed(2)}%` : 'N/A'}

3. **N - New Highs (Distance from 52-week high):**
   - 52-week High: $${metrics.fiftyTwoWeekHigh.toFixed(2)}
   - 52-week Low: $${metrics.fiftyTwoWeekLow.toFixed(2)}
   - Distance from High: ${metrics.distanceFromHigh.toFixed(2)}%
   - Within 15% of High: ${metrics.isNearHighs ? 'Yes' : 'No'}

4. **S - Supply & Demand (Volume Analysis):**
   - Current Volume: ${metrics.currentVolume.toLocaleString()}
   - Average Volume: ${metrics.averageVolume.toLocaleString()}
   - Volume Ratio: ${metrics.volumeRatio !== null ? `${metrics.volumeRatio.toFixed(2)}x` : 'N/A'}

**Your Task:**
Score each CANSLIM component on a scale of 0-25 points based on these criteria:

**C - Current Earnings (0-25 points):**
- 25 points: >25% quarterly EPS growth
- 20 points: 20-25% growth
- 15 points: 15-20% growth
- 10 points: 10-15% growth
- 5 points: 5-10% growth
- 0 points: <5% growth or negative

**A - Annual Earnings (0-25 points):**
- 25 points: >20% average annual growth
- 20 points: 15-20% growth
- 15 points: 10-15% growth
- 10 points: 5-10% growth
- 5 points: 0-5% growth
- 0 points: Negative growth

**N - New Highs (0-25 points):**
- 25 points: Within 5% of 52-week high
- 20 points: 5-10% from high
- 15 points: 10-15% from high
- 10 points: 15-20% from high
- 5 points: 20-30% from high
- 0 points: >30% from high

**S - Supply & Demand (0-25 points):**
- 25 points: Volume ratio >2.0x (strong institutional buying)
- 20 points: 1.5-2.0x
- 15 points: 1.2-1.5x
- 10 points: 1.0-1.2x
- 5 points: 0.8-1.0x
- 0 points: <0.8x (weak demand)

**Response Format (MUST be valid JSON):**
{
  "totalScore": <sum of all component scores>,
  "components": {
    "C": {
      "score": <0-25>,
      "explanation": "<brief explanation of why this score was given>"
    },
    "A": {
      "score": <0-25>,
      "explanation": "<brief explanation>"
    },
    "N": {
      "score": <0-25>,
      "explanation": "<brief explanation>"
    },
    "S": {
      "score": <0-25>,
      "explanation": "<brief explanation>"
    }
  },
  "overallAnalysis": "<2-3 sentence summary of the stock's CANSLIM profile>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
  "recommendation": "<buy/hold/avoid with brief reasoning>"
}

Provide ONLY the JSON response, no additional text before or after.`;
}

/**
 * Company sector and industry classification from Gemini
 */
export interface SectorIndustryClassification {
  ticker: string;
  sector: string | null;
  industry: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Determines a stock's sector and industry using Gemini AI
 *
 * Uses Gemini 2.0 Flash to classify a stock into its appropriate sector and industry.
 * This is faster and more flexible than API lookups, and works for any publicly known company.
 *
 * @param ticker - Stock ticker symbol
 * @returns Sector and industry classification with confidence level
 * @throws {Error} If GEMINI_API_KEY is not configured or API call fails
 *
 * @example
 * const classification = await getSectorIndustryWithGemini('NVDA');
 * console.log(classification.sector);    // "Technology"
 * console.log(classification.industry);  // "Semiconductors"
 * console.log(classification.confidence); // "high"
 */
export async function getSectorIndustryWithGemini(
  ticker: string
): Promise<SectorIndustryClassification> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = buildSectorIndustryPrompt(ticker);

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    });

    const text = response.text;

    if (!text) {
      throw new Error('No response text received from Gemini API');
    }

    const classification = parseSectorIndustryResponse(text, ticker);
    return classification;
  } catch (error) {
    console.error('Error calling Gemini API for sector/industry:', error);
    throw new Error(`Failed to determine sector/industry: ${error}`);
  }
}

/**
 * Builds the prompt for Gemini to classify sector and industry
 */
function buildSectorIndustryPrompt(ticker: string): string {
  return `You are a financial data expert. Identify the sector and industry for the stock ticker: ${ticker.toUpperCase()}

**Task:** Determine the broad sector and MOST SPECIFIC industry for this company.

**Sector Options (choose one):**
- Technology
- Health Care (or Healthcare)
- Financials (or Financial Services)
- Consumer Discretionary (or Consumer Cyclical)
- Consumer Staples (or Consumer Defensive)
- Energy
- Industrials
- Materials (or Basic Materials)
- Utilities
- Real Estate
- Communication Services (or Communication, Telecommunications)

**Industry Options (BE AS SPECIFIC AS POSSIBLE - choose the most specific match):**

Technology Industries:
- Semiconductors (or Semiconductor) → maps to SOXX
- Software (or Software - Application, Software - Infrastructure) → maps to IGV
- (or use broader "Technology" → maps to XLK)

Health Care Industries:
- Biotechnology (or Biotech) → maps to XBI
- Medical Devices (or Medical Devices & Instruments) → maps to IHI
- Pharmaceuticals (or Drug Manufacturers, Drug Manufacturers - General, Drug Manufacturers - Specialty & Generic) → maps to IHE
- Healthcare Providers (or Healthcare Plans, Medical Care Facilities) → maps to IHF
- (or use broader "Health Care" → maps to XLV)

Financial Industries:
- Regional Banks (or Banks - Regional) → maps to KRE
- Insurance (or Insurance - Diversified, Insurance - Life, Insurance - Property & Casualty) → maps to IAK
- Financial Services (or Capital Markets, Asset Management) → maps to IYG
- (or use broader "Financials" → maps to XLF)

Consumer Discretionary Industries:
- Retail (or Retail - Apparel & Specialty, Retail - Cyclical) → maps to XRT
- Homebuilders (or Residential Construction, Home Builders, Homebuilding) → maps to ITB or XHB
- (or use broader "Consumer Discretionary" → maps to XLY)

Energy Industries:
- Oil & Gas E&P (or Oil & Gas Exploration & Production, Oil & Gas Exploration) → maps to XOP
- (or use broader "Energy" → maps to XLE)

Materials Industries:
- Metals & Mining (or Steel, Copper) → maps to XME
- Gold Miners (or Gold) → maps to GDX
- (or use broader "Materials" → maps to XLB)

Industrials Industries:
- Aerospace & Defense (or Aerospace, Defense) → maps to ITA
- Transportation (or Railroads, Airlines, Trucking) → maps to IYT
- (or use broader "Industrials" → maps to XLI)

Real Estate Industries:
- Residential Real Estate (or REIT - Residential) → maps to REZ
- Mortgage REITs (or REIT - Mortgage) → maps to REM
- (or use broader "Real Estate" → maps to XLRE)

Consumer Staples → maps to XLP
Utilities → maps to XLU
Communication Services → maps to XLC

**IMPORTANT:**
- Choose the MOST SPECIFIC industry that matches (e.g., prefer "Semiconductors" over "Technology")
- Use exact industry names from the list above when possible
- Sector should be one of the 11 broad categories

**Confidence Level:**
- high: Well-known company, clear classification
- medium: Less well-known but identifiable
- low: Uncertain or unknown ticker

**Response Format (MUST be valid JSON):**
{
  "sector": "<broad sector name>",
  "industry": "<most specific industry name from list>",
  "confidence": "<high|medium|low>"
}

Provide ONLY the JSON response, no additional text before or after.`;
}

/**
 * Parses Gemini's sector/industry response
 */
function parseSectorIndustryResponse(
  responseText: string,
  ticker: string
): SectorIndustryClassification {
  try {
    let jsonText = responseText.trim();

    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/^```json\s*\n?/i, '');
    jsonText = jsonText.replace(/\n?```\s*$/i, '');
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText);

    return {
      ticker: ticker.toUpperCase(),
      sector: parsed.sector || null,
      industry: parsed.industry || null,
      confidence: parsed.confidence || 'low'
    };
  } catch (error) {
    console.error('Failed to parse Gemini sector/industry response:', responseText);
    console.error('Parse error:', error);

    // Return null classification on parse error
    return {
      ticker: ticker.toUpperCase(),
      sector: null,
      industry: null,
      confidence: 'low'
    };
  }
}

/**
 * Parses Gemini's response and extracts the CANSLIM analysis
 *
 * Handles JSON parsing with fallback error handling:
 * - Removes markdown code block markers (```json)
 * - Validates response structure
 * - Returns default analysis if parsing fails
 *
 * @param responseText - Raw text response from Gemini API
 * @returns Parsed CANSLIM analysis object
 *
 * @example
 * const responseText = `{
 *   "totalScore": 87,
 *   "components": { ... },
 *   "overallAnalysis": "Strong stock with excellent growth",
 *   "strengths": ["High earnings growth", "Near 52-week high"],
 *   "weaknesses": ["Moderate volume"],
 *   "recommendation": "Buy"
 * }`;
 * const analysis = parseGeminiResponse(responseText);
 */
function parseGeminiResponse(responseText: string): CANSLIMAnalysis {
  try {
    // Remove markdown code blocks if present
    let jsonText = responseText.trim();

    // Remove ```json and ``` markers
    jsonText = jsonText.replace(/^```json\s*\n?/i, '');
    jsonText = jsonText.replace(/\n?```\s*$/i, '');
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText);

    // Validate structure
    if (!parsed.totalScore || !parsed.components || !parsed.components.C ||
        !parsed.components.A || !parsed.components.N || !parsed.components.S) {
      throw new Error('Invalid response structure from Gemini');
    }

    return parsed as CANSLIMAnalysis;
  } catch (error) {
    console.error('Failed to parse Gemini response:', responseText);
    console.error('Parse error:', error);

    // Return default fallback analysis
    return {
      totalScore: 50,
      components: {
        C: { score: 12, explanation: 'Unable to analyze current earnings' },
        A: { score: 12, explanation: 'Unable to analyze annual earnings' },
        N: { score: 13, explanation: 'Unable to analyze price position' },
        S: { score: 13, explanation: 'Unable to analyze volume' }
      },
      overallAnalysis: 'Analysis could not be completed due to parsing error',
      strengths: [],
      weaknesses: ['Unable to complete analysis'],
      recommendation: 'Manual review required'
    };
  }
}
