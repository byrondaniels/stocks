import { formatCurrency } from '../../utils/formatters';
import { MovingAverageData } from '../../types';

interface MovingAverageSectionProps {
  loading: boolean;
  data: MovingAverageData | null;
}

/**
 * Displays 50-day moving average analysis with visual indicators for
 * bullish or bearish signals.
 *
 * @param loading - Whether data is currently being loaded
 * @param data - Moving average data including current price, 50DMA, and percentage difference
 *
 * @example
 * ```tsx
 * <MovingAverageSection
 *   loading={false}
 *   data={{
 *     currentPrice: 175.50,
 *     movingAverage50: 165.00,
 *     percentageDifference: 6.36,
 *     priceCount: 50,
 *     latestDate: '2024-01-15'
 *   }}
 * />
 * ```
 */
export function MovingAverageSection({ loading, data }: MovingAverageSectionProps) {
  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <>
      <div className="section-divider"></div>
      <h2>50-Day Moving Average</h2>
      <div className="moving-average-section">
        {loading ? (
          <div className="loading-state">Loading 50DMA data...</div>
        ) : data && data.movingAverage50 ? (
          <div className="ma-content">
            <div className="ma-stats">
              <div className="ma-stat-card">
                <div className="stat-label">Current Price</div>
                <div className="stat-value">{formatCurrency(data.currentPrice)}</div>
              </div>
              <div className="ma-stat-card">
                <div className="stat-label">50-Day MA</div>
                <div className="stat-value">{formatCurrency(data.movingAverage50)}</div>
              </div>
              <div className="ma-stat-card">
                <div className="stat-label">% Difference</div>
                <div className={`stat-value ${data.percentageDifference && data.percentageDifference >= 0 ? 'profit' : 'loss'}`}>
                  {formatPercent(data.percentageDifference)}
                </div>
              </div>
            </div>
            <div className="ma-indicator">
              <div className="indicator-bar">
                <div
                  className={`indicator-fill ${data.percentageDifference && data.percentageDifference >= 0 ? 'above' : 'below'}`}
                  style={{
                    width: `${Math.min(Math.abs(data.percentageDifference || 0) * 2, 100)}%`
                  }}
                ></div>
              </div>
              <div className="indicator-label">
                {data.percentageDifference && data.percentageDifference >= 0
                  ? '📈 Price is above 50-day MA (Bullish)'
                  : '📉 Price is below 50-day MA (Bearish)'}
              </div>
            </div>
          </div>
        ) : (
          <div className="no-data">Moving average data not available. Try refreshing.</div>
        )}
      </div>
    </>
  );
}
