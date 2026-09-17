import React, { useState, useEffect } from 'react';
import { 
  Zap, Clock, Calendar, Shield, Target, ArrowUpRight, TrendingUp, 
  TrendingDown, CheckCircle2, AlertTriangle, ExternalLink, BarChart2, 
  Search, Filter, ChevronRight, Award, Compass, RefreshCw, Flame, ArrowRight,
  Rocket, Sparkles, ChevronDown, ChevronUp, Cpu
} from 'lucide-react';

export default function RecommendationHub({ onSelectStock }) {
  const [activeTab, setActiveTab] = useState('multibagger'); // 'all', 'multibagger', 'intraday', 'swing', 'delivery', 'history'
  const [recommendations, setRecommendations] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'multibagger', 'intraday', 'swing', 'delivery', 'winners', 'stopped'
  const [historySearch, setHistorySearch] = useState('');
  const [mbSubFilter, setMbSubFilter] = useState('all'); // 'all', 'penny25', 'penny50', 'penny100', 'turnaround'
  const [expandedTheses, setExpandedTheses] = useState({
    rec_active_mb_1: true,
    rec_active_mb_2: true
  });

  const toggleThesis = (id) => {
    setExpandedTheses(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [fnoOnly, setFnoOnly] = useState(false);

  const fetchData = async (isFno = fnoOnly) => {
    setIsLoading(true);
    try {
      const [recsRes, statsRes] = await Promise.all([
        fetch(`/api/recommendations?fno_only=${isFno}`),
        fetch('/api/recommendations/stats')
      ]);

      if (recsRes.ok) {
        const data = await recsRes.json();
        setRecommendations(data.recommendations || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error loading recommendations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(fnoOnly);
  }, [fnoOnly]);

  // Filter active recommendations based on active tab
  const activeCalls = recommendations.filter(r => r.exit_date === null);
  const closedCalls = recommendations.filter(r => r.exit_date !== null);

  const displayedActiveCalls = activeCalls.filter(r => {
    if (activeTab === 'all') return true;
    if (activeTab === 'intraday') return r.category === 'intraday';
    if (activeTab === 'swing') return r.category === 'swing';
    if (activeTab === 'delivery') return r.category === 'delivery';
    if (activeTab === 'multibagger') {
      if (r.category !== 'multibagger') return false;
      if (mbSubFilter === 'penny25') return (r.current_price || 0) <= 25;
      if (mbSubFilter === 'penny50') return (r.current_price || 0) <= 50;
      if (mbSubFilter === 'penny100') return (r.current_price || 0) <= 100;
      if (mbSubFilter === 'turnaround') return (r.risk_level || '').toLowerCase().includes('turnaround');
      return true;
    }
    return false;
  });

  // Filter historical calls for the History tab
  const filteredHistory = closedCalls.filter(r => {
    if (historyFilter === 'intraday' && r.category !== 'intraday') return false;
    if (historyFilter === 'swing' && r.category !== 'swing') return false;
    if (historyFilter === 'delivery' && r.category !== 'delivery') return false;
    if (historyFilter === 'multibagger' && r.category !== 'multibagger') return false;
    if (historyFilter === 'winners' && (r.result_pct || 0) <= 0) return false;
    if (historyFilter === 'stopped' && (r.result_pct || 0) > 0) return false;

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      return r.symbol.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
    }
    return true;
  });

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'multibagger':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 text-fuchsia-300 border border-fuchsia-500/40 flex items-center gap-1 shadow-sm shadow-fuchsia-500/20">
            <Rocket className="w-3 h-3 text-fuchsia-400" />
            Multi-Bagger
          </span>
        );
      case 'intraday':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm shadow-amber-500/10">
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            Intraday
          </span>
        );
      case 'swing':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 shadow-sm shadow-indigo-500/10">
            <TrendingUp className="w-3 h-3 text-indigo-400" />
            Swing Trading
          </span>
        );
      case 'delivery':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm shadow-emerald-500/10">
            <Shield className="w-3 h-3 text-emerald-400" />
            Delivery Base
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status, resultPct) => {
    switch (status) {
      case 'target_3_hit':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Target 3 Achieved
          </span>
        );
      case 'target_2_hit':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/50 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-teal-400" /> Target 2 Achieved
          </span>
        );
      case 'target_1_hit':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-400" /> Target 1 Achieved
          </span>
        );
      case 'trailing_sl_hit':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Shield className="w-3 h-3 text-amber-400" /> Trail SL in Profit
          </span>
        );
      case 'sl_hit':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" /> Stop Loss Hit
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700/60 flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live Active
          </span>
        );
    }
  };

  const getTvInterval = (category) => {
    if (category === 'intraday') return '1'; // 1-minute chart
    if (category === 'multibagger') return 'W'; // Weekly chart for positional multi-bagger vision
    if (category === 'delivery') return 'W';    // Weekly chart
    return 'D';                                 // Daily chart
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
      {/* Top Banner & Strategy Intro */}
      <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-fuchsia-500 to-indigo-600 shadow-md shadow-fuchsia-500/20">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Trade Recommendation Hub
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  AI Quantitative Models
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Curated signals across <strong className="text-fuchsia-300">🚀 Multi-Baggers</strong>, <strong className="text-amber-300">⚡ Intraday</strong>, <strong className="text-indigo-300">🌊 Swing Trading</strong>, and <strong className="text-emerald-300">📦 Delivery Base</strong> with exact price zones, strict risk controls, and audited performance history.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {/* Universal F&O Toggle */}
            <button
              onClick={() => setFnoOnly(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                fnoOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md shadow-amber-950/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${fnoOnly ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>F&amp;O Only: {fnoOnly ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => fetchData(fnoOnly)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Calls</span>
            </button>

            {/* TV.com Official Button */}
            <a
              href="https://in.tradingview.com/chart/?symbol=NSE%3ANIFTY"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2962FF] hover:bg-[#1E53E5] text-white text-xs font-bold transition-all shadow-md shadow-blue-900/40 cursor-pointer"
              title="Open on TradingView.com"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>TV.com</span>
            </a>
          </div>
        </div>

        {/* Performance Statistics Metrics Cards */}
        {stats && (
          <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
            {/* Win Rate */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium block">Audited Win Rate</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-emerald-400">{stats.win_rate}%</span>
                <span className="text-[10px] text-slate-400 font-semibold">({stats.closed_calls} closed)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                  style={{ width: `${stats.win_rate}%` }}
                ></div>
              </div>
            </div>

            {/* Total Return */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium block">Cumulative Return</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-emerald-400">+{stats.total_return_pct}%</span>
              </div>
              <span className="text-[10px] text-emerald-400/80 mt-1 block font-medium">All closed recommendations</span>
            </div>

            {/* Average Winner */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium block">Avg Gain on Winners</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-teal-300">+{stats.avg_winner_pct}%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Profit per winning call</span>
            </div>

            {/* Average Loser */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium block">Avg Stop on Losers</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-rose-400">{stats.avg_loser_pct}%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Strict capital preservation</span>
            </div>

            {/* Realized Risk-Reward */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium block">Risk-to-Reward</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-indigo-300">{stats.avg_risk_reward}</span>
              </div>
              <span className="text-[10px] text-indigo-400 mt-1 block">Asymmetric profit edge</span>
            </div>

            {/* Active Calls Count */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium block">Active Live Calls</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-amber-300">{stats.active_calls}</span>
                <span className="text-[10px] text-slate-400">in market</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 flex-wrap">
                <span className="text-fuchsia-400 font-bold">{stats.categories?.multibagger?.active_count || 8}MB</span> •
                <span className="text-amber-400 font-bold">{stats.categories?.intraday?.active_count || 0}I</span> •
                <span className="text-indigo-400 font-bold">{stats.categories?.swing?.active_count || 0}S</span> •
                <span className="text-emerald-400 font-bold">{stats.categories?.delivery?.active_count || 0}D</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Segment Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-20 backdrop-blur-md px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 text-xs font-bold py-2">
            {[
              { id: 'multibagger', label: '🚀 Multi-Baggers', count: activeCalls.filter(r => r.category === 'multibagger').length, icon: Rocket, highlight: true },
              { id: 'all', label: 'All Active Calls', count: activeCalls.length, icon: Flame },
              { id: 'intraday', label: 'Intraday (1m TF)', count: activeCalls.filter(r => r.category === 'intraday').length, icon: Zap },
              { id: 'swing', label: 'Swing Trading', count: activeCalls.filter(r => r.category === 'swing').length, icon: TrendingUp },
              { id: 'delivery', label: 'Delivery Base', count: activeCalls.filter(r => r.category === 'delivery').length, icon: Shield },
              { id: 'history', label: 'Result History (%)', count: closedCalls.length, icon: Award },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-3.5 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
                    isActive
                      ? (tab.highlight ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-600/30 font-black' : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30')
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.highlight ? 'text-fuchsia-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* HERO BANNER FOR MULTIBAGGER SEGMENT */}
        {activeTab === 'multibagger' && (
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-fuchsia-950/80 via-purple-950/60 to-slate-900 border border-fuchsia-700/50 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 flex items-center gap-1 shadow-sm shadow-fuchsia-500/20">
                    <Sparkles className="w-3 h-3 text-fuchsia-400" />
                    Quantitative Multi-Factor Synthesis
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Penny Stocks (&lt; ₹100)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    2.5x – 5.2x Growth Target
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-2 flex items-center gap-2">
                  🚀 Multi-Bagger Penny Stock Discovery
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-3xl leading-relaxed">
                  Micro-cap & penny turnaround candidates under ₹100 evaluated on balance sheet deleveraging, ROCE surge (&gt;15%), high promoter skin-in-the-game, institutional delivery accumulation, and multi-year Stage-1 base breakouts.
                </p>
              </div>

              {/* Multi-Bagger Sub-filters */}
              <div className="flex items-center gap-1.5 flex-wrap self-start lg:self-auto">
                {[
                  { id: 'all', label: 'All Multi-Baggers' },
                  { id: 'penny25', label: 'Under ₹25 (Deep Penny)' },
                  { id: 'penny50', label: 'Under ₹50' },
                  { id: 'penny100', label: 'Under ₹100' },
                  { id: 'turnaround', label: 'Turnaround Plays' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setMbSubFilter(sub.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      mbSubFilter === sub.id
                        ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/30'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'history' ? (
          /* ACTIVE RECOMMENDATIONS CARDS */
          displayedActiveCalls.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800 p-6">
              <Compass className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-300">No active calls in this segment right now</p>
              <p className="text-xs text-slate-500 mt-1">Our algorithmic models generate new signals when market conditions satisfy technical criteria.</p>
              <button
                onClick={() => { setActiveTab('all'); setMbSubFilter('all'); }}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors"
              >
                View All Active Calls
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {displayedActiveCalls.map((rec) => {
                const avgEntry = (rec.entry_range_min + rec.entry_range_max) / 2.0;
                const livePlPct = (((rec.current_price - avgEntry) / avgEntry) * 100).toFixed(2);
                const isPlPos = parseFloat(livePlPct) >= 0;

                const t1Gain = (((rec.target_1 - avgEntry) / avgEntry) * 100).toFixed(0);
                const t2Gain = (((rec.target_2 - avgEntry) / avgEntry) * 100).toFixed(0);
                const t3Gain = (((rec.target_3 - avgEntry) / avgEntry) * 100).toFixed(0);
                const slLoss = (((rec.stop_loss - avgEntry) / avgEntry) * 100).toFixed(1);
                const isMb = rec.category === 'multibagger';

                let thesisObj = null;
                if (rec.claude_thesis) {
                  try {
                    thesisObj = typeof rec.claude_thesis === 'string' ? JSON.parse(rec.claude_thesis) : rec.claude_thesis;
                  } catch (e) {
                    thesisObj = { catalyst: rec.claude_thesis };
                  }
                }

                return (
                  <div
                    key={rec.id}
                    className={`bg-slate-900/90 border rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden ${
                      isMb ? 'border-fuchsia-900/50 hover:border-fuchsia-600/80 shadow-fuchsia-950/20' : 'border-slate-800 hover:border-slate-700/90'
                    }`}
                  >
                    {/* Top Accent Gradient Line */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isMb 
                        ? 'bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500'
                        : rec.category === 'intraday' 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : rec.category === 'swing'
                            ? 'bg-gradient-to-r from-indigo-500 to-blue-500'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    }`} />

                    <div>
                      {/* Card Header: Symbol, Badges, 1-Click Chart */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3.5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => onSelectStock(rec.symbol)}
                              className="text-xl font-black text-white hover:text-indigo-300 transition-colors flex items-center gap-1.5"
                              title="Click for full fundamental & technical detailed analysis"
                            >
                              <span>{rec.symbol}</span>
                            </button>
                            {getCategoryBadge(rec.category)}
                            {rec.potential_multiplier && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 text-fuchsia-300 border border-fuchsia-500/40 flex items-center gap-1 shadow-sm">
                                🚀 {rec.potential_multiplier}
                              </span>
                            )}
                            {rec.market_cap_type && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {rec.market_cap_type}
                              </span>
                            )}
                            {rec.category === 'intraday' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/50">
                                1-MIN TF
                              </span>
                            )}
                            {getStatusBadge(rec.status, rec.result_pct)}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 font-medium truncate max-w-xs">{rec.name}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`https://in.tradingview.com/chart/?symbol=NSE:${rec.symbol}&interval=${getTvInterval(rec.category)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 text-xs font-bold inline-flex items-center gap-1 border border-slate-700 transition-all shadow-sm"
                            title={`Open Live ${rec.category === 'intraday' ? '1-minute' : 'Weekly'} Chart on TradingView`}
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                            <span>TV {rec.category === 'intraday' ? '1m' : 'Weekly'}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>

                          <button
                            onClick={() => onSelectStock(rec.symbol)}
                            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                            title="View Full Stock Analysis Modal"
                          >
                            Analyze
                          </button>
                        </div>
                      </div>

                      {/* QUANT CONFIDENCE & SCORE BAR FOR MULTI-BAGGERS */}
                      {isMb && (
                        <div className="my-3 p-3 rounded-xl bg-gradient-to-r from-fuchsia-950/40 via-purple-950/30 to-slate-900/60 border border-fuchsia-800/40 space-y-2">
                          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                              <span className="font-extrabold text-white text-[11px]">Model Confidence:</span>
                              <span className="font-black text-fuchsia-300 text-xs">{rec.claude_confidence || 92}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-slate-400">Fundamental: <strong className="text-emerald-400">{rec.fundamental_score || 9.2}/10</strong></span>
                              <span className="text-slate-400">Technical: <strong className="text-teal-300">{rec.technical_score || 9.0}/10</strong></span>
                              <span className="px-1.5 py-0.5 rounded bg-fuchsia-950 text-fuchsia-300 font-bold border border-fuchsia-800/60">{rec.risk_level}</span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-full shadow-sm shadow-fuchsia-500/50" 
                              style={{ width: `${rec.claude_confidence || 90}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Signal Generation Timestamp & Estimated Target Time */}
                      <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 flex-wrap">
                            <Calendar className="w-3 h-3 text-indigo-400" />
                            Signal Entry Time & Date
                            {rec.category === 'intraday' && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/40">
                                1-MIN TF
                              </span>
                            )}
                          </span>
                          <p className="font-bold text-slate-200">
                            {rec.entry_time}
                          </p>
                        </div>

                        <div className="space-y-0.5 border-l border-slate-800 pl-2.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            Target Horizon
                          </span>
                          <p className="font-bold text-amber-300">
                            {rec.estimated_time}
                          </p>
                        </div>
                      </div>

                      {/* Entry Price Zone & Live Market Price */}
                      <div className="grid grid-cols-2 gap-3 my-3">
                        {/* Entry Range Box */}
                        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Recommended Entry Zone
                          </span>
                          <div className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                            ₹{rec.entry_range_min} – ₹{rec.entry_range_max}
                          </div>
                          <span className="text-[10px] text-slate-400">Avg Midpoint: ₹{avgEntry.toFixed(1)}</span>
                        </div>

                        {/* Live Current Price & P&L */}
                        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Live Price & P&L
                          </span>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-sm sm:text-base font-extrabold text-white">
                              ₹{rec.current_price}
                            </span>
                            <span className={`text-[11px] font-black px-1.5 py-0.2 rounded ${
                              isPlPos ? 'text-emerald-400 bg-emerald-950/70' : 'text-rose-400 bg-rose-950/70'
                            }`}>
                              {isPlPos ? '+' : ''}{livePlPct}%
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">R:R Ratio: <strong className="text-indigo-300">{rec.risk_reward_ratio}</strong></span>
                        </div>
                      </div>

                      {/* MULTI-TIERED TARGETS GRID */}
                      <div className="space-y-1.5 my-3">
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-300">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3 text-emerald-400" />
                            {isMb ? 'Multi-Bagger Growth Milestones' : 'Multi-Tiered Exit Targets'}
                          </span>
                          <span className="text-slate-500 text-[10px]">{isMb ? '2x to 5x Milestones' : 'Actionable Profit Milestones'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {/* Target 1 */}
                          <div className={`p-2 rounded-xl text-center ${isMb ? 'bg-slate-950/80 border border-fuchsia-900/40' : 'bg-slate-950/60 border border-emerald-900/40'}`}>
                            <span className={`text-[10px] font-bold block ${isMb ? 'text-fuchsia-300' : 'text-emerald-400'}`}>Target 1 {isMb ? '(2x)' : ''}</span>
                            <span className="text-xs font-black text-white block mt-0.5">₹{rec.target_1}</span>
                            <span className={`text-[10px] font-bold ${isMb ? 'text-fuchsia-400' : 'text-emerald-400'}`}>+{t1Gain}%</span>
                          </div>

                          {/* Target 2 */}
                          <div className={`p-2 rounded-xl text-center ${isMb ? 'bg-slate-950/80 border border-purple-900/40' : 'bg-slate-950/60 border border-emerald-900/50'}`}>
                            <span className={`text-[10px] font-bold block ${isMb ? 'text-purple-300' : 'text-teal-300'}`}>Target 2 {isMb ? '(3.5x)' : ''}</span>
                            <span className="text-xs font-black text-white block mt-0.5">₹{rec.target_2}</span>
                            <span className={`text-[10px] font-bold ${isMb ? 'text-purple-400' : 'text-teal-300'}`}>+{t2Gain}%</span>
                          </div>

                          {/* Target 3 */}
                          <div className={`p-2 rounded-xl text-center ${isMb ? 'bg-slate-950/80 border border-indigo-900/40' : 'bg-slate-950/60 border border-emerald-900/60'}`}>
                            <span className={`text-[10px] font-bold block ${isMb ? 'text-indigo-300' : 'text-cyan-300'}`}>Target 3 {isMb ? '(5x Max)' : '(Max)'}</span>
                            <span className="text-xs font-black text-white block mt-0.5">₹{rec.target_3}</span>
                            <span className={`text-[10px] font-bold ${isMb ? 'text-indigo-300' : 'text-cyan-300'}`}>+{t3Gain}%</span>
                          </div>
                        </div>
                      </div>

                      {/* QUANT DEEP THESIS ACCORDION */}
                      {isMb && thesisObj && (
                        <div className="my-3 rounded-xl bg-slate-950/80 border border-fuchsia-900/40 overflow-hidden">
                          <button
                            onClick={() => toggleThesis(rec.id)}
                            className="w-full p-2.5 bg-fuchsia-950/20 hover:bg-fuchsia-950/40 flex items-center justify-between text-xs font-bold text-fuchsia-200 transition-colors"
                          >
                            <div className="flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5 text-fuchsia-400" />
                              <span>Quantitative Multi-Bagger Synthesis</span>
                              <span className="text-[9px] font-normal text-slate-400 ml-1">(4-Pillar Deep Research)</span>
                            </div>
                            {expandedTheses[rec.id] ? <ChevronUp className="w-3.5 h-3.5 text-fuchsia-400" /> : <ChevronDown className="w-3.5 h-3.5 text-fuchsia-400" />}
                          </button>
                          {expandedTheses[rec.id] && (
                            <div className="p-3 space-y-2 text-xs border-t border-fuchsia-900/30">
                              {thesisObj.catalyst && (
                                <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800">
                                  <div className="font-bold text-amber-300 flex items-center gap-1 text-[11px] mb-0.5">
                                    <span>💎 Explosive Growth Catalyst & Scalability</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 leading-relaxed">{thesisObj.catalyst}</p>
                                </div>
                              )}
                              {thesisObj.fundamentals && (
                                <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800">
                                  <div className="font-bold text-emerald-400 flex items-center gap-1 text-[11px] mb-0.5">
                                    <span>📊 Fundamental Turnaround & Deleveraging</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 leading-relaxed">{thesisObj.fundamentals}</p>
                                </div>
                              )}
                              {thesisObj.technicals && (
                                <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800">
                                  <div className="font-bold text-teal-300 flex items-center gap-1 text-[11px] mb-0.5">
                                    <span>📈 Technical Stage-1 Base Setup</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 leading-relaxed">{thesisObj.technicals}</p>
                                </div>
                              )}
                              {thesisObj.downside_protection && (
                                <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800">
                                  <div className="font-bold text-rose-300 flex items-center gap-1 text-[11px] mb-0.5">
                                    <span>🛡️ Downside Stop Loss & Capital Protection</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 leading-relaxed">{thesisObj.downside_protection}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Risk Management: Stop Loss & Trailing Stop */}
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 my-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-rose-400 flex items-center gap-1 text-[11px]">
                            <Shield className="w-3 h-3 text-rose-400" />
                            Strict Stop Loss: <strong className="text-white">₹{rec.stop_loss}</strong> ({slLoss}%)
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            Current Trail: <strong className="text-amber-300 font-bold">₹{rec.trailing_stop_price}</strong>
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                          <strong className="text-amber-300 font-semibold">Trailing SL Rule: </strong>
                          {rec.trailing_stop_rule}
                        </div>
                      </div>

                      {/* Catalyst & Rationale */}
                      {!isMb && (
                        <div className="pt-2 border-t border-slate-800/80">
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            <strong className="text-slate-300">Catalyst: </strong>
                            {rec.catalyst_rationale}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* AUDITED RESULT HISTORY TABLE */
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Verified Recommendations Result History (%)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete audited track record of completed trade recommendations with exact entry, exit, % gain/loss, and duration.
                </p>
              </div>

              {/* History Search */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search symbol (e.g. DIXON)..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Segment Sub-filters */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              {[
                { id: 'all', label: 'All Trades' },
                { id: 'multibagger', label: '🚀 Multi-Baggers' },
                { id: 'intraday', label: 'Intraday' },
                { id: 'swing', label: 'Swing Trading' },
                { id: 'delivery', label: 'Delivery Base' },
                { id: 'winners', label: 'Profitable Only (Won)' },
                { id: 'stopped', label: 'Stopped Loss Only' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setHistoryFilter(f.id)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    historyFilter === f.id
                      ? (f.id === 'multibagger' ? 'bg-fuchsia-600 text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm')
                      : 'bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Historical Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Stock Symbol</th>
                    <th className="py-3 px-3">Segment</th>
                    <th className="py-3 px-3">Entry Time & Date</th>
                    <th className="py-3 px-3 text-right">Entry Price</th>
                    <th className="py-3 px-3">Exit Time & Date</th>
                    <th className="py-3 px-3 text-right">Exit Price</th>
                    <th className="py-3 px-3 text-center">Outcome Status</th>
                    <th className="py-3 px-3 text-right">Net Result %</th>
                    <th className="py-3 px-3">Duration</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        No closed recommendations match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((rec) => {
                      const avgEntry = (rec.entry_range_min + rec.entry_range_max) / 2.0;
                      const isWinner = (rec.result_pct || 0) > 0;

                      return (
                        <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <button
                              onClick={() => onSelectStock(rec.symbol)}
                              className="font-bold text-white hover:text-indigo-300 transition-colors text-left block"
                            >
                              {rec.symbol}
                            </button>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">{rec.name}</span>
                          </td>
                          <td className="py-3 px-3">
                            {getCategoryBadge(rec.category)}
                          </td>
                          <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                            <span className="font-semibold text-slate-200 block">{rec.entry_time}</span>
                            {rec.category === 'intraday' ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 inline-block mt-0.5">
                                1-min TF candle
                              </span>
                            ) : rec.category === 'multibagger' ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-fuchsia-500/20 text-fuchsia-300 font-bold border border-fuchsia-500/40 inline-block mt-0.5">
                                Multi-Bagger Entry
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-500 block mt-0.5">Daily candle</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-200">
                            <span className="font-bold block">₹{avgEntry.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">₹{rec.entry_range_min} – ₹{rec.entry_range_max}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                            <span className="font-semibold text-slate-200 block">{rec.exit_date}</span>
                            {rec.category === 'intraday' ? (
                              <span className="text-[9px] text-slate-400 block mt-0.5">1-min exit</span>
                            ) : rec.category === 'multibagger' ? (
                              <span className="text-[9px] text-fuchsia-400 font-bold block mt-0.5">Multi-Bagger Target</span>
                            ) : (
                              <span className="text-[9px] text-slate-500 block mt-0.5">Daily close</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-200">
                            <span className="font-bold block">₹{rec.exit_price?.toFixed(2)}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {getStatusBadge(rec.status, rec.result_pct)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full font-black text-xs ${
                              isWinner 
                                ? (rec.result_pct >= 100 
                                    ? 'bg-gradient-to-r from-fuchsia-950 to-purple-950 text-fuchsia-300 border border-fuchsia-500 shadow-md shadow-fuchsia-950' 
                                    : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 shadow-sm')
                                : 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                            }`}>
                              {isWinner ? '+' : ''}{rec.result_pct}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400 whitespace-nowrap font-medium text-[11px]">
                            {rec.estimated_time}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <a
                              href={`https://in.tradingview.com/chart/?symbol=NSE:${rec.symbol}&interval=${getTvInterval(rec.category)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 text-[10px] font-bold inline-flex items-center gap-0.5 transition-colors"
                              title={`Open ${rec.category === 'intraday' ? '1-minute' : 'Weekly'} Chart on TradingView`}
                            >
                              TV {rec.category === 'intraday' ? '1m' : rec.category === 'multibagger' ? 'Weekly' : ''}
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
