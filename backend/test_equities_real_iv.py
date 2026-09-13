from curl_cffi import requests
import json

session = requests.Session(impersonate="chrome124")
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
session.get("https://www.nseindia.com/option-chain", headers=headers, timeout=15)

api_headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/option-chain",
    "X-Requested-With": "XMLHttpRequest"
}

stocks_to_test = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "SBIN", "TATAMOTORS"]

for sym in stocks_to_test:
    r_info = session.get(f"https://www.nseindia.com/api/option-chain-contract-info?symbol={sym}", headers=api_headers, timeout=15)
    if r_info.status_code == 200:
        info = r_info.json()
        expiries = info.get("expiryDates", [])
        if expiries:
            exp = expiries[0]
            url = f"https://www.nseindia.com/api/option-chain-v3?type=Equity&symbol={sym}&expiry={exp}"
            r_chain = session.get(url, headers=api_headers, timeout=15)
            if r_chain.status_code == 200:
                cdata = r_chain.json()
                rec = cdata.get("records", {})
                spot = rec.get("underlyingValue")
                rows = rec.get("data", [])
                
                # Find ATM strike
                atm_diff = 999999
                atm_ce = None
                atm_pe = None
                total_ce_oi = 0
                total_pe_oi = 0
                for row in rows:
                    strike = row.get("strikePrice", 0)
                    if "CE" in row:
                        total_ce_oi += row["CE"].get("openInterest", 0)
                    if "PE" in row:
                        total_pe_oi += row["PE"].get("openInterest", 0)
                    if abs(strike - spot) < atm_diff:
                        atm_diff = abs(strike - spot)
                        atm_ce = row.get("CE")
                        atm_pe = row.get("PE")
                
                pcr = round(total_pe_oi / total_ce_oi, 2) if total_ce_oi > 0 else 1.0
                atm_strike = atm_ce.get("strikePrice") if atm_ce else (atm_pe.get("strikePrice") if atm_pe else 0)
                atm_iv = (atm_ce.get("impliedVolatility") if atm_ce and atm_ce.get("impliedVolatility", 0) > 0 else (atm_pe.get("impliedVolatility") if atm_pe else 0)) or 0
                
                print(f"[REAL NSE] {sym}: Spot=Rs.{spot} | Expiry={exp} | ATM Strike=Rs.{atm_strike} | REAL IV={atm_iv}% | PCR={pcr} | Strikes Count={len(rows)}")
    else:
        print(f"Failed {sym}: status={r_info.status_code}")
