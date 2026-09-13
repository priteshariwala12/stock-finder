import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Play, Video, BookOpen, Clock, Award, 
  ExternalLink, Copy, Check, Search, Filter, Sparkles, 
  X, ChevronRight, AlertCircle, TrendingUp, ShieldCheck,
  BarChart3, Zap, Brain, Calendar
} from 'lucide-react';

const COURSES = [
  // LEVEL 1: BASICS (2024 - 2026)
  {
    id: "8rIviI0ZKNA",
    title: "Stock Market Basic to Advance | Complete Course for Beginners",
    author: "Pushkar Raj Thakur",
    channelSubscribers: "11M+",
    duration: "30m",
    level: "Beginner",
    category: "Basics",
    levelNumber: 1,
    uploadDate: "Jan 2024",
    publishYear: "2024",
    description: "Modern complete introduction to the Indian stock market. Explains how equities function, primary vs secondary markets, and placing your first trade.",
    takeaways: [
      "What is a Share and how companies issue equity on NSE/BSE",
      "How to set up Demat & Trading accounts and avoid high brokerage",
      "Understanding Market Cap (Large, Mid, Small Cap)",
      "How stock prices move dynamically based on order books"
    ]
  },
  {
    id: "-APjlRq8Usw",
    title: "How to Start Investing in Stock Market? ETFs & Mutual Funds Explained",
    author: "Pushkar Raj Thakur",
    channelSubscribers: "11M+",
    duration: "22m",
    level: "Beginner",
    category: "Basics",
    levelNumber: 1,
    uploadDate: "Jan 2024",
    publishYear: "2024",
    description: "Guide on starting safely with Index ETFs (Nifty BeES), compounding, and long-term equity wealth accumulation.",
    takeaways: [
      "Exchange Traded Funds (ETFs) vs Mutual Funds vs Direct Stocks",
      "Why Nifty 50 index investing beats 80% active retail traders",
      "SIP (Systematic Investment Plan) compounding calculation",
      "Asset allocation strategy for working professionals"
    ]
  },
  {
    id: "8t0_xs0399g",
    title: "Intraday & Stock Trading FULL COURSE For Beginners in Hindi",
    author: "Neeraj Joshi",
    channelSubscribers: "3.2M+",
    duration: "1h 15m",
    level: "Beginner",
    category: "Basics",
    levelNumber: 1,
    uploadDate: "Jul 2024",
    publishYear: "2024",
    description: "Comprehensive modern trading guide explaining intraday mechanics, broker margins, order types, and risk limits.",
    takeaways: [
      "Intraday vs Delivery trading differences and SEBI margin rules",
      "Types of orders: Market, Limit, Stop Loss (SL), SL-M & GTT",
      "Understanding Level 2 Market Depth (Bids, Asks & Liquidity)",
      "How brokerage charges, STT, and exchange taxes work"
    ]
  },
  {
    id: "R2pgcqHApJM",
    title: "Trading Course 2026: Learn Trading From Scratch Step-by-Step",
    author: "Neeraj Joshi",
    channelSubscribers: "3.2M+",
    duration: "30m",
    level: "Beginner",
    category: "Basics",
    levelNumber: 1,
    uploadDate: "Mar 2026",
    publishYear: "2026",
    description: "Brand new 2026 trading curriculum covering charting tools, platform setup, and risk parameters.",
    takeaways: [
      "Setting up TradingView & broker charting workspace",
      "Timeframe selection: 5-min, 15-min, Daily & Weekly charts",
      "Understanding market sessions: Pre-market, Regular, Post-market",
      "Rules to protect capital in the first 90 days of trading"
    ]
  },
  {
    id: "BFd8ZCxDgN0",
    title: "Macro Analysis & How to Invest in Current Indian Stock Market",
    author: "Akshat Shrivastava",
    channelSubscribers: "2.4M+",
    duration: "20m",
    level: "Beginner",
    category: "Basics",
    levelNumber: 1,
    uploadDate: "Dec 2024",
    publishYear: "2024",
    description: "Macro-economic perspective on interest rates, inflation, FII foreign inflows, and navigating market cycles in India.",
    takeaways: [
      "How RBI monetary policy and interest rates affect equity valuations",
      "FII vs DII institutional flow dynamic and market liquidity",
      "How to evaluate market valuations when Nifty is near all-time highs",
      "Long-term mindset for multi-year compounding"
    ]
  },

  // LEVEL 2: FUNDAMENTAL ANALYSIS (2024 - 2026)
  {
    id: "WQrFYdJetMc",
    title: "Learn How to Read a Balance Sheet the SOIC Way!",
    author: "SOIC (Ishmohit)",
    channelSubscribers: "650K+",
    duration: "1h 11m",
    level: "Intermediate",
    category: "Fundamentals",
    levelNumber: 2,
    uploadDate: "Aug 2024",
    publishYear: "2024",
    description: "Masterclass on dissecting Indian corporate balance sheets. Learn how to identify hidden debt, CWIP fraud, and financial red flags.",
    takeaways: [
      "Assets vs Liabilities: Working capital, Trade receivables & Inventory",
      "Cash Conversion Cycle (CCC) and working capital health",
      "Detecting aggressive capital work-in-progress (CWIP) and accounting tricks",
      "Contingent liabilities and related-party loan transactions"
    ]
  },
  {
    id: "J_SmcJtWuiY",
    title: "Decode Cash Flow Statements the SOIC Way: Complete Guide",
    author: "SOIC (Ishmohit)",
    channelSubscribers: "650K+",
    duration: "1h 43m",
    level: "Intermediate",
    category: "Fundamentals",
    levelNumber: 2,
    uploadDate: "Apr 2025",
    publishYear: "2025",
    description: "Why Cash Flow is king. Discover how companies manipulate accounting net profit while operating cash flow tells the genuine truth.",
    takeaways: [
      "Operating Cash Flow (CFO), Investing (CFI) & Financing (CFF)",
      "Free Cash Flow (FCF) calculation: CFO minus CapEx",
      "Spotting companies with rising profits but zero cash generation",
      "Debt repayment capability from genuine cash flows"
    ]
  },
  {
    id: "EBx2oOZw9ic",
    title: "PE Ratio Decoded: Trailing PE, Forward PE & Valuation Multiples",
    author: "SOIC (Ishmohit)",
    channelSubscribers: "650K+",
    duration: "2h 11m",
    level: "Intermediate",
    category: "Fundamentals",
    levelNumber: 2,
    uploadDate: "Aug 2024",
    publishYear: "2024",
    description: "The most thorough lecture in India on price-to-earnings multiples. Why low PE is not always cheap and high PE is not always expensive.",
    takeaways: [
      "P/E Multiple: Earnings yield vs Bond yield comparison",
      "Cyclical P/E (Commodities) vs Structural High P/E (FMCG/Consumer)",
      "PEG Ratio (P/E to Growth) to value multibagger growth stocks",
      "Enterprise Value to EBITDA (EV/EBITDA) for capital intensive sectors"
    ]
  },
  {
    id: "IkP62J7NMu8",
    title: "Screener.in Complete Guide: How to Filter & Analyze Stocks",
    author: "Simple Invest",
    channelSubscribers: "280K+",
    duration: "36m",
    level: "Intermediate",
    category: "Fundamentals",
    levelNumber: 2,
    uploadDate: "Jul 2025",
    publishYear: "2025",
    description: "Practical guide to using Screener.in formulas, financial query screeners, and ratio screens to find quality multibaggers.",
    takeaways: [
      "Building Screener.in formulas with ROCE, Debt/Equity & Sales growth",
      "Analyzing 10-year historical financial track record",
      "Tracking Promoter Shareholding and FII/DII quarterly trends",
      "Exporting data and reading peer comparison valuation tables"
    ]
  },
  {
    id: "7jhrs5h-g0s",
    title: "Fundamentals vs Technicals: Which Strategy Wins in India?",
    author: "SOIC & Himanshu Sharma",
    channelSubscribers: "650K+",
    duration: "1h 58m",
    level: "Intermediate",
    category: "Fundamentals",
    levelNumber: 2,
    uploadDate: "Jan 2026",
    publishYear: "2026",
    description: "High-level debate and synthesis combining fundamental business moats with technical entry and exit timing.",
    takeaways: [
      "Techno-Funda investing: Using fundamentals for stock selection, technicals for timing",
      "When fundamental value traps occur and how price action prevents them",
      "Stage Analysis: Identifying when a quality stock enters stage 2 markup",
      "Position sizing based on conviction and price trend confirmation"
    ]
  },

  // LEVEL 3: TECHNICAL ANALYSIS & PRICE ACTION (2024 - 2026)
  {
    id: "L2OochgcO3E",
    title: "Ultimate Price Action Masterclass - 3 Hours Complete Guide",
    author: "Trade with Purab",
    channelSubscribers: "850K+",
    duration: "3h 3m",
    level: "Intermediate",
    category: "Technicals",
    levelNumber: 3,
    uploadDate: "Sep 2024",
    publishYear: "2024",
    description: "Full in-depth price action masterclass without lagging indicators. Learn to read market structure, liquidity zones, and institutional order blocks.",
    takeaways: [
      "Market Structure: Higher Highs / Higher Lows (Uptrend) vs Downtrend",
      "Institutional liquidity sweeps and stop-loss hunt zones",
      "Break of Structure (BOS) and Change of Character (CHoCH)",
      "High probability entry setups with tight invalidation points"
    ]
  },
  {
    id: "KwS0XZb4qGA",
    title: "Complete Price Action Course: Basic to Advanced Strategy",
    author: "Price Lesson Hindi",
    channelSubscribers: "1.2M+",
    duration: "3h 16m",
    level: "Intermediate",
    category: "Technicals",
    levelNumber: 3,
    uploadDate: "Mar 2026",
    publishYear: "2026",
    description: "Brand-new comprehensive price action course. Support/resistance zones, trendline breakouts, and volume profile confirmations.",
    takeaways: [
      "Horizontal support & resistance zones: Drawing genuine institutional areas",
      "Trendline validation: 3-touch rule and breakout confirmation",
      "Volume Profile: High volume nodes vs low volume rejection areas",
      "Risk-to-reward ratio calculation before placing orders"
    ]
  },
  {
    id: "XVMom00bLe0",
    title: "6 Most Powerful Candlestick Patterns with Price Action Rules",
    author: "Price Lesson Hindi",
    channelSubscribers: "1.2M+",
    duration: "13m",
    level: "Intermediate",
    category: "Technicals",
    levelNumber: 3,
    uploadDate: "Aug 2024",
    publishYear: "2024",
    description: "Focuses strictly on the 6 candlestick patterns with over 70% win-rate when traded at key support and resistance zones.",
    takeaways: [
      "Bullish & Bearish Engulfing at key horizontal levels",
      "Pin Bar / Hammer and Shooting Star rejection candles",
      "Morning Star & Evening Star multi-candle reversal confirmations",
      "Why candlesticks in the middle of nowhere must be ignored"
    ]
  },
  {
    id: "aosehYRSTUE",
    title: "Swing Trading for Beginners: High Probability Strategy",
    author: "Siddharth Bhanushali",
    channelSubscribers: "2.1M+",
    duration: "42m",
    level: "Intermediate",
    category: "Technicals",
    levelNumber: 3,
    uploadDate: "Jul 2025",
    publishYear: "2025",
    description: "Practical swing trading strategy for working professionals requiring just 1 hour a day. Learn multi-timeframe confirmation.",
    takeaways: [
      "Weekly timeframe for trend bias + Daily timeframe for execution",
      "Trading pullbacks to 20 EMA and 44 EMA instead of chasing breakout tops",
      "Stop loss placement below swing lows with 1:2 minimum target",
      "Managing trade psychology during multi-day holding periods"
    ]
  },
  {
    id: "RicicIMvBxQ",
    title: "Price Action Breakout Strategy & Volume Analysis",
    author: "Pushkar Raj Thakur",
    channelSubscribers: "11M+",
    duration: "25m",
    level: "Intermediate",
    category: "Technicals",
    levelNumber: 3,
    uploadDate: "Aug 2026",
    publishYear: "2026",
    description: "Latest 2026 masterclass on trading breakouts with volume confirmation and avoiding false breakout traps.",
    takeaways: [
      "Volume expansion on breakout candles (> 2x 20-day average volume)",
      "Retest vs direct entry trade mechanics",
      "RSI (Relative Strength Index) 14 divergence detection",
      "Trailing stop losses with dynamic moving averages"
    ]
  },

  // LEVEL 4: DERIVATIVES (FUTURES & OPTIONS) (2024 - 2026)
  {
    id: "iIoZPfYKwpM",
    title: "OPTIONS TRADING For Beginners FULL COURSE in Hindi",
    author: "Neeraj Joshi",
    channelSubscribers: "3.2M+",
    duration: "1h 22m",
    level: "Advanced",
    category: "Derivatives",
    levelNumber: 4,
    uploadDate: "Jun 2024",
    publishYear: "2024",
    description: "Modern complete options masterclass. Learn Call & Put options, Open Interest (OI), strike selection, and new SEBI rules.",
    takeaways: [
      "Call Option (CE) and Put Option (PE) fundamentals and rights",
      "In The Money (ITM), At The Money (ATM), Out of The Money (OTM)",
      "Reading the live NSE Option Chain: Open Interest (OI) build-up",
      "Why 90% of retail option buyers lose money and how to survive"
    ]
  },
  {
    id: "7K99TiL6tdE",
    title: "Option Trading Complete Masterclass: Strategy to Execution",
    author: "Chart Padhna Sikho",
    channelSubscribers: "1.1M+",
    duration: "2h 58m",
    level: "Advanced",
    category: "Derivatives",
    levelNumber: 4,
    uploadDate: "Aug 2026",
    publishYear: "2026",
    description: "Comprehensive 2026 masterclass covering option buying vs option selling, index options (Nifty/Bank Nifty), and non-directional strategies.",
    takeaways: [
      "Option Buying vs Option Selling: Win rates and margin requirements",
      "Strike price selection criteria based on Delta and IV",
      "Intraday Option Buying setups with strict risk limits",
      "Managing drawdowns in high volatility option trading"
    ]
  },
  {
    id: "UzQ0xItbIU8",
    title: "What Are Options? Complete Visual Breakdown in Simple Words",
    author: "Ganesh Sharma",
    channelSubscribers: "750K+",
    duration: "54m",
    level: "Advanced",
    category: "Derivatives",
    levelNumber: 4,
    uploadDate: "Sep 2025",
    publishYear: "2025",
    description: "Visual, intuitive guide to options terminology, intrinsic vs extrinsic value, and expiry settlement.",
    takeaways: [
      "Premium breakdown: Intrinsic Value + Extrinsic (Time) Value",
      "Time Decay (Theta) and how it accelerates into weekly expiry",
      "Break-even price calculation on Call and Put purchases",
      "Stock options vs Index options differences"
    ]
  },
  {
    id: "QY7bnP3rR2c",
    title: "Call Option Explained: Buy, Sell & Profit Mechanics",
    author: "Be Sensibull",
    channelSubscribers: "920K+",
    duration: "15m",
    level: "Advanced",
    category: "Derivatives",
    levelNumber: 4,
    uploadDate: "Aug 2026",
    publishYear: "2026",
    description: "Official Sensibull options masterclass explaining directional Call option trading, payoffs, and hedging.",
    takeaways: [
      "Live option payoff curve visualization before taking trades",
      "Calculating Probability of Profit (POP) and max loss",
      "Call buying in strong breakout momentum stocks",
      "Call selling (writing) for range-bound income generation"
    ]
  },
  {
    id: "6lqhzHRusZM",
    title: "Delta, Theta, Vega, Gamma: Option Greeks Truth Explained",
    author: "Mohit Lamba",
    channelSubscribers: "420K+",
    duration: "20m",
    level: "Advanced",
    category: "Derivatives",
    levelNumber: 4,
    uploadDate: "Apr 2026",
    publishYear: "2026",
    description: "In-depth guide to the 4 Option Greeks and how Implied Volatility (IV) spikes make or break option positions.",
    takeaways: [
      "Delta: Price sensitivity of option per ₹1 move in spot price",
      "Theta: Daily time decay rate and how theta crush hurts buyers",
      "Vega: The impact of Implied Volatility (IV) changes on option premiums",
      "Gamma: Why ATM options experience wild premium swings near expiry"
    ]
  },

  // LEVEL 5: RISK MANAGEMENT & PSYCHOLOGY (2024 - 2026)
  {
    id: "TmmbgvDMLdQ",
    title: "Master Your Trading Psychology in 17 Minutes (Full Course)",
    author: "Umar Punjabi",
    channelSubscribers: "1.2M+",
    duration: "17m",
    level: "Advanced",
    category: "Risk & Psychology",
    levelNumber: 5,
    uploadDate: "May 2025",
    publishYear: "2025",
    description: "Masterclass on the psychological biases that destroy traders. Learn to defeat FOMO, revenge trading, and over-leveraging.",
    takeaways: [
      "Why intelligence doesn't equal trading success - emotional control does",
      "How to accept a loss without anger or the urge to take revenge trades",
      "The 'Rule of 20 Trades': Thinking in sample sizes rather than single trades",
      "Maintaining a disciplined daily trading journal"
    ]
  },
  {
    id: "CwT874RVC7s",
    title: "Position Sizing: The Core Foundation of Risk Management",
    author: "In The Money by Zerodha",
    channelSubscribers: "1.4M+",
    duration: "18m",
    level: "Advanced",
    category: "Risk & Psychology",
    levelNumber: 5,
    uploadDate: "Feb 2026",
    publishYear: "2026",
    description: "Zerodha's official mathematical risk management guide. Why position sizing is the single metric that separates surviving traders from blown accounts.",
    takeaways: [
      "The 1% - 2% Risk Rule: Maximum capital risked on any single trade",
      "Formula: Position Size = (Account Capital × Risk %) / (Entry Price - Stop Loss)",
      "Risk of Ruin calculation: Why a 50% account loss requires a 100% gain to break even",
      "Dynamic scaling: Reducing lot sizes during losing streaks"
    ]
  },
  {
    id: "ruKNsdvkfV0",
    title: "The Disciplined Trader (Mark Douglas) Masterclass in Hindi",
    author: "Financial Brain",
    channelSubscribers: "680K+",
    duration: "32m",
    level: "Advanced",
    category: "Risk & Psychology",
    levelNumber: 5,
    uploadDate: "May 2025",
    publishYear: "2025",
    description: "Comprehensive summary of Mark Douglas's legendary work on emotional discipline, cognitive biases, and consistency in trading.",
    takeaways: [
      "Why the market is a mirror of your own internal emotional state",
      "Eliminating the need to be right on every trade",
      "Developing a state of mind called 'effortless execution'",
      "Executing trading plans with zero hesitation or anxiety"
    ]
  },
  {
    id: "rEC15tWo_oU",
    title: "How to Build an Equity Portfolio That Beats 99% of Fund Managers",
    author: "Akshat Shrivastava",
    channelSubscribers: "2.4M+",
    duration: "20m",
    level: "Advanced",
    category: "Risk & Psychology",
    levelNumber: 5,
    uploadDate: "Apr 2025",
    publishYear: "2025",
    description: "Modern portfolio allocation framework for 2025-2026. Balancing high growth mid/small caps with safe index foundations.",
    takeaways: [
      "Core Portfolio (70% Index & Quality Large Caps) vs Satellite (30% Alpha)",
      "Rebalancing strategy during 20% - 30% market crashes",
      "Cash reserve management: Always holding 'dry powder' for dips",
      "Compounding patience: Why wealth is made in the holding, not the trading"
    ]
  },
  {
    id: "-DHozAiLTBg",
    title: "The End Of Emotional Trading: Eliminate Revenge & FOMO Trades",
    author: "Stock Learners",
    channelSubscribers: "950K+",
    duration: "19m",
    level: "Advanced",
    category: "Risk & Psychology",
    levelNumber: 5,
    uploadDate: "Sep 2026",
    publishYear: "2026",
    description: "Latest 2026 practical guide on eliminating impulsive trading habits, greed, and recovering from severe drawdowns.",
    takeaways: [
      "Setting daily max loss limits with automatic broker kill-switches",
      "Overcoming FOMO (Fear Of Missing Out) when green candles surge",
      "Pre-market preparation routine to stay calm during market hours",
      "Treating trading as an audited business rather than a casino"
    ]
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Lectures', count: COURSES.length },
  { id: 'Basics', label: 'Level 1: Market Basics', count: COURSES.filter(c => c.category === 'Basics').length },
  { id: 'Fundamentals', label: 'Level 2: Fundamental Analysis', count: COURSES.filter(c => c.category === 'Fundamentals').length },
  { id: 'Technicals', label: 'Level 3: Technical Analysis', count: COURSES.filter(c => c.category === 'Technicals').length },
  { id: 'Derivatives', label: 'Level 4: Futures & Options (F&O)', count: COURSES.filter(c => c.category === 'Derivatives').length },
  { id: 'Risk & Psychology', label: 'Level 5: Risk & Psychology', count: COURSES.filter(c => c.category === 'Risk & Psychology').length }
];

export default function LearnView() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Close video modal on ESC key
  useEffect(() => {
    if (!activeVideo) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveVideo(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeVideo]);

  const filteredCourses = COURSES.filter(c => {
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term ||
      c.title.toLowerCase().includes(term) ||
      c.author.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term) ||
      c.publishYear.includes(term) ||
      c.takeaways.some(t => t.toLowerCase().includes(term));
    return matchesCategory && matchesSearch;
  });

  const handleCopyLink = (video, e) => {
    e.stopPropagation();
    const url = `https://www.youtube.com/watch?v=${video.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(video.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-y-auto">
      {/* Academy Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-b border-slate-800 px-6 py-6 select-none">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Learning Academy</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Fresh (2024 – 2026 Only)</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                100% Free
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1.5 flex items-center gap-2.5">
              <span>Stock Market Masterclass: Basic to Advance</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Every lecture in this curriculum was uploaded within the last 2 years (2024–2026). Curated from India's top certified educators (Pushkar Raj Thakur, SOIC, Zerodha, Siddharth Bhanushali, Neeraj Joshi, Akshat Shrivastava, Sensibull).
            </p>
          </div>

          {/* Quick Curriculum Roadmap Stats */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-2xl border border-slate-800/80 shadow-lg">
            <div className="px-3 py-1.5 text-center border-r border-slate-800">
              <div className="text-base font-black text-emerald-400">5</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Levels</div>
            </div>
            <div className="px-3 py-1.5 text-center border-r border-slate-800">
              <div className="text-base font-black text-indigo-400">{COURSES.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Lectures</div>
            </div>
            <div className="px-3 py-1.5 text-center border-r border-slate-800">
              <div className="text-base font-black text-amber-400">&lt; 2 Yrs</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Max Age</div>
            </div>
            <div className="px-3 py-1.5 text-center">
              <div className="text-base font-black text-cyan-400">2024-26</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Published</div>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Level Track Navigator */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Level Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  selectedCategory === cat.id ? 'bg-emerald-700/80 text-white' : 'bg-slate-800 text-slate-500'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search lectures by topic, educator, 2024/2025/2026..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Video Curriculum Grid */}
      <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
        {filteredCourses.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-slate-400">No lectures found matching "{searchTerm}"</div>
            <p className="text-xs text-slate-500">Try searching for keywords like "Balance Sheet", "Options", "Price Action", or "Position Sizing"</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
              className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((video) => {
              const youtubeUrl = `https://www.youtube.com/watch?v=${video.id}`;
              const thumbnailUrl = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
              const isCopied = copiedId === video.id;

              return (
                <div
                  key={video.id}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-emerald-950/20 transition-all flex flex-col group"
                >
                  {/* Video Thumbnail & Play Trigger */}
                  <div 
                    onClick={() => setActiveVideo(video)}
                    className="relative aspect-video w-full bg-slate-950 cursor-pointer overflow-hidden group/thumb"
                  >
                    <img 
                      src={thumbnailUrl} 
                      alt={video.title}
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300 opacity-90 group-hover/thumb:opacity-100"
                      loading="lazy"
                    />

                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-2xl group-hover/thumb:scale-110 group-hover/thumb:bg-emerald-500 transition-all">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        video.level === 'Beginner' 
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                          : video.level === 'Intermediate' 
                          ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40' 
                          : 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                      }`}>
                        Level {video.levelNumber}: {video.level}
                      </span>

                      {/* Fresh date pill */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>{video.uploadDate}</span>
                      </span>
                    </div>

                    {/* Duration badge bottom right */}
                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-white font-mono text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{video.duration}</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {/* Educator Channel info */}
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span className="font-bold text-slate-300 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>{video.author}</span>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          {video.publishYear}
                        </span>
                      </div>

                      {/* Video Title */}
                      <h3 
                        onClick={() => setActiveVideo(video)}
                        className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 cursor-pointer leading-snug"
                        title={video.title}
                      >
                        {video.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>

                      {/* Key Takeaways */}
                      <div className="mt-3 pt-3 border-t border-slate-800/80">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          What You Will Learn:
                        </div>
                        <ul className="space-y-1 text-[11px] text-slate-300">
                          {video.takeaways.slice(0, 3).map((pt, i) => (
                            <li key={i} className="flex items-start gap-1.5 leading-tight">
                              <span className="text-emerald-400 font-bold shrink-0 mt-0.5">&bull;</span>
                              <span className="line-clamp-1">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action Buttons: Watch Inside App & External YouTube Link */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setActiveVideo(video)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Watch Video</span>
                      </button>

                      <a
                        href={youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                        title="Open directly on YouTube in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">YouTube</span>
                      </a>

                      <button
                        onClick={(e) => handleCopyLink(video, e)}
                        className="py-1.5 px-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-all cursor-pointer"
                        title="Copy YouTube video link"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Learning Roadmap / 5 Steps Infobox */}
        <div className="mt-10 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Brain className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">The Ideal Indian Stock Market Learning Roadmap (2024–2026 Edition)</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Follow this recommended chronological order to transition from complete beginner to consistent investor or trader using current market frameworks:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
            {[
              { step: "Step 1", title: "Market Basics", desc: "Understand Demat, exchange orders, market cap, and how shares trade.", tag: "2024-26 Courses" },
              { step: "Step 2", title: "Fundamental Analysis", desc: "Read balance sheets, calculate ROCE, ROE, P/E, and find business moats.", tag: "SOIC Masterclasses" },
              { step: "Step 3", title: "Technical Analysis", desc: "Master candlestick price action, support/resistance, and 20 EMA / 50 SMA.", tag: "Price Action 2024-26" },
              { step: "Step 4", title: "Futures & Options", desc: "Understand Call/Put payoffs, Option Greeks (Delta, Theta, IV), and hedging.", tag: "Modern Option Chains" },
              { step: "Step 5", title: "Risk & Psychology", desc: "Position sizing, stop loss discipline, and emotional detachment.", tag: "Zerodha & Mark Douglas" },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono text-emerald-400">{item.step}</span>
                  <span className="text-[9px] font-mono text-slate-500">{item.tag}</span>
                </div>
                <div className="text-xs font-bold text-slate-200">{item.title}</div>
                <div className="text-[11px] text-slate-400 leading-tight">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* In-App Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2 overflow-hidden pr-4">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  Level {activeVideo.levelNumber}: {activeVideo.category}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  {activeVideo.uploadDate}
                </span>
                <h3 className="text-sm font-bold text-white truncate">
                  {activeVideo.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`https://www.youtube.com/watch?v=${activeVideo.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open on YouTube</span>
                </a>

                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Close Video (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* YouTube Responsive Embed Player */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            </div>

            {/* Modal Video Info & Learning Notes */}
            <div className="p-5 overflow-y-auto max-h-48 bg-slate-950/60 border-t border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{activeVideo.author}</span>
                  <span className="text-xs text-slate-400">({activeVideo.channelSubscribers} subscribers)</span>
                  <span className="text-xs text-amber-400 font-mono">Published: {activeVideo.uploadDate}</span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Direct Link: <a href={`https://www.youtube.com/watch?v=${activeVideo.id}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">https://www.youtube.com/watch?v={activeVideo.id}</a>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {activeVideo.description}
              </p>

              <div className="pt-2 border-t border-slate-800/60">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Key Lecture Concepts:
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeVideo.takeaways.map((item, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                      &bull; {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
