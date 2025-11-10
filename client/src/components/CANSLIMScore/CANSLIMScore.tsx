import { useState, useEffect } from 'react';
import { TotalScoreSection } from './TotalScoreSection';
import { ComponentsGrid } from './ComponentsGrid';
import { AnalysisSection } from './AnalysisSection';
import './CANSLIMScore.css';

/**
 * CANSLIM score component that displays comprehensive stock analysis based on
 * William O'Neil's CANSLIM methodology. Shows overall score, component breakdown
 * (Current Earnings, Annual Earnings, New Highs, Supply & Demand), and AI-generated
 * analysis with strengths, weaknesses, and recommendations.
 *
 * @param ticker - Stock ticker symbol to analyze
 *
 * @example
 * ```tsx
 * <CANSLIMScore ticker="AAPL" />
 * ```
 */

interface CANSLIMComponentScore {
  score: number;
  explanation: string;
}

interface CANSLIMMetrics {
  currentEarningsGrowth: number | null;
  annualEarningsGrowth: number | null;
  isNearHighs: boolean;
  distanceFromHigh: number;
  volumeRatio: number | null;
  currentPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  averageVolume: number;
  currentVolume: number;
}

interface CANSLIMAnalysis {
  overallAnalysis: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

interface CANSLIMScore {
  ticker: string;
  score: number;
  components: {
    C: CANSLIMComponentScore;
    A: CANSLIMComponentScore;
    N: CANSLIMComponentScore;
    S: CANSLIMComponentScore;
  };
  metrics: CANSLIMMetrics;
  analysis: CANSLIMAnalysis;
  calculatedAt: string;
}

interface CANSLIMScoreProps {
  ticker: string;
}

export function CANSLIMScore({ ticker }: CANSLIMScoreProps) {
  const [score, setScore] = useState<CANSLIMScore | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchScore = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/canslim?ticker=${ticker}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch CANSLIM score');
      }

      const data = await response.json();
      setScore(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const refreshScore = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const response = await fetch(`/api/canslim/refresh?ticker=${ticker}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh CANSLIM score');
      }

      const result = await response.json();
      setScore(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, [ticker]);

  if (loading) {
    return (
      <div className="canslim-container">
        <div className="canslim-loading">Loading CANSLIM score...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="canslim-container">
        <div className="canslim-error">
          <strong>Error:</strong> {error}
          <button onClick={fetchScore} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!score) {
    return null;
  }

  return (
    <div className="canslim-container">
      <div className="canslim-header">
        <h2>CANSLIM Score Analysis</h2>
        <button
          onClick={refreshScore}
          disabled={refreshing}
          className="refresh-button"
          title="Refresh CANSLIM score"
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      <TotalScoreSection score={score.score} calculatedAt={score.calculatedAt} />
      <ComponentsGrid components={score.components} metrics={score.metrics} />
      <AnalysisSection analysis={score.analysis} />
    </div>
  );
}
