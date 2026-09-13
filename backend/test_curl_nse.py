from curl_cffi import requests
import json

session = requests.Session(impersonate="chrome124")
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
session.get("https://www.nseindia.com", headers=headers, timeout=10)

# Fetch live derivatives
r = session.get("https://www.nseindia.com/api/liveEquity-derivatives?index=nse50_opt", headers={"Referer": "https://www.nseindia.com"}, timeout=15)
data = r.json()
print("Keys:", list(data.keys()))
items = data.get("data", [])
print(f"Total live derivative contracts: {len(items)}")
if items:
    print("Sample contract keys:", list(items[0].keys()))
    print("Sample contract item:\n", json.dumps(items[0], indent=2))

# Also check for stock options
r_stock = session.get("https://www.nseindia.com/api/liveEquity-derivatives?index=stock_opt", headers={"Referer": "https://www.nseindia.com"}, timeout=15)
if r_stock.status_code == 200:
    sdata = r_stock.json()
    sitems = sdata.get("data", [])
    print(f"Total stock option contracts: {len(sitems)}")
    if sitems:
        print("Sample stock option:\n", json.dumps(sitems[0], indent=2))
