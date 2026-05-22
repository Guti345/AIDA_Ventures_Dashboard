# AIDA Market Intelligence Dashboard

Internal investment intelligence platform for AIDA Ventures — market benchmarking, startup pipeline review, and valuation analysis for Latin American startups.

**Status:** ✅ Fully functional (May 2026)  
**Stack:** Vanilla JS + Plotly + Arquero + PapaParse (no backend required)

---

## 📋 Quick Start

### Option 1: Run Locally (Development)

```bash
# 1. Navigate to project directory
cd C:\Users\anton\OneDrive\Documentos\GitHub\AIDA_Ventures_Dashboard

# 2. Start Python HTTP server
python -m http.server 8000

# 3. Open browser
http://localhost:8000

# 4. Open F12 console to verify data loaded successfully
```

### Option 2: Full Data Pipeline (If you modified Excel masters)

```bash
# 1. Update Excel files
#    - data/master/market_benchmark_layer.xlsx
#    - data/master/startup_deal_layer.xlsx

# 2. Run Python data processing scripts
python scripts/clean_market_layer.py
python scripts/clean_startup_layer.py
python scripts/build_processed_data.py

# 3. Start server and refresh browser
python -m http.server 8000
# Then refresh http://localhost:8000 (F5)
```

---

## 🔄 Complete Data Pipeline

### Step 1: Excel Masters (Input)

Edit these files with the latest data:

```
data/master/
├── market_benchmark_layer.xlsx
│   └── Columns: record_id, date, source, country, sector, stage, metric_name, 
│               metric_value_min, metric_value_max, metric_value_mid, unit, etc.
│   └── Example: Crunchbase data on investment amounts by sector/stage
│
└── startup_deal_layer.xlsx
    └── Columns: startup_id, startup_name, country, sector, stage, arr_usd, 
                growth_yoy, burn_rate_usd, runway_months, deal_status, etc.
    └── Example: Portfolio startups with financial metrics
```

**Data Entry Rules:**
- ✅ Keep record IDs unique (don't edit existing IDs, append new rows)
- ✅ Use consistent sector/country/stage names (case-sensitive)
- ✅ Numeric columns: use `.` as decimal separator (not `,`)
- ✅ Dates: ISO format `YYYY-MM-DD`
- ✅ Empty cells: leave blank (don't use `N/A` or `0`)

---

### Step 2: Python Data Processing

Run these scripts in order. Each generates a cleaned CSV.

#### Script 1: `clean_market_layer.py`

**What it does:**
- Reads `data/master/market_benchmark_layer.xlsx`
- Standardizes data types (dates, numeric conversions)
- Calculates missing `metric_value_mid` where needed
- Exports `data/processed/market_benchmark_layer.csv`

**Run:**
```bash
python scripts/clean_market_layer.py
```

**Expected output:**
```
[clean_market_layer] Iniciando limpieza de benchmarks...
Leyendo: data/master/market_benchmark_layer.xlsx
Filas iniciales: 5880

[VALIDACION] Verificando columnas requeridas...
  OK: record_id, data_reference_date, source_name, sector, round_stage, metric_name, metric_value_mid
  ...

[EXPORT] Exportando a data/processed/market_benchmark_layer.csv...

======================================================================
RESUMEN — clean_market_layer.py
======================================================================
Filas exportadas:      5880
Columnas:              30
Nulls en columnas críticas: 0
Sectores únicos: 5
Países únicos:   7
======================================================================
```

---

#### Script 2: `clean_startup_layer.py`

**What it does:**
- Reads `data/master/startup_deal_layer.xlsx`
- Normalizes startup names
- Computes derived metrics (arr_per_employee, entry_multiple, burn_multiple, ltv_cac_ratio)
- Exports `data/processed/startup_deal_layer.csv`

**Run:**
```bash
python scripts/clean_startup_layer.py
```

**Expected output:**
```
[clean_startup_layer] Iniciando limpieza de startups...
Leyendo: data/master/startup_deal_layer.xlsx
Filas iniciales: 175

[STANDARDIZATION] Estandarizando valores...
[FECHA] Convertiendo dates...
[NUMERICO] Convertiendo a float...
[NORMALIZACION] Normalizando nombres de startups...
[CAMPOS_DERIVADOS] Calculando campos derivados...

[EXPORT] Exportando a data/processed/startup_deal_layer.csv...

======================================================================
RESUMEN — clean_startup_layer.py
======================================================================
Filas exportadas:      175
Columnas:              58
Campos derivados calculados:
  arr_per_employee:    175 valores
  entry_multiple:      175 valores
  burn_multiple:       175 valores
  ltv_cac_ratio:       175 valores
======================================================================
```

---

#### Script 3: `build_processed_data.py`

**What it does:**
- Reads both CSVs from Step 1 & 2
- Matches each startup to market benchmarks (7-level matching algorithm)
- Computes valuation signals (cheap/fair/expensive)
- Calculates efficiency_score and relative_attractiveness_score
- Exports `data/processed/merged_valuation_layer.csv`

**Run:**
```bash
python scripts/build_processed_data.py
```

**Expected output:**
```
[build_processed_data] Iniciando construcción de valuation layer...
Market benchmarks: 5880 filas
Startups: 175 filas

[MATCHING] Ejecutando cruce de 7 niveles...
Cruces completados. Resultado: 175 filas

Distribuci[on de matches por nivel:
  Nivel 6.0: 80
  Nivel 7.0: 17
  No match:  78

[INDICADORES] Calculando indicadores derivados...
[EFFICIENCY] Calculando efficiency_score...
[ATTRACTIVENESS] Calculando relative_attractiveness_score...

[EXPORT] Exportando a data/processed/merged_valuation_layer.csv...

======================================================================
RESUMEN — build_processed_data.py
======================================================================
Filas exportadas:      175
Columnas:              73
Distribuci[on de valuation_signal:
  cheap: 45
  fair: 30
  expensive: 25
  no_benchmark: 75
======================================================================
```

---

### Step 3: Start Local Dashboard

```bash
python -m http.server 8000
```

Navigate to `http://localhost:8000` and verify:
- ✅ 3 tabs appear (Market Reality, Startup Review, Valuation Layer)
- ✅ KPI cards show numbers > 0
- ✅ All charts are populated (open F12 console, search for `✅ chart-` — should see 13 matches)
- ✅ Filters work (change sector dropdown → charts update)
- ✅ No red errors in console

---

## 📊 Dashboard Layers

### Layer 1: Market Reality
**Purpose:** Understand market dynamics and benchmarks

**Charts:**
1. **Investment by Sector** — Sum of investment_amount_usd by sector (top 10)
2. **Valuation Range by Stage** — Box plot of valuation_pre_money_usd by round_stage
3. **Revenue Multiples by Sector** — Mean revenue_multiple by sector (top 10)
4. **Time Between Rounds** — Average months between rounds by stage
5. **Graduation Rates** — Percentage of startups that graduate by stage
6. **Temporal Evolution** — Growth rate trend over time

**KPIs:**
- Total Benchmarks (number of market data points)
- Countries (unique)
- Sectors (unique)
- Data Sources (unique)

**Filters Applied:**
- Sector, Country, Region, Round Stage, Deal Status

---

### Layer 2: Startup Review
**Purpose:** Pipeline overview and performance analysis

**Charts:**
1. **ARR Distribution** — Histogram of log10(ARR) across portfolio
2. **Growth vs Burn Multiple** — Scatter: burn_multiple (x) vs growth_yoy (y)
3. **Ranking by ARR** — Top 15 startups by annual recurring revenue

**KPIs:**
- Median ARR
- Median Growth YoY
- Median Burn Rate
- Average Runway (months)

**Table:**
- 50 startups (pagination), columns: Name, Sector, Stage, Country, ARR, Growth, Burn, Runway, Deal Status

**Filters Applied:**
- Sector, Country, Round Stage, Deal Status

---

### Layer 3: Valuation Layer
**Purpose:** Deal valuation analysis and attractiveness scoring

**Charts:**
1. **Growth vs Entry Multiple** — Scatter colored by valuation_signal (cheap/fair/expensive)
2. **Price-Performance Matrix** — Same scatter with median lines (quadrant view)
3. **Attractiveness Ranking** — Top 15 startups by relative_attractiveness_score
4. **Efficiency Breakdown** — Top 10 startups by efficiency_score (bar chart)

**KPIs:**
- Cheap Deals (valuation_signal = cheap)
- Fair Value (valuation_signal = fair)
- Expensive (valuation_signal = expensive)
- Avg Attractiveness Score

**Table:**
- 50 startups, columns: Startup, Sector, Entry Multiple, Benchmark Multiple, Signal, Attractiveness Score

**Filters Applied:**
- Sector, Valuation Signal

---

## 🛠️ Architecture & Data Flow

```
Excel Masters (data/master/)
    ↓
┌─────────────────────────────────────────┐
│ Python Data Processing Scripts          │
│ (clean_market_layer.py)                 │
│ (clean_startup_layer.py)                │
│ (build_processed_data.py)               │
└─────────────────────────────────────────┘
    ↓
CSV Files (data/processed/)
    ↓ (Papa Parse)
┌─────────────────────────────────────────┐
│ Browser JavaScript (data_loader.js)     │
│ - Type conversion (string → number)     │
│ - Arquero tables                        │
│ - Global AppData state                  │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Render Functions                        │
│ (market_reality.js)                     │
│ (startup_review.js)                     │
│ (valuation_layer.js)                    │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Plotly.js Charts + DOM HTML             │
│ (3 tabs × multiple charts)              │
└─────────────────────────────────────────┘
```

---

## 🔧 Development Guide

### File Structure

```
src/js/
├── utils.js              ← Shared utilities
│   ├── AIDA_COLORS       ← Color palette
│   ├── PLOTLY_LAYOUT_BASE ← Chart defaults
│   ├── fmtUSD, fmtPct, fmtMultiple, fmtMonths, fmtDate
│   ├── computeStats      ← P10, P90, mean, median, stdDev
│   ├── signalBadge       ← HTML badges
│   └── sectorColor       ← Color by sector
│
├── data_loader.js        ← Data ingestion
│   ├── parseCSVtoArqueroSimple(path)
│   ├── loadAllData()
│   ├── applyFiltersToTable(table, filters, cols)
│   ├── populateFilters()
│   └── renderActiveTab()  ← Dispatcher
│
├── market_reality.js     ← Layer 1 rendering (6 charts)
│
├── startup_review.js     ← Layer 2 rendering (3 charts)
│
└── valuation_layer.js    ← Layer 3 rendering (4 charts)

src/css/
└── styles.css            ← Light mode design (no dark mode)

index.html               ← Single HTML file (3 tabs)
```

### Key Concepts

**Arquero Tables:**
- Immutable data structure (like R data.frames)
- `.filter()` returns new table (doesn't modify original)
- `.groupby().rollup()` for aggregations
- `.array(colName)` to extract column as JavaScript array

**PapaParse:**
- Converts CSV text → JavaScript objects
- `header: true` → use first row as column names
- `skipEmptyLines: true` → ignore blank rows
- No automatic type conversion (always strings) → must manually convert

**Plotly:**
- `.newPlot(containerId, data, layout, config)`
- Data: array of trace objects (`{type, x, y, marker, ...}`)
- Layout: styling (`title`, `xaxis`, `yaxis`, `margin`, `plot_bgcolor`, etc.)
- Config: interaction options (`responsive: true`, `displayModeBar: false`)

**Type Safety:**
- All numeric columns must be in `NUMERIC_COLUMNS` dict (in data_loader.js)
- Verify with: `typeof value === 'number'` (not `isNaN()` or `isFinite()`)
- CSV loading: Papa Parse loads everything as strings → must `parseFloat()`
- Filters: use `aq.escape(d => d.column === value)` for safety

---

## 🧪 Testing Checklist

Before deploying, verify:

- [ ] **Data Load**
  - F12 Console: Search for `✅ All data loaded successfully`
  - Verify: "Market benchmarks: 5880 rows", "Startups: 175 rows", "Merged: 175 rows"

- [ ] **Chart Rendering**
  - F12 Console: Search for `✅ chart-` (should find 13)
  - Verify: No red errors in console

- [ ] **KPI Cards**
  - Market Reality: 4 cards with numbers > 0
  - Startup Review: 4 cards with numbers > 0
  - Valuation Layer: 4 cards with numbers > 0

- [ ] **Filters**
  - Change Sector dropdown → all 6 charts in Market Reality update
  - Change Sector dropdown → all 3 charts in Startup Review update
  - Reset Filters button → filters clear, all charts redraw to full data

- [ ] **Tables**
  - Startup Review: 50-row table visible, columns correctly formatted
  - Valuation Layer: 50-row table visible, badges render correctly

- [ ] **No Console Errors**
  - F12 Console: No red errors or warnings

---

## 🚀 Deployment

### GitHub Pages (Future)

When ready to deploy publicly:

```bash
# 1. Ensure all data scripts have run
python scripts/clean_market_layer.py
python scripts/clean_startup_layer.py
python scripts/build_processed_data.py

# 2. Commit and push
git add .
git commit -m "Deploy: Updated dashboard with latest data"
git push origin main

# 3. Enable GitHub Pages in repo settings
# Settings → Pages → Source: main branch → Save
# Website will be available at: https://github.com/AIDA-Ventures/AIDA_Ventures_Dashboard
```

---

## 📚 Reference

### Data Dictionary
- See `docs/data_dictionary.md` for column definitions

### Methodology
- See `docs/methodology.md` for matching algorithm, score calculations

### Dashboard Spec
- See `docs/dashboard_spec.md` for design decisions, color palette, chart choices

---

## 🐛 Troubleshooting

**Charts not showing?**
- ✅ Check F12 Console for errors
- ✅ Search console for `✅ chart-` (if not found, data didn't load)
- ✅ Verify CSV files exist in `data/processed/`
- ✅ Check that all numeric columns are in `NUMERIC_COLUMNS` dict

**Filters not working?**
- ✅ Change filter → watch F12 console for `[render] Active filters:` log
- ✅ If nothing changes: check that filter value matches data (case-sensitive)
- ✅ Reset filters button should clear all dropdowns + redraw charts

**Type conversion errors?**
- ✅ Open F12 Console → log sample data: `AppData.startups.array('arr_usd').slice(0, 3)`
- ✅ Should show numbers, not strings
- ✅ If strings: add column name to `NUMERIC_COLUMNS` dict in `data_loader.js`

**Slow performance?**
- ✅ Data is small (5880 + 175 rows) — should be instant
- ✅ If sluggish: check for JavaScript errors in console
- ✅ Try opening DevTools (F12) → Performance tab → record → interact → check for bottlenecks

---

## 📞 Support

**Questions about the code?** See `CLAUDE.md` for development context.

**Questions about data?** See `docs/` folder for methodology and dictionary.

---

**Last Updated:** May 2026  
**Maintainer:** Antonio Gutierrez (antoniogutierrezarango66@gmail.com)  
**License:** MIT
