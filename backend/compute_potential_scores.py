import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'stocks.db')

def compute_stock_potential(s):
    # Check if stock has active Claude recommendation
    fund_s = s.get('rec_fund_score')
    tech_s = s.get('rec_tech_score')
    claude_conf = s.get('rec_claude_conf')
    
    base_potential = 0.0
    
    # 1. Fundamental Quality (Max 3.0)
    roce = s.get('roce') or 0.0
    if roce >= 25: base_potential += 1.2
    elif roce >= 18: base_potential += 0.9
    elif roce >= 12: base_potential += 0.6
    elif roce >= 8: base_potential += 0.3
    
    roe = s.get('roe') or 0.0
    if roe >= 20: base_potential += 0.8
    elif roe >= 15: base_potential += 0.6
    elif roe >= 10: base_potential += 0.4
    
    de = s.get('debt_to_equity') if s.get('debt_to_equity') is not None else 1.0
    if de <= 0.3: base_potential += 1.0
    elif de <= 0.7: base_potential += 0.7
    elif de <= 1.2: base_potential += 0.4
    elif de > 2.0: base_potential -= 0.6
    
    # 2. Growth & Quality Health (Max 2.5)
    pg = s.get('profit_growth_yoy') or 0.0
    if pg >= 25: base_potential += 1.2
    elif pg >= 15: base_potential += 0.9
    elif pg >= 8: base_potential += 0.5
    
    sg = s.get('sales_growth_yoy') or 0.0
    if sg >= 20: base_potential += 0.8
    elif sg >= 10: base_potential += 0.5
    elif sg >= 5: base_potential += 0.3
    
    piot = s.get('piotroski_score') or 5
    if piot >= 8: base_potential += 0.5
    elif piot >= 6: base_potential += 0.3
    
    # 3. Technical Momentum & Accumulation (Max 2.5)
    if s.get('is_breakout_3pct') == 1: base_potential += 0.9
    vm = s.get('volume_multiple') or 1.0
    if vm >= 2.0: base_potential += 0.7
    elif vm >= 1.4: base_potential += 0.4
    
    deliv = s.get('delivery_percent') or 0.0
    if deliv >= 60: base_potential += 0.5
    elif deliv >= 45: base_potential += 0.3
    
    if s.get('above_sma200') == 1 and s.get('above_sma50') == 1: base_potential += 0.3
    if s.get('above_ema20') == 1: base_potential += 0.2
    if s.get('golden_cross') == 1: base_potential += 0.2
    
    # 4. Asymmetric Growth Multiplier Headroom (Max 2.0)
    p = s.get('current_price') or 100.0
    mc = s.get('market_cap_cr') or 5000.0
    if p < 50 or mc < 2000: base_potential += 1.2
    elif p < 150 or mc < 10000: base_potential += 0.8
    elif mc > 200000: base_potential -= 0.6
    
    # Synergize with Claude.ai recommendation score if available
    if fund_s and tech_s:
        rec_avg = (float(fund_s) + float(tech_s)) / 2.0
        final_score = round(rec_avg * 0.75 + (base_potential / 10.0 * 2.5), 1)
    else:
        final_score = round(base_potential, 1)
        
    final_score = min(max(final_score, 1.0), 9.9)
    
    if final_score >= 8.2:
        grade = 'Top Potential'
    elif final_score >= 7.5:
        grade = 'High Potential'
    elif final_score >= 6.8:
        grade = 'Strong Momentum'
    elif final_score >= 5.5:
        grade = 'Growth Compounder'
    else:
        grade = 'Moderate'
        
    return final_score, grade

def sync_potential_scores():
    print('Connecting to database:', DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # 1. Add columns if missing
    c.execute('PRAGMA table_info(stocks)')
    cols = [r[1] for r in c.fetchall()]
    if 'potential_score' not in cols:
        print('Adding potential_score column to stocks table...')
        c.execute('ALTER TABLE stocks ADD COLUMN potential_score REAL DEFAULT 5.0')
    if 'potential_grade' not in cols:
        print('Adding potential_grade column to stocks table...')
        c.execute('ALTER TABLE stocks ADD COLUMN potential_grade TEXT DEFAULT "Moderate"')
    conn.commit()
    
    # 2. Fetch all stocks with recommendation data
    c.execute('''
    SELECT s.symbol, s.name, s.current_price, s.market_cap_cr, s.roce, s.roe, s.profit_growth_yoy, s.sales_growth_yoy,
           s.debt_to_equity, s.volume_multiple, s.delivery_percent, s.is_breakout_3pct, s.golden_cross,
           s.above_sma200, s.above_sma50, s.above_ema20, s.piotroski_score,
           r.fundamental_score as rec_fund_score, r.technical_score as rec_tech_score, r.claude_confidence as rec_claude_conf
    FROM stocks s
    LEFT JOIN recommendations r ON s.symbol = r.symbol AND r.exit_date IS NULL
    ''')
    
    col_names = [d[0] for d in c.description]
    stocks = [dict(zip(col_names, r)) for r in c.fetchall()]
    print(f'Computing potential scores for {len(stocks)} stocks...')
    
    updates = []
    for s in stocks:
        score, grade = compute_stock_potential(s)
        updates.append((score, grade, s['symbol']))
        
    c.executemany('''
    UPDATE stocks
    SET potential_score = ?, potential_grade = ?
    WHERE symbol = ?
    ''', updates)
    
    # 3. Create index for fast sorting
    c.execute('CREATE INDEX IF NOT EXISTS idx_stocks_potential ON stocks(potential_score DESC)')
    conn.commit()
    
    # 4. Verify top 10
    c.execute('SELECT symbol, name, potential_score, potential_grade, current_price, market_cap_cr, roce, is_breakout_3pct FROM stocks ORDER BY potential_score DESC LIMIT 10')
    print('\nTop 10 Stocks by Potential Score:')
    for row in c.fetchall():
        print(f'{row[0]:<12} | {row[2]:4.1f}/10 | {row[3]:<18} | Rs {row[4]:7.2f} | Rs {row[5]:8.1f}Cr | ROCE {row[6]:4.1f}% | Breakout: {row[7]}')
        
    conn.close()
    print('\nSUCCESS: Potential score engine synced successfully!')

if __name__ == '__main__':
    sync_potential_scores()
