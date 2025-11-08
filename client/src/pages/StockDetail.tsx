import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InsiderData, OwnershipData, PriceHistoryPoint } from '../types';
import OwnershipPieChart from '../components/OwnershipPieChart';
import { PriceLineChart } from '../components/PriceLineChart';

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
  const [insiderData, setInsiderData] = useState<InsiderData | null>(null);
  const [ownershipData, setOwnershipData] = useState<OwnershipData | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInsiders, setLoadingInsiders] = useState(true);
  const [loadingOwnership, setLoadingOwnership] = useState(true);
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(true);
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

  useEffect(() => {
    if (!ticker) return;

    const fetchInsiderData = async () => {
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

    fetchInsiderData();
  }, [ticker]);

  useEffect(() => {
    if (!ticker) return;

    const fetchOwnershipData = async () => {
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

    fetchOwnershipData();
  }, [ticker]);

  useEffect(() => {
    if (!ticker) return;

    const fetchPriceHistory = async () => {
      try {
        setLoadingPriceHistory(true);
        const response = await fetch(`/api/stock/historical?ticker=${encodeURIComponent(ticker)}&days=50`);
        if (response.ok) {
          const data = await response.json();
          setPriceHistory(data);
        }
      } catch (err) {
        console.error('Failed to fetch price history:', err);
      } finally {
        setLoadingPriceHistory(false);
      }
    };

    fetchPriceHistory();
  }, [ticker]);

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

        {/* Price History Chart */}
        <div className="price-history-section">
          {loadingPriceHistory ? (
            <div className="loading-state">Loading price history...</div>
          ) : priceHistory.length > 0 ? (
            <PriceLineChart
              data={priceHistory.map(p => ({ date: p.date, close: p.close }))}
              ticker={stock.ticker}
            />
          ) : (
            <div className="no-data">Price history not available for this ticker.</div>
          )}
        </div>

        {/* Ownership Distribution Section */}
        <div className="ownership-section">
          {loadingOwnership ? (
            <div className="loading-state">Loading ownership data...</div>
          ) : ownershipData ? (
            <OwnershipPieChart ownershipData={ownershipData} />
          ) : (
            <div className="no-data">Ownership data not available for this ticker.</div>
          )}
        </div>

        {/* Insider Activity Section */}
        <div className="insider-section">
          <h2>Insider Activity</h2>
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
