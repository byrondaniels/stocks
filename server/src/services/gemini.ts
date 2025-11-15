import { validateGeminiAPIKey, callGeminiJSON } from '../utils/gemini.utils';
import { buildCANSLIMPrompt, buildSectorIndustryPrompt } from '../prompts';

/**
 * CANSLIM metrics interface for scoring
 */
export interface CANSLIMMetrics {
  currentEarningsGrowth: number | null;
  annualEarningsGrowth: number | null;
  isNearHighs: boolean;
  distanceFromHigh: number;
  volumeRatio: number | null;
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
  score: number;
  explanation: string;
}

/**
 * Complete CANSLIM analysis result from Gemini
 */
export interface CANSLIMAnalysis {
  totalScore: number;
  components: {
    C: CANSLIMComponentScore;
    A: CANSLIMComponentScore;
    N: CANSLIMComponentScore;
    S: CANSLIMComponentScore;
  };
  overallAnalysis: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
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
 * Analyzes CANSLIM metrics using Gemini AI and returns scored analysis
 *
 * @param metrics - Stock metrics including earnings, price, and volume data
 * @returns Complete CANSLIM analysis with scores and recommendation
 * @throws {Error} If GEMINI_API_KEY is not configured or API call fails
 *
 * @example
 * const analysis = await analyzeCANSLIMWithGemini(metrics);
 * console.log(analysis.totalScore);  // e.g., 87
 */
export async function analyzeCANSLIMWithGemini(
  metrics: CANSLIMMetrics
): Promise<CANSLIMAnalysis> {
  validateGeminiAPIKey();

  const prompt = buildCANSLIMPrompt(metrics);

  const fallback: CANSLIMAnalysis = {
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

  try {
    const analysis = await callGeminiJSON<CANSLIMAnalysis>(
      'gemini-2.0-flash',
      prompt,
      fallback
    );

    if (!analysis.totalScore || !analysis.components?.C || !analysis.components?.A ||
        !analysis.components?.N || !analysis.components?.S) {
      console.warn('Invalid CANSLIM response structure, using fallback');
      return fallback;
    }

    return analysis;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error(`Failed to analyze CANSLIM metrics: ${error}`);
  }
}

/**
 * Determines a stock's sector and industry using Gemini AI
 *
 * @param ticker - Stock ticker symbol
 * @returns Sector and industry classification with confidence level
 * @throws {Error} If GEMINI_API_KEY is not configured or API call fails
 *
 * @example
 * const classification = await getSectorIndustryWithGemini('NVDA');
 * console.log(classification.sector);    // "Technology"
 */
export async function getSectorIndustryWithGemini(
  ticker: string
): Promise<SectorIndustryClassification> {
  validateGeminiAPIKey();

  const prompt = buildSectorIndustryPrompt(ticker);

  const fallback: SectorIndustryClassification = {
    ticker: ticker.toUpperCase(),
    sector: null,
    industry: null,
    confidence: 'low'
  };

  try {
    const parsed = await callGeminiJSON<any>('gemini-2.0-flash', prompt, fallback);

    return {
      ticker: ticker.toUpperCase(),
      sector: parsed.sector || null,
      industry: parsed.industry || null,
      confidence: parsed.confidence || 'low'
    };
  } catch (error) {
    console.error('Error calling Gemini API for sector/industry:', error);
    throw new Error(`Failed to determine sector/industry: ${error}`);
  }
}
