// valuation_layer.js — Layer 3: Valuation Layer

async function renderValuationLayer(filters) {
    console.log('🔍 [valuation_layer] Starting render with filters:', filters);

    if (!AppData.merged || AppData.merged.numRows() === 0) {
        console.warn('⚠️ Merged valuation data is empty');
        document.getElementById('valuation-kpis').innerHTML = '<p style="padding: 20px; color: #ef4444;">No valuation data available</p>';
        return;
    }

    let table = AppData.merged;
    console.log('📊 Valuation Layer — Total rows:', table.numRows());

    // Apply filters only for columns that exist
    const cols = table.columnNames();
    table = applyFiltersToTable(table, filters, cols);

    if (table.numRows() === 0) {
        console.warn('⚠️ Filters removed all data. Using unfiltered data.');
        table = AppData.merged;
    }

    console.log('📊 After filters:', table.numRows(), 'rows');

    // KPI Cards
    const cheapCount = table.filter(aq.escape(d => d.valuation_signal === 'cheap')).numRows();
    const fairCount = table.filter(aq.escape(d => d.valuation_signal === 'fair')).numRows();
    const expensiveCount = table.filter(aq.escape(d => d.valuation_signal === 'expensive')).numRows();
    const attractValues = table.array('relative_attractiveness_score').filter(v => v != null && !isNaN(v));
    const attractStats = computeStats(attractValues);

    console.log('📈 KPI Stats:', { cheapCount, fairCount, expensiveCount, attract_count: attractValues.length });

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
            <div class="kpi-value">${Math.round(attractStats?.mean || 0)}</div>
            <div class="kpi-label">Avg Attractiveness</div>
        </div>
    `;

    // Tabla de señales de valuación
    const paginationSize = 50;
    const paginated = table.slice(0, paginationSize).objects();

    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Startup</th>
                    <th>Sector</th>
                    <th>Entry Multiple</th>
                    <th>Benchmark Multiple</th>
                    <th>Signal</th>
                    <th>Attractiveness</th>
                </tr>
            </thead>
            <tbody>
                ${paginated.map(row => `
                    <tr>
                        <td><strong>${row.startup_name || '—'}</strong></td>
                        <td>${row.sector || '—'}</td>
                        <td>${fmtMultiple(row.entry_multiple || 0)}</td>
                        <td>${fmtMultiple(row.bm_revenue_multiple_mid || 0)}</td>
                        <td>${signalBadge(row.valuation_signal)}</td>
                        <td>${Math.round(row.relative_attractiveness_score || 0)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${table.numRows() > paginationSize ? `<p style="margin-top: 16px; color: var(--color-text-secondary); font-size: 12px;">Showing ${paginationSize} of ${table.numRows()} startups</p>` : ''}
    `;

    document.getElementById('table-valuation').innerHTML = tableHTML;

    // Chart 1: Growth vs Entry Multiple
    try {
        console.log('Chart 1: Growth vs Entry Multiple');
        const filtered = table.filter(aq.escape(d => d.growth_yoy != null && d.entry_multiple != null)).objects();
        console.log('  Data points:', filtered.length);

        if (filtered.length > 0) {
            const growths = filtered.map(d => d.growth_yoy);
            const multiples = filtered.map(d => d.entry_multiple);
            const signals = filtered.map(d => d.valuation_signal);
            const names = filtered.map(d => d.startup_name);

            const colorMap = {
                'cheap': AIDA_COLORS.cheap,
                'fair': AIDA_COLORS.fair,
                'expensive': AIDA_COLORS.expensive,
                'no_benchmark': AIDA_COLORS.noBenchmark,
            };

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
                title: { text: '' },
                xaxis: { title: 'Entry Multiple (x)' },
                yaxis: { title: 'Growth YoY (%)' },
                ...PLOTLY_LAYOUT_BASE,
            }, PLOTLY_CONFIG);

            console.log('✅ chart-growth-multiple rendered');
        } else {
            console.warn('⚠️ No growth-multiple data');
            Plotly.purge('chart-growth-multiple');
        }
    } catch (e) {
        console.error('❌ Chart Growth Multiple error:', e.message);
    }

    // Chart 2: Price-Performance Matrix
    try {
        console.log('Chart 2: Price-Performance Matrix');
        const filtered = table.filter(aq.escape(d => d.growth_yoy != null && d.entry_multiple != null)).objects();
        console.log('  Data points:', filtered.length);

        if (filtered.length > 0) {
            const growths = filtered.map(d => d.growth_yoy);
            const multiples = filtered.map(d => d.entry_multiple);
            const signals = filtered.map(d => d.valuation_signal);
            const names = filtered.map(d => d.startup_name);

            const medianMultiple = computeStats(multiples).median;
            const medianGrowth = computeStats(growths).median;

            const colorMap = {
                'cheap': AIDA_COLORS.cheap,
                'fair': AIDA_COLORS.fair,
                'expensive': AIDA_COLORS.expensive,
            };

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
                hovertemplate: '<b>%{text}</b><br>Entry Multiple: %{x:.2f}x<br>Growth: %{y:.0%}<extra></extra>'
            }], {
                title: { text: '' },
                xaxis: { title: 'Entry Multiple (x)' },
                yaxis: { title: 'Growth YoY (%)' },
                ...PLOTLY_LAYOUT_BASE,
                shapes: medianMultiple && medianGrowth ? [
                    {
                        type: 'line',
                        x0: medianMultiple, x1: medianMultiple,
                        y0: Math.min(...growths), y1: Math.max(...growths),
                        line: { color: '#999', width: 1, dash: 'dash' }
                    },
                    {
                        type: 'line',
                        x0: Math.min(...multiples), x1: Math.max(...multiples),
                        y0: medianGrowth, y1: medianGrowth,
                        line: { color: '#999', width: 1, dash: 'dash' }
                    }
                ] : []
            }, PLOTLY_CONFIG);

            console.log('✅ chart-ppm rendered');
        } else {
            console.warn('⚠️ No PPM data');
            Plotly.purge('chart-ppm');
        }
    } catch (e) {
        console.error('❌ Chart PPM error:', e.message);
    }

    // Chart 3: Relative Attractiveness Ranking (Top 15)
    try {
        console.log('Chart 3: Attractiveness Ranking');
        const topAttract = table
            .filter(aq.escape(d => d.relative_attractiveness_score != null && d.relative_attractiveness_score > 0))
            .orderby(aq.desc('relative_attractiveness_score'))
            .limit(15)
            .objects();

        console.log('  Data points:', topAttract.length);

        if (topAttract.length > 0) {
            Plotly.newPlot('chart-attractiveness', [{
                type: 'bar',
                x: topAttract.map(d => d.relative_attractiveness_score),
                y: topAttract.map(d => d.startup_name),
                orientation: 'h',
                marker: { color: AIDA_COLORS.accent },
                text: topAttract.map(d => Math.round(d.relative_attractiveness_score)),
                textposition: 'outside',
            }], {
                title: { text: '' },
                xaxis: { title: 'Attractiveness Score' },
                ...PLOTLY_LAYOUT_BASE,
                margin: { l: 200, r: 100, t: 30, b: 50 }
            }, PLOTLY_CONFIG);

            console.log('✅ chart-attractiveness rendered');
        } else {
            console.warn('⚠️ No attractiveness data');
            Plotly.purge('chart-attractiveness');
        }
    } catch (e) {
        console.error('❌ Chart Attractiveness error:', e.message);
    }

    // Chart 4: Efficiency Score Breakdown (Top 10)
    try {
        console.log('Chart 4: Efficiency Score Breakdown');
        const topEff = table
            .filter(aq.escape(d => d.efficiency_score != null && d.efficiency_score > 0))
            .orderby(aq.desc('efficiency_score'))
            .limit(10)
            .objects();

        console.log('  Data points:', topEff.length);

        if (topEff.length > 0) {
            Plotly.newPlot('chart-efficiency', [{
                type: 'bar',
                x: topEff.map(d => d.startup_name),
                y: topEff.map(d => d.efficiency_score),
                marker: { color: AIDA_COLORS.accent },
                text: topEff.map(d => Math.round(d.efficiency_score)),
                textposition: 'outside',
            }], {
                title: { text: '' },
                yaxis: { title: 'Efficiency Score' },
                xaxis: { title: 'Startup' },
                ...PLOTLY_LAYOUT_BASE,
                margin: { b: 120, t: 30 }
            }, PLOTLY_CONFIG);

            console.log('✅ chart-efficiency rendered');
        } else {
            console.warn('⚠️ No efficiency data');
            Plotly.purge('chart-efficiency');
        }
    } catch (e) {
        console.error('❌ Chart Efficiency error:', e.message);
    }

    console.log('✅ [valuation_layer] Render completed');
}
