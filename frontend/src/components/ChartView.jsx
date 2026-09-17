import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart2, Search, ExternalLink, Zap, Maximize2, 
  Minimize2, RefreshCw, Clock, ChevronDown, Check, TrendingUp
} from 'lucide-react';
import { toTradingViewSymbol, getTradingViewWebUrl } from '../utils/tradingViewSymbols';

const QUICK_CHIPS = [
  { label: 'NIFTY 50', symbol: 'NSE:NIFTY' },
  { label: 'BANK NIFTY', symbol: 'NSE:BANKNIFTY' },
  { label: 'SENSEX', symbol: 'BSE:SENSEX' },
  { label: 'FINNIFTY', symbol: 'NSE:FINNIFTY' },
  { label: 'MIDCAP NIFTY', symbol: 'NSE:MIDCPNIFTY' },
  { label: 'RELIANCE', symbol: 'NSE:RELIANCE' },
  { label: 'HDFC BANK', symbol: 'NSE:HDFCBANK' },
  { label: 'TCS', symbol: 'NSE:TCS' },
  { label: 'TATA MOTORS', symbol: 'NSE:TATAMOTORS' },
  { label: 'INFOSYS', symbol: 'NSE:INFY' }
];

const TIMEFRAMES = [
  { label: '1m', value: '1' },
  { label: '3m', value: '3' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1H', value: '60' },
  { label: '1D', value: 'D' },
  { label: '1W', value: 'W' }
];

export default function ChartView({
  symbol = 'NSE:NIFTY',
  displayTitle = 'NIFTY 50',
  initialLtp = null,
  isOption = false,
  expiry = null,
  strike = null,
  optType = 'CE',
  onOpenChart = null
}) {
  const [activeSymbol, setActiveSymbol] = useState(symbol || 'NSE:NIFTY');
  const [activeTitle, setActiveTitle] = useState(displayTitle || 'NIFTY 50');
  const [interval, setInterval] = useState('5');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [chartEngine, setChartEngine] = useState('tradingview'); // 'tradingview' | 'fyers'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartWrapperRef = useRef(null);

  // Sync props when user clicks another stock or strike anywhere in the website
  useEffect(() => {
    if (symbol) {
      const tvSym = toTradingViewSymbol(symbol, expiry, strike, optType);
      setActiveSymbol(tvSym);
      setActiveTitle(displayTitle || symbol);
    }
  }, [symbol, displayTitle, expiry, strike, optType]);

  const activeTvSymbol = toTradingViewSymbol(activeSymbol, expiry, strike, optType);
  const tvWebUrl = getTradingViewWebUrl(activeTvSymbol);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!chartWrapperRef.current) return;
    if (!document.fullscreenElement) {
      chartWrapperRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleSelectChip = (chip) => {
    setActiveSymbol(chip.symbol);
    setActiveTitle(chip.label);
    if (onOpenChart) {
      onOpenChart(chip.symbol, chip.label);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const resolved = toTradingViewSymbol(searchQuery.trim());
    setActiveSymbol(resolved);
    setActiveTitle(searchQuery.trim().toUpperCase());
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onOpenChart) {
      onOpenChart(resolved, searchQuery.trim().toUpperCase());
    }
  };

  // Construct official full-facility TradingView embed URL
  // Includes drawing tools (hide_side_toolbar=0), 100+ indicators, timeframes, date ranges
  const tvEmbedUrl = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
    activeTvSymbol
  )}&interval=${interval}&theme=dark&style=1&timezone=Asia%2FKolkata&withdateranges=1&hide_side_toolbar=0&allow_symbol_change=1&save_image=1&locale=in`;

  // Fyers TV direct terminal link
  const cleanFyersSymbol = activeSymbol.startsWith('NSE:') || activeSymbol.startsWith('BSE:')
    ? activeSymbol
    : `NSE:${activeSymbol}-EQ`;
  const fyersDirectUrl = `https://trade.fyers.in/?symbol=${encodeURIComponent(cleanFyersSymbol)}`;

  return (
    <div 
      ref={chartWrapperRef}
      className="flex-1 flex flex-col h-full overflow-hidden bg-[#0c1017] text-slate-100 select-none relative"
    >
      {/* Top Header & Control Toolbar */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 z-20 shadow-lg">
        {/* Left Side: Active Symbol, Name & Quick Chips */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>{activeTitle}</span>
                  <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                    {activeTvSymbol}
                  </span>
                </h1>
              </div>
            </div>
          </div>

          {/* Quick Selection Chips */}
          <div className="hidden xl:flex items-center gap-1 pl-2 border-l border-slate-800 overflow-x-auto no-scrollbar py-0.5">
            {QUICK_CHIPS.map(chip => {
              const isActive = activeSymbol === chip.symbol || activeTvSymbol === chip.symbol;
              return (
                <button
                  key={chip.symbol}
                  onClick={() => handleSelectChip(chip)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 border border-indigo-500/50'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Symbol Search, Timeframes, TV.com Button, Engine, Fullscreen */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Symbol Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker (e.g. RELIANCE)..."
              className="pl-8 pr-3 py-1 w-36 sm:w-48 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
            />
          </form>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                onClick={() => setInterval(tf.value)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  interval === tf.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Switch timeframe to ${tf.label}`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* TV.com Official Button (Opens that chart on TradingView.com) */}
          <a
            href={tvWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-lg bg-[#2962FF] hover:bg-[#1E53E5] text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-blue-900/40 cursor-pointer"
            title="Open this exact symbol in full TradingView.com (New Tab)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>TV.com</span>
          </a>

          {/* Fyers Direct Terminal Link */}
          <a
            href={fyersDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
            title="Open in Fyers Web Trading Terminal (0-Delay)"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fyers Web</span>
          </a>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Full-Facility Chart Area */}
      <div className="flex-1 w-full h-full relative bg-[#131722] overflow-hidden">
        <iframe
          key={`${activeTvSymbol}-${interval}`}
          src={tvEmbedUrl}
          title={`TradingView Advanced Chart - ${activeTitle}`}
          className="w-full h-full border-0"
          allow="fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
}
