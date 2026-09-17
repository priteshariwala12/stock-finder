import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries 
} from 'lightweight-charts';
import { 
  BarChart2, Search, ExternalLink, Zap, Maximize2, 
  Minimize2, RefreshCw, Clock, Activity, Eye, EyeOff, Layers
} from 'lucide-react';
import { 
  toTradingViewSymbol, 
  toFyersSymbol, 
  getTradingViewWebUrl 
} from '../utils/tradingViewSymbols';

const QUICK_CHIPS = [
  { label: 'NIFTY 50', symbol: 'NSE:NIFTY' },
  { label: 'BANK NIFTY', symbol: 'NSE:BANKNIFTY' },
  { label: 'SENSEX', symbol: 'BSE:SENSEX' },
  { label: 'FINNIFTY', symbol: 'NSE:FINNIFTY' },
  { label: 'MIDCAP NIFTY', symbol: 'NSE:MIDCPNIFTY' },
  { label: 'RELIANCE', symbol: 'NSE:RELIANCE' },
  { label: 'HDFC BANK', symbol: 'NSE:HDFCBANK' },
  { label: 'TCS', symbol: 'NSE:TCS' },
  { label: 'TATA MOTORS', symbol: 'NSE:TATAMOTORS' },
  { label: 'INFOSYS', symbol: 'NSE:INFY' }
];

const TIMEFRAMES = [
  { label: '1m', value: '1', days: 1 },
  { label: '3m', value: '3', days: 2 },
  { label: '5m', value: '5', days: 3 },
  { label: '15m', value: '15', days: 7 },
  { label: '1H', value: '60', days: 20 },
  { label: '1D', value: 'D', days: 90 }
];

// Indian Standard Time offset (UTC +5:30 = 19,800 seconds)
const IST_OFFSET_SECONDS = 19800;

function calculateSMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

function calculateEMA(data, period) {
  const result = [];
  const k = 2 / (period + 1);
  let prevEma = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    if (prevEma === null) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[i - j].close;
      prevEma = sum / period;
    } else {
      prevEma = data[i].close * k + prevEma * (1 - k);
    }
    result.push({ time: data[i].time, value: prevEma });
  }
  return result;
}

export default function ChartView({
  symbol = 'NSE:NIFTY',
  displayTitle = 'NIFTY 50',
  initialLtp = null,
  isOption = false,
  expiry = null,
  strike = null,
  optType = 'CE',
  onOpenChart = null
}) {
  const [activeSymbol, setActiveSymbol] = useState(symbol || 'NSE:NIFTY');
  const [activeTitle, setActiveTitle] = useState(displayTitle || 'NIFTY 50');
  const [activeExpiry, setActiveExpiry] = useState(expiry || null);
  const [activeStrike, setActiveStrike] = useState(strike || null);
  const [activeOptType, setActiveOptType] = useState(optType || 'CE');
  const [activeIsOption, setActiveIsOption] = useState(!!isOption);
  const [resolution, setResolution] = useState('5');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Indicators toggle
  const [showVolume, setShowVolume] = useState(true);
  const [showEma20, setShowEma20] = useState(true);
  const [showSma50, setShowSma50] = useState(false);

  // Persistent OHLC: Never hides data, falls back to latest candle
  const [hoveredCandle, setHoveredCandle] = useState(null);
  const [latestCandle, setLatestCandle] = useState(null);
  const lastCandleRef = useRef(null);

  // Chart canvas refs
  const chartWrapperRef = useRef(null);
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const ema20SeriesRef = useRef(null);
  const sma50SeriesRef = useRef(null);

  // Current IST Clock
  const [currentIstTime, setCurrentIstTime] = useState(() => {
    return new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIstTime(new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync props when user clicks another stock or strike anywhere in the website
  useEffect(() => {
    if (symbol) {
      setActiveSymbol(symbol);
      setActiveTitle(displayTitle || symbol);
      setActiveExpiry(expiry || null);
      setActiveStrike(strike || null);
      setActiveOptType(optType || 'CE');
      setActiveIsOption(!!isOption);
    }
  }, [symbol, displayTitle, expiry, strike, optType, isOption]);

  const effectiveFyersSymbol = toFyersSymbol(activeSymbol);
  const effectiveTvSymbol = toTradingViewSymbol(activeSymbol, activeExpiry, activeStrike, activeOptType);
  const tvWebUrl = getTradingViewWebUrl(effectiveTvSymbol);
  const fyersWebUrl = `https://trade.fyers.in/?symbol=${encodeURIComponent(effectiveFyersSymbol)}`;

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!chartWrapperRef.current) return;
    if (!document.fullscreenElement) {
      chartWrapperRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Resize chart on fullscreen toggle
      if (chartInstanceRef.current && chartContainerRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Fetch candle data from backend
  const fetchCandles = useCallback(async (res = resolution, isPolling = false) => {
    if (!effectiveFyersSymbol) return;
    if (!isPolling) setIsLoading(true);
    setErrorMessage(null);

    const tfObj = TIMEFRAMES.find(t => t.value === res);
    const days = tfObj ? tfObj.days : 3;

    try {
      const resp = await fetch(
        `/api/chart/history?symbol=${encodeURIComponent(effectiveFyersSymbol)}&resolution=${res}&days=${days}`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      if (data.status === 'success' && data.candles && data.candles.length > 0) {
        // Adjust timestamps for Indian Standard Time
        const candles = data.candles
          .map(c => {
            const timeVal = res === 'D'
              ? new Date((c.time + IST_OFFSET_SECONDS) * 1000).toISOString().split('T')[0]
              : (c.time + IST_OFFSET_SECONDS);

            return {
              time: timeVal,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume
            };
          })
          .sort((a, b) => (typeof a.time === 'number' ? a.time - b.time : a.time.localeCompare(b.time)));

        // Deduplicate timestamps
        const uniqueCandles = [];
        const seen = new Set();
        for (const item of candles) {
          if (!seen.has(item.time)) {
            seen.add(item.time);
            uniqueCandles.push(item);
          }
        }

        // Apply Candlesticks
        if (candleSeriesRef.current) {
          candleSeriesRef.current.setData(uniqueCandles);
        }

        // Apply Volume
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(
            uniqueCandles.map(c => ({
              time: c.time,
              value: c.volume,
              color: c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
            }))
          );
        }

        // Apply EMA 20
        if (ema20SeriesRef.current) {
          const emaData = calculateEMA(uniqueCandles, 20);
          ema20SeriesRef.current.setData(emaData);
        }

        // Apply SMA 50
        if (sma50SeriesRef.current) {
          const smaData = calculateSMA(uniqueCandles, 50);
          sma50SeriesRef.current.setData(smaData);
        }

        // Record latest candle for persistent OHLC
        const last = uniqueCandles[uniqueCandles.length - 1];
        if (last) {
          lastCandleRef.current = last;
          setLatestCandle(last);
        }
      } else {
        if (!isPolling) {
          setErrorMessage(data.message || 'No candlestick records found for this symbol/contract.');
        }
      }
    } catch (err) {
      if (!isPolling) {
        setErrorMessage('Failed to load chart data. Please retry or click TV.com.');
      }
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  }, [effectiveFyersSymbol, resolution]);

  // Initialize TradingView Lightweight Chart canvas
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up any existing chart
    if (chartInstanceRef.current) {
      try {
        chartInstanceRef.current.remove();
      } catch (e) {
        console.error('Error removing old chart instance:', e);
      }
      chartInstanceRef.current = null;
    }

    try {
      const container = chartContainerRef.current;
      const chart = createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: '#0b0f19' },
          textColor: '#94a3b8',
          fontSize: 12,
          fontFamily: 'system-ui, -apple-system, sans-serif'
        },
        grid: {
          vertLines: { color: 'rgba(30, 41, 59, 0.45)' },
          horzLines: { color: 'rgba(30, 41, 59, 0.45)' }
        },
        crosshair: {
          mode: 1,
          vertLine: { color: '#6366f1', width: 1, style: 2, labelBackgroundColor: '#4f46e5' },
          horzLine: { color: '#6366f1', width: 1, style: 2, labelBackgroundColor: '#4f46e5' }
        },
        timeScale: {
          borderColor: '#334155',
          timeVisible: true,
          secondsVisible: false
        },
        rightPriceScale: {
          borderColor: '#334155',
          scaleMargins: { top: 0.06, bottom: 0.22 }
        },
        overlayPriceScales: {
          scaleMargins: { top: 0.85, bottom: 0 }
        }
      });

      // 1. Candlestick Series
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444'
      });

      // 2. Volume Series (bottom 15% dedicated scale)
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume_scale',
        lastValueVisible: false,
        priceLineVisible: false,
        visible: showVolume
      });

      try {
        volumeSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 }
        });
      } catch (e) {}

      // 3. Technical Indicators: EMA 20 & SMA 50
      const ema20Series = chart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 1.5,
        title: 'EMA 20',
        lastValueVisible: showEma20,
        priceLineVisible: false,
        visible: showEma20
      });

      const sma50Series = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1.5,
        title: 'SMA 50',
        lastValueVisible: showSma50,
        priceLineVisible: false,
        visible: showSma50
      });

      chartInstanceRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;
      ema20SeriesRef.current = ema20Series;
      sma50SeriesRef.current = sma50Series;

      // Crosshair move: update persistent stats
      chart.subscribeCrosshairMove(param => {
        if (!param || !param.time || !param.seriesData) {
          setHoveredCandle(null);
          return;
        }
        const candle = param.seriesData.get(candleSeries);
        const vol = param.seriesData.get(volumeSeries);
        if (candle) {
          setHoveredCandle({
            ...candle,
            volume: vol?.value,
            time: param.time
          });
        } else {
          setHoveredCandle(null);
        }
      });

      // Initial data load
      fetchCandles(resolution);

      // Handle ResizeObserver
      const resizeObserver = new ResizeObserver(entries => {
        if (!entries || entries.length === 0) return;
        const { width, height } = entries[0].contentRect;
        if (chartInstanceRef.current && width > 0 && height > 0) {
          chartInstanceRef.current.applyOptions({ width, height });
        }
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        if (chartInstanceRef.current) {
          try {
            chartInstanceRef.current.remove();
          } catch (e) {}
          chartInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.error('Error creating lightweight-chart:', err);
      setErrorMessage('Unable to initialize chart canvas. Use TV.com button.');
    }
  }, [effectiveFyersSymbol, resolution, fetchCandles]);

  // Toggle Visibility of Indicators dynamically
  useEffect(() => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: showVolume });
    }
  }, [showVolume]);

  useEffect(() => {
    if (ema20SeriesRef.current) {
      ema20SeriesRef.current.applyOptions({ visible: showEma20, lastValueVisible: showEma20 });
    }
  }, [showEma20]);

  useEffect(() => {
    if (sma50SeriesRef.current) {
      sma50SeriesRef.current.applyOptions({ visible: showSma50, lastValueVisible: showSma50 });
    }
  }, [showSma50]);

  // Live Auto-Polling every 3 seconds for zero-delay ticking candles
  useEffect(() => {
    const timer = setInterval(() => {
      fetchCandles(resolution, true);
    }, 3000);
    return () => clearInterval(timer);
  }, [resolution, fetchCandles]);

  // Select Quick Chip
  const handleSelectChip = (chip) => {
    setActiveSymbol(chip.symbol);
    setActiveTitle(chip.label);
    setActiveExpiry(null);
    setActiveStrike(null);
    setActiveOptType('CE');
    setActiveIsOption(false);
    if (onOpenChart) {
      onOpenChart(chip.symbol, chip.label);
    }
  };

  // Search Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim().toUpperCase();
    setActiveSymbol(query);
    setActiveTitle(query);
    setActiveExpiry(null);
    setActiveStrike(null);
    setActiveOptType('CE');
    setActiveIsOption(false);
    setSearchQuery('');
    if (onOpenChart) {
      onOpenChart(query, query);
    }
  };

  // Active Candle for Persistent OHLC Display (never blanks out)
  const activeCandle = hoveredCandle || latestCandle || lastCandleRef.current;
  const candleChange = activeCandle && activeCandle.open 
    ? ((activeCandle.close - activeCandle.open) / activeCandle.open) * 100 
    : 0;
  const isPositive = candleChange >= 0;

  return (
    <div 
      ref={chartWrapperRef}
      className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b0f19] text-slate-100 select-none relative"
    >
      {/* Top Header & Control Toolbar */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 z-20 shadow-lg">
        {/* Left Side: Symbol, Name & Persistent OHLC Header Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Symbol Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm md:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>{activeTitle}</span>
                  <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                    {effectiveTvSymbol}
                  </span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Fyers Live Feed
                </span>
              </div>
            </div>
          </div>

          {/* Persistent OHLCV Header (Always displays data, never hides on pointer exit) */}
          {activeCandle ? (
            <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-800 shadow-inner">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>O:</span>
                <span className="font-bold text-slate-200">{Number(activeCandle.open).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>H:</span>
                <span className="font-bold text-emerald-400">{Number(activeCandle.high).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>L:</span>
                <span className="font-bold text-rose-400">{Number(activeCandle.low).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>C:</span>
                <span className={`font-black ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {Number(activeCandle.close).toFixed(2)}
                </span>
              </div>
              <span className={`px-1.5 py-0.2 rounded font-black text-[10px] ${
                isPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {isPositive ? '+' : ''}{candleChange.toFixed(2)}%
              </span>
              {activeCandle.volume !== undefined && (
                <div className="hidden md:flex items-center gap-1 text-slate-500 pl-1.5 border-l border-slate-800">
                  <span>Vol:</span>
                  <span className="text-slate-300 font-bold">
                    {activeCandle.volume > 1e6 
                      ? (activeCandle.volume / 1e6).toFixed(2) + 'M'
                      : activeCandle.volume > 1e3
                      ? (activeCandle.volume / 1e3).toFixed(1) + 'K'
                      : activeCandle.volume}
                  </span>
                </div>
              )}
            </div>
          ) : null}

          {/* Quick Selection Chips */}
          <div className="hidden 2xl:flex items-center gap-1 pl-2 border-l border-slate-800 overflow-x-auto no-scrollbar py-0.5">
            {QUICK_CHIPS.map(chip => {
              const isActive = activeSymbol === chip.symbol || effectiveTvSymbol === chip.symbol;
              return (
                <button
                  key={chip.symbol}
                  onClick={() => handleSelectChip(chip)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 border border-indigo-500/50'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Search, Timeframe, Overlays, TV.com Button, Fullscreen */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Symbol Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker (e.g. RELIANCE)..."
              className="pl-8 pr-3 py-1 w-32 sm:w-44 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
            />
          </form>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                onClick={() => {
                  setResolution(tf.value);
                  fetchCandles(tf.value);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  resolution === tf.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Switch timeframe to ${tf.label}`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Overlay Toggles: EMA 20, SMA 50, Vol */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setShowEma20(v => !v)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                showEma20 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle EMA 20"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              EMA 20
            </button>
            <button
              onClick={() => setShowSma50(v => !v)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                showSma50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle SMA 50"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              SMA 50
            </button>
            <button
              onClick={() => setShowVolume(v => !v)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                showVolume ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Volume Histogram"
            >
              Vol
            </button>
          </div>

          {/* Live IST Clock */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-300 font-bold">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>{currentIstTime}</span>
          </div>

          {/* TV.com Official Button (Opens that chart on TradingView.com) */}
          <a
            href={tvWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-lg bg-[#2962FF] hover:bg-[#1E53E5] text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-blue-900/40 cursor-pointer"
            title="Open this exact symbol in full TradingView.com (New Tab)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>TV.com</span>
          </a>

          {/* Fyers Direct Terminal Link */}
          <a
            href={fyersWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
            title="Open in Fyers Web Trading Terminal"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fyers</span>
          </a>

          {/* Refresh Button */}
          <button
            onClick={() => fetchCandles(resolution)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
            title="Refresh Candlestick Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Lightweight-Chart Canvas Area */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-[#0b0f19]">
        <div ref={chartContainerRef} className="w-full h-full" />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 backdrop-blur-md text-xs text-indigo-300 shadow-xl pointer-events-none">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>Streaming candles...</span>
          </div>
        )}

        {/* Informative Fallback for Illiquid Contracts / Errors */}
        {errorMessage && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-950/85 backdrop-blur-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
              <BarChart2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Candle Stream for {activeTitle}</h3>
            <p className="text-xs text-slate-400 max-w-md mb-4">{errorMessage}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchCandles(resolution)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
              >
                Retry Stream
              </button>
              <a
                href={tvWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-[#2962FF] hover:bg-[#1E53E5] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-900/40"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in TV.com</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
