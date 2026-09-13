# Query Engine for Stock Finder
import re
from typing import Dict, Any, List, Tuple, Optional

# Master Catalog of Ratios & Formulas with descriptions, categories, and units
RATIO_CATALOG = [
    # Valuation
    {
        "name": "Market capitalization",
        "aliases": ["market cap", "mcap", "market capitalization", "marketcap"],
        "column": "market_cap_cr",
        "category": "Valuation",
        "unit": "₹ Cr",
        "description": "Total market value of all outstanding shares in Crores",
        "type": "numeric"
    },
    {
        "name": "Price to earning",
        "aliases": ["price to earning", "price to earnings", "pe", "pe ratio", "p/e"],
        "column": "pe_ratio",
        "category": "Valuation",
        "unit": "x",
        "description": "Price-to-Earnings ratio based on trailing twelve months earnings",
        "type": "numeric"
    },
    {
        "name": "Price to book",
        "aliases": ["price to book", "price to book value", "pb", "pb ratio", "p/b"],
        "column": "pb_ratio",
        "category": "Valuation",
        "unit": "x",
        "description": "Price-to-Book ratio comparing stock price to book value per share",
        "type": "numeric"
    },
    {
        "name": "Dividend yield",
        "aliases": ["dividend yield", "div yield", "dividend"],
        "column": "dividend_yield",
        "category": "Valuation",
        "unit": "%",
        "description": "Annual dividend payout expressed as a percentage of share price",
        "type": "numeric"
    },
    {
        "name": "EV to EBITDA",
        "aliases": ["ev to ebitda", "ev/ebitda", "ev ebitda"],
        "column": "ev_ebitda",
        "category": "Valuation",
        "unit": "x",
        "description": "Enterprise Value to Earnings Before Interest, Taxes, Depreciation and Amortization",
        "type": "numeric"
    },
    {
        "name": "Earnings per share",
        "aliases": ["earnings per share", "eps", "eps ttm"],
        "column": "eps_ttm",
        "category": "Valuation",
        "unit": "₹",
        "description": "Trailing 12-month net earnings allocated per individual common share",
        "type": "numeric"
    },

    # Profitability & Quality
    {
        "name": "Return on capital employed",
        "aliases": ["return on capital employed", "roce"],
        "column": "roce",
        "category": "Profitability",
        "unit": "%",
        "description": "Operating profit relative to total capital employed (Equity + Debt)",
        "type": "numeric"
    },
    {
        "name": "Return on equity",
        "aliases": ["return on equity", "roe"],
        "column": "roe",
        "category": "Profitability",
        "unit": "%",
        "description": "Net profit returned as a percentage of shareholders equity",
        "type": "numeric"
    },
    {
        "name": "Operating profit margin",
        "aliases": ["operating profit margin", "operating margin", "opm"],
        "column": "operating_margin",
        "category": "Profitability",
        "unit": "%",
        "description": "Operating profit as a percentage of total operational revenue",
        "type": "numeric"
    },
    {
        "name": "Net profit margin",
        "aliases": ["net profit margin", "net margin", "npm"],
        "column": "net_profit_margin",
        "category": "Profitability",
        "unit": "%",
        "description": "Percentage of revenue remaining after all expenses, taxes and interest",
        "type": "numeric"
    },
    {
        "name": "Piotroski score",
        "aliases": ["piotroski score", "piotroski", "piot score"],
        "column": "piotroski_score",
        "category": "Profitability",
        "unit": "Score (0-9)",
        "description": "Discrete 9-point score evaluating corporate financial strength and health",
        "type": "numeric"
    },
    {
        "name": "Free cash flow",
        "aliases": ["free cash flow", "fcf"],
        "column": "free_cash_flow_cr",
        "category": "Profitability",
        "unit": "₹ Cr",
        "description": "Operating cash flow remaining after capital expenditure in Crores",
        "type": "numeric"
    },

    # Financial Health & Solvency
    {
        "name": "Debt to equity",
        "aliases": ["debt to equity", "debt equity", "d/e", "de ratio"],
        "column": "debt_to_equity",
        "category": "Solvency",
        "unit": "Ratio",
        "description": "Total debt liabilities relative to total shareholders equity",
        "type": "numeric"
    },
    {
        "name": "Current ratio",
        "aliases": ["current ratio", "cr"],
        "column": "current_ratio",
        "category": "Solvency",
        "unit": "Ratio",
        "description": "Short-term liquidity measuring current assets divided by current liabilities",
        "type": "numeric"
    },
    {
        "name": "Interest coverage",
        "aliases": ["interest coverage", "interest coverage ratio", "icr"],
        "column": "interest_coverage",
        "category": "Solvency",
        "unit": "x",
        "description": "Number of times operating income can cover scheduled interest payments",
        "type": "numeric"
    },

    # Growth Metrics
    {
        "name": "Sales growth",
        "aliases": ["sales growth", "sales growth yoy", "revenue growth", "revenue growth yoy"],
        "column": "sales_growth_yoy",
        "category": "Growth",
        "unit": "%",
        "description": "Year-over-year revenue expansion percentage",
        "type": "numeric"
    },
    {
        "name": "Profit growth",
        "aliases": ["profit growth", "profit growth yoy", "net profit growth"],
        "column": "profit_growth_yoy",
        "category": "Growth",
        "unit": "%",
        "description": "Year-over-year net earnings expansion percentage",
        "type": "numeric"
    },

    # Ownership & Shareholding
    {
        "name": "Promoter holding",
        "aliases": ["promoter holding", "promoter share", "promoters"],
        "column": "promoter_holding",
        "category": "Shareholding",
        "unit": "%",
        "description": "Percentage of company equity owned by primary founding promoters",
        "type": "numeric"
    },
    {
        "name": "Promoter pledge",
        "aliases": ["promoter pledge", "promoter pledged", "pledged", "pledge"],
        "column": "promoter_pledged",
        "category": "Shareholding",
        "unit": "%",
        "description": "Percentage of promoter shares pledged as collateral for debt financing",
        "type": "numeric"
    },
    {
        "name": "FII DII holding",
        "aliases": ["fii dii holding", "fii dii", "institutional holding", "institutions"],
        "column": "fii_dii_holding",
        "category": "Shareholding",
        "unit": "%",
        "description": "Combined ownership by Foreign and Domestic Institutional Investors (Mutual Funds, FPIs)",
        "type": "numeric"
    },

    # Price & Technicals
    {
        "name": "Current price",
        "aliases": ["current price", "cmp", "price", "stock price", "market price", "ltp"],
        "column": "current_price",
        "category": "Technicals",
        "unit": "₹",
        "description": "Latest market closing / traded spot price per share",
        "type": "numeric"
    },
    {
        "name": "Day change",
        "aliases": ["day change", "change 1d", "1d change", "change percent", "change %", "change"],
        "column": "change_1d",
        "category": "Technicals",
        "unit": "%",
        "description": "1-day percentage price change relative to previous closing price",
        "type": "numeric"
    },
    {
        "name": "1 Week change",
        "aliases": ["1 week change", "change 1w", "1w change", "weekly return"],
        "column": "change_1w",
        "category": "Technicals",
        "unit": "%",
        "description": "Price return over the rolling past 5 trading sessions",
        "type": "numeric"
    },
    {
        "name": "1 Month change",
        "aliases": ["1 month change", "change 1m", "1m change", "monthly return"],
        "column": "change_1m",
        "category": "Technicals",
        "unit": "%",
        "description": "Price return over the rolling past 30 days",
        "type": "numeric"
    },
    {
        "name": "1 Year change",
        "aliases": ["1 year change", "change 1y", "1y change", "annual return"],
        "column": "change_1y",
        "category": "Technicals",
        "unit": "%",
        "description": "Price return over the trailing 365 days",
        "type": "numeric"
    },
    {
        "name": "Volume",
        "aliases": ["volume", "shares traded", "traded volume"],
        "column": "volume",
        "category": "Technicals",
        "unit": "Shares",
        "description": "Total quantity of shares traded on NSE/BSE today",
        "type": "numeric"
    },
    {
        "name": "Volume multiple",
        "aliases": ["volume multiple", "volume surge", "volume multiplier"],
        "column": "volume_multiple",
        "category": "Technicals",
        "unit": "x",
        "description": "Today's volume divided by the rolling 20-day average trading volume",
        "type": "numeric"
    },
    {
        "name": "Delivery percentage",
        "aliases": ["delivery percentage", "delivery %", "delivery percent", "delivery"],
        "column": "delivery_percent",
        "category": "Technicals",
        "unit": "%",
        "description": "Percentage of shares marked for actual demat delivery versus intraday speculation",
        "type": "numeric"
    },
    {
        "name": "RSI",
        "aliases": ["rsi", "rsi 14", "relative strength index"],
        "column": "rsi_14",
        "category": "Technicals",
        "unit": "0-100",
        "description": "14-period Relative Strength Index measuring internal momentum velocity",
        "type": "numeric"
    },
    {
        "name": "EMA 20",
        "aliases": ["ema 20", "20 ema", "ema20"],
        "column": "ema_20",
        "category": "Technicals",
        "unit": "₹",
        "description": "20-day Exponential Moving Average short-term trend line",
        "type": "numeric"
    },
    {
        "name": "SMA 50",
        "aliases": ["sma 50", "50 sma", "sma50", "50 dma"],
        "column": "sma_50",
        "category": "Technicals",
        "unit": "₹",
        "description": "50-day Simple Moving Average intermediate institutional baseline",
        "type": "numeric"
    },
    {
        "name": "SMA 200",
        "aliases": ["sma 200", "200 sma", "sma200", "200 dma"],
        "column": "sma_200",
        "category": "Technicals",
        "unit": "₹",
        "description": "200-day Simple Moving Average primary macro bull/bear boundary",
        "type": "numeric"
    },
    {
        "name": "52 Week High",
        "aliases": ["52 week high", "52w high", "high price all time", "year high"],
        "column": "fifty_two_week_high",
        "category": "Technicals",
        "unit": "₹",
        "description": "Highest traded price recorded across the previous 52 weeks",
        "type": "numeric"
    },
    {
        "name": "52 Week Low",
        "aliases": ["52 week low", "52w low", "low price all time", "year low"],
        "column": "fifty_two_week_low",
        "category": "Technicals",
        "unit": "₹",
        "description": "Lowest traded price recorded across the previous 52 weeks",
        "type": "numeric"
    },
    {
        "name": "Distance from 52w high",
        "aliases": ["distance from 52w high", "dist from 52w high", "down from 52w high"],
        "column": "dist_from_52w_high",
        "category": "Technicals",
        "unit": "%",
        "description": "Discount percentage from the 52-week peak price",
        "type": "numeric"
    },
    {
        "name": "Breakout",
        "aliases": ["breakout", "is breakout", "momentum breakout"],
        "column": "is_breakout_3pct",
        "category": "Technicals",
        "unit": "Boolean (1 or 0)",
        "description": "Flags strong breakout (>3% gain with 1.5x+ volume surge above 20 EMA)",
        "type": "boolean"
    },
    {
        "name": "Golden Cross",
        "aliases": ["golden cross", "goldencross"],
        "column": "golden_cross",
        "category": "Technicals",
        "unit": "Boolean (1 or 0)",
        "description": "Flags whether 50 SMA has crossed bullishly above the 200 SMA",
        "type": "boolean"
    },

    # Market Intelligence & Derivatives
    {
        "name": "Market Mood Index",
        "aliases": ["market mood index", "mmi", "mmi score", "fear and greed"],
        "column": "mmi_score",
        "category": "Sentiment",
        "unit": "0-100",
        "description": "Proprietary Fear & Greed sentiment benchmark measuring investor psychology",
        "type": "numeric"
    },
    {
        "name": "Potential score",
        "aliases": ["potential score", "potential", "ai potential"],
        "column": "potential_score",
        "category": "Sentiment",
        "unit": "0-10",
        "description": "Algorithmic composite ranking blending momentum, valuation, earnings & technicals",
        "type": "numeric"
    },
    {
        "name": "Implied volatility",
        "aliases": ["implied volatility", "iv", "real iv"],
        "column": "current_iv",
        "category": "Derivatives",
        "unit": "%",
        "description": "Real-time options market annualized volatility derived from Black-Scholes formula",
        "type": "numeric"
    },
    {
        "name": "IV Percentile",
        "aliases": ["iv percentile", "ivp"],
        "column": "iv_percentile",
        "category": "Derivatives",
        "unit": "%",
        "description": "Percentage of days in the past 12 months that IV was lower than current IV",
        "type": "numeric"
    },
    {
        "name": "IV Rank",
        "aliases": ["iv rank", "ivr"],
        "column": "iv_rank",
        "category": "Derivatives",
        "unit": "%",
        "description": "Current IV relative to its 52-week absolute highest and lowest extremes",
        "type": "numeric"
    },
    {
        "name": "IV Spike",
        "aliases": ["iv spike", "iv spike %", "iv spike pct"],
        "column": "iv_spike_pct",
        "category": "Derivatives",
        "unit": "%",
        "description": "Percentage divergence of current option IV over 30-day historical stock volatility",
        "type": "numeric"
    },
    {
        "name": "Put Call Ratio",
        "aliases": ["put call ratio", "pcr", "pcr oi"],
        "column": "pcr_oi",
        "category": "Derivatives",
        "unit": "Ratio",
        "description": "Total Put open interest divided by Call open interest (sentiment indicator)",
        "type": "numeric"
    },
    {
        "name": "F&O Stock",
        "aliases": ["fno", "is fno", "f&o", "derivatives"],
        "column": "is_fno",
        "category": "Derivatives",
        "unit": "Boolean (1 or 0)",
        "description": "Whether the stock is actively traded in the NSE Futures & Options segment",
        "type": "boolean"
    },

    # Classification
    {
        "name": "Sector",
        "aliases": ["sector", "industry sector"],
        "column": "sector",
        "category": "Classification",
        "unit": "Text",
        "description": "Broad economic sector (e.g. Information Technology, Financial Services, Auto)",
        "type": "text"
    }
]

# Build reverse lookup map
ALIAS_MAP: Dict[str, Dict[str, Any]] = {}
for item in RATIO_CATALOG:
    for alias in item["aliases"]:
        ALIAS_MAP[alias.lower().strip()] = item
    ALIAS_MAP[item["name"].lower().strip()] = item
    ALIAS_MAP[item["column"].lower().strip()] = item

# Allowable SQL comparison operators
VALID_OPS = {
    ">=": ">=",
    "<=": "<=",
    "!=": "!=",
    "<>": "!=",
    "==": "=",
    "=": "=",
    ">": ">",
    "<": "<"
}

def parse_query_clause(clause_str: str) -> Tuple[Optional[str], Optional[Any], Optional[Dict[str, Any]], Optional[str]]:
    """
    Parses an individual expression line (e.g. 'Market capitalization > 500' or 'Price > SMA 50')
    Returns: (sql_clause, param_value, ratio_info, error_msg)
    """
    clause = clause_str.strip()
    if not clause:
        return None, None, None, None

    # Match: <identifier> <operator> <rhs>
    m = re.match(r"^([a-zA-Z0-9\s/_\-&]+?)\s*(>=|<=|!=|<>|==|=|>|<)\s*(.+)$", clause)
    if not m:
        return None, None, None, f"Could not parse clause: '{clause}'. Expected format: Ratio [> | < | = | >= | <=] Value"

    raw_left, raw_op, raw_right = m.groups()
    left_clean = raw_left.strip().lower()
    op_clean = VALID_OPS.get(raw_op.strip())
    if not op_clean:
        return None, None, None, f"Unsupported operator '{raw_op}' in '{clause}'"

    ratio_info = ALIAS_MAP.get(left_clean)
    if not ratio_info:
        # Check partial match
        suggestions = [r["name"] for r in RATIO_CATALOG if left_clean in r["name"].lower() or any(left_clean in a for a in r["aliases"])]
        hint = f" Did you mean '{suggestions[0]}'?" if suggestions else ""
        return None, None, None, f"Unrecognized ratio or metric '{raw_left.strip()}'.{hint}"

    col_name = ratio_info["column"]
    col_type = ratio_info.get("type", "numeric")

    # Check if right hand side is another column (e.g. Current price > SMA 50)
    rhs_clean = raw_right.strip()
    rhs_norm = rhs_clean.lower()
    right_ratio = ALIAS_MAP.get(rhs_norm)

    if right_ratio and right_ratio.get("type") == "numeric":
        # Comparing two columns
        sql_clause = f"{col_name} {op_clean} {right_ratio['column']}"
        return sql_clause, None, ratio_info, None

    if col_type == "text":
        # String match (e.g. Sector = 'Information Technology')
        val = rhs_clean.strip("'\"")
        sql_clause = f"{col_name} LIKE ?"
        return sql_clause, f"%{val}%", ratio_info, None

    # Numeric handling: remove %, Cr, cr, x, commas
    clean_val_str = re.sub(r"(?i)[%crx,]|(crores?)", "", rhs_clean).strip()
    try:
        num_val = float(clean_val_str)
        sql_clause = f"{col_name} {op_clean} ?"
        return sql_clause, num_val, ratio_info, None
    except ValueError:
        return None, None, None, f"Invalid numeric value '{raw_right.strip()}' for ratio '{ratio_info['name']}'"

def parse_full_query(raw_query: str) -> Tuple[List[str], List[Any], List[str], Optional[str]]:
    """
    Parses a multiline custom query string.
    Returns: (sql_where_clauses, sql_params, human_readable_clauses, error_message)
    """
    if not raw_query or not raw_query.strip():
        return [], [], [], "Query cannot be empty"

    # Split on explicit 'AND' keywords or line breaks
    # Handles Screener.in style: line breaks with or without trailing AND
    raw_lines = re.split(r"\s+\bAND\b\s+|\n+", raw_query.strip(), flags=re.IGNORECASE)

    sql_clauses = []
    sql_params = []
    human_clauses = []

    for raw in raw_lines:
        line = raw.strip()
        if not line:
            continue
        # Remove leftover 'AND' or 'OR' at the beginning of line
        if re.match(r"^AND\s+", line, flags=re.IGNORECASE):
            line = re.sub(r"^AND\s+", "", line, flags=re.IGNORECASE).strip()
        elif re.match(r"^OR\s+", line, flags=re.IGNORECASE):
            line = re.sub(r"^OR\s+", "", line, flags=re.IGNORECASE).strip()

        if not line:
            continue

        clause_sql, param_val, r_info, err = parse_query_clause(line)
        if err:
            return [], [], [], err

        if clause_sql:
            sql_clauses.append(clause_sql)
            if param_val is not None:
                sql_params.append(param_val)
            human_clauses.append(line)

    if not sql_clauses:
        return [], [], [], "No valid filter conditions found in query."

    return sql_clauses, sql_params, human_clauses, None
