/**
 * MarketHealth Page
 * Displays overall stock market health indicators including VIX, breadth, and fear/greed index
 */

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MarketHealthData } from '../types';
import { ExtensionMeter } from '../components/ExtensionMeter';
import { HindenburgOmen } from '../components/HindenburgOmen';
import './MarketHealth.css';

export function MarketHealth() {
  const [data, setData] = useState<MarketHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = 'Market Health - Stock Portfolio';
  }, []);

  // Data fetching function
  const fetchMarketHealth = async () => {
    setLoading(true);
    try {
      setError(null);
      const response = await fetch('/api/market-health');
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to fetch: ${response.status}`);
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load market health data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketHealth();
  }, []);

  const getVixLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'green';
      case 'moderate': return 'yellow';
      case 'high': return 'orange';
      case 'extreme': return 'red';
      default: return 'gray';
    }
  };

  const getFearGreedColor = (rating: string) => {
    switch (rating) {
      case 'extreme-fear': return 'red';
      case 'fear': return 'orange';
      case 'neutral': return 'gray';
      case 'greed': return 'lightgreen';
      case 'extreme-greed': return 'green';
      default: return 'gray';
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercent = (num: number) => {
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  if (loading && !data) {
    return (
      <div className="market-health-page">
        <h1>Market Health</h1>
        <div className="loading-state">Loading market data...</div>
      </div>
    );
  }

  return (
    <div className="market-health-page">
      <div className="page-header">
        <h1>Market Health Dashboard</h1>
        <button onClick={fetchMarketHealth} disabled={loading} className="refresh-button">
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <HindenburgOmen />

      <ExtensionMeter />

      {data && (
        <div className="health-grid">
          {/* VIX Section */}
          <div className="health-card vix-card">
            <div className="card-header">
              <h2>VIX (Volatility Index)</h2>
              <span className="subtitle">Market Fear Gauge</span>
            </div>
            <div className="card-body">
              <div className={`big-number vix-${getVixLevelColor(data.vix.level)}`}>
                {formatNumber(data.vix.value)}
              </div>
              <div className="metric-details">
                <span className={data.vix.change >= 0 ? 'positive' : 'negative'}>
                  {formatPercent(data.vix.changePercent)} ({data.vix.change >= 0 ? '+' : ''}{formatNumber(data.vix.change)})
                </span>
              </div>
              <div className={`level-badge level-${getVixLevelColor(data.vix.level)}`}>
                {data.vix.level.toUpperCase()} VOLATILITY
              </div>
              <div className="interpretation">
                {data.vix.value < 15 && <p>Low volatility - Market is calm and complacent</p>}
                {data.vix.value >= 15 && data.vix.value < 20 && <p>Moderate volatility - Normal market conditions</p>}
                {data.vix.value >= 20 && data.vix.value < 30 && <p>High volatility - Increased uncertainty and fear</p>}
                {data.vix.value >= 30 && <p>Extreme volatility - Market stress and panic</p>}
              </div>
              <div className="last-updated">Updated: {new Date(data.vix.lastUpdated).toLocaleString()}</div>
            </div>
          </div>

          {/* Fear & Greed Index */}
          <div className="health-card fear-greed-card">
            <div className="card-header">
              <h2>Fear & Greed Index</h2>
              <span className="subtitle">Market Sentiment</span>
            </div>
            <div className="card-body">
              <div className={`big-number fg-${getFearGreedColor(data.fearGreed.rating)}`}>
                {data.fearGreed.value}
              </div>
              <div className={`level-badge level-${getFearGreedColor(data.fearGreed.rating)}`}>
                {data.fearGreed.rating.toUpperCase().replace('-', ' ')}
              </div>
              <div className="fear-greed-gauge">
                <div className="gauge-bar">
                  <div
                    className="gauge-fill"
                    style={{
                      width: `${data.fearGreed.value}%`,
                      backgroundColor: getFearGreedColor(data.fearGreed.rating)
                    }}
                  />
                </div>
                <div className="gauge-labels">
                  <span>Fear (0)</span>
                  <span>Neutral (50)</span>
                  <span>Greed (100)</span>
                </div>
              </div>
              <div className="interpretation">
                {data.fearGreed.value < 25 && <p>Extreme fear - Potential buying opportunity</p>}
                {data.fearGreed.value >= 25 && data.fearGreed.value < 45 && <p>Fear - Market is cautious</p>}
                {data.fearGreed.value >= 45 && data.fearGreed.value < 55 && <p>Neutral sentiment</p>}
                {data.fearGreed.value >= 55 && data.fearGreed.value < 75 && <p>Greed - Market optimism</p>}
                {data.fearGreed.value >= 75 && <p>Extreme greed - Potential market top</p>}
              </div>
              <div className="last-updated">Updated: {new Date(data.fearGreed.lastUpdated).toLocaleString()}</div>
            </div>
          </div>

          {/* Market Breadth */}
          <div className="health-card breadth-card">
            <div className="card-header">
              <h2>Market Breadth</h2>
              <span className="subtitle">NYSE Advance/Decline</span>
            </div>
            <div className="card-body">
              <div className="breadth-metrics">
                <div className="breadth-row">
                  <span className="label">Advancing:</span>
                  <span className="value positive">{data.breadth.nyseAdvances.toLocaleString()}</span>
                </div>
                <div className="breadth-row">
                  <span className="label">Declining:</span>
                  <span className="value negative">{data.breadth.nyseDeclines.toLocaleString()}</span>
                </div>
                <div className="breadth-row major">
                  <span className="label">A/D Ratio:</span>
                  <span className={`value ${data.breadth.advanceDeclineRatio > 1 ? 'positive' : 'negative'}`}>
                    {formatNumber(data.breadth.advanceDeclineRatio)}
                  </span>
                </div>
              </div>
              <div className="breadth-bar">
                <div className="breadth-visual">
                  <div
                    className="advances"
                    style={{
                      width: `${(data.breadth.nyseAdvances / (data.breadth.nyseAdvances + data.breadth.nyseDeclines)) * 100}%`
                    }}
                  />
                </div>
              </div>
              <div className="breadth-metrics" style={{ marginTop: '1.5rem' }}>
                <div className="breadth-row">
                  <span className="label">New Highs:</span>
                  <span className="value positive">{data.breadth.newHighs.toLocaleString()}</span>
                </div>
                <div className="breadth-row">
                  <span className="label">New Lows:</span>
                  <span className="value negative">{data.breadth.newLows.toLocaleString()}</span>
                </div>
                <div className="breadth-row major">
                  <span className="label">H/L Ratio:</span>
                  <span className={`value ${data.breadth.highLowRatio > 1 ? 'positive' : 'negative'}`}>
                    {formatNumber(data.breadth.highLowRatio)}
                  </span>
                </div>
              </div>
              <div className="interpretation">
                {data.breadth.advanceDeclineRatio > 2 && <p>Strong breadth - Broad market participation</p>}
                {data.breadth.advanceDeclineRatio > 1 && data.breadth.advanceDeclineRatio <= 2 && <p>Positive breadth - More stocks advancing</p>}
                {data.breadth.advanceDeclineRatio >= 0.5 && data.breadth.advanceDeclineRatio <= 1 && <p>Weak breadth - More stocks declining</p>}
                {data.breadth.advanceDeclineRatio < 0.5 && <p>Very weak breadth - Selling pressure</p>}
              </div>
              <div className="last-updated">Updated: {new Date(data.breadth.lastUpdated).toLocaleString()}</div>
            </div>
          </div>

          {/* Major Indices */}
          <div className="health-card indices-card">
            <div className="card-header">
              <h2>Major Indices</h2>
              <span className="subtitle">Market Overview</span>
            </div>
            <div className="card-body">
              <div className="index-row">
                <div className="index-name">S&P 500</div>
                <div className="index-value">{formatNumber(data.indices.sp500.value)}</div>
                <div className={`index-change ${data.indices.sp500.change >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercent(data.indices.sp500.changePercent)}
                  <span className="change-value">
                    ({data.indices.sp500.change >= 0 ? '+' : ''}{formatNumber(data.indices.sp500.change)})
                  </span>
                </div>
              </div>
              <div className="index-row">
                <div className="index-name">Dow Jones</div>
                <div className="index-value">{formatNumber(data.indices.dow.value)}</div>
                <div className={`index-change ${data.indices.dow.change >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercent(data.indices.dow.changePercent)}
                  <span className="change-value">
                    ({data.indices.dow.change >= 0 ? '+' : ''}{formatNumber(data.indices.dow.change)})
                  </span>
                </div>
              </div>
              <div className="index-row">
                <div className="index-name">NASDAQ</div>
                <div className="index-value">{formatNumber(data.indices.nasdaq.value)}</div>
                <div className={`index-change ${data.indices.nasdaq.change >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercent(data.indices.nasdaq.changePercent)}
                  <span className="change-value">
                    ({data.indices.nasdaq.change >= 0 ? '+' : ''}{formatNumber(data.indices.nasdaq.change)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
