import React, { useState, useEffect } from 'react';
import { 
  Layers, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  Search, RefreshCw, BarChart2, ShieldCheck, DollarSign, Filter, Zap, X, ExternalLink
} from 'lucide-react';

export default function SectorFlowView({ onSelectSector, onSelectStock }) {
  const [sectors, setSectors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [flowFilter, setFlowFilter] = useState('all'); // 'all', 'inflow', 'outflow', 'neutral'
  const [fnoOnly, setFnoOnly] = useState(false);

  // Sector Drilldown Modal State
  const [activeSectorDetail, setActiveSectorDetail] = useState(null);
  const [sectorStocks, setSectorStocks] = useState([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');

  const fetchSectorFlow = async (isFno = fnoOnly) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/market/sector-flow?fno_only=${isFno}`);
      if (res.ok) {
        const data = await res.json();
        setSectors(data.sectors || []);
      }
    } catch (e) {
      console.error('Failed to load sector flow:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSectorFlow(fnoOnly);
  }, [fnoOnly]);

  const openSectorDetail = async (sectorName) => {
    setActiveSectorDetail(sectorName);
    setIsDetailLoading(true);
    setDetailSearch('');
    try {
      const res = await fetch(`/api/market/sector-stocks?sector=${encodeURIComponent(sectorName)}&fno_only=${fnoOnly}`);
      if (res.ok) {
        const data = await res.json();
        setSectorStocks(data.stocks || []);
      }
    } catch (e) {
      console.error('Failed to load sector stocks:', e);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeSectorDetail = () => {
    setActiveSectorDetail(null);
    setSectorStocks([]);
  };

  const inflowCount = sectors.filter(s => s.flow_status?.includes('Inflow')).length;
  const outflowCount = sectors.filter(s => s.flow_status?.includes('Outflow')).length;
  const neutralCount = sectors.length - inflowCount - outflowCount;

  const filteredSectors = sectors.filter(s => {
    if (searchTerm.trim() && !s.sector.toLowerCase().includes(searchTerm.trim().toLowerCase())) {
      return false;
    }
    if (flowFilter === 'inflow') return s.flow_status?.includes('Inflow');
    if (flowFilter === 'outflow') return s.flow_status?.includes('Outflow');
    if (flowFilter === 'neutral') return s.flow_status?.includes('Neutral');
    return true;
  });

  const getStatusBadgeClass = (status) => {
    if (status?.includes('Aggressive Inflow')) {
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
    if (status?.includes('Moderate Inflow')) {
      return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
    }
    if (status?.includes('Heavy Outflow')) {
      return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    }
    if (status?.includes('Moderate Outflow')) {
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    }
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  const filteredSectorStocks = sectorStocks.filter(stk => {
    if (!detailSearch.trim()) return true;
    const q = detailSearch.toLowerCase();
    return (stk.symbol || '').toLowerCase().includes(q) || (stk.name || '').toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6 space-y-6 text-slate-100 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Sector Capital Flow
            </h1>
            <p className="text-xs text-slate-400">
              Real-time institutional liquidity distribution and sector rotation matrix across Indian markets.
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
            onClick={() => fetchSectorFlow(fnoOnly)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh Flows</span>
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

      {/* Institutional Breadth Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Inflow Sectors
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-emerald-400">{inflowCount}</span>
              <span className="text-xs text-slate-500 font-medium">of {sectors.length} sectors</span>
            </div>
            <span className="text-[11px] text-emerald-400/80 font-medium mt-0.5 block">
              Capital accumulation observed
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Outflow Sectors
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-rose-400">{outflowCount}</span>
              <span className="text-xs text-slate-500 font-medium">of {sectors.length} sectors</span>
            </div>
            <span className="text-[11px] text-rose-400/80 font-medium mt-0.5 block">
              Profit booking / distribution
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Consolidating
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-indigo-300">{neutralCount}</span>
              <span className="text-xs text-slate-500 font-medium">of {sectors.length} sectors</span>
            </div>
            <span className="text-[11px] text-indigo-400/80 font-medium mt-0.5 block">
              Range-bound price action
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <BarChart2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sectors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Filter:</span>
          {['all', 'inflow', 'outflow', 'neutral'].map(f => (
            <button
              key={f}
              onClick={() => setFlowFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition-all cursor-pointer ${
                flowFilter === f
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Sector Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSectors.map((s) => {
          const isUp = (s.avg_change_1d || 0) >= 0;
          const totalBreadth = (s.advances || 0) + (s.declines || 0) + (s.unchanged || 0) || 1;
          const advPct = Math.round(((s.advances || 0) / totalBreadth) * 100);
          const decPct = Math.round(((s.declines || 0) / totalBreadth) * 100);

          return (
            <div
              key={s.sector}
              onClick={() => openSectorDetail(s.sector)}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 hover:shadow-indigo-950/20 transition-all shadow-xl flex flex-col justify-between cursor-pointer group"
            >
              <div>
                {/* Sector Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-white text-sm tracking-tight group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                      <span>{s.sector}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {s.stock_count} tracked companies
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(s.flow_status)}`}>
                    {s.flow_status}
                  </span>
                </div>

                {/* Return & Turnover */}
                <div className="flex items-baseline justify-between py-2 my-2 border-y border-slate-800/80">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg 1D Return</span>
                    <span className={`text-lg font-black font-mono flex items-center gap-1 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isUp ? '+' : ''}{s.avg_change_1d?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Turnover</span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      ₹{s.total_turnover_cr?.toLocaleString('en-IN')} Cr
                    </span>
                  </div>
                </div>

                {/* Advance / Decline Breadth Bar */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-emerald-400 font-bold">{s.advances} Adv ({advPct}%)</span>
                    <span className="text-rose-400 font-bold">{s.declines} Dec ({decPct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                    <div style={{ width: `${advPct}%` }} className="bg-emerald-500 h-full" />
                    <div style={{ width: `${decPct}%` }} className="bg-rose-500 h-full" />
                  </div>
                </div>

                {/* Top Gainer & Loser */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  {s.top_gainer && (
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 font-bold block">Top Gainer</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStock && onSelectStock(s.top_gainer.symbol);
                        }}
                        className="font-mono font-bold text-emerald-400 hover:underline block truncate cursor-pointer"
                      >
                        {s.top_gainer.symbol} +{s.top_gainer.change_1d?.toFixed(1)}%
                      </button>
                    </div>
                  )}
                  {s.top_loser && (
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 font-bold block">Top Loser</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStock && onSelectStock(s.top_loser.symbol);
                        }}
                        className="font-mono font-bold text-rose-400 hover:underline block truncate cursor-pointer"
                      >
                        {s.top_loser.symbol} {s.top_loser.change_1d?.toFixed(1)}%
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: View Sector Details */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openSectorDetail(s.sector);
                }}
                className="w-full py-1.5 rounded-lg bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>View {s.sector} Details</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Sector Details Modal */}
      {activeSectorDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <span>{activeSectorDetail}</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold">
                      {sectorStocks.length} Companies
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Constituent equities ranked by market capitalization and 1-day momentum.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search within sector */}
                <div className="relative w-48 sm:w-60 hidden sm:block">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search in sector..."
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={closeSectorDetail}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {isDetailLoading ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <p className="text-xs font-semibold">Loading {activeSectorDetail} constituents...</p>
                </div>
              ) : filteredSectorStocks.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <p className="text-sm">No stocks found in this sector matching the criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                        <th className="py-2.5 px-3">Symbol</th>
                        <th className="py-2.5 px-3">Company Name</th>
                        <th className="py-2.5 px-3 text-right">LTP (₹)</th>
                        <th className="py-2.5 px-3 text-right">1D Change</th>
                        <th className="py-2.5 px-3 text-right hidden sm:table-cell">Volume</th>
                        <th className="py-2.5 px-3 text-right hidden md:table-cell">Turnover (Cr)</th>
                        <th className="py-2.5 px-3 text-right hidden lg:table-cell">M-Cap (Cr)</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredSectorStocks.map((stk) => {
                        const isStkUp = (stk.change_1d || 0) >= 0;
                        return (
                          <tr 
                            key={stk.symbol} 
                            className="hover:bg-slate-800/40 transition-colors"
                          >
                            <td 
                              onClick={() => {
                                closeSectorDetail();
                                onSelectStock && onSelectStock(stk.symbol);
                              }}
                              className="py-2 px-3 font-bold text-white flex items-center gap-1.5 cursor-pointer hover:text-indigo-300"
                            >
                              <span>{stk.symbol}</span>
                              {stk.is_fno === 1 && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  F&amp;O
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-300 font-sans truncate max-w-[180px]">
                              {stk.name}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-100">
                              ₹{stk.current_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className={`py-2 px-3 text-right font-bold ${isStkUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isStkUp ? '+' : ''}{stk.change_1d?.toFixed(2)}%
                            </td>
                            <td className="py-2 px-3 text-right text-slate-400 hidden sm:table-cell">
                              {stk.volume?.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-400 hidden md:table-cell">
                              ₹{stk.turnover_cr?.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-300 hidden lg:table-cell">
                              ₹{stk.market_cap_cr?.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => {
                                  closeSectorDetail();
                                  onSelectStock && onSelectStock(stk.symbol);
                                }}
                                className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>Chart</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
