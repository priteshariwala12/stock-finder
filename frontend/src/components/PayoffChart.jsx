import React, { useState, useMemo, useRef } from 'react';
import { generatePayoffCurve } from '../utils/optionsAnalytics';

export default function PayoffChart({
  legs = [],
  currentSpot = 23500,
  height = 240,
  symbol = 'NIFTY'
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const containerRef = useRef(null);

  // Generate curve points and bounds
  const curveData = useMemo(() => {
    return generatePayoffCurve(legs, currentSpot, 0.08, 120);
  }, [legs, currentSpot]);

  const { points, minPnl, maxPnl, breakevens, lowerBound, upperBound } = curveData;

  // Chart dimensions & margins
  const width = 720;
  const padding = { top: 24, right: 36, bottom: 36, left: 64 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Compute symmetrical or padded Y-axis domain around 0
  const yDomain = useMemo(() => {
    if (points.length === 0) return { min: -1000, max: 1000 };
    const absMax = Math.max(Math.abs(minPnl), Math.abs(maxPnl), 500);
    const padded = Math.ceil((absMax * 1.15) / 100) * 100;
    return { min: -padded, max: padded };
  }, [minPnl, maxPnl, points]);

  // Coordinate projection functions
  const getX = (spot) => {
    if (upperBound === lowerBound) return padding.left;
    return padding.left + ((spot - lowerBound) / (upperBound - lowerBound)) * plotWidth;
  };

  const getY = (pnl) => {
    const range = yDomain.max - yDomain.min;
    if (range === 0) return padding.top + plotHeight / 2;
    // SVG y=0 is top, y=plotHeight is bottom
    return padding.top + ((yDomain.max - pnl) / range) * plotHeight;
  };

  const zeroY = getY(0);
  const spotX = getX(currentSpot);

  // Build SVG path strings
  const { pathString, profitAreaPath, lossAreaPath } = useMemo(() => {
    if (!points || points.length === 0) return { pathString: '', profitAreaPath: '', lossAreaPath: '' };

    // 1. Payoff Line
    const pts = points.map(p => `${getX(p.spot).toFixed(1)},${getY(p.pnl).toFixed(1)}`);
    const pathString = `M ${pts.join(' L ')}`;

    // 2. Split into segments for Profit (>0) and Loss (<0) filled areas
    // To fill correctly to the zero baseline:
    const profitPts = [];
    const lossPts = [];

    // Construct polygon by traversing curve and closing to zeroY
    const firstX = getX(points[0].spot);
    const lastX = getX(points[points.length - 1].spot);

    // Baseline closed path for full polygon
    const fullArea = `M ${firstX},${zeroY} L ${pts.join(' L ')} L ${lastX},${zeroY} Z`;

    return {
      pathString,
      profitAreaPath: fullArea,
      lossAreaPath: fullArea
    };
  }, [points, lowerBound, upperBound, yDomain, zeroY]);

  // Handle interactive mouse crosshair
  const handleMouseMove = (e) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    // Convert mouseX percentage to SVG width
    const svgX = (mouseX / rect.width) * width;

    if (svgX < padding.left || svgX > width - padding.right) {
      setHoveredPoint(null);
      return;
    }

    // Find nearest point
    const ratio = (svgX - padding.left) / plotWidth;
    const estimatedSpot = lowerBound + ratio * (upperBound - lowerBound);

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

  const handleMouseLeave = () => {
    setHoveredPoint(null);
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
          Click <b className="text-blue-400">B</b> (Buy) or <b className="text-rose-400">S</b> (Sell) on any strike to build a strategy and view payoff
        </span>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full select-none bg-slate-950/80 rounded-xl border border-slate-800 p-2 overflow-hidden shadow-inner"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible cursor-crosshair"
      >
        <defs>
          {/* Gradient for Profit Zone */}
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>

          {/* Gradient for Loss Zone */}
          <linearGradient id="lossGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
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
          {/* 3 Horizontal grid lines */}
          <line x1={padding.left} y1={padding.top + plotHeight * 0.25} x2={width - padding.right} y2={padding.top + plotHeight * 0.25} stroke="#94a3b8" strokeDasharray="3 3" />
          <line x1={padding.left} y1={padding.top + plotHeight * 0.75} x2={width - padding.right} y2={padding.top + plotHeight * 0.75} stroke="#94a3b8" strokeDasharray="3 3" />
        </g>

        {/* Profit Fill (Clipped above zero line) */}
        <path
          d={profitAreaPath}
          fill="url(#profitGrad)"
          clipPath="url(#aboveZeroClip)"
        />

        {/* Loss Fill (Clipped below zero line) */}
        <path
          d={lossAreaPath}
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
              x={spotX - 35}
              y={padding.top - 18}
              width="70"
              height="16"
              rx="4"
              fill="#0369a1"
              opacity="0.9"
            />
            <text
              x={spotX}
              y={padding.top - 6}
              textAnchor="middle"
              className="text-[9px] fill-cyan-100 font-mono font-black"
            >
              Spot ₹{currentSpot.toLocaleString('en-IN')}
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

        {/* Payoff Curve Line */}
        <path
          d={pathString}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

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
          className="text-[10px] fill-slate-500 font-mono"
        >
          ₹{lowerBound.toLocaleString('en-IN')}
        </text>
        <text
          x={width - padding.right}
          y={height - padding.bottom + 28}
          textAnchor="end"
          className="text-[10px] fill-slate-500 font-mono"
        >
          ₹{upperBound.toLocaleString('en-IN')}
        </text>

        {/* Interactive Mouse Hover Crosshair */}
        {hoveredPoint && (
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

      {/* Floating Hover Tooltip Card */}
      {hoveredPoint && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900/95 border border-slate-700 backdrop-blur-md rounded-lg p-2 shadow-2xl text-[11px] font-mono transform -translate-x-1/2"
          style={{
            left: `${Math.min(90, Math.max(10, ((getX(hoveredPoint.spot) / width) * 100)))}%`,
            top: '12px'
          }}
        >
          <div className="flex items-center gap-2 border-b border-slate-800 pb-1 mb-1">
            <span className="text-slate-400">At Expiry:</span>
            <span className="font-bold text-white">₹{hoveredPoint.spot.toLocaleString('en-IN')}</span>
            <span className={`text-[10px] ${hoveredPoint.spot >= currentSpot ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({hoveredPoint.spot >= currentSpot ? '+' : ''}
              {(((hoveredPoint.spot - currentSpot) / currentSpot) * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">Projected P&L:</span>
            <span className={`font-black text-xs ${hoveredPoint.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {hoveredPoint.pnl >= 0 ? '+' : ''}₹{hoveredPoint.pnl.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
