// utils.js — Utilidades compartidas
// Ref: instrucciones_v2 — Secciones 9, 10, 11

const AIDA_COLORS = {
  accent:      '#134E97',
  cheap:       '#22C55E',
  fair:        '#EAB308',
  expensive:   '#EF4444',
  noBenchmark: '#6B7280',
  sectors: {
    saas:        '#134E97',
    fintech:     '#0EA5E9',
    logtech:     '#8B5CF6',
    healthtech:  '#10B981',
    edtech:      '#F59E0B',
    all_sectors: '#6B7280',
    other:       '#9CA3AF',
  }
};

// Plotly layout base para dark mode
const PLOTLY_LAYOUT_BASE = {
  paper_bgcolor: 'transparent',
  plot_bgcolor:  'transparent',
  font:          { color: '#8A8F98', family: 'Inter, sans-serif', size: 12 },
  xaxis:         { gridcolor: '#1E2A3A', zerolinecolor: '#1E2A3A',
                   tickfont: { color: '#8A8F98' } },
  yaxis:         { gridcolor: '#1E2A3A', zerolinecolor: '#1E2A3A',
                   tickfont: { color: '#8A8F98' } },
  margin:        { t: 30, r: 20, b: 50, l: 60 },
  showlegend:    false,
  hoverlabel:    { bgcolor: '#132139', font: { color: '#fff', size: 12 } },
};

const PLOTLY_CONFIG = { responsive: true, displayModeBar: false };

// Formatters
function fmtUSD(val, decimals = 1) {
  if (!isFinite(val) || val === null) return '—';
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) return '$' + (val / 1_000_000_000).toFixed(decimals) + 'B';
  if (abs >= 1_000_000) return '$' + (val / 1_000_000).toFixed(decimals) + 'M';
  if (abs >= 1_000) return '$' + (val / 1_000).toFixed(decimals) + 'K';
  return '$' + val.toFixed(decimals);
}

function fmtPct(val, decimals = 1) {
  if (!isFinite(val) || val === null) return '—';
  return (val * 100).toFixed(decimals) + '%';
}

function fmtPctDirect(val, decimals = 1) {
  if (!isFinite(val) || val === null) return '—';
  return val.toFixed(decimals) + '%';
}

function fmtMultiple(val) {
  if (!isFinite(val) || val === null) return '—';
  return val.toFixed(1) + 'x';
}

function fmtMonths(val) {
  if (!isFinite(val) || val === null) return '—';
  return Math.round(val) + 'mo';
}

function fmtNumber(val, decimals = 0) {
  if (!isFinite(val) || val === null) return '—';
  return val.toFixed(decimals);
}

// Calcula P10, P90, media, mediana de un array de números
function computeStats(arr) {
  const filtered = arr.filter(x => x !== null && x !== undefined && isFinite(x)).sort((a, b) => a - b);
  if (filtered.length === 0) return null;

  const n = filtered.length;
  const sum = filtered.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = n % 2 === 0 ? (filtered[n/2 - 1] + filtered[n/2]) / 2 : filtered[Math.floor(n/2)];
  const p10_idx = Math.ceil(n * 0.1) - 1;
  const p90_idx = Math.ceil(n * 0.9) - 1;

  const variance = filtered.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return {
    mean: mean,
    median: median,
    p10: filtered[Math.max(0, p10_idx)],
    p90: filtered[Math.min(n - 1, p90_idx)],
    min: filtered[0],
    max: filtered[n - 1],
    count: n,
    stdDev: stdDev
  };
}

// Señal de valuación → color CSS
function signalColor(signal) {
  const map = {
    cheap:        AIDA_COLORS.cheap,
    fair:         AIDA_COLORS.fair,
    expensive:    AIDA_COLORS.expensive,
    no_benchmark: AIDA_COLORS.noBenchmark
  };
  return map[signal] || AIDA_COLORS.noBenchmark;
}

// Badge HTML para señal de valuación
function signalBadge(signal) {
  const labels = {
    cheap:        'Cheap',
    fair:         'Fair',
    expensive:    'Expensive',
    no_benchmark: 'No Benchmark'
  };
  const classes = {
    cheap:        'badge-cheap',
    fair:         'badge-fair',
    expensive:    'badge-expensive',
    no_benchmark: 'badge-no-match'
  };
  return `<span class="badge ${classes[signal] || 'badge-no-match'}">${labels[signal] || 'Unknown'}</span>`;
}

// Badge HTML para match quality
function matchBadge(quality, level) {
  const classes = {
    high:        'badge-match-high',
    medium:      'badge-match-medium',
    low:         'badge-match-low',
    no_match:    'badge-no-match'
  };
  const label = level ? `${quality.toUpperCase()} (L${level})` : quality.toUpperCase();
  return `<span class="badge ${classes[quality] || 'badge-no-match'}">${label}</span>`;
}

// Obtener color por sector
function sectorColor(sector) {
  return AIDA_COLORS.sectors[sector] || AIDA_COLORS.sectors.other;
}

// Formatear fecha
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Crear KPI card HTML
function createKPICard(value, label) {
  return `
    <div class="kpi-card">
      <div class="kpi-value">${value}</div>
      <div class="kpi-label">${label}</div>
    </div>
  `;
}

// Crear tabla HTML desde Arquero table
function createTableHTML(arqTable, columns, className = 'data-table') {
  if (!arqTable || arqTable.numRows() === 0) {
    return '<p>No data available</p>';
  }

  let html = `<table class="${className}"><thead><tr>`;
  columns.forEach(col => {
    html += `<th>${col.label || col}</th>`;
  });
  html += '</tr></thead><tbody>';

  const data = arqTable.objects();
  data.forEach(row => {
    html += '<tr>';
    columns.forEach(col => {
      const key = col.key || col;
      let val = row[key];

      if (col.format) {
        val = col.format(val);
      } else if (typeof val === 'number') {
        val = val.toFixed(2);
      }

      html += `<td>${val || '—'}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
