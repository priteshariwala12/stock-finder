import React, { useState } from 'react';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Download, Search, 
  ExternalLink, Eye, SlidersHorizontal, ChevronLeft, ChevronRight,
  Zap, Shield, AlertCircle, Star, Sparkles, Rocket, Terminal
} from 'lucide-react';

export default function StockTable({
  stocks,
  totalStocks,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortOrder,
  onSort,
  searchTerm,
  onSearchChange,
  onSelectStock,
  onExportCsv,
  isLoading,
  activeFiltersCount,
  onResetFilters,
  watchlist = [],
  onToggleWatchlist,
  isWatchlistOnly,
  onToggleWatchlistFilter,
  isFnoOnly = false,
  onToggleFno,
  activeSegment = 'all',
  onSelectSegment,
  marketSummary,
  isSidebarOpen = true,
  onToggleSidebar,
  onOpenQueryScreener,
  highlightFilter = false
}) {
  const [visibleColumns, setVisibleColumns] = useState({
    symbol: true,
    potential: true,
    price: true,
    change_1d: true,
    volume: true,
    delivery: true,
    market_cap: true,
    pe: true,
    roce: true,
    roe: true,
    debt_equity: true,
    rsi: true,
    signals: true,
    actions: true
  });

  const [showColPicker, setShowColPicker] = useState(false);

  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getSortIcon = (col) => {
    if (sortBy !== col) return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-indigo-400 font-bold" />
      : <ArrowDown className="w-3 h-3 text-indigo-400 font-bold" />;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden">
      {/* Sleek Unified Workspace Header */}
      <div className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md">
        {/* Tier 1: Apple/Linear-Style Segmented Navigation & Global Toggles */}
        <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60">
          {/* Segmented Control Tabs */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 shadow-inner overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Equities', count: marketSummary?.total_stocks || totalStocks },
              { id: 'gainers', label: 'Top Gainers', count: marketSummary?.advances ? `+${marketSummary.advances}` : null, accent: 'text-emerald-400' },
              { id: 'losers', label: 'Top Losers', count: marketSummary?.declines ? `-${marketSummary.declines}` : null, accent: 'text-rose-400' },
              { id: 'volume_shockers', label: 'Volume Shockers', count: marketSummary?.volume_shockers_count || null, accent: 'text-cyan-400' },
              { id: '52w_high', label: '52W Breakouts', count: null },
              { id: 'multibagger', label: 'Multi-Baggers', count: null, accent: 'text-amber-400' },
            ].map(seg => {
              const isActive = activeSegment === seg.id;
              return (
                <button
                  key={seg.id}
                  onClick={() => onSelectSegment && onSelectSegment(seg.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm font-bold border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span>{seg.label}</span>
                  {seg.count && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive 
                        ? 'bg-slate-700/80 text-slate-200' 
                        : (seg.accent ? `${seg.accent} bg-slate-900` : 'text-slate-500 bg-slate-900')
                    }`}>
                      {seg.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Quick Controls */}
          <div className="flex items-center gap-2">
            {/* F&O Quick Pill Toggle */}
            <button
              onClick={onToggleFno}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                isFnoOnly
                  ? 'bg-purple-950/60 text-purple-200 border-purple-500/60 shadow-sm'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 border-slate-700/70 hover:text-slate-200'
              }`}
              title="Toggle F&O (Futures & Options) Universe Only"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isFnoOnly ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`}></span>
              <span>F&O Stocks</span>
              {isFnoOnly && marketSummary?.fno_count && (
                <span className="text-[10px] font-mono text-purple-300">({marketSummary.fno_count})</span>
              )}
            </button>

            {/* Watchlist Quick Pill Toggle */}
            <button
              onClick={onToggleWatchlistFilter}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                isWatchlistOnly
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/60 shadow-sm'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 border-slate-700/70 hover:text-slate-200'
              }`}
              title="Filter by your starred Watchlist"
            >
              <Star className={`w-3.5 h-3.5 ${isWatchlistOnly ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Watchlist</span>
              {watchlist.length > 0 && (
                <span className="text-[10px] font-mono px-1 rounded bg-slate-700/80 text-slate-300">
                  {watchlist.length}
                </span>
              )}
            </button>

            {/* Screener.in Custom Query Shortcut Button */}
            {onOpenQueryScreener && (
              <button
                onClick={onOpenQueryScreener}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/50 shadow-sm cursor-pointer"
                title="Create a custom search query with Screener.in formulas"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Custom Query</span>
              </button>
            )}

            {/* Sidebar Toggle Button */}
            <button
              onClick={onToggleSidebar}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                isSidebarOpen
                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/60 shadow-sm'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 border-slate-700/70 hover:text-slate-200'
              } ${highlightFilter ? 'animate-highlight-twice ring-2 ring-indigo-400' : ''}`}
              title={isSidebarOpen ? "Hide Filters Sidebar" : "Show Filters Sidebar"}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-600 text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tier 2: Search, Active Filters Count & Table Actions */}
        <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
          {/* Left: Search with clear button and live count */}
          <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-lg">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeFiltersCount === 0 && !searchTerm
                    ? "Type to search stocks or select criteria from Filters..."
                    : `Search ${totalStocks.toLocaleString('en-IN')} stocks by symbol or name...`
                }
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Active filters pill */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-300 whitespace-nowrap shrink-0">
                <span className="font-semibold">{activeFiltersCount}</span> active
                <button 
                  onClick={onResetFilters}
                  className="ml-1 text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Right: Columns & Export CSV */}
          <div className="flex items-center gap-2">
            {/* Columns Customizer Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowColPicker(!showColPicker)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1.5 transition-colors"
                title="Customize Table Columns"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Columns</span>
              </button>

              {showColPicker && (
                <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl p-3 z-30 space-y-1.5 text-xs animate-in fade-in duration-150">
                  <div className="font-bold text-slate-200 pb-1.5 border-b border-slate-800 flex items-center justify-between">
                    <span>Visible Columns</span>
                    <button onClick={() => setShowColPicker(false)} className="text-slate-500 hover:text-slate-300">✕</button>
                  </div>
                  {Object.keys(visibleColumns).map(key => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white capitalize py-0.5">
                      <input
                        type="checkbox"
                        checked={visibleColumns[key]}
                        onChange={() => toggleColumn(key)}
                        className="rounded bg-slate-800 border-slate-700 text-indigo-500"
                      />
                      <span>{key.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Export CSV */}
            <button
              onClick={onExportCsv}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-all"
              title="Export Current Results to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table or No-Criteria Selected Placeholder */}
      {activeFiltersCount === 0 && (!searchTerm || !searchTerm.trim()) ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/40 min-h-[460px]">
          <div className="max-w-md w-full mx-auto space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Icon with glowing pulse */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-xl">
                <SlidersHorizontal className="w-8 h-8 text-indigo-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">
                No Screening Criteria Selected
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                Select your criteria from the <span className="font-semibold text-indigo-300">Filters panel</span>, choose a market segment above, or click a quick-start strategy below to start screening.
              </p>
            </div>

            {/* Prominent Open Filters Button */}
            <div className="pt-1">
              <button
                onClick={onToggleSidebar}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/40 hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{isSidebarOpen ? "Customize Filters in Sidebar" : "Open Filters & Select Criteria"}</span>
              </button>
            </div>

            {/* 1-Click Quick Criteria Shortcuts */}
            <div className="pt-4 border-t border-slate-800/80">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Or Quick Start With:
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => onSelectSegment && onSelectSegment('gainers')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>🔥 Top Gainers</span>
                </button>
                <button
                  onClick={() => onSelectSegment && onSelectSegment('volume_shockers')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-cyan-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>⚡ Volume Shockers</span>
                </button>
                <button
                  onClick={() => onSelectSegment && onSelectSegment('52w_high')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 text-indigo-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>🚀 52W Breakouts</span>
                </button>
                <button
                  onClick={() => onSelectSegment && onSelectSegment('multibagger')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>💎 Multi-Baggers</span>
                </button>
                <button
                  onClick={onToggleFno}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/50 text-purple-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>🎯 F&O Stocks</span>
                </button>
                {onOpenQueryScreener && (
                  <button
                    onClick={onOpenQueryScreener}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500/50 text-teal-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5 text-teal-400" />
                    <span>Custom Query</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-indigo-300 text-xs font-medium">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Filtering equities...</span>
            </div>
          </div>
        )}

        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-900/95 sticky top-0 z-10 border-b border-slate-800 text-slate-400 font-medium select-none">
            <tr>
              {visibleColumns.symbol && (
                <th 
                  onClick={() => onSort('symbol')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Company / Symbol</span>
                    {getSortIcon('symbol')}
                  </div>
                </th>
              )}
              {visibleColumns.potential && (
                <th 
                  onClick={() => onSort('potential_score')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-200 transition-colors"
                  title="Composite Potential Score: Multi-bagger upside, ROCE, YoY growth & momentum"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-slate-200">Potential</span>
                    {getSortIcon('potential_score')}
                  </div>
                </th>
              )}
              {visibleColumns.price && (
                <th 
                  onClick={() => onSort('current_price')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Price (₹)</span>
                    {getSortIcon('current_price')}
                  </div>
                </th>
              )}
              {visibleColumns.change_1d && (
                <th 
                  onClick={() => onSort('change_1d')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>1D Change</span>
                    {getSortIcon('change_1d')}
                  </div>
                </th>
              )}
              {visibleColumns.volume && (
                <th 
                  onClick={() => onSort('volume')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Volume / Surge</span>
                    {getSortIcon('volume')}
                  </div>
                </th>
              )}
              {visibleColumns.delivery && (
                <th 
                  onClick={() => onSort('delivery_percent')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>NSE Delivery %</span>
                    {getSortIcon('delivery_percent')}
                  </div>
                </th>
              )}
              {visibleColumns.market_cap && (
                <th 
                  onClick={() => onSort('market_cap_cr')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Market Cap (Cr)</span>
                    {getSortIcon('market_cap_cr')}
                  </div>
                </th>
              )}
              {visibleColumns.pe && (
                <th 
                  onClick={() => onSort('pe_ratio')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>P/E</span>
                    {getSortIcon('pe_ratio')}
                  </div>
                </th>
              )}
              {visibleColumns.roce && (
                <th 
                  onClick={() => onSort('roce')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>ROCE %</span>
                    {getSortIcon('roce')}
                  </div>
                </th>
              )}
              {visibleColumns.roe && (
                <th 
                  onClick={() => onSort('roe')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>ROE %</span>
                    {getSortIcon('roe')}
                  </div>
                </th>
              )}
              {visibleColumns.debt_equity && (
                <th 
                  onClick={() => onSort('debt_to_equity')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>D/E</span>
                    {getSortIcon('debt_to_equity')}
                  </div>
                </th>
              )}
              {visibleColumns.rsi && (
                <th 
                  onClick={() => onSort('rsi_14')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>RSI (14)</span>
                    {getSortIcon('rsi_14')}
                  </div>
                </th>
              )}
              {visibleColumns.signals && (
                <th className="py-3 px-3 text-left">
                  <span>Signals</span>
                </th>
              )}
              {visibleColumns.actions && (
                <th className="py-3 px-3 text-center">
                  <span>Official Quotes</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {stocks.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={13} className="py-16 text-center text-slate-500">
                  <div className="max-w-xs mx-auto space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="font-medium text-slate-400">No matching stocks found</p>
                    <p className="text-[11px] text-slate-500">Try relaxing your screening filters or resetting the search criteria.</p>
                    <button
                      onClick={onResetFilters}
                      className="mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition-colors"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              stocks.map((stock) => {
                const isPositive = stock.change_1d >= 0;
                const isBreakout = stock.is_breakout_3pct === 1;
                const isHighDelivery = stock.delivery_percent >= 55;

                return (
                  <tr 
                    key={stock.symbol}
                    className="hover:bg-slate-900/60 transition-colors group cursor-pointer border-b border-slate-800/40"
                    onClick={() => onSelectStock(stock.symbol)}
                  >
                    {/* Symbol & Name */}
                    {visibleColumns.symbol && (
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleWatchlist(stock.symbol);
                            }}
                            className={`p-1 rounded transition-colors ${
                              watchlist.includes(stock.symbol)
                                ? 'text-amber-400'
                                : 'text-slate-600 hover:text-slate-400 opacity-30 group-hover:opacity-100'
                            }`}
                            title={watchlist.includes(stock.symbol) ? "Remove from Watchlist" : "Add to Watchlist"}
                          >
                            <Star className={`w-3.5 h-3.5 ${watchlist.includes(stock.symbol) ? 'fill-amber-400' : ''}`} />
                          </button>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`https://in.tradingview.com/chart/?symbol=NSE:${stock.symbol}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="font-bold text-slate-100 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                                title="Open TradingView Chart (1-Click)"
                              >
                                <span>{stock.symbol}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60 font-medium">
                                NSE
                              </span>
                              {stock.is_fno === 1 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/50 font-semibold" title="Derivatives (F&O) Eligible Security">
                                  F&O
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                              {stock.name}
                            </div>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Potential Score */}
                    {visibleColumns.potential && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs ${
                            (stock.potential_score || 0) >= 8.0
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : (stock.potential_score || 0) >= 7.0
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                          }`}>
                            {stock.potential_score ? stock.potential_score.toFixed(1) : '5.0'}
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium mt-0.5">
                            {stock.potential_grade || 'Moderate'}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Price */}
                    {visibleColumns.price && (
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-100 tabular-nums">
                        ₹{stock.current_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    )}

                    {/* 1D Change */}
                    {visibleColumns.change_1d && (
                      <td className="py-2.5 px-3 text-right">
                        <span className={`inline-flex items-center font-semibold px-2 py-0.5 rounded text-xs tabular-nums ${
                          isPositive ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40' : 'text-rose-400 bg-rose-950/40 border border-rose-800/40'
                        }`}>
                          {isPositive ? '+' : ''}{stock.change_1d}%
                        </span>
                      </td>
                    )}

                    {/* Volume & Surge */}
                    {visibleColumns.volume && (
                      <td className="py-2.5 px-3 text-right">
                        <div className="font-semibold text-slate-200 tabular-nums">
                          {stock.volume?.toLocaleString('en-IN')}
                        </div>
                        {stock.volume_multiple && stock.volume_multiple >= 1.2 ? (
                          <div className="text-[10px] text-cyan-400 font-medium mt-0.5 tabular-nums">
                            ⚡ {stock.volume_multiple}x {stock.volume_change_pct ? `(+${stock.volume_change_pct}%)` : ''}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-600 tabular-nums">Avg Vol</div>
                        )}
                      </td>
                    )}

                    {/* Delivery % */}
                    {visibleColumns.delivery && (
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`font-semibold ${isHighDelivery ? 'text-indigo-300' : 'text-slate-300'}`}>
                            {stock.delivery_percent}%
                          </span>
                          <div className="w-12 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isHighDelivery ? 'bg-indigo-500' : 'bg-slate-600'}`}
                              style={{ width: `${Math.min(stock.delivery_percent || 0, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Market Cap */}
                    {visibleColumns.market_cap && (
                      <td className="py-3 px-3 text-right">
                        <div className="font-semibold text-slate-200">
                          ₹{Math.round(stock.market_cap_cr)?.toLocaleString('en-IN')} Cr
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {stock.market_cap_category}
                        </div>
                      </td>
                    )}

                    {/* Valuation P/E */}
                    {visibleColumns.pe && (
                      <td className="py-3 px-3 text-right text-slate-300 font-medium">
                        {stock.pe_ratio ? stock.pe_ratio : '-'}
                      </td>
                    )}

                    {/* ROCE */}
                    {visibleColumns.roce && (
                      <td className="py-3 px-3 text-right font-medium text-emerald-400">
                        {stock.roce ? `${stock.roce}%` : '-'}
                      </td>
                    )}

                    {/* ROE */}
                    {visibleColumns.roe && (
                      <td className="py-3 px-3 text-right font-medium text-slate-300">
                        {stock.roe ? `${stock.roe}%` : '-'}
                      </td>
                    )}

                    {/* D/E */}
                    {visibleColumns.debt_equity && (
                      <td className="py-3 px-3 text-right font-medium text-slate-300">
                        {stock.debt_to_equity !== null ? stock.debt_to_equity : '-'}
                      </td>
                    )}

                    {/* RSI */}
                    {visibleColumns.rsi && (
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          stock.rsi_14 < 35 
                            ? 'text-emerald-400 bg-emerald-950/70 border border-emerald-800' 
                            : stock.rsi_14 > 70 
                              ? 'text-amber-400 bg-amber-950/70 border border-amber-800'
                              : 'text-slate-300 bg-slate-800'
                        }`}>
                          {stock.rsi_14 || '-'}
                        </span>
                      </td>
                    )}

                    {/* Signals Badges */}
                    {visibleColumns.signals && (
                      <td className="py-3 px-3 text-left">
                        <div className="flex flex-wrap gap-1 max-w-[170px]">
                          {isBreakout && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" /> Breakout
                            </span>
                          )}
                          {stock.golden_cross === 1 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Golden Cross
                            </span>
                          )}
                          {isHighDelivery && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              High Deliv
                            </span>
                          )}
                          {stock.dist_from_52w_high !== null && stock.dist_from_52w_high <= 5 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              Near 52W High
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Official Links & Actions */}
                    {visibleColumns.actions && (
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectStock(stock.symbol)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                            title="View Full Technical & Fundamental Analysis"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={`https://in.tradingview.com/chart/?symbol=NSE:${stock.symbol}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-1.5 py-0.5 rounded text-emerald-400 hover:text-white hover:bg-emerald-600/80 bg-emerald-950/60 border border-emerald-800 text-[10px] font-extrabold transition-colors flex items-center gap-0.5"
                            title="Open TradingView Chart (1-Click)"
                          >
                            TV
                          </a>
                          <a
                            href={stock.nse_url || `https://www.nseindia.com/get-quotes/equity?symbol=${stock.symbol}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 text-[10px] font-bold transition-colors"
                            title="Open Official NSE India Quote"
                          >
                            NSE
                          </a>
                          {stock.bse_code && (
                            <a
                              href={stock.bse_url || `https://www.bseindia.com/stock-share-price/x/x/${stock.bse_code}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 text-[10px] font-bold transition-colors"
                              title="Open Official BSE India Quote"
                            >
                              BSE
                            </a>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="hidden sm:inline text-slate-500">
            Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalStocks)} of {totalStocks}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-300 font-medium">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
