import { useState, useEffect } from 'react';
import { RSGaugeSection } from './RSGaugeSection';
import { RSExplanation } from './RSExplanation';
import './RSIndicator.css';

/**
 * Relative Strength (RS) indicator component that displays sector and stock strength.
 * Shows two gauge visualizations:
 * - Sector RS: How the stock's industry ETF performs vs SPY
 * - Stock RS: How the stock performs vs its industry ETF
 *
 * @param ticker - Stock ticker symbol to analyze
 *
 * @example
 * ```tsx
 * <RSIndicator ticker="AAPL" />
 * ```
 */

interface RSRating {
  ticker: string;
  sectorRS: number; // 1-99 (Industry ETF vs SPY)
  stockRS: number;  // 1-99 (Stock vs Industry ETF)
  sectorETF: string | null; // Which ETF was used, or null if fallback to SPY
  sector: string | null; // The stock's sector
  industry: string | null; // The stock's industry
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
        <h2>Relative Strength Analysis</h2>
        <button
          onClick={refreshRating}
          disabled={refreshing}
          className="refresh-button"
          title="Refresh RS rating"
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {(rsData.sector || rsData.industry || rsData.sectorETF) && (
        <div className="rs-sector-info">
          {rsData.sector && <div>Sector: <strong>{rsData.sector}</strong></div>}
          {rsData.industry && <div>Industry: <strong>{rsData.industry}</strong></div>}
          {rsData.sectorETF && <div>Benchmark ETF: <strong>{rsData.sectorETF}</strong></div>}
        </div>
      )}

      <div className="rs-content">
        <div className="rs-gauges-container">
          <RSGaugeSection
            rating={rsData.sectorRS}
            calculatedAt={rsData.calculatedAt}
            label="Sector Strength"
            description={rsData.sectorETF ? `${rsData.sectorETF} vs SPY` : "No sector data"}
          />
          <RSGaugeSection
            rating={rsData.stockRS}
            calculatedAt={rsData.calculatedAt}
            label="Stock Strength"
            description={rsData.sectorETF ? `${ticker} vs ${rsData.sectorETF}` : `${ticker} vs SPY`}
          />
        </div>
        <RSExplanation sectorRS={rsData.sectorRS} stockRS={rsData.stockRS} sectorETF={rsData.sectorETF} />
      </div>
    </div>
  );
}
