// valuation_layer.js — Layer 3: Valuation Layer
// Ref: instrucciones_v2 — Sección 16

async function renderValuationLayer(filters) {
    if (!AppData.merged || AppData.merged.numRows() === 0) {
        console.warn('⚠️ Merged valuation data is empty');
        return;
    }

    let table = AppData.merged;

    // Filtros
    if (filters.sector && filters.sector !== '') {
        table = table.filter(aq.escape(d => d.sector === filters.sector));
    }
    if (filters.valuation_signal && filters.valuation_signal !== '') {
        table = table.filter(aq.escape(d => d.valuation_signal === filters.valuation_signal));
    }

    if (table.numRows() === 0) {
        table = AppData.merged;
    }

    // KPI Cards
    const cheapCount = table.filter(aq.escape(d => d.valuation_signal === 'cheap')).numRows();
    const fairCount = table.filter(aq.escape(d => d.valuation_signal === 'fair')).numRows();
    const expensiveCount = table.filter(aq.escape(d => d.valuation_signal === 'expensive')).numRows();
    const avgAttractiveness = computeStats(table.array('relative_attractiveness_score').filter(v => v != null)).mean || 0;

    document.getElementById('valuation-kpis').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-value" style="color: var(--color-cheap);">${cheapCount}</div>
            <div class="kpi-label">Cheap Deals</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value" style="color: var(--color-fair);">${fairCount}</div>
            <div class="kpi-label">Fair Value</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value" style="color: var(--color-expensive);">${expensiveCount}</div>
            <div class="kpi-label">Expensive</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${Math.round(avgAttractiveness)}</div>
            <div class="kpi-label">Avg Attractiveness</div>
        </div>
    `;

    // Tabla de señales de valuación
    const paginationSize = 50;
    const paginated = table.slice(0, paginationSize);

    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Startup</th>
                    <th>Sector</th>
                    <th>Entry Multiple</th>
                    <th>Benchmark Multiple</th>
                    <th>Signal</th>
                    <th>Match Quality</th>
                    <th>Attractiveness</th>
                </tr>
            </thead>
            <tbody>
                ${paginated.objects().map(row => `
                    <tr>
                        <td><strong>${row.startup_name || ''}</strong></td>
                        <td>${row.sector || ''}</td>
                        <td>${fmtMultiple(row.entry_multiple || 0)}</td>
                        <td>${fmtMultiple(row.bm_revenue_multiple_mid || 0)}</td>
                        <td>${signalBadge(row.valuation_signal)}</td>
                        <td>${matchBadge(row.benchmark_match_quality, row.benchmark_match_level)}</td>
                        <td>${Math.round(row.relative_attractiveness_score || 0)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('table-valuation').innerHTML = tableHTML;

    // Chart: Growth vs Entry Multiple (Scatter con colores de signal)
    const filtered = table.filter(aq.escape(d => d.growth_yoy != null && d.entry_multiple != null));
    const growths = filtered.array('growth_yoy');
    const multiples = filtered.array('entry_multiple');
    const signals = filtered.array('valuation_signal');
    const names = filtered.array('startup_name');

    const colorMap = {
        'cheap': AIDA_COLORS.cheap,
        'fair': AIDA_COLORS.fair,
        'expensive': AIDA_COLORS.expensive,
        'no_benchmark': AIDA_COLORS.noBenchmark,
    };

    if (filtered.numRows() > 0) {
        Plotly.newPlot('chart-growth-multiple', [{
            type: 'scatter',
            mode: 'markers',
            x: multiples,
            y: growths,
            marker: {
                size: 8,
                color: signals.map(s => colorMap[s] || AIDA_COLORS.noBenchmark),
                opacity: 0.8,
            },
            text: names,
            hovertemplate: '<b>%{text}</b><br>Entry Multiple: %{x:.2f}x<br>Growth: %{y:.0%}<extra></extra>'
        }], {
            ...PLOTLY_LAYOUT_BASE,
            xaxis: { title: 'Entry Multiple (x)' },
            yaxis: { title: 'Growth YoY (%)' },
        }, PLOTLY_CONFIG);
    }

    // Chart: Price-Performance Matrix (2x2 Quadrant)
    const medianMultiple = computeStats(multiples).median;
    const medianGrowth = computeStats(growths).median;

    if (filtered.numRows() > 0 && medianMultiple && medianGrowth) {
        Plotly.newPlot('chart-ppm', [{
            type: 'scatter',
            mode: 'markers',
            x: multiples,
            y: growths,
            marker: {
                size: 8,
                color: signals.map(s => colorMap[s] || AIDA_COLORS.noBenchmark),
                opacity: 0.8,
            },
            text: names,
        }], {
            ...PLOTLY_LAYOUT_BASE,
            xaxis: {
                title: 'Entry Multiple (x)',
                zeroline: true,
                showline: true,
                linewidth: 1,
                linecolor: '#ccc',
            },
            yaxis: {
                title: 'Growth YoY (%)',
                zeroline: true,
                showline: true,
                linewidth: 1,
                linecolor: '#ccc',
            },
            shapes: [
                {
                    type: 'line',
                    x0: medianMultiple, x1: medianMultiple,
                    y0: Math.min(...growths), y1: Math.max(...growths),
                    line: { color: '#ccc', width: 1, dash: 'dash' }
                },
                {
                    type: 'line',
                    x0: Math.min(...multiples), x1: Math.max(...multiples),
                    y0: medianGrowth, y1: medianGrowth,
                    line: { color: '#ccc', width: 1, dash: 'dash' }
                }
            ],
        }, PLOTLY_CONFIG);
    }

    // Chart: Relative Attractiveness Ranking
    const topAttractiveness = table
        .filter(aq.escape(d => d.relative_attractiveness_score != null))
        .orderby(aq.desc('relative_attractiveness_score'))
        .limit(15);

    if (topAttractiveness.numRows() > 0) {
        Plotly.newPlot('chart-attractiveness', [{
            type: 'bar',
            x: topAttractiveness.array('relative_attractiveness_score'),
            y: topAttractiveness.array('startup_name'),
            orientation: 'h',
            marker: { color: AIDA_COLORS.accent },
            text: topAttractiveness.array('relative_attractiveness_score').map(v => Math.round(v)),
            textposition: 'outside',
        }], {
            ...PLOTLY_LAYOUT_BASE,
            xaxis: { title: 'Attractiveness Score (0-100)' },
            margin: { l: 200, r: 80, t: 30, b: 50 }
        }, PLOTLY_CONFIG);
    }

    // Chart: Efficiency Score Breakdown (Stacked Bar)
    const topEfficiency = table
        .filter(aq.escape(d => d.efficiency_score != null))
        .orderby(aq.desc('efficiency_score'))
        .limit(10);

    if (topEfficiency.numRows() > 0) {
        Plotly.newPlot('chart-efficiency', [{
            type: 'bar',
            x: topEfficiency.array('startup_name'),
            y: topEfficiency.array('efficiency_score'),
            marker: { color: AIDA_COLORS.accent },
            text: topEfficiency.array('efficiency_score').map(v => Math.round(v)),
            textposition: 'outside',
        }], {
            ...PLOTLY_LAYOUT_BASE,
            yaxis: { title: 'Efficiency Score (0-100)' },
            xaxis: { title: 'Startup' },
            margin: { b: 100 }
        }, PLOTLY_CONFIG);
    }
}
