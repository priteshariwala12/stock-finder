import React, { useState, useMemo, useRef, useEffect } from 'react';
import { generatePayoffCurve, calculateLegPayoff, calculateLegT0Payoff } from '../utils/optionsAnalytics';
import { RotateCcw, ZoomIn, ZoomOut, Plus, Minus, TrendingUp } from 'lucide-react';

export default function PayoffChart({
  legs = [],
  currentSpot = 23500,
  height = 230,
  symbol = 'NIFTY'
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [zoomDomain, setZoomDomain] = useState(null); // { lower, upper }
  const [dragState, setDragState] = useState(null); // { startSvgX, currentSvgX, isDragging }
  const containerRef = useRef(null);

  // Self-correct spot if strategy legs belong to another asset (e.g. SENSEX 72,000 vs NIFTY 22,700)
  const effectiveSpot = useMemo(() => {
    if (!legs || legs.length === 0) return currentSpot;
    const strikes = legs.map(l => l.strike).filter(Boolean);
    if (strikes.length === 0) return currentSpot;
    const avgStrike = strikes.reduce((a, b) => a + b, 0) / strikes.length;
    // If currentSpot is completely mismatched by > 20% (e.g. 54,000 vs 72,000), anchor to avgStrike
    if (currentSpot && Math.abs(currentSpot - avgStrike) / avgStrike > 0.20) {
      return Math.round(avgStrike);
    }
    return currentSpot;
  }, [legs, currentSpot]);

  // Reset zoom when symbol changes
  useEffect(() => {
    setZoomDomain(null);
  }, [symbol]);

  // Base curve calculation (auto-scaled) with both Expiry and T+0 curves
  const baseCurve = useMemo(() => {
    return generatePayoffCurve(legs, effectiveSpot, 0.08, 120, 5);
  }, [legs, effectiveSpot]);

  const baseLower = baseCurve.lowerBound || (effectiveSpot * 0.94);
  const baseUpper = baseCurve.upperBound || (effectiveSpot * 1.06);

  // Active bounds (zoomed or base)
  const lowerBound = zoomDomain ? zoomDomain.lower : baseLower;
  const upperBound = zoomDomain ? zoomDomain.upper : baseUpper;

  // Recalculate 140 fine-grained points for current visible bound (both Expiry & T+0)
  const points = useMemo(() => {
    if (!legs || legs.length === 0 || lowerBound >= upperBound) return [];
    const pts = [];
    const steps = 140;
    const stepSize = (upperBound - lowerBound) / steps;
    for (let i = 0; i <= steps; i++) {
      const spot = lowerBound + i * stepSize;
      let pnl = 0;
      let t0Pnl = 0;
      for (const leg of legs) {
        pnl += calculateLegPayoff(leg, spot);
        t0Pnl += calculateLegT0Payoff(leg, spot, 5);
      }
      pts.push({ 
        spot: Math.round(spot * 10) / 10, 
        pnl: Math.round(pnl),
        t0Pnl: Math.round(t0Pnl)
      });
    }
    return pts;
  }, [legs, lowerBound, upperBound]);

  // Breakevens from base curve
  const breakevens = baseCurve.breakevens || [];

  // Chart dimensions & margins
  const width = 760;
  const padding = { top: 28, right: 40, bottom: 36, left: 68 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = Math.max(100, height - padding.top - padding.bottom);

  // Compute symmetrical or padded Y-axis domain around 0
  const yDomain = useMemo(() => {
    if (points.length === 0) return { min: -1000, max: 1000 };
    const allPnl = points.flatMap(p => [p.pnl, p.t0Pnl]);
    const minP = Math.min(...allPnl);
    const maxP = Math.max(...allPnl);
    const absMax = Math.max(Math.abs(minP), Math.abs(maxP), 500);
    const padded = Math.ceil((absMax * 1.15) / 100) * 100;
    return { min: -padded, max: padded };
  }, [points]);

  // Coordinate projection functions
  const getX = (spot) => {
    if (upperBound === lowerBound) return padding.left;
    return padding.left + ((spot - lowerBound) / (upperBound - lowerBound)) * plotWidth;
  };

  const getSpotFromSvgX = (svgX) => {
    const clampedX = Math.max(padding.left, Math.min(width - padding.right, svgX));
    const ratio = (clampedX - padding.left) / plotWidth;
    return lowerBound + ratio * (upperBound - lowerBound);
  };

  const getY = (pnl) => {
    const range = yDomain.max - yDomain.min;
    if (range === 0) return padding.top + plotHeight / 2;
    return padding.top + ((yDomain.max - pnl) / range) * plotHeight;
  };

  const zeroY = getY(0);
  const spotX = getX(effectiveSpot);

  // Build SVG path strings for BOTH Expiry and T+0 curves
  const { pathString, t0PathString, fullArea } = useMemo(() => {
    if (!points || points.length === 0) return { pathString: '', t0PathString: '', fullArea: '' };

    // 1. Expiry Payoff Line
    const pts = points.map(p => `${getX(p.spot).toFixed(1)},${getY(p.pnl).toFixed(1)}`);
    const pathString = `M ${pts.join(' L ')}`;

    // 2. T+0 (Today's Live) Blue Line
    const t0Pts = points.map(p => `${getX(p.spot).toFixed(1)},${getY(p.t0Pnl).toFixed(1)}`);
    const t0PathString = `M ${t0Pts.join(' L ')}`;

    // 3. Filled Background Shading for Expiry
    const firstX = getX(points[0].spot);
    const lastX = getX(points[points.length - 1].spot);
    const fullArea = `M ${firstX},${zeroY} L ${pts.join(' L ')} L ${lastX},${zeroY} Z`;

    return { pathString, t0PathString, fullArea };
  }, [points, lowerBound, upperBound, yDomain, zeroY]);

  // Helper to extract SVG X from mouse event
  const getSvgXFromEvent = (e) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    return (mouseX / rect.width) * width;
  };

  // Explicit Zoom In / Out / Reset button handlers
  const handleZoomIn = (e) => {
    e?.stopPropagation();
    const range = upperBound - lowerBound;
    if (range <= 40) return;
    const mid = (lowerBound + upperBound) / 2;
    const newHalfRange = (range * 0.70) / 2;
    setZoomDomain({
      lower: Math.round(mid - newHalfRange),
      upper: Math.round(mid + newHalfRange)
    });
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation();
    const range = upperBound - lowerBound;
    const mid = (lowerBound + upperBound) / 2;
    const newHalfRange = (range * 1.35) / 2;
    setZoomDomain({
      lower: Math.round(mid - newHalfRange),
      upper: Math.round(mid + newHalfRange)
    });
  };

  const handleResetZoom = (e) => {
    e?.stopPropagation();
    setZoomDomain(null);
  };

  // Mouse Down -> Start Drag Zoom
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Left click only
    const svgX = getSvgXFromEvent(e);
    if (svgX >= padding.left && svgX <= width - padding.right) {
      setDragState({
        startSvgX: svgX,
        currentSvgX: svgX,
        isDragging: true
      });
    }
  };

  // Mouse Move -> Crosshair & Drag Zoom update
  const handleMouseMove = (e) => {
    const svgX = getSvgXFromEvent(e);

    if (dragState?.isDragging) {
      setDragState(prev => prev ? { ...prev, currentSvgX: svgX } : null);
      setHoveredPoint(null);
      return;
    }

    if (svgX < padding.left || svgX > width - padding.right || points.length === 0) {
      setHoveredPoint(null);
      return;
    }

    const estimatedSpot = getSpotFromSvgX(svgX);
    let closest = points[0];
    let minDiff = Infinity;
    for (const p of points) {
      const diff = Math.abs(p.spot - estimatedSpot);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    setHoveredPoint(closest);
  };

  // Mouse Up -> Complete Drag Zoom
  const handleMouseUp = () => {
    if (dragState?.isDragging) {
      const startX = dragState.startSvgX;
      const endX = dragState.currentSvgX;
      const dragDistance = Math.abs(endX - startX);

      if (dragDistance >= 15) {
        const spot1 = getSpotFromSvgX(Math.min(startX, endX));
        const spot2 = getSpotFromSvgX(Math.max(startX, endX));
        if (spot2 - spot1 >= 15) {
          setZoomDomain({
            lower: Math.round(spot1),
            upper: Math.round(spot2)
          });
        }
      }
      setDragState(null);
    }
  };

  const handleMouseLeave = () => {
    if (dragState?.isDragging) {
      handleMouseUp();
    }
    setHoveredPoint(null);
  };

  const handleDoubleClick = () => {
    setZoomDomain(null);
  };

  // Format currency
  const fmtCurrency = (val) => {
    if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    if (Math.abs(val) >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${Math.round(val)}`;
  };

  if (!legs || legs.length === 0) {
    return (
      <div 
        className="w-full flex flex-col items-center justify-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-slate-500 py-10"
        style={{ height }}
      >
        <span className="text-xs font-semibold">No active strategy legs</span>
        <span className="text-[11px] text-slate-600 mt-1">
          Click <b className="text-blue-400">B</b> (Buy) or <b className="text-rose-400">S</b> (Sell) on any strike to view payoff
        </span>
      </div>
    );
  }

  // Calculate drag selection rectangle bounds
  const dragRect = dragState?.isDragging ? {
    x: Math.min(dragState.startSvgX, dragState.currentSvgX),
    width: Math.abs(dragState.currentSvgX - dragState.startSvgX),
    startSpot: Math.round(getSpotFromSvgX(Math.min(dragState.startSvgX, dragState.currentSvgX))),
    endSpot: Math.round(getSpotFromSvgX(Math.max(dragState.startSvgX, dragState.currentSvgX)))
  } : null;

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      className="relative w-full select-none bg-slate-950/90 rounded-xl border border-slate-800 p-2 overflow-hidden shadow-inner cursor-crosshair group"
      title="Click and drag horizontally to Zoom. Blue Line = T+0 (Today's Live P&L) • Cyan = Expiry P&L"
    >
      {/* Legend & Zoom Toolbar */}
      <div className="absolute top-2 left-3 right-2 z-20 flex items-center justify-between pointer-events-none">
        {/* Curve Legend */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 px-2 py-0.5 rounded-lg text-[10px] font-mono shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-500 rounded-full inline-block"></span>
            <span className="text-blue-400 font-bold">T+0 (Today)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400 rounded-full inline-block"></span>
            <span className="text-cyan-300 font-bold">Expiry</span>
          </div>
        </div>

        {/* Small Zoom Controls (Zoom In, Zoom Out, Reset) */}
        <div className="flex items-center gap-1 bg-slate-900/95 border border-slate-700 rounded-lg p-0.5 shadow-lg backdrop-blur-sm pointer-events-auto">
          <button
            onClick={handleZoomIn}
            className="p-1 px-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors flex items-center justify-center font-bold text-xs cursor-pointer"
            title="Zoom In (+)"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 px-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors flex items-center justify-center font-bold text-xs cursor-pointer"
            title="Zoom Out (-)"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={handleResetZoom}
            className={`p-1 px-1.5 rounded text-[10px] transition-colors flex items-center gap-1 cursor-pointer ${
              zoomDomain 
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-sm' 
                : 'hover:bg-slate-800 text-slate-400 hover:text-white font-semibold'
            }`}
            title="Reset Zoom to full range (↺)"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
      >
        <defs>
          {/* Gradient for Profit Zone */}
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>

          {/* Gradient for Loss Zone */}
          <linearGradient id="lossGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
          </linearGradient>

          {/* Clip paths for split above/below zeroY */}
          <clipPath id="aboveZeroClip">
            <rect x={padding.left} y={padding.top} width={plotWidth} height={Math.max(0, zeroY - padding.top)} />
          </clipPath>
          <clipPath id="belowZeroClip">
            <rect x={padding.left} y={zeroY} width={plotWidth} height={Math.max(0, height - padding.bottom - zeroY)} />
          </clipPath>
        </defs>

        {/* Background Grid Lines */}
        <g className="opacity-15">
          <line x1={padding.left} y1={padding.top + plotHeight * 0.25} x2={width - padding.right} y2={padding.top + plotHeight * 0.25} stroke="#94a3b8" strokeDasharray="3 3" />
          <line x1={padding.left} y1={padding.top + plotHeight * 0.75} x2={width - padding.right} y2={padding.top + plotHeight * 0.75} stroke="#94a3b8" strokeDasharray="3 3" />
        </g>

        {/* Profit Fill (Clipped above zero line) */}
        <path
          d={fullArea}
          fill="url(#profitGrad)"
          clipPath="url(#aboveZeroClip)"
        />

        {/* Loss Fill (Clipped below zero line) */}
        <path
          d={fullArea}
          fill="url(#lossGrad)"
          clipPath="url(#belowZeroClip)"
        />

        {/* Zero PnL Reference Line */}
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="#64748b"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <text
          x={padding.left - 8}
          y={zeroY + 3.5}
          textAnchor="end"
          className="text-[10px] fill-slate-400 font-mono font-bold"
        >
          ₹0
        </text>

        {/* Current Spot Vertical Line */}
        {spotX >= padding.left && spotX <= width - padding.right && (
          <g>
            <line
              x1={spotX}
              y1={padding.top}
              x2={spotX}
              y2={height - padding.bottom}
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            {/* Spot Flag */}
            <rect
              x={spotX - 42}
              y={padding.top - 18}
              width="84"
              height="16"
              rx="4"
              fill="#0369a1"
              opacity="0.95"
            />
            <text
              x={spotX}
              y={padding.top - 6}
              textAnchor="middle"
              className="text-[9px] fill-cyan-100 font-mono font-black"
            >
              Spot ₹{effectiveSpot.toLocaleString('en-IN')}
            </text>
          </g>
        )}

        {/* Breakeven Markers */}
        {breakevens.map((be, idx) => {
          const beX = getX(be);
          if (beX < padding.left || beX > width - padding.right) return null;
          return (
            <g key={idx}>
              <line
                x1={beX}
                y1={padding.top + 10}
                x2={beX}
                y2={height - padding.bottom}
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              <circle cx={beX} cy={zeroY} r="3.5" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
              <text
                x={beX}
                y={height - padding.bottom + 14}
                textAnchor="middle"
                className="text-[9px] fill-amber-400 font-mono font-bold"
              >
                BE: ₹{Math.round(be).toLocaleString('en-IN')}
              </text>
            </g>
          );
        })}

        {/* 1. T+0 (Today's Live P&L) Blue Curve */}
        <path
          d={t0PathString}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="5 3"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* 2. Expiry Payoff Curve Line (Cyan) */}
        <path
          d={pathString}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Drag Selection Overlay */}
        {dragRect && dragRect.width > 2 && (
          <g>
            <rect
              x={dragRect.x}
              y={padding.top}
              width={dragRect.width}
              height={plotHeight}
              fill="#38bdf8"
              fillOpacity="0.2"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <rect
              x={dragRect.x + dragRect.width / 2 - 45}
              y={padding.top + plotHeight / 2 - 10}
              width="90"
              height="20"
              rx="4"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="1"
            />
            <text
              x={dragRect.x + dragRect.width / 2}
              y={padding.top + plotHeight / 2 + 4}
              textAnchor="middle"
              className="text-[9px] fill-cyan-200 font-mono font-bold"
            >
              ₹{dragRect.startSpot} - ₹{dragRect.endSpot}
            </text>
          </g>
        )}

        {/* Y-Axis Labels: Max & Min */}
        <text
          x={padding.left - 8}
          y={padding.top + 10}
          textAnchor="end"
          className="text-[10px] fill-emerald-400 font-mono font-bold"
        >
          +{fmtCurrency(yDomain.max)}
        </text>
        <text
          x={padding.left - 8}
          y={height - padding.bottom - 4}
          textAnchor="end"
          className="text-[10px] fill-rose-400 font-mono font-bold"
        >
          -{fmtCurrency(Math.abs(yDomain.min))}
        </text>

        {/* X-Axis Range Labels */}
        <text
          x={padding.left}
          y={height - padding.bottom + 28}
          textAnchor="start"
          className="text-[10px] fill-slate-400 font-mono font-semibold"
        >
          ₹{Math.round(lowerBound).toLocaleString('en-IN')}
        </text>
        <text
          x={width - padding.right}
          y={height - padding.bottom + 28}
          textAnchor="end"
          className="text-[10px] fill-slate-400 font-mono font-semibold"
        >
          ₹{Math.round(upperBound).toLocaleString('en-IN')}
        </text>

        {/* Interactive Mouse Hover Crosshair */}
        {hoveredPoint && !dragState?.isDragging && (
          <g>
            <line
              x1={getX(hoveredPoint.spot)}
              y1={padding.top}
              x2={getX(hoveredPoint.spot)}
              y2={height - padding.bottom}
              stroke="#ffffff"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.6"
            />
            {/* T+0 Dot */}
            <circle
              cx={getX(hoveredPoint.spot)}
              cy={getY(hoveredPoint.t0Pnl)}
              r="4"
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            {/* Expiry Dot */}
            <circle
              cx={getX(hoveredPoint.spot)}
              cy={getY(hoveredPoint.pnl)}
              r="4.5"
              fill={hoveredPoint.pnl >= 0 ? '#10b981' : '#f43f5e'}
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Floating Hover Tooltip Card (Shows BOTH T+0 Today's P&L and Expiry P&L) */}
      {hoveredPoint && !dragState?.isDragging && (
        <div
          className="absolute z-30 pointer-events-none bg-slate-900/95 border border-slate-700 backdrop-blur-md rounded-xl p-2.5 shadow-2xl text-[11px] font-mono transform -translate-x-1/2 min-w-[170px]"
          style={{
            left: `${Math.min(85, Math.max(15, ((getX(hoveredPoint.spot) / width) * 100)))}%`,
            top: '32px'
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
            <span className="text-slate-400 text-[10px]">At Spot:</span>
            <div className="flex items-center gap-1 font-bold text-white">
              <span>₹{Math.round(hoveredPoint.spot).toLocaleString('en-IN')}</span>
              <span className={`text-[9px] ${hoveredPoint.spot >= effectiveSpot ? 'text-emerald-400' : 'text-rose-400'}`}>
                ({hoveredPoint.spot >= effectiveSpot ? '+' : ''}
                {(((hoveredPoint.spot - effectiveSpot) / effectiveSpot) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-blue-300">
              <span className="text-slate-400 text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                <span>T+0 (Today):</span>
              </span>
              <span className={`font-black text-xs ${hoveredPoint.t0Pnl >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                {hoveredPoint.t0Pnl >= 0 ? '+' : ''}₹{hoveredPoint.t0Pnl.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400 text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>
                <span>At Expiry:</span>
              </span>
              <span className={`font-black text-xs ${hoveredPoint.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {hoveredPoint.pnl >= 0 ? '+' : ''}₹{hoveredPoint.pnl.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
