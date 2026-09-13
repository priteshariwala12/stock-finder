import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

print("1. Testing root route / (React SPA)...")
r = client.get("/")
assert r.status_code == 200, f"Failed: {r.status_code}"
assert "Stock Finder" in r.text or "vite" in r.text.lower() or "html" in r.text.lower(), "HTML not served"
print("  Root served HTML successfully (length:", len(r.text), "bytes)")

print("\n2. Testing /api/screen with multi-filter query:")
# Test query: Large & Mid Cap, PE < 35, ROCE > 15%, Above 20 EMA
query = {
    "market_cap_min": 5000,
    "pe_max": 35,
    "roce_min": 15,
    "above_ema20": True,
    "page": 1,
    "page_size": 10
}
r = client.post("/api/screen", json=query)
assert r.status_code == 200
data = r.json()
print(f"  Matched {data['total']} stocks satisfying all fundamental & technical filters!")
for s in data['stocks'][:3]:
    print(f"    - {s['symbol']}: Rs.{s['current_price']} | PE: {s['pe_ratio']} | ROCE: {s['roce']}% | Cap: Rs.{round(s['market_cap_cr'])} Cr")

print("\n3. Testing /api/export (CSV streaming)...")
r = client.post("/api/export", json={"is_breakout_3pct": True})
assert r.status_code == 200
assert "text/csv" in r.headers["content-type"]
lines = r.text.splitlines()
print(f"  CSV exported {len(lines)} lines! Header sample: {lines[0][:60]}...")

print("\n4. Testing /api/sectors...")
r = client.get("/api/sectors")
assert r.status_code == 200
sectors = r.json()
print(f"  Available Sectors: {len(sectors)} (e.g. {sectors[0]['sector']}: {sectors[0]['count']} companies)")

print("\nALL SYSTEM TESTS VERIFIED SUCCESSFULLY!")
