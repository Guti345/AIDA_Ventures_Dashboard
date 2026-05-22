// valuation_layer.js — Capa 3: Valuation Layer
// Propósito: Análisis de valuación y scores de atractivo
// Ref: instrucciones_v2 — Sección 16

function renderValuationLayer(filters) {
  console.log('[valuation_layer] Renderizando...');

  let data = applyFilters(AppData.merged);

  // KPIs
  const signals = data.column('valuation_signal').data;
  const cheap = signals.filter(s => s === 'cheap').length;
  const fair = signals.filter(s => s === 'fair').length;
  const expensive = signals.filter(s => s === 'expensive').length;
  const noBench = signals.filter(s => s === 'no_benchmark').length;

  const attractStats = computeStats(data.column('relative_attractiveness_score').data.map(parseFloat).filter(isFinite));

  const kpiHtml = `
    ${createKPICard(cheap, 'Cheap Deals')}
    ${createKPICard(fair, 'Fair Value')}
    ${createKPICard(expensive, 'Expensive')}
    ${createKPICard(attractStats?.median?.toFixed(1) || '—', 'Avg Attractiveness')}
  `;

  const kpiContainer = document.getElementById('valuation-kpis');
  if (kpiContainer) kpiContainer.innerHTML = kpiHtml;

  // Tabla de valuación
  try {
    const tableData = data.select([
      'startup_name', 'sector', 'round_stage',
      'entry_multiple', 'bm_revenue_multiple_mid', 'multiple_gap',
      'valuation_signal', 'benchmark_match_quality'
    ]).orderby(aq.desc('relative_attractiveness_score'));

    const columns = [
      { key: 'startup_name', label: 'Startup', format: v => v || '—' },
      { key: 'sector', label: 'Sector', format: v => v || '—' },
      { key: 'round_stage', label: 'Stage', format: v => v || '—' },
      { key: 'entry_multiple', label: 'Entry Multiple', format: v => fmtMultiple(parseFloat(v)) },
      { key: 'bm_revenue_multiple_mid', label: 'Benchmark', format: v => fmtMultiple(parseFloat(v)) },
      { key: 'multiple_gap', label: 'Gap', format: v => fmtMultiple(parseFloat(v)) },
      { key: 'valuation_signal', label: 'Signal', format: v => signalBadge(v) },
      { key: 'benchmark_match_quality', label: 'Match Quality', format: v => matchBadge(v) }
    ];

    const tableHtml = createTableHTML(tableData, columns);
    const tableContainer = document.getElementById('table-valuation');
    if (tableContainer) tableContainer.innerHTML = tableHtml;
  } catch (e) { console.warn('Valuation table error:', e); }

  // Chart 1: Growth vs Entry Multiple
  try {
    const scatter = data.filter(d => isFinite(parseFloat(d.entry_multiple)) && isFinite(parseFloat(d.growth_yoy)))
                         .objects();

    const signalColors = scatter.map(d => signalColor(d.valuation_signal));

    const trace1 = {
      x: scatter.map(d => parseFloat(d.entry_multiple) || 0),
      y: scatter.map(d => parseFloat(d.growth_yoy) || 0),
      mode: 'markers',
      type: 'scatter',
      marker: {
        size: 8,
        color: signalColors,
        opacity: 0.7,
        line: { width: 1, color: 'white' }
      },
      text: scatter.map(d => `${d.startup_name}<br>Signal: ${d.valuation_signal}`),
      hovertemplate: '%{text}<br>Multiple: %{x:.2f}x<br>Growth: %{y:.1f}%<extra></extra>'
    };

    Plotly.newPlot('chart-growth-multiple', [trace1], {
      ...PLOTLY_LAYOUT_BASE,
      xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: 'Entry Multiple (x)' },
      yaxis: { ...PLOTLY_LAYOUT_BASE.yaxis, title: 'Growth YoY (%)' }
    }, PLOTLY_CONFIG);
  } catch (e) { console.warn('Chart Growth Multiple error:', e); }

  // Chart 2: Price-Performance Matrix
  try {
    const matrixData = data.filter(d => isFinite(parseFloat(d.entry_multiple)) && isFinite(parseFloat(d.growth_yoy)))
                           .objects();

    const multiples = matrixData.map(d => parseFloat(d.entry_multiple) || 0);
    const growth = matrixData.map(d => parseFloat(d.growth_yoy) || 0);
    const medianMult = computeStats(multiples)?.median || 5;
    const medianGrowth = computeStats(growth)?.median || 100;

    const trace2 = {
      x: multiples,
      y: growth,
      mode: 'markers',
      type: 'scatter',
      marker: {
        size: 8,
        color: matrixData.map(d => signalColor(d.valuation_signal)),
        opacity: 0.7
      },
      text: matrixData.map(d => d.startup_name),
      hovertemplate: '%{text}<br>Multiple: %{x:.2f}x<br>Growth: %{y:.1f}%<extra></extra>'
    };

    Plotly.newPlot('chart-ppm', [trace2], {
      ...PLOTLY_LAYOUT_BASE,
      shapes: [
        { type: 'line', x0: medianMult, x1: medianMult, y0: 0, y1: 400, line: { color: '#666', dash: 'dash' } },
        { type: 'line', x0: 0, x1: 20, y0: medianGrowth, y1: medianGrowth, line: { color: '#666', dash: 'dash' } }
      ],
      xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: 'Entry Multiple (x)' },
      yaxis: { ...PLOTLY_LAYOUT_BASE.yaxis, title: 'Growth YoY (%)' }
    }, PLOTLY_CONFIG);
  } catch (e) { console.warn('Chart PPM error:', e); }

  // Chart 3: Attractiveness Ranking
  try {
    const top = data.filter(d => isFinite(parseFloat(d.relative_attractiveness_score)))
                     .orderby(aq.desc('relative_attractiveness_score'))
                     .slice(0, 20)
                     .objects();

    const trace3 = {
      y: top.map(d => d.startup_name),
      x: top.map(d => parseFloat(d.relative_attractiveness_score) || 0),
      type: 'bar',
      orientation: 'h',
      marker: { color: top.map(d => signalColor(d.valuation_signal)) }
    };

    Plotly.newPlot('chart-attractiveness', [trace3], {
      ...PLOTLY_LAYOUT_BASE,
      title: '',
      xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: 'Attractiveness Score (0-100)' }
    }, PLOTLY_CONFIG);
  } catch (e) { console.warn('Chart Attractiveness error:', e); }

  // Chart 4: Efficiency Score Breakdown
  try {
    const top10 = data.filter(d => isFinite(parseFloat(d.efficiency_score)))
                       .orderby(aq.desc('efficiency_score'))
                       .slice(0, 10)
                       .objects();

    const trace4 = {
      y: top10.map(d => d.startup_name),
      x: top10.map(d => parseFloat(d.efficiency_score) || 0),
      type: 'bar',
      orientation: 'h',
      marker: { color: AIDA_COLORS.accent }
    };

    Plotly.newPlot('chart-efficiency', [trace4], {
      ...PLOTLY_LAYOUT_BASE,
      title: '',
      xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: 'Efficiency Score (0-100)' }
    }, PLOTLY_CONFIG);
  } catch (e) { console.warn('Chart Efficiency error:', e); }

  console.log('[valuation_layer] Renderizado completado');
}
