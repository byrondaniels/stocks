import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { WatchlistStock, AddWatchlistFormData } from '../types';
import { AddWatchlistForm } from '../components/AddWatchlistForm';
import { StockCard } from '../components/StockCard';
import { DeleteConfirmation } from '../components/DeleteConfirmation';
import { RefreshButton } from '../components/RefreshButton';
import { useRefreshRateLimit } from '../hooks/useRefreshRateLimit';
import { addRecentSearch } from '../utils/recentSearches';

export function Watchlist() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<WatchlistStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshingStock, setRefreshingStock] = useState<string | null>(null);
  const { canRefresh, recordRefresh, cooldowns } = useRefreshRateLimit();

  // Fetch watchlist data
  const fetchWatchlist = async () => {
    try {
      setError(null);
      const response = await fetch('/api/watchlist');
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to fetch watchlist: ${response.status}`);
      }
      const data = await response.json();
      setStocks(data.watchlist || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load watchlist');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    document.title = "My Watchlist - Stock Portfolio";
    fetchWatchlist();
  }, []);

  // Add stock to watchlist
  const handleAddStock = async (formData: AddWatchlistFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker: formData.ticker,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to add stock: ${response.status}`);
      }

      // Fetch company name and save to recent searches
      try {
        const companyNameResponse = await fetch(`/api/stock/company-name?ticker=${encodeURIComponent(formData.ticker)}`);
        if (companyNameResponse.ok) {
          const data = await companyNameResponse.json();
          await addRecentSearch(formData.ticker, data.companyName);
        }
      } catch (err) {
        // Silently fail - recent searches is not critical
        console.warn('Failed to fetch company name for recent searches:', err);
      }

      // Refresh watchlist after adding
      await fetchWatchlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stock');
      throw err; // Re-throw to prevent form reset
    } finally {
      setLoading(false);
    }
  };

  // Remove stock from watchlist
  const handleRemoveStock = async (ticker: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/watchlist/${encodeURIComponent(ticker)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to remove stock: ${response.status}`);
      }

      // Refresh watchlist after removing
      await fetchWatchlist();
      setDeleteConfirmation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove stock');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to explore view
  const handleStockDetail = (ticker: string) => {
    navigate(`/explore/${ticker}`);
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
      const response = await fetch(`/api/watchlist/${encodeURIComponent(ticker)}/refresh`, {
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

      // Refresh watchlist to get updated data
      await fetchWatchlist();
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
      const response = await fetch('/api/watchlist/refresh-all', {
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

      // Refresh watchlist to get updated data
      await fetchWatchlist();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh stocks', { id: toastId });
    } finally {
      setRefreshingAll(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="portfolio-page">
        <div className="loading-state">Loading watchlist...</div>
      </div>
    );
  }

  return (
    <div className="portfolio-page">
      <header className="portfolio-header">
        <h1>My Watchlist</h1>
      </header>

      {error && (
        <div className="alert error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <AddWatchlistForm onAdd={handleAddStock} loading={loading} />

      {stocks.length === 0 ? (
        <div className="empty-state">
          <h3>No stocks in watchlist</h3>
          <p>Add stocks to track their performance</p>
        </div>
      ) : (
        <div className="portfolio-content">
          <div className="view-toggle">
            <div className="view-toggle-buttons">
              <h3>{stocks.length} {stocks.length === 1 ? 'Stock' : 'Stocks'} Tracked</h3>
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

          <div className="stock-grid">
            {stocks.map((stock) => (
              <StockCard
                key={stock.ticker}
                stock={stock as any}
                onRemove={handleRemoveClick}
                onDetail={handleStockDetail}
                onRefresh={handleRefreshStock}
                refreshing={refreshingStock === stock.ticker}
                cooldownSeconds={cooldowns[stock.ticker]}
                isWatchlist={true}
              />
            ))}
          </div>
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
