/**
 * CANSLIM Analysis Prompt
 * Analyzes stock metrics according to William O'Neil's CANSLIM methodology
 */

import type { CANSLIMMetrics } from '../services/gemini.js';

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
 * const metrics = {
 *   ticker: 'AAPL',
 *   currentEarningsGrowth: 28.5,
 *   annualEarningsGrowth: 22.3,
 *   // ... other metrics
 * };
 * const prompt = buildCANSLIMPrompt(metrics);
 * // Returns comprehensive CANSLIM analysis prompt
 */
export function buildCANSLIMPrompt(metrics: CANSLIMMetrics): string {
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
