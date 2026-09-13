import sqlite3
import random
from datetime import datetime, timedelta

def enrich_iv_data():
    db_path = "stocks.db"
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    print("Adding IV columns to stocks table if missing...")
    c.execute("PRAGMA table_info(stocks)")
    cols = [r[1] for r in c.fetchall()]

    iv_cols = {
        "current_iv": "REAL DEFAULT 0.0",
        "iv_percentile": "REAL DEFAULT 50.0",
        "iv_rank": "REAL DEFAULT 50.0",
        "historical_volatility_30d": "REAL DEFAULT 0.0",
        "iv_spike_pct": "REAL DEFAULT 0.0",
        "atm_strike": "REAL DEFAULT 0.0",
        "pcr_oi": "REAL DEFAULT 1.0",
        "expiry_date": "TEXT DEFAULT '2026-09-24'"
    }

    for col, col_def in iv_cols.items():
        if col not in cols:
            print(f"Adding column {col}...")
            c.execute(f"ALTER TABLE stocks ADD COLUMN {col} {col_def}")

    # Create table for intraday IV chart series
    c.execute("""
    CREATE TABLE IF NOT EXISTS iv_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        trading_day TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        iv REAL NOT NULL,
        underlying_price REAL NOT NULL,
        straddle_iv REAL NOT NULL
    )
    """)
    c.execute("CREATE INDEX IF NOT EXISTS idx_iv_hist_sym ON iv_history(symbol, trading_day)")

    # Fetch all F&O stocks
    c.execute("SELECT symbol, current_price, change_1d, is_fno FROM stocks WHERE is_fno = 1")
    fno_stocks = c.fetchall()
    print(f"Enriching IV metrics for {len(fno_stocks)} F&O securities...")

    random.seed(101)
    updates = []
    
    # Clean old history
    c.execute("DELETE FROM iv_history")

    trading_day = "2026-09-11"
    time_slots = [
        "09:15", "09:30", "09:45", "10:00", "10:30", "11:00", "11:30",
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"
    ]
    
    hist_rows = []

    for sym, price, chg, _ in fno_stocks:
        price = price or 1000.0
        chg = chg or 0.0
        
        # Calculate ATM Strike with standard rounding
        if price < 100:
            strike_step = 2.5
        elif price < 500:
            strike_step = 10.0
        elif price < 1500:
            strike_step = 20.0
        elif price < 3000:
            strike_step = 50.0
        else:
            strike_step = 100.0

        atm_strike = round(round(price / strike_step) * strike_step, 2)

        # Baseline IV typically 18% to 55%
        base_iv = round(random.uniform(22.0, 48.0), 2)
        hv_30d = round(base_iv * random.uniform(0.75, 1.15), 2)
        iv_percentile = round(random.uniform(15.0, 96.0), 1)
        iv_rank = round(random.uniform(10.0, 92.0), 1)
        pcr = round(random.uniform(0.65, 1.45), 2)
        
        # IV Spike % (high volatility on big moves)
        if abs(chg) >= 3.0 or iv_percentile >= 75:
            iv_spike = round(random.uniform(11.0, 28.5), 1)
        elif abs(chg) >= 1.5:
            iv_spike = round(random.uniform(4.0, 14.0), 1)
        else:
            iv_spike = round(random.uniform(-8.0, 8.0), 1)

        expiry_date = "2026-09-24" if random.random() > 0.3 else "2026-10-29"

        updates.append((
            base_iv, iv_percentile, iv_rank, hv_30d, iv_spike,
            atm_strike, pcr, expiry_date, sym
        ))

        # Generate intraday IV chart curve for top F&O symbols
        if sym in ("RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL", "TATAMOTORS", "BAJFINANCE", "SUZLON", "YESBANK", "NBCC", "LT"):
            curr_chart_iv = base_iv
            curr_spot = price * 0.99
            for ts in time_slots:
                curr_chart_iv = round(max(curr_chart_iv + random.uniform(-0.8, 0.9), 10.0), 2)
                curr_spot = round(curr_spot + (price * random.uniform(-0.004, 0.005)), 2)
                straddle = round(curr_chart_iv * random.uniform(0.95, 1.05), 2)
                hist_rows.append((sym, trading_day, ts, curr_chart_iv, curr_spot, straddle))

    c.executemany("""
        UPDATE stocks SET 
            current_iv = ?, iv_percentile = ?, iv_rank = ?, 
            historical_volatility_30d = ?, iv_spike_pct = ?,
            atm_strike = ?, pcr_oi = ?, expiry_date = ?
        WHERE symbol = ?
    """, updates)

    c.executemany("""
        INSERT INTO iv_history (symbol, trading_day, time_slot, iv, underlying_price, straddle_iv)
        VALUES (?, ?, ?, ?, ?, ?)
    """, hist_rows)

    conn.commit()

    c.execute("SELECT COUNT(*) FROM stocks WHERE is_fno = 1 AND iv_spike_pct >= 10.0")
    spike_10 = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM stocks WHERE is_fno = 1 AND iv_spike_pct >= 15.0")
    spike_15 = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM stocks WHERE is_fno = 1 AND iv_spike_pct >= 20.0")
    spike_20 = c.fetchone()[0]

    print(f"IV Spikes: >=10%: {spike_10}, >=15%: {spike_15}, >=20%: {spike_20}")
    print(f"Generated {len(hist_rows)} intraday IV chart points.")
    conn.close()

if __name__ == "__main__":
    enrich_iv_data()
