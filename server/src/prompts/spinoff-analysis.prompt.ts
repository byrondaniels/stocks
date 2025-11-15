/**
 * Spinoff Analysis Prompt Templates
 */

export function buildSpinoffAnalysisPromptWithData(
  ticker: string,
  company: any,
  secData: any
): string {
  const keyMetrics = secData?.keyMetrics || {};
  const recentFilings = secData?.recentFilings || [];

  function formatMetric(metric: any) {
    if (!metric) return 'N/A';
    if (typeof metric.value === 'number') {
      return `$${(metric.value / 1e9).toFixed(1)}B (${metric.period || 'N/A'})`;
    }
    return 'N/A';
  }

  const systemPrompt = `You are a spinoff investment analyst. I have provided you with REAL SEC EDGAR financial data for this company.

COMPANY INFORMATION:
- Name: ${company.name}
- Ticker: ${company.ticker || ticker}
- CIK: ${company.cik}
- SIC: ${keyMetrics.sic || 'N/A'} - ${keyMetrics.sicDescription || 'N/A'}

REAL SEC EDGAR FINANCIAL DATA (Latest Available):
- Revenue: ${formatMetric(keyMetrics.metrics?.revenue)}
- Net Income: ${formatMetric(keyMetrics.metrics?.netIncome)}
- Total Assets: ${formatMetric(keyMetrics.metrics?.totalAssets)}
- Total Liabilities: ${formatMetric(keyMetrics.metrics?.totalLiabilities)}
- Stockholders Equity: ${formatMetric(keyMetrics.metrics?.stockholdersEquity)}
- Operating Income: ${formatMetric(keyMetrics.metrics?.operatingIncome)}
- Interest Expense: ${formatMetric(keyMetrics.metrics?.interestExpense)}
- Cash & Equivalents: ${formatMetric(keyMetrics.metrics?.cashAndEquivalents)}
- Current Assets: ${formatMetric(keyMetrics.metrics?.currentAssets)}
- Current Liabilities: ${formatMetric(keyMetrics.metrics?.currentLiabilities)}

RECENT SEC FILINGS:
${
  recentFilings.length > 0
    ? recentFilings
        .map(
          (f: any, i: number) =>
            `${i + 1}. ${f.form} filed on ${f.filingDate} (Report Date: ${f.reportDate || 'N/A'})`
        )
        .join('\n')
    : 'No recent filings data available'
}

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

PHASE 3 - VALUATION (calculate from provided SEC data):
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

IMPORTANT: This is a hypothetical spinoff analysis. Use the real SEC data provided above to calculate actual financial metrics and provide a comprehensive analysis.

Calculate actual metrics using the provided financial data:
- Use Operating Income and Interest Expense to calculate Interest Coverage Ratio
- Use Net Income and Revenue to calculate profit margins
- Use Assets and Liabilities to calculate debt metrics
- Show your calculations in the "calculation" field for each valuation metric

Return ONLY this JSON (no extra text):`;

  return (
    systemPrompt +
    `

{
  "company_name": "${company.name}",
  "ticker": "${company.ticker}",
  "analysis_date": "${new Date().toISOString().split('T')[0]}",
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
      {"name": "EV/EBITDA", "value": "", "threshold": "<15x", "meets_threshold": true|false, "calculation": "show work using SEC data"},
      {"name": "P/E", "value": "", "threshold": "<25x", "meets_threshold": true|false, "calculation": "show work using SEC data"},
      {"name": "FCF Yield", "value": "", "threshold": ">4%", "meets_threshold": true|false, "calculation": "show work using SEC data"},
      {"name": "Debt/EBITDA", "value": "", "threshold": "<3.5x", "meets_threshold": true|false, "calculation": "show work using SEC data"},
      {"name": "Interest Coverage", "value": "", "threshold": ">3x", "meets_threshold": true|false, "calculation": "show work using SEC data"}
    ]
  },
  "phase4_catalysts": [""],
  "red_flags": [""],
  "sources": [{"name": "SEC EDGAR", "url": "https://www.sec.gov/edgar"}],
  "detailed_analysis": "# markdown analysis here"
}

Use the real SEC financial data provided above to calculate accurate metrics and provide a thorough analysis.`
  );
}

export function buildSpinoffAnalysisPrompt(ticker: string): string {
  const systemPrompt = `You are a spinoff investment analyst with access to SEC EDGAR MCP tools. Use these tools to get accurate financial data.

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

  return `${systemPrompt}

**ANALYZE THIS TICKER: ${ticker.toUpperCase()}**

Follow the complete process above and return the analysis in the exact JSON format specified. Use MCP tools to get accurate SEC EDGAR data.`;
}
