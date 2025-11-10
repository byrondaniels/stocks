import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PriceLineChart } from '../components/PriceLineChart';
import { InsiderData, OwnershipData, MovingAverageData, CANSLIMScore, PriceHistoryPoint } from '../types';
import OwnershipPieChart from '../components/OwnershipPieChart';
import { CANSLIMScore as CANSLIMScoreComponent } from '../components/CANSLIMScore';
import { RSIndicator } from '../components/RSIndicator';
import { formatCurrency } from '../utils/formatters';
import { HISTORICAL_DAYS_DEFAULT } from '../constants';
import './StockDetail.css';

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

interface EditFormData {
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
}

export function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [stock, setStock] = useState<StockDetailData | null>(null);
  const [insiderData, setInsiderData] = useState<InsiderData | null>(null);
  const [ownershipData, setOwnershipData] = useState<OwnershipData | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInsiders, setLoadingInsiders] = useState(true);
  const [loadingOwnership, setLoadingOwnership] = useState(true);
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(true);
  const [movingAverageData, setMovingAverageData] = useState<MovingAverageData | null>(null);
  const [loadingMA, setLoadingMA] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    shares: 0,
    purchasePrice: 0,
    purchaseDate: '',
  });

  const fetchStockDetail = async () => {
    if (!ticker) return;

    try {
      setError(null);
      const response = await fetch(`/api/portfolio/${encodeURIComponent(ticker)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to fetch stock details: ${response.status}`);
      }
      const data = await response.json();
      setStock(data);
      setEditForm({
        shares: data.shares,
        purchasePrice: data.purchasePrice,
        purchaseDate: data.purchaseDate.split('T')[0],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock details');
    } finally {
      setLoading(false);
    }
  };

  const fetchInsiderData = async () => {
    if (!ticker) return;

    try {
      setLoadingInsiders(true);
      const response = await fetch(`/api/insiders?ticker=${encodeURIComponent(ticker)}`);
      if (response.ok) {
        const data = await response.json();
        setInsiderData(data);
      }
    } catch (err) {
      console.error('Failed to fetch insider data:', err);
    } finally {
      setLoadingInsiders(false);
    }
  };

  const fetchOwnershipData = async () => {
    if (!ticker) return;

    try {
      setLoadingOwnership(true);
      const response = await fetch(`/api/stock/ownership?ticker=${encodeURIComponent(ticker)}`);
      if (response.ok) {
        const data = await response.json();
        setOwnershipData(data);
      }
    } catch (err) {
      console.error('Failed to fetch ownership data:', err);
    } finally {
      setLoadingOwnership(false);
    }
  };

  const fetchMovingAverageData = async () => {
    if (!ticker) return;

    try {
      setLoadingMA(true);
      const response = await fetch(`/api/stock/historical?ticker=${encodeURIComponent(ticker)}&days=${HISTORICAL_DAYS_DEFAULT}`);
      if (response.ok) {
        const data = await response.json();
        // Calculate 50DMA from historical data
        if (data.prices && data.prices.length > 0) {
          const prices = data.prices.map((p: any) => p.close);
          const sum = prices.reduce((a: number, b: number) => a + b, 0);
          const avg = sum / prices.length;
          const currentPrice = prices[0];
          const percentDiff = ((currentPrice - avg) / avg) * 100;

          setMovingAverageData({
            currentPrice,
            movingAverage50: avg,
            percentageDifference: percentDiff,
            priceCount: prices.length,
            latestDate: data.prices[0].date,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch moving average data:', err);
    } finally {
      setLoadingMA(false);
    }
  };

  useEffect(() => {
    if (!ticker) {
      navigate('/portfolio');
      return;
    }

    // Set page title
    document.title = `${ticker} - Stock Portfolio`;

    fetchStockDetail();
    fetchInsiderData();
    fetchOwnershipData();
    fetchMovingAverageData();
  }, [ticker, navigate]);

  const handleRefresh = async () => {
    if (!ticker) return;

    setRefreshing(true);
    try {
      // Refresh portfolio data
      await fetch(`/api/portfolio/${ticker}/refresh`, { method: 'POST' });

      // Refetch all data
      await Promise.all([
        fetchStockDetail(),
        fetchInsiderData(),
        fetchOwnershipData(),
        fetchMovingAverageData(),
      ]);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEdit = async () => {
    if (!ticker) return;

    try {
      const response = await fetch(`/api/portfolio/${ticker}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setShowEditForm(false);
        await fetchStockDetail();
      }
    } catch (err) {
      console.error('Failed to update stock:', err);
    }
  };

  const handleDelete = async () => {
    if (!ticker) return;

    try {
      const response = await fetch(`/api/portfolio/${ticker}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        navigate('/portfolio');
      }
    } catch (err) {
      console.error('Failed to delete stock:', err);
    }
  };

  useEffect(() => {
    if (!ticker) return;

    const fetchPriceHistory = async () => {
      try {
        setLoadingPriceHistory(true);
        const response = await fetch(`/api/stock/historical?ticker=${encodeURIComponent(ticker)}&days=${HISTORICAL_DAYS_DEFAULT}`);
        if (response.ok) {
          const data = await response.json();
          setPriceHistory(data.prices || []);
        }
      } catch (err) {
        console.error('Failed to fetch price history:', err);
      } finally {
        setLoadingPriceHistory(false);
      }
    };

    fetchPriceHistory();
  }, [ticker]);

  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
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
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol className="breadcrumb-list">
          <li className="breadcrumb-item">
            <button onClick={() => navigate('/portfolio')} className="breadcrumb-link">
              Portfolio
            </button>
          </li>
          <li className="breadcrumb-separator">/</li>
          <li className="breadcrumb-item breadcrumb-current" aria-current="page">
            {stock.ticker}
          </li>
        </ol>
      </nav>

      {/* Stock Header */}
      <div className="stock-header">
        <div className="header-main">
          <h1 className="ticker-symbol">{stock.ticker}</h1>
          <div className="current-price">
            {formatCurrency(stock.currentPrice)}
          </div>
        </div>
        <div className="header-secondary">
          <span className={`price-change ${isProfitable ? 'profit' : 'loss'}`}>
            {formatCurrency(stock.profitLoss)} ({formatPercent(stock.profitLossPercent)})
          </span>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="actions-bar">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-action btn-refresh"
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh Data'}
        </button>
        <button
          onClick={() => setShowEditForm(!showEditForm)}
          className="btn-action btn-edit"
        >
          ✎ Edit Position
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="btn-action btn-delete"
        >
          × Remove Stock
        </button>
      </div>

      {/* Edit Form */}
      {showEditForm && (
        <div className="edit-form-section">
          <h3>Edit Position</h3>
          <div className="edit-form">
            <div className="form-row">
              <label>
                Shares:
                <input
                  type="number"
                  value={editForm.shares}
                  onChange={(e) => setEditForm({ ...editForm, shares: parseFloat(e.target.value) })}
                />
              </label>
              <label>
                Purchase Price:
                <input
                  type="number"
                  step="0.01"
                  value={editForm.purchasePrice}
                  onChange={(e) => setEditForm({ ...editForm, purchasePrice: parseFloat(e.target.value) })}
                />
              </label>
              <label>
                Purchase Date:
                <input
                  type="date"
                  value={editForm.purchaseDate}
                  onChange={(e) => setEditForm({ ...editForm, purchaseDate: e.target.value })}
                />
              </label>
            </div>
            <div className="form-actions">
              <button onClick={handleEdit} className="btn-save">Save</button>
              <button onClick={() => setShowEditForm(false)} className="btn-cancel">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="delete-confirmation">
          <div className="confirmation-content">
            <h3>Confirm Removal</h3>
            <p>Are you sure you want to remove {stock.ticker} from your portfolio?</p>
            <div className="confirmation-actions">
              <button onClick={handleDelete} className="btn-confirm-delete">Yes, Remove</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-cancel">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Your Position Section */}
      <div className="stock-detail">
        <h2>Your Position</h2>
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

        {/* Price History Chart */}
        <div className="price-history-section">
          {loadingPriceHistory ? (
            <div className="loading-state">Loading price history...</div>
          ) : priceHistory.length > 0 ? (
            <PriceLineChart
              data={priceHistory}
              ticker={stock.ticker}
            />
          ) : (
            <div className="no-data">Price history not available for this ticker.</div>
          )}
        </div>

        {/* Ownership Distribution Section */}
        <div className="section-divider"></div>
        <h2>Ownership Distribution</h2>
        <div className="ownership-section">
          {loadingOwnership ? (
            <div className="loading-state">Loading ownership data...</div>
          ) : ownershipData ? (
            <OwnershipPieChart ownershipData={ownershipData} />
          ) : (
            <div className="no-data">Ownership data not available for this ticker.</div>
          )}
        </div>

        {/* CANSLIM Score Section */}
        <div className="section-divider"></div>
        <h2>CANSLIM Analysis</h2>
        <div className="canslim-section">
          <CANSLIMScoreComponent ticker={stock.ticker} />
        </div>

        {/* RS Rating Section */}
        <div className="section-divider"></div>
        <h2>Relative Strength</h2>
        <div className="rs-section">
          <RSIndicator ticker={stock.ticker} />
        </div>

        {/* 50-Day Moving Average Section */}
        <div className="section-divider"></div>
        <h2>50-Day Moving Average</h2>
        <div className="moving-average-section">
          {loadingMA ? (
            <div className="loading-state">Loading 50DMA data...</div>
          ) : movingAverageData && movingAverageData.movingAverage50 ? (
            <div className="ma-content">
              <div className="ma-stats">
                <div className="ma-stat-card">
                  <div className="stat-label">Current Price</div>
                  <div className="stat-value">{formatCurrency(movingAverageData.currentPrice)}</div>
                </div>
                <div className="ma-stat-card">
                  <div className="stat-label">50-Day MA</div>
                  <div className="stat-value">{formatCurrency(movingAverageData.movingAverage50)}</div>
                </div>
                <div className="ma-stat-card">
                  <div className="stat-label">% Difference</div>
                  <div className={`stat-value ${movingAverageData.percentageDifference && movingAverageData.percentageDifference >= 0 ? 'profit' : 'loss'}`}>
                    {formatPercent(movingAverageData.percentageDifference)}
                  </div>
                </div>
              </div>
              <div className="ma-indicator">
                <div className="indicator-bar">
                  <div
                    className={`indicator-fill ${movingAverageData.percentageDifference && movingAverageData.percentageDifference >= 0 ? 'above' : 'below'}`}
                    style={{
                      width: `${Math.min(Math.abs(movingAverageData.percentageDifference || 0) * 2, 100)}%`
                    }}
                  ></div>
                </div>
                <div className="indicator-label">
                  {movingAverageData.percentageDifference && movingAverageData.percentageDifference >= 0
                    ? '📈 Price is above 50-day MA (Bullish)'
                    : '📉 Price is below 50-day MA (Bearish)'}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-data">Moving average data not available. Try refreshing.</div>
          )}
        </div>

        {/* Insider Activity Section */}
        <div className="section-divider"></div>
        <h2>Insider Activity</h2>
        <div className="insider-section">
          {loadingInsiders ? (
            <div className="loading-state">Loading insider data...</div>
          ) : insiderData ? (
            <>
              <div className="insider-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Buy Shares:</span>
                  <span className="summary-value buy">{insiderData.summary.totalBuyShares.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Sell Shares:</span>
                  <span className="summary-value sell">{insiderData.summary.totalSellShares.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Net Shares:</span>
                  <span className={`summary-value ${insiderData.summary.netShares >= 0 ? 'buy' : 'sell'}`}>
                    {insiderData.summary.netShares > 0 ? '+' : ''}{insiderData.summary.netShares.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="insider-transactions">
                <h3>Recent Transactions</h3>
                {insiderData.transactions.length > 0 ? (
                  <div className="table-wrapper">
                    <table className="insider-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Insider</th>
                          <th>Form</th>
                          <th>Type</th>
                          <th>Shares</th>
                          <th>Price</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insiderData.transactions.map((tx, idx) => (
                          <tr key={idx}>
                            <td>{tx.date ? new Date(tx.date).toLocaleDateString() : '-'}</td>
                            <td>{tx.insider}</td>
                            <td>{tx.formType}</td>
                            <td>
                              <span className={`transaction-type ${tx.type}`}>
                                {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                              </span>
                            </td>
                            <td className="number">{tx.shares.toLocaleString()}</td>
                            <td className="number">{tx.price ? formatCurrency(tx.price) : '-'}</td>
                            <td>
                              <a href={tx.source} target="_blank" rel="noopener noreferrer" className="source-link">
                                SEC Filing
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-data">No insider transactions found.</div>
                )}
              </div>
            </>
          ) : (
            <div className="no-data">Insider data not available for this ticker.</div>
          )}
        </div>
      </div>
    </div>
  );
}
