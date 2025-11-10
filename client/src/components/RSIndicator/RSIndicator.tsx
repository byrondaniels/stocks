import { useState, useEffect } from 'react';
import { RSGaugeSection } from './RSGaugeSection';
import { PerformanceGrid } from './PerformanceGrid';
import { RSExplanation } from './RSExplanation';
import './RSIndicator.css';

/**
 * Relative Strength (RS) indicator component that displays IBD-style RS rating.
 * Shows a gauge visualization, price performance breakdown, and methodology explanation.
 * The RS rating compares a stock's 12-month price performance against all other stocks,
 * with higher ratings (80+) indicating stronger relative performance.
 *
 * @param ticker - Stock ticker symbol to analyze
 *
 * @example
 * ```tsx
 * <RSIndicator ticker="AAPL" />
 * ```
 */

interface RSPricePerformance {
  month3: number;
  month6: number;
  month9: number;
  month12: number;
  weightedScore: number;
}

interface RSRating {
  ticker: string;
  rating: number; // 1-99
  pricePerformance: RSPricePerformance;
  calculatedAt: string;
}

interface RSIndicatorProps {
  ticker: string;
}

export function RSIndicator({ ticker }: RSIndicatorProps) {
  const [rsData, setRsData] = useState<RSRating | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchRating = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/rs?ticker=${ticker}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch RS rating');
      }

      const data = await response.json();
      setRsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const refreshRating = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const response = await fetch(`/api/rs/refresh?ticker=${ticker}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh RS rating');
      }

      const result = await response.json();
      setRsData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRating();
  }, [ticker]);

  if (loading) {
    return (
      <div className="rs-container">
        <div className="rs-loading">Loading RS Rating...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rs-container">
        <div className="rs-error">
          <strong>Error:</strong> {error}
          <button onClick={fetchRating} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!rsData) {
    return null;
  }

  return (
    <div className="rs-container">
      <div className="rs-header">
        <h2>IBD Relative Strength Rating</h2>
        <button
          onClick={refreshRating}
          disabled={refreshing}
          className="refresh-button"
          title="Refresh RS rating"
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      <div className="rs-content">
        <RSGaugeSection rating={rsData.rating} calculatedAt={rsData.calculatedAt} />
        <PerformanceGrid pricePerformance={rsData.pricePerformance} />
        <RSExplanation rating={rsData.rating} />
      </div>
    </div>
  );
}
