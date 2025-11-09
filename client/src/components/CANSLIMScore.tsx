import { useState, useEffect } from 'react';
import './CANSLIMScore.css';

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

  const getScoreColor = (scoreValue: number): string => {
    if (scoreValue >= 75) return '#22c55e'; // green
    if (scoreValue >= 50) return '#eab308'; // yellow
    if (scoreValue >= 25) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

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

      {/* Total Score */}
      <div className="total-score-section">
        <div className="total-score-circle" style={{ borderColor: getScoreColor(score.score) }}>
          <div className="score-value" style={{ color: getScoreColor(score.score) }}>
            {score.score}
          </div>
          <div className="score-label">out of 100</div>
        </div>
        <div className="score-info">
          <p className="calculated-at">
            Calculated: {formatDate(score.calculatedAt)}
          </p>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="components-section">
        <h3>Component Breakdown</h3>
        <div className="components-grid">
          {/* C - Current Earnings */}
          <ComponentCard
            letter="C"
            title="Current Earnings"
            tooltip="Quarterly EPS growth year-over-year. Strong growth indicates robust earnings momentum."
            score={score.components.C.score}
            maxScore={25}
            explanation={score.components.C.explanation}
            metric={
              score.metrics.currentEarningsGrowth !== null
                ? `${score.metrics.currentEarningsGrowth.toFixed(2)}% YoY Growth`
                : 'N/A'
            }
          />

          {/* A - Annual Earnings */}
          <ComponentCard
            letter="A"
            title="Annual Earnings"
            tooltip="3-year average annual EPS growth. Consistent growth over time is key."
            score={score.components.A.score}
            maxScore={25}
            explanation={score.components.A.explanation}
            metric={
              score.metrics.annualEarningsGrowth !== null
                ? `${score.metrics.annualEarningsGrowth.toFixed(2)}% Avg Growth`
                : 'N/A'
            }
          />

          {/* N - New Highs */}
          <ComponentCard
            letter="N"
            title="New Highs"
            tooltip="How close the stock is to its 52-week high. Leaders tend to make new highs."
            score={score.components.N.score}
            maxScore={25}
            explanation={score.components.N.explanation}
            metric={`${score.metrics.distanceFromHigh.toFixed(1)}% from high ($${score.metrics.fiftyTwoWeekHigh.toFixed(2)})`}
          />

          {/* S - Supply & Demand */}
          <ComponentCard
            letter="S"
            title="Supply & Demand"
            tooltip="Volume ratio vs average. Higher volume suggests institutional accumulation."
            score={score.components.S.score}
            maxScore={25}
            explanation={score.components.S.explanation}
            metric={
              score.metrics.volumeRatio !== null
                ? `${score.metrics.volumeRatio.toFixed(2)}x avg volume`
                : 'N/A'
            }
          />
        </div>
      </div>

      {/* AI Analysis */}
      <div className="analysis-section">
        <h3>AI Analysis</h3>
        <div className="analysis-content">
          <div className="overall-analysis">
            <p>{score.analysis.overallAnalysis}</p>
          </div>

          <div className="analysis-grid">
            {score.analysis.strengths.length > 0 && (
              <div className="strengths">
                <h4>💪 Strengths</h4>
                <ul>
                  {score.analysis.strengths.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {score.analysis.weaknesses.length > 0 && (
              <div className="weaknesses">
                <h4>⚠️ Weaknesses</h4>
                <ul>
                  {score.analysis.weaknesses.map((weakness, index) => (
                    <li key={index}>{weakness}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="recommendation">
            <h4>Recommendation</h4>
            <p>{score.analysis.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ComponentCardProps {
  letter: string;
  title: string;
  tooltip: string;
  score: number;
  maxScore: number;
  explanation: string;
  metric: string;
}

function ComponentCard({
  letter,
  title,
  tooltip,
  score,
  maxScore,
  explanation,
  metric,
}: ComponentCardProps) {
  const percentage = (score / maxScore) * 100;

  return (
    <div className="component-card">
      <div className="component-header">
        <div className="component-letter">{letter}</div>
        <div className="component-title">
          {title}
          <span className="tooltip-icon" title={tooltip}>
            ℹ️
          </span>
        </div>
      </div>

      <div className="component-score">
        <span className="score-number">
          {score}/{maxScore}
        </span>
      </div>

      <div className="score-bar">
        <div
          className="score-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: score >= 20 ? '#22c55e' : score >= 15 ? '#eab308' : '#ef4444',
          }}
        />
      </div>

      <div className="component-metric">{metric}</div>
      <div className="component-explanation">{explanation}</div>
    </div>
  );
}
