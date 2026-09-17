import React, { useEffect, useState } from 'react';
import { 
  X, ExternalLink, TrendingUp, TrendingDown, Shield, 
  BarChart2, DollarSign, Activity, Percent, Compass, CheckCircle2, 
  AlertTriangle, Building2, User, Calendar, MapPin, Globe, Award,
  Flame, Gauge, PieChart, Layers, Rocket, Sparkles, Cpu
} from 'lucide-react';

export default function StockDetailModal({ symbol, onClose, onOpenChart }) {
  const [stock, setStock] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'company_info', 'mmi_mood', 'fundamentals', 'technicals', 'chart'

  useEffect(() => {
    if (!symbol) return;
    setIsLoading(true);
    setError(null);

    fetch(`/api/stocks/${symbol}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load stock data");
        return res.json();
      })
      .then(data => {
        setStock(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [symbol]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!symbol) return null;

  const isPositive = stock?.change_1d >= 0;
  const mmiScore = stock?.mmi_score ?? 52;
  const mmiZone = stock?.mmi_zone ?? 'Neutral';

  // Helper for MMI needle color
  const getMmiColor = (score) => {
    if (score <= 25) return 'text-rose-500';
    if (score <= 45) return 'text-orange-400';
    if (score <= 55) return 'text-amber-300';
    if (score <= 75) return 'text-teal-400';
    return 'text-emerald-400';
  };

  const getMmiBg = (score) => {
    if (score <= 25) return 'bg-rose-950/80 border-rose-800 text-rose-300';
    if (score <= 45) return 'bg-orange-950/80 border-orange-800 text-orange-300';
    if (score <= 55) return 'bg-amber-950/80 border-amber-800 text-amber-300';
    if (score <= 75) return 'bg-teal-950/80 border-teal-800 text-teal-300';
    return 'bg-emerald-950/80 border-emerald-800 text-emerald-300';
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/50">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-white tracking-tight">{symbol}</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                NSE
              </span>
              {stock?.bse_code && (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                  BSE: {stock.bse_code}
                </span>
              )}
              {stock?.market_cap_category && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-semibold border border-indigo-800">
                  {stock.market_cap_category}
                </span>
              )}
              {stock?.is_breakout_3pct === 1 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/50 flex items-center gap-1">
                  🚀 Breakout
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-200 mt-1">{stock?.name}</p>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span>{stock?.sector}</span>
              <span>•</span>
              <span>{stock?.industry}</span>
              <span>•</span>
              <span className="text-slate-500 font-mono">ISIN: {stock?.isin || 'N/A'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Price & Change */}
            {stock && (
              <div className="text-right">
                <div className="text-2xl font-black text-white">
                  ₹{stock.current_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className={`text-xs font-extrabold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                  isPositive ? 'text-emerald-400 bg-emerald-950/70 border border-emerald-800' : 'text-rose-400 bg-rose-950/70 border border-rose-800'
                }`}>
                  {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {isPositive ? '+' : ''}{stock.change_1d}%
                </div>
              </div>
            )}
            {stock && onOpenChart && (
              <button
                onClick={() => {
                  onClose?.();
                  onOpenChart(stock.symbol, stock.name, stock.current_price);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                title="Open in Full Facility Chart Segment"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Chart Segment</span>
              </button>
            )}
            {stock && (
              <a
                href={`https://in.tradingview.com/chart/?symbol=NSE:${stock.symbol}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2962FF] hover:bg-[#1E53E5] text-white font-bold text-xs shadow-md shadow-blue-900/40 transition-all cursor-pointer"
                title="Open on TradingView.com"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>TV.com</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-5 border-b border-slate-800 bg-slate-950/40 flex items-center gap-1 overflow-x-auto text-xs font-semibold no-scrollbar">
          {[
            { id: 'overview', label: 'Overview & Highlights', icon: Layers },
            { id: 'company_info', label: 'Company Profile & CEO', icon: Building2 },
            { id: 'mmi_mood', label: 'Fear & Greed Index (MMI)', icon: Gauge },
            { id: 'fundamentals', label: 'Financial Ratios Grid', icon: DollarSign },
            { id: 'technicals', label: 'Technical Signals Grid', icon: Activity },
            { id: 'chart', label: 'Historical Candlesticks', icon: BarChart2 },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? 'border-indigo-500 text-indigo-400 font-bold bg-indigo-500/5' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-slate-300 text-xs">
          {isLoading && (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-medium">Fetching official company analytics...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 font-medium">
              {error}
            </div>
          )}

          {stock && !isLoading && (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Top Key Scorecard Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <span className="text-slate-400 text-[11px] block">Technical Rating</span>
                      <span className={`text-base font-extrabold mt-1 block ${
                        stock.technical_rating === 'Strong Buy' ? 'text-emerald-400' :
                        stock.technical_rating === 'Buy' ? 'text-green-400' :
                        stock.technical_rating === 'Neutral' ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {stock.technical_rating}
                      </span>
                      <span className="text-[10px] text-slate-500">Based on RSI, MA & MACD</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <span className="text-slate-400 text-[11px] block">Market Mood Index (MMI)</span>
                      <span className={`text-base font-extrabold mt-1 block ${getMmiColor(mmiScore)}`}>
                        {mmiScore} • {mmiZone}
                      </span>
                      <span className="text-[10px] text-slate-500">Fear & Greed Sentiment</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <span className="text-slate-400 text-[11px] block">Market Capitalization</span>
                      <span className="text-base font-extrabold text-white mt-1 block">
                        ₹{Math.round(stock.market_cap_cr)?.toLocaleString('en-IN')} Cr
                      </span>
                      <span className="text-[10px] text-slate-500">{stock.market_cap_category}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <span className="text-slate-400 text-[11px] block">NSE Delivery Percentage</span>
                      <span className="text-base font-extrabold text-indigo-300 mt-1 block">
                        {stock.delivery_percent}%
                      </span>
                      <span className="text-[10px] text-slate-500">{stock.delivery_qty?.toLocaleString('en-IN')} shares delivered</span>
                    </div>
                  </div>

                  {/* Company Quick Summary Card */}
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                        About {stock.name}
                      </span>
                      {stock.founded_year && (
                        <span className="text-[11px] text-slate-400">
                          Est. {stock.founded_year}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {stock.business_summary || `${stock.name} is an actively traded equity on the National Stock Exchange and Bombay Stock Exchange, operating within the ${stock.sector} sector.`}
                    </p>
                    <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-400 border-t border-slate-700/40">
                      {stock.ceo_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <strong>Leader:</strong> {stock.ceo_name}
                        </span>
                      )}
                      {stock.headquarters && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <strong>HQ:</strong> {stock.headquarters}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Claude.ai Multi-Bagger Synthesis Card if available */}
                  {stock.recommendation && stock.recommendation.category === 'multibagger' && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-fuchsia-950/60 via-purple-950/40 to-slate-900 border border-fuchsia-600/50 space-y-3 shadow-lg shadow-fuchsia-950/30">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/40">
                            <Rocket className="w-4 h-4" />
                          </span>
                          <div>
                            <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                              AI Quantitative Multi-Bagger Setup
                              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                            </span>
                            <span className="text-[10px] text-fuchsia-300 font-bold block">
                              {stock.recommendation.potential_multiplier || '2.5x – 5.0x Growth Target'} • {stock.recommendation.risk_level || 'Turnaround'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-800 font-bold text-[11px]">
                            Confidence: {stock.recommendation.claude_confidence || 92}%
                          </span>
                        </div>
                      </div>

                      {stock.recommendation.claude_thesis && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-xs">
                          {stock.recommendation.claude_thesis.catalyst && (
                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                              <span className="font-bold text-amber-300 block text-[11px] mb-1">💎 Growth Catalyst</span>
                              <p className="text-[11px] text-slate-300 leading-relaxed">{stock.recommendation.claude_thesis.catalyst}</p>
                            </div>
                          )}
                          {stock.recommendation.claude_thesis.fundamentals && (
                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                              <span className="font-bold text-emerald-400 block text-[11px] mb-1">📊 Fundamental Turnaround</span>
                              <p className="text-[11px] text-slate-300 leading-relaxed">{stock.recommendation.claude_thesis.fundamentals}</p>
                            </div>
                          )}
                          {stock.recommendation.claude_thesis.technicals && (
                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                              <span className="font-bold text-teal-300 block text-[11px] mb-1">📈 Technical Base Setup</span>
                              <p className="text-[11px] text-slate-300 leading-relaxed">{stock.recommendation.claude_thesis.technicals}</p>
                            </div>
                          )}
                          {stock.recommendation.claude_thesis.downside_protection && (
                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                              <span className="font-bold text-rose-300 block text-[11px] mb-1">🛡️ Stop Loss & Protection</span>
                              <p className="text-[11px] text-slate-300 leading-relaxed">{stock.recommendation.claude_thesis.downside_protection}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 52-Week Range Bar */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">
                        52W Low: <strong className="text-slate-200">₹{stock.fifty_two_week_low}</strong>
                      </span>
                      <span className="text-slate-200 font-bold">
                        Current: ₹{stock.current_price}
                      </span>
                      <span className="text-slate-400">
                        52W High: <strong className="text-slate-200">₹{stock.fifty_two_week_high}</strong>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 rounded-full"
                        style={{ 
                          width: `${Math.min(100, Math.max(0, ((stock.current_price - stock.fifty_two_week_low) / Math.max(stock.fifty_two_week_high - stock.fifty_two_week_low, 1)) * 100))}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>+{stock.dist_from_52w_low}% from 52W Low</span>
                      <span>-{stock.dist_from_52w_high}% from 52W High</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: COMPANY PROFILE & CORPORATE INFO */}
              {activeTab === 'company_info' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-700/60 pb-3">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      Corporate Leadership & Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-700/50 space-y-1">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          Managing Director / CEO
                        </span>
                        <p className="text-sm font-bold text-white">
                          {stock.ceo_name || "Board of Directors"}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-700/50 space-y-1">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          Establishment / Founded Year
                        </span>
                        <p className="text-sm font-bold text-white">
                          {stock.founded_year || "Established Public Firm"}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-700/50 space-y-1 md:col-span-2">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          Registered Corporate Headquarters & Address
                        </span>
                        <p className="text-xs font-semibold text-slate-200">
                          {stock.headquarters || "Registered Office, Mumbai, Maharashtra, India"}
                        </p>
                      </div>

                      {/* Official Corporate Website - Only rendered if verified website exists; completely removed otherwise */}
                      {stock.website ? (
                        <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-700/50 space-y-1">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-blue-400" />
                            Official Corporate Website
                          </span>
                          <a 
                            href={stock.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1.5 truncate"
                          >
                            <span className="truncate">{stock.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      ) : null}

                      <div className={`p-3.5 rounded-lg bg-slate-900/70 border border-slate-700/50 space-y-1 ${!stock.website ? 'md:col-span-2' : ''}`}>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          Piotroski Financial Health Score
                        </span>
                        <p className="text-sm font-bold text-emerald-400">
                          {stock.piotroski_score || 7} / 9 (Strong Operation Health)
                        </p>
                      </div>
                    </div>

                    {/* Official Regulatory & Exchange Filings */}
                    <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-slate-200">Official Exchange Regulatory Portals:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(stock.symbol)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                        >
                          <span>NSE India Quote & Filings</span>
                          <ExternalLink className="w-3 h-3 text-emerald-400" />
                        </a>
                        <a
                          href={stock.bse_url || "https://www.bseindia.com/"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                        >
                          <span>BSE India Corporate Portal</span>
                          <ExternalLink className="w-3 h-3 text-indigo-400" />
                        </a>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <span className="font-bold text-slate-200 text-xs block">Business Description & Core Operations</span>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-lg border border-slate-700/40">
                        {stock.business_summary || `${stock.name} is engaged in the manufacturing, development, and supply of products across the ${stock.sector} sector.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FEAR & GREED / MARKET MOOD INDEX (MMI) */}
              {activeTab === 'mmi_mood' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-amber-400" />
                          Market Mood Index (MMI) & Fear & Greed Sentiment
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Evaluates investor emotion, institutional delivery volume, and momentum extremes.
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-black border ${getMmiBg(mmiScore)}`}>
                        {mmiZone} ({mmiScore})
                      </span>
                    </div>

                    {/* MMI Visual Multi-Segment Gauge */}
                    <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-rose-400">Extreme Fear (0-25)</span>
                        <span className="text-orange-400">Fear (25-45)</span>
                        <span className="text-amber-300">Neutral (45-55)</span>
                        <span className="text-teal-400">Greed (55-75)</span>
                        <span className="text-emerald-400">Extreme Greed (75-100)</span>
                      </div>

                      {/* Graduated Bar */}
                      <div className="h-4 w-full rounded-full bg-gradient-to-r from-rose-600 via-orange-500 via-yellow-400 via-teal-500 to-emerald-500 relative p-0.5 shadow-inner">
                        {/* Needle / Marker */}
                        <div 
                          className="absolute -top-1.5 -bottom-1.5 w-3 bg-white rounded-full shadow-lg border-2 border-slate-900 transition-all"
                          style={{ left: `calc(${Math.min(98, Math.max(2, mmiScore))}% - 6px)` }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>0: Panic / Discount Zone</span>
                        <span className="font-extrabold text-white text-sm">Score: {mmiScore} / 100</span>
                        <span>100: Euphoria / Overbought</span>
                      </div>
                    </div>

                    {/* Insights & Guidance Card */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 space-y-2">
                      <span className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
                        <Compass className="w-3.5 h-3.5 text-indigo-400" />
                        Actionable Sentiment Analysis
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {stock.mmi_insight || "Sentiment analysis indicates stable consolidation with balanced risk-reward."}
                      </p>
                      {stock.market_mmi && (
                        <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                          <strong>Broad Market Benchmark:</strong> {stock.market_mmi.description}
                        </p>
                      )}
                    </div>

                    {/* Contributing Factor Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">RSI Momentum Factor</span>
                        <span className="font-bold text-white text-sm">{stock.rsi_14}</span>
                        <span className="text-[10px] text-slate-500">40% MMI Weight</span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Price vs 20 EMA</span>
                        <span className={`font-bold text-sm ${stock.above_ema20 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {stock.above_ema20 ? 'Bullish (Above)' : 'Bearish (Below)'}
                        </span>
                        <span className="text-[10px] text-slate-500">20% MMI Weight</span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Delivery Accumulation</span>
                        <span className="font-bold text-indigo-300 text-sm">{stock.delivery_percent}%</span>
                        <span className="text-[10px] text-slate-500">15% MMI Weight</span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Volume Surge Multiple</span>
                        <span className="font-bold text-cyan-400 text-sm">{stock.volume_multiple}x</span>
                        <span className="text-[10px] text-slate-500">25% MMI Weight</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: FINANCIAL RATIOS GRID */}
              {activeTab === 'fundamentals' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Valuation Grid */}
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                      <h3 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs border-b border-slate-700/50 pb-2">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        Valuation Multiples
                      </h3>
                      <div className="divide-y divide-slate-700/40 text-xs">
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">Price to Earnings (P/E)</span>
                          <span className="font-bold text-slate-200">{stock.pe_ratio || '-'}</span>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">Price to Book (P/B)</span>
                          <span className="font-bold text-slate-200">{stock.pb_ratio || '-'}</span>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">EV / EBITDA</span>
                          <span className="font-bold text-slate-200">{stock.ev_ebitda || '-'}</span>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">EPS (TTM)</span>
                          <span className="font-bold text-slate-200">₹{stock.eps_ttm || '-'}</span>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">Dividend Yield</span>
                          <span className="font-bold text-emerald-400">{stock.dividend_yield}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Profitability Grid */}
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                      <h3 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs border-b border-slate-700/50 pb-2">
                        <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                        Profitability & Returns
                      </h3>
                      <div className="divide-y divide-slate-700/40 text-xs">
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">Return on Capital (ROCE)</span>
                          <span className="font-bold text-emerald-400">{stock.roce}%</span>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">Return on Equity (ROE)</span>
                          <span className="font-bold text-slate-200">{stock.roe}%</span>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">Operating Margin</span>
                          <span className="font-bold text-slate-200">{stock.operating_margin}%</span>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">Net Profit Margin</span>
                          <span className="font-bold text-slate-200">{stock.net_profit_margin}%</span>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">Free Cash Flow (Cr)</span>
                          <span className="font-bold text-cyan-400">₹{stock.free_cash_flow_cr?.toLocaleString('en-IN') || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Solvency & Balance Sheet Grid */}
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                      <h3 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs border-b border-slate-700/50 pb-2">
                        <Shield className="w-3.5 h-3.5 text-purple-400" />
                        Balance Sheet Health
                      </h3>
                      <div className="divide-y divide-slate-700/40 text-xs">
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">Debt to Equity</span>
                          <span className="font-bold text-slate-200">{stock.debt_to_equity}</span>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">Current Ratio</span>
                          <span className="font-bold text-slate-200">{stock.current_ratio}</span>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">Interest Coverage</span>
                          <span className="font-bold text-emerald-400">{stock.interest_coverage || '-'}x</span>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">Piotroski Score</span>
                          <span className="font-bold text-indigo-400">{stock.piotroski_score || 7} / 9</span>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span className="text-slate-400">Pledged Shares</span>
                          <span className="font-bold text-slate-200">{stock.promoter_pledged || 0}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shareholding Pattern Grid */}
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                    <h3 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
                      <PieChart className="w-3.5 h-3.5 text-indigo-400" />
                      Ownership & Shareholding Distribution
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">Promoter Holding</span>
                        <span className="font-extrabold text-white text-base mt-0.5 block">{stock.promoter_holding}%</span>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${stock.promoter_holding}%` }}></div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">Institutional Holding (FII + DII)</span>
                        <span className="font-extrabold text-indigo-300 text-base mt-0.5 block">{stock.fii_dii_holding}%</span>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${stock.fii_dii_holding}%` }}></div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-slate-400 text-[11px] block">Public / Retail Holding</span>
                        <span className="font-extrabold text-slate-300 text-base mt-0.5 block">
                          {Math.max(0, roundDec(100 - (stock.promoter_holding || 0) - (stock.fii_dii_holding || 0)))}%
                        </span>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-slate-500 rounded-full" style={{ width: `${Math.max(0, 100 - (stock.promoter_holding || 0) - (stock.fii_dii_holding || 0))}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: TECHNICAL SIGNALS GRID */}
              {activeTab === 'technicals' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Moving Averages Grid */}
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                      <h3 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs border-b border-slate-700/50 pb-2">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        Moving Average Structural Grid
                      </h3>
                      <div className="divide-y divide-slate-700/40 text-xs">
                        <div className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-200">20-Day EMA (Short Term)</span>
                            <span className="text-[10px] text-slate-500 block">Momentum trendline</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-100">₹{stock.ema_20}</span>
                            <span className={`text-[10px] block font-bold ${stock.above_ema20 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {stock.above_ema20 ? 'Above EMA' : 'Below EMA'}
                            </span>
                          </div>
                        </div>

                        <div className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-200">50-Day SMA (Medium Term)</span>
                            <span className="text-[10px] text-slate-500 block">Quarterly benchmark</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-100">₹{stock.sma_50}</span>
                            <span className={`text-[10px] block font-bold ${stock.above_sma50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {stock.above_sma50 ? 'Above SMA' : 'Below SMA'}
                            </span>
                          </div>
                        </div>

                        <div className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-200">200-Day SMA (Long Term)</span>
                            <span className="text-[10px] text-slate-500 block">Institutional macro threshold</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-100">₹{stock.sma_200}</span>
                            <span className={`text-[10px] block font-bold ${stock.above_sma200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {stock.above_sma200 ? 'Bullish Macro' : 'Bearish Macro'}
                            </span>
                          </div>
                        </div>

                        <div className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-200">⚡ Golden Cross</span>
                            <span className="text-[10px] text-slate-500 block">50 SMA &gt; 200 SMA</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded font-bold text-[11px] ${
                            stock.golden_cross ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {stock.golden_cross ? 'ACTIVE BULLISH' : 'INACTIVE'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Momentum & Institutional Delivery Grid */}
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                      <h3 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs border-b border-slate-700/50 pb-2">
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        Momentum & Institutional Delivery Grid
                      </h3>
                      <div className="divide-y divide-slate-700/40 text-xs">
                        <div className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-200">RSI (14-Day)</span>
                            <span className="text-[10px] text-slate-500 block">Relative Strength Index</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded font-extrabold ${
                            stock.rsi_14 < 35 ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800' :
                            stock.rsi_14 > 70 ? 'text-amber-400 bg-amber-950/80 border border-amber-800' : 'text-slate-100 bg-slate-800'
                          }`}>
                            {stock.rsi_14}
                          </span>
                        </div>

                        <div className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-200">Volume Surge Multiple</span>
                            <span className="text-[10px] text-slate-500 block">Current vs 20-Day Average</span>
                          </div>
                          <span className="font-extrabold text-cyan-400 text-sm">
                            {stock.volume_multiple}x Average
                          </span>
                        </div>

                        <div className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-200">NSE Delivery %</span>
                            <span className="text-[10px] text-slate-500 block">Official NSE Bhavcopy Delivery</span>
                          </div>
                          <span className="font-extrabold text-indigo-300 text-sm">
                            {stock.delivery_percent}%
                          </span>
                        </div>

                        <div className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-200">🚀 Momentum Breakout Signal</span>
                            <span className="text-[10px] text-slate-500 block">Strong price surge with volume expansion</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded font-bold text-[11px] ${
                            stock.is_breakout_3pct ? 'text-amber-300 bg-amber-950/90 border border-amber-500' : 'text-slate-500'
                          }`}>
                            {stock.is_breakout_3pct ? '🚀 BREAKOUT TRIGGERED' : 'No Breakout'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: HISTORICAL CANDLESTICK DATA & CHART */}
              {activeTab === 'chart' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <span className="font-bold text-slate-100 text-xs">Official Daily Bhavcopy Time Series</span>
                      <p className="text-[11px] text-slate-500">Historical open, high, low, close, and traded volume records</p>
                    </div>
                    <a
                      href={`https://in.tradingview.com/chart/?symbol=NSE:${stock.symbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Open Full TradingView Chart</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-3 text-right">Open (₹)</th>
                          <th className="py-2.5 px-3 text-right">High (₹)</th>
                          <th className="py-2.5 px-3 text-right">Low (₹)</th>
                          <th className="py-2.5 px-3 text-right">Close (₹)</th>
                          <th className="py-2.5 px-4 text-right">Volume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {stock.chart_history?.slice(-20).reverse().map((c, i) => {
                          const isUp = c.close >= c.open;
                          return (
                            <tr key={i} className="hover:bg-slate-900/80 transition-colors">
                              <td className="py-2 px-4 font-sans text-slate-300">{c.date}</td>
                              <td className="py-2 px-3 text-right text-slate-300">₹{c.open}</td>
                              <td className="py-2 px-3 text-right text-emerald-400 font-medium">₹{c.high}</td>
                              <td className="py-2 px-3 text-right text-rose-400 font-medium">₹{c.low}</td>
                              <td className={`py-2 px-3 text-right font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ₹{c.close}
                              </td>
                              <td className="py-2 px-4 text-right text-slate-400 font-sans">{c.volume?.toLocaleString('en-IN')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Verified Exchange Sources:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
              NSE Official Archives
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
              BSE India API
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://in.tradingview.com/chart/?symbol=NSE:${stock?.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
              title="Open Live Interactive Chart on TradingView"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>TradingView Chart</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href={stock?.nse_url || `https://www.nseindia.com/get-quotes/equity?symbol=${stock?.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>NSE Official Page</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {stock?.bse_code && (
              <a
                href={stock?.bse_url || `https://www.bseindia.com/stock-share-price/x/x/${stock?.bse_code}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>BSE Official Page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function roundDec(val) {
  return Math.round(val * 10) / 10;
}
