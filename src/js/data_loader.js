// data_loader.js — Carga y conversión correcta de tipos de datos

const DATA_PATHS = {
  market:   'data/processed/market_benchmark_layer.csv',
  startups: 'data/processed/startup_deal_layer.csv',
  merged:   'data/processed/merged_valuation_layer.csv',
};

// Columnas que deben convertirse a números
const NUMERIC_COLUMNS = {
  metric_value_min: true,
  metric_value_max: true,
  metric_value_mid: true,
  investment_amount_usd: true,
  valuation_pre_money_usd: true,
  valuation_post_money_usd: true,
  revenue_multiple: true,
  growth_rate: true,
  growth_yoy: true,
  arr_usd: true,
  burn_rate_usd: true,
  burn_multiple: true,
  runway_months: true,
  entry_multiple: true,
  efficiency_score: true,
  relative_attractiveness_score: true,
  ltv_cac_ratio: true,
  gross_margin: true,
  cac_payback_months: true,
  time_between_rounds_months: true,
  graduation_rate: true,
  round_size_usd: true,
  deal_count: true,
  startup_count: true,
  headcount: true,
  arr_per_employee: true,
  cash_balance_usd: true,
  cac_usd: true,
  ltv_usd: true,
  founded_year: true,
  bm_revenue_multiple_mid: true,
};

// Cache global
const AppData = { market: null, startups: null, merged: null, loaded: false };

// Estado de filtros globales
const AppState = {
  activeTab: 'market-reality',
  filters: {
    country: '', region: '', sector: '',
    round_stage: '', deal_status: '',
  }
};

// Parse CSV con conversión de tipos correcta
async function parseCSVtoArqueroSimple(path) {
  try {
    console.log(`📥 Fetching ${path}...`);
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    console.log(`   Received ${text.length} bytes`);

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          console.log(`📊 Parsed ${path}`);
          console.log(`   Rows: ${results.data.length}`);
          console.log(`   Errors: ${results.errors.length}`);

          if (results.errors.length > 0) {
            console.warn('   Parse warnings:', results.errors.slice(0, 3));
          }

          // Convertir tipos manualmente
          const rows = results.data.map(row => {
            const converted = {};
            for (const [key, value] of Object.entries(row)) {
              // Si es una columna numérica, convertir
              if (NUMERIC_COLUMNS[key]) {
                if (value === '' || value === null || value === undefined) {
                  converted[key] = null;
                } else {
                  const num = parseFloat(value);
                  converted[key] = isNaN(num) ? null : num;
                }
              } else {
                converted[key] = value;
              }
            }
            return converted;
          });

          const table = aq.from(rows);
          console.log(`✅ Created Arquero table: ${table.numRows()} rows, ${table.columnNames().length} cols`);

          if (rows.length > 0) {
            const sample = rows[0];
            console.log(`   Sample row keys:`, Object.keys(sample).slice(0, 10).join(', '));
            console.log(`   Sample numeric check:`, {
              arr_usd: [typeof sample.arr_usd, sample.arr_usd],
              investment_amount_usd: [typeof sample.investment_amount_usd, sample.investment_amount_usd],
              efficiency_score: [typeof sample.efficiency_score, sample.efficiency_score],
            });
          }

          resolve(table);
        },
        error: (error) => {
          console.error(`❌ Parse error for ${path}:`, error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error(`❌ Fetch error for ${path}:`, error);
    throw error;
  }
}

async function loadAllData() {
  const loading = document.getElementById('loading-state');
  if (loading) loading.style.display = 'flex';

  try {
    console.log('🚀 Starting data load...');

    // Cargar los 3 datasets en paralelo
    console.log('\n📥 Loading 3 datasets...');
    const [market, startups, merged] = await Promise.all([
      parseCSVtoArqueroSimple(DATA_PATHS.market),
      parseCSVtoArqueroSimple(DATA_PATHS.startups),
      parseCSVtoArqueroSimple(DATA_PATHS.merged),
    ]);

    AppData.market = market;
    AppData.startups = startups;
    AppData.merged = merged;
    AppData.loaded = true;

    console.log('\n✅ All data loaded successfully!');

    // Resumen de datos
    console.log('\n📊 DATA SUMMARY:');
    console.log(`Market benchmarks: ${AppData.market.numRows()} rows`);
    if (AppData.market.numRows() > 0) {
      const sectors = [...new Set(AppData.market.array('sector').filter(Boolean))];
      const countries = [...new Set(AppData.market.array('country').filter(Boolean))];
      console.log(`  Sectors: ${sectors.length}, Countries: ${countries.length}`);
    }

    console.log(`Startups: ${AppData.startups.numRows()} rows`);
    if (AppData.startups.numRows() > 0) {
      const arrData = AppData.startups.array('arr_usd').filter(v => v != null);
      const arrStats = computeStats(arrData);
      console.log(`  ARR values: ${arrData.length}, Median: ${fmtUSD(arrStats?.median || 0)}`);
    }

    console.log(`Merged/Valuation: ${AppData.merged.numRows()} rows`);
    if (AppData.merged.numRows() > 0) {
      const effData = AppData.merged.array('efficiency_score').filter(v => v != null);
      const effStats = computeStats(effData);
      console.log(`  Efficiency scores: ${effData.length}, Avg: ${effStats?.mean.toFixed(1) || 0}`);
    }

    initDashboard();
  } catch (error) {
    console.error('❌ Error in loadAllData:', error);
    const loading = document.getElementById('loading-state');
    if (loading) {
      loading.innerHTML = `
        <p style="color: #ef4444; font-size: 18px;">⚠️ Error loading data</p>
        <p style="color: #6b7280; font-size: 14px;">${error.message}</p>
        <p style="color: #6b7280; font-size: 12px;">Check browser console (F12) for details</p>
      `;
    }
  }
}

// Pobla todos los <select> de filtros con valores únicos del dataset
function populateFilters() {
  console.log('[data_loader] Populating filters...');

  if (!AppData.market || AppData.market.numRows() === 0) {
    console.warn('⚠️ No market data to populate filters');
    return;
  }

  // Get unique values from market data
  const sectors = [...new Set(AppData.market.array('sector').filter(Boolean))].sort();
  const countries = [...new Set(AppData.market.array('country').filter(Boolean))].sort();
  const regions = [...new Set(AppData.market.array('region').filter(Boolean))].sort();
  const stages = [...new Set(AppData.market.array('round_stage').filter(Boolean))].sort();

  console.log(`  Sectors: ${sectors.length}, Countries: ${countries.length}, Regions: ${regions.length}, Stages: ${stages.length}`);

  // Populate sector select
  const selectSector = document.getElementById('filter-sector');
  if (selectSector) {
    selectSector.innerHTML = '<option value="">All Sectors</option>';
    sectors.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      selectSector.appendChild(opt);
    });
  }

  // Populate country select
  const selectCountry = document.getElementById('filter-country');
  if (selectCountry) {
    selectCountry.innerHTML = '<option value="">All Countries</option>';
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      selectCountry.appendChild(opt);
    });
  }

  // Populate region select
  const selectRegion = document.getElementById('filter-region');
  if (selectRegion) {
    selectRegion.innerHTML = '<option value="">All Regions</option>';
    regions.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      selectRegion.appendChild(opt);
    });
  }

  // Populate stage select
  const selectStage = document.getElementById('filter-stage');
  if (selectStage) {
    selectStage.innerHTML = '<option value="">All Stages</option>';
    stages.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st;
      opt.textContent = st;
      selectStage.appendChild(opt);
    });
  }

  console.log('✅ Filters populated');
}

// Aplicar filtros a una tabla específica
function applyFiltersToTable(table, filters, availableColumns) {
  let filtered = table;

  // Aplicar solo los filtros que existan en el dataset
  if (filters.sector && filters.sector !== '' && availableColumns.includes('sector')) {
    filtered = filtered.filter(aq.escape(d => d.sector === filters.sector));
  }
  if (filters.country && filters.country !== '' && availableColumns.includes('country')) {
    filtered = filtered.filter(aq.escape(d => d.country === filters.country));
  }
  if (filters.region && filters.region !== '' && availableColumns.includes('region')) {
    filtered = filtered.filter(aq.escape(d => d.region === filters.region));
  }
  if (filters.round_stage && filters.round_stage !== '' && availableColumns.includes('round_stage')) {
    filtered = filtered.filter(aq.escape(d => d.round_stage === filters.round_stage));
  }
  if (filters.deal_status && filters.deal_status !== '' && availableColumns.includes('deal_status')) {
    filtered = filtered.filter(aq.escape(d => d.deal_status === filters.deal_status));
  }

  return filtered;
}

function initDashboard() {
  console.log('[data_loader] Initializing dashboard...');

  const loading = document.getElementById('loading-state');
  if (loading) loading.style.display = 'none';

  const main = document.getElementById('app-main');
  if (main) main.style.display = 'block';

  populateFilters();
  renderActiveTab();

  // Last updated
  const lastUpdateEl = document.getElementById('last-updated-indicator');
  if (lastUpdateEl && AppData.startups && AppData.startups.numRows() > 0) {
    try {
      const dates = AppData.startups.array('data_reference_date').filter(d => d && d !== '');
      if (dates.length > 0) {
        const maxDate = new Date(Math.max(...dates.map(d => new Date(d))));
        lastUpdateEl.textContent = `Last updated: ${maxDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
      }
    } catch (error) {
      console.warn('Could not set last_updated:', error);
    }
  }

  console.log('[data_loader] Dashboard ready');
}

function renderActiveTab() {
  const tab = AppState.activeTab;
  const f = AppState.filters;

  console.log(`[render] Tab: ${tab}`);
  console.log(`[render] Active filters:`, f);

  if (tab === 'market-reality' && typeof renderMarketReality !== 'undefined') {
    renderMarketReality(f);
  } else if (tab === 'startup-review' && typeof renderStartupReview !== 'undefined') {
    renderStartupReview(f);
  } else if (tab === 'valuation-layer' && typeof renderValuationLayer !== 'undefined') {
    renderValuationLayer(f);
  } else {
    console.warn('⚠️ No render function for tab:', tab);
  }
}

function exportFilteredData() {
  const tab = AppState.activeTab;
  let data = null;
  let filename = 'export.csv';

  const filters = AppState.filters;

  if (tab === 'market-reality' && AppData.market) {
    const cols = AppData.market.columnNames();
    data = applyFiltersToTable(AppData.market, filters, cols).objects();
    filename = 'market_benchmarks.csv';
  } else if (tab === 'startup-review' && AppData.startups) {
    const cols = AppData.startups.columnNames();
    data = applyFiltersToTable(AppData.startups, filters, cols).objects();
    filename = 'startup_pipeline.csv';
  } else if (tab === 'valuation-layer' && AppData.merged) {
    const cols = AppData.merged.columnNames();
    data = applyFiltersToTable(AppData.merged, filters, cols).objects();
    filename = 'valuation_analysis.csv';
  }

  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
