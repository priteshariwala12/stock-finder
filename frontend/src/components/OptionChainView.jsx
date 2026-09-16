import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Layers, Search, RefreshCw, ChevronDown, Activity, Zap, 
  ExternalLink, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  ShieldCheck, AlertCircle, Info, Filter, Clock, Eye, BarChart2, Target
} from 'lucide-react';
import RealTimeChartModal from './RealTimeChartModal';

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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(1); // 1-second default real-time refresh
  const [error, setError] = useState(null);

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

  // 2. Fetch Option Chain data for selected symbol & expiry
  const fetchOptionChain = async (symbolToFetch = selectedSymbol, expiryToFetch = selectedExpiry, force = false, isSilent = false) => {
    if (!symbolToFetch) return;
    if (!isSilent) {
      if (force) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams();
      params.append('symbol', symbolToFetch);
      if (expiryToFetch) params.append('expiry', expiryToFetch);
      if (force) params.append('force', 'true');

      const res = await fetch(`/api/option-chain/data?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      setChainData(data);

      // Set expiry if not set
      if (!expiryToFetch && data.selected_expiry) {
        setSelectedExpiry(data.selected_expiry);
      }
    } catch (err) {
      console.error('Option chain fetch error:', err);
      if (!isSilent) {
        setError('Unable to load option chain data. Retrying with cache...');
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
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
    } else if (!chartSym) {
      // Spot underlying
      const isIndex = POPULAR_INDICES.some(idx => idx.symbol === selectedSymbol);
      if (selectedSymbol === 'SENSEX') chartSym = 'BSE:SENSEX-INDEX';
      else if (isIndex) chartSym = `NSE:${selectedSymbol}-INDEX`;
      else chartSym = `NSE:${selectedSymbol}-EQ`;
    }

    const title = sideData?.contract_title || (
      isOption 
        ? `${selectedSymbol} ₹${strike?.toLocaleString('en-IN')} ${optType}`
        : `${selectedSymbol} Spot`
    );

    setChartModal({
      isOpen: true,
      symbol: chartSym,
      contractTitle: title,
      initialLtp: sideData?.ltp || chainData?.underlying_price || null,
      isOption
    });
  };

  // Open directly on TradingView.com in a new tab (fallback)
  const openTradingView = (strike, optType = 'CE') => {
    const exp = chainData?.selected_expiry || selectedExpiry;
    const url = getTradingViewUrl(selectedSymbol, exp, strike, optType);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSelectSymbol = (sym) => {
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
                    {[1, 3, 5].map(sec => (
                      <button
                        key={sec}
                        onClick={() => setRefreshInterval(sec)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                          refreshInterval === sec
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                        title={`Refresh every ${sec} second(s)`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Action: Focus ATM, Refresh button & TradingView Tip */}
            <div className="flex items-center gap-2">
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

            {/* Fyers Live Feed Badge */}
            {chainData?.feed_source === 'FYERS_API_V3' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                ⚡ Fyers 1s Real-Time
              </span>
            )}

            {/* Underlying Spot Price (Clickable to open Real-Time Chart) */}
            <div 
              onClick={() => openChartModal(null, null)}
              className="flex items-baseline gap-2 cursor-pointer group/spot hover:opacity-90 transition-all"
              title={`View ${chainData?.name || selectedSymbol} Real-Time 0-Delay Candlestick Chart`}
            >
              <span className="text-sm font-black text-white tracking-tight group-hover/spot:text-indigo-300 flex items-center gap-1">
                {chainData?.name || selectedSymbol}
                <BarChart2 className="w-3 h-3 text-indigo-400 inline opacity-70 group-hover/spot:opacity-100" />
              </span>
              <span className="text-lg font-black text-white font-mono">
                ₹{chainData?.underlying_price?.toLocaleString('en-IN') || '—'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Lot: {chainData?.lot_size ? chainData.lot_size.toLocaleString('en-IN') : '—'}
              </span>
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

      {/* 3. Main Option Chain Table */}
      <div 
        className="flex-1 min-h-0 overflow-auto relative outline-none focus:ring-1 focus:ring-indigo-500/20" 
        ref={tableContainerRef}
        tabIndex={0}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-indigo-300 shadow-2xl">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold">Streaming authentic option chain from NSE...</span>
            </div>
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
                  className={`hover:bg-slate-800/40 transition-colors group ${
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

                  {/* STRIKE PRICE (CENTER) - Clickable -> Opens Real-Time Candlestick Chart */}
                  <td 
                    onClick={() => openChartModal(row, strike >= (chainData?.underlying_price || 0) ? 'CE' : 'PE')}
                    className={`py-2 px-3 text-center border-r border-slate-800 cursor-pointer transition-all ${
                      isAtm 
                        ? 'bg-indigo-600 text-white font-black shadow-md' 
                        : 'bg-slate-900 text-white font-extrabold hover:bg-indigo-900/60 hover:text-indigo-200'
                    }`}
                    title={`Open Strike ₹${strike} Real-Time Candlestick Chart`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{strike.toLocaleString('en-IN')}</span>
                      {isAtm && (
                        <span className="px-1 py-0.2 rounded bg-white text-indigo-900 text-[9px] font-black uppercase tracking-wider">
                          ATM
                        </span>
                      )}
                      <BarChart2 className="w-2.5 h-2.5 opacity-30 group-hover:opacity-100 text-indigo-300 transition-opacity" />
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

      {/* Real-Time Candlestick Chart Modal (0-Delay Powered by Fyers API v3) */}
      <RealTimeChartModal
        isOpen={chartModal.isOpen}
        onClose={() => setChartModal(prev => ({ ...prev, isOpen: false }))}
        symbol={chartModal.symbol}
        contractTitle={chartModal.contractTitle}
        initialLtp={chartModal.initialLtp}
        isOption={chartModal.isOption}
      />
    </div>
  );
}
