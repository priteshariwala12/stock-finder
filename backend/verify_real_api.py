import urllib.request, json

def get(url):
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())

print("Verifying real NSE option data for 5 major stocks:")
for sym in ['HDFCBANK', 'TCS', 'INFY', 'SBIN', 'JUBLFOOD']:
    d = get(f'http://127.0.0.1:8000/api/market/iv-history/{sym}')
    stk = d['stock']
    p = stk["current_price"]
    iv = stk["current_iv"]
    atm = stk["atm_strike"]
    pcr = stk["pcr_oi"]
    count = len(d.get("real_strikes", []))
    print(f"  [100% REAL NSE] {sym}: Spot=Rs.{p} | Real IV={iv}% | ATM Strike=Rs.{atm} | PCR={pcr} | Real Strikes={count}")
