/**
 * Main Application Component
 * Handles routing and navigation
 */

import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Portfolio } from './pages/Portfolio';
import { Watchlist } from './pages/Watchlist';
import { InsiderLookup } from './pages/InsiderLookup';
import { StockDetail } from './pages/StockDetail';
import './App.css';

function Navigation() {
  const location = useLocation();

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="nav-brand">Stock Portfolio</div>
        <div className="nav-links">
          <Link
            to="/portfolio"
            className={location.pathname === '/portfolio' || location.pathname === '/' ? 'active' : ''}
          >
            Portfolio
          </Link>
          <Link
            to="/watchlist"
            className={location.pathname === '/watchlist' ? 'active' : ''}
          >
            Watchlist
          </Link>
          <Link
            to="/insiders"
            className={location.pathname === '/insiders' ? 'active' : ''}
          >
            Insider Lookup
          </Link>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Portfolio />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/stock/:ticker" element={<StockDetail />} />
            <Route path="/insiders" element={<InsiderLookup />} />
            <Route path="/insider/:ticker" element={<InsiderLookup />} />
          </Routes>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
