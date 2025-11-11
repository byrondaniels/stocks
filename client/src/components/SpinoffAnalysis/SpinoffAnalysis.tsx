import { useState, useEffect } from 'react';
import { SpinoffAnalysis as SpinoffAnalysisType } from '../../types';
import { ExecutiveSummarySection } from './ExecutiveSummarySection';
import { ScreeningSection } from './ScreeningSection';
import { QualitySection } from './QualitySection';
import { ValuationSection } from './ValuationSection';
import { CatalystsSection } from './CatalystsSection';
import { DetailedAnalysisSection } from './DetailedAnalysisSection';
import './SpinoffAnalysis.css';

/**
 * Spinoff Analysis Component
 *
 * Displays comprehensive spinoff investment analysis using AI-powered
 * evaluation across 4 phases:
 * - Phase 1: Screening criteria (pass/fail)
 * - Phase 2: Quality assessment (weighted scoring)
 * - Phase 3: Valuation metrics
 * - Phase 4: Catalyst identification
 *
 * Integrates with SEC EDGAR data via MCP tools for accurate financial information.
 *
 * @param ticker - Stock ticker symbol to analyze
 *
 * @example
 * ```tsx
 * <SpinoffAnalysis ticker="GOOGL" />
 * ```
 */

interface SpinoffAnalysisProps {
  ticker: string;
}

export function SpinoffAnalysis({ ticker }: SpinoffAnalysisProps) {
  const [analysis, setAnalysis] = useState<SpinoffAnalysisType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/spinoff?ticker=${ticker}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch spinoff analysis');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalysis = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const response = await fetch(`/api/spinoff/refresh?ticker=${ticker}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh spinoff analysis');
      }

      const result = await response.json();
      setAnalysis(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [ticker]);

  if (loading) {
    return (
      <div className="spinoff-container">
        <div className="spinoff-loading">
          <div className="loading-spinner"></div>
          <p>Analyzing spinoff opportunity...</p>
          <p className="loading-subtext">This may take a moment while we gather SEC data and perform analysis.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spinoff-container">
        <div className="spinoff-error">
          <strong>Error:</strong> {error}
          <button onClick={fetchAnalysis} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="spinoff-container">
      <div className="spinoff-header">
        <div className="header-content">
          <h2>Spinoff Investment Analysis</h2>
          <p className="header-subtitle">{analysis.company_name} ({analysis.ticker})</p>
        </div>
        <button
          onClick={refreshAnalysis}
          disabled={refreshing}
          className="refresh-button"
          title="Refresh spinoff analysis"
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      <ExecutiveSummarySection summary={analysis.executive_summary} />

      <ScreeningSection screening={analysis.phase1_screening} />

      <QualitySection quality={analysis.phase2_quality} />

      <ValuationSection valuation={analysis.phase3_valuation} />

      <CatalystsSection
        catalysts={analysis.phase4_catalysts}
        redFlags={analysis.red_flags}
      />

      <DetailedAnalysisSection
        detailedAnalysis={analysis.detailed_analysis}
        sources={analysis.sources}
        analysisDate={analysis.analysis_date}
      />
    </div>
  );
}
