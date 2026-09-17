import React, { useState, useEffect } from 'react';
import { 
  Grid, RefreshCw, Eye, ArrowUpRight, ArrowDownRight, 
  Layers, Filter, Sparkles, Shield, Zap, ExternalLink, BarChart2
} from 'lucide-react';

export default function MarketHeatmapView({ onSelectStock }) {
  const [treeData, setTreeData] = useState([]);
  const [totalStocks, setTotalStocks] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSector, setSelectedSector] = useState('all');
  const [capFilter, setCapFilter] = useState('all'); // 'all', 'large', 'mid', 'small'
  const [hoveredStock, setHoveredStock] = useState(null);
  const [fnoOnly, setFnoOnly] = useState(false);

  const fetchHeatmap = async (currentFno = fnoOnly) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/market/heatmap?limit=150&fno_only=${currentFno}`);
      if (res.ok) {
        const data = await res.json();
        setTreeData(data.tree || []);
        setTotalStocks(data.total_stocks || 0);
      }
    } catch (e) {
      console.error('Failed to load market heatmap:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap(fnoOnly);
  }, [fnoOnly]);

  const getHeatmapColor = (chg) => {
    if (chg >= 3.0) return 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/40 text-white';
    if (chg >= 1.5) return 'bg-emerald-700/80 hover:bg-emerald-600 border-emerald-500/30 text-emerald-100';
    if (chg >= 0.2) return 'bg-teal-800/70 hover:bg-teal-700 border-teal-500/20 text-teal-100';
    if (chg > -0.2) return 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300';
    if (chg > -1.5) return 'bg-rose-900/70 hover:bg-rose-800 border-rose-600/20 text-rose-100';
    if (chg > -3.0) return 'bg-rose-700 hover:bg-rose-600 border-rose-500/30 text-white';
    return 'bg-rose-600 hover:bg-rose-500 border-rose-400/40 text-white';
  };

  const filteredTree = treeData.filter(s => {
    if (selectedSector !== 'all' && s.sector !== selectedSector) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6 space-y-6 text-slate-100 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Market Heat Map
            </h1>
            <p className="text-xs text-slate-400">
              Interactive visual treemap sized by Market Capitalization and shaded by 1-Day price momentum.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Universal F&O Toggle */}
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
            onClick={() => fetchHeatmap(fnoOnly)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
            <span>Refresh Heatmap</span>
          </button>

          {/* TV.com Official Button */}
          <a
            href="https://in.tradingview.com/chart/?symbol=NSE%3ANIFTY"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2962FF] hover:bg-[#1E53E5] text-white text-xs font-bold transition-all shadow-md shadow-blue-900/40 cursor-pointer"
            title="Open on TradingView.com"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>TV.com</span>
          </a>
        </div>
      </div>

      {/* Legend & Filter Controls */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Color Legend */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <span className="text-slate-400 font-bold mr-1">1D Return:</span>
          <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold">&le; -3%</span>
          <span className="px-2 py-0.5 rounded bg-rose-700 text-white">-1.5%</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">0%</span>
          <span className="px-2 py-0.5 rounded bg-teal-800 text-teal-100">+1.5%</span>
          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold">&ge; +3%</span>
        </div>

        {/* Sector Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Sector:</span>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Sectors ({treeData.length})</option>
            {treeData.map(s => (
              <option key={s.sector} value={s.sector}>{s.sector} ({s.stocks_count})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Heatmap Treemap Canvas */}
      <div className="space-y-4">
        {filteredTree.map((secGroup) => {
          const isSecUp = (secGroup.avg_change || 0) >= 0;

          return (
            <div
              key={secGroup.sector}
              className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl"
            >
              {/* Sector Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-black text-white tracking-wide">
                    {secGroup.sector}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({secGroup.stocks_count} stocks &bull; ₹{secGroup.total_mcap?.toLocaleString('en-IN')} Cr)
                  </span>
                </div>
                <span className={`font-mono font-bold ${isSecUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Avg: {isSecUp ? '+' : ''}{secGroup.avg_change?.toFixed(2)}%
                </span>
              </div>

              {/* Stocks Tiles Grid */}
              <div className="flex flex-wrap gap-2">
                {secGroup.stocks.map((stk) => {
                  const isUp = (stk.change_1d || 0) >= 0;
                  const colorClass = getHeatmapColor(stk.change_1d || 0);

                  // Size weighting: Larger market cap stocks get slightly wider pads
                  const isBigCap = stk.market_cap_cr >= 80000;
                  const isMidCap = stk.market_cap_cr >= 25000;

                  return (
                    <button
                      key={stk.symbol}
                      onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                      onMouseEnter={() => setHoveredStock(stk)}
                      onMouseLeave={() => setHoveredStock(null)}
                      className={`rounded-lg p-2.5 transition-all cursor-pointer border text-left relative flex flex-col justify-between ${colorClass} ${
                        isBigCap 
                          ? 'flex-grow min-w-[130px] h-[86px]' 
                          : isMidCap 
                          ? 'flex-grow min-w-[105px] h-[80px]' 
                          : 'flex-grow min-w-[85px] h-[72px]'
                      }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <span className="font-black font-mono text-xs tracking-tight truncate max-w-[85%]">
                          {stk.symbol}
                        </span>
                        {stk.is_fno === 1 && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-black/30 font-bold">
                            F&amp;O
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-[11px] font-mono opacity-90 truncate">
                          ₹{stk.current_price?.toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs font-mono font-black flex items-center gap-0.5">
                          {isUp ? '+' : ''}{stk.change_1d?.toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Stock Details Hover Card (Sticky at bottom) */}
      {hoveredStock && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-3 z-50 animate-in fade-in slide-in-from-bottom-2 text-xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
            <div>
              <div className="font-bold text-white font-mono">{hoveredStock.symbol}</div>
              <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{hoveredStock.name}</div>
            </div>
            <span className={`text-xs font-black font-mono ${hoveredStock.change_1d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {hoveredStock.change_1d >= 0 ? '+' : ''}{hoveredStock.change_1d?.toFixed(2)}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Price:</span>
              <span className="font-mono font-bold text-white">₹{hoveredStock.current_price}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Market Cap:</span>
              <span className="font-mono font-bold text-slate-200">₹{hoveredStock.market_cap_cr?.toLocaleString('en-IN')} Cr</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Sector:</span>
              <span className="text-slate-300 truncate block">{hoveredStock.sector}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Volume:</span>
              <span className="font-mono text-slate-200">{hoveredStock.volume_multiple}x avg</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-2">
            <button
              onClick={() => onSelectStock && onSelectStock(hoveredStock.symbol)}
              className="flex-1 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
            >
              <BarChart2 className="w-3 h-3" />
              <span>Chart</span>
            </button>
            <a
              href={`https://in.tradingview.com/chart/?symbol=NSE:${hoveredStock.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded bg-[#2962FF] hover:bg-[#1E53E5] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              <span>TV.com</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
