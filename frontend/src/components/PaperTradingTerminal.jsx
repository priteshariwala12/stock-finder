import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, TrendingUp, TrendingDown,
  Trash2, Plus, Minus, X, ChevronDown, ChevronUp, Maximize2, Minimize2,
  PieChart, Activity, Zap, CheckCircle2, RotateCcw, ArrowRight, Edit3,
  BarChart2, Layers, DollarSign
} from 'lucide-react';
import PayoffChart from './PayoffChart';
import { 
  calculateRiskMetrics, 
  calculateRequiredMargin, 
  calculateProbabilityOfProfit 
} from '../utils/optionsAnalytics';

const STORAGE_KEY = 'stock_finder_paper_trades';
const TEMPLATES_STORAGE_KEY = 'stock_finder_saved_strategies';

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
  spotPricesMap = {},
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
  const [strategyName, setStrategyName] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [expandedTradeId, setExpandedTradeId] = useState(null);

  const [savedStrategies, setSavedStrategies] = useState(() => {
    try {
      const saved = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deployedTrades, setDeployedTrades] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deployNotification, setDeployNotification] = useState(null);

  // Sync saved strategies to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(savedStrategies));
    } catch (e) {
      console.error('Failed to save strategy templates:', e);
    }
  }, [savedStrategies]);

  // Sync deployed trades to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deployedTrades));
    } catch (e) {
      console.error('Failed to save paper trades:', e);
    }
  }, [deployedTrades]);

  // Enrich active builder legs with live LTP from quotesMap if available
  const enrichedLegs = useMemo(() => {
    return activeLegs.map(leg => {
      const legSym = (leg.symbol || symbol || 'NIFTY').toUpperCase();
      const specificKey = `${legSym}_${leg.strike}_${leg.type}`;
      const fallbackKey = `${leg.strike}_${leg.type}`;
      const liveLtp = quotesMap[specificKey] !== undefined 
        ? quotesMap[specificKey] 
        : quotesMap[fallbackKey] !== undefined 
          ? quotesMap[fallbackKey] 
          : (leg.entryPrice || 100);
      const effectiveEntry = leg.entryPrice !== undefined && leg.entryPrice !== null ? parseFloat(leg.entryPrice) || 0 : liveLtp;
      const totalQty = (leg.lots || 1) * (leg.lotSize || lotSize || 50);
      const isBuy = leg.action === 'BUY';
      const pnl = isBuy ? (liveLtp - effectiveEntry) * totalQty : (effectiveEntry - liveLtp) * totalQty;
      return {
        ...leg,
        symbol: legSym,
        entryPrice: effectiveEntry,
        currentLtp: liveLtp,
        livePnl: Math.round(pnl)
      };
    });
  }, [activeLegs, quotesMap, lotSize, symbol]);

  // Resolve strategy's own underlying asset symbol and spot price
  const strategyAssetSymbol = useMemo(() => {
    if (activeLegs.length > 0 && activeLegs[0].symbol) {
      return activeLegs[0].symbol.toUpperCase();
    }
    const strikes = activeLegs.map(l => l.strike);
    if (strikes.some(s => s > 60000)) return 'SENSEX';
    if (strikes.some(s => s > 40000)) return 'BANKNIFTY';
    if (strikes.some(s => s > 15000 && s < 30000)) return 'NIFTY';
    return (symbol || 'NIFTY').toUpperCase();
  }, [activeLegs, symbol]);

  const strategyAssetSpot = useMemo(() => {
    if (spotPricesMap[strategyAssetSymbol]) return spotPricesMap[strategyAssetSymbol];
    if (activeLegs.length > 0) {
      const avgStrike = activeLegs.reduce((a, l) => a + (l.strike || 0), 0) / activeLegs.length;
      if (Math.abs(currentSpot - avgStrike) / avgStrike > 0.20) {
        return Math.round(avgStrike);
      }
    }
    return currentSpot;
  }, [strategyAssetSymbol, spotPricesMap, activeLegs, currentSpot]);

  // Compute live strategy metrics for builder using strategy's own asset spot
  const metrics = useMemo(() => {
    return calculateRiskMetrics(enrichedLegs, strategyAssetSpot);
  }, [enrichedLegs, strategyAssetSpot]);

  const requiredMargin = useMemo(() => {
    return calculateRequiredMargin(enrichedLegs, strategyAssetSpot, strategyAssetSymbol);
  }, [enrichedLegs, strategyAssetSpot, strategyAssetSymbol]);

  const pop = useMemo(() => {
    return calculateProbabilityOfProfit(enrichedLegs, strategyAssetSpot, 15, 3);
  }, [enrichedLegs, strategyAssetSpot]);

  const liveStrategyPnl = useMemo(() => {
    return enrichedLegs.reduce((acc, leg) => acc + (leg.livePnl || 0), 0);
  }, [enrichedLegs]);

  // Calculate live PnL for deployed paper portfolio across ALL assets
  const deployedWithLivePnl = useMemo(() => {
    return deployedTrades.map(trade => {
      let openPnl = 0;
      const tradeSym = (trade.symbol || symbol || 'NIFTY').toUpperCase();
      const tradeSpot = spotPricesMap[tradeSym] || trade.spotAtEntry || currentSpot;
      const enrichedTradeLegs = (trade.legs || []).map(leg => {
        const legSym = (leg.symbol || tradeSym).toUpperCase();
        const specificKey = `${legSym}_${leg.strike}_${leg.type}`;
        const fallbackKey = `${leg.strike}_${leg.type}`;
        const liveLtp = quotesMap[specificKey] !== undefined 
          ? quotesMap[specificKey] 
          : quotesMap[fallbackKey] !== undefined 
            ? quotesMap[fallbackKey] 
            : (leg.currentLtp || leg.entryPrice);
        const qty = (leg.lots || 1) * (leg.lotSize || 50);
        const pnl = leg.action === 'BUY' ? (liveLtp - leg.entryPrice) * qty : (leg.entryPrice - liveLtp) * qty;
        openPnl += pnl;
        return { ...leg, symbol: legSym, currentLtp: liveLtp, livePnl: Math.round(pnl) };
      });
      const realized = trade.realizedPnl || 0;
      return {
        ...trade,
        symbol: tradeSym,
        currentSpot: tradeSpot,
        legs: enrichedTradeLegs,
        openPnl: Math.round(openPnl),
        livePnl: Math.round(openPnl + realized)
      };
    });
  }, [deployedTrades, quotesMap, spotPricesMap, symbol, currentSpot]);

  // Handlers for active builder legs
  const handleUpdateLots = (index, delta) => {
    const updated = [...activeLegs];
    const newLots = Math.max(1, (updated[index].lots || 1) + delta);
    updated[index] = { ...updated[index], lots: newLots };
    onUpdateLegs(updated);
  };

  const handleUpdateEntryPrice = (index, newPrice) => {
    const updated = [...activeLegs];
    const parsed = parseFloat(newPrice);
    updated[index] = { ...updated[index], entryPrice: isNaN(parsed) ? newPrice : parsed };
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
    setStrategyName('');
  };

  // Save Strategy Template with Custom Name
  const handleSaveStrategy = (e) => {
    e?.preventDefault();
    if (!activeLegs || activeLegs.length === 0) return;
    const name = strategyName.trim() || `${symbol} ${activeLegs.length}-Leg Strategy`;
    
    const newTemplate = {
      id: `strat-${Date.now()}`,
      name,
      symbol,
      expiry,
      savedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      legs: activeLegs.map(l => ({ ...l })),
      spotAtSave: currentSpot,
      maxProfit: metrics.maxProfit,
      maxLoss: metrics.maxLoss,
      pop
    };

    setSavedStrategies(prev => [newTemplate, ...prev.filter(s => s.name !== name)]);
    setIsSaveModalOpen(false);
    setDeployNotification(`Strategy "${name}" saved successfully!`);
    setTimeout(() => setDeployNotification(null), 4000);
  };

  // Load Saved Strategy
  const handleLoadStrategy = (strategy) => {
    if (strategy && strategy.legs) {
      onUpdateLegs(strategy.legs.map(l => ({ ...l })));
      setStrategyName(strategy.name || '');
      setActiveTab('builder');
      setDeployNotification(`Loaded strategy "${strategy.name}"!`);
      setTimeout(() => setDeployNotification(null), 3000);
    }
  };

  // Delete Saved Strategy
  const handleDeleteSavedStrategy = (id) => {
    setSavedStrategies(prev => prev.filter(s => s.id !== id));
  };

  // Deploy paper trade into active portfolio
  const handleDeployTrade = () => {
    if (!activeLegs || activeLegs.length === 0) return;
    const name = strategyName.trim() || `${symbol} ${activeLegs.length}-Leg Trade`;

    const newTrade = {
      id: `PT-${Date.now()}`,
      name,
      symbol,
      expiry,
      spotAtEntry: currentSpot,
      deployedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      legs: enrichedLegs.map(l => ({ ...l })),
      requiredMargin,
      maxProfit: metrics.maxProfit,
      maxLoss: metrics.maxLoss,
      pop,
      realizedPnl: 0,
      status: 'OPEN'
    };

    setDeployedTrades(prev => [newTrade, ...prev]);
    setDeployNotification(`Paper Strategy "${name}" deployed with ${activeLegs.length} legs!`);
    setTimeout(() => setDeployNotification(null), 4000);
    setActiveTab('deployed');
    setExpandedTradeId(newTrade.id);
    // Clear builder legs
    onUpdateLegs([]);
    setStrategyName('');
  };

  // Edit Deployed Trade in Builder (Load legs into Builder to add new strikes)
  const handleEditTradeInBuilder = (trade) => {
    if (!trade || !trade.legs) return;
    onUpdateLegs(trade.legs.map(l => ({ ...l })));
    setStrategyName(trade.name || '');
    setActiveTab('builder');
    setDeployNotification(`Loaded "${trade.name}" into Builder! You can now add/remove strikes or adjust prices.`);
    setTimeout(() => setDeployNotification(null), 4000);
  };

  // Partial Booking on a Deployed Leg
  const handleBookPartialLot = (tradeId, legIndex, deltaLots = 1) => {
    setDeployedTrades(prevTrades => {
      return prevTrades.map(trade => {
        if (trade.id !== tradeId) return trade;
        const currentLeg = trade.legs[legIndex];
        if (!currentLeg) return trade;

        const lotsToBook = Math.min(deltaLots, currentLeg.lots);
        const key = `${currentLeg.strike}_${currentLeg.type}`;
        const liveLtp = quotesMap[key] !== undefined ? quotesMap[key] : (currentLeg.currentLtp || currentLeg.entryPrice);
        const qty = lotsToBook * (currentLeg.lotSize || 50);
        const bookedPnl = currentLeg.action === 'BUY'
          ? (liveLtp - currentLeg.entryPrice) * qty
          : (currentLeg.entryPrice - liveLtp) * qty;

        const remainingLots = currentLeg.lots - lotsToBook;
        let updatedLegs = [...trade.legs];

        if (remainingLots <= 0) {
          updatedLegs = updatedLegs.filter((_, idx) => idx !== legIndex);
        } else {
          updatedLegs[legIndex] = { ...currentLeg, lots: remainingLots };
        }

        const newRealized = Math.round((trade.realizedPnl || 0) + bookedPnl);
        setDeployNotification(`Booked ${lotsToBook} lot(s) on ₹${currentLeg.strike} ${currentLeg.type}! Realized: ${bookedPnl >= 0 ? '+' : ''}₹${Math.round(bookedPnl)}`);
        setTimeout(() => setDeployNotification(null), 4000);

        return {
          ...trade,
          legs: updatedLegs,
          realizedPnl: newRealized
        };
      }).filter(trade => trade.legs.length > 0);
    });
  };

  // Square off deployed position completely
  const handleSquareOff = (tradeId) => {
    setDeployedTrades(prev => prev.filter(t => t.id !== tradeId));
    setDeployNotification(`Position squared off successfully!`);
    setTimeout(() => setDeployNotification(null), 3000);
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
            : 'inset-x-0 bottom-0 max-h-[82vh] h-[520px]'
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
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'saved'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Saved ({savedStrategies.length})</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1.5">
          {activeTab === 'builder' && activeLegs.length > 0 && (
            <>
              <button
                onClick={() => setIsSaveModalOpen(true)}
                className="px-2 py-0.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                title="Save this strategy with custom name"
              >
                <span>💾 Save Strategy</span>
              </button>
              <button
                onClick={handleClearAll}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear all active strategy legs"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            </>
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

      {/* Notification Toast */}
      {deployNotification && (
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 border-b border-indigo-500/50 px-3 py-1.5 text-xs text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{deployNotification}</span>
          </div>
          <button onClick={() => setDeployNotification(null)} className="text-slate-400 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Body */}
      {(!isMinimized || isDocked) && (
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-900">
          {activeTab === 'builder' ? (
            <div className={`flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 flex flex-col`}>
              {/* Strategy Name Banner Input */}
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 px-2.5 rounded-xl border border-slate-800 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Strategy Name:</span>
                <input
                  type="text"
                  placeholder={`e.g., ${symbol} Bull Call Spread / Iron Condor`}
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-semibold"
                />
                {activeLegs.length > 0 && (
                  <button
                    onClick={handleSaveStrategy}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer shrink-0"
                    title="Save strategy with this name"
                  >
                    Save
                  </button>
                )}
              </div>

              {/* 1. Key Metrics Strip (Single Row: 4 Columns on standard screens) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
                {/* 1. Required Margin */}
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Required Margin
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-cyan-300">
                    ₹{requiredMargin.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-slate-500 block">NSE SPAN + Hedge</span>
                </div>

                {/* 2. Live PnL */}
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Live Strategy P&L
                  </span>
                  <span className={`text-xs sm:text-sm font-black font-mono ${liveStrategyPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {liveStrategyPnl >= 0 ? '+' : ''}₹{liveStrategyPnl.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Realtime 1s</span>
                </div>

                {/* 3. Max Profit */}
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

                {/* 4. Max Loss & POP */}
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
                  <div className="flex items-center gap-2">
                    <span>Strategy Legs ({enrichedLegs.length})</span>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                      {strategyAssetSymbol}
                    </span>
                  </div>
                  {activeLegs.length > 0 && (
                    <span className="text-[11px] text-slate-400 font-mono font-normal">
                      Spot: ₹{strategyAssetSpot.toLocaleString('en-IN')}
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

                        {/* Editable Entry Price Input */}
                        <div className="flex items-center gap-0.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800" title="Custom Entry Price (₹)">
                          <span className="text-[9px] text-slate-400 font-bold">Entry:₹</span>
                          <input
                            type="number"
                            step="0.05"
                            value={leg.entryPrice !== undefined ? leg.entryPrice : leg.currentLtp}
                            onChange={(e) => handleUpdateEntryPrice(index, e.target.value)}
                            className="w-14 bg-transparent text-white font-mono font-bold text-xs focus:outline-none text-right border-b border-indigo-500/40 focus:border-indigo-400"
                            title="Edit your execution / entry price"
                          />
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

              {/* 3. Interactive Payoff Chart with Drag-to-Zoom & T+0 Blue Curve */}
              <div className="flex-1 flex flex-col min-h-[220px]">
                <div className="flex items-center justify-between mb-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider text-[11px]">
                    <PieChart className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Payoff Analysis ({strategyAssetSymbol} Spot ₹{strategyAssetSpot.toLocaleString('en-IN')})</span>
                  </div>
                  {metrics.breakevens && metrics.breakevens.length > 0 && (
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      BE: {metrics.breakevens.map(b => `₹${Math.round(b)}`).join(', ')}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-h-[200px]">
                  <PayoffChart 
                    legs={enrichedLegs} 
                    currentSpot={strategyAssetSpot} 
                    symbol={strategyAssetSymbol}
                    height={220} 
                  />
                </div>
              </div>

              {/* 4. Action Buttons (Save & Deploy) */}
              <div className="flex items-center gap-2 shrink-0 mt-auto">
                <button
                  onClick={() => setIsSaveModalOpen(true)}
                  disabled={enrichedLegs.length === 0}
                  className="w-1/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-purple-900/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Save this strategy with custom name"
                >
                  <span>💾 Save</span>
                </button>
                <button
                  onClick={handleDeployTrade}
                  disabled={enrichedLegs.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-200" />
                  <span>Deploy Paper Trade ({enrichedLegs.length} Legs)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : activeTab === 'deployed' ? (
            /* Deployed Paper Portfolio Tab */
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Actively Running Positions ({deployedWithLivePnl.length})
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
                <div className="space-y-3">
                  {deployedWithLivePnl.map((trade) => {
                    const isExpanded = expandedTradeId === trade.id;
                    return (
                      <div 
                        key={trade.id}
                        className={`rounded-xl bg-slate-950 border transition-all shadow-lg overflow-hidden ${
                          isExpanded ? 'border-indigo-500/60 ring-1 ring-indigo-500/30' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Interactive Clickable Card Header */}
                        <div 
                          onClick={() => setExpandedTradeId(isExpanded ? null : trade.id)}
                          className="p-3 bg-slate-900/60 hover:bg-slate-900/90 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-800/80"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                              {trade.legs.length}L
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">{trade.name}</span>
                                <span className="text-cyan-300 font-mono text-[11px]">{trade.symbol}</span>
                                <span className="text-slate-500 text-[10px]">{trade.expiry}</span>
                              </div>
                              <span className="text-slate-500 text-[10px]">Deployed @ {trade.deployedAt}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block">Total P&L</span>
                              <span className={`font-mono font-black text-sm ${trade.livePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {trade.livePnl >= 0 ? '+' : ''}₹{trade.livePnl.toLocaleString('en-IN')}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTradeInBuilder(trade);
                                }}
                                className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Load this trade into Strategy Builder to add new strikes, modify legs, or rebalance"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit / Add Strikes</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSquareOff(trade.id);
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                                title="Exit all legs immediately"
                              >
                                Exit All
                              </button>

                              <div className="p-1 text-slate-400">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Collapsed Mini-Preview */}
                        {!isExpanded && (
                          <div className="p-2.5 px-3 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/40">
                            <div className="flex items-center gap-3">
                              {trade.legs.map((leg, i) => (
                                <span key={i} className="flex items-center gap-1">
                                  <span className={leg.action === 'BUY' ? 'text-blue-400 font-bold' : 'text-rose-400 font-bold'}>{leg.action}</span>
                                  <span>₹{leg.strike}{leg.type}</span>
                                  <span className="text-slate-500">({leg.lots}L)</span>
                                </span>
                              ))}
                            </div>
                            <span className="text-indigo-300 text-[10px] font-sans font-semibold">Click to view Payoff Chart & Partial Booking</span>
                          </div>
                        )}

                        {/* Expanded Full Details & Live Chart & Partial Booking */}
                        {isExpanded && (
                          <div className="p-3 space-y-3 bg-slate-950">
                            {/* Summary Metrics Row for this Deployed Trade */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-bold">Required Margin</span>
                                <span className="font-mono font-bold text-cyan-300">₹{trade.requiredMargin?.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-bold">Open P&L</span>
                                <span className={`font-mono font-bold ${trade.openPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {trade.openPnl >= 0 ? '+' : ''}₹{trade.openPnl?.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-bold">Booked P&L</span>
                                <span className={`font-mono font-bold ${(trade.realizedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {(trade.realizedPnl || 0) >= 0 ? '+' : ''}₹{(trade.realizedPnl || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-bold">POP & Max Profit</span>
                                <span className="font-mono text-slate-200">{trade.pop}% | <b className="text-emerald-400">{typeof trade.maxProfit === 'number' ? `₹${trade.maxProfit}` : trade.maxProfit}</b></span>
                              </div>
                            </div>

                            {/* Live Interactive Payoff Curve for Deployed Trade */}
                            <div className="rounded-xl border border-slate-800 p-2 bg-slate-900/80">
                              <div className="flex items-center justify-between mb-1.5 px-1">
                                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                  <PieChart className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Live Strategy Payoff Curve (Drag to Zoom)</span>
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">Current Spot: ₹{(trade.currentSpot || currentSpot).toLocaleString('en-IN')}</span>
                              </div>
                              <PayoffChart 
                                legs={trade.legs} 
                                currentSpot={trade.currentSpot || currentSpot} 
                                symbol={trade.symbol} 
                                height={200} 
                              />
                            </div>

                            {/* Deployed Legs Breakdown & Partial Booking Controls */}
                            <div className="space-y-1.5">
                              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider px-1">
                                Active Position Legs ({trade.legs.length})
                              </div>
                              {trade.legs.map((leg, i) => (
                                <div 
                                  key={i} 
                                  className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/90 flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded font-black text-[10px] ${leg.action === 'BUY' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' : 'bg-rose-600/30 text-rose-300 border border-rose-500/30'}`}>
                                      {leg.action}
                                    </span>
                                    <span className="font-mono font-bold text-white">₹{leg.strike}</span>
                                    <span className={`px-1 rounded text-[9px] font-black ${leg.type === 'CE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                      {leg.type}
                                    </span>
                                    <span className="font-mono text-slate-300 text-[11px] font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                                      {leg.lots} Lot{leg.lots > 1 ? 's' : ''} ({leg.lots * (leg.lotSize || 50)} Qty)
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 font-mono text-xs">
                                    <div>
                                      <span className="text-slate-400 text-[10px] block text-right">Entry $\rightarrow$ LTP</span>
                                      <span className="text-slate-300 font-semibold">₹{leg.entryPrice} $\rightarrow$ ₹{leg.currentLtp}</span>
                                    </div>

                                    <div className="text-right min-w-[70px]">
                                      <span className="text-slate-400 text-[10px] block">P&L</span>
                                      <span className={`font-bold ${leg.livePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {leg.livePnl >= 0 ? '+' : ''}₹{leg.livePnl}
                                      </span>
                                    </div>

                                    {/* Partial Booking Button */}
                                    <button
                                      onClick={() => handleBookPartialLot(trade.id, i, 1)}
                                      className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600 border border-amber-500/40 text-amber-300 hover:text-white font-bold text-[10px] transition-all cursor-pointer shadow-sm shrink-0"
                                      title={`Book / Square off 1 Lot of ₹${leg.strike} ${leg.type}`}
                                    >
                                      Book 1 Lot
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Action Footer */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                              <button
                                onClick={() => handleEditTradeInBuilder(trade)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Load in Strategy Builder / Add New Strikes</span>
                              </button>

                              <button
                                onClick={() => handleSquareOff(trade.id)}
                                className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Square Off Entire Strategy</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Saved Strategies Tab */
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 font-bold text-sm">💾</span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Saved Strategy Templates ({savedStrategies.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">Stored in browser localStorage</span>
              </div>

              {savedStrategies.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-slate-500">
                  <span className="text-2xl mb-2">💾</span>
                  <span className="text-xs font-semibold">No saved strategy templates</span>
                  <span className="text-[11px] text-slate-600 mt-1">
                    Build any strategy in the Builder tab and click "Save Strategy" to reuse anytime
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {savedStrategies.map((item) => (
                    <div 
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between shadow-lg hover:border-purple-500/40 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
                          <div>
                            <span className="font-bold text-white block">{item.name}</span>
                            <span className="text-slate-500 text-[10px]">{item.symbol} • Saved {item.savedAt}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteSavedStrategy(item.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                            title="Delete Saved Template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Legs preview */}
                        <div className="space-y-1 mb-2">
                          {(item.legs || []).map((l, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                              <span className={l.action === 'BUY' ? 'text-blue-400 font-bold' : 'text-rose-400 font-bold'}>
                                {l.action} ₹{l.strike} {l.type}
                              </span>
                              <span className="text-slate-400">Entry ₹{l.entryPrice} ({l.lots}L)</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between mt-auto">
                        <span className="text-[10px] text-slate-400 font-mono">POP {item.pop}%</span>
                        <button
                          onClick={() => handleLoadStrategy(item)}
                          className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Load in Builder</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Save Strategy Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>💾 Save Strategy Template</span>
              </h3>
              <button onClick={() => setIsSaveModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Save your configured legs and custom entry prices with a custom name to reuse or analyze anytime.
            </p>
            <form onSubmit={handleSaveStrategy} className="space-y-3">
              <input
                type="text"
                placeholder="Strategy Name (e.g. Iron Fly, Ratio Spread)"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-semibold"
                autoFocus
                required
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-900/30 cursor-pointer"
                >
                  Save Strategy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
