from curl_cffi import requests
import json

session = requests.Session(impersonate="chrome124")
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
session.get("https://www.nseindia.com", headers=headers, timeout=10)

params_to_test = [
    "nse50_opt",
    "stock_opt",
    "all_opt",
    "all_fut",
    "stock_fut",
    "opt_fut",
    "nifty_bank_opt"
]

for p in params_to_test:
    url = f"https://www.nseindia.com/api/liveEquity-derivatives?index={p}"
    r = session.get(url, headers={"Referer": "https://www.nseindia.com/market-data/live-equity-derivatives"}, timeout=10)
    print(f"Index: {p} => Status: {r.status_code}, Length: {len(r.text)}")
    if r.status_code == 200:
        data = r.json()
        items = data.get("data", [])
        print(f"   Items count: {len(items)}")
        if items:
            sample = items[0]
            print(f"   Sample: {sample.get('underlying')} | {sample.get('contract')} | Price: {sample.get('lastPrice')} | Underlying: {sample.get('underlyingValue')}")
