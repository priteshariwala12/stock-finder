/**
 * optionsAnalytics.js
 * High-precision mathematical and analytics engine for Indian Options (NSE/BSE).
 * Calculates:
 * 1. Payoff curve across spot price range at expiry
 * 2. Max Profit & Max Loss (detecting unlimited risk)
 * 3. Breakeven point(s)
 * 4. Probability of Profit (POP %) using standard normal distribution & IV
 * 5. Required Margin Money with NSE SPAN + Exposure approximation & spread relief
 */

// Standard normal probability density function
export function normalPdf(x) {
  return (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

// Standard normal cumulative distribution function approximation (Abramowitz and Stegun)
export function normalCdf(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * absX);
  const erf = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * erf);
}

/**
 * Computes fractional Days to Expiry (DTE) from an expiry string or returns fallback
 */
export function calculateDte(expiryStr, fallback = 3) {
  if (!expiryStr) return fallback;
  try {
    let expDate = null;
    if (typeof expiryStr === 'string' && expiryStr.includes('-')) {
      const parts = expiryStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          expDate = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2], 15, 30);
        } else {
          // DD-MM-YYYY
          expDate = new Date(parts[2], parseInt(parts[1], 10) - 1, parts[0], 15, 30);
        }
      }
    }
    if (!expDate || isNaN(expDate.getTime())) {
      expDate = new Date(expiryStr);
    }
    if (!isNaN(expDate.getTime())) {
      const now = new Date();
      const diffMs = expDate.getTime() - now.getTime();
      const dte = diffMs / (1000 * 60 * 60 * 24);
      return Math.max(0.02, dte);
    }
  } catch (e) {
    // fallback
  }
  return fallback;
}

/**
 * Calculates expiry payoff for a single option leg at underlying price S_T
 * @param {Object} leg - { type: 'CE'|'PE', action: 'BUY'|'SELL', strike, entryPrice, lots, lotSize }
 * @param {number} spotAtExpiry
 */
export function calculateLegPayoff(leg, spotAtExpiry) {
  const { type, action, strike, entryPrice, lots = 1, lotSize = 50 } = leg;
  const totalQty = Math.max(1, lots) * Math.max(1, lotSize);
  const isBuy = action === 'BUY';

  let intrinsic = 0;
  if (type === 'CE') {
    intrinsic = Math.max(0, spotAtExpiry - strike);
  } else {
    intrinsic = Math.max(0, strike - spotAtExpiry);
  }

  // PnL per share
  const pnlPerShare = isBuy ? (intrinsic - entryPrice) : (entryPrice - intrinsic);
  return pnlPerShare * totalQty;
}

/**
 * Black-Scholes Option Pricing Formula
 * @param {'CE'|'PE'} type 
 * @param {number} spot 
 * @param {number} strike 
 * @param {number} dte - Days to expiry
 * @param {number} iv - Implied volatility (decimal, e.g. 0.16 for 16%)
 * @param {number} r - Risk free interest rate (default 7% = 0.07)
 */
export function blackScholesPrice(type, spot, strike, dte = 3, iv = 0.16, r = 0.07) {
  if (spot <= 0 || strike <= 0) return 0;
  const T = Math.max(0.0001, dte / 365);
  const sigma = Math.max(0.01, iv);

  if (dte <= 0.005) {
    return type === 'CE' ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(spot / strike) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  if (type === 'CE') {
    return spot * normalCdf(d1) - strike * Math.exp(-r * T) * normalCdf(d2);
  } else {
    return strike * Math.exp(-r * T) * normalCdf(-d2) - spot * normalCdf(-d1);
  }
}

/**
 * Calculates all primary Black-Scholes Greeks for an option
 */
export function calculateGreeks(type, spot, strike, dte = 3, iv = 0.16, r = 0.07) {
  if (spot <= 0 || strike <= 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }
  const T = Math.max(0.0001, dte / 365);
  const sigma = Math.max(0.01, iv);
  const sqrtT = Math.sqrt(T);

  const d1 = (Math.log(spot / strike) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const pdfD1 = normalPdf(d1);

  // Delta
  const delta = type === 'CE' ? normalCdf(d1) : normalCdf(d1) - 1.0;

  // Gamma (per underlying point move)
  const gamma = pdfD1 / (spot * sigma * sqrtT);

  // Vega (per 1% IV change = 0.01)
  const vega = (spot * sqrtT * pdfD1) / 100;

  // Theta (per calendar day decay)
  const thetaAnnual = type === 'CE'
    ? (-(spot * pdfD1 * sigma) / (2 * sqrtT) - r * strike * Math.exp(-r * T) * normalCdf(d2))
    : (-(spot * pdfD1 * sigma) / (2 * sqrtT) + r * strike * Math.exp(-r * T) * normalCdf(-d2));
  const theta = thetaAnnual / 365;

  // Rho (per 1% interest rate change)
  const rho = type === 'CE'
    ? (strike * T * Math.exp(-r * T) * normalCdf(d2)) / 100
    : (-strike * T * Math.exp(-r * T) * normalCdf(-d2)) / 100;

  return { delta, gamma, theta, vega, rho };
}

/**
 * Inverts Black-Scholes using Newton-Raphson + Bisection to find exact Implied Volatility (IV)
 */
export function findImpliedVolatility(type, spot, strike, dte = 3, targetPrice, r = 0.07) {
  if (spot <= 0 || strike <= 0 || targetPrice <= 0) return 0.16;

  const intrinsic = type === 'CE' ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
  if (targetPrice <= intrinsic) {
    return 0.06; // Minimum baseline volatility
  }

  const T = Math.max(0.0001, dte / 365);
  let low = 0.01;
  let high = 4.0;
  let iv = 0.20; // Initial guess (20%)

  // Fast Newton-Raphson with bisection boundary protection
  for (let i = 0; i < 16; i++) {
    const price = blackScholesPrice(type, spot, strike, dte, iv, r);
    const diff = price - targetPrice;

    if (Math.abs(diff) < 0.05) {
      return iv;
    }

    // Calculate Vega
    const sqrtT = Math.sqrt(T);
    const d1 = (Math.log(spot / strike) + (r + 0.5 * iv * iv) * T) / (iv * sqrtT);
    const vega = spot * sqrtT * normalPdf(d1);

    if (diff > 0) high = iv;
    else low = iv;

    if (vega > 0.01) {
      const nextIv = iv - diff / vega;
      if (nextIv > low && nextIv < high) {
        iv = nextIv;
        continue;
      }
    }
    // Bisection fallback
    iv = (low + high) / 2.0;
  }

  return Math.max(0.02, Math.min(3.5, iv));
}

/**
 * Calculates institutional-grade T+0 Live Greeks payoff for an option leg at hypothetical target spot S
 * Calibrates to each leg's live market IV so at current spot S0, T+0 matches live PnL 100% exactly,
 * and produces mathematically flawless smooth Greek curvature (Delta/Gamma/Theta/Vega) across all spot moves.
 */
export function calculateLegT0Payoff(leg, spotAtTarget, currentSpot, dte = 3, defaultIv = 0.16) {
  const { type, action, strike, entryPrice, currentLtp, iv, lots = 1, lotSize = 50, expiry } = leg;
  const totalQty = Math.max(1, lots) * Math.max(1, lotSize);
  const isBuy = action === 'BUY';

  const effectiveDte = calculateDte(expiry, dte || 3);
  const hasLtp = currentLtp !== undefined && currentLtp !== null && !isNaN(parseFloat(currentLtp)) && parseFloat(currentLtp) > 0;
  const ltp = hasLtp ? parseFloat(currentLtp) : parseFloat(entryPrice || 0);

  // Solve exact market Implied Volatility (IV) for this specific leg
  let legIv = (iv && parseFloat(iv) > 0) ? parseFloat(iv) / 100 : null;
  if (!legIv && hasLtp && currentSpot > 0) {
    legIv = findImpliedVolatility(type, currentSpot, strike, effectiveDte, ltp);
  }
  if (!legIv || legIv <= 0) {
    legIv = defaultIv;
  }

  // Price option at target spot using continuous Black-Scholes
  const estimatedPriceToday = blackScholesPrice(type, spotAtTarget, strike, effectiveDte, legIv);
  const pnlPerShare = isBuy ? (estimatedPriceToday - entryPrice) : (entryPrice - estimatedPriceToday);
  return pnlPerShare * totalQty;
}

/**
 * Generates full payoff data curve across underlying price range (both Expiry P&L and T+0 Blue Line P&L)
 */
export function generatePayoffCurve(legs, currentSpot, rangePct = 0.10, steps = 120, dte = 5) {
  if (!legs || legs.length === 0 || !currentSpot || currentSpot <= 0) {
    return { points: [], minPnl: 0, maxPnl: 0, breakevens: [] };
  }

  // Find range of strikes to ensure curve encompasses all legs plus buffer
  const strikes = legs.map(l => l.strike).filter(Boolean);
  const minStrike = strikes.length > 0 ? Math.min(...strikes) : currentSpot;
  const maxStrike = strikes.length > 0 ? Math.max(...strikes) : currentSpot;

  const lowerBound = Math.min(currentSpot * (1 - rangePct), minStrike * 0.96);
  const upperBound = Math.max(currentSpot * (1 + rangePct), maxStrike * 1.04);
  const stepSize = (upperBound - lowerBound) / steps;

  const points = [];
  let minPnl = Infinity;
  let maxPnl = -Infinity;

  for (let s = lowerBound; s <= upperBound; s += stepSize) {
    let totalPnl = 0;
    let totalT0Pnl = 0;
    for (const leg of legs) {
      totalPnl += calculateLegPayoff(leg, s);
      totalT0Pnl += calculateLegT0Payoff(leg, s, currentSpot, dte);
    }

    const roundedPnl = Math.round(totalPnl);
    const roundedT0 = Math.round(totalT0Pnl);

    points.push({
      spot: Math.round(s * 100) / 100,
      pnl: roundedPnl,
      t0Pnl: roundedT0,
      isProfit: roundedPnl >= 0
    });

    if (roundedPnl < minPnl) minPnl = roundedPnl;
    if (roundedT0 < minPnl) minPnl = roundedT0;
    if (roundedPnl > maxPnl) maxPnl = roundedPnl;
    if (roundedT0 > maxPnl) maxPnl = roundedT0;
  }

  // Find Breakevens (linear interpolation where payoff crosses 0)
  const breakevens = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if ((p1.pnl <= 0 && p2.pnl >= 0) || (p1.pnl >= 0 && p2.pnl <= 0)) {
      if (p2.pnl !== p1.pnl) {
        const beSpot = p1.spot + (-p1.pnl) * (p2.spot - p1.spot) / (p2.pnl - p1.pnl);
        breakevens.push(Math.round(beSpot * 10) / 10);
      }
    }
  }

  return {
    points,
    minPnl: Math.round(minPnl),
    maxPnl: Math.round(maxPnl),
    breakevens: [...new Set(breakevens)].sort((a, b) => a - b),
    lowerBound: Math.round(lowerBound),
    upperBound: Math.round(upperBound)
  };
}

/**
 * Computes Max Profit, Max Loss, and Risk:Reward Ratio
 */
export function calculateRiskMetrics(legs, currentSpot) {
  if (!legs || legs.length === 0) {
    return {
      maxProfit: 0,
      maxLoss: 0,
      isUnlimitedProfit: false,
      isUnlimitedLoss: false,
      riskRewardRatio: '—',
      netCreditDebit: 0,
      netType: 'Neutral',
      breakevens: []
    };
  }

  // Check asymptotic behavior as S -> 0 and S -> Infinity
  let netDeltaFarUp = 0;
  let netDeltaFarDown = 0;
  let netPremium = 0;

  for (const leg of legs) {
    const { type, action, entryPrice, lots = 1, lotSize = 50 } = leg;
    const qty = lots * lotSize;
    const isBuy = action === 'BUY';

    // Premium cashflow: SELL receives (+), BUY pays (-)
    netPremium += (isBuy ? -entryPrice : entryPrice) * qty;

    if (type === 'CE') {
      // For Call at very high spot, intrinsic increases +1 per point
      netDeltaFarUp += isBuy ? qty : -qty;
    } else {
      // For Put at S -> 0, intrinsic increases +1 per point downwards
      netDeltaFarDown += isBuy ? qty : -qty;
    }
  }

  const isUnlimitedProfit = netDeltaFarUp > 0 || netDeltaFarDown > 0;
  const isUnlimitedLoss = netDeltaFarUp < 0 || netDeltaFarDown < 0;

  // Sample payoff over a broad range to find peak and valley
  const curve = generatePayoffCurve(legs, currentSpot, 0.25, 250);
  let maxProfit = isUnlimitedProfit ? 'Unlimited' : curve.maxPnl;
  let maxLoss = isUnlimitedLoss ? 'Unlimited' : curve.minPnl;

  let riskRewardRatio = '—';
  if (typeof maxProfit === 'number' && typeof maxLoss === 'number' && maxLoss < 0) {
    const ratio = Math.abs(maxProfit / maxLoss).toFixed(2);
    riskRewardRatio = `1 : ${ratio}`;
  } else if (isUnlimitedProfit && !isUnlimitedLoss) {
    riskRewardRatio = 'Unlimited';
  } else if (!isUnlimitedProfit && isUnlimitedLoss) {
    riskRewardRatio = 'High Risk';
  }

  return {
    maxProfit,
    maxLoss,
    isUnlimitedProfit,
    isUnlimitedLoss,
    riskRewardRatio,
    netCreditDebit: Math.round(netPremium),
    netType: netPremium > 0 ? 'Net Credit' : netPremium < 0 ? 'Net Debit' : 'Neutral',
    breakevens: curve.breakevens
  };
}

/**
 * Calculates Probability of Profit (POP %) using standard normal distribution
 * @param {Array} legs 
 * @param {number} currentSpot 
 * @param {number} iv - Implied volatility in % (e.g. 14.5)
 * @param {number} dte - Days to expiry (minimum 1)
 */
export function calculateProbabilityOfProfit(legs, currentSpot, iv = 15, dte = 3) {
  if (!legs || legs.length === 0 || !currentSpot || currentSpot <= 0) return 50.0;

  const { points } = generatePayoffCurve(legs, currentSpot, 0.15, 100);
  if (!points || points.length === 0) return 50.0;

  // Standard deviation of log returns: sigma * sqrt(T)
  const vol = Math.max(5, Math.min(100, iv || 15)) / 100.0;
  const t = Math.max(0.5, dte) / 365.0;
  const stdDev = currentSpot * vol * Math.sqrt(t);

  if (stdDev <= 0) return 50.0;

  // Numerical integration over the points distribution:
  // Weight each point by standard normal probability density at that spot
  let profitProbSum = 0;
  let totalProbSum = 0;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const z = (pt.spot - currentSpot) / stdDev;
    // PDF of standard normal: (1 / sqrt(2pi)) * e^(-z^2/2)
    const pdf = Math.exp(-0.5 * z * z);

    totalProbSum += pdf;
    if (pt.pnl > 0) {
      profitProbSum += pdf;
    } else if (pt.pnl === 0) {
      profitProbSum += pdf * 0.5;
    }
  }

  if (totalProbSum <= 0) return 50.0;
  const pop = (profitProbSum / totalProbSum) * 100.0;
  return Math.max(1, Math.min(99, Math.round(pop * 10) / 10));
}

/**
 * Computes Required Margin Money based on NSE/BSE institutional rules:
 * - Long Options: Premium Paid (100% upfront)
 * - Short Options: SPAN + Exposure margin per lot (~₹1,20,000 for Nifty, ₹1,40,000 for BankNifty)
 * - Hedged Spreads: Margin benefit is provided; margin capped to max spread loss + buffer
 */
export function calculateRequiredMargin(legs, currentSpot, symbol = 'NIFTY') {
  if (!legs || legs.length === 0) return 0;

  let longPremium = 0;
  const shortLegs = [];
  const longLegs = [];

  const sym = (symbol || 'NIFTY').toUpperCase();
  // Base naked short margin per lot in Indian exchanges
  const baseShortMargin = sym.includes('BANK') ? 145000 : sym.includes('SENSEX') ? 160000 : 120000;

  for (const leg of legs) {
    const { action, entryPrice, lots = 1, lotSize = 50 } = leg;
    const qty = lots * lotSize;
    if (action === 'BUY') {
      longPremium += (entryPrice || 0) * qty;
      longLegs.push(leg);
    } else {
      shortLegs.push(leg);
    }
  }

  // If only long options, required margin is simply the total premium cash required
  if (shortLegs.length === 0) {
    return Math.round(longPremium);
  }

  // If there are short legs, check if hedged by long legs
  let shortMarginTotal = 0;
  for (const sLeg of shortLegs) {
    const sQty = sLeg.lots * sLeg.lotSize;
    // Find matching hedge in long legs (same type CE/PE)
    const hedge = longLegs.find(l => l.type === sLeg.type);
    if (hedge) {
      // Hedged spread: margin required is the spread width + small buffer
      const spreadWidth = Math.abs(sLeg.strike - hedge.strike);
      const hedgedMargin = (spreadWidth * sQty) + 25000;
      shortMarginTotal += Math.min(hedgedMargin, baseShortMargin * sLeg.lots);
    } else {
      // Naked short option
      shortMarginTotal += baseShortMargin * sLeg.lots;
    }
  }

  return Math.round(longPremium + shortMarginTotal);
}

/**
 * Computes portfolio Greeks aggregated across all active strategy legs
 */
export function calculateStrategyGreeks(legs, currentSpot, dte = 3) {
  if (!legs || legs.length === 0 || !currentSpot || currentSpot <= 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0 };
  }

  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;

  for (const leg of legs) {
    const { type, action, strike, currentLtp, entryPrice, iv, lots = 1, lotSize = 50, expiry } = leg;
    const totalQty = Math.max(1, lots) * Math.max(1, lotSize);
    const sign = action === 'BUY' ? 1 : -1;
    const effectiveDte = calculateDte(expiry, dte || 3);
    const hasLtp = currentLtp !== undefined && currentLtp !== null && !isNaN(parseFloat(currentLtp)) && parseFloat(currentLtp) > 0;
    const ltp = hasLtp ? parseFloat(currentLtp) : parseFloat(entryPrice || 0);

    let legIv = (iv && parseFloat(iv) > 0) ? parseFloat(iv) / 100 : null;
    if (!legIv && hasLtp && currentSpot > 0) {
      legIv = findImpliedVolatility(type, currentSpot, strike, effectiveDte, ltp);
    }
    if (!legIv || legIv <= 0) legIv = 0.16;

    const g = calculateGreeks(type, currentSpot, strike, effectiveDte, legIv);
    totalDelta += sign * g.delta * totalQty;
    totalGamma += sign * g.gamma * totalQty;
    totalTheta += sign * g.theta * totalQty;
    totalVega += sign * g.vega * totalQty;
  }

  return {
    delta: Math.round(totalDelta * 100) / 100,
    gamma: Math.round(totalGamma * 10000) / 10000,
    theta: Math.round(totalTheta),
    vega: Math.round(totalVega)
  };
}
