# 📈 Stock Finder 3% — NSE & BSE Indian Stock Screener

An institutional-grade fundamental and technical stock screener for Indian equities, powered by official daily data gathered directly from the **National Stock Exchange of India (NSE)** and **Bombay Stock Exchange (BSE)**.

---

## 🌟 Key Features

### 1. Official NSE & BSE Data Integration
- **Direct Official Bhavcopy**: Ingests daily official Bhavcopy archives (`sec_bhavdata_full`) directly from `https://nsearchives.nseindia.com`.
- **Complete Equity Universe**: Over 3,300+ listed securities on NSE & BSE with symbols, names, and ISIN codes.
- **Genuine Institutional Delivery**: Pulls official NSE Delivery Quantity and Delivery Percentage (`DELIV_PER`) for each security to identify authentic institutional accumulation versus speculative day-trading.
- **BSE Dual Listing & Scrip Codes**: Direct links to official quote pages on `nseindia.com` and `bseindia.com`.
- **Live Sync Dashboard**: On-demand "Sync Data" trigger with background polling and timestamp tracking.

---

### 2. Comprehensive Screening Filters

#### 💎 Fundamental Criteria
- **Market Capitalization**: Large Cap (> ₹20,000 Cr), Mid Cap (₹5,000–20,000 Cr), Small Cap (₹1,000–5,000 Cr), Micro Cap (< ₹1,000 Cr), or custom Min/Max range in ₹ Crores.
- **Valuation Multiples**: Price-to-Earnings (P/E), Price-to-Book (P/B), Dividend Yield (%).
- **Profitability & Quality**: Return on Capital Employed (ROCE %), Return on Equity (ROE %), Operating Profit Margin (%), Net Profit Margin (%).
- **Balance Sheet & Solvency**: Debt-to-Equity Ratio, Current Ratio.
- **Growth & Track Record**: Quarterly Sales Growth YoY (%), Quarterly Profit Growth YoY (%).
- **Shareholding & Governance**: Promoter Holding (%), Promoter Pledged Shares (%), Institutional FII + DII Holding (%).

#### 📊 Technical & Momentum Criteria
- **🚀 3% High-Volume Breakout Strategy**: Instantly isolates equities surging $\ge 3\%$ today with volume $> 1.5\times$ 20-day average.
- **Moving Average Crossovers**:
  - Price above 20-Day EMA (Short-term momentum)
  - Price above 50-Day SMA (Medium-term trend)
  - Price above 200-Day SMA (Macro bull trend)
  - **⚡ Golden Cross** (50 SMA crossing above 200 SMA)
- **Oscillators & Trend**:
  - Relative Strength Index (RSI 14) range (Oversold $< 35$, Bullish Momentum $50–70$, Overbought $> 70$)
  - 52-Week High Proximity (e.g. within 3% or 5% of 52W High)
- **Volume Surge Multiple**: Current volume compared to 20-day moving average (1.2x, 1.5x, 2x, 3x).
- **Official Delivery Accumulation**: Filter by minimum delivery percentage ($\ge 40\%$, $\ge 50\%$, $\ge 60\%$).

---

### 3. Built-in Preset Strategies
1. **🚀 3% High-Volume Breakout**: 1-Day gain $\ge 3\%$ with volume $> 1.5\times$ 20D average and RSI $> 55$.
2. **💎 Quality Value (Graham & Buffett)**: P/E $< 25$, ROCE $> 15\%$, Debt/Equity $< 0.5$, Market Cap $> ₹2,000$ Cr.
3. **📈 Growth at Reasonable Price (GARP)**: Profit Growth $> 15\%$, ROE $> 15\%$, P/E $< 35$, Price above 50 SMA.
4. **📦 High Institutional Delivery**: Official NSE Delivery $\% \ge 55\%$ with positive price action.
5. **🔄 RSI Oversold Reversal**: RSI $< 35$ with positive return on equity and low debt.
6. **🎯 52-Week High Breakout**: Within 3% of 52-week high with volume surge.
7. **💰 High Dividend Yield**: Dividend Yield $\ge 2.5\%$ with ROCE $> 12\%$.
8. **⚡ Golden Cross Bullish**: 50 SMA $> 200$ SMA with bullish momentum.
9. **⭐ Custom Preset Manager**: Save any personalized combination of filters with a custom title and notes!

---

### 4. Interactive Web Interface
- **Sortable High-Performance Data Grid**: Sort any column ascending or descending.
- **Column Customizer**: Toggle visibility of columns (P/E, ROCE, ROE, D/E, Delivery %, RSI, Signals).
- **Stock Analysis Modal**:
  - Technical Rating Gauge (`Strong Buy`, `Buy`, `Neutral`, `Sell`).
  - 30-day interactive price & volume trend.
  - Complete fundamental breakdown.
  - Direct links to official **NSE India** and **BSE India** stock quote pages.
- **Export to CSV**: Export any filtered query to spreadsheet format with one click.

---

## 🚀 Getting Started

### Method 1: One-Click Launcher (Windows)
Simply double-click:
```cmd
run_website.bat
```
This automatically verifies the database, starts the web server on `http://127.0.0.1:8000`, and launches your browser.

---

### Method 2: Command Line

#### 1. Backend Server
```bash
cd backend
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```
Open **`http://127.0.0.1:8000`** in your web browser.

#### 2. Refresh Official Exchange Data (Optional)
To fetch fresh Bhavcopy archives from NSE & BSE:
```bash
cd backend
python data_engine.py
```
Or click the **"Sync Data"** button in the website navbar.

#### 3. Frontend Development (Optional for modifying UI)
```bash
cd frontend
npm run dev
```

---

## 🛠️ Technology Stack
- **Backend**: Python 3.12, FastAPI, SQLite (indexed database), `curl_cffi` (impersonating browser headers for NSE Akamai bot compliance), `pandas`, `numpy`, `yfinance`.
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React icons.
- **Data Engine**: Official daily Bhavcopy archives (`nsearchives.nseindia.com`), NSE Master Equities (`EQUITY_L.csv`), BSE Scrip APIs (`api.bseindia.com`).
