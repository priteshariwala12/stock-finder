from fastapi.testclient import TestClient
from server import app
import json
import sys
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

client = TestClient(app)

print("1. Testing /api/market/summary...")
r = client.get("/api/market/summary")
assert r.status_code == 200, f"Failed: {r.status_code}"
summary = r.json()
print("Market Summary:")
print(f"  Total Stocks: {summary['total_stocks']}")
print(f"  Advances: {summary['advances']}, Declines: {summary['declines']}")
print(f"  3% Breakouts: {summary['breakouts_3pct_count']}")

print("\n2. Testing /api/presets...")
r = client.get("/api/presets")
assert r.status_code == 200
presets = r.json()
print(f"  Loaded {len(presets)} presets. Example: {presets[0]['name']}")

print("\n3. Testing /api/screen for 3% Breakouts...")
r = client.post("/api/screen", json={"is_breakout_3pct": True, "page": 1, "page_size": 5})
assert r.status_code == 200
screen_res = r.json()
print(f"  Total 3% Breakout matches: {screen_res['total']}")
for s in screen_res['stocks'][:3]:
    print(f"    - {s['symbol']}: Price: Rs.{s['current_price']} (+{s['change_1d']}%), Vol: {s['volume']}, Delivery: {s['delivery_percent']}%")

print("\n4. Testing /api/screen for Buffett Value screen...")
r = client.post("/api/screen", json={"pe_max": 25, "roce_min": 15, "debt_to_equity_max": 0.5, "page_size": 5})
assert r.status_code == 200
print(f"  Total Value matches: {r.json()['total']}")

print("\n5. Testing /api/stocks/RELIANCE detail...")
r = client.get("/api/stocks/RELIANCE")
assert r.status_code == 200
stock = r.json()
print(f"  RELIANCE Sector: {stock['sector']}, Technical Rating: {stock['technical_rating']}")

print("\n6. Testing Auth & Watchlist...")
test_email = f"trader_{int(time.time())}@example.com"
r = client.post("/api/auth/signup", json={"name": "Rajiv Sharma", "email": test_email, "password": "password123"})
assert r.status_code == 200, f"Signup failed: {r.text}"
auth_data = r.json()
token = auth_data["token"]
print(f"  Signup successful for {auth_data['user']['name']} (Token length: {len(token)})")

# Test Login
r = client.post("/api/auth/login", json={"email": test_email, "password": "password123"})
assert r.status_code == 200
print(f"  Login successful!")

# Test /me
r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
assert r.status_code == 200
assert r.json()["user"]["name"] == "Rajiv Sharma"

# Test Toggle Watchlist
r = client.post("/api/watchlist/toggle", json={"symbol": "RELIANCE"}, headers={"Authorization": f"Bearer {token}"})
assert r.status_code == 200
assert r.json()["in_watchlist"] is True
print(f"  Added RELIANCE to user watchlist!")

# Test Screen Watchlist Only
r = client.post("/api/screen", json={"watchlist_only": True}, headers={"Authorization": f"Bearer {token}"})
assert r.status_code == 200
screen_wl = r.json()
assert screen_wl["total"] == 1
assert screen_wl["stocks"][0]["symbol"] == "RELIANCE"
print(f"  Watchlist screening verified: exactly 1 stock matched (RELIANCE)")

print("\nALL BACKEND API & AUTH TESTS PASSED!")

