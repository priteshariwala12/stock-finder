import sqlite3
import re

def enrich_sectors():
    db_path = "stocks.db"
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    print("Enriching sector classifications in stocks.db...")

    SYMBOL_MAP = {
        # Financials
        "HDFCBANK": "Financial Services", "ICICIBANK": "Financial Services", "SBIN": "Financial Services",
        "KOTAKBANK": "Financial Services", "AXISBANK": "Financial Services", "BAJFINANCE": "Financial Services",
        "BAJAJFINSV": "Financial Services", "HDFCLIFE": "Financial Services", "SBILIFE": "Financial Services",
        "PFC": "Financial Services", "RECLTD": "Financial Services", "YESBANK": "Financial Services",
        "PNB": "Financial Services", "BANKBARODA": "Financial Services", "CANBK": "Financial Services",
        "IDFCFIRSTB": "Financial Services", "MUTHOOTFIN": "Financial Services", "CHOLAFIN": "Financial Services",
        "SHRIRAMFIN": "Financial Services", "LICI": "Financial Services", "INDUSINDBK": "Financial Services",
        "FEDERALBNK": "Financial Services", "AUBANK": "Financial Services", "MANAPPURAM": "Financial Services",
        "J&KBANK": "Financial Services", "BANDHANBNK": "Financial Services", "UNIONBANK": "Financial Services",
        "IOB": "Financial Services", "UCOBANK": "Financial Services", "CENTRALBK": "Financial Services",
        
        # IT
        "TCS": "Information Technology", "INFY": "Information Technology", "HCLTECH": "Information Technology",
        "WIPRO": "Information Technology", "TECHM": "Information Technology", "LTIM": "Information Technology",
        "PERSISTENT": "Information Technology", "COFORGE": "Information Technology", "MPHASIS": "Information Technology",
        "LTTS": "Information Technology", "TATAELXSI": "Information Technology", "KPITTECH": "Information Technology",
        "CYIENT": "Information Technology", "ZENSARTECH": "Information Technology", "BSOFT": "Information Technology",
        
        # Automobile
        "MARUTI": "Automobile", "TATAMOTORS": "Automobile", "M&M": "Automobile", "BAJAJ-AUTO": "Automobile",
        "EICHERMOT": "Automobile", "HEROMOTOCO": "Automobile", "TVSMOTOR": "Automobile", "ASHOKLEY": "Automobile",
        "BHARATFORG": "Automobile", "MOTHERSON": "Automobile", "BALKRISIND": "Automobile", "MRF": "Automobile",
        "APOLLOTYRE": "Automobile", "EXIDEIND": "Automobile", "AMARAJABAT": "Automobile", "BOSCHLTD": "Automobile",
        
        # Healthcare & Pharma
        "SUNPHARMA": "Healthcare", "CIPLA": "Healthcare", "DRREDDY": "Healthcare", "DIVISLAB": "Healthcare",
        "APOLLOHOSP": "Healthcare", "LUPIN": "Healthcare", "AUROPHARMA": "Healthcare", "ALKEM": "Healthcare",
        "TORNTPHARM": "Healthcare", "ZYDUSLIFE": "Healthcare", "BIOCON": "Healthcare", "MANKIND": "Healthcare",
        "FORTIS": "Healthcare", "MAXHEALTH": "Healthcare", "GLENMARK": "Healthcare", "IPCALAB": "Healthcare",
        "LAURUSLABS": "Healthcare", "SYNGENE": "Healthcare", "LALPATHLAB": "Healthcare", "METROPOLIS": "Healthcare",
        
        # Energy, Oil & Gas
        "RELIANCE": "Energy & Power", "ONGC": "Energy & Power", "IOC": "Energy & Power", "BPCL": "Energy & Power",
        "HPCL": "Energy & Power", "GAIL": "Energy & Power", "OIL": "Energy & Power", "PETRONET": "Energy & Power",
        "GUJGASLTD": "Energy & Power", "IGL": "Energy & Power", "MGL": "Energy & Power", "ATGL": "Energy & Power",
        "NTPC": "Energy & Power", "POWERGRID": "Energy & Power", "TATAPOWER": "Energy & Power",
        "ADANIPOWER": "Energy & Power", "ADANIGREEN": "Energy & Power", "ADANIENSOL": "Energy & Power",
        "NHPC": "Energy & Power", "SJVN": "Energy & Power", "SUZLON": "Energy & Power", "JPPOWER": "Energy & Power",
        
        # Metals & Mining
        "TATASTEEL": "Metals & Mining", "JSWSTEEL": "Metals & Mining", "HINDALCO": "Metals & Mining",
        "VEDL": "Metals & Mining", "COALINDIA": "Metals & Mining", "NMDC": "Metals & Mining",
        "JINDALSTEL": "Metals & Mining", "SAIL": "Metals & Mining", "NATIONALUM": "Metals & Mining",
        "HINDZINC": "Metals & Mining", "APLAPOLLO": "Metals & Mining", "RATNAMANI": "Metals & Mining",
        
        # FMCG & Consumer Goods
        "ITC": "FMCG & Consumer", "HINDUNILVR": "FMCG & Consumer", "NESTLEIND": "FMCG & Consumer",
        "BRITANNIA": "FMCG & Consumer", "TATACONSUM": "FMCG & Consumer", "DABUR": "FMCG & Consumer",
        "MARICO": "FMCG & Consumer", "GODREJCP": "FMCG & Consumer", "COLPAL": "FMCG & Consumer",
        "VBL": "FMCG & Consumer", "PGHH": "FMCG & Consumer", "EMAMILTD": "FMCG & Consumer",
        "RADICO": "FMCG & Consumer", "UBL": "FMCG & Consumer", "MCDOWELL-N": "FMCG & Consumer",
        
        # Capital Goods & Defense
        "LT": "Capital Goods & Defense", "BEL": "Capital Goods & Defense", "HAL": "Capital Goods & Defense",
        "SIEMENS": "Capital Goods & Defense", "ABB": "Capital Goods & Defense", "BHEL": "Capital Goods & Defense",
        "CUMMINSIND": "Capital Goods & Defense", "THERMAX": "Capital Goods & Defense", "POLYCAB": "Capital Goods & Defense",
        "KEI": "Capital Goods & Defense", "HAVELLS": "Capital Goods & Defense", "ASTRAL": "Capital Goods & Defense",
        "MAZDOCK": "Capital Goods & Defense", "COCHINSHIP": "Capital Goods & Defense", "BDL": "Capital Goods & Defense",
        "SOLARINDS": "Capital Goods & Defense",
        
        # Infrastructure, EPC & Realty
        "DLF": "Realty & Infrastructure", "GODREJPROP": "Realty & Infrastructure", "OBEROIRLTY": "Realty & Infrastructure",
        "MACROTECH": "Realty & Infrastructure", "PRESTIGE": "Realty & Infrastructure", "BRIGADE": "Realty & Infrastructure",
        "PHOENIXLTD": "Realty & Infrastructure", "SOBHA": "Realty & Infrastructure", "NBCC": "Realty & Infrastructure",
        "IRFC": "Realty & Infrastructure", "RVNL": "Realty & Infrastructure", "IRCON": "Realty & Infrastructure",
        "RITES": "Realty & Infrastructure", "GMRINFRA": "Realty & Infrastructure", "ADANIPORTS": "Realty & Infrastructure",
        
        # Chemicals & Fertilizers
        "PIDILITIND": "Chemicals & Fertilizers", "SRF": "Chemicals & Fertilizers", "GUJALKALI": "Chemicals & Fertilizers",
        "TATACHEM": "Chemicals & Fertilizers", "DEEPAKNTR": "Chemicals & Fertilizers", "AARTIIND": "Chemicals & Fertilizers",
        "PIIND": "Chemicals & Fertilizers", "UPL": "Chemicals & Fertilizers", "COROMANDEL": "Chemicals & Fertilizers",
        "CHAMBLFERT": "Chemicals & Fertilizers", "GNFC": "Chemicals & Fertilizers", "ATUL": "Chemicals & Fertilizers",
        "NAVINFLUOR": "Chemicals & Fertilizers", "SUMICHEM": "Chemicals & Fertilizers", "CLEAN": "Chemicals & Fertilizers",
        
        # Telecom & Media
        "BHARTIARTL": "Telecommunication", "IDEA": "Telecommunication", "INDUSTOWER": "Telecommunication",
        "TATACOMM": "Telecommunication", "HFCL": "Telecommunication", "TEJASNET": "Telecommunication",
        "ZEEL": "Consumer Services", "PVRINOX": "Consumer Services", "SUNTV": "Consumer Services",
        
        # Consumer Services & Retail
        "TITAN": "Consumer Services", "TRENT": "Consumer Services", "ZOMATO": "Consumer Services",
        "DMART": "Consumer Services", "NAUKRI": "Consumer Services", "PAYTM": "Consumer Services",
        "NYKAA": "Consumer Services", "POLICYBZR": "Consumer Services", "JUBLFOOD": "Consumer Services",
        "DEVYANI": "Consumer Services", "INDHOTEL": "Consumer Services", "EIHOTEL": "Consumer Services",
        "PCJEWELLER": "Consumer Services", "KALYANKJIL": "Consumer Services"
    }

    KEYWORD_RULES = [
        (r'\b(bank|finance|financial|fin|capital|holdings|securities|invest|leasing|credit|housing|asset|insurance|chits)\b', "Financial Services"),
        (r'\b(infotech|technologies|software|tech|solutions|systems|digital|data|cyber|computers)\b', "Information Technology"),
        (r'\b(pharma|pharmaceuticals|chem|biotech|laboratories|labs|health|healthcare|hospital|remedies|life sciences|diagnostics|med)\b', "Healthcare"),
        (r'\b(motors|auto|automotive|vehicles|tyres|brakes|clutch|gears|castings|axles|engine)\b', "Automobile"),
        (r'\b(power|energy|solar|wind|hydro|electric|petro|oil|gas|refinery|fuels|thermal)\b', "Energy & Power"),
        (r'\b(steels|steel|metals|mining|mines|alloys|iron|ores|minerals|aluminium|copper|zinc|tubes|pipes)\b', "Metals & Mining"),
        (r'\b(foods|beverages|dairy|tea|coffee|sugar|distilleries|breweries|fmcg|agro|flour|spices)\b', "FMCG & Consumer"),
        (r'\b(industries|engineering|electricals|cables|wires|switchgear|transformers|heavy|tools|defense|aerospace|machinery|forge|bearings)\b', "Capital Goods & Defense"),
        (r'\b(infra|infrastructure|builders|realty|real estate|developers|properties|constructions|projects|cement|cements|concrete|roads|ports)\b', "Realty & Infrastructure"),
        (r'\b(chemicals|fertilizers|paints|coatings|dyes|pigments|specialty|polymers|resins|pesticides|organics|carbon)\b', "Chemicals & Fertilizers"),
        (r'\b(textiles|fabrics|yarn|garments|apparel|cottons|silk|woollen|denim|spinners|mills)\b', "Consumer Goods"),
        (r'\b(retail|hotels|hospitality|resorts|logistics|shipping|freight|transport|airways|travel|entertainment|media|multiplex)\b', "Consumer Services")
    ]

    c.execute("SELECT symbol, name, sector FROM stocks")
    rows = c.fetchall()

    updates = []
    for sym, name, curr_sector in rows:
        sym_clean = sym.strip().upper()
        name_lower = (name or "").lower()

        new_sector = None
        if sym_clean in SYMBOL_MAP:
            new_sector = SYMBOL_MAP[sym_clean]
        elif curr_sector and curr_sector != "Diversified":
            if curr_sector in ("Information Technology", "Financial Services", "Healthcare", "Automobile", "Metals & Mining", "Telecommunication"):
                new_sector = curr_sector
            elif curr_sector == "Energy & Conglomerate" or curr_sector == "Utilities":
                new_sector = "Energy & Power"
            elif curr_sector == "Consumer Goods":
                new_sector = "FMCG & Consumer"
            elif curr_sector == "Capital Goods":
                new_sector = "Capital Goods & Defense"
            elif curr_sector == "Consumer Services":
                new_sector = "Consumer Services"

        if not new_sector:
            for pattern, sec in KEYWORD_RULES:
                if re.search(pattern, name_lower):
                    new_sector = sec
                    break

        if not new_sector:
            new_sector = "Diversified & Others"

        updates.append((new_sector, sym))

    c.executemany("UPDATE stocks SET sector = ? WHERE symbol = ?", updates)
    conn.commit()

    c.execute("SELECT sector, COUNT(*) FROM stocks GROUP BY sector ORDER BY COUNT(*) DESC")
    results = c.fetchall()
    print("Enriched Sector Breakdown:")
    for sec, count in results:
        print(f"  {sec:30} : {count} stocks")

    conn.close()

if __name__ == "__main__":
    enrich_sectors()
