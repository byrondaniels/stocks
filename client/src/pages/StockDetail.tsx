import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface StockDetailData {
  ticker: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  lastUpdated?: string;
}

export function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [stock, setStock] = useState<StockDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) {
      navigate('/portfolio');
      return;
    }

    const fetchStockDetail = async () => {
      try {
        setError(null);
        const response = await fetch(`/api/portfolio/${encodeURIComponent(ticker)}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? `Failed to fetch stock details: ${response.status}`);
        }
        const data = await response.json();
        setStock(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stock details');
      } finally {
        setLoading(false);
      }
    };

    fetchStockDetail();
  }, [ticker, navigate]);

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '-';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined) return '-';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-state">Loading stock details...</div>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="app">
        <div className="alert error">{error || 'Stock not found'}</div>
        <button onClick={() => navigate('/portfolio')} className="btn-back">
          Back to Portfolio
        </button>
      </div>
    );
  }

  const totalValue = stock.currentPrice !== undefined ? stock.currentPrice * stock.shares : 0;
  const totalCost = stock.purchasePrice * stock.shares;
  const isProfitable = stock.profitLoss !== undefined && stock.profitLoss >= 0;

  return (
    <div className="app">
      <button onClick={() => navigate('/portfolio')} className="btn-back">
        ← Back to Portfolio
      </button>

      <header>
        <h1>{stock.ticker}</h1>
        <p>Stock Details</p>
      </header>

      <div className="stock-detail">
        <div className="detail-grid">
          <div className="detail-card">
            <div className="detail-label">Purchase Information</div>
            <div className="detail-row">
              <span className="detail-key">Shares:</span>
              <span className="detail-value">{stock.shares}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">Purchase Price:</span>
              <span className="detail-value">{formatCurrency(stock.purchasePrice)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">Purchase Date:</span>
              <span className="detail-value">{new Date(stock.purchaseDate).toLocaleDateString()}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">Total Cost:</span>
              <span className="detail-value">{formatCurrency(totalCost)}</span>
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-label">Current Value</div>
            <div className="detail-row">
              <span className="detail-key">Current Price:</span>
              <span className="detail-value">{formatCurrency(stock.currentPrice)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">Total Value:</span>
              <span className="detail-value">{formatCurrency(totalValue)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">Last Updated:</span>
              <span className="detail-value">{formatDate(stock.lastUpdated)}</span>
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-label">Performance</div>
            <div className="detail-row">
              <span className="detail-key">Profit/Loss:</span>
              <span className={`detail-value ${isProfitable ? 'profit' : 'loss'}`}>
                {formatCurrency(stock.profitLoss)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-key">Profit/Loss %:</span>
              <span className={`detail-value ${isProfitable ? 'profit' : 'loss'}`}>
                {formatPercent(stock.profitLossPercent)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
