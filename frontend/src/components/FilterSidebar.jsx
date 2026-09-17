import React, { useState } from 'react';
import { 
  Filter, RotateCcw, Bookmark, ChevronDown, ChevronRight, 
  BarChart2, DollarSign, Activity, Percent, Sparkles, X, Check, Rocket, Zap
} from 'lucide-react';

export default function FilterSidebar({
  filters,
  onFilterChange,
  onResetFilters,
  presets,
  activePresetId,
  onSelectPreset,
  onOpenSavePreset,
  sectors,
  isMobileOpen,
  onCloseMobile,
  isFnoOnly,
  onToggleFno,
  fnoCount,
  isOpen = true,
  onToggle
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'fundamental', 'technical', 'presets'
  const [expandedSections, setExpandedSections] = useState({
    valuation: true,
    profitability: true,
    solvency: true,
    priceTech: true,
    movingAvg: true,
    volumeDelivery: true
  });

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const marketCapChips = [
    { label: "Large Cap (₹20k+ Cr)", value: "Large Cap" },
    { label: "Mid Cap (₹5k-20k Cr)", value: "Mid Cap" },
    { label: "Small Cap (₹1k-5k Cr)", value: "Small Cap" },
    { label: "Micro Cap (<₹1k Cr)", value: "Micro Cap" }
  ];

  const handleMcapToggle = (cat) => {
    const current = filters.market_cap_categories || [];
    if (current.includes(cat)) {
      onFilterChange('market_cap_categories', current.filter(c => c !== cat));
    } else {
      onFilterChange('market_cap_categories', [...current, cat]);
    }
  };

  return (
    <aside className={`
      w-72 shrink-0 bg-slate-900/95 border-r border-slate-800/90 flex flex-col h-[calc(100vh-61px)] sticky top-[61px] z-20 transition-all
      ${isMobileOpen ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl' : (isOpen ? 'hidden lg:flex' : 'hidden')}
    `}>
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-400" />
          <h2 className="font-semibold text-xs text-slate-100">Screening Filters</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onResetFilters}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
            title="Reset All Filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="text-[11px]">Reset</span>
          </button>
          <button
            onClick={onOpenSavePreset}
            className="px-2 py-0.5 rounded-md bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[11px] font-medium flex items-center gap-1 transition-all"
            title="Save active filters as preset"
          >
            <Bookmark className="w-2.5 h-2.5" />
            <span>Save</span>
          </button>
          {isMobileOpen ? (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-md text-slate-400 hover:text-white lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onToggle}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 hidden lg:flex items-center transition-colors ml-1"
              title="Hide Filters Sidebar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3 pt-2 pb-1 border-b border-slate-800/80 flex items-center gap-1 bg-slate-950/40 text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
            activeTab === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Filters
        </button>
        <button
          onClick={() => setActiveTab('presets')}
          className={`px-2.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
            activeTab === 'presets' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>Presets</span>
        </button>
        <button
          onClick={() => setActiveTab('fundamental')}
          className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
            activeTab === 'fundamental' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Fundamental
        </button>
        <button
          onClick={() => setActiveTab('technical')}
          className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
            activeTab === 'technical' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Technical
        </button>
      </div>

      {/* Scrollable Filters Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-300">
        {/* F&O Universe Switch Card */}
        <div className={`p-2.5 rounded-xl border transition-all ${
          isFnoOnly
            ? 'bg-purple-950/40 border-purple-500/50 shadow-sm'
            : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700/80'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg transition-colors ${isFnoOnly ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-400'}`}>
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-200 text-xs">F&O Universe</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    isFnoOnly ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isFnoOnly ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {fnoCount ? `${fnoCount} NSE derivatives` : '210+ liquid contracts'}
                </div>
              </div>
            </div>

            {/* Switch slider */}
            <button
              type="button"
              onClick={onToggleFno}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isFnoOnly ? 'bg-purple-600' : 'bg-slate-700'
              }`}
              title="Toggle F&O Universe"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isFnoOnly ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* PRESETS LIST VIEW */}
        {(activeTab === 'presets' || activeTab === 'all') && (
          <div className="space-y-2 pb-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Strategy Presets</span>
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {presets?.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPreset(p.id)}
                  className={`text-left p-2.5 rounded-lg border transition-all flex flex-col gap-1 ${
                    activePresetId === p.id
                      ? 'bg-indigo-950/70 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100">{p.name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-300">
                      {p.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CLAUDE.AI MULTI-BAGGER STRATEGY QUICK CARD */}
        {(activeTab === 'fundamental' || activeTab === 'all') && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-fuchsia-950/40 via-purple-950/20 to-transparent border border-fuchsia-600/40 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-extrabold text-fuchsia-300 flex items-center gap-1.5 text-xs">
                  <Rocket className="w-3.5 h-3.5 text-fuchsia-400" />
                  Multi-Baggers (&lt; ₹100)
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Quant model: Price &lt; ₹100, ROCE &gt; 12%, Low Debt
                </p>
              </div>
              <button
                onClick={() => {
                  const isApplied = filters.price_max === 100 && filters.roce_min === 12;
                  if (isApplied) {
                    onFilterChange('price_max', null);
                    onFilterChange('roce_min', null);
                    onFilterChange('debt_to_equity_max', null);
                    onFilterChange('volume_min', null);
                  } else {
                    onFilterChange('price_max', 100);
                    onFilterChange('roce_min', 12.0);
                    onFilterChange('debt_to_equity_max', 0.8);
                    onFilterChange('volume_min', 200000);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  filters.price_max === 100 && filters.roce_min === 12
                    ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {filters.price_max === 100 && filters.roce_min === 12 ? 'Active' : 'Apply'}
              </button>
            </div>
          </div>
        )}

        {/* MOMENTUM BREAKOUT QUICK TOGGLE (HIGHLIGHTED STRATEGY) */}
        {(activeTab === 'technical' || activeTab === 'all') && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/30">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-300 flex items-center gap-1 text-xs">
                  🚀 Momentum Breakout Strategy
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Strong Price Momentum + Above-average volume
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!filters.is_breakout_3pct}
                  onChange={(e) => onFilterChange('is_breakout_3pct', e.target.checked || null)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>
        )}

        {/* POTENTIAL SCORE FILTER */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Potential Ranking
            </span>
            {filters.potential_min && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                ≥ {filters.potential_min}/10
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Ranked by ROCE, YoY growth, volume surge & upside headroom
          </p>
          <div className="grid grid-cols-4 gap-1 pt-1">
            {[
              { label: "All", value: null },
              { label: "≥ 6.0", value: 6.0 },
              { label: "≥ 7.0", value: 7.0 },
              { label: "≥ 8.0 🔥", value: 8.0 }
            ].map(opt => (
              <button
                key={opt.label}
                onClick={() => onFilterChange('potential_min', opt.value)}
                className={`py-1 rounded text-center text-[10px] font-bold transition-all border ${
                  filters.potential_min === opt.value
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================= FUNDAMENTAL FILTERS ================= */}
        {(activeTab === 'fundamental' || activeTab === 'all') && (
          <>
            {/* Market Cap & Categories */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Market Capitalization
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {marketCapChips.map(chip => {
                  const isSelected = (filters.market_cap_categories || []).includes(chip.value);
                  return (
                    <button
                      key={chip.value}
                      onClick={() => handleMcapToggle(chip.value)}
                      className={`px-2 py-1.5 rounded text-[11px] font-medium border text-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-400 text-white font-semibold'
                          : 'bg-slate-800/70 border-slate-700/80 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  placeholder="Min ₹ Cr"
                  value={filters.market_cap_min ?? ''}
                  onChange={(e) => onFilterChange('market_cap_min', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-slate-500">-</span>
                <input
                  type="number"
                  placeholder="Max ₹ Cr"
                  value={filters.market_cap_max ?? ''}
                  onChange={(e) => onFilterChange('market_cap_max', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Valuation Ratios */}
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/30">
              <button
                onClick={() => toggleSection('valuation')}
                className="w-full px-3 py-2.5 bg-slate-800/40 flex items-center justify-between font-medium text-slate-200 hover:bg-slate-800/70"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Valuation Ratios</span>
                </div>
                {expandedSections.valuation ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {expandedSections.valuation && (
                <div className="p-3 space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">P/E Ratio</span>
                      <span className="text-slate-500">Max: {filters.pe_max || 'Any'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min P/E"
                        value={filters.pe_min ?? ''}
                        onChange={(e) => onFilterChange('pe_min', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500 focus:border-indigo-500"
                      />
                      <input
                        type="number"
                        placeholder="Max P/E"
                        value={filters.pe_max ?? ''}
                        onChange={(e) => onFilterChange('pe_max', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Price to Book (P/B)</span>
                      <span className="text-slate-500">Max: {filters.pb_max || 'Any'}</span>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Max P/B (e.g. 5.0)"
                      value={filters.pb_max ?? ''}
                      onChange={(e) => onFilterChange('pb_max', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Dividend Yield (%)</span>
                      <span className="text-slate-500">Min: {filters.dividend_yield_min ? `${filters.dividend_yield_min}%` : 'Any'}</span>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Min Div Yield % (e.g. 2.0)"
                      value={filters.dividend_yield_min ?? ''}
                      onChange={(e) => onFilterChange('dividend_yield_min', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Profitability & Return Ratios */}
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/30">
              <button
                onClick={() => toggleSection('profitability')}
                className="w-full px-3 py-2.5 bg-slate-800/40 flex items-center justify-between font-medium text-slate-200 hover:bg-slate-800/70"
              >
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Profitability & Growth</span>
                </div>
                {expandedSections.profitability ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {expandedSections.profitability && (
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 text-[11px] block mb-1">Min ROE (%)</span>
                      <input
                        type="number"
                        placeholder="e.g. 15%"
                        value={filters.roe_min ?? ''}
                        onChange={(e) => onFilterChange('roe_min', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block mb-1">Min ROCE (%)</span>
                      <input
                        type="number"
                        placeholder="e.g. 15%"
                        value={filters.roce_min ?? ''}
                        onChange={(e) => onFilterChange('roce_min', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Profit Growth YoY (%)</span>
                    <input
                      type="number"
                      placeholder="Min Profit Growth % (e.g. 15%)"
                      value={filters.profit_growth_min ?? ''}
                      onChange={(e) => onFilterChange('profit_growth_min', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Sales Growth YoY (%)</span>
                    <input
                      type="number"
                      placeholder="Min Sales Growth % (e.g. 10%)"
                      value={filters.sales_growth_min ?? ''}
                      onChange={(e) => onFilterChange('sales_growth_min', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Solvency & Shareholding */}
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/30">
              <button
                onClick={() => toggleSection('solvency')}
                className="w-full px-3 py-2.5 bg-slate-800/40 flex items-center justify-between font-medium text-slate-200 hover:bg-slate-800/70"
              >
                <div className="flex items-center gap-2">
                  <Percent className="w-3.5 h-3.5 text-purple-400" />
                  <span>Solvency & Ownership</span>
                </div>
                {expandedSections.solvency ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {expandedSections.solvency && (
                <div className="p-3 space-y-3">
                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Max Debt-to-Equity</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 0.5 (Low Debt)"
                      value={filters.debt_to_equity_max ?? ''}
                      onChange={(e) => onFilterChange('debt_to_equity_max', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Min Promoter Holding (%)</span>
                    <input
                      type="number"
                      placeholder="e.g. 50%"
                      value={filters.promoter_holding_min ?? ''}
                      onChange={(e) => onFilterChange('promoter_holding_min', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Min FII + DII Holding (%)</span>
                    <input
                      type="number"
                      placeholder="e.g. 25%"
                      value={filters.fii_dii_min ?? ''}
                      onChange={(e) => onFilterChange('fii_dii_min', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ================= TECHNICAL FILTERS ================= */}
        {(activeTab === 'technical' || activeTab === 'all') && (
          <>
            {/* Price & Momentum */}
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/30">
              <button
                onClick={() => toggleSection('priceTech')}
                className="w-full px-3 py-2.5 bg-slate-800/40 flex items-center justify-between font-medium text-slate-200 hover:bg-slate-800/70"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                  <span>Price & Momentum (RSI)</span>
                </div>
                {expandedSections.priceTech ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {expandedSections.priceTech && (
                <div className="p-3 space-y-3">
                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">1-Day % Change</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min %"
                        value={filters.change_1d_min ?? ''}
                        onChange={(e) => onFilterChange('change_1d_min', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                      <input
                        type="number"
                        placeholder="Max %"
                        value={filters.change_1d_max ?? ''}
                        onChange={(e) => onFilterChange('change_1d_max', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">RSI (14) Range</span>
                      <span className="text-slate-500">
                        {filters.rsi_min || '0'} - {filters.rsi_max || '100'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min RSI"
                        value={filters.rsi_min ?? ''}
                        onChange={(e) => onFilterChange('rsi_min', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                      <input
                        type="number"
                        placeholder="Max RSI"
                        value={filters.rsi_max ?? ''}
                        onChange={(e) => onFilterChange('rsi_max', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Within % of 52-Week High</span>
                    <input
                      type="number"
                      placeholder="e.g. 5% (Near Highs)"
                      value={filters.dist_from_52w_high_max ?? ''}
                      onChange={(e) => onFilterChange('dist_from_52w_high_max', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Volume & Delivery (Direct from NSE Bhavcopy) */}
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/30">
              <button
                onClick={() => toggleSection('volumeDelivery')}
                className="w-full px-3 py-2.5 bg-slate-800/40 flex items-center justify-between font-medium text-slate-200 hover:bg-slate-800/70"
              >
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>NSE Delivery & Volume Surge</span>
                </div>
                {expandedSections.volumeDelivery ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {expandedSections.volumeDelivery && (
                <div className="p-3 space-y-3">
                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Volume vs 20D Avg (Surge Multiple)</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[1.2, 1.5, 2.0, 3.0].map(mult => (
                        <button
                          key={mult}
                          onClick={() => onFilterChange('volume_multiple_min', filters.volume_multiple_min === mult ? null : mult)}
                          className={`py-1 rounded text-center font-medium border text-[10px] ${
                            filters.volume_multiple_min === mult
                              ? 'bg-cyan-600 border-cyan-400 text-white font-bold'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          &gt; {mult}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Volume Surge (% vs Avg)</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[50, 100, 150, 200].map(pct => (
                        <button
                          key={pct}
                          onClick={() => onFilterChange('volume_change_pct_min', filters.volume_change_pct_min === pct ? null : pct)}
                          className={`py-1 rounded text-center font-medium border text-[10px] ${
                            filters.volume_change_pct_min === pct
                              ? 'bg-emerald-600 border-emerald-400 text-white font-bold'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Min NSE Delivery (%)</span>
                    <div className="grid grid-cols-3 gap-1">
                      {[40, 50, 60].map(pct => (
                        <button
                          key={pct}
                          onClick={() => onFilterChange('delivery_percent_min', filters.delivery_percent_min === pct ? null : pct)}
                          className={`py-1 rounded text-center font-medium border text-[10px] ${
                            filters.delivery_percent_min === pct
                              ? 'bg-indigo-600 border-indigo-400 text-white font-bold'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          &ge; {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Moving Averages & Trend */}
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/30">
              <button
                onClick={() => toggleSection('movingAvg')}
                className="w-full px-3 py-2.5 bg-slate-800/40 flex items-center justify-between font-medium text-slate-200 hover:bg-slate-800/70"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Moving Average Conditions</span>
                </div>
                {expandedSections.movingAvg ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {expandedSections.movingAvg && (
                <div className="p-3 space-y-2">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={!!filters.above_ema20}
                      onChange={(e) => onFilterChange('above_ema20', e.target.checked || null)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0"
                    />
                    <span>Price Above 20 EMA (Short Term)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={!!filters.above_sma50}
                      onChange={(e) => onFilterChange('above_sma50', e.target.checked || null)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0"
                    />
                    <span>Price Above 50 SMA (Medium Term)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={!!filters.above_sma200}
                      onChange={(e) => onFilterChange('above_sma200', e.target.checked || null)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0"
                    />
                    <span>Price Above 200 SMA (Long Term)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={!!filters.golden_cross}
                      onChange={(e) => onFilterChange('golden_cross', e.target.checked || null)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0"
                    />
                    <span>⚡ Golden Cross (50 SMA &gt; 200 SMA)</span>
                  </label>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
