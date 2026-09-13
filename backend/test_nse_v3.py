from curl_cffi import requests
import json

session = requests.Session(impersonate="chrome124")
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Warm up session
session.get("https://www.nseindia.com/option-chain", headers=headers, timeout=15)

api_headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/option-chain",
    "X-Requested-With": "XMLHttpRequest"
}

# Test 1: RELIANCE Equity
url1 = "https://www.nseindia.com/api/option-chain-v3?type=Equity&symbol=RELIANCE"
r1 = session.get(url1, headers=api_headers, timeout=15)
print("Option chain v3 RELIANCE status:", r1.status_code, "Length:", len(r1.text))
if r1.status_code == 200 and len(r1.text) > 100:
    d1 = r1.json()
    rec = d1.get("records", {})
    print("RELIANCE Underlying:", rec.get("underlyingValue"))
    print("Expiries:", rec.get("expiryDates", [])[:4])
    data_list = rec.get("data", [])
    print("Total strike levels:", len(data_list))
    for row in data_list:
        if "CE" in row and row["CE"].get("impliedVolatility", 0) > 0:
            print("REAL CE:", row["CE"]["strikePrice"], "REAL IV:", row["CE"]["impliedVolatility"], "LTP:", row["CE"]["lastPrice"], "OI:", row["CE"]["openInterest"])
            break

# Test 2: NIFTY Indices
url2 = "https://www.nseindia.com/api/option-chain-v3?type=Indices&symbol=NIFTY"
r2 = session.get(url2, headers=api_headers, timeout=15)
print("Option chain v3 NIFTY status:", r2.status_code, "Length:", len(r2.text))
if r2.status_code == 200 and len(r2.text) > 100:
    d2 = r2.json()
    rec = d2.get("records", {})
    print("NIFTY Underlying:", rec.get("underlyingValue"))
    print("Expiries:", rec.get("expiryDates", [])[:4])
