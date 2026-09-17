import React, { useState, useEffect, useCallback } from 'react';
import SidebarNav from './components/SidebarNav';
import TopHeader from './components/TopHeader';
import StockDetailModal from './components/StockDetailModal';
import SyncModal from './components/SyncModal';
import SavePresetModal from './components/SavePresetModal';
import AuthModal from './components/AuthModal';
import RecommendationHub from './components/RecommendationHub';
import ResultCalendarView from './components/ResultCalendarView';
import SectorFlowView from './components/SectorFlowView';
import MarketHeatmapView from './components/MarketHeatmapView';
import MarketPictureView from './components/MarketPictureView';
import LearnView from './components/LearnView';
import OptionChainView from './components/OptionChainView';

export const VALID_VIEWS = [
  'option_chain',
  'market_picture',
  'results_calendar',
  'sector_flow',
  'heatmap',
  'recommendations',
  'learn'
];

export const getInitialView = () => {
  try {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (hash && VALID_VIEWS.includes(hash)) {
      return hash;
    }
  } catch (e) {
    console.error('Failed to parse URL hash:', e);
  }
  // Option Chain is the default homepage on opening website
  return 'option_chain';
};

const INITIAL_FILTERS = {
  search: '',
  sectors: [],
  market_cap_categories: [],
  market_cap_min: null,
  market_cap_max: null,
  pe_min: null,
  pe_max: null,
  pb_min: null,
  pb_max: null,
  roe_min: null,
  roce_min: null,
  debt_to_equity_max: null,
  current_ratio_min: null,
  dividend_yield_min: null,
  sales_growth_min: null,
  profit_growth_min: null,
  promoter_holding_min: null,
  promoter_pledged_max: null,
  fii_dii_min: null,
  price_min: null,
  price_max: null,
  change_1d_min: null,
  change_1d_max: null,
  volume_min: null,
  volume_multiple_min: null,
  delivery_percent_min: null,
  rsi_min: null,
  rsi_max: null,
  above_ema20: null,
  above_sma50: null,
  above_sma200: null,
  golden_cross: null,
  is_breakout_3pct: null,
  dist_from_52w_high_max: null,
  potential_min: null
};

export default function App() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [stocks, setStocks] = useState([]);
  const [totalStocks, setTotalStocks] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('potential_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(false);

  const [marketSummary, setMarketSummary] = useState(null);
  const [presets, setPresets] = useState([]);
  const [activePresetId, setActivePresetId] = useState(null);
  const [sectors, setSectors] = useState([]);

  // Auth & Watchlist State
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('stock_screener_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('stock_screener_token') || null);
  const [watchlist, setWatchlist] = useState([]);
  const [isWatchlistOnly, setIsWatchlistOnly] = useState(false);
  const [isFnoOnly, setIsFnoOnly] = useState(false);
  const [activeSegment, setActiveSegment] = useState('all');

  // Navigation View & Theme State (Default: Option Chain as Homepage)
  const [currentView, setCurrentView] = useState(getInitialView);
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Sync initial URL hash and listen to browser Back / Forward buttons & Refresh
  useEffect(() => {
    // 1. If URL has no hash on first visit, set hash to option_chain
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (!hash || !VALID_VIEWS.includes(hash)) {
      window.history.replaceState(null, '', `#${currentView}`);
    }

    // 2. Listen to browser Back and Forward navigation events (Backward / Forward history)
    const handleNavigation = () => {
      const activeHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (activeHash && VALID_VIEWS.includes(activeHash)) {
        setCurrentView(activeHash);
      } else if (!activeHash) {
        setCurrentView('option_chain');
      }
    };

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);

    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  // 3. Keep URL hash in sync whenever currentView changes (creates real browser history entries)
  useEffect(() => {
    if (currentView) {
      const activeHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (activeHash !== currentView) {
        window.location.hash = currentView;
      }
    }
  }, [currentView]);

  const [currentTheme, setCurrentTheme] = useState(() => {
    try {
      return localStorage.getItem('stock_finder_theme') || 'midnight';
    } catch {
      return 'midnight';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('stock_finder_theme', currentTheme);
    } catch (e) {
      console.error(e);
    }
  }, [currentTheme]);

  // Modals & Drawers
  const [selectedStockSymbol, setSelectedStockSymbol] = useState(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileFilterSidebarOpen, setIsMobileFilterSidebarOpen] = useState(false);
  const [isDesktopFilterSidebarOpen, setIsDesktopFilterSidebarOpen] = useState(false);
  const [highlightFilter, setHighlightFilter] = useState(false);



  // Load initial market summary, presets, sectors, and user watchlist
  useEffect(() => {
    fetchMarketSummary();
    fetchPresets();
    fetchSectors();
    if (token) {
      fetchWatchlist(token);
    }
  }, [token]);

  const fetchWatchlist = async (authToken) => {
    try {
      const res = await fetch('/api/watchlist', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.watchlist || []);
      }
    } catch (e) {
      console.error("Failed to load watchlist:", e);
    }
  };

  const fetchMarketSummary = async () => {
    try {
      const res = await fetch('/api/market/summary');
      if (res.ok) setMarketSummary(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/presets');
      if (res.ok) setPresets(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSectors = async () => {
    try {
      const res = await fetch('/api/sectors');
      if (res.ok) {
        const data = await res.json();
        setSectors(data.map(d => d.sector));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Main screening execution query
  const runScreen = useCallback(async () => {
    // If no criteria is selected, do not show any stocks
    const hasAnyCriteria = Object.keys(filters).some((key) => {
      const val = filters[key];
      if (val === null || val === undefined || val === '') return false;
      if (Array.isArray(val) && val.length === 0) return false;
      return true;
    }) || Boolean(isWatchlistOnly) || Boolean(isFnoOnly) || Boolean(activeSegment && activeSegment !== 'all');

    if (!hasAnyCriteria) {
      setStocks([]);
      setTotalStocks(0);
      setTotalPages(1);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ...filters,
        watchlist_only: isWatchlistOnly,
        is_fno: isFnoOnly ? true : null,
        market_segment: activeSegment,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder
      };

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/screen', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setStocks(data.stocks || []);
        setTotalStocks(data.total || 0);
        setTotalPages(data.total_pages || 1);
      }
    } catch (e) {
      console.error("Screen failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize, sortBy, sortOrder, isWatchlistOnly, isFnoOnly, activeSegment, token]);



  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
    setActivePresetId(null);
  };

  const handleToggleFno = () => {
    setIsFnoOnly(prev => !prev);
    setPage(1);
  };

  const handleSelectSegment = (segment) => {
    setActiveSegment(segment);
    setPage(1);
    setActivePresetId(null);
    if (segment === 'gainers') {
      setSortBy('change_1d');
      setSortOrder('desc');
    } else if (segment === 'losers') {
      setSortBy('change_1d');
      setSortOrder('asc');
    } else if (segment === 'volume_shockers') {
      setSortBy('volume_multiple');
      setSortOrder('desc');
    } else {
      setSortBy('potential_score');
      setSortOrder('desc');
    }
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setIsWatchlistOnly(false);
    setIsFnoOnly(false);
    setActiveSegment('all');
    setSortBy('potential_score');
    setSortOrder('desc');
    setPage(1);
    setActivePresetId(null);
  };

  const handleSelectPreset = (presetId) => {
    const p = presets.find(x => x.id === presetId);
    if (!p) return;

    setActivePresetId(presetId);
    setIsWatchlistOnly(false);
    setActiveSegment('all');
    setFilters({
      ...INITIAL_FILTERS,
      ...p.filters
    });
    setPage(1);
    if (isMobileFilterSidebarOpen) setIsMobileFilterSidebarOpen(false);
  };

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleExportCsv = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          ...filters,
          watchlist_only: isWatchlistOnly,
          is_fno: isFnoOnly ? true : null,
          market_segment: activeSegment,
          sort_by: sortBy,
          sort_order: sortOrder
        })
      });

      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock_finder_screener_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed: " + e.message);
    }
  };

  // Auth handlers
  const handleAuthSuccess = (loggedUser, authToken) => {
    setUser(loggedUser);
    setToken(authToken);
    fetchWatchlist(authToken);
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('stock_screener_token');
      localStorage.removeItem('stock_screener_user');
      setUser(null);
      setToken(null);
      setWatchlist([]);
      setIsWatchlistOnly(false);
    }
  };

  const handleToggleWatchlist = async (symbol) => {
    if (!user || !token) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/watchlist/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ symbol })
      });

      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.watchlist || []);
      }
    } catch (e) {
      console.error("Error toggling watchlist:", e);
    }
  };

  const handleToggleWatchlistFilter = () => {
    if (!user || !token) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsWatchlistOnly(prev => !prev);
    setPage(1);
  };

  // Count active non-empty filters
  const activeFiltersCount = Object.keys(filters).reduce((acc, key) => {
    const val = filters[key];
    if (val === null || val === undefined || val === '') return acc;
    if (Array.isArray(val) && val.length === 0) return acc;
    return acc + 1;
  }, 0) + (isWatchlistOnly ? 1 : 0) + (isFnoOnly ? 1 : 0) + (activeSegment && activeSegment !== 'all' ? 1 : 0);

  const handleNavSelect = (viewId) => {
    if (viewId === 'watchlist') {
      if (!user || !token) {
        setIsAuthModalOpen(true);
      } else {
        setIsWatchlistOnly(true);
        setCurrentView('screener');
      }
    } else {
      setCurrentView(viewId);
    }
  };

  return (
    <div data-theme={currentTheme} className="h-screen max-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors overflow-hidden">
      {/* Top Header Bar with Live Indices, Theme Picker & Auth */}
      <TopHeader
        currentView={currentView}
        onSelectView={handleNavSelect}
        onToggleNav={() => setIsNavOpen(prev => !prev)}
        marketSummary={marketSummary}
        onOpenSync={() => setIsSyncModalOpen(true)}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        watchlistCount={watchlist.length}
      />

      {/* Main App Layout: View Workspace + Off-canvas SidebarNav */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar Drawer (Hidden by default, opens on click) */}
        <SidebarNav
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          currentView={currentView}
          onSelectView={handleNavSelect}
          watchlistCount={watchlist.length}
          recommendationsCount={15}
        />

        {/* View Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
          {/* 1. Recommendations Hub View */}
          {currentView === 'recommendations' && (
            <RecommendationHub onSelectStock={(sym) => setSelectedStockSymbol(sym)} />
          )}

          {/* Option Chain View */}
          {currentView === 'option_chain' && (
            <OptionChainView onSelectStock={(sym) => setSelectedStockSymbol(sym)} />
          )}

          {/* 2. Corporate Results Calendar View */}
          {currentView === 'results_calendar' && (
            <ResultCalendarView onSelectStock={(sym) => setSelectedStockSymbol(sym)} />
          )}

          {/* 3. Sector Flow View */}
          {currentView === 'sector_flow' && (
            <SectorFlowView 
              onSelectStock={(sym) => setSelectedStockSymbol(sym)}
            />
          )}

          {/* 4. Market Heat Map View */}
          {currentView === 'heatmap' && (
            <MarketHeatmapView onSelectStock={(sym) => setSelectedStockSymbol(sym)} />
          )}

          {/* 5. Market Picture View (Gainers, Losers, Volume, 52W Highs) */}
          {currentView === 'market_picture' && (
            <MarketPictureView 
              onSelectStock={(sym) => setSelectedStockSymbol(sym)}
            />
          )}

          {/* 6. Learn Stock Market View (Curated video courses) */}
          {currentView === 'learn' && (
            <LearnView />
          )}
        </div>
      </div>

      {/* Stock Deep Analysis Modal */}
      {selectedStockSymbol && (
        <StockDetailModal
          symbol={selectedStockSymbol}
          onClose={() => setSelectedStockSymbol(null)}
        />
      )}

      {/* Sync Management Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSyncSuccess={() => {
          fetchMarketSummary();
          runScreen();
        }}
      />

      {/* Save Custom Preset Modal */}
      <SavePresetModal
        isOpen={isSavePresetModalOpen}
        onClose={() => setIsSavePresetModalOpen(false)}
        activeFilters={filters}
        onSavedSuccess={(newPreset) => {
          fetchPresets();
          setActivePresetId(newPreset.id);
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
