/**
 * Explore Page
 * Allows users to explore stock data without adding to portfolio/watchlist
 */

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InsiderData, OwnershipData, MovingAverageData, PriceHistoryPoint } from '../types';
import { HISTORICAL_DAYS_DEFAULT, TICKER_MAX_LENGTH } from '../constants';
import { TICKER_REGEX, normalizeTicker } from '../../../shared/validation';
import { addRecentSearch } from '../utils/recentSearches';
import { StockHeader } from '../components/StockDetail';
import { StockDataSections } from '../components/StockDataSections';
import '../pages/StockDetail.css';

interface StockDataResponse {
  ticker: string;
  currentPrice?: number;
  companyName?: string;
}

export function Explore() {
  const { ticker: urlTicker } = useParams<{ ticker?: string }>();
  const navigate = useNavigate();
  const [ticker, setTicker] = useState(urlTicker || '');
  const [stockData, setStockData] = useState<StockDataResponse | null>(null);
  const [insiderData, setInsiderData] = useState<InsiderData | null>(null);
  const [ownershipData, setOwnershipData] = useState<OwnershipData | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [movingAverageData, setMovingAverageData] = useState<MovingAverageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInsiders, setLoadingInsiders] = useState(false);
  const [loadingOwnership, setLoadingOwnership] = useState(false);
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(false);
  const [loadingMA, setLoadingMA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'Explore Stocks - Stock Portfolio';
  }, []);

  // Handle URL ticker parameter
  useEffect(() => {
    if (urlTicker && !hasSearched) {
      const normalizedTicker = normalizeTicker(urlTicker);
      if (TICKER_REGEX.test(normalizedTicker)) {
        setTicker(normalizedTicker);
        handleSearch(normalizedTicker);
      }
    }
  }, [urlTicker, hasSearched]);

  const fetchStockPrice = async (searchTicker: string) => {
    setLoading(true);
    try {
      setError(null);
      const [priceResponse, companyResponse] = await Promise.all([
        fetch(`/api/stock/price?ticker=${encodeURIComponent(searchTicker)}`),
        fetch(`/api/stock/company-name?ticker=${encodeURIComponent(searchTicker)}`)
      ]);

      if (!priceResponse.ok) {
        const payload = await priceResponse.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to fetch stock price: ${priceResponse.status}`);
      }

      const priceData = await priceResponse.json();
      const companyData = companyResponse.ok ? await companyResponse.json() : null;

      setStockData({
        ticker: searchTicker,
        currentPrice: priceData.price,
        companyName: companyData?.companyName,
      });

      // Save to search history
      try {
        await addRecentSearch(searchTicker, companyData?.companyName || searchTicker);
      } catch (err) {
        console.warn('Failed to save search to history:', err);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock data');
      setStockData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsiderData = async (searchTicker: string) => {
    try {
      setLoadingInsiders(true);
      const response = await fetch(`/api/insiders?ticker=${encodeURIComponent(searchTicker)}`);
      if (response.ok) {
        const data = await response.json();
        setInsiderData(data);
      } else {
        setInsiderData(null);
      }
    } catch (err) {
      console.error('Failed to fetch insider data:', err);
      setInsiderData(null);
    } finally {
      setLoadingInsiders(false);
    }
  };

  const fetchOwnershipData = async (searchTicker: string) => {
    try {
      setLoadingOwnership(true);
      const response = await fetch(`/api/ownership/detailed?ticker=${encodeURIComponent(searchTicker)}`);
      if (response.ok) {
        const data = await response.json();
        setOwnershipData(data);
      } else {
        setOwnershipData(null);
      }
    } catch (err) {
      console.error('Failed to fetch ownership data:', err);
      setOwnershipData(null);
    } finally {
      setLoadingOwnership(false);
    }
  };

  const fetchMovingAverageData = async (searchTicker: string) => {
    try {
      setLoadingMA(true);
      const response = await fetch(`/api/stock/historical?ticker=${encodeURIComponent(searchTicker)}&days=${HISTORICAL_DAYS_DEFAULT}`);
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
      } else {
        setMovingAverageData(null);
      }
    } catch (err) {
      console.error('Failed to fetch moving average data:', err);
      setMovingAverageData(null);
    } finally {
      setLoadingMA(false);
    }
  };

  const fetchPriceHistory = async (searchTicker: string) => {
    try {
      setLoadingPriceHistory(true);
      const response = await fetch(`/api/stock/historical?ticker=${encodeURIComponent(searchTicker)}&days=${HISTORICAL_DAYS_DEFAULT}`);
      if (response.ok) {
        const data = await response.json();
        setPriceHistory(data.prices || []);
      } else {
        setPriceHistory([]);
      }
    } catch (err) {
      console.error('Failed to fetch price history:', err);
      setPriceHistory([]);
    } finally {
      setLoadingPriceHistory(false);
    }
  };

  const handleSearch = async (searchTicker?: string) => {
    const tickerToSearch = searchTicker || ticker;
    const normalizedTicker = normalizeTicker(tickerToSearch);

    if (!normalizedTicker || !TICKER_REGEX.test(normalizedTicker)) {
      setError('Please enter a valid ticker symbol (e.g., AAPL, BRK.B)');
      return;
    }

    setHasSearched(true);
    setError(null);

    // Update URL without triggering navigation
    if (!searchTicker) {
      navigate(`/explore/${normalizedTicker}`, { replace: true });
    }

    // Fetch all data in parallel
    await Promise.all([
      fetchStockPrice(normalizedTicker),
      fetchInsiderData(normalizedTicker),
      fetchOwnershipData(normalizedTicker),
      fetchMovingAverageData(normalizedTicker),
      fetchPriceHistory(normalizedTicker),
    ]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleSearch();
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-state">Loading stock details...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="explore-header">
        {stockData && (
          <h1>{stockData.companyName || stockData.ticker}</h1>
        )}
      </header>

      {error && <div className="alert error">{error}</div>}
      {stockData && (
        <>
          <StockHeader
            ticker={stockData.ticker}
            currentPrice={stockData.currentPrice}
            companyName={stockData.companyName}
          />

          <StockDataSections
            ticker={stockData.ticker}
            priceHistory={priceHistory}
            loadingPriceHistory={loadingPriceHistory}
            ownershipData={ownershipData}
            loadingOwnership={loadingOwnership}
            movingAverageData={movingAverageData}
            loadingMA={loadingMA}
            insiderData={insiderData}
            loadingInsiders={loadingInsiders}
          />
        </>
      )}
    </div>
  );
}
