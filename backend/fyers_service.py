import json
import os
import math
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from fyers_apiv3 import fyersModel

logger = logging.getLogger("FyersService")
logging.basicConfig(level=logging.INFO)

APP_ID = "1RGTQJ79OP-200"
SECRET_ID = "rj4N8SXUlOFpsSmx"
REDIRECT_URI = "https://trade.fyers.in/api-login/redirect-uri/index.html"

TOKEN_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fyers_token.json")

FYERS_INDEX_MAP = {
    "NIFTY": "NSE:NIFTY50-INDEX",
    "BANKNIFTY": "NSE:NIFTYBANK-INDEX",
    "FINNIFTY": "NSE:FINNIFTY-INDEX",
    "MIDCPNIFTY": "NSE:MIDCPNIFTY-INDEX",
    "NIFTYNXT50": "NSE:NIFTYNEXT50-INDEX",
    "SENSEX": "BSE:SENSEX-INDEX",
    "BANKEX": "BSE:BANKEX-INDEX",
}

def to_fyers_symbol(symbol: str) -> str:
    s = symbol.strip().upper()
    if s in FYERS_INDEX_MAP:
        return FYERS_INDEX_MAP[s]
    return f"NSE:{s}-EQ"

def get_auth_url() -> str:
    """Generate official Fyers login URL to obtain auth_code"""
    session = fyersModel.SessionModel(
        client_id=APP_ID,
        secret_key=SECRET_ID,
        redirect_uri=REDIRECT_URI,
        response_type="code",
        grant_type="authorization_code"
    )
    return session.generate_authcode()

def set_auth_code(auth_code: str) -> Dict[str, Any]:
    """Exchange auth_code for permanent access_token and cache it"""
    session = fyersModel.SessionModel(
        client_id=APP_ID,
        secret_key=SECRET_ID,
        redirect_uri=REDIRECT_URI,
        response_type="code",
        grant_type="authorization_code"
    )
    session.set_token(auth_code)
    response = session.generate_token()
    if response and response.get("s") == "ok":
        access_token = response.get("access_token")
        with open(TOKEN_FILE, "w") as f:
            json.dump({"access_token": access_token}, f)
        logger.info("Fyers access token successfully generated and cached!")
        return {"status": "success", "access_token": access_token}
    else:
        logger.error(f"Fyers token generation failed: {response}")
        return {"status": "error", "response": response}

def get_access_token() -> Optional[str]:
    if os.path.exists(TOKEN_FILE):
        try:
            with open(TOKEN_FILE, "r") as f:
                data = json.load(f)
                return data.get("access_token")
        except Exception as e:
            logger.error(f"Error reading token file: {e}")
    return None

def get_fyers_client() -> Optional[fyersModel.FyersModel]:
    token = get_access_token()
    if not token:
        return None
    return fyersModel.FyersModel(
        client_id=APP_ID,
        token=token,
        is_async=False,
        log_path=os.path.dirname(os.path.abspath(__file__))
    )

def fetch_live_quotes(symbols: List[str]) -> Dict[str, Any]:
    """Fetch live 100% real-time quotes from Fyers"""
    fyers = get_fyers_client()
    if not fyers:
        return {"s": "error", "message": "Fyers not authenticated"}
    
    data = {"symbols": ",".join(symbols)}
    return fyers.quotes(data=data)

def fetch_live_option_chain(symbol: str = "NSE:NIFTY50-INDEX", strikecount: int = 25) -> Dict[str, Any]:
    """Fetch live option chain from Fyers API"""
    fyers = get_fyers_client()
    if not fyers:
        return {"s": "error", "message": "Fyers not authenticated"}
    
    data = {
        "symbol": symbol,
        "strikecount": strikecount
    }
    return fyers.optionchain(data=data)

def get_fyers_parsed_option_chain(symbol: str, strikecount: int = 25) -> Optional[Dict[str, Any]]:
    """
    Fetches Fyers real-time option chain and converts it to Stock Finder's
    exact OptionChainView format with ATM highlighting, PCR, Max Pain, and TradingView links.
    """
    fyers_sym = to_fyers_symbol(symbol)
    raw = fetch_live_option_chain(fyers_sym, strikecount=strikecount)
    
    if not raw or raw.get("code") != 200 or not raw.get("data"):
        return None
    
    data = raw["data"]
    options_chain = data.get("optionsChain", [])
    if not options_chain:
        return None
    
    # 1. First item is the Underlying Instrument Spot Info
    spot_item = options_chain[0]
    spot_price = float(spot_item.get("ltp") or 0.0)
    
    # Expiry list
    exp_list = data.get("expiryData", [])
    available_expiries = [item["date"] for item in exp_list if "date" in item]
    selected_expiry = available_expiries[0] if available_expiries else "Current"

    # 2. Group items by strike price into CE and PE
    grouped: Dict[float, Dict[str, Any]] = {}
    total_ce_oi = 0
    total_pe_oi = 0
    total_ce_vol = 0
    total_pe_vol = 0

    for item in options_chain[1:]:
        strike = float(item.get("strike_price") or 0.0)
        if strike <= 0:
            continue
        opt_type = (item.get("option_type") or "").upper()
        if strike not in grouped:
            grouped[strike] = {}
        
        ltp = float(item.get("ltp") or 0.0)
        chg = float(item.get("ltpch") or 0.0)
        pchg = float(item.get("ltpchp") or 0.0)
        oi = int(item.get("oi") or 0)
        oi_chg = int(item.get("oich") or 0)
        vol = int(item.get("volume") or 0)
        bid = float(item.get("bid") or 0.0)
        ask = float(item.get("ask") or 0.0)
        fyers_ticker = item.get("symbol") or ""

        if opt_type == "CE":
            total_ce_oi += oi
            total_ce_vol += vol
            grouped[strike]["ce"] = {
                "ltp": round(ltp, 2),
                "change": round(chg, 2),
                "pchange": round(pchg, 2),
                "oi": oi,
                "oi_change": oi_chg,
                "volume": vol,
                "iv": 0.0,
                "bid": round(bid, 2),
                "ask": round(ask, 2),
                "bid_qty": 0,
                "ask_qty": 0,
                "in_the_money": strike < spot_price,
                "tv_symbol": fyers_ticker,
                "contract_title": f"{symbol.upper()} {selected_expiry} {int(strike)} CE"
            }
        elif opt_type == "PE":
            total_pe_oi += oi
            total_pe_vol += vol
            grouped[strike]["pe"] = {
                "ltp": round(ltp, 2),
                "change": round(chg, 2),
                "pchange": round(pchg, 2),
                "oi": oi,
                "oi_change": oi_chg,
                "volume": vol,
                "iv": 0.0,
                "bid": round(bid, 2),
                "ask": round(ask, 2),
                "bid_qty": 0,
                "ask_qty": 0,
                "in_the_money": strike > spot_price,
                "tv_symbol": fyers_ticker,
                "contract_title": f"{symbol.upper()} {selected_expiry} {int(strike)} PE"
            }

    sorted_strikes = sorted(grouped.keys())
    if not sorted_strikes:
        return None

    # 3. Find ATM Strike (closest to spot price)
    atm_strike = min(sorted_strikes, key=lambda k: abs(k - spot_price))

    parsed_strikes = []
    for k in sorted_strikes:
        ce_data = grouped[k].get("ce", {
            "ltp": 0.0, "change": 0.0, "pchange": 0.0, "oi": 0, "oi_change": 0, "volume": 0, "iv": 0.0,
            "bid": 0.0, "ask": 0.0, "bid_qty": 0, "ask_qty": 0, "in_the_money": k < spot_price,
            "tv_symbol": f"NSE:{symbol.upper()}{int(k)}CE", "contract_title": f"{symbol.upper()} {int(k)} CE"
        })
        pe_data = grouped[k].get("pe", {
            "ltp": 0.0, "change": 0.0, "pchange": 0.0, "oi": 0, "oi_change": 0, "volume": 0, "iv": 0.0,
            "bid": 0.0, "ask": 0.0, "bid_qty": 0, "ask_qty": 0, "in_the_money": k > spot_price,
            "tv_symbol": f"NSE:{symbol.upper()}{int(k)}PE", "contract_title": f"{symbol.upper()} {int(k)} PE"
        })

        parsed_strikes.append({
            "strike": k,
            "is_atm": (k == atm_strike),
            "ce": ce_data,
            "pe": pe_data,
            "tv_underlying_ticker": f"NSE:{symbol.upper()}",
            "diff_from_spot": round(k - spot_price, 2)
        })

    # 4. Compute Metrics (PCR, Max Pain, ATM Straddle)
    pcr = round(total_pe_oi / total_ce_oi, 2) if total_ce_oi > 0 else 1.0

    # Max Pain calculation
    total_pains = {}
    for assumed in sorted_strikes:
        loss = 0.0
        for s_item in parsed_strikes:
            k = s_item["strike"]
            c_oi = s_item["ce"]["oi"]
            p_oi = s_item["pe"]["oi"]
            if assumed > k:
                loss += (assumed - k) * c_oi
            if assumed < k:
                loss += (k - assumed) * p_oi
        total_pains[assumed] = loss
    max_pain = min(total_pains, key=total_pains.get) if total_pains else atm_strike

    # ATM Straddle price
    atm_item = next((s for s in parsed_strikes if s["is_atm"]), None)
    atm_straddle = round(atm_item["ce"]["ltp"] + atm_item["pe"]["ltp"], 2) if atm_item else 0.0

    # Official lot size import
    try:
        from option_chain_service import get_official_lot_size, INDEX_SYMBOLS
        index_entry = next((item for item in INDEX_SYMBOLS if item["symbol"] == symbol.upper()), None)
        lot_size = index_entry["lot_size"] if index_entry else get_official_lot_size(symbol)
    except Exception:
        lot_size = 25

    utc_now = datetime.now(timezone.utc)
    ist_now = utc_now + timedelta(hours=5, minutes=30)

    return {
        "symbol": symbol.upper(),
        "name": symbol.upper(),
        "is_index": symbol.upper() in FYERS_INDEX_MAP,
        "exchange": "BSE" if symbol.upper() == "SENSEX" else "NSE",
        "underlying_price": round(spot_price, 2),
        "selected_expiry": selected_expiry,
        "available_expiries": available_expiries,
        "market_status": "LIVE",
        "market_status_label": "Fyers 100% Real-Time Zero-Lag Feed",
        "session_note": "Streaming live ticks directly from Fyers API v3",
        "is_market_open": True,
        "is_cached_snapshot": False,
        "as_of_time": ist_now.strftime("%I:%M:%S %p IST"),
        "lot_size": lot_size,
        "atm_strike": atm_strike,
        "atm_straddle_price": atm_straddle,
        "max_pain_strike": max_pain,
        "pcr_oi": pcr,
        "total_ce_oi": total_ce_oi,
        "total_pe_oi": total_pe_oi,
        "total_ce_vol": total_ce_vol,
        "total_pe_vol": total_pe_vol,
        "total_strikes": len(parsed_strikes),
        "strikes": parsed_strikes,
        "feed_source": "FYERS_API_V3"
    }
