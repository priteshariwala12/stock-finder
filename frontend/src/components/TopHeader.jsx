import React, { useState } from 'react';
import { 
  Menu, RefreshCw, Palette, User, LogOut, Star,
  TrendingUp, TrendingDown, ChevronDown, Bell, ShieldCheck
} from 'lucide-react';

const THEMES = [
  { id: 'midnight', name: 'Midnight Blue', dot: 'bg-indigo-500' },
  { id: 'cyberpunk', name: 'Neon Terminal', dot: 'bg-emerald-400' },
  { id: 'obsidian', name: 'Dark Obsidian', dot: 'bg-slate-400' },
  { id: 'emerald', name: 'Emerald Wealth', dot: 'bg-teal-400' },
  { id: 'navy', name: 'Deep Sea Navy', dot: 'bg-sky-400' },
];

const VIEW_TITLES = {
  recommendations: { title: 'AI Recommendations', desc: 'Institutional High-Probability Trades' },
  market_picture: { title: 'Market Picture', desc: 'Top Gainers, Losers & Breadth' },
  option_chain: { title: 'NSE & BSE Option Chain', desc: 'Realtime Live & Closing Option Chain with TradingView Strike Charts' },
  iv_analysis: { title: 'IV Analysis Terminal', desc: 'Realtime Implied Volatility & Options Spikes' },
  sector_flow: { title: 'Sector Capital Flow', desc: 'Institutional Sector Rotation & Turnover' },
  heatmap: { title: 'Market Heat Map', desc: 'Visual Treemap by Market Cap & Returns' },
  learn: { title: 'Stock Market Learning Academy', desc: 'Curated Video Masterclasses from Basic to Advance' },
  watchlist: { title: 'Tracked Watchlist', desc: 'Personal Monitored Equities' }
};

export default function TopHeader({
  currentView,
  onSelectView,
  onToggleNav,
  onOpenMobileMenu,
  marketSummary,
  onOpenSync,
  currentTheme,
  onThemeChange,
  user,
  onOpenAuth,
  onLogout,
  watchlistCount = 0
}) {
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const viewInfo = VIEW_TITLES[currentView] || VIEW_TITLES.option_chain || VIEW_TITLES.screener;
  const indices = marketSummary?.indices || [
    { name: 'NIFTY 50', value: '23,398.10', change: -80.20, pct_change: -0.34 },
    { name: 'SENSEX', value: '76,825.40', change: -245.50, pct_change: -0.32 },
    { name: 'NIFTY BANK', value: '56,606.55', change: 135.80, pct_change: 0.24 },
    { name: 'NIFTY MIDCAP', value: '54,120.30', change: 210.45, pct_change: 0.39 }
  ];

  const handleMenuClick = onToggleNav || onOpenMobileMenu;

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between select-none z-30 shrink-0 sticky top-0">
      {/* Left: Brand Logo & Title with Menu under it, and Quick Switcher */}
      <div className="flex items-center gap-3">
        {/* Brand & Menu Stack */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Brand Icon Badge */}
          <button
            onClick={() => onSelectView?.('option_chain')}
            className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-md shadow-emerald-500/20 hover:scale-105 transition-all shrink-0 cursor-pointer"
            title="Stock Finder Pro - Home"
          >
            <TrendingUp className="w-4 h-4 text-white" />
          </button>

          {/* Site Name & Menu Under It */}
          <div className="flex flex-col justify-center">
            <button
              onClick={() => onSelectView?.('option_chain')}
              className="flex items-center gap-1 text-left cursor-pointer group"
              title="Stock Finder Pro - Home"
            >
              <span className="text-xs sm:text-sm font-black tracking-wider text-white uppercase group-hover:text-emerald-300 transition-colors leading-tight">
                STOCK<span className="text-emerald-400">FINDER</span>
              </span>
              <span className="px-1 py-0.2 text-[8px] sm:text-[9px] font-black rounded bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest leading-tight">
                PRO
              </span>
            </button>

            {/* Menu placed directly under site name */}
            <button
              onClick={handleMenuClick}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer w-fit mt-0.5 group/menu"
              title="Open Navigation Menu"
            >
              <Menu className="w-3 h-3 text-emerald-400 group-hover/menu:scale-110 transition-transform" />
              <span className="leading-tight">Menu</span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-500 group-hover/menu:text-emerald-400 transition-colors" />
            </button>
          </div>
        </div>

        {/* Quick Primary Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-0.5 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => onSelectView?.('option_chain')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'option_chain'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Go to Option Chain"
          >
            <span>⚡ Option Chain</span>
          </button>
          <button
            onClick={() => onSelectView?.('market_picture')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'market_picture'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Go to Market Picture"
          >
            <span>📈 Market Picture</span>
          </button>
        </div>

        <div className="hidden xl:flex items-center gap-2 pl-1 border-l border-slate-800">
          <h1 className="text-xs font-bold text-slate-300 tracking-tight">
            {viewInfo.title}
          </h1>
        </div>
      </div>

      {/* Center: Live Benchmark Indices Ticker */}
      <div className="hidden lg:flex items-center gap-2 overflow-x-auto py-1 max-w-xl mx-4 no-scrollbar">
        {indices.map((idx, i) => {
          const isUp = (idx.pct_change || idx.change || 0) >= 0;
          return (
            <div
              key={i}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950/60 border border-slate-800/80 text-xs shrink-0"
            >
              <span className="font-semibold text-slate-300 text-[11px]">
                {idx.name}
              </span>
              <span className="font-mono text-white text-[11px]">
                {idx.value}
              </span>
              <span className={`font-mono text-[10px] font-bold flex items-center ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? '+' : ''}{idx.pct_change}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Right: Theme, Sync, Auth */}
      <div className="flex items-center gap-2">
        {/* Sync Data Button */}
        <button
          onClick={onOpenSync}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition-all"
          title="Sync Official NSE / BSE Market Data"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline text-xs">Sync Data</span>
        </button>

        {/* Theme Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition-all"
            title="Change Visual Theme"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xl:inline text-xs capitalize">{currentTheme}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isThemeOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsThemeOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-44 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-500">
                  Select Theme
                </div>
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onThemeChange(theme.id);
                      setIsThemeOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      currentTheme === theme.id
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                      <span>{theme.name}</span>
                    </div>
                    {currentTheme === theme.id && (
                      <span className="text-indigo-400 text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* User Profile / Auth */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-200"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                {user.name ? user.name[0] : 'U'}
              </div>
              <span className="hidden sm:inline max-w-[80px] truncate">{user.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 text-xs text-slate-300 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1.5 border-b border-slate-800">
                    <div className="font-bold text-white truncate">{user.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                  </div>
                  <div className="px-2 py-1.5 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Watchlist stocks:</span>
                    <span className="font-bold text-emerald-400">{watchlistCount}</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full mt-1 flex items-center gap-2 px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
