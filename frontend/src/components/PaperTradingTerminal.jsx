import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, TrendingUp, TrendingDown,
  Trash2, Plus, Minus, X, ChevronDown, ChevronUp, Maximize2, Minimize2,
  PieChart, Activity, Zap, CheckCircle2, RotateCcw, ArrowRight
} from 'lucide-react';
import PayoffChart from './PayoffChart';
import { 
  calculateRiskMetrics, 
  calculateRequiredMargin, 
  calculateProbabilityOfProfit 
} from '../utils/optionsAnalytics';

const STORAGE_KEY = 'stock_finder_paper_trades';

export default function PaperTradingTerminal({
  isOpen = false,
  onClose,
  activeLegs = [],
  onUpdateLegs,
  currentSpot = 23500,
  symbol = 'NIFTY',
  expiry = '',
  lotSize = 50,
  quotesMap = {},
  isDocked = false
}) {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const trades = saved ? JSON.parse(saved) : [];
      return activeLegs.length === 0 && trades.length > 0 ? 'deployed' : 'builder';
    } catch {
      return 'builder';
    }
  });

  // Switch to builder tab automatically when legs are added
  useEffect(() => {
    if (activeLegs.length > 0) {
      setActiveTab('builder');
    }
  }, [activeLegs.length]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [deployedTrades, setDeployedTrades] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [deployNotification, setDeployNotification] = useState(null);

  // Sync deployed trades to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deployedTrades));
    } catch (e) {
      console.error('Failed to save paper trades:', e);
    }
  }, [deployedTrades]);

  // Enrich active legs with live LTP from quotesMap if available
  const enrichedLegs = useMemo(() => {
    return activeLegs.map(leg => {
      const key = `${leg.strike}_${leg.type}`;
      const liveLtp = quotesMap[key] !== undefined ? quotesMap[key] : leg.entryPrice;
      const totalQty = (leg.lots || 1) * (leg.lotSize || lotSize || 50);
      const isBuy = leg.action === 'BUY';
      const pnl = isBuy ? (liveLtp - leg.entryPrice) * totalQty : (leg.entryPrice - liveLtp) * totalQty;
      return {
        ...leg,
        currentLtp: liveLtp,
        livePnl: Math.round(pnl)
      };
    });
  }, [activeLegs, quotesMap, lotSize]);

  // Compute live strategy metrics
  const metrics = useMemo(() => {
    return calculateRiskMetrics(enrichedLegs, currentSpot);
  }, [enrichedLegs, currentSpot]);

  const requiredMargin = useMemo(() => {
    return calculateRequiredMargin(enrichedLegs, currentSpot, symbol);
  }, [enrichedLegs, currentSpot, symbol]);

  const pop = useMemo(() => {
    return calculateProbabilityOfProfit(enrichedLegs, currentSpot, 15, 3);
  }, [enrichedLegs, currentSpot]);

  const liveStrategyPnl = useMemo(() => {
    return enrichedLegs.reduce((acc, leg) => acc + (leg.livePnl || 0), 0);
  }, [enrichedLegs]);

  // Calculate live PnL for deployed paper portfolio
  const deployedWithLivePnl = useMemo(() => {
    return deployedTrades.map(trade => {
      let totalPnl = 0;
      const enrichedTradeLegs = (trade.legs || []).map(leg => {
        const key = `${leg.strike}_${leg.type}`;
        const liveLtp = quotesMap[key] !== undefined ? quotesMap[key] : (leg.currentLtp || leg.entryPrice);
        const qty = (leg.lots || 1) * (leg.lotSize || 50);
        const pnl = leg.action === 'BUY' ? (liveLtp - leg.entryPrice) * qty : (leg.entryPrice - liveLtp) * qty;
        totalPnl += pnl;
        return { ...leg, currentLtp: liveLtp, livePnl: Math.round(pnl) };
      });
      return {
        ...trade,
        legs: enrichedTradeLegs,
        livePnl: Math.round(totalPnl)
      };
    });
  }, [deployedTrades, quotesMap]);

  // Handlers for active builder legs
  const handleUpdateLots = (index, delta) => {
    const updated = [...activeLegs];
    const newLots = Math.max(1, (updated[index].lots || 1) + delta);
    updated[index] = { ...updated[index], lots: newLots };
    onUpdateLegs(updated);
  };

  const handleToggleAction = (index) => {
    const updated = [...activeLegs];
    updated[index] = {
      ...updated[index],
      action: updated[index].action === 'BUY' ? 'SELL' : 'BUY'
    };
    onUpdateLegs(updated);
  };

  const handleDeleteLeg = (index) => {
    const updated = activeLegs.filter((_, i) => i !== index);
    onUpdateLegs(updated);
  };

  const handleClearAll = () => {
    onUpdateLegs([]);
  };

  // Deploy paper trade into active portfolio
  const handleDeployTrade = () => {
    if (!activeLegs || activeLegs.length === 0) return;

    const newTrade = {
      id: `PT-${Date.now()}`,
      symbol,
      expiry,
      spotAtEntry: currentSpot,
      deployedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      legs: enrichedLegs.map(l => ({ ...l })),
      requiredMargin,
      maxProfit: metrics.maxProfit,
      maxLoss: metrics.maxLoss,
      pop,
      status: 'OPEN'
    };

    setDeployedTrades(prev => [newTrade, ...prev]);
    setDeployNotification(`Paper Strategy deployed with ${activeLegs.length} legs!`);
    setTimeout(() => setDeployNotification(null), 4000);
    setActiveTab('deployed');
    // Clear builder legs
    onUpdateLegs([]);
  };

  // Square off deployed position
  const handleSquareOff = (tradeId) => {
    setDeployedTrades(prev => prev.filter(t => t.id !== tradeId));
  };

  if (!isOpen) return null;

  // Render container class
  const containerClass = isDocked
    ? 'w-full h-full bg-slate-900 flex flex-col font-sans overflow-hidden select-none border-0'
    : `fixed z-40 bg-slate-900 border-t border-slate-700 shadow-2xl transition-all duration-200 flex flex-col font-sans ${
        isMaximized 
          ? 'inset-x-0 bottom-0 top-14 h-[calc(100vh-56px)]'
          : isMinimized 
            ? 'inset-x-0 bottom-0 h-12' 
            : 'inset-x-0 bottom-0 max-h-[75vh] h-[480px]'
      }`;

  return (
    <div className={containerClass}>
      {/* 1. Header Bar */}
      <div className="h-11 px-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 select-none">
        {/* Left: Brand / Title & Tab Switcher */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Zap className="w-3 h-3" />
          </div>
          <span className="text-[11px] font-black text-white tracking-wide uppercase hidden sm:inline">
            Paper Strategy
          </span>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('builder')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'builder'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Builder</span>
              {activeLegs.length > 0 && (
                <span className="w-3.5 h-3.5 rounded-full bg-white/25 text-[9px] flex items-center justify-center font-mono">
                  {activeLegs.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('deployed')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'deployed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Positions</span>
              {deployedTrades.length > 0 && (
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 text-slate-950 text-[9px] flex items-center justify-center font-mono font-black">
                  {deployedTrades.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1.5">
          {activeTab === 'builder' && activeLegs.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
              title="Clear all active strategy legs"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          )}

          {!isDocked && (
            <>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => {
                  setIsMaximized(!isMaximized);
                  setIsMinimized(false);
                }}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isMaximized ? 'Restore' : 'Maximize'}
              >
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Close Side Terminal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {(!isMinimized || isDocked) && (
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-900">
          {activeTab === 'builder' ? (
            <div className={`flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 flex flex-col`}>
              {/* 1. Key Metrics Strip (2x2 Grid) */}
              <div className="grid grid-cols-2 gap-2 shrink-0">
                {/* Required Margin */}
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Required Margin
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-cyan-300">
                    ₹{requiredMargin.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-slate-500 block">NSE SPAN + Hedge</span>
                </div>

                {/* Live PnL */}
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Live Strategy P&L
                  </span>
                  <span className={`text-xs sm:text-sm font-black font-mono ${liveStrategyPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {liveStrategyPnl >= 0 ? '+' : ''}₹{liveStrategyPnl.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Realtime 1s</span>
                </div>

                {/* Max Profit */}
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Max Profit
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                    {typeof metrics.maxProfit === 'number'
                      ? `+₹${metrics.maxProfit.toLocaleString('en-IN')}`
                      : metrics.maxProfit}
                  </span>
                  <span className="text-[9px] text-slate-500 block">{metrics.netType}</span>
                </div>

                {/* Max Loss & POP */}
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Max Loss
                    </span>
                    <span className={`text-[10px] font-black ${pop >= 55 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      POP {pop}%
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-black font-mono text-rose-400">
                    {typeof metrics.maxLoss === 'number'
                      ? `₹${metrics.maxLoss.toLocaleString('en-IN')}`
                      : metrics.maxLoss}
                  </span>
                  <span className="text-[9px] text-slate-500 block">R:R {metrics.riskRewardRatio}</span>
                </div>
              </div>

              {/* 2. Active Strategy Legs Table */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shrink-0">
                <div className="px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Strategy Legs ({enrichedLegs.length})</span>
                  {activeLegs.length > 0 && (
                    <span className="text-[11px] text-slate-400 font-mono font-normal">
                      Spot: ₹{currentSpot.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div className="divide-y divide-slate-800/60 max-h-44 overflow-y-auto custom-scrollbar">
                  {enrichedLegs.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      No legs added. Hover near any strike in Option Chain and click <b className="text-blue-400">B</b> (Buy) or <b className="text-rose-400">S</b> (Sell).
                    </div>
                  ) : (
                    enrichedLegs.map((leg, index) => (
                      <div key={index} className="px-2.5 py-1.5 flex items-center justify-between gap-1.5 hover:bg-slate-900/40 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleAction(index)}
                            className={`px-1.5 py-0.5 rounded font-black text-[10px] transition-colors cursor-pointer ${
                              leg.action === 'BUY' 
                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                : 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                            }`}
                            title="Click to toggle BUY / SELL"
                          >
                            {leg.action}
                          </button>
                          <span className="font-bold text-white font-mono text-xs">₹{leg.strike}</span>
                          <span className={`px-1 rounded text-[9px] font-black ${leg.type === 'CE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {leg.type}
                          </span>
                        </div>

                        {/* Lots Counter */}
                        <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                          <button
                            onClick={() => handleUpdateLots(index, -1)}
                            className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="font-mono text-[11px] font-bold text-slate-200 min-w-[20px] text-center">
                            {leg.lots}L
                          </span>
                          <button
                            onClick={() => handleUpdateLots(index, 1)}
                            className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* PnL */}
                        <div className="text-right font-mono text-[11px]">
                          <span className="text-slate-400 text-[10px] block">LTP: ₹{leg.currentLtp}</span>
                          <span className={`font-bold ${leg.livePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {leg.livePnl >= 0 ? '+' : ''}₹{leg.livePnl}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteLeg(index)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded"
                          title="Delete Leg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 3. Interactive Payoff Chart */}
              <div className="flex-1 flex flex-col min-h-[190px]">
                <div className="flex items-center justify-between mb-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider text-[11px]">
                    <PieChart className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Payoff Curve at Expiry</span>
                  </div>
                  {metrics.breakevens && metrics.breakevens.length > 0 && (
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      BE: {metrics.breakevens.map(b => `₹${Math.round(b)}`).join(', ')}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-h-[175px]">
                  <PayoffChart 
                    legs={enrichedLegs} 
                    currentSpot={currentSpot} 
                    symbol={symbol}
                    height={195} 
                  />
                </div>
              </div>

              {/* 4. Deploy Button */}
              <button
                onClick={handleDeployTrade}
                disabled={enrichedLegs.length === 0}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 mt-auto"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>Deploy Paper Trade ({enrichedLegs.length} Legs)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Deployed Paper Portfolio Tab */
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Actively Running Paper Trades ({deployedWithLivePnl.length})
                  </h3>
                </div>
                <div className="text-xs font-bold">
                  <span className="text-slate-400 mr-2">Total Portfolio Live P&L:</span>
                  <span className={`font-mono text-sm ${deployedWithLivePnl.reduce((a, t) => a + t.livePnl, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {deployedWithLivePnl.reduce((a, t) => a + t.livePnl, 0) >= 0 ? '+' : ''}
                    ₹{deployedWithLivePnl.reduce((a, t) => a + t.livePnl, 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {deployedWithLivePnl.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-slate-500">
                  <ShieldCheck className="w-8 h-8 mb-2 opacity-40 text-emerald-400" />
                  <span className="text-xs font-semibold">No active paper trades deployed</span>
                  <span className="text-[11px] text-slate-600 mt-1">
                    Switch to Strategy Builder tab, add legs from Option Chain, and click "Deploy Paper Trade"
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {deployedWithLivePnl.map((trade) => (
                    <div 
                      key={trade.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between shadow-lg"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">{trade.symbol}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-cyan-300 font-mono text-[11px]">{trade.expiry}</span>
                            <span className="text-slate-600 text-[10px]">@{trade.deployedAt}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-black text-sm ${trade.livePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {trade.livePnl >= 0 ? '+' : ''}₹{trade.livePnl.toLocaleString('en-IN')}
                            </span>
                            <button
                              onClick={() => handleSquareOff(trade.id)}
                              className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                              title="Square off / Exit position at live market rates"
                            >
                              Square Off
                            </button>
                          </div>
                        </div>

                        {/* Trade Legs Breakdown */}
                        <div className="space-y-1 mb-2">
                          {trade.legs.map((leg, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1 rounded text-[9px] font-black ${leg.action === 'BUY' ? 'bg-blue-600/30 text-blue-300' : 'bg-rose-600/30 text-rose-300'}`}>
                                  {leg.action}
                                </span>
                                <span>₹{leg.strike} {leg.type}</span>
                                <span className="text-slate-500 text-[10px]">({leg.lots}L)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">₹{leg.entryPrice} $\rightarrow$ ₹{leg.currentLtp}</span>
                                <span className={`font-bold ${leg.livePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {leg.livePnl >= 0 ? '+' : ''}₹{leg.livePnl}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card Footer: Metrics */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Margin: ₹{trade.requiredMargin?.toLocaleString('en-IN')}</span>
                        <span>POP: <b className="text-slate-200">{trade.pop}%</b></span>
                        <span>Max P/L: <b className="text-emerald-400">{typeof trade.maxProfit === 'number' ? `₹${trade.maxProfit}` : trade.maxProfit}</b> / <b className="text-rose-400">{typeof trade.maxLoss === 'number' ? `₹${trade.maxLoss}` : trade.maxLoss}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
