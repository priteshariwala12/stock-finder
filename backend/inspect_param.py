from curl_cffi import requests
import re

session = requests.Session(impersonate="chrome124")
r = session.get("https://www.nseindia.com/dist/js/sections/option-chain-v3.js?v=10092026", timeout=15)

for line in r.text.split("\n"):
    if "paramTypeSpEx" in line or "option-chain-contract-info" in line:
        print("Param line:", line.strip())
