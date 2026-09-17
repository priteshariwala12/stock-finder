import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, TrendingUp, TrendingDown, Search, RefreshCw, X, 
  Calendar, Filter, AlertCircle, BarChart3, ArrowUpRight, ArrowDownRight, 
  Eye, Info, ShieldCheck, Activity, ChevronRight, Layers
} from 'lucide-react';

export default function IVAnalysisView({ onSelectStock }) {
  const [ivStocks, setIvStocks] = useState([]);
  const [expiries, setExpiries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Upper parameter selections
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [selectedStockForChart, setSelectedStockForChart] = useState('RELIANCE');
  const [chartTradingDay, setChartTradingDay] = useState(() => new Date().toISOString().slice(0, 10));
  
  // Chart and Option Chain State
  const [chartData, setChartData] = useState(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [chartViewMode, setChartViewMode] = useState('smile'); // 'smile' or 'chain'

  // Table filters
  const [searchStock, setSearchStock] = useState('');
  const [lastIvMin, setLastIvMin] = useState('');
  const [lastIvMax, setLastIvMax] = useState('');
  const [ivSpikeMin, setIvSpikeMin] = useState('');
  const [activeSpikePreset, setActiveSpikePreset] = useState(null); // 10, 15, 20
  const [tableSortBy, setTableSortBy] = useState('iv_spike_pct');
  const [tableSortOrder, setTableSortOrder] = useState('desc');

  // Always alphabetical (A to Z) for the Stock (chart) dropdown
  const sortedDropdownStocks = useMemo(() => {
    return [...ivStocks].sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
  }, [ivStocks]);

  const handleTableSort = (colKey) => {
    if (tableSortBy === colKey) {
      setTableSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setTableSortBy(colKey);
      setTableSortOrder(colKey === 'symbol' ? 'asc' : 'desc');
    }
  };

  // Fetch IV stocks table
  const fetchIVStocks = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchStock) params.append('search', searchStock);
      if (selectedExpiry) params.append('expiry', selectedExpiry);
      if (lastIvMin) params.append('min_iv', lastIvMin);
      if (lastIvMax) params.append('max_iv', lastIvMax);
      if (ivSpikeMin) params.append('min_spike', ivSpikeMin);
      params.append('limit', '300');

      const res = await fetch(`/api/market/iv-analysis?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIvStocks(data.stocks || []);
        setExpiries(data.expiries || []);
        if (!selectedExpiry && data.expiries && data.expiries.length > 0) {
          setSelectedExpiry(data.expiries[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load IV analysis data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch real option chain & chart history for selected stock
  const fetchChartHistory = async (symbol) => {
    if (!symbol) return;
    setIsChartLoading(true);
    try {
      const res = await fetch(`/api/market/iv-history/${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data = await res.json();
        setChartData(data);
      }
    } catch (e) {
      console.error('Failed to load real IV chart data:', e);
    } finally {
      setIsChartLoading(false);
    }
  };

  useEffect(() => {
    fetchIVStocks();
  }, [selectedExpiry, ivSpikeMin]);

  useEffect(() => {
    if (selectedStockForChart) {
      fetchChartHistory(selectedStockForChart);
    }
  }, [selectedStockForChart]);

  const handleApplySpikePreset = (pct) => {
    if (activeSpikePreset === pct) {
      setActiveSpikePreset(null);
      setIvSpikeMin('');
    } else {
      setActiveSpikePreset(pct);
      setIvSpikeMin(pct.toString());
    }
  };

  const handleClearFilters = () => {
    setSearchStock('');
    setLastIvMin('');
    setLastIvMax('');
    setIvSpikeMin('');
    setActiveSpikePreset(null);
  };

  const filteredStocks = useMemo(() => {
    const list = ivStocks.filter(stk => {
      if (searchStock.trim()) {
        const query = searchStock.trim().toLowerCase();
        const matchesSym = stk.symbol?.toLowerCase().includes(query);
        const matchesName = stk.name?.toLowerCase().includes(query);
        if (!matchesSym && !matchesName) return false;
      }
      if (lastIvMin && stk.current_iv < parseFloat(lastIvMin)) return false;
      if (lastIvMax && stk.current_iv > parseFloat(lastIvMax)) return false;
      if (ivSpikeMin && stk.iv_spike_pct < parseFloat(ivSpikeMin)) return false;
      return true;
    });

    return list.sort((a, b) => {
      let valA = a[tableSortBy];
      let valB = b[tableSortBy];
      if (tableSortBy === 'symbol' || tableSortBy === 'name' || tableSortBy === 'expiry_date') {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
        return tableSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return tableSortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [ivStocks, searchStock, lastIvMin, lastIvMax, ivSpikeMin, tableSortBy, tableSortOrder]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6 space-y-6 text-slate-100 select-none">
      {/* View Header with 100% Real Live NSE Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                IV Analysis Terminal
              </h1>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                100% Real Official NSE Data
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live implied volatility, real Black-Scholes strike curves, and option chains directly from the National Stock Exchange of India.
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-[11px] text-slate-400 font-mono block">Exchange Session</span>
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            NSE Derivatives Active
          </span>
        </div>
      </div>

      {/* Upper Parameter Selection Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-end gap-4">
        {/* Date / Expiry */}
        <div className="w-48">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Date / Expiry
          </label>
          <select
            value={selectedExpiry}
            onChange={(e) => setSelectedExpiry(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Expiries</option>
            {expiries.map(exp => (
              <option key={exp} value={exp}>{exp}</option>
            ))}
          </select>
        </div>

        {/* Stock (chart) Dropdown */}
        <div className="w-64">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Stock (chart)
          </label>
          <select
            value={selectedStockForChart}
            onChange={(e) => setSelectedStockForChart(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            {sortedDropdownStocks.map(stk => (
              <option key={stk.symbol} value={stk.symbol}>
                {stk.symbol} (IV: {stk.current_iv?.toFixed(1)}% | ATM: ₹{stk.atm_strike})
              </option>
            ))}
          </select>
        </div>

        {/* Chart Trading Day */}
        <div className="w-44">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Chart trading day
          </label>
          <input
            type="date"
            value={chartTradingDay}
            onChange={(e) => setChartTradingDay(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Green Load Button */}
        <div>
          <button
            onClick={() => {
              fetchIVStocks();
              fetchChartHistory(selectedStockForChart);
            }}
            disabled={isLoading || isChartLoading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(isLoading || isChartLoading) ? 'animate-spin' : ''}`} />
            <span>Load Real NSE Data</span>
          </button>
        </div>
      </div>

      {/* Live Option Chain & IV Smile Panel */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        {chartData && chartData.stock ? (
          <div>
            {/* Real Data Alert Banner */}
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Official NSE Live Data for <strong className="text-white font-mono">{chartData.symbol}</strong> &bull; Real Spot: <strong className="text-white font-mono">₹{chartData.stock.current_price}</strong> &bull; ATM Strike: <strong className="text-emerald-300 font-mono">₹{chartData.stock.atm_strike}</strong> &bull; Official Implied Volatility: <strong className="text-emerald-400 font-mono">{chartData.stock.current_iv}%</strong> &bull; PCR: <strong className="text-indigo-300 font-mono">{chartData.stock.pcr_oi}</strong> &bull; Expiry: <strong className="text-white font-mono">{chartData.stock.expiry_date}</strong>
                </span>
              </div>
              <button
                onClick={() => onSelectStock && onSelectStock(chartData.symbol)}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:underline shrink-0"
              >
                <span>Stock Fundamentals</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Metric Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Real NSE ATM IV</span>
                <span className="text-base font-bold font-mono text-emerald-400">{chartData.stock.current_iv}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">30D Historical Vol (HV)</span>
                <span className="text-base font-bold font-mono text-slate-200">{chartData.stock.historical_volatility_30d}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">IV Spike vs HV</span>
                <span className={`text-base font-bold font-mono ${chartData.stock.iv_spike_pct >= 10 ? 'text-emerald-400 font-black' : (chartData.stock.iv_spike_pct < 0 ? 'text-rose-400' : 'text-slate-200')}`}>
                  {chartData.stock.iv_spike_pct > 0 ? '+' : ''}{chartData.stock.iv_spike_pct}%
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">IV Percentile (IVP)</span>
                <span className="text-base font-bold font-mono text-indigo-300">{chartData.stock.iv_percentile}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Real ATM Strike</span>
                <span className="text-base font-bold font-mono text-white">₹{chartData.stock.atm_strike}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Put-Call Ratio (PCR)</span>
                <span className={`text-base font-bold font-mono ${chartData.stock.pcr_oi >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {chartData.stock.pcr_oi}
                </span>
              </div>
            </div>

            {/* View Mode Toggle Tabs */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChartViewMode('smile')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    chartViewMode === 'smile'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Volatility Smile (Strikes vs IV)
                </button>
                <button
                  onClick={() => setChartViewMode('chain')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    chartViewMode === 'chain'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Full Option Chain Table ({chartData.real_strikes?.length || 0} strikes)
                </button>
              </div>
            </div>

            {/* TAB 1: Volatility Smile Curve Chart */}
            {chartViewMode === 'smile' && chartData.history && chartData.history.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 mt-3">
                <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                    Real Implied Volatility Smile Across Strike Levels
                  </span>
                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span className="text-emerald-400">● Call IV (%)</span>
                    <span className="text-purple-400">● Put IV (%)</span>
                    <span className="text-indigo-300">▲ Spot: ₹{chartData.stock.current_price}</span>
                  </div>
                </div>

                <div className="relative h-56 w-full">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="ivGradSmile" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="0" y1="40" x2="800" y2="40" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                    <line x1="0" y1="100" x2="800" y2="100" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                    <line x1="0" y1="160" x2="800" y2="160" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />

                    {(() => {
                      const points = chartData.history;
                      const ivVals = points.map(p => p.iv || 20).filter(v => v > 0);
                      const minIv = Math.max(5, Math.min(...ivVals) * 0.85);
                      const maxIv = Math.max(...ivVals) * 1.15 || 50;
                      const range = maxIv - minIv || 1;

                      const coords = points.map((p, i) => {
                        const x = (i / Math.max(1, points.length - 1)) * 800;
                        const y = 190 - (((p.iv || minIv) - minIv) / range) * 160;
                        return { x, y, ...p };
                      });

                      const peCoords = points.map((p, i) => {
                        const x = (i / Math.max(1, points.length - 1)) * 800;
                        const peIv = p.pe_iv || p.iv || minIv;
                        const y = 190 - ((peIv - minIv) / range) * 160;
                        return `${x},${y}`;
                      }).join(' ');

                      const pathD = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
                      const areaD = `${pathD} L 800 190 L 0 190 Z`;

                      return (
                        <>
                          <path d={areaD} fill="url(#ivGradSmile)" />
                          <polyline points={peCoords} fill="none" stroke="#c084fc" strokeWidth="1.8" strokeDasharray="4 4" />
                          <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" />
                          {coords.map((pt, i) => {
                            const isAtm = Math.abs(pt.strike - (chartData.stock.atm_strike || 0)) < 1;
                            return (
                              <g key={i}>
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={isAtm ? 5 : 3}
                                  className={isAtm ? "fill-amber-400 ring-2 ring-amber-300" : "fill-emerald-400"}
                                >
                                  <title>{`Strike: ₹${pt.strike} | Call IV: ${pt.ce_iv || pt.iv}% | Put IV: ${pt.pe_iv || pt.iv}% | Call LTP: ₹${pt.ce_ltp} | Put LTP: ₹${pt.pe_ltp}`}</title>
                                </circle>
                                {isAtm && (
                                  <line x1={pt.x} y1="0" x2={pt.x} y2="190" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
                                )}
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>

                  {/* Strike Price Labels on X-axis */}
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-2 px-1">
                    {chartData.history.filter((_, i) => i % Math.max(1, Math.floor(chartData.history.length / 8)) === 0).map(pt => (
                      <span key={pt.strike} className={Math.abs(pt.strike - chartData.stock.atm_strike) < 1 ? "text-amber-400 font-bold" : ""}>
                        ₹{pt.strike}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Full Real Option Chain Table */}
            {chartViewMode === 'chain' && chartData.real_strikes && chartData.real_strikes.length > 0 && (
              <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto mt-3 max-h-96">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-slate-900 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th colSpan={3} className="px-3 py-2 text-center bg-emerald-950/40 text-emerald-300 border-r border-slate-800">
                        CALLS (CE)
                      </th>
                      <th className="px-3 py-2 text-center bg-slate-800 text-white font-black">
                        STRIKE
                      </th>
                      <th colSpan={3} className="px-3 py-2 text-center bg-purple-950/40 text-purple-300 border-l border-slate-800">
                        PUTS (PE)
                      </th>
                    </tr>
                    <tr className="border-t border-slate-800/80 text-[10px]">
                      <th className="px-3 py-2 text-right">Call OI</th>
                      <th className="px-3 py-2 text-right">Call LTP</th>
                      <th className="px-3 py-2 text-right border-r border-slate-800">Call IV%</th>
                      <th className="px-4 py-2 text-center bg-slate-800 text-amber-300 font-bold">Strike (₹)</th>
                      <th className="px-3 py-2 text-left border-l border-slate-800">Put IV%</th>
                      <th className="px-3 py-2 text-right">Put LTP</th>
                      <th className="px-3 py-2 text-right">Put OI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {chartData.real_strikes.map((stk) => {
                      const isAtm = Math.abs(stk.strike - chartData.stock.atm_strike) < 1;
                      return (
                        <tr 
                          key={stk.strike} 
                          className={isAtm ? "bg-amber-500/10 font-bold" : "hover:bg-slate-900/60"}
                        >
                          <td className="px-3 py-1.5 text-right text-slate-400">
                            {stk.ce_oi?.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-1.5 text-right font-bold text-white">
                            ₹{stk.ce_ltp}
                          </td>
                          <td className="px-3 py-1.5 text-right text-emerald-400 font-bold border-r border-slate-800">
                            {stk.ce_iv?.toFixed(1)}%
                          </td>
                          <td className="px-4 py-1.5 text-center font-black bg-slate-900/90 text-white">
                            ₹{stk.strike} {isAtm ? '★ ATM' : ''}
                          </td>
                          <td className="px-3 py-1.5 text-left text-purple-400 font-bold border-l border-slate-800">
                            {stk.pe_iv?.toFixed(1)}%
                          </td>
                          <td className="px-3 py-1.5 text-right font-bold text-white">
                            ₹{stk.pe_ltp}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-400">
                            {stk.pe_oi?.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Select a stock above to see live official NSE IV smile curves and option chains.</span>
          </div>
        )}
      </div>

      {/* IV Grid Filter Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Stock search */}
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Stock: All or type to filter"
              value={searchStock}
              onChange={(e) => setSearchStock(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Last IV min */}
          <div className="w-28">
            <input
              type="number"
              placeholder="Last IV min"
              value={lastIvMin}
              onChange={(e) => setLastIvMin(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Last IV max */}
          <div className="w-28">
            <input
              type="number"
              placeholder="Last IV max"
              value={lastIvMax}
              onChange={(e) => setLastIvMax(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* IV spike % min */}
          <div className="w-32">
            <input
              type="number"
              placeholder="IV spike % min"
              value={ivSpikeMin}
              onChange={(e) => {
                setIvSpikeMin(e.target.value);
                setActiveSpikePreset(null);
              }}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* IV Spike Presets >=10%, >=15%, >=20% */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-500" />
              IV spike:
            </span>
            {[10, 15, 20].map((pct) => (
              <button
                key={pct}
                onClick={() => handleApplySpikePreset(pct)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  activeSpikePreset === pct
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                &gt;={pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Clear filters button */}
        <button
          onClick={handleClearFilters}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
          <span>Clear filters</span>
        </button>
      </div>

      {/* Real F&O IV Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              Live Official NSE Derivatives Universe ({filteredStocks.length} securities)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Live Feed
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Sorted by <strong className="text-emerald-400">{tableSortBy === 'symbol' ? 'Symbol (Alphabetical)' : tableSortBy.replace(/_/g, ' ').toUpperCase()}</strong> ({tableSortOrder.toUpperCase()})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th 
                  onClick={() => handleTableSort('symbol')}
                  className="px-4 py-3 cursor-pointer hover:text-emerald-400 transition-colors select-none"
                  title="Click to sort Alphabetically (A-Z)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Stock / Symbol</span>
                    <span className={`text-[10px] font-bold ${tableSortBy === 'symbol' ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {tableSortBy === 'symbol' ? (tableSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th 
                  onClick={() => handleTableSort('current_price')}
                  className="px-3 py-3 cursor-pointer hover:text-emerald-400 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Spot Price / 1D</span>
                    <span className={`text-[10px] font-bold ${tableSortBy === 'current_price' ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {tableSortBy === 'current_price' ? (tableSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th 
                  onClick={() => handleTableSort('current_iv')}
                  className="px-3 py-3 text-right cursor-pointer hover:text-emerald-400 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Real IV (%)</span>
                    <span className={`text-[10px] font-bold ${tableSortBy === 'current_iv' ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {tableSortBy === 'current_iv' ? (tableSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th 
                  onClick={() => handleTableSort('iv_spike_pct')}
                  className="px-3 py-3 text-right cursor-pointer hover:text-emerald-400 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>IV Spike %</span>
                    <span className={`text-[10px] font-bold ${tableSortBy === 'iv_spike_pct' ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {tableSortBy === 'iv_spike_pct' ? (tableSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th 
                  onClick={() => handleTableSort('iv_percentile')}
                  className="px-3 py-3 text-right cursor-pointer hover:text-emerald-400 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>IVP</span>
                    <span className={`text-[10px] font-bold ${tableSortBy === 'iv_percentile' ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {tableSortBy === 'iv_percentile' ? (tableSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th 
                  onClick={() => handleTableSort('iv_rank')}
                  className="px-3 py-3 text-right cursor-pointer hover:text-emerald-400 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>IVR</span>
                    <span className={`text-[10px] font-bold ${tableSortBy === 'iv_rank' ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {tableSortBy === 'iv_rank' ? (tableSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th 
                  onClick={() => handleTableSort('historical_volatility_30d')}
                  className="px-3 py-3 text-right cursor-pointer hover:text-emerald-400 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>HV (30D)</span>
                    <span className={`text-[10px] font-bold ${tableSortBy === 'historical_volatility_30d' ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {tableSortBy === 'historical_volatility_30d' ? (tableSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th 
                  onClick={() => handleTableSort('atm_strike')}
                  className="px-3 py-3 text-right cursor-pointer hover:text-emerald-400 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>ATM Strike</span>
                    <span className={`text-[10px] font-bold ${tableSortBy === 'atm_strike' ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {tableSortBy === 'atm_strike' ? (tableSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th 
                  onClick={() => handleTableSort('pcr_oi')}
                  className="px-3 py-3 text-right cursor-pointer hover:text-emerald-400 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>PCR (OI)</span>
                    <span className={`text-[10px] font-bold ${tableSortBy === 'pcr_oi' ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {tableSortBy === 'pcr_oi' ? (tableSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th className="px-3 py-3">Expiry</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                    No F&amp;O stocks match the given IV filters.
                  </td>
                </tr>
              ) : (
                filteredStocks.map((stk) => {
                  const isUp = (stk.change_1d || 0) >= 0;
                  const isSpikeHigh = (stk.iv_spike_pct || 0) >= 10;

                  return (
                    <tr 
                      key={stk.symbol} 
                      className={`hover:bg-slate-800/50 transition-colors ${
                        selectedStockForChart === stk.symbol ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                            className="font-bold font-mono text-white hover:text-emerald-400 text-left"
                          >
                            {stk.symbol}
                          </button>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                            {stk.sector || 'F&O'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          {stk.name}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-mono font-bold text-white">
                          ₹{stk.current_price?.toLocaleString('en-IN')}
                        </div>
                        <div className={`text-[11px] font-mono font-semibold flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUp ? '+' : ''}{stk.change_1d?.toFixed(2)}%
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          stk.current_iv > 30 ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                          stk.current_iv > 20 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {stk.current_iv?.toFixed(1)}%
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          isSpikeHigh 
                            ? 'bg-emerald-500/20 text-emerald-400 font-black border border-emerald-500/40' 
                            : (stk.iv_spike_pct < 0 ? 'text-rose-400' : 'text-slate-300')
                        }`}>
                          {stk.iv_spike_pct > 0 ? '+' : ''}{stk.iv_spike_pct?.toFixed(1)}%
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right font-mono text-indigo-300">
                        {stk.iv_percentile?.toFixed(1)}
                      </td>

                      <td className="px-3 py-3 text-right font-mono text-purple-300">
                        {stk.iv_rank?.toFixed(1)}
                      </td>

                      <td className="px-3 py-3 text-right font-mono text-slate-300">
                        {stk.historical_volatility_30d?.toFixed(1)}%
                      </td>

                      <td className="px-3 py-3 text-right font-mono text-white font-semibold">
                        ₹{stk.atm_strike?.toLocaleString('en-IN')}
                      </td>

                      <td className="px-3 py-3 text-right font-mono font-bold">
                        <span className={stk.pcr_oi >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {stk.pcr_oi?.toFixed(2)}
                        </span>
                      </td>

                      <td className="px-3 py-3 font-mono text-[11px] text-slate-400">
                        {stk.expiry_date}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedStockForChart(stk.symbol);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-[11px] font-bold transition-colors"
                            title="Load Real NSE Option Chain & IV Smile"
                          >
                            Load Real IV
                          </button>
                          <button
                            onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Deep Equity Analysis"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
