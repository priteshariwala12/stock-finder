from curl_cffi import requests
import json

session = requests.Session(impersonate="chrome124")
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# 1. Warm up session
session.get("https://www.nseindia.com/option-chain", headers=headers, timeout=15)

api_headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/option-chain",
    "X-Requested-With": "XMLHttpRequest"
}

# 2. Get contract info (expiry dates)
r1 = session.get("https://www.nseindia.com/api/option-chain-contract-info?symbol=NIFTY", headers=api_headers, timeout=15)
print("Contract info NIFTY status:", r1.status_code, "Length:", len(r1.text))
if r1.status_code == 200:
    info = r1.json()
    print("Contract info keys:", list(info.keys()))
    expiries = info.get("expiryDates", [])
    print("Available Expiries for NIFTY:", expiries[:5])

    if expiries:
        # 3. Call option-chain-v3 with expiry parameter!
        target_expiry = expiries[0]
        url_chain = f"https://www.nseindia.com/api/option-chain-v3?type=Indices&symbol=NIFTY&expiry={target_expiry}"
        r2 = session.get(url_chain, headers=api_headers, timeout=15)
        print(f"Chain status for {target_expiry}:", r2.status_code, "Length:", len(r2.text))
        if r2.status_code == 200 and len(r2.text) > 100:
            cdata = r2.json()
            print("Records keys:", list(cdata.get("records", {}).keys()))
            print("Underlying:", cdata.get("records", {}).get("underlyingValue"))
            data_rows = cdata.get("records", {}).get("data", [])
            print(f"Total Strike Rows returned: {len(data_rows)}")
            for row in data_rows:
                if "CE" in row and row["CE"].get("impliedVolatility", 0) > 0:
                    ce = row["CE"]
                    print("SUCCESS! Real NSE Strike:", ce["strikePrice"], "REAL IV:", ce["impliedVolatility"], "LTP:", ce["lastPrice"], "OI:", ce["openInterest"])
                    break
