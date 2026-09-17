import React, { useEffect, useRef, useState, useCallback, Component } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { X, ExternalLink, RefreshCw, Maximize2, Zap, Clock, AlertTriangle } from 'lucide-react';

export class ChartErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Chart component error caught by boundary:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="p-6 bg-slate-900 border border-slate-700 rounded-2xl text-center max-w-md shadow-2xl text-slate-100">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h3 className="text-base font-bold mb-2">Unable to render in-app chart canvas</h3>
            <p className="text-xs text-slate-400 mb-4">
              Your browser was unable to initialize the canvas engine. You can still view this contract with zero delay directly on Fyers TradingView.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button 
                onClick={() => this.setState({ hasError: false })} 
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all"
              >
                Retry
              </button>
              <button 
                onClick={this.props.onClose} 
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function toTradingViewSymbol(sym) {
  if (!sym) return 'NSE:NIFTY';
  const clean = sym.trim();
  if (clean === 'NSE:NIFTY50-INDEX' || clean === 'NSE:NIFTY-INDEX' || clean === 'NIFTY') return 'NSE:NIFTY';
  if (clean === 'NSE:NIFTYBANK-INDEX' || clean === 'NSE:BANKNIFTY-INDEX' || clean === 'BANKNIFTY') return 'NSE:BANKNIFTY';
  if (clean === 'NSE:FINNIFTY-INDEX' || clean === 'FINNIFTY') return 'NSE:CNXFINANCE';
  if (clean === 'NSE:MIDCPNIFTY-INDEX' || clean === 'MIDCPNIFTY') return 'NSE:MIDCPNIFTY';
  if (clean === 'NSE:NIFTYNEXT50-INDEX' || clean === 'NSE:NIFTYNXT50-INDEX' || clean === 'NIFTYNXT50') return 'NSE:NIFTYNEXT50';
  if (clean === 'BSE:SENSEX-INDEX' || clean === 'SENSEX') return 'BSE:SENSEX';
  if (clean === 'BSE:BANKEX-INDEX' || clean === 'BANKEX') return 'BSE:BANKEX';
  if (clean.includes('-INDEX')) {
    return clean.replace('-INDEX', '');
  }
  if (clean.includes('-EQ')) {
    return clean.replace('-EQ', '');
  }
  // Fyers option format: NSE:NIFTY2692223050CE -> TV format: NSE:NIFTY260922C23050
  const m = clean.match(/^(NSE|BSE):([A-Z]+)(\d{2})([1-9OND])(\d{2})(\d+)(CE|PE)$/);
  if (m) {
    const [, ex, root, yy, mCode, dd, strike, opt] = m;
    const monthMap = { '1': '01', '2': '02', '3': '03', '4': '04', '5': '05', '6': '06', '7': '07', '8': '08', '9': '09', 'O': '10', 'N': '11', 'D': '12' };
    const mm = monthMap[mCode] || '09';
    const optCode = opt === 'CE' ? 'C' : 'P';
    return `${ex}:${root}${yy}${mm}${dd}${optCode}${strike}`;
  }
  return clean;
}

function RealTimeChartModalInner({
  isOpen,
  onClose,
  symbol,
  contractTitle,
  initialLtp,
  isOption = false,
  underlyingChange = null,
  underlyingPchange = null
}) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  // Resolve official Fyers symbol
  const effectiveSymbol = symbol || 'NSE:NIFTY50-INDEX';
  const tvSymbol = toTradingViewSymbol(effectiveSymbol);

  // Indian Standard Time (IST is UTC +5:30 = +19,800 seconds)
  const IST_OFFSET_SECONDS = 19800;

  const [resolution, setResolution] = useState('5'); // Default 5-min
  const [showVolume, setShowVolume] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredCandle, setHoveredCandle] = useState(null);
  const [latestCandle, setLatestCandle] = useState(null);
  const lastCandleRef = useRef(null);
  const [currentIstTime, setCurrentIstTime] = useState(() => {
    return new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  });

  // Keep live current IST clock ticking every second
  useEffect(() => {
    const updateTimer = () => {
      setCurrentIstTime(new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const [liveInfo, setLiveInfo] = useState({
    ltp: initialLtp || null,
    change: underlyingChange,
    pchange: underlyingPchange,
    fyersTvUrl: `https://trade.fyers.in/?symbol=${encodeURIComponent(effectiveSymbol)}`,
    tvUrl: `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`
  });

  // 1. Fetch candles from our backend
  const loadCandles = useCallback(async (res = resolution, isPolling = false) => {
    if (!effectiveSymbol) return;
    if (!isPolling) setIsLoading(true);
    setError(null);

    try {
      const days = res === '1' ? 1 : (res === 'D' ? 30 : 3);
      const resp = await fetch(`/api/chart/history?symbol=${encodeURIComponent(effectiveSymbol)}&resolution=${res}&days=${days}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      if (data.status === 'success' && data.candles && data.candles.length > 0) {
        // Sort and deduplicate by time (adjusted to Indian Standard Time IST)
        const sorted = data.candles
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

        // Remove duplicate timestamps if any
        const unique = [];
        const seen = new Set();
        for (const item of sorted) {
          if (!seen.has(item.time)) {
            seen.add(item.time);
            unique.push(item);
          }
        }

        try {
          if (candleSeriesRef.current) {
            candleSeriesRef.current.setData(unique);
          }

          if (volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(unique.map(c => ({
              time: c.time,
              value: c.volume,
              color: c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
            })));
          }
        } catch (seriesErr) {
          console.error('Error applying series data:', seriesErr);
        }

        const lastCandle = unique[unique.length - 1];
        if (lastCandle) {
          lastCandleRef.current = lastCandle;
          setLatestCandle(lastCandle);
          setLiveInfo(prev => ({
            ...prev,
            ltp: lastCandle.close,
            fyersTvUrl: data.fyers_tv_url || prev.fyersTvUrl,
            tvUrl: data.tradingview_url || `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`
          }));
        }
      } else {
        if (!isPolling) setError(data.message || 'No candle data available for this contract');
      }
    } catch (err) {
      if (!isPolling) setError('Failed to load real-time candlestick data');
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  }, [effectiveSymbol, tvSymbol, resolution]);

  // 2. Initialize Lightweight Chart canvas
  useEffect(() => {
    if (!isOpen || !chartContainerRef.current) return;

    // Clean up prior chart
    if (chartInstanceRef.current) {
      try {
        chartInstanceRef.current.remove();
      } catch (e) {
        console.error('Error removing old chart:', e);
      }
      chartInstanceRef.current = null;
    }

    try {
      const chart = createChart(chartContainerRef.current, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: '#090d16' },
          textColor: '#94a3b8',
          fontSize: 12,
          fontFamily: 'system-ui, -apple-system, sans-serif'
        },
        grid: {
          vertLines: { color: 'rgba(30, 41, 59, 0.5)' },
          horzLines: { color: 'rgba(30, 41, 59, 0.5)' }
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
          // Candles strictly stay in top 78% of chart, leaving bottom 22% empty
          scaleMargins: { top: 0.05, bottom: 0.22 }
        },
        overlayPriceScales: {
          // Guaranteed fallback: All overlay scales capped to bottom 15% (under 20% limit)
          scaleMargins: {
            top: 0.85,
            bottom: 0
          }
        }
      });

      // In lightweight-charts v5, use addSeries(CandlestickSeries)
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444'
      });

      // In lightweight-charts v5, use addSeries(HistogramSeries)
      // Dedicated priceScaleId: 'volume_scale' ensures volume is completely independent
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume_scale',
        lastValueVisible: false,
        priceLineVisible: false,
        visible: showVolume
      });

      // Explicitly enforce scale margins on the volume price scale directly
      // top: 0.85 ensures volume bars NEVER cover more than 15% of the chart dialog box (< 20% limit)
      try {
        volumeSeries.priceScale().applyOptions({
          scaleMargins: {
            top: 0.85,
            bottom: 0
          }
        });
      } catch (scaleErr) {
        console.error('Error applying volume scale margins:', scaleErr);
      }

      chartInstanceRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;

      // Crosshair listener for header stats
      chart.subscribeCrosshairMove(param => {
        if (!param || !param.time || !param.seriesData) {
          setHoveredCandle(null);
          return;
        }
        const data = param.seriesData.get(candleSeries);
        const vData = param.seriesData.get(volumeSeries);
        if (data) {
          setHoveredCandle({
            ...data,
            volume: vData?.value,
            time: param.time
          });
        } else {
          setHoveredCandle(null);
        }
      });

      // Initial load
      loadCandles(resolution);
    } catch (chartErr) {
      console.error('Error creating lightweight-chart:', chartErr);
      setError('Unable to render chart canvas. Please click "Full Fyers TradingView" above.');
    }

    return () => {
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.remove();
        } catch (e) {
          console.error('Error removing chart on unmount:', e);
        }
        chartInstanceRef.current = null;
      }
    };
  }, [isOpen, resolution, loadCandles]);

  // 3. Auto-poll live candles every 3 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      loadCandles(resolution, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, resolution, loadCandles]);

  // ESC key dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayTitle = contractTitle || effectiveSymbol.replace('NSE:', '').replace('-INDEX', '').replace('-EQ', '');
  const activeCandle = hoveredCandle || latestCandle || lastCandleRef.current;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Symbol Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">{displayTitle}</h2>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-black flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Fyers Zero-Delay
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] font-bold">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <span>{currentIstTime} IST</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">{effectiveSymbol}</p>
            </div>
          </div>

          {/* Candlestick OHLC Header Stats (Always Visible with persistent last candle data) */}
          {activeCandle ? (
            <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-mono bg-slate-900/90 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-800 shadow-inner">
              {activeCandle.time && (
                <span className="text-indigo-400 font-bold pr-2 border-r border-slate-700 hidden sm:inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <span>
                    {typeof activeCandle.time === 'number'
                      ? new Date(activeCandle.time * 1000).toISOString().substr(11, 5) + ' IST'
                      : activeCandle.time}
                  </span>
                </span>
              )}
              <span className="text-slate-400">O: <b className="text-white">₹{activeCandle.open?.toFixed(2)}</b></span>
              <span className="text-slate-400">H: <b className="text-emerald-400">₹{activeCandle.high?.toFixed(2)}</b></span>
              <span className="text-slate-400">L: <b className="text-rose-400">₹{activeCandle.low?.toFixed(2)}</b></span>
              <span className="text-slate-400">C: <b className="text-white">₹{activeCandle.close?.toFixed(2)}</b></span>
              {activeCandle.volume !== undefined && activeCandle.volume !== null && (
                <span className="text-slate-400 border-l border-slate-700 pl-2 hidden md:inline">
                  Vol: <b className="text-indigo-300">
                    {activeCandle.volume >= 1000000 
                      ? `${(activeCandle.volume / 1000000).toFixed(2)}M`
                      : (activeCandle.volume >= 1000 
                          ? `${(activeCandle.volume / 1000).toFixed(1)}K` 
                          : activeCandle.volume.toLocaleString('en-IN'))}
                  </b>
                </span>
              )}
            </div>
          ) : (
            liveInfo.ltp && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">LTP:</span>
                <span className="text-lg font-black font-mono text-emerald-400">₹{liveInfo.ltp.toLocaleString('en-IN')}</span>
                {liveInfo.change !== null && liveInfo.change !== undefined && (
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border shadow-sm ${
                    liveInfo.change >= 0 
                      ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' 
                      : 'text-rose-400 bg-rose-500/15 border-rose-500/30'
                  }`}>
                    {liveInfo.change >= 0 ? '+' : ''}{liveInfo.change}
                    {liveInfo.pchange !== null && liveInfo.pchange !== undefined && ` (${liveInfo.pchange >= 0 ? '+' : ''}${liveInfo.pchange}%)`}
                  </span>
                )}
              </div>
            )
          )}

          {/* Timeframe Selector & Actions */}
          <div className="flex items-center gap-2">
            {/* Resolutions & Volume Toggle */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs gap-1">
              {[
                { label: '1m', val: '1' },
                { label: '5m', val: '5' },
                { label: '15m', val: '15' },
                { label: '1D', val: 'D' }
              ].map(t => (
                <button
                  key={t.val}
                  onClick={() => setResolution(t.val)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    resolution === t.val
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}

              <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

              <button
                onClick={() => {
                  const next = !showVolume;
                  setShowVolume(next);
                  if (volumeSeriesRef.current) {
                    volumeSeriesRef.current.applyOptions({ visible: next });
                  }
                }}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  showVolume
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Toggle volume bars at the bottom"
              >
                Vol: {showVolume ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Fyers TradingView Popout Button */}
            {liveInfo.fyersTvUrl && (
              <a
                href={liveInfo.fyersTvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950 cursor-pointer"
                title="Open this exact symbol in Fyers Full TradingView Terminal (0-Delay with 100+ Indicators)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Full Fyers TradingView (0 Delay)</span>
              </a>
            )}

            {/* Public TradingView Link */}
            {liveInfo.tvUrl && (
              <a
                href={liveInfo.tvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all border border-slate-700"
                title="Open in public TradingView.com (15 min delayed)"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">TV.com</span>
              </a>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
              title="Close chart (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chart Canvas Area */}
        <div className="flex-1 w-full min-h-0 relative bg-[#090d16]">
          {isLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
              <p className="text-xs font-semibold text-slate-300">Loading chart...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 max-w-md">
                <p className="text-sm font-semibold text-rose-400 mb-2">{error}</p>
                <p className="text-xs text-slate-400 mb-4">You can still open the live chart directly in Fyers TradingView:</p>
                {liveInfo.fyersTvUrl && (
                  <a
                    href={liveInfo.fyersTvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Open in Fyers TradingView</span>
                  </a>
                )}
              </div>
            </div>
          )}

          <div 
            ref={chartContainerRef} 
            onMouseLeave={() => setHoveredCandle(null)}
            className="w-full h-full" 
          />
        </div>

        {/* Modal Bottom Strip */}
        <div className="px-5 py-2 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 shrink-0 gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>IST: <b className="text-white font-mono text-xs">{currentIstTime}</b></span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">ESC</kbd> to exit chart
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RealTimeChartModal(props) {
  if (!props.isOpen) return null;
  return (
    <ChartErrorBoundary onClose={props.onClose}>
      <RealTimeChartModalInner {...props} />
    </ChartErrorBoundary>
  );
}
