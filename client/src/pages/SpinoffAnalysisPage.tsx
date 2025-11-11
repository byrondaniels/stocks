import { useState } from 'react';
import { SpinoffAnalysis } from '../components/SpinoffAnalysis';
import './SpinoffAnalysisPage.css';

/**
 * Spinoff Analysis Page
 *
 * Dedicated page for analyzing spinoff investments using Joel Greenblatt's framework.
 * Users can enter a ticker symbol to get comprehensive spinoff analysis.
 */
export function SpinoffAnalysisPage() {
  const [tickerInput, setTickerInput] = useState('');
  const [analyzedTicker, setAnalyzedTicker] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = () => {
    const ticker = tickerInput.trim().toUpperCase();

    if (!ticker) {
      setError('Please enter a ticker symbol');
      return;
    }

    // Basic validation
    if (!/^[A-Z]{1,5}$/.test(ticker)) {
      setError('Please enter a valid ticker symbol (1-5 letters)');
      return;
    }

    setError(null);
    setAnalyzedTicker(ticker);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  const handleReset = () => {
    setAnalyzedTicker(null);
    setTickerInput('');
    setError(null);
  };

  return (
    <div className="app">
      <div className="spinoff-page-container">
        {/* Page Header */}
        <header className="spinoff-page-header">
          <div className="header-content">
            <h1>
              <span className="header-icon">📚</span>
              Joel Greenblatt - Spinoff Analysis
            </h1>
            <p className="header-subtitle">
              Analyze potential spinoff investments using the proven framework
            </p>
          </div>
        </header>

        {/* Ticker Input Section */}
        <div className="analyze-spinoff-section">
          <div className="input-container">
            <label htmlFor="ticker-input" className="input-label">
              Analyze Spinoff
            </label>
            <div className="input-row">
              <input
                id="ticker-input"
                type="text"
                className="ticker-input-field"
                placeholder="Enter ticker symbol (e.g., AAPL, GOOGL, MSFT)"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                maxLength={5}
                autoFocus
              />
              <button
                className="analyze-btn"
                onClick={handleAnalyze}
              >
                Analyze
              </button>
              {analyzedTicker && (
                <button
                  className="reset-btn"
                  onClick={handleReset}
                >
                  Reset
                </button>
              )}
            </div>
            {error && <div className="input-error">{error}</div>}
          </div>
        </div>

        {/* Analysis Results */}
        {analyzedTicker && (
          <div className="analysis-results">
            <SpinoffAnalysis ticker={analyzedTicker} />
          </div>
        )}

        {/* Empty State */}
        {!analyzedTicker && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h2>Ready to Analyze</h2>
            <p>
              Enter a ticker symbol above to get a comprehensive spinoff investment analysis
              based on Joel Greenblatt's proven methodology.
            </p>
            <div className="framework-info">
              <h3>Analysis Framework:</h3>
              <ul>
                <li>✓ Phase 1: Screening Criteria</li>
                <li>✓ Phase 2: Quality Assessment</li>
                <li>✓ Phase 3: Valuation Metrics</li>
                <li>✓ Phase 4: Catalysts & Red Flags</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
