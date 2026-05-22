# AIDA Market Intelligence Dashboard — Development Context

**Last Updated:** 2026-05-22  
**Status:** In Progress — All 3 layers rendering with corrected filter system

---

## 🎯 Project Overview

Building a 3-layer investment intelligence platform for AIDA Ventures with market benchmarking, startup pipeline review, and valuation analysis for Latin American startups.

**URL Structure:**
- `index.html` — Main dashboard (3 tabs + 1 placeholder)
- `src/css/styles.css` — Light mode minimal design
- `src/js/` — Data loading, rendering, utilities
- `data/processed/` — Generated from Python scripts

---

## 📊 Data Pipeline

### Source Files (Excel Masters)
```
data/master/
├── market_benchmark_layer.xlsx      — 5,880 rows of market metrics
├── startup_deal_layer.xlsx          — 175 startup records
└── [merged_valuation_layer created by scripts]
```

### Processing Scripts
```
scripts/
├── clean_market_layer.py            — Standardize, convert types, export CSV
├── clean_startup_layer.py           — Normalize names, compute derived fields
└── build_processed_data.py          — Match startups to benchmarks, compute scores
```

### Output CSVs (Wide Format)
```
data/processed/
├── market_benchmark_layer.csv       — 5,880 × 30 cols (metric columns: investment_amount_usd, valuation_pre_money_usd, revenue_multiple, etc.)
├── startup_deal_layer.csv           — 175 × 58 cols (numeric cols: arr_usd, growth_yoy, burn_rate_usd, efficiency_score, etc.)
└── merged_valuation_layer.csv       — 175 × 73 cols (joined + computed scores)
```

---

## 🔧 Recent Fixes (2026-05-22)

### Problem: Data Not Displaying + Filters Not Working

**Root Cause 1 — CSV Structure Mismatch**
- Papa Parse was loading values as strings instead of numbers
- Arquero filters like `d.metric_value_mid > 100` failed on string comparisons
- Solution: Added comprehensive `NUMERIC_COLUMNS` dict + `parseFloat()` conversion in `data_loader.js`

**Root Cause 2 — Filters Applied to Wrong Columns**
- Each dataset (market, startups, merged) has different columns
- Filters from market (sector, country, round_stage) don't exist in all datasets → data disappeared
- Solution: Created `applyFiltersToTable(table, filters, availableColumns)` that checks column existence before filtering

**Root Cause 3 — Missing Numeric Column Declarations**
- Columns like `arr_usd`, `growth_yoy`, `efficiency_score` weren't in the conversion list
- Solution: Expanded `NUMERIC_COLUMNS` to include all 30+ numeric metrics

### Changes Made

**`src/js/data_loader.js`** (Complete rewrite)
- ✅ Parallel CSV loading with better error handling
- ✅ `NUMERIC_COLUMNS` dict with 30+ column names
- ✅ Type conversion: `parseFloat()` for numeric columns, null for empty values
- ✅ Improved logging at each stage (fetch → parse → convert → Arquero table)
- ✅ New `applyFiltersToTable()` function that validates columns exist
- ✅ New `populateFilters()` that only uses market data columns that exist

**`src/js/market_reality.js`** (Corrected for wide-format CSV)
- ✅ Removed filtering by `metric_name` (doesn't exist in this format)
- ✅ Now uses direct column aggregation: `sum(investment_amount_usd)`, `mean(revenue_multiple)`, etc.
- ✅ All 6 charts render with validated data
- ✅ Added detailed logging for debugging

**`src/js/startup_review.js`** (Updated with robust filters)
- ✅ Integrated `applyFiltersToTable()` for safe filtering
- ✅ All 3 charts render: ARR Distribution, Growth vs Burn, **Ranking by ARR**
- ✅ Filters now apply correctly without breaking data

**`src/js/valuation_layer.js`** (Updated with robust filters)
- ✅ Integrated `applyFiltersToTable()` for safe filtering
- ✅ All 4 charts render: Growth vs Entry Multiple, PPM, **Attractiveness Ranking**, **Efficiency Score Breakdown**
- ✅ Filters now apply correctly without breaking data

**`src/css/styles.css`** (Styling improvements)
- ✅ `.kpi-value`: 36px, weight 800, AIDA blue `#134E97`
- ✅ `.kpi-label`: weight 600, darker gray `#1F2937`
- ✅ `.chart-title`: 16px, bold (700), pure black `#000000`

---

## ✅ Current Status (2026-05-22)

### Working
- ✅ Data loads without errors (3 CSVs in parallel)
- ✅ Type conversion works (strings → numbers)
- ✅ All 13 charts render with data:
  - Market Reality: 6 charts
  - Startup Review: 3 charts
  - Valuation Layer: 4 charts
- ✅ KPI cards show correct statistics
- ✅ Styling (light mode, colors, typography) complete
- ✅ Filter system safe (checks column existence)

### Verified in Browser (F12 Console)
- All `✅ chart-X rendered` logs appear
- No JavaScript errors
- Type conversions confirmed (e.g., `typeof arr_usd = 'number'`)
- Data statistics display correctly

---

## 🎬 Next Steps (For Next Session)

### 1. Verify Filter Functionality
- **Test Case:** Open dashboard → Click Market Reality tab → Change "Sector" filter → Verify 6 charts update immediately
- **Expected:** Charts redraw without errors, KPIs recalculate
- **If broken:** Check that event listeners in index.html properly call `renderActiveTab()`

### 2. Test All 3 Layers
- **Market Reality:** Investment by sector, valuation by stage, multiples, time between rounds, graduation rates, temporal evolution
- **Startup Review:** ARR distribution, growth vs burn, ranking by ARR (top 15)
- **Valuation Layer:** Growth vs entry multiple, price-performance matrix, attractiveness ranking (top 15), efficiency breakdown (top 10)

### 3. Edge Cases
- Empty filters (should show full dataset)
- Reset filters button (should clear all filters + redraw)
- Export CSV (should include applied filters)
- No data for a filter combination (should show unfiltered)

### 4. Polish
- [ ] Verify responsive design on different screen sizes
- [ ] Check hover effects and interactivity on charts
- [ ] Validate numerical formatting (USD millions vs USD billions)
- [ ] Test on different browsers (Chrome, Firefox, Edge, Safari)

---

## 🚀 Local Development

### Start Development Server
```bash
cd C:\Users\anton\OneDrive\Documentos\GitHub\AIDA_Ventures_Dashboard
python -m http.server 8000
# Navigate to http://localhost:8000
```

### Debug Workflow
1. **Check Data Load:** F12 Console → search for `📊 DATA SUMMARY`
2. **Check Renders:** F12 Console → search for `✅ chart-` (should see 13 of these)
3. **Check Filters:** Change filter in dropdown → verify console shows `[render] Active filters:` with new values
4. **Check Errors:** F12 Console → any red errors? Check the message + stack trace

### Run Data Pipeline
```bash
# If data changes in Excel masters:
python scripts/clean_market_layer.py
python scripts/clean_startup_layer.py
python scripts/build_processed_data.py
# Then refresh browser (F5)
```

---

## 📝 Code Architecture

### File Dependencies
```
index.html
├── utils.js                    (AIDA_COLORS, PLOTLY_LAYOUT_BASE, fmtUSD, fmtPct, computeStats, etc.)
├── data_loader.js              (AppData, AppState, parseCSVtoArqueroSimple, applyFiltersToTable, renderActiveTab)
├── market_reality.js           (renderMarketReality — 6 charts)
├── startup_review.js           (renderStartupReview — 3 charts)
└── valuation_layer.js          (renderValuationLayer — 4 charts)
```

### Global State
```javascript
AppData = { 
  market: aq.Table,      // Arquero table, 5880 rows
  startups: aq.Table,    // Arquero table, 175 rows
  merged: aq.Table,      // Arquero table, 175 rows
  loaded: boolean        // Set to true when all 3 load successfully
}

AppState = {
  activeTab: 'market-reality' | 'startup-review' | 'valuation-layer',
  filters: {
    sector: '',
    country: '',
    region: '',
    round_stage: '',
    deal_status: ''
  }
}
```

### Key Functions
- `loadAllData()` — Loads 3 CSVs in parallel, converts types, creates Arquero tables
- `applyFiltersToTable(table, filters, availableColumns)` — Safe filtering that checks column existence
- `renderActiveTab()` — Calls appropriate render function based on AppState.activeTab
- `renderMarketReality(filters)` — Renders 6 charts for Market Reality layer
- `renderStartupReview(filters)` — Renders 3 charts for Startup Review layer
- `renderValuationLayer(filters)` — Renders 4 charts for Valuation Layer layer

---

## 🐛 Known Issues & Workarounds

None currently — all reported issues fixed in this session.

---

## 📚 Libraries Used

- **Plotly.js 2.27.0** — Charts (bar, scatter, box, histogram, line)
- **Arquero 5.4.0** — Data manipulation (groupby, rollup, filter, orderby)
- **PapaParse 5.4.1** — CSV parsing
- **Google Fonts (Inter)** — Typography

---

## 🔐 Environment

- **OS:** Windows 11 Home
- **Browser:** Chrome (primary)
- **Python:** 3.x (for data scripts)
- **Node:** Not needed (vanilla JS + CDN libraries)

---

## 💡 Tips for Future Sessions

1. **Always check console (F12)** before debugging UI issues — type conversions, data load errors, and render logs are all there
2. **Use `applyFiltersToTable()`** for all filter operations — it validates columns exist
3. **All numeric columns must be in `NUMERIC_COLUMNS` dict** — or they load as strings
4. **CSV is wide-format** (columns per metric) not long-format (rows per metric) — adjust filtering accordingly
5. **Arquero escapes are required** — use `aq.escape(d => condition)` in filters, don't use bare functions
6. **Plotly.purge()** before `.newPlot()` — prevents duplicate charts
7. **Type: `number`** checked via `typeof value === 'number'` — not `isNaN()` or `isFinite()` alone

---

## 📞 Contact / Context

**Antonio Gutierrez**  
Email: antoniogutierrezarango66@gmail.com  
Branch: main  
Last commit: 35796b8 (Debug + UI/UX Light Mode)
