from curl_cffi import requests
import json

session = requests.Session(impersonate="chrome124")
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# First hit main page
session.get("https://www.nseindia.com", headers=headers, timeout=10)

api_headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/option-chain",
}

urls = [
    "https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY",
    "https://www.nseindia.com/api/option-chain-indices?symbol=BANKNIFTY",
    "https://www.nseindia.com/api/option-chain-equities?symbol=TCS",
    "https://www.nseindia.com/api/option-chain-equities?symbol=INFY"
]

for u in urls:
    r = session.get(u, headers=api_headers, timeout=10)
    print(u.split("/")[-1], "=> Status:", r.status_code, "Length:", len(r.text))
    if len(r.text) > 100:
        data = r.json()
        print("   Underlying:", data.get("records", {}).get("underlyingValue"))
        print("   Expiries:", data.get("records", {}).get("expiryDates", [])[:2])
