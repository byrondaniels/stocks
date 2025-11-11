import { GoogleGenAI } from '@google/genai';

// Initialize Gemini AI with new SDK
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

/**
 * Spinoff screening criteria result
 */
export interface ScreeningCriterion {
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

/**
 * Phase 1 screening results
 */
export interface Phase1Screening {
  passed: boolean;
  criteria: ScreeningCriterion[];
}

/**
 * Quality metric with weighted score
 */
export interface QualityMetric {
  score: number; // 1-5
  weight: number; // decimal weight
  explanation: string;
}

/**
 * Phase 2 quality assessment
 */
export interface Phase2Quality {
  competitive_position: QualityMetric;
  revenue_quality: QualityMetric;
  profitability: QualityMetric;
  management: QualityMetric;
  strategic_value: QualityMetric;
  weighted_average: number;
}

/**
 * Valuation metric with threshold
 */
export interface ValuationMetric {
  name: string;
  value: string;
  threshold: string;
  meets_threshold: boolean;
  calculation: string;
}

/**
 * Phase 3 valuation metrics
 */
export interface Phase3Valuation {
  metrics: ValuationMetric[];
}

/**
 * Data source reference
 */
export interface DataSource {
  name: string;
  url: string;
}

/**
 * Executive summary of spinoff analysis
 */
export interface ExecutiveSummary {
  overall_score: number;
  recommendation: 'BUY' | 'PASS' | 'AVOID';
  position_size: string;
  key_thesis: string;
}

/**
 * Complete spinoff analysis result
 */
export interface SpinoffAnalysis {
  company_name: string;
  ticker: string;
  analysis_date: string;
  executive_summary: ExecutiveSummary;
  phase1_screening: Phase1Screening;
  phase2_quality: Phase2Quality;
  phase3_valuation: Phase3Valuation;
  phase4_catalysts: string[];
  red_flags: string[];
  sources: DataSource[];
  detailed_analysis: string;
}

/**
 * Analyzes a potential spinoff investment using Gemini AI with SEC EDGAR data access
 *
 * Uses Google's Gemini 2.0 Flash model to perform comprehensive spinoff analysis
 * following a 4-phase framework:
 * - Phase 1: Screening (must pass all criteria)
 * - Phase 2: Quality assessment (weighted scoring)
 * - Phase 3: Valuation metrics
 * - Phase 4: Catalyst identification
 *
 * The system prompt instructs Gemini to use MCP tools for SEC EDGAR data when available,
 * ensuring accurate financial information from official filings.
 *
 * @param ticker - Stock ticker symbol to analyze
 * @returns Complete spinoff analysis with recommendation
 * @throws {Error} If GEMINI_API_KEY is not configured or API call fails
 *
 * @example
 * const analysis = await analyzeSpinoffWithGemini('GOOGL');
 * console.log(analysis.executive_summary.recommendation); // 'BUY' | 'PASS' | 'AVOID'
 * console.log(analysis.executive_summary.overall_score); // e.g., 4.2
 */
export async function analyzeSpinoffWithGemini(
  ticker: string
): Promise<SpinoffAnalysis> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = buildSpinoffAnalysisPrompt(ticker);

  try {
    // Use Gemini 2.0 Flash with the spinoff analysis system prompt
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    const text = response.text;

    if (!text) {
      throw new Error('No response text received from Gemini API');
    }

    // Parse JSON response from Gemini
    const analysis = parseSpinoffResponse(text, ticker);

    return analysis;
  } catch (error) {
    console.error('Error calling Gemini API for spinoff analysis:', error);
    throw new Error(`Failed to analyze spinoff: ${error}`);
  }
}

/**
 * Builds the comprehensive spinoff analysis prompt with MCP tool instructions
 *
 * This prompt instructs Gemini to:
 * 1. Use SEC EDGAR MCP tools to gather accurate financial data
 * 2. Apply the 4-phase spinoff analysis framework
 * 3. Identify screening criteria, quality metrics, valuation, and catalysts
 * 4. Return structured JSON with detailed analysis
 *
 * @param ticker - Stock ticker symbol
 * @returns Formatted prompt for Gemini API
 */
function buildSpinoffAnalysisPrompt(ticker: string): string {
  const SYSTEM_PROMPT = `You are a spinoff investment analyst with access to SEC EDGAR MCP tools. Use these tools to get accurate financial data.

AVAILABLE MCP TOOLS:
- search_company: Find company CIK
- get_filings: Get 10-K, 8-K, Form 10, proxy statements
- get_financial_statements: Extract exact financial data from XBRL
- get_company_facts: Get standardized financial facts

ANALYSIS FRAMEWORK:

PHASE 1 - SCREENING (all must pass):
- Parent: Market cap >$5B OR FCF >$500M
- Parent: Positive FCF last 12 months
- Spinoff: Revenue >$500M
- Spinoff: Strong market position (#1-3)
- Spinoff: Standalone viable
- Debt/EBITDA <4x

PHASE 2 - QUALITY (score 1-5):
- Competitive Position (30%): 5=dominant, 1=weak
- Revenue Quality (25%): 5=>70% recurring, 1=<10%
- Profitability (20%): 5=ROIC>20%, 1=<5%
- Management (15%): 5=proven track record, 1=inexperienced
- Strategic Value (10%): 5=clear benefits, 1=none
Calculate weighted average.

PHASE 3 - VALUATION (calculate from MCP data):
- EV/EBITDA <15x
- P/E <25x
- FCF Yield >4%
- Debt/EBITDA <3.5x
- Interest Coverage >3x

PHASE 4 - CATALYSTS:
Identify: forced selling, hidden value, management incentives, operational improvements

RED FLAGS (auto-disqualify):
- Parent in financial distress
- No standalone management experience
- Customer concentration >30%
- Disruptive technology threat

PROCESS:
1. Use search_company to find CIK for the ticker
2. Use get_filings to find latest 10-K, 8-K (spinoff announcement), Form 10
3. Use get_financial_statements to extract exact financial data
4. Use get_company_facts for standardized metrics
5. Apply framework rigorously
6. Return ONLY this JSON (no extra text):

{
  "company_name": "",
  "ticker": "",
  "analysis_date": "",
  "executive_summary": {
    "overall_score": 0.0,
    "recommendation": "BUY|PASS|AVOID",
    "position_size": "",
    "key_thesis": ""
  },
  "phase1_screening": {
    "passed": true|false,
    "criteria": [{"name": "", "status": "PASS|FAIL", "details": ""}]
  },
  "phase2_quality": {
    "competitive_position": {"score": 0, "weight": 0.30, "explanation": ""},
    "revenue_quality": {"score": 0, "weight": 0.25, "explanation": ""},
    "profitability": {"score": 0, "weight": 0.20, "explanation": ""},
    "management": {"score": 0, "weight": 0.15, "explanation": ""},
    "strategic_value": {"score": 0, "weight": 0.10, "explanation": ""},
    "weighted_average": 0.0
  },
  "phase3_valuation": {
    "metrics": [
      {"name": "EV/EBITDA", "value": "", "threshold": "<15x", "meets_threshold": true|false, "calculation": "show work"},
      {"name": "P/E", "value": "", "threshold": "<25x", "meets_threshold": true|false, "calculation": "show work"},
      {"name": "FCF Yield", "value": "", "threshold": ">4%", "meets_threshold": true|false, "calculation": "show work"},
      {"name": "Debt/EBITDA", "value": "", "threshold": "<3.5x", "meets_threshold": true|false, "calculation": "show work"},
      {"name": "Interest Coverage", "value": "", "threshold": ">3x", "meets_threshold": true|false, "calculation": "show work"}
    ]
  },
  "phase4_catalysts": [""],
  "red_flags": [""],
  "sources": [{"name": "", "url": ""}],
  "detailed_analysis": "# markdown analysis here"
}

Rules:
- ALWAYS use MCP tools to get SEC data - never guess
- Get exact numbers from XBRL via get_financial_statements
- Show all calculations
- If data missing, say "N/A"
- Return ONLY valid JSON`;

  return `${SYSTEM_PROMPT}

**ANALYZE THIS TICKER: ${ticker.toUpperCase()}**

Follow the complete process above and return the analysis in the exact JSON format specified. Use MCP tools to get accurate SEC EDGAR data.`;
}

/**
 * Parses Gemini's spinoff analysis response
 *
 * Handles JSON parsing with fallback error handling:
 * - Removes markdown code block markers
 * - Validates response structure
 * - Returns error analysis if parsing fails
 *
 * @param responseText - Raw text response from Gemini API
 * @param ticker - Ticker being analyzed (for fallback)
 * @returns Parsed spinoff analysis object
 */
function parseSpinoffResponse(responseText: string, ticker: string): SpinoffAnalysis {
  try {
    // Remove markdown code blocks if present
    let jsonText = responseText.trim();

    // Remove ```json and ``` markers
    jsonText = jsonText.replace(/^```json\s*\n?/i, '');
    jsonText = jsonText.replace(/\n?```\s*$/i, '');
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText);

    // Validate structure
    if (!parsed.executive_summary || !parsed.phase1_screening ||
        !parsed.phase2_quality || !parsed.phase3_valuation) {
      throw new Error('Invalid response structure from Gemini');
    }

    return parsed as SpinoffAnalysis;
  } catch (error) {
    console.error('Failed to parse Gemini spinoff response:', responseText);
    console.error('Parse error:', error);

    // Return fallback analysis indicating error
    return {
      company_name: ticker.toUpperCase(),
      ticker: ticker.toUpperCase(),
      analysis_date: new Date().toISOString().split('T')[0],
      executive_summary: {
        overall_score: 0,
        recommendation: 'AVOID',
        position_size: '0%',
        key_thesis: 'Analysis failed due to parsing error. Manual review required.'
      },
      phase1_screening: {
        passed: false,
        criteria: [{
          name: 'Analysis Error',
          status: 'FAIL',
          details: 'Unable to complete analysis due to technical error'
        }]
      },
      phase2_quality: {
        competitive_position: { score: 0, weight: 0.30, explanation: 'N/A' },
        revenue_quality: { score: 0, weight: 0.25, explanation: 'N/A' },
        profitability: { score: 0, weight: 0.20, explanation: 'N/A' },
        management: { score: 0, weight: 0.15, explanation: 'N/A' },
        strategic_value: { score: 0, weight: 0.10, explanation: 'N/A' },
        weighted_average: 0
      },
      phase3_valuation: {
        metrics: [
          { name: 'EV/EBITDA', value: 'N/A', threshold: '<15x', meets_threshold: false, calculation: 'Error' },
          { name: 'P/E', value: 'N/A', threshold: '<25x', meets_threshold: false, calculation: 'Error' },
          { name: 'FCF Yield', value: 'N/A', threshold: '>4%', meets_threshold: false, calculation: 'Error' },
          { name: 'Debt/EBITDA', value: 'N/A', threshold: '<3.5x', meets_threshold: false, calculation: 'Error' },
          { name: 'Interest Coverage', value: 'N/A', threshold: '>3x', meets_threshold: false, calculation: 'Error' }
        ]
      },
      phase4_catalysts: [],
      red_flags: ['Analysis parsing error - manual review required'],
      sources: [],
      detailed_analysis: `# Analysis Error\n\nUnable to complete spinoff analysis for ${ticker.toUpperCase()} due to parsing error.\n\nRaw response:\n\`\`\`\n${responseText.substring(0, 500)}...\n\`\`\``
    };
  }
}
