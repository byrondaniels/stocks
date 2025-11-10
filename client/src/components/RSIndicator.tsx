import { useState, useEffect } from 'react';
import './RSIndicator.css';

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

  const getRatingColor = (rating: number): string => {
    if (rating >= 80) return '#22c55e'; // green - Strong
    if (rating >= 60) return '#84cc16'; // lime - Good
    if (rating >= 40) return '#eab308'; // yellow - Average
    if (rating >= 20) return '#f97316'; // orange - Weak
    return '#ef4444'; // red - Very Weak
  };

  const getRatingLabel = (rating: number): string => {
    if (rating >= 80) return 'Strong';
    if (rating >= 60) return 'Good';
    if (rating >= 40) return 'Average';
    if (rating >= 20) return 'Weak';
    return 'Very Weak';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatPerformance = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getPerformanceColor = (value: number): string => {
    return value >= 0 ? '#22c55e' : '#ef4444';
  };

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
        {/* Main RS Rating Gauge */}
        <div className="rs-gauge-section">
          <div className="rs-gauge">
            <svg viewBox="0 0 200 120" className="gauge-svg">
              {/* Background arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="20"
                strokeLinecap="round"
              />
              {/* Colored arc based on rating */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke={getRatingColor(rsData.rating)}
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray={`${(rsData.rating / 99) * 251.2} 251.2`}
              />
              {/* Rating text */}
              <text
                x="100"
                y="80"
                textAnchor="middle"
                className="gauge-rating"
                fill={getRatingColor(rsData.rating)}
              >
                {rsData.rating}
              </text>
              <text x="100" y="100" textAnchor="middle" className="gauge-label">
                out of 99
              </text>
            </svg>
          </div>

          <div className="rs-rating-info">
            <div
              className="rating-badge"
              style={{ backgroundColor: getRatingColor(rsData.rating) }}
            >
              {getRatingLabel(rsData.rating)}
            </div>
            <p className="rating-description">
              Outperforms <strong>{rsData.rating}%</strong> of all stocks
            </p>
            <p className="calculated-at">Updated: {formatDate(rsData.calculatedAt)}</p>
          </div>
        </div>

        {/* Performance Breakdown */}
        <div className="performance-section">
          <h3>Price Performance</h3>
          <div className="performance-grid">
            <PerformanceCard
              period="3 Months"
              value={rsData.pricePerformance.month3}
              formatValue={formatPerformance}
              getColor={getPerformanceColor}
            />
            <PerformanceCard
              period="6 Months"
              value={rsData.pricePerformance.month6}
              formatValue={formatPerformance}
              getColor={getPerformanceColor}
            />
            <PerformanceCard
              period="9 Months"
              value={rsData.pricePerformance.month9}
              formatValue={formatPerformance}
              getColor={getPerformanceColor}
            />
            <PerformanceCard
              period="12 Months"
              value={rsData.pricePerformance.month12}
              formatValue={formatPerformance}
              getColor={getPerformanceColor}
            />
          </div>
        </div>

        {/* Explanation */}
        <div className="rs-explanation">
          <h3>About RS Rating</h3>
          <p>
            The IBD Relative Strength (RS) Rating compares this stock's price performance
            over the past 12 months against all other stocks in your portfolio. A rating of{' '}
            <strong>{rsData.rating}</strong> means this stock has outperformed{' '}
            <strong>{rsData.rating}%</strong> of stocks.
          </p>
          <p>
            The rating uses a weighted calculation: 40% weight on the most recent 3 months,
            and 20% weight each on months 4-6, 7-9, and 10-12. Strong stocks typically have
            RS Ratings of 80 or higher.
          </p>
        </div>
      </div>
    </div>
  );
}

interface PerformanceCardProps {
  period: string;
  value: number;
  formatValue: (value: number) => string;
  getColor: (value: number) => string;
}

function PerformanceCard({ period, value, formatValue, getColor }: PerformanceCardProps) {
  return (
    <div className="performance-card">
      <div className="performance-period">{period}</div>
      <div className="performance-value" style={{ color: getColor(value) }}>
        {formatValue(value)}
      </div>
    </div>
  );
}
