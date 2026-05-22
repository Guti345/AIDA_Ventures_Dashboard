// data_loader.js — Carga y cacheo de los 3 CSVs como tablas Arquero
// Ref: instrucciones_v2 — Sección 3

const DATA_PATHS = {
  market:   'data/processed/market_benchmark_layer.csv',
  startups: 'data/processed/startup_deal_layer.csv',
  merged:   'data/processed/merged_valuation_layer.csv',
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

async function loadAllData() {
  const loading = document.getElementById('loading-state');
  if (loading) loading.style.display = 'flex';

  try {
    console.log('[data_loader] Cargando datos...');

    AppData.market = await parseCSVtoArquero(DATA_PATHS.market);
    AppData.startups = await parseCSVtoArquero(DATA_PATHS.startups);
    AppData.merged = await parseCSVtoArquero(DATA_PATHS.merged);

    // 🔍 DEBUG: Imprimir información sobre los datos cargados
    console.log('=== DATA LOADED ===');
    console.log('Market benchmarks:', {
      rows: AppData.market.numRows(),
      columns: AppData.market.columnNames(),
      sample: AppData.market.slice(0, 3).objects(),
      nullCounts: {
        metric_value_mid: AppData.market.filter(aq.escape(d => d.metric_value_mid == null)).numRows(),
        sector: AppData.market.filter(aq.escape(d => d.sector == null)).numRows(),
        country: AppData.market.filter(aq.escape(d => d.country == null)).numRows(),
      }
    });
    console.log('Startups:', {
      rows: AppData.startups.numRows(),
      columns: AppData.startups.columnNames(),
      sample: AppData.startups.slice(0, 3).objects(),
    });
    console.log('Merged:', {
      rows: AppData.merged.numRows(),
      columns: AppData.merged.columnNames(),
      sample: AppData.merged.slice(0, 3).objects(),
    });

    // Verificar que hay datos en columnas críticas
    const marketSectorUnique = AppData.market.groupby('sector').count();
    console.log('Sectores únicos en market:', marketSectorUnique.objects());

    AppData.loaded = true;
    initDashboard();
  } catch (error) {
    console.error('❌ Error loading data:', error);
    const loading = document.getElementById('loading-state');
    if (loading) {
      loading.innerHTML = `<p style="color: #ef4444;">Error loading data. Check console.</p>`;
    }
  }
}

// Parsea CSV con Papa y retorna tabla Arquero
async function parseCSVtoArquero(path) {
  return new Promise((resolve, reject) => {
    Papa.parse(path, {
      header: true,
      download: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const table = aq.from(results.data);
          resolve(table);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

// Pobla todos los <select> de filtros con valores únicos del dataset
function populateFilters() {
  console.log('[data_loader] Populando filtros...');

  const filters = {
    'filter-sector':      AppData.startups.column('sector').data,
    'filter-country':     AppData.startups.column('country').data,
    'filter-region':      AppData.startups.column('region').data,
    'filter-stage':       AppData.startups.column('round_stage').data,
    'filter-deal-status': AppData.startups.column('deal_status').data,
  };

  for (const [selectId, values] of Object.entries(filters)) {
    const select = document.getElementById(selectId);
    if (!select) continue;

    const unique = [...new Set(values)].filter(v => v && v !== '').sort();

    const existing = Array.from(select.options).map(o => o.value);
    unique.forEach(val => {
      if (!existing.includes(val)) {
        const option = document.createElement('option');
        option.value = val;
        option.textContent = val;
        select.appendChild(option);
      }
    });
  }
}

// Aplicar filtros y retornar tabla filtrada
function applyFilters(table) {
  let filtered = table;

  if (AppState.filters.sector) {
    filtered = filtered.filter(aq.escape(d => d.sector === AppState.filters.sector));
  }
  if (AppState.filters.country) {
    filtered = filtered.filter(aq.escape(d => d.country === AppState.filters.country));
  }
  if (AppState.filters.region) {
    filtered = filtered.filter(aq.escape(d => d.region === AppState.filters.region));
  }
  if (AppState.filters.round_stage) {
    filtered = filtered.filter(aq.escape(d => d.round_stage === AppState.filters.round_stage));
  }
  if (AppState.filters.deal_status) {
    filtered = filtered.filter(aq.escape(d => d.deal_status === AppState.filters.deal_status));
  }

  return filtered;
}

function initDashboard() {
  console.log('[data_loader] Inicializando dashboard...');

  const loading = document.getElementById('loading-state');
  if (loading) loading.style.display = 'none';

  const main = document.getElementById('app-main');
  if (main) main.style.display = 'block';

  populateFilters();
  renderActiveTab();

  // Last updated
  const lastUpdateEl = document.getElementById('last-updated-indicator');
  if (lastUpdateEl && AppData.startups) {
    try {
      const dates = AppData.startups.column('last_updated').data.filter(d => d);
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

  console.log(`[render] Tab: ${tab}, Filters:`, f);

  if (tab === 'market-reality' && typeof renderMarketReality !== 'undefined') {
    renderMarketReality(f);
  } else if (tab === 'startup-review' && typeof renderStartupReview !== 'undefined') {
    renderStartupReview(f);
  } else if (tab === 'valuation-layer' && typeof renderValuationLayer !== 'undefined') {
    renderValuationLayer(f);
  }
}

function exportFilteredData() {
  const tab = AppState.activeTab;
  let data = null;
  let filename = 'export.csv';

  if (tab === 'market-reality') {
    data = applyFilters(AppData.market).objects();
    filename = 'market_benchmarks.csv';
  } else if (tab === 'startup-review') {
    data = applyFilters(AppData.startups).objects();
    filename = 'startup_pipeline.csv';
  } else if (tab === 'valuation-layer') {
    data = applyFilters(AppData.merged).objects();
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
