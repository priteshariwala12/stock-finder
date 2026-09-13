from real_nse_data import fetch_and_parse_real_nse_chain

for s in ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'SBIN']:
    res = fetch_and_parse_real_nse_chain(s)
    if res:
        sym = res["symbol"]
        price = res["underlying_price"]
        exp = res["expiry_date"]
        atm = res["atm_strike"]
        iv = res["current_iv"]
        hv = res["historical_volatility_30d"]
        spike = res["iv_spike_pct"]
        pcr = res["pcr_oi"]
        print(f"[REAL NSE] {sym}: Price=Rs.{price} | Expiry={exp} | ATM Strike=Rs.{atm} | IV={iv}% | HV30D={hv}% | IV Spike={spike}% | PCR={pcr}")
    else:
        print(f"Failed {s}")
