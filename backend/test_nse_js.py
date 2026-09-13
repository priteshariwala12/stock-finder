from curl_cffi import requests
import re

session = requests.Session(impersonate="chrome124")
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

r = session.get("https://www.nseindia.com/option-chain", headers=headers, timeout=15)
print("Option chain page status:", r.status_code)
matches = re.findall(r'https?://[^\s"\'<>]+|/api/[^\s"\'<>]+', r.text)
for m in matches:
    if "api" in m or "option" in m:
        print("Match:", m)

# Search inside JS files referenced by option-chain
scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', r.text)
print("Scripts count:", len(scripts))
for s in scripts:
    if "option" in s or "main" in s or "app" in s or "vendor" in s:
        print("Relevant script:", s)
        try:
            full_url = s if s.startswith("http") else "https://www.nseindia.com" + s
            s_res = session.get(full_url, headers=headers, timeout=10)
            js_apis = re.findall(r'["\'](/api/[^"\']+)["\']', s_res.text)
            for j in set(js_apis):
                if "option" in j or "chain" in j:
                    print("   Found in JS:", j)
        except Exception as e:
            print("   Err:", e)
