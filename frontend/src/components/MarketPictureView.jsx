import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Activity, Zap, RefreshCw, 
  ArrowUpRight, ArrowDownRight, Flame, BarChart2, Eye, Filter, CheckCircle2
} from 'lucide-react';

export default function MarketPictureView({ onSelectStock, onSwitchToScreener }) {
  const [marketPic, setMarketPic] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'gainers', 'losers', 'volume', 'highs'
  const [exchange, setExchange] = useState('NSE'); // 'NSE' or 'BSE'
  const [fnoOnly, setFnoOnly] = useState(false);

  const fetchMarketPicture = async (currentEx = exchange, currentFno = fnoOnly) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/market/picture?exchange=${currentEx}&fno_only=${currentFno}`);
      if (res.ok) {
        const data = await res.json();
        setMarketPic(data);
      }
    } catch (e) {
      console.error('Failed to load market picture:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketPicture(exchange, fnoOnly);
  }, [exchange, fnoOnly]);

  const breadth = marketPic?.breadth || { advances: 0, declines: 0, unchanged: 0, ad_ratio: 1.0 };
  const totalStocks = (breadth.advances || 0) + (breadth.declines || 0) + (breadth.unchanged || 0) || 1;
  const advPct = Math.round((breadth.advances / totalStocks) * 100);
  const decPct = Math.round((breadth.declines / totalStocks) * 100);

  const filterList = (list) => {
    if (!list) return [];
    if (fnoOnly) return list.filter(s => s.is_fno === 1);
    return list;
  };

  const topGainers = filterList(marketPic?.top_gainers);
  const topLosers = filterList(marketPic?.top_losers);
  const volumeShockers = filterList(marketPic?.volume_shockers);
  const near52wHigh = filterList(marketPic?.near_52w_high);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6 space-y-6 text-slate-100 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Market Picture
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                Official Live {exchange} Feed
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live market momentum pulse: Top Gainers, Top Losers, Volume Shockers, and 52W High Breakouts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented NSE / BSE Exchange Toggle Button */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setExchange('NSE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                exchange === 'NSE'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              NSE
            </button>
            <button
              onClick={() => setExchange('BSE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                exchange === 'BSE'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              BSE
            </button>
          </div>

          {/* F&O Toggle */}
          <button
            onClick={() => setFnoOnly(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              fnoOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md shadow-amber-950/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${fnoOnly ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>F&amp;O Only: {fnoOnly ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => fetchMarketPicture(exchange, fnoOnly)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Market Breadth Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4">
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Market Breadth
            </span>
            <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {breadth.advances} Advances ({advPct}%)
            </span>
            <span className="text-rose-400 font-mono font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {breadth.declines} Declines ({decPct}%)
            </span>
            <span className="text-slate-400 font-mono">
              {breadth.unchanged} Unchanged
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">A/D Ratio:</span>
            <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
              breadth.ad_ratio >= 1.0 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {breadth.ad_ratio}:1 ({breadth.ad_ratio >= 1.0 ? 'Bullish Stance' : 'Cautious'})
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div style={{ width: `${advPct}%` }} className="bg-emerald-500 h-full transition-all duration-500" />
          <div style={{ width: `${100 - advPct - decPct}%` }} className="bg-slate-700 h-full" />
          <div style={{ width: `${decPct}%` }} className="bg-rose-500 h-full transition-all duration-500" />
        </div>
      </div>

      {/* Tabs Switcher for Mobile / Focused View */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {[
          { id: 'all', label: 'All 4 Quadrants' },
          { id: 'gainers', label: `Top Gainers (${topGainers.length})` },
          { id: 'losers', label: `Top Losers (${topLosers.length})` },
          { id: 'volume', label: `Volume Shockers (${volumeShockers.length})` },
          { id: 'highs', label: `52W High Breakouts (${near52wHigh.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4 Quadrants Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quadrant 1: Top Gainers */}
        {(activeTab === 'all' || activeTab === 'gainers') && (
          <div className="rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-3.5 bg-emerald-500/10 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>Top Gainers (1D Surge)</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Sorted by Change %
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-96">
              {topGainers.map((stk, idx) => (
                <div 
                  key={stk.symbol} 
                  className="p-3 hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-slate-500 w-4">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                          className="font-bold font-mono text-white text-xs hover:text-emerald-400"
                        >
                          {stk.symbol}
                        </button>
                        {stk.is_fno === 1 && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            F&amp;O
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 truncate max-w-[150px] block">
                        {stk.sector}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-mono font-bold text-xs text-white">
                        ₹{stk.current_price?.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Vol: {stk.volume_multiple}x avg
                      </div>
                    </div>

                    <div className="min-w-[65px]">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        +{stk.change_1d?.toFixed(2)}%
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                      title="Analyze stock"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quadrant 2: Top Losers */}
        {(activeTab === 'all' || activeTab === 'losers') && (
          <div className="rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-3.5 bg-rose-500/10 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
                <TrendingDown className="w-4 h-4" />
                <span>Top Losers (1D Decline)</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Sorted by Loss %
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-96">
              {topLosers.map((stk, idx) => (
                <div 
                  key={stk.symbol} 
                  className="p-3 hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-slate-500 w-4">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                          className="font-bold font-mono text-white text-xs hover:text-rose-400"
                        >
                          {stk.symbol}
                        </button>
                        {stk.is_fno === 1 && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            F&amp;O
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 truncate max-w-[150px] block">
                        {stk.sector}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-mono font-bold text-xs text-white">
                        ₹{stk.current_price?.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Vol: {stk.volume_multiple}x avg
                      </div>
                    </div>

                    <div className="min-w-[65px]">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-black bg-rose-500/20 text-rose-400 border border-rose-500/40">
                        {stk.change_1d?.toFixed(2)}%
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                      title="Analyze stock"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quadrant 3: Volume Shockers */}
        {(activeTab === 'all' || activeTab === 'volume') && (
          <div className="rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-3.5 bg-amber-500/10 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                <Flame className="w-4 h-4" />
                <span>Volume Shockers (Explosive Liquidity)</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                &ge; 1.5x 10D Avg Volume
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-96">
              {volumeShockers.map((stk, idx) => {
                const isUp = (stk.change_1d || 0) >= 0;
                return (
                  <div 
                    key={stk.symbol} 
                    className="p-3 hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-slate-500 w-4">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                            className="font-bold font-mono text-white text-xs hover:text-amber-400"
                          >
                            {stk.symbol}
                          </button>
                          {stk.is_fno === 1 && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              F&amp;O
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 truncate max-w-[150px] block">
                          {stk.sector}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="font-mono font-bold text-xs text-amber-400">
                          {stk.volume_multiple}x Vol
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ₹{stk.current_price}
                        </div>
                      </div>

                      <div className="min-w-[65px]">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUp ? '+' : ''}{stk.change_1d?.toFixed(2)}%
                        </span>
                      </div>

                      <button
                        onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                        title="Analyze stock"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quadrant 4: 52-Week High Breakouts */}
        {(activeTab === 'all' || activeTab === 'highs') && (
          <div className="rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-3.5 bg-indigo-500/10 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-black text-sm">
                <Activity className="w-4 h-4" />
                <span>Near 52-Week High (Breakout Zone)</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Within 3.0% of Peak
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-96">
              {near52wHigh.map((stk, idx) => {
                const isUp = (stk.change_1d || 0) >= 0;
                return (
                  <div 
                    key={stk.symbol} 
                    className="p-3 hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-slate-500 w-4">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                            className="font-bold font-mono text-white text-xs hover:text-indigo-400"
                          >
                            {stk.symbol}
                          </button>
                          {stk.is_fno === 1 && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              F&amp;O
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 truncate max-w-[150px] block">
                          52W High: ₹{stk.high_52w}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="font-mono font-bold text-xs text-white">
                          ₹{stk.current_price?.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-indigo-300 font-mono">
                          {stk.dist_from_52w_high?.toFixed(1)}% to ATH
                        </div>
                      </div>

                      <div className="min-w-[65px]">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUp ? '+' : ''}{stk.change_1d?.toFixed(2)}%
                        </span>
                      </div>

                      <button
                        onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                        title="Analyze stock"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
