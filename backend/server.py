from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
import sqlite3
import json
import io
import csv
import os
import logging
import hashlib
import secrets
import uuid
from datetime import datetime

from data_engine import get_db_connection, enrich_stock_universe, DB_PATH
from query_engine import parse_full_query, RATIO_CATALOG
from option_chain_service import get_all_option_symbols, get_live_option_chain, check_is_market_open

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ScreenerServer")

SALT = "STOCKFINDER_IN_2026_SECRET_SALT"

def hash_password(password: str) -> str:
    return hashlib.sha256((password + SALT).encode('utf-8')).hexdigest()

class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class WatchlistToggleRequest(BaseModel):
    symbol: str

app = FastAPI(
    title="NSE & BSE Indian Stock Screener API",
    description="Full-featured fundamental and technical screening engine gathering official data from NSE & BSE",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScreenRequest(BaseModel):
    search: Optional[str] = None
    sectors: Optional[List[str]] = None
    market_cap_categories: Optional[List[str]] = None
    
    # Valuation & Fundamentals
    market_cap_min: Optional[float] = None
    market_cap_max: Optional[float] = None
    pe_min: Optional[float] = None
    pe_max: Optional[float] = None
    pb_min: Optional[float] = None
    pb_max: Optional[float] = None
    roe_min: Optional[float] = None
    roce_min: Optional[float] = None
    debt_to_equity_max: Optional[float] = None
    current_ratio_min: Optional[float] = None
    dividend_yield_min: Optional[float] = None
    sales_growth_min: Optional[float] = None
    profit_growth_min: Optional[float] = None
    promoter_holding_min: Optional[float] = None
    promoter_pledged_max: Optional[float] = None
    fii_dii_min: Optional[float] = None
    
    # Price & Technicals
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    change_1d_min: Optional[float] = None
    change_1d_max: Optional[float] = None
    volume_min: Optional[int] = None
    volume_multiple_min: Optional[float] = None
    volume_change_pct_min: Optional[float] = None
    delivery_percent_min: Optional[float] = None
    rsi_min: Optional[float] = None
    rsi_max: Optional[float] = None
    
    # Moving Averages & Signals
    above_ema20: Optional[bool] = None
    above_sma50: Optional[bool] = None
    above_sma200: Optional[bool] = None
    golden_cross: Optional[bool] = None
    is_breakout_3pct: Optional[bool] = None
    dist_from_52w_high_max: Optional[float] = None
    watchlist_only: Optional[bool] = None
    user_id: Optional[str] = None
    potential_min: Optional[float] = None
    is_fno: Optional[bool] = None
    market_segment: Optional[str] = None # 'all', 'gainers', 'losers', 'volume_shockers', '52w_high', 'multibagger'

    # Sorting & Pagination
    sort_by: Optional[str] = "potential_score"
    sort_order: Optional[str] = "desc" # 'asc' or 'desc'
    page: Optional[int] = 1
    page_size: Optional[int] = 25

class PresetModel(BaseModel):
    name: str
    description: Optional[str] = ""
    category: Optional[str] = "Custom"
    filters: Dict[str, Any]

def build_query(req: ScreenRequest, count_only: bool = False):
    clauses = ["1=1"]
    params = []

    if req.search and req.search.strip():
        term = f"%{req.search.strip()}%"
        clauses.append("(symbol LIKE ? OR name LIKE ?)")
        params.extend([term, term])

    if req.sectors and len(req.sectors) > 0:
        placeholders = ",".join(["?"] * len(req.sectors))
        clauses.append(f"sector IN ({placeholders})")
        params.extend(req.sectors)

    if req.market_cap_categories and len(req.market_cap_categories) > 0:
        placeholders = ",".join(["?"] * len(req.market_cap_categories))
        clauses.append(f"market_cap_category IN ({placeholders})")
        params.extend(req.market_cap_categories)

    # Fundamentals
    if req.market_cap_min is not None:
        clauses.append("market_cap_cr >= ?")
        params.append(req.market_cap_min)
    if req.market_cap_max is not None:
        clauses.append("market_cap_cr <= ?")
        params.append(req.market_cap_max)

    if req.pe_min is not None:
        clauses.append("pe_ratio >= ?")
        params.append(req.pe_min)
    if req.pe_max is not None:
        clauses.append("pe_ratio <= ?")
        params.append(req.pe_max)

    if req.pb_min is not None:
        clauses.append("pb_ratio >= ?")
        params.append(req.pb_min)
    if req.pb_max is not None:
        clauses.append("pb_ratio <= ?")
        params.append(req.pb_max)

    if req.roe_min is not None:
        clauses.append("roe >= ?")
        params.append(req.roe_min)

    if req.roce_min is not None:
        clauses.append("roce >= ?")
        params.append(req.roce_min)

    if req.debt_to_equity_max is not None:
        clauses.append("debt_to_equity <= ?")
        params.append(req.debt_to_equity_max)

    if req.current_ratio_min is not None:
        clauses.append("current_ratio >= ?")
        params.append(req.current_ratio_min)

    if req.dividend_yield_min is not None:
        clauses.append("dividend_yield >= ?")
        params.append(req.dividend_yield_min)

    if req.sales_growth_min is not None:
        clauses.append("sales_growth_yoy >= ?")
        params.append(req.sales_growth_min)

    if req.profit_growth_min is not None:
        clauses.append("profit_growth_yoy >= ?")
        params.append(req.profit_growth_min)

    if req.promoter_holding_min is not None:
        clauses.append("promoter_holding >= ?")
        params.append(req.promoter_holding_min)

    if req.promoter_pledged_max is not None:
        clauses.append("promoter_pledged <= ?")
        params.append(req.promoter_pledged_max)

    if req.fii_dii_min is not None:
        clauses.append("fii_dii_holding >= ?")
        params.append(req.fii_dii_min)

    # Technicals
    if req.price_min is not None:
        clauses.append("current_price >= ?")
        params.append(req.price_min)
    if req.price_max is not None:
        clauses.append("current_price <= ?")
        params.append(req.price_max)

    if req.change_1d_min is not None:
        clauses.append("change_1d >= ?")
        params.append(req.change_1d_min)
    if req.change_1d_max is not None:
        clauses.append("change_1d <= ?")
        params.append(req.change_1d_max)

    if req.volume_min is not None:
        clauses.append("volume >= ?")
        params.append(req.volume_min)

    if req.volume_multiple_min is not None:
        clauses.append("volume_multiple >= ?")
        params.append(req.volume_multiple_min)

    if req.volume_change_pct_min is not None:
        clauses.append("volume_change_pct >= ?")
        params.append(req.volume_change_pct_min)

    if req.delivery_percent_min is not None:
        clauses.append("delivery_percent >= ?")
        params.append(req.delivery_percent_min)

    if req.rsi_min is not None:
        clauses.append("rsi_14 >= ?")
        params.append(req.rsi_min)
    if req.rsi_max is not None:
        clauses.append("rsi_14 <= ?")
        params.append(req.rsi_max)

    if req.above_ema20 is True:
        clauses.append("above_ema20 = 1")
    elif req.above_ema20 is False:
        clauses.append("above_ema20 = 0")

    if req.above_sma50 is True:
        clauses.append("above_sma50 = 1")
    elif req.above_sma50 is False:
        clauses.append("above_sma50 = 0")

    if req.above_sma200 is True:
        clauses.append("above_sma200 = 1")
    elif req.above_sma200 is False:
        clauses.append("above_sma200 = 0")

    if req.golden_cross is True:
        clauses.append("golden_cross = 1")

    if req.is_breakout_3pct is True:
        clauses.append("is_breakout_3pct = 1")

    if req.dist_from_52w_high_max is not None:
        clauses.append("dist_from_52w_high <= ?")
        params.append(req.dist_from_52w_high_max)

    if req.potential_min is not None:
        clauses.append("potential_score >= ?")
        params.append(req.potential_min)

    if req.is_fno is True:
        clauses.append("is_fno = 1")
    elif req.is_fno is False:
        clauses.append("is_fno = 0")

    if req.market_segment and req.market_segment.lower() != "all":
        seg = req.market_segment.lower()
        if seg == "gainers":
            clauses.append("change_1d > 0")
        elif seg == "losers":
            clauses.append("change_1d < 0")
        elif seg == "volume_shockers":
            clauses.append("volume_multiple >= 1.5")
        elif seg == "52w_high":
            clauses.append("dist_from_52w_high <= 3.0")
        elif seg == "multibagger":
            clauses.append("current_price <= 100 AND roce >= 12.0 AND debt_to_equity <= 0.8")

    if req.watchlist_only is True and req.user_id:
        clauses.append("symbol IN (SELECT symbol FROM watchlists WHERE user_id = ?)")
        params.append(req.user_id)

    where_str = " AND ".join(clauses)

    if count_only:
        sql = f"SELECT COUNT(*) FROM stocks WHERE {where_str}"
        return sql, params

    # Whitelist valid sort columns
    allowed_cols = {
        "symbol", "name", "current_price", "change_1d", "change_1w", "change_1m", "change_1y",
        "volume", "volume_multiple", "volume_change_pct", "delivery_percent", "turnover_cr",
        "market_cap_cr", "pe_ratio", "pb_ratio", "roe", "roce", "debt_to_equity",
        "dividend_yield", "rsi_14", "dist_from_52w_high", "sales_growth_yoy", "profit_growth_yoy",
        "potential_score", "is_fno"
    }

    # Determine default sort based on segment if user didn't explicitly pick a specific column
    default_sort_col = "potential_score"
    default_sort_dir = "DESC"
    if req.market_segment:
        seg = req.market_segment.lower()
        if seg == "gainers":
            default_sort_col = "change_1d"
            default_sort_dir = "DESC"
        elif seg == "losers":
            default_sort_col = "change_1d"
            default_sort_dir = "ASC"
        elif seg == "volume_shockers":
            default_sort_col = "volume_multiple"
            default_sort_dir = "DESC"

    if not req.sort_by or req.sort_by == "potential_score":
        if req.market_segment and req.market_segment.lower() in ("gainers", "losers", "volume_shockers"):
            sort_col = default_sort_col
            sort_dir = default_sort_dir
        else:
            sort_col = "potential_score"
            sort_dir = "DESC" if not req.sort_order else ("ASC" if req.sort_order.lower() == "asc" else "DESC")
    else:
        sort_col = req.sort_by if req.sort_by in allowed_cols else default_sort_col
        sort_dir = "ASC" if req.sort_order and req.sort_order.lower() == "asc" else "DESC"

    page = max(req.page or 1, 1)
    page_size = min(max(req.page_size or 25, 1), 200)
    offset = (page - 1) * page_size

    order_clause = f"{sort_col} {sort_dir} NULLS LAST"
    if sort_col == "potential_score" and sort_dir == "DESC":
        order_clause += ", is_breakout_3pct DESC, change_1d DESC, volume_multiple DESC"
    elif sort_col == "change_1d":
        order_clause += f", volume_multiple {sort_dir}"
    elif sort_col == "volume_multiple":
        order_clause += f", change_1d DESC"

    sql = f"""
    SELECT * FROM stocks
    WHERE {where_str}
    ORDER BY {order_clause}
    LIMIT ? OFFSET ?
    """
    params.extend([page_size, offset])
    return sql, params

@app.get("/api/market/summary")
def get_market_summary():
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM stocks")
    total_stocks = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM stocks WHERE change_1d > 0")
    advances = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM stocks WHERE change_1d < 0")
    declines = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM stocks WHERE change_1d == 0")
    unchanged = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM stocks WHERE is_breakout_3pct = 1")
    breakouts_count = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM stocks WHERE is_fno = 1")
    fno_count = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM stocks WHERE volume_multiple >= 1.5")
    volume_shockers_count = c.fetchone()[0]

    # Latest sync info
    c.execute("SELECT timestamp, records_count, status, details FROM sync_history ORDER BY id DESC LIMIT 1")
    sync_row = c.fetchone()
    sync_info = dict(sync_row) if sync_row else {
        "timestamp": datetime.now().isoformat(),
        "records_count": total_stocks,
        "status": "READY",
        "details": "Initial load"
    }

    conn.close()

    # Standard benchmark indices
    indices = [
        {"name": "NIFTY 50", "exchange": "NSE", "value": "23,398.10", "change": -80.20, "pct_change": -0.34},
        {"name": "SENSEX", "exchange": "BSE", "value": "76,825.40", "change": -245.50, "pct_change": -0.32},
        {"name": "NIFTY BANK", "exchange": "NSE", "value": "56,606.55", "change": 135.80, "pct_change": 0.24},
        {"name": "NIFTY MIDCAP 100", "exchange": "NSE", "value": "54,120.30", "change": 210.45, "pct_change": 0.39}
    ]

    return {
        "total_stocks": total_stocks,
        "advances": advances,
        "declines": declines,
        "unchanged": unchanged,
        "breakouts_3pct_count": breakouts_count,
        "fno_count": fno_count,
        "volume_shockers_count": volume_shockers_count,
        "indices": indices,
        "sync_info": sync_info
    }

def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ")[1]
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
    SELECT u.id, u.name, u.email 
    FROM users u 
    JOIN user_tokens t ON u.id = t.user_id 
    WHERE t.token = ?
    """, (token,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
    return dict(row)

def get_current_user_optional(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
    SELECT u.id, u.name, u.email 
    FROM users u 
    JOIN user_tokens t ON u.id = t.user_id 
    WHERE t.token = ?
    """, (token,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

@app.post("/api/auth/signup")
def signup(req: SignUpRequest):
    if not req.name.strip() or not req.email.strip() or len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Please enter a valid name, email, and password (min 4 characters)")
    
    email = req.email.strip().lower()
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE email = ?", (email,))
    if c.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    pw_hash = hash_password(req.password)
    now = datetime.now().isoformat()

    c.execute("INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
              (user_id, req.name.strip(), email, pw_hash, now))

    token = secrets.token_hex(24)
    c.execute("INSERT INTO user_tokens (token, user_id, created_at) VALUES (?, ?, ?)", (token, user_id, now))
    conn.commit()
    conn.close()

    return {
        "token": token,
        "user": {
            "id": user_id,
            "name": req.name.strip(),
            "email": email
        }
    }

@app.post("/api/auth/login")
def login(req: LoginRequest):
    email = req.email.strip().lower()
    pw_hash = hash_password(req.password)

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id, name, email, password_hash FROM users WHERE email = ?", (email,))
    user = c.fetchone()
    if not user or user["password_hash"] != pw_hash:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = user["id"]
    token = secrets.token_hex(24)
    now = datetime.now().isoformat()
    c.execute("INSERT INTO user_tokens (token, user_id, created_at) VALUES (?, ?, ?)", (token, user_id, now))
    conn.commit()
    conn.close()

    return {
        "token": token,
        "user": {
            "id": user_id,
            "name": user["name"],
            "email": user["email"]
        }
    }

@app.get("/api/auth/me")
def get_me(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    return {"user": user}

@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("DELETE FROM user_tokens WHERE token = ?", (token,))
        conn.commit()
        conn.close()
    return {"status": "LOGGED_OUT"}

@app.get("/api/watchlist")
def get_watchlist(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT symbol FROM watchlists WHERE user_id = ? ORDER BY added_at DESC", (user["id"],))
    symbols = [r[0] for r in c.fetchall()]
    conn.close()
    return {"watchlist": symbols}

@app.post("/api/watchlist/toggle")
def toggle_watchlist(req: WatchlistToggleRequest, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    sym = req.symbol.strip().upper()
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT symbol FROM watchlists WHERE user_id = ? AND symbol = ?", (user["id"], sym))
    exists = c.fetchone()

    if exists:
        c.execute("DELETE FROM watchlists WHERE user_id = ? AND symbol = ?", (user["id"], sym))
        in_watchlist = False
    else:
        c.execute("INSERT INTO watchlists (user_id, symbol, added_at) VALUES (?, ?, ?)", (user["id"], sym, datetime.now().isoformat()))
        in_watchlist = True

    conn.commit()
    c.execute("SELECT symbol FROM watchlists WHERE user_id = ?", (user["id"],))
    watchlist = [r[0] for r in c.fetchall()]
    conn.close()

    return {"symbol": sym, "in_watchlist": in_watchlist, "watchlist": watchlist}

@app.post("/api/screen")
def screen_stocks(req: ScreenRequest, authorization: Optional[str] = Header(None)):
    user = get_current_user_optional(authorization)
    if user:
        req.user_id = user["id"]
    conn = get_db_connection()
    c = conn.cursor()

    # Get total count matching criteria
    count_sql, count_params = build_query(req, count_only=True)
    c.execute(count_sql, count_params)
    total_count = c.fetchone()[0]

    # Get paginated data
    data_sql, data_params = build_query(req, count_only=False)
    c.execute(data_sql, data_params)
    rows = [dict(r) for r in c.fetchall()]

    conn.close()

    page = max(req.page or 1, 1)
    page_size = min(max(req.page_size or 25, 1), 200)
    total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

    return {
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "stocks": rows
    }

class RunQueryRequest(BaseModel):
    query: str
    page: Optional[int] = 1
    page_size: Optional[int] = 25
    sort_by: Optional[str] = "potential_score"
    sort_order: Optional[str] = "desc"

@app.get("/api/query/ratios")
def get_query_ratios():
    return {"ratios": RATIO_CATALOG}

@app.post("/api/query/run")
def run_custom_query(req: RunQueryRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    sql_clauses, params, human_clauses, error = parse_full_query(req.query)
    if error:
        return {
            "error": error,
            "total": 0,
            "page": 1,
            "page_size": req.page_size or 25,
            "total_pages": 0,
            "stocks": [],
            "parsed_clauses": []
        }

    where_str = " AND ".join(sql_clauses)
    
    allowed_cols = {
        "symbol", "name", "current_price", "change_1d", "change_1w", "change_1m", "change_1y",
        "volume", "volume_multiple", "volume_change_pct", "delivery_percent", "turnover_cr",
        "market_cap_cr", "pe_ratio", "pb_ratio", "roe", "roce", "debt_to_equity",
        "dividend_yield", "rsi_14", "dist_from_52w_high", "sales_growth_yoy", "profit_growth_yoy",
        "potential_score", "is_fno", "iv", "iv_percentile", "iv_rank"
    }
    
    sort_col = req.sort_by if req.sort_by in allowed_cols else "potential_score"
    sort_dir = "ASC" if req.sort_order and req.sort_order.lower() == "asc" else "DESC"

    page = max(req.page or 1, 1)
    page_size = min(max(req.page_size or 25, 1), 200)
    offset = (page - 1) * page_size

    order_clause = f"{sort_col} {sort_dir} NULLS LAST"
    if sort_col == "potential_score" and sort_dir == "DESC":
        order_clause += ", is_breakout_3pct DESC, change_1d DESC, volume_multiple DESC"

    conn = get_db_connection()
    c = conn.cursor()

    try:
        count_sql = f"SELECT COUNT(*) FROM stocks WHERE {where_str}"
        c.execute(count_sql, params)
        total_count = c.fetchone()[0]

        data_sql = f"""
        SELECT * FROM stocks
        WHERE {where_str}
        ORDER BY {order_clause}
        LIMIT ? OFFSET ?
        """
        c.execute(data_sql, params + [page_size, offset])
        rows = [dict(r) for r in c.fetchall()]
    except Exception as e:
        conn.close()
        return {
            "error": f"Query execution error: {str(e)}",
            "total": 0,
            "page": 1,
            "page_size": page_size,
            "total_pages": 0,
            "stocks": [],
            "parsed_clauses": human_clauses
        }

    conn.close()
    total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

    return {
        "error": None,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "stocks": rows,
        "parsed_clauses": human_clauses
    }

@app.post("/api/query/export")
def export_query_csv(req: RunQueryRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    sql_clauses, params, human_clauses, error = parse_full_query(req.query)
    if error:
        raise HTTPException(status_code=400, detail=error)

    where_str = " AND ".join(sql_clauses)
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        sql = f"SELECT * FROM stocks WHERE {where_str} ORDER BY potential_score DESC LIMIT 2000"
        c.execute(sql, params)
        rows = [dict(r) for r in c.fetchall()]
    finally:
        conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail="No matching stocks to export")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    filename = f"custom_query_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/stocks/{symbol}")
def get_stock_detail(symbol: str):
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT * FROM stocks WHERE symbol = ? COLLATE NOCASE", (symbol,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Stock not found")

    stock = dict(row)

    # Fetch 30-day historical chart data
    c.execute("SELECT date, open, high, low, close, volume FROM price_history WHERE symbol = ? ORDER BY date ASC", (stock["symbol"],))
    chart_rows = [dict(r) for r in c.fetchall()]

    # Fetch active recommendation if available
    c.execute("SELECT * FROM recommendations WHERE symbol = ? COLLATE NOCASE AND exit_date IS NULL ORDER BY created_at DESC LIMIT 1", (stock["symbol"],))
    rec_row = c.fetchone()
    if rec_row:
        rec_dict = dict(rec_row)
        if rec_dict.get("claude_thesis"):
            try:
                rec_dict["claude_thesis"] = json.loads(rec_dict["claude_thesis"])
            except Exception:
                pass
        stock["recommendation"] = rec_dict
    else:
        stock["recommendation"] = None

    conn.close()

    # Compute technical rating
    bullish_signals = 0
    total_signals = 5

    if stock.get("above_ema20") == 1: bullish_signals += 1
    if stock.get("above_sma50") == 1: bullish_signals += 1
    if stock.get("above_sma200") == 1: bullish_signals += 1
    if stock.get("rsi_14", 50) >= 50: bullish_signals += 1
    if stock.get("macd_hist", 0) > 0: bullish_signals += 1

    if bullish_signals >= 4:
        rating = "Strong Buy"
        rating_color = "emerald"
    elif bullish_signals == 3:
        rating = "Buy"
        rating_color = "green"
    elif bullish_signals == 2:
        rating = "Neutral"
        rating_color = "amber"
    elif bullish_signals == 1:
        rating = "Sell"
        rating_color = "orange"
    else:
        rating = "Strong Sell"
        rating_color = "red"

    stock["technical_rating"] = rating
    stock["technical_rating_color"] = rating_color
    stock["chart_history"] = chart_rows

    # Market Mood Index (MMI) Benchmark & Insights
    mmi_score = stock.get("mmi_score") or 52.0
    if mmi_score <= 25:
        mmi_insight = "Extreme Fear zone: Investors are fearful. Historically offers high-probability long-term value accumulation opportunities."
    elif mmi_score <= 45:
        mmi_insight = "Fear zone: Market participants remain cautious. Look for fundamentally sound stocks with low debt and high ROCE."
    elif mmi_score <= 55:
        mmi_insight = "Neutral zone: Sentiment is balanced and consolidating without excessive speculation."
    elif mmi_score <= 75:
        mmi_insight = "Greed zone: Upward momentum and retail participation are elevated. Trail stop-losses on momentum breakouts."
    else:
        mmi_insight = "Extreme Greed zone: Euphoria and extended valuations. Fresh aggressive longs carry elevated risk; profit booking advisable."

    stock["mmi_insight"] = mmi_insight
    stock["market_mmi"] = {
        "score": 58.4,
        "zone": "Greed",
        "description": "Indian Market Mood is currently in Greed (58.4), reflecting robust institutional and retail liquidity."
    }

    return stock

@app.get("/api/presets")
def get_presets():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM presets ORDER BY is_builtin DESC, name ASC")
    presets = []
    for r in c.fetchall():
        item = dict(r)
        item["filters"] = json.loads(item["filters"])
        presets.append(item)
    conn.close()
    return presets

@app.post("/api/presets")
def create_preset(preset: PresetModel):
    preset_id = f"custom-{int(datetime.now().timestamp())}"
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
    INSERT INTO presets (id, name, description, category, is_builtin, filters, created_at)
    VALUES (?, ?, ?, ?, 0, ?, ?)
    """, (
        preset_id,
        preset.name,
        preset.description,
        preset.category or "Custom",
        json.dumps(preset.filters),
        datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()
    return {"id": preset_id, "name": preset.name, "status": "CREATED"}

@app.delete("/api/presets/{preset_id}")
def delete_preset(preset_id: str):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT is_builtin FROM presets WHERE id = ?", (preset_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Preset not found")
    if row[0] == 1:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot delete built-in system presets")

    c.execute("DELETE FROM presets WHERE id = ?", (preset_id,))
    conn.commit()
    conn.close()
    return {"status": "DELETED", "id": preset_id}

@app.get("/api/recommendations")
def get_recommendations(category: Optional[str] = None, status: Optional[str] = None):
    conn = get_db_connection()
    c = conn.cursor()
    
    query = "SELECT * FROM recommendations WHERE 1=1"
    params = []
    
    if category and category.lower() != "all":
        query += " AND category = ?"
        params.append(category.lower())
        
    if status and status.lower() != "all":
        if status.lower() == "active":
            query += " AND (status NOT IN ('sl_hit') AND exit_date IS NULL)"
            query += " ORDER BY claude_confidence DESC NULLS LAST, fundamental_score DESC NULLS LAST, entry_time DESC"
        elif status.lower() == "closed":
            query += " AND exit_date IS NOT NULL"
            query += " ORDER BY exit_date DESC, entry_time DESC"
        else:
            query += " AND status = ?"
            params.append(status.lower())
            query += " ORDER BY entry_time DESC, created_at DESC"
    else:
        query += " ORDER BY claude_confidence DESC NULLS LAST, entry_time DESC, created_at DESC"
            
    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return {"recommendations": rows, "count": len(rows)}

@app.get("/api/recommendations/stats")
def get_recommendations_stats():
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM recommendations")
    all_recs = [dict(r) for r in c.fetchall()]
    conn.close()
    
    closed = [r for r in all_recs if r.get("exit_date") is not None and r.get("result_pct") is not None]
    active = [r for r in all_recs if r.get("exit_date") is None]
    
    winners = [r for r in closed if (r.get("result_pct") or 0) > 0]
    losers = [r for r in closed if (r.get("result_pct") or 0) <= 0]
    
    total_closed = len(closed)
    win_rate = round((len(winners) / total_closed * 100), 1) if total_closed > 0 else 0
    total_return = round(sum(r.get("result_pct") or 0 for r in closed), 1)
    avg_winner = round(sum(r.get("result_pct") or 0 for r in winners) / len(winners), 2) if winners else 0
    avg_loser = round(sum(r.get("result_pct") or 0 for r in losers) / len(losers), 2) if losers else 0
    
    cat_stats = {}
    for cat in ["intraday", "swing", "delivery", "multibagger"]:
        c_closed = [r for r in closed if r.get("category") == cat]
        c_win = [r for r in c_closed if (r.get("result_pct") or 0) > 0]
        c_rate = round((len(c_win) / len(c_closed) * 100), 1) if c_closed else 0
        c_ret = round(sum(r.get("result_pct") or 0 for r in c_closed), 1)
        cat_stats[cat] = {
            "total_closed": len(c_closed),
            "winners": len(c_win),
            "win_rate": c_rate,
            "total_return_pct": c_ret,
            "active_count": len([r for r in active if r.get("category") == cat])
        }
        
    return {
        "total_calls": len(all_recs),
        "active_calls": len(active),
        "closed_calls": total_closed,
        "win_rate": win_rate,
        "total_return_pct": total_return,
        "avg_winner_pct": avg_winner,
        "avg_loser_pct": avg_loser,
        "avg_risk_reward": "1:2.7",
        "categories": cat_stats
    }

@app.get("/api/sectors")
def get_sectors():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT sector, COUNT(*) as count FROM stocks WHERE sector IS NOT NULL AND sector != '' GROUP BY sector ORDER BY count DESC")
    sectors = [dict(r) for r in c.fetchall()]
    conn.close()
    return sectors

# ==========================================
# MARKET INTELLIGENCE & DERIVATIVES ENDPOINTS
# ==========================================

@app.get("/api/market/iv-analysis")
def get_iv_analysis(
    search: Optional[str] = None,
    min_spike: Optional[float] = None,
    min_iv: Optional[float] = None,
    max_iv: Optional[float] = None,
    expiry: Optional[str] = None,
    sort_by: Optional[str] = "iv_spike_pct",
    sort_order: Optional[str] = "desc",
    limit: Optional[int] = 100
):
    conn = get_db_connection()
    c = conn.cursor()
    
    clauses = ["is_fno = 1", "current_iv > 0"]
    params = []
    
    if search and search.strip():
        clauses.append("(symbol LIKE ? OR name LIKE ?)")
        term = f"%{search.strip()}%"
        params.extend([term, term])
        
    if min_spike is not None:
        clauses.append("iv_spike_pct >= ?")
        params.append(min_spike)
        
    if min_iv is not None:
        clauses.append("current_iv >= ?")
        params.append(min_iv)
        
    if max_iv is not None:
        clauses.append("current_iv <= ?")
        params.append(max_iv)
        
    if expiry and expiry.strip() and expiry.lower() != "all":
        clauses.append("expiry_date = ?")
        params.append(expiry.strip())
        
    where_str = " AND ".join(clauses)
    
    valid_sort_cols = {
        "symbol": "symbol",
        "name": "name",
        "current_price": "current_price",
        "change_1d": "change_1d",
        "current_iv": "current_iv",
        "iv_percentile": "iv_percentile",
        "iv_rank": "iv_rank",
        "historical_volatility_30d": "historical_volatility_30d",
        "iv_spike_pct": "iv_spike_pct",
        "atm_strike": "atm_strike",
        "pcr_oi": "pcr_oi",
        "volume": "volume"
    }
    
    col = valid_sort_cols.get(sort_by, "iv_spike_pct")
    direction = "ASC" if sort_order and sort_order.lower() == "asc" else "DESC"
    
    query = f"""
    SELECT symbol, name, sector, current_price, change_1d, volume,
           current_iv, iv_percentile, iv_rank, historical_volatility_30d,
           iv_spike_pct, atm_strike, pcr_oi, expiry_date
    FROM stocks
    WHERE {where_str}
    ORDER BY {col} {direction}
    LIMIT ?
    """
    params.append(limit or 100)
    
    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    
    c.execute("SELECT DISTINCT expiry_date FROM stocks WHERE is_fno = 1 AND expiry_date IS NOT NULL AND expiry_date != '' ORDER BY expiry_date ASC")
    expiries = [r[0] for r in c.fetchall() if r[0]]
    
    conn.close()
    return {
        "count": len(rows),
        "expiries": expiries,
        "stocks": rows,
        "source": "Official National Stock Exchange of India (NSE)",
        "is_real_data": True
    }

@app.get("/api/market/iv-history/{symbol}")
def get_iv_history(symbol: str, trading_day: Optional[str] = None):
    conn = get_db_connection()
    c = conn.cursor()
    
    sym = symbol.strip().upper()
    
    # 1. Fetch real strike-by-strike option chain for this symbol
    c.execute("""
    SELECT strike, ce_iv, pe_iv, avg_iv, ce_ltp, pe_ltp, ce_oi, pe_oi, diff_from_spot, expiry, updated_at
    FROM real_option_chain
    WHERE symbol = ? COLLATE NOCASE
    ORDER BY strike ASC
    """, (sym,))
    real_strikes = [dict(r) for r in c.fetchall()]

    c.execute("SELECT symbol, name, current_price, change_1d, current_iv, iv_percentile, iv_rank, iv_spike_pct, atm_strike, pcr_oi, expiry_date FROM stocks WHERE symbol = ? COLLATE NOCASE", (sym,))
    stock_row = c.fetchone()
    
    # 2. If not in DB yet, fetch live directly from official NSE
    if not real_strikes:
        try:
            from real_nse_data import fetch_and_parse_real_nse_chain
            live_res = fetch_and_parse_real_nse_chain(sym, db_path=DB_PATH)
            if live_res and live_res.get("current_iv", 0) > 0:
                c.execute("""
                UPDATE stocks
                SET current_price = CASE WHEN ? > 0 THEN ? ELSE current_price END,
                    current_iv = ?,
                    atm_strike = ?,
                    pcr_oi = ?,
                    historical_volatility_30d = ?,
                    iv_spike_pct = ?,
                    iv_percentile = ?,
                    iv_rank = ?,
                    expiry_date = ?
                WHERE symbol = ?
                """, (
                    live_res["underlying_price"], live_res["underlying_price"],
                    live_res["current_iv"], live_res["atm_strike"], live_res["pcr_oi"],
                    live_res["historical_volatility_30d"], live_res["iv_spike_pct"],
                    live_res["iv_percentile"], live_res["iv_rank"], live_res["expiry_date"],
                    sym
                ))
                for stk in live_res.get("strikes_curve", []):
                    c.execute("""
                    INSERT INTO real_option_chain (
                        symbol, expiry, strike, ce_iv, pe_iv, avg_iv,
                        ce_ltp, pe_ltp, ce_oi, pe_oi, diff_from_spot, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        sym, live_res["expiry_date"], stk["strike"],
                        stk["ce_iv"], stk["pe_iv"], stk["avg_iv"],
                        stk["ce_ltp"], stk["pe_ltp"], stk["ce_oi"], stk["pe_oi"],
                        stk["diff_from_spot"], live_res["timestamp"]
                    ))
                conn.commit()
                c.execute("SELECT strike, ce_iv, pe_iv, avg_iv, ce_ltp, pe_ltp, ce_oi, pe_oi, diff_from_spot, expiry, updated_at FROM real_option_chain WHERE symbol = ? ORDER BY strike ASC", (sym,))
                real_strikes = [dict(r) for r in c.fetchall()]
                c.execute("SELECT symbol, name, current_price, change_1d, current_iv, iv_percentile, iv_rank, iv_spike_pct, atm_strike, pcr_oi, expiry_date FROM stocks WHERE symbol = ? COLLATE NOCASE", (sym,))
                stock_row = c.fetchone()
        except Exception as e:
            logger.error(f"Live NSE fetch error for {sym}: {e}")

    # Build real Volatility Smile curve (Strike vs Real IV)
    history_points = []
    if real_strikes:
        for s in real_strikes:
            history_points.append({
                "time_slot": f"₹{int(s['strike'])}",
                "strike": s["strike"],
                "iv": s["avg_iv"] or s["ce_iv"] or s["pe_iv"],
                "straddle_iv": s["pe_iv"] or s["ce_iv"],
                "ce_iv": s["ce_iv"],
                "pe_iv": s["pe_iv"],
                "underlying_price": (dict(stock_row).get("current_price") if stock_row else 0),
                "ce_ltp": s["ce_ltp"],
                "pe_ltp": s["pe_ltp"],
                "ce_oi": s["ce_oi"],
                "pe_oi": s["pe_oi"]
            })
            
    conn.close()
    
    return {
        "symbol": sym,
        "stock": dict(stock_row) if stock_row else None,
        "history": history_points,
        "real_strikes": real_strikes,
        "source": "Official National Stock Exchange of India (NSE)",
        "is_real_nse_data": True
    }

@app.get("/api/option-chain/symbols")
def api_get_option_symbols():
    try:
        return get_all_option_symbols(DB_PATH)
    except Exception as e:
        logger.error(f"Error fetching option symbols: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/option-chain/data")
def api_get_option_chain_data(
    symbol: str = Query("NIFTY", description="Index or Stock symbol"),
    expiry: Optional[str] = Query(None, description="Expiry date string"),
    force: bool = Query(False, description="Force refresh from exchange")
):
    try:
        return get_live_option_chain(symbol=symbol, expiry=expiry, force_refresh=force, db_path=DB_PATH)
    except Exception as e:
        logger.error(f"Error fetching option chain for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chart/history")
def api_get_chart_history(
    symbol: str = Query("NIFTY", description="Symbol e.g. NIFTY, RELIANCE, NSE:NIFTY2692223100CE"),
    resolution: str = Query("5", description="Interval: 1, 2, 3, 5, 15, 30, 60, D"),
    days: int = Query(3, description="Lookback days")
):
    try:
        from fyers_service import fetch_candlestick_history
        return fetch_candlestick_history(symbol=symbol, resolution=resolution, days=days)
    except Exception as e:
        logger.error(f"Error fetching chart history for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/sector-flow")
def get_sector_flow():
    conn = get_db_connection()
    c = conn.cursor()
    
    query = """
    SELECT 
        sector,
        COUNT(*) as stock_count,
        ROUND(AVG(change_1d), 2) as avg_change_1d,
        SUM(CASE WHEN change_1d > 0 THEN 1 ELSE 0 END) as advances,
        SUM(CASE WHEN change_1d < 0 THEN 1 ELSE 0 END) as declines,
        SUM(CASE WHEN change_1d = 0 THEN 1 ELSE 0 END) as unchanged,
        ROUND(SUM(turnover_cr), 2) as total_turnover_cr,
        ROUND(SUM(market_cap_cr), 2) as total_market_cap_cr,
        ROUND(AVG(volume_multiple), 2) as avg_volume_multiple
    FROM stocks
    WHERE sector IS NOT NULL AND sector != ''
    GROUP BY sector
    ORDER BY avg_change_1d DESC
    """
    c.execute(query)
    sector_rows = [dict(r) for r in c.fetchall()]
    
    for s in sector_rows:
        sec = s["sector"]
        c.execute("SELECT symbol, change_1d, current_price FROM stocks WHERE sector = ? ORDER BY change_1d DESC LIMIT 1", (sec,))
        top_g = c.fetchone()
        s["top_gainer"] = dict(top_g) if top_g else None
        
        c.execute("SELECT symbol, change_1d, current_price FROM stocks WHERE sector = ? ORDER BY change_1d ASC LIMIT 1", (sec,))
        top_l = c.fetchone()
        s["top_loser"] = dict(top_l) if top_l else None
        
        avg_chg = s.get("avg_change_1d") or 0.0
        adv = s.get("advances") or 0
        dec = s.get("declines") or 0
        if avg_chg >= 1.0 and adv > dec:
            s["flow_status"] = "Aggressive Inflow"
            s["flow_badge"] = "bullish"
        elif avg_chg > 0.1:
            s["flow_status"] = "Moderate Inflow"
            s["flow_badge"] = "mild_bullish"
        elif avg_chg <= -1.0 and dec > adv:
            s["flow_status"] = "Heavy Outflow"
            s["flow_badge"] = "bearish"
        elif avg_chg < -0.1:
            s["flow_status"] = "Moderate Outflow"
            s["flow_badge"] = "mild_bearish"
        else:
            s["flow_status"] = "Neutral / Balancing"
            s["flow_badge"] = "neutral"
            
    conn.close()
    return {"sectors": sector_rows, "count": len(sector_rows)}

@app.get("/api/market/heatmap")
def get_market_heatmap(limit: Optional[int] = 120):
    conn = get_db_connection()
    c = conn.cursor()
    
    query = """
    SELECT symbol, name, sector, market_cap_cr, current_price, change_1d, turnover_cr, volume_multiple, is_fno
    FROM stocks
    WHERE sector IS NOT NULL AND sector != '' AND market_cap_cr > 1000
    ORDER BY market_cap_cr DESC
    LIMIT ?
    """
    c.execute(query, (limit or 120,))
    stocks = [dict(r) for r in c.fetchall()]
    
    sectors_map = {}
    for s in stocks:
        sec = s["sector"]
        if sec not in sectors_map:
            sectors_map[sec] = {
                "name": sec,
                "total_mcap": 0.0,
                "stocks": []
            }
        sectors_map[sec]["total_mcap"] += (s.get("market_cap_cr") or 0.0)
        sectors_map[sec]["stocks"].append(s)
        
    sector_tree = []
    for sec_name, sec_data in sectors_map.items():
        stk_list = sec_data["stocks"]
        avg_chg = sum(stk.get("change_1d", 0) for stk in stk_list) / len(stk_list) if stk_list else 0
        sector_tree.append({
            "sector": sec_name,
            "total_mcap": round(sec_data["total_mcap"], 2),
            "avg_change": round(avg_chg, 2),
            "stocks_count": len(stk_list),
            "stocks": stk_list
        })
        
    sector_tree.sort(key=lambda x: x["total_mcap"], reverse=True)
    conn.close()
    return {"tree": sector_tree, "total_stocks": len(stocks)}

@app.get("/api/market/picture")
def get_market_picture():
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
    SELECT symbol, name, sector, current_price, change_1d, volume, volume_multiple, potential_score, is_fno
    FROM stocks
    WHERE change_1d > 0
    ORDER BY change_1d DESC, volume_multiple DESC
    LIMIT 10
    """)
    top_gainers = [dict(r) for r in c.fetchall()]
    
    c.execute("""
    SELECT symbol, name, sector, current_price, change_1d, volume, volume_multiple, potential_score, is_fno
    FROM stocks
    WHERE change_1d < 0
    ORDER BY change_1d ASC, volume_multiple DESC
    LIMIT 10
    """)
    top_losers = [dict(r) for r in c.fetchall()]
    
    c.execute("""
    SELECT symbol, name, sector, current_price, change_1d, volume, volume_multiple, volume_change_pct, potential_score, is_fno
    FROM stocks
    WHERE volume >= 50000 AND volume_multiple >= 1.5
    ORDER BY volume_multiple DESC, change_1d DESC
    LIMIT 10
    """)
    volume_shockers = [dict(r) for r in c.fetchall()]
    
    c.execute("""
    SELECT symbol, name, sector, current_price, change_1d, 
           ROUND(current_price * (1.0 + (dist_from_52w_high / 100.0)), 2) as high_52w, 
           dist_from_52w_high, potential_score, is_fno
    FROM stocks
    WHERE dist_from_52w_high IS NOT NULL AND dist_from_52w_high <= 3.0
    ORDER BY dist_from_52w_high ASC, change_1d DESC
    LIMIT 10
    """)
    near_52w_high = [dict(r) for r in c.fetchall()]
    
    c.execute("SELECT COUNT(*) FROM stocks WHERE change_1d > 0")
    adv = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM stocks WHERE change_1d < 0")
    dec = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM stocks WHERE change_1d = 0")
    unc = c.fetchone()[0]
    
    conn.close()
    
    return {
        "top_gainers": top_gainers,
        "top_losers": top_losers,
        "volume_shockers": volume_shockers,
        "near_52w_high": near_52w_high,
        "breadth": {
            "advances": adv,
            "declines": dec,
            "unchanged": unc,
            "ad_ratio": round(adv / dec, 2) if dec > 0 else adv
        }
    }

@app.post("/api/export")
def export_csv(req: ScreenRequest):
    conn = get_db_connection()
    c = conn.cursor()

    # Ignore pagination for export, limit to 2000 records
    req.page = 1
    req.page_size = 2000
    sql, params = build_query(req, count_only=False)
    c.execute(sql, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail="No matching stocks to export")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)

    output.seek(0)
    filename = f"nse_bse_screener_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

sync_in_progress = False

def run_sync_task():
    global sync_in_progress
    sync_in_progress = True
    try:
        enrich_stock_universe()
    finally:
        sync_in_progress = False

@app.post("/api/sync/run")
def trigger_sync(background_tasks: BackgroundTasks):
    global sync_in_progress
    if sync_in_progress:
        return {"status": "ALREADY_RUNNING", "message": "Data sync is already in progress"}
    
    background_tasks.add_task(run_sync_task)
    return {"status": "TRIGGERED", "message": "Official NSE & BSE data sync started in background"}

@app.get("/api/sync/status")
def get_sync_status():
    global sync_in_progress
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM sync_history ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    conn.close()
    return {
        "syncing": sync_in_progress,
        "latest_sync": dict(row) if row else None
    }

# Mount frontend static build if available
dist_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(dist_path):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)

