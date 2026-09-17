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

const FYERS_MONTH_CODE_MAP = {
  '1': '01', '2': '02', '3': '03', '4': '04', '5': '05', '6': '06',
  '7': '07', '8': '08', '9': '09', 'O': '10', 'N': '11', 'D': '12'
};

/**
 * Format strike option into TradingView Indian Option Symbol format
 * e.g., NSE:NIFTY260922C23100
 */
export function formatTvOptionSymbol(sym, expiry, strike, optType = 'CE') {
  const raw = String(sym || 'NIFTY').trim().toUpperCase();

  // 1. If sym is already a valid TradingView option symbol (e.g. NSE:NIFTY260922C23100)
  if (/^(NSE|BSE):[A-Z]+\d{6}[CP]\d+$/i.test(raw)) {
    return raw;
  }

  // 2. If sym is a Fyers option contract (e.g. NSE:NIFTY2692223100CE or NIFTY2692223100CE)
  const mFyers = raw.match(/^(?:(NSE|BSE):)?([A-Z]+)(\d{2})([1-9OND])(\d{2})(\d+)(CE|PE)$/i);
  if (mFyers) {
    const [, ex = 'NSE', root, yy, mCode, dd, strk, opt] = mFyers;
    const mm = FYERS_MONTH_CODE_MAP[mCode.toUpperCase()] || '09';
    const optCode = opt.toUpperCase() === 'CE' ? 'C' : 'P';
    return `${ex.toUpperCase()}:${root.toUpperCase()}${yy}${mm}${dd}${optCode}${strk}`;
  }

  // 3. Fallback: build from root, expiry, strike, and optType
  let cleanSym = raw.replace(/^(NSE:|BSE:)/i, '').replace(/-(INDEX|EQ)$/i, '').trim();
  if (cleanSym === 'NIFTY 50' || cleanSym === 'NIFTY50') cleanSym = 'NIFTY';
  if (cleanSym === 'BANK NIFTY' || cleanSym === 'NIFTYBANK') cleanSym = 'BANKNIFTY';
  if (cleanSym === 'NIFTY FIN SERVICE') cleanSym = 'FINNIFTY';
  if (cleanSym === 'MIDCAP NIFTY' || cleanSym === 'NIFTY MIDCAP') cleanSym = 'MIDCPNIFTY';
  if (cleanSym === 'NIFTY NEXT 50' || cleanSym === 'NIFTYNEXT50') cleanSym = 'NIFTYNEXT50';
  if (cleanSym === 'BSE SENSEX') cleanSym = 'SENSEX';
  if (cleanSym === 'BSE BANKEX') cleanSym = 'BANKEX';

  const prefix = cleanSym === 'SENSEX' || cleanSym === 'BANKEX' ? 'BSE' : 'NSE';
  const optCode = String(optType || 'CE').toUpperCase().startsWith('C') ? 'C' : 'P';
  const roundedStrike = Math.round(Number(strike) || 0);

  if (expiry && typeof expiry === 'string' && expiry.includes('-')) {
    const parts = expiry.split('-');
    if (parts.length === 3) {
      let day, m, y;
      if (parts[0].length === 4) {
        // Format: YYYY-MM-DD
        y = parts[0].slice(-2);
        m = parts[1].padStart(2, '0');
        day = parts[2].padStart(2, '0');
      } else {
        // Format: DD-MMM-YYYY (e.g. 22-Sep-2026)
        day = parts[0].padStart(2, '0');
        m = MONTH_MAP[parts[1].toUpperCase()] || parts[1].padStart(2, '0');
        y = parts[2].slice(-2);
      }
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

  let raw = String(inputSymbol).trim().toUpperCase();

  // 1. If already in official TradingView option format: NSE:NIFTY260922C23100
  if (/^(NSE|BSE):[A-Z]+\d{6}[CP]\d+$/i.test(raw)) {
    return raw;
  }

  // 2. If it is a Fyers option contract: NSE:NIFTY2692223100CE or NIFTY2692223100CE
  const mFyers = raw.match(/^(?:(NSE|BSE):)?([A-Z]+)(\d{2})([1-9OND])(\d{2})(\d+)(CE|PE)$/i);
  if (mFyers) {
    const [, ex = 'NSE', root, yy, mCode, dd, strk, opt] = mFyers;
    const mm = FYERS_MONTH_CODE_MAP[mCode.toUpperCase()] || '09';
    const optCode = opt.toUpperCase() === 'CE' ? 'C' : 'P';
    return `${ex.toUpperCase()}:${root.toUpperCase()}${yy}${mm}${dd}${optCode}${strk}`;
  }

  // 3. If explicit option contract with separate strike
  if (strike && optType) {
    return formatTvOptionSymbol(raw, expiry, strike, optType);
  }

  // 4. Check known benchmark indices
  if (INDEX_TV_MAP[raw]) {
    return INDEX_TV_MAP[raw];
  }

  // 5. If starts with exchange prefix
  if (raw.startsWith('NSE:') || raw.startsWith('BSE:')) {
    const cleaned = raw.replace(/-(INDEX|EQ)$/i, '');
    return cleaned;
  }

  // 6. Standard Indian Equity defaults to NSE
  const cleanSym = raw.replace(/-(INDEX|EQ)$/i, '').replace(/[^A-Z0-9&_-]/g, '');
  return `NSE:${cleanSym}`;
}

/**
 * Get direct TradingView web URL for a symbol
 */
export function getTradingViewWebUrl(tvSymbol) {
  const sym = tvSymbol ? tvSymbol.trim() : 'NSE:NIFTY';
  return `https://in.tradingview.com/chart/?symbol=${encodeURIComponent(sym)}`;
}

/**
 * Convert any symbol into official Fyers symbol for /api/chart/history
 */
export function toFyersSymbol(inputSymbol) {
  if (!inputSymbol) return 'NSE:NIFTY50-INDEX';
  const raw = String(inputSymbol).trim().toUpperCase();
  const clean = raw.replace(/^(NSE:|BSE:)/i, '').replace(/-(INDEX|EQ)$/i, '').trim();

  if (clean === 'NIFTY' || clean === 'NIFTY50' || clean === 'NIFTY 50') return 'NSE:NIFTY50-INDEX';
  if (clean === 'BANKNIFTY' || clean === 'NIFTYBANK' || clean === 'BANK NIFTY' || clean === 'NIFTY BANK') return 'NSE:NIFTYBANK-INDEX';
  if (clean === 'FINNIFTY' || clean === 'NIFTY FIN SERVICE') return 'NSE:FINNIFTY-INDEX';
  if (clean === 'MIDCPNIFTY' || clean === 'MIDCAP NIFTY' || clean === 'NIFTY MIDCAP') return 'NSE:MIDCPNIFTY-INDEX';
  if (clean === 'NIFTYNXT50' || clean === 'NIFTYNEXT50' || clean === 'NIFTY NEXT 50') return 'NSE:NIFTYNEXT50-INDEX';
  if (clean === 'SENSEX' || clean === 'BSE SENSEX') return 'BSE:SENSEX-INDEX';
  if (clean === 'BANKEX' || clean === 'BSE BANKEX') return 'BSE:BANKEX-INDEX';

  // Check if it's an option contract (e.g. NSE:NIFTY2692223250CE, NIFTY2692223250CE)
  if (/\d+(CE|PE)$/i.test(raw)) {
    return raw.startsWith('NSE:') || raw.startsWith('BSE:') ? raw : `NSE:${raw}`;
  }

  if (raw.startsWith('NSE:') || raw.startsWith('BSE:')) {
    if (raw.endsWith('-INDEX') || raw.endsWith('-EQ')) {
      return raw;
    }
    return `${raw}-EQ`;
  }

  return `NSE:${clean}-EQ`;
}

export default {
  toTradingViewSymbol,
  toFyersSymbol,
  formatTvOptionSymbol,
  getTradingViewWebUrl
};
