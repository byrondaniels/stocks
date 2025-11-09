import { FormEvent, useState } from 'react';
import { AddStockFormData } from '../types';
import { TICKER_REGEX, normalizeTicker } from '../utils/validation';

interface AddStockFormProps {
  onAdd: (data: AddStockFormData) => Promise<void>;
  loading: boolean;
}

export function AddStockForm({ onAdd, loading }: AddStockFormProps) {
  const [formData, setFormData] = useState<AddStockFormData>({
    ticker: '',
    shares: '',
    purchasePrice: '',
    purchaseDate: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddStockFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddStockFormData, string>> = {};

    // Validate ticker
    const trimmedTicker = normalizeTicker(formData.ticker);
    if (!trimmedTicker) {
      newErrors.ticker = 'Ticker is required';
    } else if (!TICKER_REGEX.test(trimmedTicker)) {
      newErrors.ticker = 'Invalid ticker format (e.g., AAPL or BRK.B)';
    }

    // Validate shares
    const shares = parseFloat(formData.shares);
    if (!formData.shares) {
      newErrors.shares = 'Shares is required';
    } else if (isNaN(shares) || shares <= 0) {
      newErrors.shares = 'Shares must be a positive number';
    }

    // Validate purchase price
    const price = parseFloat(formData.purchasePrice);
    if (!formData.purchasePrice) {
      newErrors.purchasePrice = 'Purchase price is required';
    } else if (isNaN(price) || price <= 0) {
      newErrors.purchasePrice = 'Purchase price must be a positive number';
    }

    // Validate purchase date
    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required';
    } else {
      const date = new Date(formData.purchaseDate);
      const today = new Date();
      if (isNaN(date.getTime())) {
        newErrors.purchaseDate = 'Invalid date format';
      } else if (date > today) {
        newErrors.purchaseDate = 'Purchase date cannot be in the future';
      }
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
        ...formData,
        ticker: normalizeTicker(formData.ticker),
      });

      // Reset form on success
      setFormData({
        ticker: '',
        shares: '',
        purchasePrice: '',
        purchaseDate: '',
      });
      setErrors({});
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleChange = (field: keyof AddStockFormData, value: string) => {
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
      <h2>Add Stock to Portfolio</h2>
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
            <label htmlFor="shares">Shares</label>
            <input
              id="shares"
              type="number"
              step="any"
              value={formData.shares}
              onChange={(e) => handleChange('shares', e.target.value)}
              placeholder="e.g., 10"
              disabled={loading}
              className={errors.shares ? 'error' : ''}
            />
            {errors.shares && <span className="error-message">{errors.shares}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="purchasePrice">Purchase Price ($)</label>
            <input
              id="purchasePrice"
              type="number"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) => handleChange('purchasePrice', e.target.value)}
              placeholder="e.g., 150.25"
              disabled={loading}
              className={errors.purchasePrice ? 'error' : ''}
            />
            {errors.purchasePrice && (
              <span className="error-message">{errors.purchasePrice}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="purchaseDate">Purchase Date</label>
            <input
              id="purchaseDate"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => handleChange('purchaseDate', e.target.value)}
              disabled={loading}
              className={errors.purchaseDate ? 'error' : ''}
            />
            {errors.purchaseDate && (
              <span className="error-message">{errors.purchaseDate}</span>
            )}
          </div>

          <div className="form-group form-submit">
            <button type="submit" disabled={loading} className="btn-add">
              {loading ? 'Adding...' : 'Add Stock'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
