/**
 * Gemini AI Service
 * Main service for AI-powered stock analysis features
 *
 * This service uses the centralized Gemini client and prompts to provide:
 * - CANSLIM methodology analysis
 * - Sector and industry classification
 */

import { getGeminiClient, GEMINI_MODELS, parseGeminiJSON } from './ai/index.js';
import { buildCANSLIMPrompt, buildSectorIndustryPrompt } from '../prompts/index.js';

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
  const client = getGeminiClient();
  const prompt = buildCANSLIMPrompt(metrics);

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    });

    const text = response.text;

    if (!text) {
      throw new Error('No response text received from Gemini API');
    }

    // Define fallback analysis
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

    // Parse JSON response from Gemini with centralized utility
    const analysis = parseGeminiJSON<CANSLIMAnalysis>(text, fallback);

    // Validate structure
    if (!analysis.totalScore || !analysis.components || !analysis.components.C ||
        !analysis.components.A || !analysis.components.N || !analysis.components.S) {
      console.warn('[Gemini] Invalid CANSLIM analysis structure, using fallback');
      return fallback;
    }

    return analysis;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error(`Failed to analyze CANSLIM metrics: ${error}`);
  }
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
  const client = getGeminiClient();
  const prompt = buildSectorIndustryPrompt(ticker);

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    });

    const text = response.text;

    if (!text) {
      throw new Error('No response text received from Gemini API');
    }

    // Define fallback classification
    const fallback: SectorIndustryClassification = {
      ticker: ticker.toUpperCase(),
      sector: null,
      industry: null,
      confidence: 'low'
    };

    const parsed = parseGeminiJSON<Partial<SectorIndustryClassification>>(text, {});

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

