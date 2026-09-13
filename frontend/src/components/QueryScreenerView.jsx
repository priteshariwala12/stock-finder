import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Terminal, BookOpen, Layers, Check, X, Search, 
  Download, RefreshCw, Star, Sparkles, AlertCircle, 
  ChevronRight, ArrowUpDown, HelpCircle, ExternalLink
} from 'lucide-react';

const PRESET_QUERIES = [
  {
    name: "Low PE & High ROCE",
    description: "Classic value investing formula used by Peter Lynch & Warren Buffett",
    query: "Market capitalization > 500 AND\nPrice to earning < 15 AND\nReturn on capital employed > 22%"
  },
  {
    name: "Golden Cross & Momentum",
    description: "50 DMA above 200 DMA with strong delivery volume",
    query: "Current price > 50 DMA AND\n50 DMA > 200 DMA AND\nDelivery percentage > 35%"
  },
  {
    name: "Oversold High Potential",
    description: "RSI under 40 with solid ROE and clean balance sheet",
    query: "RSI < 40 AND\nReturn on equity > 15% AND\nDebt to equity < 0.6"
  },
  {
    name: "High Growth Multibaggers",
    description: "Double-digit sales and profit growth at reasonable price",
    query: "Sales growth > 18% AND\nProfit growth > 20% AND\nReturn on capital employed > 15%"
  },
  {
    name: "Volume Shockers & F&O",
    description: "Institutional volume breakout in liquid derivative stocks",
    query: "Volume multiple > 2.0 AND\nF&O == 1 AND\n1D change > 1.5%"
  },
  {
    name: "Near 52W High Breakout",
    description: "Strong momentum stocks trading within 3% of 52-week peak",
    query: "Distance from 52w high < 3.0 AND\nRSI > 55 AND\nCurrent price > 20 EMA"
  },
  {
    name: "Low Debt & High Dividend",
    description: "Cash-rich dividend aristocrats with minimal debt",
    query: "Debt to equity < 0.2 AND\nDividend yield > 2.5% AND\nReturn on equity > 12%"
  }
];

export default function QueryScreenerView({ 
  onSelectStock, 
  watchlist = [], 
  onToggleWatchlist,
  currentTheme 
}) {
  const [queryText, setQueryText] = useState(
    "Market capitalization > 500 AND\nPrice to earning < 15 AND\nReturn on capital employed > 20%"
  );
  const [stocks, setStocks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('potential_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [parsedClauses, setParsedClauses] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Ratios Catalog
  const [ratiosCatalog, setRatiosCatalog] = useState([]);
  const [showRatiosDrawer, setShowRatiosDrawer] = useState(false);
  const [ratioSearch, setRatioSearch] = useState('');
  const [selectedRatioCategory, setSelectedRatioCategory] = useState('All');

  // Autocomplete State
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);
  const textareaRef = useRef(null);

  // Load ratio catalog on mount
  useEffect(() => {
    fetch('/api/query/ratios')
      .then(r => r.json())
      .then(data => {
        if (data?.ratios) {
          setRatiosCatalog(data.ratios);
        }
      })
      .catch(err => console.error("Error fetching ratios catalog:", err));
  }, []);

  // Run initial query on mount
  useEffect(() => {
    runQuery(queryText, 1, sortBy, sortOrder);
  }, []);

  const runQuery = async (queryToRun, targetPage = 1, targetSort = sortBy, targetDir = sortOrder) => {
    const q = (queryToRun !== undefined ? queryToRun : queryText).trim();
    if (!q) {
      setError("Please enter at least one query condition.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/query/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          page: targetPage,
          page_size: pageSize,
          sort_by: targetSort,
          sort_order: targetDir
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to execute query.");
        setStocks([]);
        setTotal(0);
        setTotalPages(1);
        setParsedClauses(data.parsed_clauses || []);
      } else {
        setStocks(data.stocks || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setTotalPages(data.total_pages || 1);
        setParsedClauses(data.parsed_clauses || []);
        setError(null);
      }
    } catch (err) {
      setError("Network or server error while running query: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (col) => {
    const newDir = sortBy === col && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(col);
    setSortOrder(newDir);
    runQuery(queryText, 1, col, newDir);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      runQuery(queryText, newPage, sortBy, sortOrder);
    }
  };

  const handleExportCsv = async () => {
    if (!queryText.trim()) return;
    setIsExporting(true);
    try {
      const res = await fetch('/api/query/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.detail || "Export failed.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screener_query_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error exporting CSV: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Autocomplete Handlers
  const handleTextareaChange = (e) => {
    const val = e.target.value;
    setQueryText(val);

    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const match = textBefore.match(/([a-zA-Z0-9_\-&/]+)$/);

    if (match && match[1].length >= 1) {
      const word = match[1].toLowerCase();
      const matches = ratiosCatalog.filter(r => {
        if (r.name.toLowerCase().includes(word)) return true;
        if (r.column.toLowerCase().includes(word)) return true;
        return r.aliases.some(a => a.toLowerCase().includes(word));
      }).slice(0, 8);

      if (matches.length > 0) {
        setSuggestions(matches);
        setShowSuggestions(true);
        setActiveSuggestionIdx(0);
        return;
      }
    }
    setShowSuggestions(false);
  };

  const insertSuggestion = (ratio) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBefore = queryText.slice(0, cursorPos);
    const textAfter = queryText.slice(cursorPos);
    const match = textBefore.match(/([a-zA-Z0-9_\-&/]+)$/);

    let newText = '';
    let newCursor = cursorPos;

    if (match) {
      const prefix = textBefore.slice(0, match.index);
      newText = prefix + ratio.name + " " + textAfter;
      newCursor = prefix.length + ratio.name.length + 1;
    } else {
      newText = textBefore + ratio.name + " " + textAfter;
      newCursor = cursorPos + ratio.name.length + 1;
    }

    setQueryText(newText);
    setShowSuggestions(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  };

  const insertRatioFromDrawer = (ratio) => {
    const trimmed = queryText.trim();
    let newQuery = '';
    if (!trimmed) {
      newQuery = `${ratio.name} > `;
    } else {
      newQuery = `${trimmed} AND\n${ratio.name} > `;
    }
    setQueryText(newQuery);
    setShowRatiosDrawer(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newQuery.length, newQuery.length);
      }
    }, 50);
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIdx(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIdx(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertSuggestion(suggestions[activeSuggestionIdx]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runQuery(queryText, 1);
    }
  };

  // Categories list for Show All Ratios Drawer
  const categories = ['All', ...new Set(ratiosCatalog.map(r => r.category))];
  const filteredCatalog = ratiosCatalog.filter(r => {
    const matchesCat = selectedRatioCategory === 'All' || r.category === selectedRatioCategory;
    const matchesSearch = !ratioSearch || 
      r.name.toLowerCase().includes(ratioSearch.toLowerCase()) ||
      r.description.toLowerCase().includes(ratioSearch.toLowerCase()) ||
      r.aliases.some(a => a.toLowerCase().includes(ratioSearch.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-y-auto">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Query Screener
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              Create a Search Query
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Query across 3,376+ NSE & BSE stocks using fundamental, technical, and F&O metrics just like Screener.in
          </p>
        </div>

        {/* Action button & ratio catalog trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRatiosDrawer(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>SHOW ALL RATIOS ({ratiosCatalog.length})</span>
          </button>

          {total > 0 && (
            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Query & Example Workspace */}
      <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Query Box (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>Query</span>
                <span className="text-[11px] font-normal text-slate-500">(Press Ctrl + Enter to run)</span>
              </label>

              <button
                onClick={() => setQueryText('')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Clear query
              </button>
            </div>

            {/* Textarea container with relative autocomplete */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={queryText}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Market capitalization > 500 AND&#10;Price to earning < 15 AND&#10;Return on capital employed > 22%"
                rows={6}
                className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-emerald-400 font-mono text-sm leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-y"
              />

              {/* Autocomplete Popup Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-2 top-full mt-1 z-30 w-80 max-w-[90vw] bg-slate-900 border border-emerald-500/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-between">
                    <span>Suggested Ratios ({suggestions.length})</span>
                    <span className="text-slate-500">↑↓ keys & Enter</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60">
                    {suggestions.map((r, idx) => (
                      <button
                        key={r.column}
                        onClick={() => insertSuggestion(r)}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                          idx === activeSuggestionIdx 
                            ? 'bg-emerald-950/60 text-white' 
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold font-mono text-emerald-300">
                            {r.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            {r.description}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {r.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Row */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRatiosDrawer(true)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>SHOW ALL RATIOS</span>
                </button>
              </div>

              <button
                onClick={() => runQuery(queryText, 1)}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>RUNNING QUERY...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>RUN THIS QUERY</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">Query Error</div>
                  <div className="mt-0.5">{error}</div>
                  <div className="mt-1 text-[11px] text-rose-400/80">
                    Tip: Click "SHOW ALL RATIOS" to view available formula fields or click one of the examples on the right.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Screener.in Style Custom Query Example Box (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <BookOpen className="w-4 h-4" />
              <h3 className="text-sm font-bold text-slate-200">Custom Query Rules & Examples</h3>
            </div>

            <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <p>
                You can filter stocks on any fundamental, technical, or derivative ratio using standard operators:
              </p>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                <div>&bull; Operators: <span className="text-emerald-400 font-bold">&gt;, &gt;=, &lt;, &lt;=, =, !=</span></div>
                <div>&bull; Connectors: <span className="text-emerald-400 font-bold">AND</span> or newlines</div>
                <div>&bull; Column vs Column: <span className="text-emerald-400">Current price &gt; 50 DMA</span></div>
              </div>
            </div>

            {/* 1-Click Example Formulas */}
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                1-Click Preset Queries:
              </div>
              <div className="space-y-2">
                {PRESET_QUERIES.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQueryText(preset.query);
                      runQuery(preset.query, 1);
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-800 hover:border-emerald-500/50 bg-slate-950/60 hover:bg-slate-950 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                        {preset.name}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Results Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Query Results</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                    {total.toLocaleString('en-IN')} stocks
                  </span>
                </h2>
                {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
              </div>

              {/* Parsed clauses pills */}
              {parsedClauses.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-500">Applied filters:</span>
                  {parsedClauses.map((clause, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 border border-slate-700 text-slate-300"
                    >
                      {clause}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Items per page selector */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const sz = Number(e.target.value);
                  setPageSize(sz);
                  setPage(1);
                  runQuery(queryText, 1, sortBy, sortOrder);
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider select-none">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th 
                    onClick={() => handleSort('symbol')}
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Stock / Symbol</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('current_price')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>CMP (₹)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('change_1d')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>1D %</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('potential_score')}
                    className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Potential</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('market_cap_cr')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>MCap (₹ Cr)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('pe_ratio')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>P/E</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('roce')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>ROCE %</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('rsi_14')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>RSI (14)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('volume_multiple')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Vol Mult</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">F&O</th>
                  <th className="py-3 px-3 text-center">Watch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-sans">
                {stocks.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-500">
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                          <span>Executing query across stocks universe...</span>
                        </div>
                      ) : error ? (
                        <span>Please fix query error above</span>
                      ) : (
                        <span>No stocks match your query conditions. Try relaxing the filters.</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  stocks.map((stk, idx) => {
                    const rank = (page - 1) * pageSize + idx + 1;
                    const isPositive = (stk.change_1d || 0) >= 0;
                    const inWatchlist = watchlist.includes(stk.symbol);

                    return (
                      <tr 
                        key={stk.symbol}
                        className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                        onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                      >
                        <td className="py-3 px-3 text-center text-slate-500 font-mono text-[11px]">
                          {rank}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                              {stk.symbol}
                            </span>
                            {stk.is_breakout_3pct === 1 && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                3% BREAK
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {stk.name}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-100">
                          ₹{Number(stk.current_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? '+' : ''}{Number(stk.change_1d || 0).toFixed(2)}%
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${
                            (stk.potential_score || 0) >= 7.5
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                              : (stk.potential_score || 0) >= 5.0
                              ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {Number(stk.potential_score || 0).toFixed(1)}/10
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          ₹{Math.round(stk.market_cap_cr || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          {stk.pe_ratio != null ? Number(stk.pe_ratio).toFixed(1) : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          {stk.roce != null ? `${Number(stk.roce).toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          {stk.rsi_14 != null ? Number(stk.rsi_14).toFixed(1) : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          {stk.volume_multiple != null ? `${Number(stk.volume_multiple).toFixed(1)}x` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {stk.is_fno === 1 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/40">
                              F&O
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onToggleWatchlist && onToggleWatchlist(stk.symbol)}
                            className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-amber-400 transition-colors"
                            title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            <Star className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60 text-xs">
              <div className="text-slate-400">
                Showing <span className="font-semibold text-white">{(page - 1) * pageSize + 1}</span> to{' '}
                <span className="font-semibold text-white">{Math.min(page * pageSize, total)}</span> of{' '}
                <span className="font-semibold text-white">{total.toLocaleString('en-IN')}</span> stocks
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-slate-400 font-mono">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SHOW ALL RATIOS Modal / Drawer */}
      {showRatiosDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  All Available Screener Ratios & Metrics ({ratiosCatalog.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click "+ Insert" on any ratio to insert it into your custom query box
                </p>
              </div>
              <button
                onClick={() => setShowRatiosDrawer(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Category Tabs */}
            <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/30">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ratio by name, abbreviation (PE, ROCE, RSI, IV)..."
                  value={ratioSearch}
                  onChange={(e) => setRatioSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedRatioCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedRatioCategory === cat
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Ratios Grid List */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCatalog.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-slate-500 text-sm">
                  No ratios found matching "{ratioSearch}".
                </div>
              ) : (
                filteredCatalog.map(ratio => (
                  <div
                    key={ratio.column}
                    className="p-3.5 rounded-xl border border-slate-800 hover:border-emerald-500/50 bg-slate-950/60 hover:bg-slate-950 flex items-start justify-between gap-3 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-200 group-hover:text-emerald-300 transition-colors">
                          {ratio.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {ratio.unit}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {ratio.description}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono truncate">
                        Aliases: {ratio.aliases.join(', ')}
                      </div>
                    </div>

                    <button
                      onClick={() => insertRatioFromDrawer(ratio)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-bold shrink-0 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>+ Insert</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
              <span>Showing {filteredCatalog.length} of {ratiosCatalog.length} ratios</span>
              <button
                onClick={() => setShowRatiosDrawer(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
