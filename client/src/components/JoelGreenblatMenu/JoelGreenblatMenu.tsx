import { useState } from 'react';
import { SpinoffAnalysis } from '../SpinoffAnalysis';
import './JoelGreenblatMenu.css';

/**
 * Joel Greenblatt Menu Component
 *
 * Dropdown menu providing access to Joel Greenblatt's investment strategies,
 * including spinoff analysis. Users can enter a ticker symbol to analyze
 * potential spinoff investments.
 */
export function JoelGreenblatMenu() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [tickerInput, setTickerInput] = useState('');
  const [analyzedTicker, setAnalyzedTicker] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleSpinoffClick = () => {
    setIsAnalysisOpen(true);
    setIsDropdownOpen(false);
  };

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

  const handleClose = () => {
    setIsAnalysisOpen(false);
    setAnalyzedTicker(null);
    setTickerInput('');
    setError(null);
  };

  return (
    <div className="joel-greenblat-menu">
      <div className="menu-header">
        <button
          className="dropdown-toggle"
          onClick={toggleDropdown}
          aria-expanded={isDropdownOpen}
        >
          <span className="menu-icon">📚</span>
          Joel Greenblatt
          <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
        </button>
      </div>

      {isDropdownOpen && (
        <div className="dropdown-menu">
          <button
            className="dropdown-item"
            onClick={handleSpinoffClick}
          >
            <span className="item-icon">🔄</span>
            Spinoff Analysis
          </button>
        </div>
      )}

      {isAnalysisOpen && (
        <div className="spinoff-section">
          <div className="spinoff-header-bar">
            <h3>Spinoff Analysis</h3>
            <button className="close-button" onClick={handleClose}>×</button>
          </div>

          {!analyzedTicker ? (
            <div className="ticker-input-section">
              <p className="input-description">
                Enter a ticker symbol to analyze potential spinoff investment opportunities
                using Joel Greenblatt's framework.
              </p>
              <div className="input-group">
                <input
                  type="text"
                  className="ticker-input"
                  placeholder="e.g., AAPL, GOOGL, MSFT"
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  maxLength={5}
                />
                <button
                  className="analyze-button"
                  onClick={handleAnalyze}
                >
                  Analyze
                </button>
              </div>
              {error && <div className="error-message">{error}</div>}
            </div>
          ) : (
            <div className="analysis-content">
              <div className="analysis-toolbar">
                <button
                  className="change-ticker-button"
                  onClick={() => {
                    setAnalyzedTicker(null);
                    setTickerInput('');
                  }}
                >
                  ← Change Ticker
                </button>
              </div>
              <SpinoffAnalysis ticker={analyzedTicker} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
