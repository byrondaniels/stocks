/**
 * Header Stock Search Component
 * Quick stock search in the navigation bar
 */

import { useState, FormEvent, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TICKER_REGEX, normalizeTicker } from '../../../shared/validation';
import { TICKER_MAX_LENGTH } from '../constants';
import { addRecentSearch } from '../utils/recentSearches';
import { getRecentSearches } from '../utils/recentSearches';
import { RecentlySearchedStock } from '../types';

export function HeaderStockSearch() {
  const navigate = useNavigate();
  const [ticker, setTicker] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentlySearchedStock[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSearch = async (searchTicker?: string) => {
    const tickerToSearch = searchTicker || ticker;
    const normalizedTicker = normalizeTicker(tickerToSearch);

    if (!normalizedTicker || !TICKER_REGEX.test(normalizedTicker)) {
      return;
    }

    setTicker('');
    setShowDropdown(false);

    // Navigate to explore page with the ticker
    navigate(`/explore/${normalizedTicker}`);

    // Save to search history (but don't wait for it)
    try {
      const companyNameResponse = await fetch(`/api/stock/company-name?ticker=${encodeURIComponent(normalizedTicker)}`);
      if (companyNameResponse.ok) {
        const data = await companyNameResponse.json();
        await addRecentSearch(normalizedTicker, data.companyName);
      } else {
        await addRecentSearch(normalizedTicker, normalizedTicker);
      }
      
      // Refresh recent searches
      const searches = await getRecentSearches();
      setRecentSearches(searches);
    } catch (err) {
      console.warn('Failed to save search to history:', err);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleSearch();
  };

  const handleFocus = () => {
    if (recentSearches.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleRecentSearchClick = (searchTicker: string) => {
    handleSearch(searchTicker);
  };

  return (
    <div className="header-search-container">
      <form onSubmit={handleSubmit} className="header-search-form">
        <div className="search-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onFocus={handleFocus}
            placeholder="Search stocks..."
            maxLength={TICKER_MAX_LENGTH}
            className="header-search-input"
            autoComplete="off"
          />
          <button type="submit" className="header-search-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
          </button>
        </div>

        {showDropdown && recentSearches.length > 0 && (
          <div ref={dropdownRef} className="header-search-dropdown">
            <div className="dropdown-header">Recent</div>
            {recentSearches.slice(0, 5).map((stock) => (
              <div
                key={stock.ticker}
                className="dropdown-item"
                onClick={() => handleRecentSearchClick(stock.ticker)}
              >
                <span className="ticker">{stock.ticker}</span>
                <span className="company-name">{stock.companyName}</span>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}