/**
 * Extension Meter Component
 * Displays how far SPY, NASDAQ, NVDA, and GOLD are above/below their 50-day moving average
 */

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import './ExtensionMeter.css';

interface ExtensionData {
  symbol: string;
  displayName: string;
  currentPrice?: number;
  ma50?: number;
  percentageExtension?: number;
  lastUpdated?: string;
  error?: string;
}

export function ExtensionMeter() {
  const [data, setData] = useState<ExtensionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExtensionData = async () => {
    setLoading(true);
    try {
      setError(null);
      const response = await fetch('/api/market-health/extension-meter');
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to fetch: ${response.status}`);
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load extension meter data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtensionData();
  }, []);

  const getExtensionColor = (percentage: number) => {
    if (percentage > 10) return 'very-extended-up';
    if (percentage > 5) return 'extended-up';
    if (percentage > 0) return 'slightly-up';
    if (percentage > -5) return 'slightly-down';
    if (percentage > -10) return 'extended-down';
    return 'very-extended-down';
  };

  const getExtensionLabel = (percentage: number) => {
    if (percentage > 10) return 'Very Extended';
    if (percentage > 5) return 'Extended';
    if (percentage > 0) return 'Above 50DMA';
    if (percentage > -5) return 'Below 50DMA';
    if (percentage > -10) return 'Extended Down';
    return 'Very Extended Down';
  };

  const formatPercent = (num: number) => {
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  const formatPrice = (num: number) => {
    return `$${num.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="extension-meter-card">
        <div className="card-header">
          <h2>Extension Meter</h2>
          <span className="subtitle">50-Day Moving Average Distance</span>
        </div>
        <div className="card-body">
          <div className="loading-state">Loading extension data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="extension-meter-card">
      <div className="card-header">
        <h2>Extension Meter</h2>
        <span className="subtitle">50-Day Moving Average Distance</span>
        <button onClick={fetchExtensionData} disabled={loading} className="refresh-button-small">
          {loading ? '↻' : '↻'}
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card-body">
        <div className="extension-grid">
          {data.map((item) => {
            if (item.error) {
              return (
                <div key={item.symbol} className="extension-item error">
                  <div className="extension-symbol">{item.displayName}</div>
                  <div className="extension-error">Data unavailable</div>
                </div>
              );
            }

            const percentage = item.percentageExtension ?? 0;

            return (
              <div key={item.symbol} className="extension-item">
                <div className="extension-header">
                  <div className="extension-symbol">{item.displayName}</div>
                  <div className={`extension-percentage ${getExtensionColor(percentage)}`}>
                    {formatPercent(percentage)}
                  </div>
                </div>

                <div className="extension-bar-container">
                  <div className="extension-bar">
                    <div className="bar-marker" style={{ left: '50%' }} />
                    <div
                      className={`bar-fill ${getExtensionColor(percentage)}`}
                      style={{
                        width: `${Math.abs(percentage) * 2}%`,
                        maxWidth: '50%',
                        marginLeft: percentage < 0 ? 'auto' : '50%',
                        marginRight: percentage < 0 ? '50%' : 'auto'
                      }}
                    />
                  </div>
                </div>

                <div className="extension-label">{getExtensionLabel(percentage)}</div>

                <div className="extension-details">
                  <div className="detail-row">
                    <span className="detail-label">Current:</span>
                    <span className="detail-value">{item.currentPrice ? formatPrice(item.currentPrice) : 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">50DMA:</span>
                    <span className="detail-value">{item.ma50 ? formatPrice(item.ma50) : 'N/A'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="extension-info">
          <p>
            <strong>Extension Meter</strong> shows how far each symbol's current price is from its 50-day moving average.
            Positive values indicate the price is above the 50DMA (bullish), while negative values indicate below (bearish).
            Values above +10% or below -10% suggest the asset may be overextended and due for a pullback or bounce.
          </p>
        </div>
      </div>
    </div>
  );
}
