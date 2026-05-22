// startup_review.js — Capa 2: Startup Review
// Propósito: Análisis del pipeline de startups
// Ref: instrucciones_v2 — Sección 15

function renderStartupReview(filters) {
  console.log('[startup_review] Renderizando...');

  let data = applyFilters(AppData.startups);

  // KPIs
  const stats = {
    arr_median: computeStats(data.column('arr_usd').data.map(parseFloat).filter(isFinite)),
    growth_median: computeStats(data.column('growth_yoy').data.map(parseFloat).filter(isFinite)),
    burn_median: computeStats(data.column('burn_rate_usd').data.map(parseFloat).filter(isFinite)),
    runway_avg: computeStats(data.column('runway_months').data.map(parseFloat).filter(isFinite))
  };

  const kpiHtml = `
    ${createKPICard(fmtUSD(stats.arr_median?.median), 'Median ARR')}
    ${createKPICard(fmtPctDirect(stats.growth_median?.median), 'Median Growth YoY')}
    ${createKPICard(fmtUSD(stats.burn_median?.median), 'Median Burn')}
    ${createKPICard(fmtMonths(stats.runway_avg?.median), 'Median Runway')}
  `;

  const kpiContainer = document.getElementById('startup-kpis');
  if (kpiContainer) kpiContainer.innerHTML = kpiHtml;

  // Tabla de startups
  try {
    const tableData = data.select([
      'startup_name', 'sector', 'round_stage', 'country',
      'arr_usd', 'growth_yoy', 'gross_margin', 'burn_rate_usd',
      'runway_months', 'ltv_cac_ratio', 'deal_status'
    ]).orderby(aq.desc('arr_usd'));

    const columns = [
      { key: 'startup_name', label: 'Startup', format: v => v || '—' },
      { key: 'sector', label: 'Sector', format: v => v || '—' },
      { key: 'round_stage', label: 'Stage', format: v => v || '—' },
      { key: 'country', label: 'Country', format: v => v || '—' },
      { key: 'arr_usd', label: 'ARR', format: v => fmtUSD(parseFloat(v)) },
      { key: 'growth_yoy', label: 'Growth YoY', format: v => fmtPctDirect(parseFloat(v)) },
      { key: 'gross_margin', label: 'GM', format: v => fmtPctDirect(parseFloat(v)) },
      { key: 'burn_rate_usd', label: 'Burn', format: v => fmtUSD(parseFloat(v)) },
      { key: 'runway_months', label: 'Runway', format: v => fmtMonths(parseFloat(v)) },
      { key: 'ltv_cac_ratio', label: 'LTV/CAC', format: v => fmtNumber(parseFloat(v), 2) },
      { key: 'deal_status', label: 'Status', format: v => v || '—' }
    ];

    const tableHtml = createTableHTML(tableData, columns);
    const tableContainer = document.getElementById('table-startups');
    if (tableContainer) {
      tableContainer.innerHTML = tableHtml;
      // Agregar event listeners para filas
      const rows = tableContainer.querySelectorAll('tbody tr');
      rows.forEach((row, idx) => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
          const rowData = tableData.objects()[idx];
          showStartupDetail(rowData);
        });
      });
    }
  } catch (e) { console.warn('Table error:', e); }

  // Chart 1: ARR Distribution (Histogram)
  try {
    const arrValues = data.column('arr_usd').data.map(parseFloat).filter(isFinite).sort((a, b) => a - b);

    if (arrValues.length > 0) {
      const trace1 = {
        x: arrValues,
        type: 'histogram',
        nbinsx: 15,
        marker: { color: AIDA_COLORS.accent }
      };

      Plotly.newPlot('chart-arr-dist', [trace1], {
        ...PLOTLY_LAYOUT_BASE,
        title: '',
        xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: 'ARR (USD)' }
      }, PLOTLY_CONFIG);
    }
  } catch (e) { console.warn('Chart ARR Dist error:', e); }

  // Chart 2: Growth vs Burn Multiple (Scatter)
  try {
    const scatter = data.filter(d => isFinite(parseFloat(d.burn_multiple)) && isFinite(parseFloat(d.growth_yoy)))
                         .objects();

    const trace2 = {
      x: scatter.map(d => parseFloat(d.burn_multiple) || 0),
      y: scatter.map(d => parseFloat(d.growth_yoy) || 0),
      mode: 'markers',
      type: 'scatter',
      marker: {
        size: scatter.map(d => Math.min(30, Math.max(5, Math.log10(parseFloat(d.arr_usd) || 1)))),
        color: scatter.map(d => sectorColor(d.sector)),
        opacity: 0.7
      },
      text: scatter.map(d => `${d.startup_name}<br>${d.sector}`),
      hovertemplate: '%{text}<br>Burn Multiple: %{x:.2f}<br>Growth: %{y:.1f}%<extra></extra>'
    };

    Plotly.newPlot('chart-growth-burn', [trace2], {
      ...PLOTLY_LAYOUT_BASE,
      xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: 'Burn Multiple' },
      yaxis: { ...PLOTLY_LAYOUT_BASE.yaxis, title: 'Growth YoY (%)' }
    }, PLOTLY_CONFIG);
  } catch (e) { console.warn('Chart Growth Burn error:', e); }

  // Chart 3: ARR Ranking
  try {
    const top = data.orderby(aq.desc('arr_usd')).slice(0, 15).objects();

    const trace3 = {
      y: top.map(d => d.startup_name),
      x: top.map(d => parseFloat(d.arr_usd) || 0),
      type: 'bar',
      orientation: 'h',
      marker: { color: top.map(d => sectorColor(d.sector)) }
    };

    Plotly.newPlot('chart-arr-ranking', [trace3], {
      ...PLOTLY_LAYOUT_BASE,
      title: '',
      xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: 'ARR (USD)' }
    }, PLOTLY_CONFIG);
  } catch (e) { console.warn('Chart ARR Ranking error:', e); }

  console.log('[startup_review] Renderizado completado');
}

function showStartupDetail(startup) {
  console.log('[startup_detail] Mostrar:', startup.startup_name);

  const panel = document.getElementById('startup-detail-panel');
  if (!panel) return;

  let html = `
    <button class="detail-close" onclick="closeStartupDetail()">×</button>
    <h3>${startup.startup_name}</h3>
    <div style="margin-top: 20px;">
      <p><strong>Sector:</strong> ${startup.sector || '—'}</p>
      <p><strong>Stage:</strong> ${startup.round_stage || '—'}</p>
      <p><strong>Country:</strong> ${startup.country || '—'}</p>
      <p><strong>Status:</strong> ${startup.deal_status || '—'}</p>
      <hr style="border-color: var(--color-border);">
      <p><strong>ARR:</strong> ${fmtUSD(parseFloat(startup.arr_usd))}</p>
      <p><strong>Growth YoY:</strong> ${fmtPctDirect(parseFloat(startup.growth_yoy))}</p>
      <p><strong>Burn Rate:</strong> ${fmtUSD(parseFloat(startup.burn_rate_usd))}</p>
      <p><strong>Runway:</strong> ${fmtMonths(parseFloat(startup.runway_months))}</p>
      <p><strong>Gross Margin:</strong> ${fmtPctDirect(parseFloat(startup.gross_margin))}</p>
      <p><strong>LTV/CAC:</strong> ${fmtNumber(parseFloat(startup.ltv_cac_ratio), 2)}</p>
      <p><strong>Headcount:</strong> ${startup.headcount || '—'}</p>
      <p><strong>Founded:</strong> ${startup.founded_year || '—'}</p>
    </div>
  `;

  panel.innerHTML = html;
  panel.classList.add('active');
  panel.classList.remove('hidden');
}

function closeStartupDetail() {
  const panel = document.getElementById('startup-detail-panel');
  if (panel) {
    panel.classList.remove('active');
    panel.classList.add('hidden');
  }
}
