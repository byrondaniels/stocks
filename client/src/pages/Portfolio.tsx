import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PortfolioStock, AddStockFormData, PortfolioSummary as PortfolioSummaryType } from '../types';
import { AddStockForm } from '../components/AddStockForm';
import { PortfolioTable } from '../components/PortfolioTable';
import { StockCard } from '../components/StockCard';
import { PortfolioSummary } from '../components/PortfolioSummary';
import { EmptyState } from '../components/EmptyState';
import { DeleteConfirmation } from '../components/DeleteConfirmation';
import { RefreshButton } from '../components/RefreshButton';
import { useRefreshRateLimit } from '../hooks/useRefreshRateLimit';

export function Portfolio() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<PortfolioStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshingStock, setRefreshingStock] = useState<string | null>(null);
  const { canRefresh, recordRefresh, cooldowns } = useRefreshRateLimit();

  // Fetch portfolio data
  const fetchPortfolio = async () => {
    try {
      setError(null);
      const response = await fetch('/api/portfolio');
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to fetch portfolio: ${response.status}`);
      }
      const data = await response.json();
      setStocks(data.portfolio || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    document.title = "My Portfolio - Stock Portfolio";
    fetchPortfolio();
  }, []);

  // Calculate portfolio summary
  const calculateSummary = (): PortfolioSummaryType => {
    const totalCost = stocks.reduce((sum, stock) => sum + stock.purchasePrice * stock.shares, 0);
    const totalValue = stocks.reduce((sum, stock) => {
      const value = stock.currentPrice !== undefined ? stock.currentPrice * stock.shares : 0;
      return sum + value;
    }, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
    };
  };

  // Add stock to portfolio
  const handleAddStock = async (formData: AddStockFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker: formData.ticker,
          shares: parseFloat(formData.shares),
          purchasePrice: parseFloat(formData.purchasePrice),
          purchaseDate: formData.purchaseDate,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to add stock: ${response.status}`);
      }

      // Refresh portfolio after adding
      await fetchPortfolio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stock');
      throw err; // Re-throw to prevent form reset
    } finally {
      setLoading(false);
    }
  };

  // Remove stock from portfolio
  const handleRemoveStock = async (ticker: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portfolio/${encodeURIComponent(ticker)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to remove stock: ${response.status}`);
      }

      // Refresh portfolio after removing
      await fetchPortfolio();
      setDeleteConfirmation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove stock');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to stock detail
  const handleStockDetail = (ticker: string) => {
    navigate(`/stock/${ticker}`);
  };

  // Show delete confirmation
  const handleRemoveClick = (ticker: string) => {
    setDeleteConfirmation(ticker);
  };

  // Refresh individual stock
  const handleRefreshStock = async (ticker: string) => {
    if (!canRefresh(ticker)) {
      const remainingSeconds = cooldowns[ticker] || 0;
      toast.error(`Please wait ${remainingSeconds}s before refreshing ${ticker} again`);
      return;
    }

    setRefreshingStock(ticker);
    const toastId = toast.loading(`Refreshing ${ticker}...`);

    try {
      const response = await fetch(`/api/portfolio/${encodeURIComponent(ticker)}/refresh`, {
        method: 'POST',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to refresh: ${response.status}`);
      }

      const data = await response.json();

      // Show success message
      toast.success(data.message || `${ticker} refreshed successfully`, { id: toastId });

      // Record refresh to start cooldown
      recordRefresh(ticker);

      // Refresh portfolio to get updated data
      await fetchPortfolio();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to refresh ${ticker}`, { id: toastId });
    } finally {
      setRefreshingStock(null);
    }
  };

  // Refresh all stocks
  const handleRefreshAll = async () => {
    if (!canRefresh('refresh-all')) {
      const remainingSeconds = cooldowns['refresh-all'] || 0;
      toast.error(`Please wait ${remainingSeconds}s before refreshing again`);
      return;
    }

    setRefreshingAll(true);
    const toastId = toast.loading('Refreshing all stocks...');

    try {
      const response = await fetch('/api/portfolio/refresh-all', {
        method: 'POST',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to refresh: ${response.status}`);
      }

      const data = await response.json();

      // Show success message
      toast.success(data.message || 'All stocks refreshed successfully', { id: toastId });

      // Record refresh to start cooldown
      recordRefresh('refresh-all');

      // Refresh portfolio to get updated data
      await fetchPortfolio();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh stocks', { id: toastId });
    } finally {
      setRefreshingAll(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="portfolio-page">
        <div className="loading-state">Loading portfolio...</div>
      </div>
    );
  }

  const summary = calculateSummary();

  return (
    <div className="portfolio-page">
      <header className="portfolio-header">
        <h1>My Portfolio</h1>
      </header>

      {error && (
        <div className="alert error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <AddStockForm onAdd={handleAddStock} loading={loading} />

      {stocks.length > 0 && <PortfolioSummary summary={summary} stockCount={stocks.length} />}

      {stocks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="portfolio-content">
          <div className="view-toggle">
            <div className="view-toggle-buttons">
              <button
                className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
              >
                📊 Card View
              </button>
              <button
                className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                📋 Table View
              </button>
            </div>
            <div className="refresh-all-container">
              <RefreshButton
                onClick={handleRefreshAll}
                loading={refreshingAll}
                disabled={!canRefresh('refresh-all') || refreshingAll}
                variant="text"
                size="medium"
              >
                {cooldowns['refresh-all'] ? `Refresh All (${cooldowns['refresh-all']}s)` : 'Refresh All'}
              </RefreshButton>
            </div>
          </div>

          {viewMode === 'cards' ? (
            <div className="stock-grid">
              {stocks.map((stock) => (
                <StockCard
                  key={stock.ticker}
                  stock={stock}
                  onRemove={handleRemoveClick}
                  onDetail={handleStockDetail}
                  onRefresh={handleRefreshStock}
                  refreshing={refreshingStock === stock.ticker}
                  cooldownSeconds={cooldowns[stock.ticker]}
                />
              ))}
            </div>
          ) : (
            <PortfolioTable
              stocks={stocks}
              onRemove={handleRemoveClick}
              onDetail={handleStockDetail}
              onRefresh={handleRefreshStock}
              refreshingStock={refreshingStock}
              cooldowns={cooldowns}
            />
          )}
        </div>
      )}

      {deleteConfirmation && (
        <DeleteConfirmation
          ticker={deleteConfirmation}
          onConfirm={() => handleRemoveStock(deleteConfirmation)}
          onCancel={() => setDeleteConfirmation(null)}
        />
      )}
    </div>
  );
}
