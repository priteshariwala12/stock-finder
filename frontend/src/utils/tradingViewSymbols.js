/**
 * TradingView and Exchange Symbol Resolution Utility
 * Maps Indian equities, indices, and option contracts to proper TradingView tickers.
 */

// Popular index mapping
const INDEX_TV_MAP = {
  'NIFTY': 'NSE:NIFTY',
  'NIFTY 50': 'NSE:NIFTY',
  'NSE:NIFTY50-INDEX': 'NSE:NIFTY',
  'BANKNIFTY': 'NSE:BANKNIFTY',
  'NIFTY BANK': 'NSE:BANKNIFTY',
  'NSE:NIFTYBANK-INDEX': 'NSE:BANKNIFTY',
  'FINNIFTY': 'NSE:FINNIFTY',
  'NIFTY FIN SERVICE': 'NSE:FINNIFTY',
  'NSE:FINNIFTY-INDEX': 'NSE:FINNIFTY',
  'MIDCPNIFTY': 'NSE:MIDCPNIFTY',
  'NIFTY MIDCAP SELECT': 'NSE:MIDCPNIFTY',
  'NSE:MIDCPNIFTY-INDEX': 'NSE:MIDCPNIFTY',
  'SENSEX': 'BSE:SENSEX',
  'BSE SENSEX': 'BSE:SENSEX',
  'BSE:SENSEX-INDEX': 'BSE:SENSEX',
  'BANKEX': 'BSE:BANKEX',
  'BSE BANKEX': 'BSE:BANKEX',
  'BSE:BANKEX-INDEX': 'BSE:BANKEX',
  'NIFTYNXT50': 'NSE:NIFTYNEXT50',
  'NIFTY NEXT 50': 'NSE:NIFTYNEXT50',
  'NSE:NIFTYNEXT50-INDEX': 'NSE:NIFTYNEXT50'
};

const MONTH_MAP = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
};

/**
 * Format strike option into TradingView Indian Option Symbol format
 * e.g., NSE:NIFTY240926C25000 or fallback NSE:NIFTY25000CE
 */
export function formatTvOptionSymbol(sym, expiry, strike, optType = 'CE') {
  const cleanSym = (sym || 'NIFTY').replace(/^(NSE:|BSE:)/i, '').replace(/-(INDEX|EQ)$/i, '').trim();
  const prefix = cleanSym === 'SENSEX' || cleanSym === 'BANKEX' ? 'BSE' : 'NSE';
  const optCode = optType.toUpperCase().startsWith('C') ? 'C' : 'P';
  const roundedStrike = Math.round(Number(strike) || 0);

  if (expiry && typeof expiry === 'string' && expiry.includes('-')) {
    const parts = expiry.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const m = MONTH_MAP[parts[1].toUpperCase()] || '09';
      const y = parts[2].slice(-2);
      return `${prefix}:${cleanSym}${y}${m}${day}${optCode}${roundedStrike}`;
    }
  }

  return `${prefix}:${cleanSym}${roundedStrike}${optType.toUpperCase()}`;
}

/**
 * Convert any stock symbol, index name, or option ticker into an official TradingView Symbol
 */
export function toTradingViewSymbol(inputSymbol, expiry = null, strike = null, optType = 'CE') {
  if (!inputSymbol) return 'NSE:NIFTY';

  let raw = String(inputSymbol).trim();

  // If already full option symbol like NSE:NIFTY...
  if (strike && optType) {
    return formatTvOptionSymbol(raw, expiry, strike, optType);
  }

  // Check known indices
  const upper = raw.toUpperCase();
  if (INDEX_TV_MAP[upper]) {
    return INDEX_TV_MAP[upper];
  }

  // If already starts with NSE: or BSE:
  if (raw.startsWith('NSE:') || raw.startsWith('BSE:')) {
    const cleaned = raw.replace(/-(INDEX|EQ)$/i, '');
    return cleaned;
  }

  // Standard Indian Equity default to NSE
  const cleanSym = raw.replace(/-(INDEX|EQ)$/i, '').replace(/[^A-Za-z0-9&_-]/g, '').toUpperCase();
  return `NSE:${cleanSym}`;
}

/**
 * Get direct TradingView web URL for a symbol
 */
export function getTradingViewWebUrl(tvSymbol) {
  const sym = tvSymbol ? tvSymbol.trim() : 'NSE:NIFTY';
  return `https://in.tradingview.com/chart/?symbol=${encodeURIComponent(sym)}`;
}

export default {
  toTradingViewSymbol,
  formatTvOptionSymbol,
  getTradingViewWebUrl
};
