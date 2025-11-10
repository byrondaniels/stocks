import { FormEvent, useState } from 'react';
import { AddWatchlistFormData } from '../types';
import { normalizeTicker } from '../../../shared/validation';
import { useTickerValidation } from '../hooks/useTickerValidation';

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
  const { validateTicker } = useTickerValidation();

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

  return (
    <div className="add-stock-form-container">
      <h2>Add Stock to Watchlist</h2>
      <form onSubmit={handleSubmit} className="add-stock-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ticker">Ticker Symbol</label>
            <input
              id="ticker"
              type="text"
              value={formData.ticker}
              onChange={(e) => handleChange('ticker', e.target.value)}
              placeholder="e.g., AAPL"
              disabled={loading}
              className={errors.ticker ? 'error' : ''}
            />
            {errors.ticker && <span className="error-message">{errors.ticker}</span>}
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
