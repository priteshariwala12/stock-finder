from curl_cffi import requests
from bs4 import BeautifulSoup

session = requests.Session(impersonate="chrome124")
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

r = session.get("https://www.nseindia.com/get-quotes/derivatives?symbol=RELIANCE", headers=headers, timeout=15)
print("Derivatives page status:", r.status_code)
if r.status_code == 200:
    soup = BeautifulSoup(r.text, "html.parser")
    scripts = soup.find_all("script")
    print(f"Found {len(scripts)} scripts")
    # Search for api endpoints in html/scripts
    import re
    apis = re.findall(r'["\'](/api/[^"\']+)["\']', r.text)
    print("Found API endpoints:", set(apis))
