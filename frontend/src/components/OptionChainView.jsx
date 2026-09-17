import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Layers, Search, RefreshCw, ChevronDown, Activity, Zap, 
  ExternalLink, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  ShieldCheck, AlertCircle, Info, Filter, Clock, Eye, BarChart2, Target,
  X, CheckCircle2, Key
} from 'lucide-react';
import RealTimeChartModal from './RealTimeChartModal';
import PaperTradingTerminal from './PaperTradingTerminal';

const POPULAR_INDICES = [
  { symbol: 'NIFTY', name: 'NIFTY 50', lot: 65 },
  { symbol: 'BANKNIFTY', name: 'NIFTY BANK', lot: 30 },
  { symbol: 'FINNIFTY', name: 'FIN NIFTY', lot: 60 },
  { symbol: 'MIDCPNIFTY', name: 'MIDCAP NIFTY', lot: 120 },
  { symbol: 'SENSEX', name: 'BSE SENSEX', lot: 20 },
  { symbol: 'BANKEX', name: 'BSE BANKEX', lot: 30 },
];

export default function OptionChainView({ onSelectStock }) {
  // Navigation & Selection States
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [strikeRange, setStrikeRange] = useState('20'); // '10', '20', '30', 'all'
  const [searchStock, setSearchStock] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Real-Time Chart Modal State (0-Delay Powered by Fyers API v3)
  const [chartModal, setChartModal] = useState({
    isOpen: false,
    symbol: '',
    contractTitle: '',
    initialLtp: null,
    isOption: false
  });

  // Data States
  const [symbolsData, setSymbolsData] = useState({ indices: [], stocks: [] });
  const [chainData, setChainData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10); // 10s default for exchange safety; 1s when Fyers connected
  const [isPaperTerminalOpen, setIsPaperTerminalOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('stock_finder_paper_terminal_open');
      if (saved !== null) return saved === 'true';
      const legs = localStorage.getItem('stock_finder_paper_legs');
      const trades = localStorage.getItem('stock_finder_paper_trades');
      return (legs && JSON.parse(legs).length > 0) || (trades && JSON.parse(trades).length > 0);
    } catch {
      return false;
    }
  });

  const [paperLegs, setPaperLegs] = useState(() => {
    try {
      const saved = localStorage.getItem('stock_finder_paper_legs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deployedTradesCount, setDeployedTradesCount] = useState(() => {
    try {
      const saved = localStorage.getItem('stock_finder_paper_trades');
      return saved ? JSON.parse(saved).length : 0;
    } catch {
      return 0;
    }
  });

  const [hoveredStrike, setHoveredStrike] = useState(null);

  // Sync paperLegs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('stock_finder_paper_legs', JSON.stringify(paperLegs));
    } catch (e) {
      console.error('Failed to save paper legs:', e);
    }
  }, [paperLegs]);

  // Sync isPaperTerminalOpen to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('stock_finder_paper_terminal_open', String(isPaperTerminalOpen));
    } catch (e) {
      console.error('Failed to save terminal open state:', e);
    }
  }, [isPaperTerminalOpen]);

  // Keep deployedTradesCount updated
  useEffect(() => {
    const updateTradesCount = () => {
      try {
        const saved = localStorage.getItem('stock_finder_paper_trades');
        setDeployedTradesCount(saved ? JSON.parse(saved).length : 0);
      } catch {}
    };
    window.addEventListener('storage', updateTradesCount);
    const interval = setInterval(updateTradesCount, 1500);
    return () => {
      window.removeEventListener('storage', updateTradesCount);
      clearInterval(interval);
    };
  }, []);

  // Fyers API v3 Auth Status & 1-Click Connector Modal
  const [fyersStatus, setFyersStatus] = useState({ authenticated: false, auth_url: '' });
  const [isFyersModalOpen, setIsFyersModalOpen] = useState(false);
  const [fyersAuthInput, setFyersAuthInput] = useState('');
  const [isConnectingFyers, setIsConnectingFyers] = useState(false);
  const [fyersMsg, setFyersMsg] = useState(null);

  const checkFyersStatus = async () => {
    try {
      const res = await fetch('/api/fyers/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setFyersStatus(data);
        if (data.authenticated) {
          setRefreshInterval(prev => (prev >= 10 ? 1 : prev));
        } else {
          setRefreshInterval(prev => (prev < 10 ? 10 : prev));
        }
      }
    } catch (e) {
      console.error('Failed to check Fyers status:', e);
    }
  };

  useEffect(() => {
    checkFyersStatus();
  }, []);

  const handleConnectFyers = async (e) => {
    e.preventDefault();
    if (!fyersAuthInput.trim()) return;
    setIsConnectingFyers(true);
    setFyersMsg(null);
    try {
      const res = await fetch('/api/fyers/set-auth-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_code: fyersAuthInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setFyersMsg({ type: 'success', text: 'Fyers connected successfully! 1-second live streaming activated.' });
        setFyersAuthInput('');
        checkFyersStatus();
        fetchOptionChain(selectedSymbol, selectedExpiry, true);
        setTimeout(() => setIsFyersModalOpen(false), 1500);
      } else {
        setFyersMsg({ type: 'error', text: data.detail || data.response?.message || 'Invalid auth code. Please try logging in again.' });
      }
    } catch (err) {
      setFyersMsg({ type: 'error', text: 'Connection failed. Please check network and try again.' });
    } finally {
      setIsConnectingFyers(false);
    }
  };

  const searchContainerRef = useRef(null);
  const atmRowRef = useRef(null);
  const tableContainerRef = useRef(null);

  // Auto-focus and scroll to ATM strike price in the center of the view
  const scrollToAtm = (smooth = true) => {
    if (atmRowRef.current) {
      atmRowRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'center',
        inline: 'nearest'
      });
    }
  };

  // Close search dropdown when clicking outside or pressing Escape & handle PageDown/PageUp for frozen pane
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }

      // If user is typing in search input or any form field, do not intercept keyboard navigation
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      if (e.key === 'PageDown') {
        e.preventDefault();
        if (tableContainerRef.current) {
          const scrollAmount = tableContainerRef.current.clientHeight * 0.75;
          tableContainerRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        }
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        if (tableContainerRef.current) {
          const scrollAmount = tableContainerRef.current.clientHeight * 0.75;
          tableContainerRef.current.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
        }
      } else if (e.key === 'Home') {
        if (tableContainerRef.current) {
          e.preventDefault();
          tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (e.key === 'End') {
        if (tableContainerRef.current) {
          e.preventDefault();
          tableContainerRef.current.scrollTo({ top: tableContainerRef.current.scrollHeight, behavior: 'smooth' });
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 1. Fetch available symbols (Indices + 210 F&O stocks)
  useEffect(() => {
    const loadSymbols = async () => {
      try {
        const res = await fetch('/api/option-chain/symbols');
        if (res.ok) {
          const data = await res.json();
          setSymbolsData(data);
        }
      } catch (e) {
        console.error('Failed to load option symbols:', e);
      }
    };
    loadSymbols();
  }, []);

  const lastFetchedRef = useRef({ symbol: '', expiry: '' });
  const isFetchingRef = useRef(false);

  // 2. Fetch Option Chain data for selected symbol & expiry
  const fetchOptionChain = async (symbolToFetch = selectedSymbol, expiryToFetch = selectedExpiry, force = false, isSilent = false) => {
    if (!symbolToFetch) return;

    // Avoid redundant duplicate fetch if parameters haven't changed (e.g. from setting selectedExpiry on mount)
    if (!force && lastFetchedRef.current.symbol === symbolToFetch && lastFetchedRef.current.expiry === expiryToFetch) {
      return;
    }

    // In-flight guard: prevent piling up multiple requests when exchange call takes > 1 second
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const hasDataForCurrentSymbol = chainData && chainData.symbol === symbolToFetch;

      if (!isSilent) {
        if (force || hasDataForCurrentSymbol) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);
      }
      const params = new URLSearchParams();
      params.append('symbol', symbolToFetch);
      if (expiryToFetch) params.append('expiry', expiryToFetch);
      if (force) params.append('force', 'true');
      params.append('_t', Date.now().toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`/api/option-chain/data?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      setChainData(data);

      const loadedExpiry = expiryToFetch || data.selected_expiry || '';
      lastFetchedRef.current = { symbol: symbolToFetch, expiry: loadedExpiry };

      // Set expiry if not set
      if (!expiryToFetch && data.selected_expiry) {
        setSelectedExpiry(data.selected_expiry);
      }
    } catch (err) {
      console.error('Option chain fetch error:', err);
      if (!isSilent) {
        setError('Exchange feed busy. Loading cached strikes snapshot...');
      }
      // If we don't have data rendered yet, try immediately fetching cache without force
      if (!chainData) {
        try {
          const fallbackRes = await fetch(`/api/option-chain/data?symbol=${encodeURIComponent(symbolToFetch)}`);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            setChainData(fallbackData);
            if (!expiryToFetch && fallbackData.selected_expiry) {
              setSelectedExpiry(fallbackData.selected_expiry);
            }
          }
        } catch (fbErr) {
          console.error('Cached strikes fallback error:', fbErr);
        }
      }
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Trigger fetch on symbol or expiry change
  useEffect(() => {
    fetchOptionChain(selectedSymbol, selectedExpiry);
  }, [selectedSymbol, selectedExpiry]);

  // Real-time 1-Second Auto-refresh powered by Fyers API v3 (Silent background update, no button blinking)
  useEffect(() => {
    if (!autoRefresh) return;
    const intervalMs = Math.max(1, refreshInterval) * 1000;
    const interval = setInterval(() => {
      fetchOptionChain(selectedSymbol, selectedExpiry, true, true);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, selectedSymbol, selectedExpiry]);

  // Filter stocks for search dropdown
  const filteredStocks = useMemo(() => {
    if (!searchStock.trim()) return symbolsData.stocks.slice(0, 30);
    const q = searchStock.toLowerCase();
    return symbolsData.stocks.filter(s => 
      s.symbol.toLowerCase().includes(q) || 
      (s.name && s.name.toLowerCase().includes(q))
    ).slice(0, 25);
  }, [searchStock, symbolsData.stocks]);

  // Filter strikes based on range around ATM
  const visibleStrikes = useMemo(() => {
    if (!chainData || !chainData.strikes) return [];
    if (strikeRange === 'all') return chainData.strikes;

    const rangeCount = parseInt(strikeRange, 10) || 20;
    const atmIndex = chainData.strikes.findIndex(s => s.is_atm);
    if (atmIndex === -1) return chainData.strikes.slice(0, rangeCount * 2);

    const start = Math.max(0, atmIndex - rangeCount);
    const end = Math.min(chainData.strikes.length, atmIndex + rangeCount + 1);
    return chainData.strikes.slice(start, end);
  }, [chainData, strikeRange]);

  // Automatically focus and center on ATM strike when option chain loads or selection changes
  useEffect(() => {
    if (!isLoading && chainData && visibleStrikes.length > 0) {
      const timer = setTimeout(() => {
        scrollToAtm(true);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isLoading, selectedSymbol, selectedExpiry, strikeRange, chainData?.atm_strike]);

  // Generate direct TradingView Chart URL for NSE Option Contract
  const getTradingViewUrl = (sym, exp, strike, optType) => {
    let ticker = '';
    try {
      if (exp && exp.includes('-')) {
        const parts = exp.split('-');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const monthMap = {
            JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
            JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
          };
          const m = monthMap[parts[1].toUpperCase()] || '09';
          const y = parts[2].slice(-2);
          const optCode = optType.startsWith('C') ? 'C' : 'P';
          const prefix = sym === 'SENSEX' ? 'BSE' : 'NSE';
          ticker = `${prefix}:${sym}${y}${m}${day}${optCode}${Math.round(strike)}`;
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (!ticker) {
      const prefix = sym === 'SENSEX' ? 'BSE' : 'NSE';
      ticker = `${prefix}:${sym}${Math.round(strike)}${optType}`;
    }
    return `https://in.tradingview.com/chart/?symbol=${encodeURIComponent(ticker)}`;
  };

  // Open Real-time Candlestick Chart Modal (0-delay powered by Fyers API v3)
  const openChartModal = (row, optType = 'CE') => {
    const isOption = !!optType;
    const strike = row?.strike;
    const sideData = optType === 'CE' ? row?.ce : row?.pe;

    // Use official Fyers symbol if provided by backend, or format fallback
    let chartSym = sideData?.tv_symbol;
    if (!chartSym && isOption) {
      chartSym = `NSE:${selectedSymbol}${strike}${optType}`;
      // Spot underlying
      const isIndex = POPULAR_INDICES.some(idx => idx.symbol === selectedSymbol);
      if (selectedSymbol === 'SENSEX') chartSym = 'BSE:SENSEX-INDEX';
      else if (selectedSymbol === 'NIFTY') chartSym = 'NSE:NIFTY50-INDEX';
      else if (selectedSymbol === 'BANKNIFTY') chartSym = 'NSE:NIFTYBANK-INDEX';
      else if (selectedSymbol === 'FINNIFTY') chartSym = 'NSE:FINNIFTY-INDEX';
      else if (selectedSymbol === 'MIDCPNIFTY') chartSym = 'NSE:MIDCPNIFTY-INDEX';
      else if (selectedSymbol === 'NIFTYNXT50') chartSym = 'NSE:NIFTYNEXT50-INDEX';
      else if (selectedSymbol === 'BANKEX') chartSym = 'BSE:BANKEX-INDEX';
      else if (isIndex) chartSym = `NSE:${selectedSymbol}-INDEX`;
      else chartSym = `NSE:${selectedSymbol}-EQ`;
    }

    const title = sideData?.contract_title || (
      isOption 
        ? `${selectedSymbol} ₹${strike?.toLocaleString('en-IN')} ${optType}`
        : `${chainData?.name || selectedSymbol} Spot`
    );

    setChartModal({
      isOpen: true,
      symbol: chartSym,
      contractTitle: title,
      initialLtp: sideData?.ltp || chainData?.underlying_price || null,
      isOption,
      underlyingChange: sideData?.change !== undefined ? sideData.change : chainData?.underlying_change,
      underlyingPchange: sideData?.pchange !== undefined ? sideData.pchange : chainData?.underlying_pchange
    });
  };

  // Open directly on TradingView.com in a new tab (fallback)
  const openTradingView = (strike, optType = 'CE') => {
    const exp = chainData?.selected_expiry || selectedExpiry;
    const url = getTradingViewUrl(selectedSymbol, exp, strike, optType);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Live quotes map for real-time PnL in Paper Trading Terminal
  const quotesMap = useMemo(() => {
    const map = {};
    if (chainData?.strikes) {
      for (const s of chainData.strikes) {
        if (s.ce?.ltp !== undefined) map[`${s.strike}_CE`] = s.ce.ltp;
        if (s.pe?.ltp !== undefined) map[`${s.strike}_PE`] = s.pe.ltp;
      }
    }
    return map;
  }, [chainData]);

  // Quick trade handler when clicking B (Buy) or S (Sell) near strike
  const handleQuickTrade = (e, strike, type, action) => {
    e.stopPropagation();
    const row = (chainData?.strikes || []).find(s => s.strike === strike);
    const sideData = type === 'CE' ? row?.ce : row?.pe;
    const entryPrice = sideData?.ltp || 100;
    const currentLotSize = chainData?.lot_size || (selectedSymbol.includes('BANK') ? 30 : selectedSymbol.includes('SENSEX') ? 20 : 50);

    setPaperLegs(prev => {
      const existingIndex = prev.findIndex(l => l.strike === strike && l.type === type && l.action === action);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], lots: (updated[existingIndex].lots || 1) + 1 };
        return updated;
      }
      return [
        ...prev,
        {
          id: `${strike}_${type}_${action}_${Date.now()}`,
          symbol: selectedSymbol,
          strike,
          type,
          action,
          entryPrice,
          lots: 1,
          lotSize: currentLotSize
        }
      ];
    });

    setIsPaperTerminalOpen(true);
  };

  const handleSelectSymbol = (sym) => {
    if (sym === selectedSymbol) return;
    setChainData(null);
    setSelectedSymbol(sym);
    setSelectedExpiry(''); // reset expiry to pick nearest
    setIsSearchOpen(false);
    setSearchStock('');
  };

  // Determine PCR sentiment
  const pcr = chainData?.pcr_oi || 1.0;
  let pcrSentiment = 'Neutral / Rangebound';
  let pcrColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  if (pcr >= 1.25) {
    pcrSentiment = 'Strong Bullish Bias';
    pcrColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  } else if (pcr >= 1.05) {
    pcrSentiment = 'Mildly Bullish';
    pcrColor = 'text-teal-400 border-teal-500/30 bg-teal-500/10';
  } else if (pcr <= 0.75) {
    pcrSentiment = 'Strong Bearish Bias';
    pcrColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  } else if (pcr < 0.95) {
    pcrSentiment = 'Mildly Bearish';
    pcrColor = 'text-orange-400 border-orange-500/30 bg-orange-500/10';
  }

  // Format Large Numbers (Lakhs / Crores)
  const formatOi = (val) => {
    if (!val) return '0';
    if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
    return val.toLocaleString('en-IN');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100 relative">
      {/* Dimmed Page Backdrop Overlay when Search is Active */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/75 z-40 backdrop-blur-[2px] transition-opacity cursor-pointer"
          onClick={() => setIsSearchOpen(false)}
        />
      )}

      {/* ============================================================ */}
      {/* FROZEN MAIN PANE: Indices, Search, Controls & Market Metrics */}
      {/* Always pinned & frozen at top when user scrolls or page downs*/}
      {/* ============================================================ */}
      <div className={`shrink-0 sticky top-0 bg-slate-900 border-b border-slate-800 shadow-md ${isSearchOpen ? 'z-50' : 'z-20'}`}>
        {/* Tier 1 & Tier 2: Indices, Search, Expiry, Strikes, Refresh */}
        <div className="p-3 sm:p-4 pb-2.5 flex flex-col gap-3">
          {/* Tier 1: Index Pills & F&O Stock Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Popular Index Switchers */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Indices:
              </span>
              {POPULAR_INDICES.map(idx => {
                const isActive = selectedSymbol === idx.symbol;
                return (
                  <button
                    key={idx.symbol}
                    onClick={() => handleSelectSymbol(idx.symbol)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/50 scale-102'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    <span>{idx.name}</span>
                    {idx.lot && (
                      <span className={`text-[10px] font-mono px-1 py-0.2 rounded font-normal ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-900/80 text-slate-400'
                      }`}>
                        {idx.lot}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Searchable F&O Stocks Dropdown */}
            <div className={`relative flex-1 sm:max-w-md min-w-[220px] transition-all duration-200 ${isSearchOpen ? 'z-50' : 'z-20'}`} ref={searchContainerRef}>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchStock}
                  onChange={(e) => {
                    setSearchStock(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Search 210+ F&O Stocks (e.g. RELIANCE, TCS)..."
                  className="w-full pl-9 pr-16 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 shadow-xl"
                  style={{ backgroundColor: '#09090b', opacity: 1 }}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {searchStock && (
                    <button
                      onClick={() => setSearchStock('')}
                      className="text-slate-400 hover:text-slate-200 text-xs px-1 cursor-pointer"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                  {isSearchOpen && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono select-none">
                      ESC
                    </span>
                  )}
                </div>
              </div>

              {/* Dropdown Options Overlay - Completely Opaque & Non-Transparent */}
              {isSearchOpen && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-slate-700 shadow-2xl shadow-black max-h-80 overflow-y-auto z-50 p-1 divide-y divide-slate-800"
                  style={{ backgroundColor: '#0f172a', opacity: 1 }}
                >
                  <div 
                    className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 border-b border-slate-800"
                    style={{ backgroundColor: '#0f172a' }}
                  >
                    <span>F&O Equities & Indices</span>
                    <span className="text-slate-500 font-normal">{filteredStocks.length} Results</span>
                  </div>
                  {filteredStocks.map(stk => (
                    <button
                      key={stk.symbol}
                      onClick={() => handleSelectSymbol(stk.symbol)}
                      className="w-full px-3 py-2 text-left rounded-lg hover:bg-slate-800 flex items-center justify-between text-xs transition-colors group cursor-pointer"
                      style={{ backgroundColor: '#0f172a' }}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white group-hover:text-indigo-300">{stk.symbol}</span>
                          {stk.lot_size && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              Lot: {stk.lot_size.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate max-w-[190px]">{stk.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-slate-200">₹{stk.current_price}</span>
                        <p className={`text-[10px] font-bold ${stk.change_1d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {stk.change_1d >= 0 ? '+' : ''}{stk.change_1d}%
                        </p>
                      </div>
                    </button>
                  ))}
                  {filteredStocks.length === 0 && (
                    <div 
                      className="p-4 text-center text-xs text-slate-400"
                      style={{ backgroundColor: '#0f172a' }}
                    >
                      No F&O stocks matching "{searchStock}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tier 2: Expiry Selection, Strike Range Filter, Refresh & Market Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
            <div className="flex flex-wrap items-center gap-3">
              {/* Expiry Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium">Expiry:</span>
                <div className="relative">
                  <select
                    value={selectedExpiry}
                    onChange={(e) => setSelectedExpiry(e.target.value)}
                    className="bg-slate-950 border border-slate-700/90 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 pr-7 cursor-pointer appearance-none"
                  >
                    {(chainData?.available_expiries || []).map(exp => (
                      <option key={exp} value={exp}>
                        {exp}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Strike Filter Range */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium">Strikes:</span>
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  {['10', '20', '30', 'all'].map(rng => (
                    <button
                      key={rng}
                      onClick={() => setStrikeRange(rng)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                        strikeRange === rng
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {rng === 'all' ? 'All' : `±${rng}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Refresh & Speed Controls */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 gap-1 text-xs">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    autoRefresh
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Toggle real-time auto-refresh"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                  <span>{autoRefresh ? 'Live' : 'Paused'}</span>
                </button>

                {autoRefresh && (
                  <div className="flex items-center gap-0.5 pl-1 border-l border-slate-800">
                    {(fyersStatus.authenticated ? [1, 2, 5] : [10, 15, 30]).map(sec => (
                      <button
                        key={sec}
                        onClick={() => setRefreshInterval(sec)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                          refreshInterval === sec
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                        title={
                          fyersStatus.authenticated
                            ? `Stream live tick data every ${sec} second(s) via Fyers broker API`
                            : `Refresh every ${sec}s (exchange-safe rate limit). Connect Fyers for 1s live streaming.`
                        }
                      >
                        {sec}s
                      </button>
                    ))}
                    {!fyersStatus.authenticated && (
                      <button
                        onClick={() => setIsFyersModalOpen(true)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 cursor-pointer ml-0.5"
                        title="Click to connect free Fyers broker API for 1-second real-time tick streaming"
                      >
                        ⚡ 1s?
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Action: Paper Trading, Focus ATM, Refresh button & TradingView Tip */}
            <div className="flex items-center gap-2">
              {/* Paper Trading Terminal Toggle */}
              <button
                onClick={() => setIsPaperTerminalOpen(!isPaperTerminalOpen)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                  isPaperTerminalOpen || paperLegs.length > 0 || deployedTradesCount > 0
                    ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white border-emerald-400/60 shadow-emerald-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="Open Paper Trading & Strategy Payoff Terminal"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Paper Trading</span>
                {(paperLegs.length > 0 || deployedTradesCount > 0) && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white text-indigo-900 text-[10px] font-black">
                    {deployedTradesCount > 0 ? `${deployedTradesCount} Pos` : `${paperLegs.length}`}
                  </span>
                )}
              </button>

              {/* Focus ATM Button */}
              <button
                onClick={() => scrollToAtm(true)}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Scroll directly to At-The-Money (ATM) strike price"
              >
                <Target className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Focus ATM {chainData?.atm_strike ? `(₹${chainData.atm_strike.toLocaleString('en-IN')})` : ''}</span>
              </button>

              <button
                onClick={() => fetchOptionChain(selectedSymbol, selectedExpiry, true)}
                disabled={isRefreshing}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                title="Fetch fresh real-time option chain from exchange"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
                <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
              </button>

              {/* Info Badge */}
              <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Click any <b>Strike</b>, <b>LTP</b>, or <b>Spot</b> for <b>Real-Time 0-Delay Candlestick Chart</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Tier 3: Market Status Banner & Derivatives Metrics Strip */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/70 flex flex-wrap items-center justify-between gap-4">
          {/* Market Status & Underlying Spot */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Live / Market Closed Tag */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-bold ${
              chainData?.is_market_open
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-sm shadow-amber-500/10'
            }`}>
              <span className={`w-2 h-2 rounded-full ${chainData?.is_market_open ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
              <span>{chainData?.market_status_label || (chainData?.is_market_open ? 'LIVE MARKET' : 'MARKET CLOSED')}</span>
            </div>

            {/* Live IST Time Badge */}
            {chainData?.as_of_time && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg shadow-sm">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>{chainData.as_of_time}</span>
              </span>
            )}

            {/* Live Feed Source & 1-Click Broker Connector */}
            {chainData?.feed_source === 'FYERS_API_V3' ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ⚡ Fyers 1s Stream Active
              </span>
            ) : chainData?.feed_source === 'HYBRID_CACHE_LIVE_SPOT' ? (
              <button
                onClick={() => setIsFyersModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 font-mono text-[11px] font-bold transition-all cursor-pointer shadow-sm hover:scale-102"
                title="Live spot price with cached closing strikes. Connect Fyers for 1s real-time tick streaming"
              >
                <Zap className="w-3 h-3 text-indigo-400 animate-pulse" />
                <span>Live Spot Feed • Connect Fyers for 1s</span>
              </button>
            ) : (
              <button
                onClick={() => setIsFyersModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold transition-all cursor-pointer shadow-sm hover:scale-102"
                title="Click to connect Fyers for 1-second sub-second real-time streaming"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>NSE Feed (Connect Fyers for 1s Live)</span>
              </button>
            )}

            {/* Underlying Spot Price (Clickable to open Real-Time Chart) */}
            <div 
              onClick={() => openChartModal(null, null)}
              className="flex items-center gap-2.5 cursor-pointer group/spot hover:opacity-90 transition-all flex-wrap"
              title={`View ${chainData?.name || selectedSymbol} Real-Time 0-Delay Candlestick Chart`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white tracking-tight group-hover/spot:text-indigo-300 flex items-center gap-1">
                  {chainData?.name || selectedSymbol}
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-400 inline opacity-70 group-hover/spot:opacity-100" />
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Lot: {chainData?.lot_size ? chainData.lot_size.toLocaleString('en-IN') : '—'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white font-mono">
                  ₹{chainData?.underlying_price?.toLocaleString('en-IN') || '—'}
                </span>

                {/* Points and percentages of change from last session beside specific symbol */}
                {chainData?.underlying_change !== undefined && chainData?.underlying_change !== null && (
                  <span className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-lg border shadow-sm ${
                    chainData.underlying_change >= 0 
                      ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30 shadow-emerald-500/10' 
                      : 'text-rose-400 bg-rose-500/15 border-rose-500/30 shadow-rose-500/10'
                  }`}>
                    {chainData.underlying_change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{chainData.underlying_change >= 0 ? '+' : ''}{chainData.underlying_change.toLocaleString('en-IN')}</span>
                    <span>({chainData.underlying_pchange >= 0 ? '+' : ''}{chainData.underlying_pchange}%)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Session Note */}
            {chainData?.session_note && (
              <span className="text-[11px] text-slate-400 hidden lg:inline">
                • {chainData.session_note}
              </span>
            )}
          </div>

          {/* Derivatives Metrics: PCR, Max Pain, ATM Straddle */}
          <div className="flex items-center gap-4 text-xs flex-wrap">
            {/* PCR Indicator */}
            <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-2 ${pcrColor}`}>
              <span className="font-semibold text-slate-400">PCR:</span>
              <span className="font-mono font-black text-sm">{chainData?.pcr_oi || '—'}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:inline">({pcrSentiment})</span>
            </div>

            {/* Max Pain Strike */}
            <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-500">Max Pain:</span>
              <span className="font-mono font-bold text-amber-300">₹{chainData?.max_pain_strike?.toLocaleString('en-IN') || '—'}</span>
            </div>

            {/* ATM Straddle */}
            <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-500">ATM Straddle:</span>
              <span className="font-mono font-bold text-cyan-300">₹{chainData?.atm_straddle_price || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace: Option Chain Table & Side-by-Side Paper Trading Terminal */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Pane: Option Chain Table + Summary Footer */}
        <div className={`flex flex-col min-h-0 overflow-hidden transition-all duration-150 ${
          isPaperTerminalOpen ? 'flex-1 lg:flex-initial w-full lg:w-[58%] xl:w-[62%] h-auto lg:h-full' : 'w-full h-full'
        }`}>
          {/* Main Option Chain Table */}
          <div 
            className="flex-1 min-h-0 overflow-auto relative outline-none focus:ring-1 focus:ring-indigo-500/20" 
            ref={tableContainerRef}
            tabIndex={0}
          >
            {/* Initial full loading overlay - only shown when NO data is rendered yet */}
            {isLoading && !chainData && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center min-h-[360px] gap-4">
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-indigo-300 shadow-2xl">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold">Streaming authentic option chain from NSE...</span>
                </div>
                <button
                  onClick={() => fetchOptionChain(selectedSymbol, selectedExpiry, false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-all cursor-pointer shadow-lg"
                >
                  Load Cached Strikes Snapshot
                </button>
              </div>
            )}

            {/* Non-blocking top progress line during background refreshes */}
            {isRefreshing && (
              <div className="sticky top-0 left-0 right-0 z-30 h-1 bg-slate-800/80 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500 animate-pulse w-full"></div>
              </div>
            )}

            <table className="w-full text-left border-collapse text-xs select-none">
              {/* Table Header Tier 1: CALLS vs PUTS Banner */}
              <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-800 text-xs shadow-md">
                <tr className="border-b border-slate-800/80">
                  <th colSpan={6} className="py-2 text-center text-emerald-400 font-bold uppercase tracking-wider bg-emerald-950/40 border-r border-slate-800">
                    CALLS (CE)
                  </th>
                  <th className="py-2 text-center text-white font-extrabold uppercase tracking-wider bg-slate-950 border-r border-slate-800 px-4">
                    STRIKE
                  </th>
                  <th colSpan={6} className="py-2 text-center text-rose-400 font-bold uppercase tracking-wider bg-rose-950/40">
                    PUTS (PE)
                  </th>
                </tr>
                {/* Table Header Tier 2: Specific Columns */}
                <tr className="bg-slate-950/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                  {/* CE Columns */}
                  <th className="py-2 px-3 text-right">OI (Chg)</th>
                  <th className="py-2 px-2 text-right">Volume</th>
                  <th className="py-2 px-2 text-right">IV (%)</th>
                  <th className="py-2 px-2 text-right">Bid / Ask</th>
                  <th className="py-2 px-2 text-right">Change</th>
                  <th className="py-2 px-3 text-right border-r border-slate-800 text-emerald-300 font-bold">
                    {chainData?.is_market_open ? 'LTP (₹)' : 'Close LTP (₹)'}
                  </th>

                  {/* STRIKE Column */}
                  <th className="py-2 px-4 text-center bg-slate-900 text-white font-bold border-r border-slate-800">
                    Strike Price
                  </th>

                  {/* PE Columns */}
                  <th className="py-2 px-3 text-left border-r border-slate-800 text-rose-300 font-bold">
                    {chainData?.is_market_open ? 'LTP (₹)' : 'Close LTP (₹)'}
                  </th>
                  <th className="py-2 px-2 text-left">Change</th>
                  <th className="py-2 px-2 text-left">Bid / Ask</th>
                  <th className="py-2 px-2 text-left">IV (%)</th>
                  <th className="py-2 px-2 text-left">Volume</th>
                  <th className="py-2 px-3 text-left">OI (Chg)</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {visibleStrikes.map((row) => {
                  const strike = row.strike;
                  const isAtm = row.is_atm;
                  const ce = row.ce || {};
                  const pe = row.pe || {};

                  // Background styling:
                  // Calls ITM (strike < spot): tinted amber/yellow
                  // Puts ITM (strike > spot): tinted amber/yellow
                  const ceItmBg = ce.in_the_money ? 'bg-amber-500/[0.04]' : 'bg-transparent';
                  const peItmBg = pe.in_the_money ? 'bg-amber-500/[0.04]' : 'bg-transparent';

                  return (
                    <tr 
                      key={strike} 
                      ref={isAtm ? atmRowRef : null}
                      id={isAtm ? "atm-strike-row" : undefined}
                      onMouseEnter={() => setHoveredStrike(strike)}
                      onMouseLeave={() => setHoveredStrike(null)}
                      onClick={() => setHoveredStrike(strike)}
                      className={`hover:bg-slate-800/60 transition-colors group ${
                        isAtm ? 'ring-2 ring-indigo-400 bg-indigo-950/40 shadow-lg shadow-indigo-500/20 z-10 relative' : ''
                      }`}
                    >
                      {/* CE: OI & OI Change */}
                      <td className={`py-1.5 px-3 text-right ${ceItmBg}`}>
                        <span className="text-slate-300 font-semibold">{formatOi(ce.oi)}</span>
                        {ce.oi_change !== 0 && (
                          <span className={`block text-[9px] font-bold ${ce.oi_change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {ce.oi_change > 0 ? '+' : ''}{formatOi(ce.oi_change)}
                          </span>
                        )}
                      </td>

                      {/* CE: Volume */}
                      <td className={`py-1.5 px-2 text-right text-slate-400 ${ceItmBg}`}>
                        {formatOi(ce.volume)}
                      </td>

                      {/* CE: IV */}
                      <td className={`py-1.5 px-2 text-right text-cyan-300 ${ceItmBg}`}>
                        {ce.iv ? `${ce.iv}%` : '—'}
                      </td>

                      {/* CE: Bid / Ask */}
                      <td className={`py-1.5 px-2 text-right text-[10px] text-slate-400 ${ceItmBg}`}>
                        <span className="text-slate-300">{ce.bid || '—'}</span> / <span className="text-slate-300">{ce.ask || '—'}</span>
                      </td>

                      {/* CE: Change */}
                      <td className={`py-1.5 px-2 text-right ${ceItmBg}`}>
                        <span className={`font-bold ${ce.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {ce.change >= 0 ? '+' : ''}{ce.change}
                        </span>
                        <span className="block text-[9px] text-slate-500">
                          ({ce.pchange >= 0 ? '+' : ''}{ce.pchange}%)
                        </span>
                      </td>

                      {/* CE: LTP (Clickable -> Opens Real-Time 0-Delay Candlestick Chart) */}
                      <td 
                        onClick={() => openChartModal(row, 'CE')}
                        className={`py-1.5 px-3 text-right font-black text-xs text-emerald-300 border-r border-slate-800 cursor-pointer hover:bg-emerald-950/60 hover:underline transition-all ${ceItmBg}`}
                        title={`Open ${selectedSymbol} ₹${strike} CE Real-Time Candlestick Chart`}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>₹{ce.ltp}</span>
                          <BarChart2 className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 text-emerald-400 transition-opacity" />
                        </div>
                      </td>

                      {/* STRIKE PRICE (CENTER) - Buy & Sell Action Buttons on Hover */}
                      <td 
                        className={`py-1 px-1.5 text-center border-r border-slate-800 transition-all select-none ${
                          isAtm 
                            ? 'bg-indigo-600 text-white font-black shadow-md' 
                            : 'bg-slate-900 text-white font-extrabold'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 min-w-[140px] px-1">
                          {/* CE Quick Trade Buttons (LEFT of Strike - Calls) */}
                          <div className={`flex items-center gap-1 transition-all ${hoveredStrike === strike ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                            <button
                              onClick={(e) => handleQuickTrade(e, strike, 'CE', 'BUY')}
                              className="w-5 h-5 rounded bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] flex items-center justify-center shadow-md shadow-blue-500/40 active:scale-90 cursor-pointer"
                              title={`Paper Trade: BUY ${selectedSymbol} ₹${strike} Call (CE) @ ₹${ce.ltp}`}
                            >
                              B
                            </button>
                            <button
                              onClick={(e) => handleQuickTrade(e, strike, 'CE', 'SELL')}
                              className="w-5 h-5 rounded bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-md shadow-rose-500/40 active:scale-90 cursor-pointer"
                              title={`Paper Trade: SELL ${selectedSymbol} ₹${strike} Call (CE) @ ₹${ce.ltp}`}
                            >
                              S
                            </button>
                          </div>

                          {/* Strike Price & Real-Time Chart Link */}
                          <div 
                            onClick={() => openChartModal(row, strike >= (chainData?.underlying_price || 0) ? 'CE' : 'PE')}
                            className="flex-1 flex items-center justify-center gap-1 cursor-pointer hover:text-indigo-200 hover:underline mx-1"
                            title={`Click to open Strike ₹${strike} Real-Time Candlestick Chart`}
                          >
                            <span className="font-mono font-bold text-xs">{strike.toLocaleString('en-IN')}</span>
                            {isAtm && (
                              <span className="px-1 py-0.2 rounded bg-white text-indigo-900 text-[8px] font-black uppercase">
                                ATM
                              </span>
                            )}
                            <BarChart2 className="w-2.5 h-2.5 opacity-40 hover:opacity-100 text-indigo-300 transition-opacity" />
                          </div>

                          {/* PE Quick Trade Buttons (RIGHT of Strike - Puts) */}
                          <div className={`flex items-center gap-1 transition-all ${hoveredStrike === strike ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                            <button
                              onClick={(e) => handleQuickTrade(e, strike, 'PE', 'BUY')}
                              className="w-5 h-5 rounded bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] flex items-center justify-center shadow-md shadow-blue-500/40 active:scale-90 cursor-pointer"
                              title={`Paper Trade: BUY ${selectedSymbol} ₹${strike} Put (PE) @ ₹${pe.ltp}`}
                            >
                              B
                            </button>
                            <button
                              onClick={(e) => handleQuickTrade(e, strike, 'PE', 'SELL')}
                              className="w-5 h-5 rounded bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-md shadow-rose-500/40 active:scale-90 cursor-pointer"
                              title={`Paper Trade: SELL ${selectedSymbol} ₹${strike} Put (PE) @ ₹${pe.ltp}`}
                            >
                              S
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* PE: LTP (Clickable -> Opens Real-Time 0-Delay Candlestick Chart) */}
                      <td 
                        onClick={() => openChartModal(row, 'PE')}
                        className={`py-1.5 px-3 text-left font-black text-xs text-rose-300 border-r border-slate-800 cursor-pointer hover:bg-rose-950/60 hover:underline transition-all ${peItmBg}`}
                        title={`Open ${selectedSymbol} ₹${strike} PE Real-Time Candlestick Chart`}
                      >
                        <div className="flex items-center justify-start gap-1">
                          <span>₹{pe.ltp}</span>
                          <BarChart2 className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 text-rose-400 transition-opacity" />
                        </div>
                      </td>

                      {/* PE: Change */}
                      <td className={`py-1.5 px-2 text-left ${peItmBg}`}>
                        <span className={`font-bold ${pe.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pe.change >= 0 ? '+' : ''}{pe.change}
                        </span>
                        <span className="block text-[9px] text-slate-500">
                          ({pe.pchange >= 0 ? '+' : ''}{pe.pchange}%)
                        </span>
                      </td>

                      {/* PE: Bid / Ask */}
                      <td className={`py-1.5 px-2 text-left text-[10px] text-slate-400 ${peItmBg}`}>
                        <span className="text-slate-300">{pe.bid || '—'}</span> / <span className="text-slate-300">{pe.ask || '—'}</span>
                      </td>

                      {/* PE: IV */}
                      <td className={`py-1.5 px-2 text-left text-cyan-300 ${peItmBg}`}>
                        {pe.iv ? `${pe.iv}%` : '—'}
                      </td>

                      {/* PE: Volume */}
                      <td className={`py-1.5 px-2 text-left text-slate-400 ${peItmBg}`}>
                        {formatOi(pe.volume)}
                      </td>

                      {/* PE: OI & OI Change */}
                      <td className={`py-1.5 px-3 text-left ${peItmBg}`}>
                        <span className="text-slate-300 font-semibold">{formatOi(pe.oi)}</span>
                        {pe.oi_change !== 0 && (
                          <span className={`block text-[9px] font-bold ${pe.oi_change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pe.oi_change > 0 ? '+' : ''}{formatOi(pe.oi_change)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && visibleStrikes.length === 0 && (
                  <tr>
                    <td colSpan={13} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <AlertCircle className="w-6 h-6 text-amber-400" />
                        <span className="text-xs font-semibold">No strikes currently loaded for {selectedSymbol}.</span>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => fetchOptionChain(selectedSymbol, selectedExpiry, false)}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md"
                          >
                            Load Cached Strikes Snapshot
                          </button>
                          <button
                            onClick={() => setIsFyersModalOpen(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md"
                          >
                            Connect Fyers for Live Feed
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Table Footer Summary */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-3">
              <span>Showing {visibleStrikes.length} of {chainData?.total_strikes || 0} strikes</span>
              <span className="text-slate-600">•</span>
              <span>Source: Official National Stock Exchange of India (NSE)</span>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/40"></span>
                <span>In-The-Money (ITM)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-indigo-600"></span>
                <span>At-The-Money (ATM)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Pane: Paper Trading Terminal (Side-by-Side Docked) */}
        {isPaperTerminalOpen && (
          <div className="w-full lg:w-[42%] xl:w-[38%] border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col bg-slate-900 shrink-0 h-[480px] lg:h-full shadow-2xl z-20 overflow-hidden">
            <PaperTradingTerminal
              isOpen={isPaperTerminalOpen}
              onClose={() => setIsPaperTerminalOpen(false)}
              activeLegs={paperLegs}
              onUpdateLegs={setPaperLegs}
              currentSpot={chainData?.underlying_price || 23500}
              symbol={selectedSymbol}
              expiry={chainData?.selected_expiry || selectedExpiry}
              lotSize={chainData?.lot_size || 50}
              quotesMap={quotesMap}
              isDocked={true}
            />
          </div>
        )}
      </div>

      {/* Real-Time Candlestick Chart Modal (0-Delay Powered by Fyers API v3) */}
      <RealTimeChartModal
        isOpen={chartModal.isOpen}
        onClose={() => setChartModal(prev => ({ ...prev, isOpen: false }))}
        symbol={chartModal.symbol}
        contractTitle={chartModal.contractTitle}
        initialLtp={chartModal.initialLtp}
        isOption={chartModal.isOption}
      />

      {/* 1-Click Fyers API v3 Token Connector Modal */}
      {isFyersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 relative text-slate-100">
            <button 
              onClick={() => setIsFyersModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Connect Fyers Live 1s Feed</h3>
                <p className="text-xs text-slate-400">Daily SEBI Broker Authentication</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
              Indian SEBI regulations mandate that all broker API tokens expire every morning at 06:00 AM IST. 
              Connect your Fyers account to activate <b>1-second real-time tick streaming</b> and <b>live candlestick charts</b>.
            </p>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-indigo-300 block mb-1.5">Step 1: Log in to Fyers</span>
                <a
                  href={fyersStatus.auth_url || "https://api-t1.fyers.in/api/v3/generate-authcode?client_id=1RGTQJ79OP-200&redirect_uri=https%3A%2F%2Ftrade.fyers.in%2Fapi-login%2Fredirect-uri%2Findex.html&response_type=code&state=None"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Fyers Official Login Page</span>
                </a>
              </div>

              <form onSubmit={handleConnectFyers}>
                <span className="text-xs font-bold text-indigo-300 block mb-1.5">Step 2: Paste Redirect URL or Auth Code</span>
                <input
                  type="text"
                  placeholder="Paste URL (https://trade.fyers.in/...auth_code=...) or code here"
                  value={fyersAuthInput}
                  onChange={(e) => setFyersAuthInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono mb-3"
                  required
                />

                {fyersMsg && (
                  <div className={`p-2.5 rounded-lg text-xs font-medium mb-3 flex items-center gap-2 ${
                    fyersMsg.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}>
                    {fyersMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{fyersMsg.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isConnectingFyers || !fyersAuthInput.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  {isConnectingFyers ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>{isConnectingFyers ? 'Activating Live Feed...' : 'Activate 1-Second Live Streaming'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
