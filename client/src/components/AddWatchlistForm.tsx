import { FormEvent, useState, useEffect, useRef } from 'react';
import { AddWatchlistFormData, RecentlySearchedStock } from '../types';
import { normalizeTicker } from '../../../shared/validation';
import { useTickerValidation } from '../hooks/useTickerValidation';
import { getRecentSearches } from '../utils/recentSearches';

interface AddWatchlistFormProps {
  onAdd: (data: AddWatchlistFormData) => Promise<void>;
  loading: boolean;
}

export function AddWatchlistForm({ onAdd, loading }: AddWatchlistFormProps) {
  const [formData, setFormData] = useState<AddWatchlistFormData>({
    ticker: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddWatchlistFormData, string>>>({});
  const [recentSearches, setRecentSearches] = useState<RecentlySearchedStock[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { validateTicker } = useTickerValidation();

  // Load recent searches on mount
  useEffect(() => {
    const loadRecentSearches = async () => {
      const searches = await getRecentSearches();
      setRecentSearches(searches);
    };
    loadRecentSearches();
  }, []);

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddWatchlistFormData, string>> = {};

    // Validate ticker using the hook
    const tickerError = validateTicker(formData.ticker);
    if (tickerError) {
      newErrors.ticker = tickerError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onAdd({
        ticker: normalizeTicker(formData.ticker),
        notes: formData.notes,
      });

      // Reset form on success
      setFormData({
        ticker: '',
        notes: '',
      });
      setErrors({});

      // Refresh recent searches list
      const searches = await getRecentSearches();
      setRecentSearches(searches);
    } catch {
      // Error handling is done in parent component
    }
  };

  const handleChange = (field: keyof AddWatchlistFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleTickerFocus = () => {
    if (recentSearches.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleRecentSearchClick = (ticker: string) => {
    setFormData((prev) => ({ ...prev, ticker }));
    setShowDropdown(false);
    // Clear ticker error if present
    if (errors.ticker) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.ticker;
        return newErrors;
      });
    }
  };

  return (
    <div className="add-stock-form-container">
      <h2>Add Stock to Watchlist</h2>
      <form onSubmit={handleSubmit} className="add-stock-form">
        <div className="form-row">
          <div className="form-group ticker-input-container">
            <label htmlFor="ticker">Ticker Symbol</label>
            <input
              ref={inputRef}
              id="ticker"
              type="text"
              value={formData.ticker}
              onChange={(e) => handleChange('ticker', e.target.value)}
              onFocus={handleTickerFocus}
              placeholder="e.g., AAPL"
              disabled={loading}
              className={errors.ticker ? 'error' : ''}
              autoComplete="off"
            />
            {errors.ticker && <span className="error-message">{errors.ticker}</span>}

            {showDropdown && recentSearches.length > 0 && (
              <div ref={dropdownRef} className="recent-searches-dropdown">
                <div className="dropdown-header">Recently Searched</div>
                {recentSearches.map((stock) => (
                  <div
                    key={stock.ticker}
                    className="recent-search-item"
                    onClick={() => handleRecentSearchClick(stock.ticker)}
                  >
                    <span className="ticker">{stock.ticker}</span>
                    <span className="company-name">{stock.companyName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes (optional)</label>
            <input
              id="notes"
              type="text"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Why are you watching this stock?"
              disabled={loading}
            />
          </div>

          <div className="form-group form-submit">
            <button type="submit" disabled={loading} className="btn-add">
              {loading ? 'Adding...' : 'Add to Watchlist'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
