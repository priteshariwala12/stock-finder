import os
import time
import math
import logging
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from curl_cffi import requests

logger = logging.getLogger("ResultsService")
logging.basicConfig(level=logging.INFO)

DB_PATH = os.path.join(os.path.dirname(__file__), "stocks.db")

def sanitize_num(val, default=0.0):
    if val is None:
        return default
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (ValueError, TypeError):
        return default

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

class ResultsService:
    def __init__(self):
        self.session = None
        self.last_init = 0
        self._financial_cache: Dict[str, Dict[str, Any]] = {}
        self._calendar_cache = None
        self._calendar_cache_time = 0
        self._declared_cache = None
        self._declared_cache_time = 0

    def _get_session(self):
        if not self.session or (time.time() - self.last_init > 600):
            self.session = requests.Session(impersonate="chrome124")
            try:
                self.session.get("https://www.nseindia.com", headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                }, timeout=5)
                self.last_init = time.time()
            except Exception as e:
                logger.warning("NSE session init failed: %s", e)
        return self.session

    def get_upcoming_results(self, fno_only: bool = False) -> List[Dict[str, Any]]:
        """
        Fetches scheduled board meetings to announce quarterly/annual financial results
        from official NSE Event Calendar API.
        """
        # Cache for 10 minutes
        if self._calendar_cache and (time.time() - self._calendar_cache_time < 600):
            items = self._calendar_cache
        else:
            items = []
            try:
                s = self._get_session()
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json, text/plain, */*",
                    "Referer": "https://www.nseindia.com/"
                }
                r = s.get("https://www.nseindia.com/api/event-calendar", headers=headers, timeout=6)
                if r.status_code == 200:
                    raw_items = r.json()
                    # Look up symbol details in our db
                    conn = get_db()
                    c = conn.cursor()
                    c.execute("SELECT symbol, name, current_price, change_1d, is_fno, sector FROM stocks")
                    stock_map = {row["symbol"]: dict(row) for row in c.fetchall()}
                    conn.close()

                    for it in raw_items:
                        sym = (it.get("symbol") or "").strip().upper()
                        purpose = it.get("purpose") or ""
                        desc = it.get("bm_desc") or ""
                        
                        # Filter for financial results or general board meetings
                        is_result = any(kw in (purpose + " " + desc).lower() for kw in [
                            "financial", "result", "accounts", "dividend", "quarter", "annual"
                        ])
                        
                        stock_info = stock_map.get(sym, {})
                        is_fno = stock_info.get("is_fno", 0)

                        items.append({
                            "symbol": sym,
                            "company": it.get("company") or stock_info.get("name") or sym,
                            "date": it.get("date"),
                            "purpose": purpose or "Financial Results / Board Meeting",
                            "description": desc or "Board meeting to consider quarterly financial results",
                            "is_fno": 1 if is_fno else 0,
                            "current_price": stock_info.get("current_price"),
                            "change_1d": stock_info.get("change_1d"),
                            "sector": stock_info.get("sector", "Diversified")
                        })
                    self._calendar_cache = items
                    self._calendar_cache_time = time.time()
            except Exception as e:
                logger.error("Error fetching NSE event calendar: %s", e)
                # Fallback to cached or database
                items = self._calendar_cache or []

        if fno_only:
            return [it for it in items if it.get("is_fno") == 1]
        return items

    def get_declared_results(self, fno_only: bool = False) -> List[Dict[str, Any]]:
        """
        Fetches results declared during the current quarter from official exchange filings (BSE API).
        """
        if self._declared_cache and (time.time() - self._declared_cache_time < 300):
            items = self._declared_cache
        else:
            items = []
            try:
                today = datetime.now()
                # 30 days window for recent declared results
                from_dt = (today - timedelta(days=30)).strftime("%Y%m%d")
                to_dt = today.strftime("%Y%m%d")

                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                    "Accept": "application/json, text/plain, */*",
                    "Referer": "https://www.bseindia.com/corporates/ann.html",
                }
                bse_session = requests.Session(impersonate="chrome124")
                url = f"https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w?strCat=Result&strPrevDate={from_dt}&strToDate={to_dt}&strScrip=&strSearch=P&strType=C"
                r = bse_session.get(url, headers=headers, timeout=6)
                if r.status_code == 200:
                    data = r.json()
                    announcements = data.get("Table", [])

                    conn = get_db()
                    c = conn.cursor()
                    c.execute("SELECT symbol, name, bse_code, current_price, change_1d, is_fno, sector FROM stocks")
                    bse_map = {}
                    sym_map = {}
                    for row in c.fetchall():
                        d = dict(row)
                        if d.get("bse_code"):
                            bse_map[str(d["bse_code"]).strip()] = d
                        sym_map[d["symbol"].upper()] = d
                    conn.close()

                    for a in announcements[:150]:
                        scrip = str(a.get("SCRIP_CD") or "").strip()
                        company = a.get("SLONGNAME") or ""
                        headline = a.get("HEADLINE") or a.get("NEWSSUB") or ""
                        raw_dt = a.get("NEWS_DT") or a.get("DissemDT") or ""
                        attach = a.get("ATTACHMENTNAME")
                        pdf_url = f"https://www.bseindia.com/xml-data/corpfiling/AttachLive/{attach}" if attach else None

                        stock_info = bse_map.get(scrip, {})
                        sym = stock_info.get("symbol")
                        if not sym:
                            # Try to match symbol from company name
                            first_word = company.split()[0].upper() if company else ""
                            stock_info = sym_map.get(first_word, {})
                            sym = stock_info.get("symbol") or first_word

                        is_fno = stock_info.get("is_fno", 0)

                        formatted_date = raw_dt[:10] if raw_dt else today.strftime("%Y-%m-%d")

                        items.append({
                            "symbol": sym,
                            "scrip_code": scrip,
                            "company": company,
                            "date": formatted_date,
                            "headline": headline,
                            "pdf_url": pdf_url,
                            "is_fno": 1 if is_fno else 0,
                            "current_price": stock_info.get("current_price"),
                            "change_1d": stock_info.get("change_1d"),
                            "sector": stock_info.get("sector", "Diversified")
                        })

                    self._declared_cache = items
                    self._declared_cache_time = time.time()
            except Exception as e:
                logger.error("Error fetching declared results: %s", e)
                items = self._declared_cache or []

        if fno_only:
            return [it for it in items if it.get("is_fno") == 1]
        return items

    def get_stock_history(self, raw_symbol: str) -> Dict[str, Any]:
        """
        Retrieves 5-year annual financials and 8-quarter results for a specific stock.
        """
        sym = raw_symbol.replace("NSE:", "").replace("BSE:", "").replace("-INDEX", "").replace("-EQ", "").strip().upper()
        if sym in self._financial_cache:
            return self._financial_cache[sym]

        import yfinance as yf
        ticker_sym = f"{sym}.NS"
        t = yf.Ticker(ticker_sym)

        annual_records = []
        quarterly_records = []

        try:
            # 1. Annual Income Statement (5 Years)
            stmt = t.income_stmt
            if stmt is None or stmt.empty:
                # Try BSE suffix
                t = yf.Ticker(f"{sym}.BO")
                stmt = t.income_stmt

            if stmt is not None and not stmt.empty:
                cols = list(stmt.columns)
                for col in cols[:5]:
                    year_label = str(col.year) if hasattr(col, 'year') else str(col)[:4]
                    rev = float(stmt.loc['Total Revenue', col]) if 'Total Revenue' in stmt.index and stmt.loc['Total Revenue', col] is not None else 0.0
                    net_inc = float(stmt.loc['Net Income', col]) if 'Net Income' in stmt.index and stmt.loc['Net Income', col] is not None else 0.0
                    op_inc = float(stmt.loc['Operating Income', col]) if 'Operating Income' in stmt.index and stmt.loc['Operating Income', col] is not None else 0.0
                    eps = float(stmt.loc['Basic EPS', col]) if 'Basic EPS' in stmt.index and stmt.loc['Basic EPS', col] is not None else 0.0

                    # Convert to Crore (₹ Cr = / 10,000,000)
                    rev_cr = round(sanitize_num(rev) / 1e7, 2)
                    net_inc_cr = round(sanitize_num(net_inc) / 1e7, 2)
                    op_inc_cr = round(sanitize_num(op_inc) / 1e7, 2)
                    margin_pct = round((net_inc / rev * 100.0), 2) if rev > 0 else 0.0

                    annual_records.append({
                        "period": f"FY{year_label}",
                        "date": str(col)[:10],
                        "revenue_cr": sanitize_num(rev_cr),
                        "net_profit_cr": sanitize_num(net_inc_cr),
                        "operating_profit_cr": sanitize_num(op_inc_cr),
                        "eps": sanitize_num(eps),
                        "margin_pct": sanitize_num(margin_pct),
                        "rev_growth_pct": 0.0,
                        "profit_growth_pct": 0.0
                    })

            # Calculate YoY growth
            for i in range(len(annual_records) - 1):
                curr = annual_records[i]
                prev = annual_records[i + 1]
                if prev["revenue_cr"] > 0:
                    curr["rev_growth_pct"] = sanitize_num(round(((curr["revenue_cr"] - prev["revenue_cr"]) / prev["revenue_cr"]) * 100.0, 1))
                if prev["net_profit_cr"] != 0:
                    curr["profit_growth_pct"] = sanitize_num(round(((curr["net_profit_cr"] - prev["net_profit_cr"]) / abs(prev["net_profit_cr"])) * 100.0, 1))

            # 2. Quarterly Income Statement (Last 8 quarters)
            q_stmt = t.quarterly_income_stmt
            if q_stmt is not None and not q_stmt.empty:
                q_cols = list(q_stmt.columns)
                for col in q_cols[:8]:
                    d_str = str(col)[:10]
                    rev = float(q_stmt.loc['Total Revenue', col]) if 'Total Revenue' in q_stmt.index and q_stmt.loc['Total Revenue', col] is not None else 0.0
                    net_inc = float(q_stmt.loc['Net Income', col]) if 'Net Income' in q_stmt.index and q_stmt.loc['Net Income', col] is not None else 0.0
                    eps = float(q_stmt.loc['Basic EPS', col]) if 'Basic EPS' in q_stmt.index and q_stmt.loc['Basic EPS', col] is not None else 0.0

                    rev_cr = round(sanitize_num(rev) / 1e7, 2)
                    net_inc_cr = round(sanitize_num(net_inc) / 1e7, 2)
                    margin_pct = round((net_inc / rev * 100.0), 2) if rev > 0 else 0.0

                    # Format quarter label, e.g., Q1 2026
                    quarter_num = (col.month - 1) // 3 + 1 if hasattr(col, 'month') else 1
                    quarter_label = f"Q{quarter_num} {str(col)[:4]}"

                    quarterly_records.append({
                        "period": quarter_label,
                        "date": d_str,
                        "revenue_cr": sanitize_num(rev_cr),
                        "net_profit_cr": sanitize_num(net_inc_cr),
                        "eps": sanitize_num(eps),
                        "margin_pct": sanitize_num(margin_pct)
                    })
        except Exception as e:
            logger.error("Error fetching financial statements for %s: %s", sym, e)

        # Get company metadata from stocks.db
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM stocks WHERE symbol = ?", (sym,))
        row = c.fetchone()
        info = dict(row) if row else {"symbol": sym, "name": sym}
        conn.close()

        result = {
            "symbol": sym,
            "name": info.get("name", sym),
            "sector": info.get("sector", "Equities"),
            "industry": info.get("industry", ""),
            "market_cap_cr": sanitize_num(info.get("market_cap_cr")),
            "current_price": sanitize_num(info.get("current_price")),
            "change_1d": sanitize_num(info.get("change_1d")),
            "is_fno": info.get("is_fno", 0),
            "pe_ratio": sanitize_num(info.get("pe_ratio")),
            "pb_ratio": sanitize_num(info.get("pb_ratio")),
            "roe": sanitize_num(info.get("roe")),
            "annual_financials": annual_records,
            "quarterly_financials": quarterly_records
        }

        self._financial_cache[sym] = result
        return result

results_service = ResultsService()
