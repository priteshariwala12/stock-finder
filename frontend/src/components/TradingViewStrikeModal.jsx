import React, { useState, useEffect } from 'react';
import { 
  X, ExternalLink, TrendingUp, TrendingDown, Layers, Zap, 
  Activity, ArrowUpRight, ArrowDownRight, Copy, Check, Info, Maximize2 
} from 'lucide-react';

export default function TradingViewStrikeModal({
  isOpen,
  onClose,
  symbol,
  strikeData,
  underlyingPrice,
  expiryDate,
  initialType = 'CE' // 'CE' or 'PE' or 'SPOT'
}) {
  const [activeTab, setActiveTab] = useState(initialType);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setActiveTab(initialType);
  }, [initialType, strikeData]);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !strikeData) return null;

  const strike = strikeData.strike;
  const ce = strikeData.ce || {};
  const pe = strikeData.pe || {};
  const spotDiff = (strike - underlyingPrice).toFixed(2);
  const spotDiffPct = (((strike - underlyingPrice) / underlyingPrice) * 100).toFixed(2);

  // Accurate 2-digit month TradingView Indian option symbol formatter
  const formatTvSymbol = (sym, exp, strk, optType) => {
    try {
      if (exp && exp.includes('-')) {
        const parts = exp.split('-');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const monthMap = {
            JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
            JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
          };
          const m = monthMap[parts[1].toUpperCase()] || '09';
          const y = parts[2].slice(-2);
          const optCode = optType.startsWith('C') ? 'C' : 'P';
          const prefix = sym === 'SENSEX' ? 'BSE' : 'NSE';
          return `${prefix}:${sym}${y}${m}${day}${optCode}${Math.round(strk)}`;
        }
      }
    } catch (e) {
      console.error(e);
    }
    const prefix = sym === 'SENSEX' ? 'BSE' : 'NSE';
    return `${prefix}:${sym}${Math.round(strk)}${optType}`;
  };

  // TradingView symbol resolution
  const tvCeSymbol = formatTvSymbol(symbol, expiryDate, strike, 'CE');
  const tvPeSymbol = formatTvSymbol(symbol, expiryDate, strike, 'PE');
  const tvUnderlyingSymbol = strikeData.tv_underlying_ticker || (symbol === 'SENSEX' ? 'BSE:SENSEX' : `NSE:${symbol}`);

  let activeTvSymbol = tvCeSymbol;
  let activeTitle = `${symbol} ${expiryDate} ₹${strike} CALL (CE)`;
  let activeLtp = ce.ltp;
  let activeChange = ce.change;
  let activePchange = ce.pchange;
  let activeOi = ce.oi;
  let activeIv = ce.iv;
  let activeVolume = ce.volume;

  if (activeTab === 'PE') {
    activeTvSymbol = tvPeSymbol;
    activeTitle = `${symbol} ${expiryDate} ₹${strike} PUT (PE)`;
    activeLtp = pe.ltp;
    activeChange = pe.change;
    activePchange = pe.pchange;
    activeOi = pe.oi;
    activeIv = pe.iv;
    activeVolume = pe.volume;
  } else if (activeTab === 'SPOT') {
    activeTvSymbol = tvUnderlyingSymbol;
    activeTitle = `${symbol} (Underlying Index/Stock)`;
    activeLtp = underlyingPrice;
    activeChange = 0;
    activePchange = 0;
    activeOi = 0;
    activeIv = 0;
    activeVolume = 0;
  }

  const handleCopySymbol = () => {
    navigator.clipboard.writeText(activeTvSymbol);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tvExternalUrl = `https://in.tradingview.com/chart/?symbol=${encodeURIComponent(activeTvSymbol)}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-base">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white tracking-tight">
                  Strike ₹{strike.toLocaleString('en-IN')}
                </h2>
                {strikeData.is_atm ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                    ATM Strike
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">
                    {spotDiff > 0 ? `+₹${spotDiff} (+${spotDiffPct}%) OTM Call` : `-₹${Math.abs(spotDiff)} (${spotDiffPct}%) ITM Call`}
                  </span>
                )}
                <span className="text-slate-500">•</span>
                <span className="text-xs font-semibold text-slate-300">
                  {symbol} Spot: ₹{underlyingPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-400">
                  Expiry: {expiryDate}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                TradingView Interactive Candlestick & Technical Analysis Chart
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySymbol}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Copy TradingView Symbol Ticker"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{copied ? "Copied!" : "Copy Ticker"}</span>
            </button>

            <a
              href={tvExternalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
              title="Open full interactive chart on TradingView web"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in TradingView</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contract Toggles & Live Statistics Bar */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3">
          {/* 3 Tabs: Call CE, Put PE, Underlying SPOT */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 gap-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('CE')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
                activeTab === 'CE'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>CALL (CE) ₹{ce.ltp}</span>
              <span className={`text-[10px] ${ce.pchange >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                {ce.pchange >= 0 ? '+' : ''}{ce.pchange}%
              </span>
            </button>

            <button
              onClick={() => setActiveTab('PE')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
                activeTab === 'PE'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>PUT (PE) ₹{pe.ltp}</span>
              <span className={`text-[10px] ${pe.pchange >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                {pe.pchange >= 0 ? '+' : ''}{pe.pchange}%
              </span>
            </button>

            <button
              onClick={() => setActiveTab('SPOT')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'SPOT'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Underlying ({symbol})</span>
            </button>
          </div>

          {/* Key Contract Metrics Pill Box */}
          {activeTab !== 'SPOT' && (
            <div className="flex items-center gap-4 text-xs font-medium text-slate-300 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">LTP:</span>
                <span className="font-bold text-white font-mono">₹{activeLtp}</span>
                <span className={`text-[11px] font-bold ${activeChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ({activeChange >= 0 ? '+' : ''}{activeChange} pts)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">IV:</span>
                <span className="font-bold text-cyan-400 font-mono">{activeIv}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">OI:</span>
                <span className="font-bold text-amber-300 font-mono">{(activeOi / 1000).toFixed(1)}k</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Volume:</span>
                <span className="font-bold text-indigo-300 font-mono">{(activeVolume / 1000).toFixed(1)}k</span>
              </div>
            </div>
          )}
        </div>

        {/* TradingView Chart Container */}
        <div className="flex-1 min-h-[480px] bg-slate-950 relative overflow-hidden">
          <iframe
            key={activeTvSymbol}
            src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(activeTvSymbol)}&interval=5&theme=dark&style=1&timezone=Asia/Kolkata&withdateranges=1&hide_side_toolbar=0&allow_symbol_change=1&save_image=1`}
            title={`TradingView Chart - ${activeTitle}`}
            className="w-full h-full border-0 absolute inset-0"
            allowFullScreen
          />
        </div>

        {/* Modal Footer Note */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Ticker: <code className="text-indigo-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{activeTvSymbol}</code></span>
            <span className="text-slate-500">|</span>
            <span>Switch timeframes, indicators, and drawings inside chart</span>
          </div>
          <span className="text-slate-500">Powered by TradingView Advanced Charting</span>
        </div>
      </div>
    </div>
  );
}
