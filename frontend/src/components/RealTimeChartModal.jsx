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

function RealTimeChartModalInner({
  isOpen,
  onClose,
  symbol,
  contractTitle,
  initialLtp,
  isOption = false
}) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  // Resolve official Fyers symbol
  const effectiveSymbol = symbol || 'NSE:NIFTY50-INDEX';

  const [resolution, setResolution] = useState('5'); // Default 5-min
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredCandle, setHoveredCandle] = useState(null);
  const [liveInfo, setLiveInfo] = useState({
    ltp: initialLtp || null,
    change: null,
    fyersTvUrl: `https://trade.fyers.in/?symbol=${effectiveSymbol}`,
    tvUrl: `https://www.tradingview.com/chart/?symbol=${effectiveSymbol}`
  });

  // 1. Fetch candles from our backend
  const loadCandles = useCallback(async (res = resolution, isPolling = false) => {
    if (!effectiveSymbol) return;
    if (!isPolling) setIsLoading(true);
    setError(null);

    try {
      const days = res === '1' ? 1 : (res === 'D' ? 60 : 3);
      const resp = await fetch(`/api/chart/history?symbol=${encodeURIComponent(effectiveSymbol)}&resolution=${res}&days=${days}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      if (data.status === 'success' && data.candles && data.candles.length > 0) {
        // Sort and deduplicate by time
        const sorted = data.candles
          .map(c => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume
          }))
          .sort((a, b) => a.time - b.time);

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
              color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'
            })));
          }
        } catch (seriesErr) {
          console.error('Error applying series data:', seriesErr);
        }

        const lastCandle = unique[unique.length - 1];
        if (lastCandle) {
          setLiveInfo(prev => ({
            ...prev,
            ltp: lastCandle.close,
            fyersTvUrl: data.fyers_tv_url || prev.fyersTvUrl,
            tvUrl: data.tradingview_url || prev.tvUrl
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
  }, [effectiveSymbol, resolution]);

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
          scaleMargins: { top: 0.1, bottom: 0.25 }
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
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        scaleMargins: { top: 0.8, bottom: 0 }
      });

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
        if (data) {
          setHoveredCandle(data);
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
  const activeCandle = hoveredCandle;

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
              </div>
              <p className="text-[11px] text-slate-400 font-mono">{effectiveSymbol}</p>
            </div>
          </div>

          {/* Candlestick OHLC Header Stats */}
          {activeCandle ? (
            <div className="hidden lg:flex items-center gap-3 text-xs font-mono bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">O: <b className="text-white">₹{activeCandle.open?.toFixed(2)}</b></span>
              <span className="text-slate-400">H: <b className="text-emerald-400">₹{activeCandle.high?.toFixed(2)}</b></span>
              <span className="text-slate-400">L: <b className="text-rose-400">₹{activeCandle.low?.toFixed(2)}</b></span>
              <span className="text-slate-400">C: <b className="text-white">₹{activeCandle.close?.toFixed(2)}</b></span>
            </div>
          ) : (
            liveInfo.ltp && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">LTP:</span>
                <span className="text-lg font-black font-mono text-emerald-400">₹{liveInfo.ltp.toLocaleString('en-IN')}</span>
              </div>
            )
          )}

          {/* Timeframe Selector & Actions */}
          <div className="flex items-center gap-2">
            {/* Resolutions */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
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
              <p className="text-xs font-semibold text-slate-300">Loading Fyers 0-Delay Candlesticks...</p>
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

          <div ref={chartContainerRef} className="w-full h-full" />
        </div>

        {/* Modal Bottom Strip */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Timezone: <b>IST (UTC+5:30)</b> • Live Candlesticks updating every 3s via Fyers WebSocket & API</span>
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
