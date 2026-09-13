import React, { useState } from 'react';
import { 
  TrendingUp, RefreshCw, Layers, ShieldCheck, Zap, ExternalLink, 
  Palette, Check, Flame, ChevronDown, Award, Compass, Sun, Moon, Sparkles
} from 'lucide-react';

export default function Navbar({ 
  marketSummary, 
  onOpenSync, 
  onApplyPreset, 
  activePresetId,
  user,
  onOpenAuth,
  onLogout,
  watchlistCount,
  onToggleWatchlistFilter,
  isWatchlistActive,
  currentView = 'screener',
  onViewChange,
  currentTheme = 'midnight',
  onThemeChange,
  recommendationsCount = 15
}) {
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showTicker, setShowTicker] = useState(true);

  const indices = marketSummary?.indices || [
    { name: "NIFTY 50", value: "23,398.10", pct_change: -0.34 },
    { name: "SENSEX", value: "76,825.40", pct_change: -0.32 },
    { name: "NIFTY BANK", value: "56,606.55", pct_change: 0.24 },
    { name: "NIFTY MIDCAP 100", value: "54,120.30", pct_change: 0.39 },
  ];

  const themes = [
    { id: 'midnight', name: 'Midnight Pro', desc: 'Deep navy & indigo dark terminal', color: 'bg-indigo-500', border: 'border-indigo-400' },
    { id: 'obsidian', name: 'Obsidian Gold', desc: 'Bloomberg pitch black & gold', color: 'bg-amber-400', border: 'border-amber-400' },
    { id: 'emerald', name: 'Emerald Matrix', desc: 'Algorithmic cyber & neon green', color: 'bg-emerald-400', border: 'border-emerald-400' },
    { id: 'sunset', name: 'Synthwave Violet', desc: 'Luxury deep purple & neon glow', color: 'bg-purple-500', border: 'border-purple-400' },
    { id: 'nordic', name: 'Nordic Light', desc: 'Clean crisp executive daylight', color: 'bg-blue-600', border: 'border-blue-500' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 transition-colors">
      {/* Top Ticker Bar (Optional / Collapsible) */}
      {showTicker && (
        <div className="border-b border-slate-800/60 bg-slate-950/70 px-4 sm:px-6 py-1 text-xs text-slate-400 transition-all">
          <div className="w-full flex items-center justify-between overflow-x-auto gap-6 no-scrollbar">
            <div className="flex items-center gap-5 shrink-0 text-[11px]">
              <span className="font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Markets
              </span>
              {indices.map((idx, i) => (
                <div key={i} className="flex items-center gap-1.5 font-mono">
                  <span className="font-medium text-slate-400">{idx.name}</span>
                  <span className="font-semibold text-slate-200">{idx.value}</span>
                  <span className={`text-[10px] font-bold px-1 rounded ${idx.pct_change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {idx.pct_change >= 0 ? '+' : ''}{idx.pct_change}%
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
              <div className="hidden lg:flex items-center gap-3">
                <span className="text-emerald-400 font-medium">▲ {marketSummary?.advances || 1359}</span>
                <span className="text-rose-400 font-medium">▼ {marketSummary?.declines || 1931}</span>
              </div>
              <button
                onClick={() => setShowTicker(false)}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded text-[10px]"
                title="Hide Market Ticker"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <div className="w-full px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
        {/* Logo & Segment Switcher */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onViewChange && onViewChange('screener')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1">
                  STOCK FINDER <span className="text-xs font-black px-1.5 py-0.2 rounded bg-gradient-to-r from-indigo-500 to-emerald-400 text-slate-950">PRO</span>
                </h1>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-slate-800 text-indigo-300 border border-slate-700 hidden sm:inline">
                  NSE & BSE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Institutional Equity Analytics & Recommendations
              </p>
            </div>
          </div>

          {/* Primary View Switcher Tabs (Screener vs Recommendations) */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/90 shadow-inner">
            <button
              onClick={() => onViewChange && onViewChange('screener')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                currentView === 'screener'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Screener</span>
            </button>

            <button
              onClick={() => onViewChange && onViewChange('recommendations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                currentView === 'recommendations'
                  ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Recommendations</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 text-[10px] font-black animate-pulse">
                {recommendationsCount || 15}
              </span>
            </button>
          </div>
        </div>

        {/* Right Controls & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Breakout Button (only shown in Screener mode) */}
          {currentView === 'screener' && (
            <button
              onClick={() => onApplyPreset('breakout-3pct')}
              className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                activePresetId === 'breakout-3pct'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>Breakouts</span>
              <span className="bg-amber-500/30 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {marketSummary?.breakouts_3pct_count || 270}
              </span>
            </button>
          )}

          {/* Theme Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-all"
              title="Change Appearance Theme"
            >
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline capitalize">
                {themes.find(t => t.id === currentTheme)?.name.split(' ')[0] || 'Theme'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showThemePicker && (
              <div 
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1 flex items-center justify-between">
                  <span>Theme & Aesthetics</span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </div>
                {themes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (onThemeChange) onThemeChange(t.id);
                      setShowThemePicker(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all ${
                      currentTheme === t.id
                        ? 'bg-indigo-600/20 text-white border border-indigo-500/40'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3.5 h-3.5 rounded-full ${t.color} shadow-sm`} />
                      <div>
                        <p className="font-bold text-slate-200">{t.name}</p>
                        <p className="text-[10px] text-slate-400 leading-tight">{t.desc}</p>
                      </div>
                    </div>
                    {currentTheme === t.id && (
                      <Check className="w-4 h-4 text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sync Status Button */}
          <button
            onClick={onOpenSync}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors"
            title="View sync status or refresh Bhavcopy"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Sync</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </button>

          {/* User Auth Section */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
              <button
                onClick={onToggleWatchlistFilter}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isWatchlistActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
                title="Filter by your starred Watchlist"
              >
                <span>⭐</span>
                <span className="hidden sm:inline">Watchlist</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-[10px] font-bold">
                  {watchlistCount || 0}
                </span>
              </button>

              <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black text-[11px]">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-semibold text-slate-200 hidden md:inline max-w-[90px] truncate">
                  {user.name}
                </span>
                <button
                  onClick={onLogout}
                  className="text-[11px] text-slate-400 hover:text-rose-400 hover:underline transition-colors ml-1"
                  title="Log out"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all"
              >
                <span>Login</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
