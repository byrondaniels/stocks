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
 * Parses Gemini's response and extracts the CANSLIM analysis
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
