import React, { useEffect } from 'react';
import { 
  Menu, X, Search, Sparkles, TrendingUp, Activity, 
  Layers, Grid, Star, Zap, Terminal, GraduationCap
} from 'lucide-react';

export default function SidebarNav({
  isOpen = false,
  onClose,
  currentView,
  onSelectView,
  watchlistCount = 0,
  recommendationsCount = 15
}) {
  // Close drawer on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const navItems = [
    {
      id: 'option_chain',
      label: 'Option Chain (Home)',
      icon: Activity,
      badge: 'LIVE',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      description: 'NSE & BSE Realtime Option Chain & Greeks'
    },
    {
      id: 'screener',
      label: 'Equity Screener',
      icon: Search,
      badge: null,
      description: 'Multi-parameter Equity & Technical Scanner'
    },
    {
      id: 'query_screener',
      label: 'Query Screener',
      icon: Terminal,
      badge: 'NEW',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      description: 'Run Screener.in Formulas & Custom Ratios'
    },
    {
      id: 'market_picture',
      label: 'Market Picture',
      icon: TrendingUp,
      badge: 'LIVE',
      badgeColor: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
      description: 'Top Gainers, Losers & Volume Shockers'
    },
    {
      id: 'iv_analysis',
      label: 'IV Analysis',
      icon: Zap,
      badge: 'F&O',
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      description: 'Realtime Implied Volatility & Strike Spikes'
    },
    {
      id: 'sector_flow',
      label: 'Sector Flow',
      icon: Layers,
      badge: null,
      description: 'Institutional Capital Rotation Matrix'
    },
    {
      id: 'heatmap',
      label: 'Market Heat Map',
      icon: Grid,
      badge: null,
      description: 'Visual Market Cap & Breadth Treemap'
    },
    {
      id: 'recommendations',
      label: 'Recommendations',
      icon: Sparkles,
      badge: recommendationsCount,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      description: 'Intraday, Swing, Delivery & Multibaggers'
    },
    {
      id: 'learn',
      label: 'Learn Stock Market',
      icon: GraduationCap,
      badge: 'FREE',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      description: 'Curated Video Courses from Basic to Advance'
    },
    {
      id: 'watchlist',
      label: 'Watchlist',
      icon: Star,
      badge: watchlistCount > 0 ? watchlistCount : null,
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      description: 'Personal Tracked Equities'
    }
  ];

  const handleItemClick = (id) => {
    onSelectView(id);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex select-none">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <aside className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl bg-slate-900 border-r border-slate-800 flex flex-col animate-in slide-in-from-left duration-200">
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-md shadow-emerald-500/20 shrink-0">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-wider text-slate-100 uppercase">
                STOCK<span className="text-emerald-400">FINDER</span>
              </span>
              <span className="text-[9px] text-slate-500 font-mono tracking-tight -mt-0.5">
                PRO TERMINAL
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Menu (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu List */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1.5 custom-scrollbar">
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Navigation Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 font-semibold border-l-2 border-emerald-500 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                  isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/80 text-slate-400 group-hover:text-white group-hover:bg-slate-700'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate font-semibold text-slate-200 group-hover:text-white">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate group-hover:text-slate-400">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
          <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate text-slate-300 font-medium">NSE &amp; BSE Live Data</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">99.8%</span>
          </div>
          <div className="text-[10px] text-center text-slate-500">
            Click outside or press <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[9px] font-mono">ESC</kbd> to close
          </div>
        </div>
      </aside>
    </div>
  );
}
