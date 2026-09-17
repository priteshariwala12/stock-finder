import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, FileText, TrendingUp, TrendingDown, 
  Search, RefreshCw, ExternalLink, Zap, BarChart2, 
  ArrowUpRight, ChevronRight, CheckCircle2, Building, DollarSign
} from 'lucide-react';

const QUICK_STOCKS = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'TATAMOTORS', 'ITC', 'SBIN', 'BHARTIARTL'];

export default function ResultCalendarView({ onSelectStock }) {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'declared', 'history'
  const [fnoOnly, setFnoOnly] = useState(false);
  
  // Tab 1: Upcoming State
  const [upcomingList, setUpcomingList] = useState([]);
  const [isUpcomingLoading, setIsUpcomingLoading] = useState(false);
  const [upcomingSearch, setUpcomingSearch] = useState('');

  // Tab 2: Declared State
  const [declaredList, setDeclaredList] = useState([]);
  const [isDeclaredLoading, setIsDeclaredLoading] = useState(false);
  const [declaredSearch, setDeclaredSearch] = useState('');

  // Tab 3: History State
  const [historySymbol, setHistorySymbol] = useState('RELIANCE');
  const [searchInput, setSearchInput] = useState('');
  const [stockHistory, setStockHistory] = useState(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Fetch upcoming results
  const fetchUpcoming = async (isFno = fnoOnly) => {
    setIsUpcomingLoading(true);
    try {
      const res = await fetch(`/api/results/calendar?fno_only=${isFno}`);
      if (res.ok) {
        const data = await res.json();
        setUpcomingList(data.upcoming || []);
      }
    } catch (e) {
      console.error('Failed to load upcoming calendar:', e);
    } finally {
      setIsUpcomingLoading(false);
    }
  };

  // Fetch declared results
  const fetchDeclared = async (isFno = fnoOnly) => {
    setIsDeclaredLoading(true);
    try {
      const res = await fetch(`/api/results/declared?fno_only=${isFno}`);
      if (res.ok) {
        const data = await res.json();
        setDeclaredList(data.declared || []);
      }
    } catch (e) {
      console.error('Failed to load declared results:', e);
    } finally {
      setIsDeclaredLoading(false);
    }
  };

  // Fetch 5-year history
  const fetchHistory = async (symbol) => {
    if (!symbol) return;
    setIsHistoryLoading(true);
    try {
      const res = await fetch(`/api/results/history?symbol=${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data = await res.json();
        setStockHistory(data);
        setHistorySymbol(data.symbol || symbol);
      }
    } catch (e) {
      console.error('Failed to load history for symbol:', symbol, e);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming(fnoOnly);
    fetchDeclared(fnoOnly);
  }, [fnoOnly]);

  useEffect(() => {
    fetchHistory(historySymbol);
  }, []);

  const handleSearchHistory = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchHistory(searchInput.trim().toUpperCase());
      setSearchInput('');
    }
  };

  const selectStockForHistory = (sym) => {
    fetchHistory(sym);
    setActiveTab('history');
  };

  // Filtered Upcoming
  const filteredUpcoming = upcomingList.filter(item => {
    if (!upcomingSearch.trim()) return true;
    const q = upcomingSearch.toLowerCase();
    return (item.symbol || '').toLowerCase().includes(q) || 
           (item.company || '').toLowerCase().includes(q) ||
           (item.purpose || '').toLowerCase().includes(q);
  });

  // Filtered Declared
  const filteredDeclared = declaredList.filter(item => {
    if (!declaredSearch.trim()) return true;
    const q = declaredSearch.toLowerCase();
    return (item.symbol || '').toLowerCase().includes(q) || 
           (item.company || '').toLowerCase().includes(q) ||
           (item.headline || '').toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6 space-y-6 text-slate-100 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Corporate Results Calendar
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                Official Exchange Data
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Upcoming earnings board meetings, current quarter results filings, and 5-year historical statements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            onClick={() => {
              if (activeTab === 'upcoming') fetchUpcoming(fnoOnly);
              else if (activeTab === 'declared') fetchDeclared(fnoOnly);
              else fetchHistory(historySymbol);
            }}
            disabled={isUpcomingLoading || isDeclaredLoading || isHistoryLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpcomingLoading || isDeclaredLoading || isHistoryLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
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

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Upcoming Results ({upcomingList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('declared')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'declared'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Declared (Current Quarter) ({declaredList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
          <span>5-Year Financial History</span>
        </button>
      </div>

      {/* TAB 1: Upcoming Results */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search upcoming stock or purpose..."
                value={upcomingSearch}
                onChange={(e) => setUpcomingSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Source: Official NSE Event Calendar &amp; Board Meeting Filings
            </span>
          </div>

          {isUpcomingLoading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
              <p className="text-xs font-semibold">Fetching upcoming results schedule from NSE...</p>
            </div>
          ) : filteredUpcoming.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
              <p className="text-sm font-semibold">No upcoming results board meetings found matching criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                    <th className="py-3 px-4">Board Meeting Date</th>
                    <th className="py-3 px-4">Symbol</th>
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Purpose / Agenda</th>
                    <th className="py-3 px-4 text-right">LTP (₹)</th>
                    <th className="py-3 px-4 text-right">1D %</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredUpcoming.map((item, idx) => {
                    const isUp = (item.change_1d || 0) >= 0;
                    return (
                      <tr key={`${item.symbol}_${idx}`} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-indigo-300 whitespace-nowrap">
                          {item.date}
                        </td>
                        <td 
                          onClick={() => onSelectStock && onSelectStock(item.symbol)}
                          className="py-2.5 px-4 font-bold text-white flex items-center gap-1.5 cursor-pointer hover:text-indigo-300"
                        >
                          <span>{item.symbol}</span>
                          {item.is_fno === 1 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              F&amp;O
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 font-sans truncate max-w-[200px]">
                          {item.company}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 font-sans max-w-[280px] truncate" title={item.description}>
                          {item.purpose || item.description}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-100">
                          {item.current_price ? `₹${item.current_price.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.change_1d !== null && item.change_1d !== undefined ? `${isUp ? '+' : ''}${item.change_1d.toFixed(2)}%` : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => selectStockForHistory(item.symbol)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              5Y History
                            </button>
                            <button
                              onClick={() => onSelectStock && onSelectStock(item.symbol)}
                              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Chart
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Declared Results (Current Quarter) */}
      {activeTab === 'declared' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search declared results..."
                value={declaredSearch}
                onChange={(e) => setDeclaredSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Official Corporate Filings submitted to BSE / NSE with direct PDF Links
            </span>
          </div>

          {isDeclaredLoading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
              <p className="text-xs font-semibold">Fetching declared results filings from official exchange...</p>
            </div>
          ) : filteredDeclared.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
              <p className="text-sm font-semibold">No declared results filings found in current quarter matching criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                    <th className="py-3 px-4">Declaration Date</th>
                    <th className="py-3 px-4">Symbol</th>
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Headline / Results Filing</th>
                    <th className="py-3 px-4 text-center">Filing PDF</th>
                    <th className="py-3 px-4 text-right">LTP (₹)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredDeclared.map((item, idx) => (
                    <tr key={`${item.scrip_code}_${idx}`} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-300 whitespace-nowrap">
                        {item.date}
                      </td>
                      <td 
                        onClick={() => onSelectStock && onSelectStock(item.symbol)}
                        className="py-2.5 px-4 font-bold text-white flex items-center gap-1.5 cursor-pointer hover:text-indigo-300"
                      >
                        <span>{item.symbol}</span>
                        {item.is_fno === 1 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            F&amp;O
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 font-sans truncate max-w-[200px]">
                        {item.company}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-sans max-w-[320px] truncate" title={item.headline}>
                        {item.headline}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {item.pdf_url ? (
                          <a
                            href={item.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 transition-colors font-sans text-[11px]"
                          >
                            <FileText className="w-3 h-3 text-rose-400" />
                            <span>PDF</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-100">
                        {item.current_price ? `₹${item.current_price.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => selectStockForHistory(item.symbol)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            5Y History
                          </button>
                          <button
                            onClick={() => onSelectStock && onSelectStock(item.symbol)}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Chart
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 5-Year Financial History */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Stock Search & Quick Picks */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <form onSubmit={handleSearchHistory} className="relative w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter symbol (e.g. RELIANCE, TCS, INFY)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-16 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono uppercase"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-md transition-colors"
                >
                  Lookup
                </button>
              </form>

              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-[11px] text-slate-400 font-bold mr-1">Quick Picks:</span>
                {QUICK_STOCKS.map(sym => (
                  <button
                    key={sym}
                    onClick={() => fetchHistory(sym)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      historySymbol === sym
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isHistoryLoading ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
              <p className="text-xs font-semibold">Loading 5-year financial history for {historySymbol}...</p>
            </div>
          ) : stockHistory ? (
            <div className="space-y-6">
              {/* Company Summary Banner */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-black text-white font-mono">{stockHistory.symbol}</h2>
                    {stockHistory.is_fno === 1 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        F&amp;O ELIGIBLE
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                      {stockHistory.sector}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 font-sans font-semibold">
                    {stockHistory.name}
                  </p>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {stockHistory.current_price && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">LTP</span>
                      <span className="text-lg font-black font-mono text-white">
                        ₹{stockHistory.current_price.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {stockHistory.market_cap_cr && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Market Cap</span>
                      <span className="text-sm font-bold font-mono text-slate-200">
                        ₹{stockHistory.market_cap_cr.toLocaleString('en-IN')} Cr
                      </span>
                    </div>
                  )}

                  {stockHistory.pe_ratio && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">P/E</span>
                      <span className="text-sm font-bold font-mono text-indigo-300">
                        {stockHistory.pe_ratio}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => onSelectStock && onSelectStock(stockHistory.symbol)}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Open Real-Time Chart</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Annual Financials: Last 5 Years */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-400" />
                    <span>Annual Financial Statement (Last 5 Years)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">Figures in ₹ Crores</span>
                </div>

                {(!stockHistory.annual_financials || stockHistory.annual_financials.length === 0) ? (
                  <p className="text-xs text-slate-400 py-4">No annual statements available for this contract.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                          <th className="py-2.5 px-3">Fiscal Year</th>
                          <th className="py-2.5 px-3">Reported Date</th>
                          <th className="py-2.5 px-3 text-right">Total Revenue (₹ Cr)</th>
                          <th className="py-2.5 px-3 text-right">YoY Rev Growth</th>
                          <th className="py-2.5 px-3 text-right">Net Profit / PAT (₹ Cr)</th>
                          <th className="py-2.5 px-3 text-right">YoY Profit Growth</th>
                          <th className="py-2.5 px-3 text-right">Net Margin %</th>
                          <th className="py-2.5 px-3 text-right">Basic EPS (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {stockHistory.annual_financials.map((row) => {
                          const isRevGrowthUp = (row.rev_growth_pct || 0) >= 0;
                          const isProfitGrowthUp = (row.profit_growth_pct || 0) >= 0;
                          return (
                            <tr key={row.period} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-2 px-3 font-bold text-indigo-300">{row.period}</td>
                              <td className="py-2 px-3 text-slate-400">{row.date}</td>
                              <td className="py-2 px-3 text-right font-bold text-white">₹{row.revenue_cr?.toLocaleString('en-IN')}</td>
                              <td className={`py-2 px-3 text-right font-semibold ${isRevGrowthUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {row.rev_growth_pct ? `${isRevGrowthUp ? '+' : ''}${row.rev_growth_pct}%` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-emerald-400">₹{row.net_profit_cr?.toLocaleString('en-IN')}</td>
                              <td className={`py-2 px-3 text-right font-semibold ${isProfitGrowthUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {row.profit_growth_pct ? `${isProfitGrowthUp ? '+' : ''}${row.profit_growth_pct}%` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right text-teal-300 font-bold">{row.margin_pct}%</td>
                              <td className="py-2 px-3 text-right font-bold text-white">₹{row.eps?.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Quarterly Financials: Last 8 Quarters */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Quarterly Financial Performance (Last 8 Quarters)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">Figures in ₹ Crores</span>
                </div>

                {(!stockHistory.quarterly_financials || stockHistory.quarterly_financials.length === 0) ? (
                  <p className="text-xs text-slate-400 py-4">No quarterly statements available for this contract.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                          <th className="py-2.5 px-3">Quarter</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-right">Revenue (₹ Cr)</th>
                          <th className="py-2.5 px-3 text-right">Net Profit / PAT (₹ Cr)</th>
                          <th className="py-2.5 px-3 text-right">Net Margin %</th>
                          <th className="py-2.5 px-3 text-right">Basic EPS (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {stockHistory.quarterly_financials.map((row) => (
                          <tr key={`${row.period}_${row.date}`} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-3 font-bold text-emerald-400">{row.period}</td>
                            <td className="py-2 px-3 text-slate-400">{row.date}</td>
                            <td className="py-2 px-3 text-right font-bold text-white">₹{row.revenue_cr?.toLocaleString('en-IN')}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-400">₹{row.net_profit_cr?.toLocaleString('en-IN')}</td>
                            <td className="py-2 px-3 text-right text-teal-300 font-bold">{row.margin_pct}%</td>
                            <td className="py-2 px-3 text-right font-bold text-white">₹{row.eps?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
              <p className="text-sm">Enter a stock symbol above to view 5-year financial results history.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
