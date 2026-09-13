import sqlite3
import os
import csv
from datetime import datetime
from curl_cffi import requests

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'stocks.db')

# Official BSE Index Lot Sizes from BSE Circular 20240930-62 / SEBI guidelines
BSE_OFFICIAL_INDEX_LOTS = [
    ('SENSEX', 'BSE SENSEX', 20, 1, 'BSE'),
    ('BANKEX', 'BSE BANKEX', 30, 1, 'BSE'),
    ('SENSEX50', 'BSE SENSEX 50', 40, 1, 'BSE'),
]

def sync_fno_list():
    print("Connecting to database:", DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 1. Add is_fno, lot_size, and volume_change_pct if missing
    c.execute("PRAGMA table_info(stocks)")
    cols = [r[1] for r in c.fetchall()]
    if 'is_fno' not in cols:
        print("Adding is_fno column to stocks table...")
        c.execute("ALTER TABLE stocks ADD COLUMN is_fno INTEGER DEFAULT 0")
    if 'lot_size' not in cols:
        print("Adding lot_size column to stocks table...")
        c.execute("ALTER TABLE stocks ADD COLUMN lot_size INTEGER DEFAULT NULL")
    if 'volume_change_pct' not in cols:
        print("Adding volume_change_pct column to stocks table...")
        c.execute("ALTER TABLE stocks ADD COLUMN volume_change_pct REAL DEFAULT 0.0")
    conn.commit()

    # 2. Create market_lots table for full derivatives registry
    c.execute("""
    CREATE TABLE IF NOT EXISTS market_lots (
        symbol TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        lot_size INTEGER NOT NULL,
        is_index INTEGER NOT NULL DEFAULT 0,
        exchange TEXT NOT NULL DEFAULT 'NSE',
        updated_at TEXT NOT NULL
    )
    """)
    conn.commit()

    # 3. Fetch official market lot sizes file from NSE Archives
    url = 'https://nsearchives.nseindia.com/content/fo/fo_mktlots.csv'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.nseindia.com/'
    }
    s = requests.Session(impersonate='chrome120')
    
    indices_data = []
    stocks_data = []
    now_str = datetime.now().isoformat()

    try:
        r = s.get(url, headers=headers, timeout=15)
        if r.status_code == 200:
            lines = r.text.strip().splitlines()
            reader = csv.reader(lines)
            next(reader)  # Skip header

            current_section = 'INDICES'
            for row in reader:
                if not row or not any(row):
                    continue
                col0 = row[0].strip()
                col1 = row[1].strip()
                col2 = row[2].strip()
                if 'Derivatives on Individual Securities' in col0:
                    current_section = 'STOCKS'
                    continue
                if col1 in ['SYMBOL', 'Symbol', '']:
                    continue
                try:
                    lot = int(col2)
                except ValueError:
                    continue

                if current_section == 'INDICES':
                    indices_data.append((col1, col0, lot, 1, 'NSE', now_str))
                else:
                    stocks_data.append((col1, col0, lot, 0, 'NSE', now_str))

            print(f"Fetched {len(indices_data)} official indices and {len(stocks_data)} official stock lot sizes from NSE Archives.")
    except Exception as e:
        print("Failed to download from NSE archives:", e)

    # 4. Insert all official lots into market_lots table
    all_lots_to_insert = list(indices_data)
    for bse_sym, bse_name, bse_lot, bse_idx, bse_exch in BSE_OFFICIAL_INDEX_LOTS:
        all_lots_to_insert.append((bse_sym, bse_name, bse_lot, bse_idx, bse_exch, now_str))
    all_lots_to_insert.extend(stocks_data)

    if all_lots_to_insert:
        c.executemany("""
        INSERT OR REPLACE INTO market_lots (symbol, name, lot_size, is_index, exchange, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, all_lots_to_insert)
        conn.commit()

    # 5. Update stocks table: reset is_fno and lot_size, then apply official values
    c.execute("UPDATE stocks SET is_fno = 0, lot_size = NULL")
    
    updated_count = 0
    for sym, name, lot, is_idx, exch, dt in stocks_data:
        c.execute("UPDATE stocks SET is_fno = 1, lot_size = ? WHERE symbol = ?", (lot, sym))
        if c.rowcount > 0:
            updated_count += c.rowcount
        else:
            # Handle alias mappings (e.g. TMPV is Tata Motors)
            if sym == 'TMPV':
                c.execute("UPDATE stocks SET is_fno = 1, lot_size = ? WHERE symbol = ?", (lot, 'TATAMOTORS'))
                if c.rowcount > 0:
                    updated_count += c.rowcount

    # 6. Update volume_change_pct
    c.execute("UPDATE stocks SET volume_change_pct = ROUND((volume_multiple - 1.0) * 100.0, 1) WHERE volume_multiple IS NOT NULL")

    # 7. Create indexes
    c.execute("CREATE INDEX IF NOT EXISTS idx_stocks_is_fno ON stocks(is_fno)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_stocks_lot_size ON stocks(lot_size)")
    conn.commit()

    # 8. Verify
    c.execute("SELECT COUNT(*) FROM stocks WHERE is_fno = 1")
    matched_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM market_lots")
    total_market_lots = c.fetchone()[0]
    print(f"\nSUCCESS: Synced {total_market_lots} official market lots (NSE & BSE)!")
    print(f"Marked {matched_count} stocks as F&O with official real lot sizes in stocks.db!")

    print("\nSample Verified Instruments with Official Lot Sizes:")
    c.execute("""
    SELECT symbol, name, lot_size, is_index, exchange 
    FROM market_lots 
    WHERE symbol IN ('NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX', 'RELIANCE', 'TCS', 'HDFCBANK', 'YESBANK', 'CANBK', 'IDEA', 'MARUTI')
    ORDER BY is_index DESC, symbol ASC
    """)
    for r in c.fetchall():
        tag = 'Index' if r[3] else 'Stock'
        print(f"  {r[0]:<12} | Lot: {r[2]:6} | {r[4]} {tag} | {r[1]}")

    conn.close()

if __name__ == '__main__':
    sync_fno_list()
