import { useState, useEffect } from 'react';
import { SpinoffAnalysis } from '../SpinoffAnalysis';
import './JoelGreenblatMenu.css';

/**
 * Joel Greenblatt Menu Component
 *
 * Modal providing access to Joel Greenblatt's investment strategies,
 * including spinoff analysis. Users can enter a ticker symbol to analyze
 * potential spinoff investments.
 */
interface JoelGreenblatMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoelGreenblatMenu({ isOpen, onClose }: JoelGreenblatMenuProps) {
  const [tickerInput, setTickerInput] = useState('');
  const [analyzedTicker, setAnalyzedTicker] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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
    setAnalyzedTicker(null);
    setTickerInput('');
    setError(null);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Modal Overlay */}
      <div className="modal-overlay" onClick={handleClose} />

      {/* Modal Content */}
      <div className="joel-greenblatt-modal">
        <div className="modal-header">
          <h2>
            <span className="modal-icon">📚</span>
            Joel Greenblatt - Spinoff Analysis
          </h2>
          <button className="modal-close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
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
                  autoFocus
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
      </div>
    </>
  );
}
