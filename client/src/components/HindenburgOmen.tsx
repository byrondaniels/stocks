/**
 * Hindenburg Omen Component
 * Displays the Hindenburg Omen market crash indicator
 */

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import './HindenburgOmen.css';

interface HindenburgOmenData {
  date: string;
  isActive: boolean;
  isMet: boolean;
  criteria: {
    highLowThreshold: {
      met: boolean;
      newHighs: number;
      newLows: number;
      threshold: number;
      newHighsPercent: number;
      newLowsPercent: number;
    };
    highLowRatio: {
      met: boolean;
      newHighs: number;
      newLows: number;
      ratio: number;
    };
    uptrend: {
      met: boolean;
      currentPrice: number;
      fiftyDayROC: number;
    };
    mcclellanOscillator: {
      met: boolean;
      value: number;
    };
  };
  activationDate?: string;
  daysRemaining?: number;
}

export function HindenburgOmen() {
  const [data, setData] = useState<HindenburgOmenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHindenburgOmen = async () => {
    setLoading(true);
    try {
      setError(null);
      const response = await fetch('/api/market-health/hindenburg-omen');
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to fetch: ${response.status}`);
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Hindenburg Omen data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHindenburgOmen();
  }, []);

  if (loading) {
    return (
      <div className="hindenburg-omen-card">
        <div className="card-header">
          <h2>Hindenburg Omen</h2>
          <span className="subtitle">Market Crash Indicator</span>
        </div>
        <div className="card-body">
          <div className="loading-state">Analyzing market conditions...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const getStatusColor = () => {
    if (data.isActive) return 'danger';
    if (data.criteria.highLowThreshold.met && data.criteria.highLowRatio.met) return 'warning';
    return 'safe';
  };

  const getStatusText = () => {
    if (data.isActive) return 'ACTIVE WARNING';
    if (data.criteria.highLowThreshold.met && data.criteria.highLowRatio.met) return 'PARTIAL SIGNAL';
    return 'NO SIGNAL';
  };

  const getStatusMessage = () => {
    if (data.isActive) {
      return 'Hindenburg Omen is ACTIVE. This is a rare market crash warning signal. Consider reducing risk exposure.';
    }
    const metCount = Object.values(data.criteria).filter(c => c.met).length;
    if (metCount >= 2) {
      return 'Multiple criteria met. Monitor market conditions closely.';
    }
    return 'Market conditions are currently normal. No Hindenburg Omen signal detected.';
  };

  return (
    <div className="hindenburg-omen-card">
      <div className="card-header">
        <h2>Hindenburg Omen</h2>
        <span className="subtitle">Market Crash Indicator</span>
        <button onClick={fetchHindenburgOmen} disabled={loading} className="refresh-button-small">
          {loading ? '↻' : '↻'}
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card-body">
        {/* Status Banner */}
        <div className={`omen-status status-${getStatusColor()}`}>
          <div className="status-icon">
            {data.isActive ? '⚠️' : data.criteria.highLowThreshold.met && data.criteria.highLowRatio.met ? '⚡' : '✓'}
          </div>
          <div className="status-content">
            <div className="status-title">{getStatusText()}</div>
            <div className="status-message">{getStatusMessage()}</div>
          </div>
        </div>

        {/* Criteria Grid */}
        <div className="criteria-grid">
          {/* Criterion 1: High/Low Threshold */}
          <div className={`criterion-card ${data.criteria.highLowThreshold.met ? 'met' : 'not-met'}`}>
            <div className="criterion-header">
              <span className="criterion-number">1</span>
              <span className="criterion-status">{data.criteria.highLowThreshold.met ? '✓' : '✗'}</span>
            </div>
            <div className="criterion-title">High/Low Threshold</div>
            <div className="criterion-description">
              Both new highs and lows must exceed 2.2%
            </div>
            <div className="criterion-values">
              <div className="value-row">
                <span className="label">New Highs:</span>
                <span className="value">
                  {data.criteria.highLowThreshold.newHighs} ({data.criteria.highLowThreshold.newHighsPercent.toFixed(2)}%)
                </span>
              </div>
              <div className="value-row">
                <span className="label">New Lows:</span>
                <span className="value">
                  {data.criteria.highLowThreshold.newLows} ({data.criteria.highLowThreshold.newLowsPercent.toFixed(2)}%)
                </span>
              </div>
              <div className="value-row">
                <span className="label">Threshold:</span>
                <span className="value">{data.criteria.highLowThreshold.threshold}%</span>
              </div>
            </div>
          </div>

          {/* Criterion 2: High/Low Ratio */}
          <div className={`criterion-card ${data.criteria.highLowRatio.met ? 'met' : 'not-met'}`}>
            <div className="criterion-header">
              <span className="criterion-number">2</span>
              <span className="criterion-status">{data.criteria.highLowRatio.met ? '✓' : '✗'}</span>
            </div>
            <div className="criterion-title">High/Low Ratio</div>
            <div className="criterion-description">
              Highs can&apos;t be more than 2x the lows
            </div>
            <div className="criterion-values">
              <div className="value-row">
                <span className="label">New Highs:</span>
                <span className="value">{data.criteria.highLowRatio.newHighs}</span>
              </div>
              <div className="value-row">
                <span className="label">New Lows:</span>
                <span className="value">{data.criteria.highLowRatio.newLows}</span>
              </div>
              <div className="value-row">
                <span className="label">Ratio:</span>
                <span className="value">{data.criteria.highLowRatio.ratio.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Criterion 3: Uptrend */}
          <div className={`criterion-card ${data.criteria.uptrend.met ? 'met' : 'not-met'}`}>
            <div className="criterion-header">
              <span className="criterion-number">3</span>
              <span className="criterion-status">{data.criteria.uptrend.met ? '✓' : '✗'}</span>
            </div>
            <div className="criterion-title">Market Uptrend</div>
            <div className="criterion-description">
              50-day Rate of Change must be positive
            </div>
            <div className="criterion-values">
              <div className="value-row">
                <span className="label">Current Price:</span>
                <span className="value">${data.criteria.uptrend.currentPrice.toFixed(2)}</span>
              </div>
              <div className="value-row">
                <span className="label">50-Day ROC:</span>
                <span className={`value ${data.criteria.uptrend.fiftyDayROC >= 0 ? 'positive' : 'negative'}`}>
                  {data.criteria.uptrend.fiftyDayROC >= 0 ? '+' : ''}{data.criteria.uptrend.fiftyDayROC.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Criterion 4: McClellan Oscillator */}
          <div className={`criterion-card ${data.criteria.mcclellanOscillator.met ? 'met' : 'not-met'}`}>
            <div className="criterion-header">
              <span className="criterion-number">4</span>
              <span className="criterion-status">{data.criteria.mcclellanOscillator.met ? '✓' : '✗'}</span>
            </div>
            <div className="criterion-title">McClellan Oscillator</div>
            <div className="criterion-description">
              MCO must be negative (bearish sentiment)
            </div>
            <div className="criterion-values">
              <div className="value-row">
                <span className="label">MCO Value:</span>
                <span className={`value ${data.criteria.mcclellanOscillator.value < 0 ? 'negative' : 'positive'}`}>
                  {data.criteria.mcclellanOscillator.value.toFixed(2)}
                </span>
              </div>
              <div className="value-row">
                <span className="label">Status:</span>
                <span className="value">
                  {data.criteria.mcclellanOscillator.value < 0 ? 'Bearish' : 'Bullish'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Information Box */}
        <div className="omen-info">
          <h3>About the Hindenburg Omen</h3>
          <p>
            The Hindenburg Omen is a technical analysis pattern that attempts to predict a stock market crash.
            It was named after the Hindenburg disaster, reflecting the indicator&apos;s ominous nature.
          </p>
          <p>
            <strong>Historical Context:</strong> The indicator has preceded some notable market crashes,
            including the 1987 Black Monday crash and the 2008 financial crisis. However, it&apos;s important
            to note that not all Hindenburg Omen signals result in crashes, and it should be used as one
            of many tools in risk assessment.
          </p>
          <p>
            <strong>Signal Duration:</strong> Once triggered, the signal remains active for 30 trading days.
            Additional signals during this period are ignored.
          </p>
        </div>
      </div>
    </div>
  );
}
