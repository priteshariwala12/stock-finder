from curl_cffi import requests
import re

session = requests.Session(impersonate="chrome124")
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
}

r = session.get("https://www.nseindia.com/dist/js/sections/option-chain-v3.js?v=10092026", headers=headers, timeout=15)
print("JS status:", r.status_code, "Length:", len(r.text))

# Find lines containing option-chain-v3
for line in r.text.split("\n"):
    if "option-chain-v3" in line or "option-chain" in line:
        print("Found line:", line[:300])
