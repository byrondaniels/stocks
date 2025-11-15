import { validateGeminiAPIKey, genAI, parseGeminiJSONSafe } from '../utils/gemini.utils';
import { createMCPClient } from '../utils/mcp.utils';
import { buildSpinoffAnalysisPrompt, buildSpinoffAnalysisPromptWithData } from '../prompts';

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
  validateGeminiAPIKey();

  const fallback: SpinoffAnalysis = {
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
    detailed_analysis: `# Analysis Error\n\nUnable to complete spinoff analysis for ${ticker.toUpperCase()}.`
  };

  try {
    console.log(`[Spinoff] Running AI analysis with MCP tools for ${ticker}...`);

    const mcpClient = await createMCPClient();
    let response;

    try {
      console.log(`[Spinoff] Retrieving SEC data for ${ticker}...`);

      console.log(`[Spinoff] MCP Call: search_company with query: ${ticker}`);
      const searchResult = await mcpClient.callTool({
        name: 'search_company',
        arguments: { query: ticker }
      });

      const searchData = JSON.parse(searchResult.content[0]?.text || '{}');
      console.log(`[Spinoff] MCP Response: search_company`, JSON.stringify(searchData, null, 2));
      if (!searchData.success || !searchData.data.length) {
        throw new Error(`Company not found for ticker: ${ticker}`);
      }

      const company = searchData.data[0];
      console.log(`[Spinoff] Found ${company.name} (CIK: ${company.cik})`);

      console.log(`[Spinoff] MCP Call: get_company_facts with CIK: ${company.cik}`);
      const factsResult = await mcpClient.callTool({
        name: 'get_company_facts',
        arguments: { cik: company.cik }
      });

      const factsData = JSON.parse(factsResult.content[0]?.text || '{}');
      console.log(`[Spinoff] MCP Response: get_company_facts`, JSON.stringify(factsData, null, 2));
      if (!factsData.success) {
        throw new Error(`Failed to get company facts: ${factsData.error}`);
      }

      const keyMetrics = factsData.data.keyMetrics;

      console.log(`[Spinoff] MCP Call: get_filings with CIK: ${company.cik}, form: 10-K, count: 2`);
      const filingsResult = await mcpClient.callTool({
        name: 'get_filings',
        arguments: {
          cik: company.cik,
          form: '10-K',
          count: 2
        }
      });

      const filingsData = JSON.parse(filingsResult.content[0]?.text || '{}');
      console.log(`[Spinoff] MCP Response: get_filings`, JSON.stringify(filingsData, null, 2));
      const recentFilings = filingsData.success ? filingsData.data : [];

      const promptWithRealData = buildSpinoffAnalysisPromptWithData(ticker, company, {
        keyMetrics,
        recentFilings
      });

      response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: promptWithRealData }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      });

      console.log(`[Spinoff] Analysis completed for ${company.name}`);

    } finally {
      await mcpClient.close();
    }

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response text received from Gemini API');
    }

    const analysis = parseGeminiJSONSafe<SpinoffAnalysis>(text, fallback);

    if (!analysis.executive_summary || !analysis.phase1_screening ||
        !analysis.phase2_quality || !analysis.phase3_valuation) {
      console.warn('Invalid spinoff analysis structure, using fallback');
      return fallback;
    }

    return analysis;
  } catch (error) {
    console.error('Error calling Gemini API for spinoff analysis:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to analyze spinoff: ${error}`);
  }
}
