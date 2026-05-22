// market_reality.js — Capa 1: Market Reality
// Propósito: Visualización de benchmarks del mercado
// Ref: instrucciones_v2 — Sección 14

function renderMarketReality(filters) {
  console.log('[market_reality] Renderizando...');

  // Filtrar datos
  let data = applyFilters(AppData.market);

  // KPIs
  const kpiHtml = `
    ${createKPICard(data.numRows(), 'Total Benchmarks')}
    ${createKPICard(data.column('country').data.filter((v, i, a) => a.indexOf(v) === i).length, 'Countries')}
    ${createKPICard(data.column('sector').data.filter((v, i, a) => a.indexOf(v) === i).length, 'Sectors')}
    ${createKPICard(data.column('source_name').data.filter((v, i, a) => a.indexOf(v) === i).length, 'Sources')}
  `;

  const kpiContainer = document.getElementById('market-kpis');
  if (kpiContainer) kpiContainer.innerHTML = kpiHtml;

  // Chart 1: Investment by Sector
  try {
    const byMet = data.filter(d => d.metric_name === 'investment_amount_usd')
                       .groupby('sector')
                       .rollup({ total: aq.op.sum('metric_value_mid') })
                       .orderby(aq.desc('total'))
                       .objects();

    const trace1 = {
      y: byMet.map(d => d.sector),
      x: byMet.map(d => d.total),
      type: 'bar',
      orientation: 'h',
      marker: { color: byMet.map(d => sectorColor(d.sector)) }
    };

    Plotly.newPlot('chart-investment-sector', [trace1], {
      ...PLOTLY_LAYOUT_BASE,
      title: '',
      xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: 'USD' }
    }, PLOTLY_CONFIG);
  } catch (e) { console.warn('Chart 1 error:', e); }

  // Chart 2: Valuation Range by Stage
  try {
    const byStage = data.filter(d => d.metric_name === 'valuation_pre_money_usd')
                         .groupby('round_stage')
                         .rollup({
                           p10: d => computeStats(d.metric_value_mid.map(parseFloat).filter(isFinite)).p10,
                           p90: d => computeStats(d.metric_value_mid.map(parseFloat).filter(isFinite)).p90,
                           mid: d => computeStats(d.metric_value_mid.map(parseFloat).filter(isFinite)).median
                         })
                         .orderby('round_stage')
                         .objects();

    const stages = byStage.map(d => d.round_stage);
    const trace2 = {
      x: stages,
      y: byStage.map(d => d.mid || 0),
      error_y: {
        type: 'data',
        symmetric: false,
        array: byStage.map(d => (d.p90 || 0) - (d.mid || 0)),
        arrayminus: byStage.map(d => (d.mid || 0) - (d.p10 || 0))
      },
      type: 'bar',
      marker: { color: AIDA_COLORS.accent }
    };

    Plotly.newPlot('chart-valuation-stage', [trace2], {
      ...PLOTLY_LAYOUT_BASE,
      title: '',
      yaxis: { ...PLOTLY_LAYOUT_BASE.yaxis, title: 'USD (P10-P90)' }
    }, PLOTLY_CONFIG);
  } catch (e) { console.warn('Chart 2 error:', e); }

  // Chart 3: Revenue Multiples by Sector
  try {
    const byMult = data.filter(d => d.metric_name === 'revenue_multiple')
                        .groupby('sector', 'round_stage')
                        .rollup({ avg: aq.op.avg('metric_value_mid') })
                        .objects();

    const sectors = [...new Set(byMult.map(d => d.sector))];
    const stages = [...new Set(byMult.map(d => d.round_stage))];

    const traces3 = stages.map((stage, idx) => {
      const stageData = byMult.filter(d => d.round_stage === stage);
      return {
        x: stageData.map(d => d.sector),
        y: stageData.map(d => d.avg || 0),
        name: stage,
        type: 'bar'
      };
    });

    Plotly.newPlot('chart-multiples-sector', traces3, {
      ...PLOTLY_LAYOUT_BASE,
      barmode: 'group',
      yaxis: { ...PLOTLY_LAYOUT_BASE.yaxis, title: 'Multiple (x)' }
    }, PLOTLY_CONFIG);
  } catch (e) { console.warn('Chart 3 error:', e); }

  // Chart 4: Time Between Rounds
  try {
    const byTime = data.filter(d => d.metric_name === 'time_between_rounds_months')
                        .groupby('round_stage')
                        .rollup({ avg: aq.op.avg('metric_value_mid') })
                        .orderby('round_stage')
                        .objects();

    const trace4 = {
      x: byTime.map(d => d.round_stage),
      y: byTime.map(d => d.avg || 0),
      type: 'bar',
      marker: { color: AIDA_COLORS.accent }
    };

    Plotly.newPlot('chart-time-rounds', [trace4], {
      ...PLOTLY_LAYOUT_BASE,
      yaxis: { ...PLOTLY_LAYOUT_BASE.yaxis, title: 'Months' }
    }, PLOTLY_CONFIG);
  } catch (e) { console.warn('Chart 4 error:', e); }

  // Chart 5: Graduation Rates
  try {
    const byGrad = data.filter(d => d.metric_name === 'graduation_rate')
                        .groupby('round_stage')
                        .rollup({ avg: aq.op.avg('metric_value_mid') })
                        .orderby('round_stage')
                        .objects();

    const trace5 = {
      y: byGrad.map(d => d.round_stage),
      x: byGrad.map(d => (d.avg || 0) * 100),
      type: 'bar',
      orientation: 'h',
      marker: { color: AIDA_COLORS.accent }
    };

    Plotly.newPlot('chart-graduation', [trace5], {
      ...PLOTLY_LAYOUT_BASE,
      xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: 'Rate (%)' }
    }, PLOTLY_CONFIG);
  } catch (e) { console.warn('Chart 5 error:', e); }

  // Chart 6: Temporal Evolution (placeholder)
  try {
    const byDate = data.filter(d => d.metric_name === 'growth_yoy')
                        .groupby('data_reference_date')
                        .rollup({ avg: aq.op.avg('metric_value_mid') })
                        .orderby('data_reference_date')
                        .objects();

    if (byDate.length > 1) {
      const trace6 = {
        x: byDate.map(d => d.data_reference_date),
        y: byDate.map(d => d.avg || 0),
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: AIDA_COLORS.accent, width: 2 },
        marker: { size: 6 }
      };

      Plotly.newPlot('chart-temporal', [trace6], {
        ...PLOTLY_LAYOUT_BASE,
        yaxis: { ...PLOTLY_LAYOUT_BASE.yaxis, title: 'Growth YoY (%)' }
      }, PLOTLY_CONFIG);
    }
  } catch (e) { console.warn('Chart 6 error:', e); }

  console.log('[market_reality] Renderizado completado');
}
