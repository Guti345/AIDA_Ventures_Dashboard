// startup_review.js — Layer 2: Startup Review

async function renderStartupReview(filters) {
    console.log('🔍 [startup_review] Starting render with filters:', filters);

    if (!AppData.startups || AppData.startups.numRows() === 0) {
        console.warn('⚠️ Startup data is empty');
        document.getElementById('startup-kpis').innerHTML = '<p style="padding: 20px; color: #ef4444;">No startup data available</p>';
        return;
    }

    let table = AppData.startups;
    console.log('📊 Startup Review — Total rows:', table.numRows());

    // Apply filters only for columns that exist
    const cols = table.columnNames();
    table = applyFiltersToTable(table, filters, cols);

    if (table.numRows() === 0) {
        console.warn('⚠️ Filters removed all data. Using unfiltered data.');
        table = AppData.startups;
    }

    console.log('📊 After filters:', table.numRows(), 'rows');

    // KPI Cards
    const arrValues = table.array('arr_usd').filter(v => v != null && !isNaN(v) && v > 0);
    const growthValues = table.array('growth_yoy').filter(v => v != null && !isNaN(v));
    const burnValues = table.array('burn_rate_usd').filter(v => v != null && !isNaN(v));
    const runwayValues = table.array('runway_months').filter(v => v != null && !isNaN(v));

    const arrStats = computeStats(arrValues);
    const growthStats = computeStats(growthValues);
    const burnStats = computeStats(burnValues);
    const runwayStats = computeStats(runwayValues);

    console.log('📈 KPI Stats:', {
        arr_count: arrValues.length,
        growth_count: growthValues.length,
        burn_count: burnValues.length,
        runway_count: runwayValues.length,
    });

    document.getElementById('startup-kpis').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-value">${fmtUSD(arrStats?.median || 0)}</div>
            <div class="kpi-label">Median ARR</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${fmtPct(growthStats?.median || 0)}</div>
            <div class="kpi-label">Median Growth YoY</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${fmtUSD(burnStats?.median || 0)}</div>
            <div class="kpi-label">Median Burn</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${Math.round(runwayStats?.mean || 0)}</div>
            <div class="kpi-label">Avg Runway (months)</div>
        </div>
    `;

    // Tabla de startups (limitada a 50 filas)
    const paginationSize = 50;
    const paginated = table.slice(0, paginationSize).objects();

    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Sector</th>
                    <th>Stage</th>
                    <th>Country</th>
                    <th>ARR</th>
                    <th>Growth YoY</th>
                    <th>Burn/mo</th>
                    <th>Runway</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${paginated.map(row => `
                    <tr>
                        <td><strong>${row.startup_name || '—'}</strong></td>
                        <td>${row.sector || '—'}</td>
                        <td>${row.round_stage || '—'}</td>
                        <td>${row.country || '—'}</td>
                        <td>${fmtUSD(row.arr_usd || 0)}</td>
                        <td>${fmtPct(row.growth_yoy || 0)}</td>
                        <td>${fmtUSD(row.burn_rate_usd || 0)}</td>
                        <td>${row.runway_months ? Math.round(row.runway_months) + 'mo' : 'N/A'}</td>
                        <td><span class="badge badge-${row.deal_status === 'closed' ? 'cheap' : row.deal_status === 'in_review' ? 'fair' : 'expensive'}">${row.deal_status || '—'}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${table.numRows() > paginationSize ? `<p style="margin-top: 16px; color: var(--color-text-secondary); font-size: 12px;">Showing ${paginationSize} of ${table.numRows()} startups</p>` : ''}
    `;

    document.getElementById('table-startups').innerHTML = tableHTML;

    // Chart 1: ARR Distribution
    try {
        console.log('Chart 1: ARR Distribution');
        const arrDist = table.array('arr_usd')
            .filter(v => v != null && v > 0)
            .map(v => Math.log10(v + 1));

        console.log('  Data points:', arrDist.length);

        if (arrDist.length > 0) {
            Plotly.newPlot('chart-arr-dist', [{
                type: 'histogram',
                x: arrDist,
                nbinsx: 20,
                marker: { color: AIDA_COLORS.accent },
            }], {
                title: { text: '' },
                xaxis: { title: 'ARR (log10 scale)' },
                yaxis: { title: 'Count' },
                ...PLOTLY_LAYOUT_BASE,
            }, PLOTLY_CONFIG);

            console.log('✅ chart-arr-dist rendered');
        } else {
            console.warn('⚠️ No ARR data');
            Plotly.purge('chart-arr-dist');
        }
    } catch (e) {
        console.error('❌ Chart ARR Dist error:', e.message);
    }

    // Chart 2: Growth vs Burn Multiple
    try {
        console.log('Chart 2: Growth vs Burn Multiple');
        const filtered = table.filter(aq.escape(d => d.burn_multiple != null && d.growth_yoy != null)).objects();
        console.log('  Data points:', filtered.length);

        if (filtered.length > 0) {
            const burnMult = filtered.map(d => d.burn_multiple);
            const growthRate = filtered.map(d => d.growth_yoy);
            const names = filtered.map(d => d.startup_name);

            Plotly.newPlot('chart-growth-burn', [{
                type: 'scatter',
                mode: 'markers',
                x: burnMult,
                y: growthRate,
                marker: {
                    size: 8,
                    color: AIDA_COLORS.accent,
                    opacity: 0.7,
                },
                text: names,
                hovertemplate: '<b>%{text}</b><br>Burn Multiple: %{x:.2f}x<br>Growth: %{y:.0%}<extra></extra>'
            }], {
                title: { text: '' },
                xaxis: { title: 'Burn Multiple' },
                yaxis: { title: 'Growth YoY (%)' },
                ...PLOTLY_LAYOUT_BASE,
            }, PLOTLY_CONFIG);

            console.log('✅ chart-growth-burn rendered');
        } else {
            console.warn('⚠️ No growth-burn data');
            Plotly.purge('chart-growth-burn');
        }
    } catch (e) {
        console.error('❌ Chart Growth Burn error:', e.message);
    }

    // Chart 3: Ranking por ARR (Top 15)
    try {
        console.log('Chart 3: ARR Ranking');
        const topARR = table
            .filter(aq.escape(d => d.arr_usd != null && d.arr_usd > 0))
            .orderby(aq.desc('arr_usd'))
            .limit(15)
            .objects();

        console.log('  Data points:', topARR.length);

        if (topARR.length > 0) {
            Plotly.newPlot('chart-arr-ranking', [{
                type: 'bar',
                x: topARR.map(d => d.arr_usd),
                y: topARR.map(d => d.startup_name),
                orientation: 'h',
                marker: { color: AIDA_COLORS.accent },
                text: topARR.map(d => fmtUSD(d.arr_usd || 0)),
                textposition: 'outside',
            }], {
                title: { text: '' },
                xaxis: { title: 'ARR (USD)' },
                ...PLOTLY_LAYOUT_BASE,
                margin: { l: 200, r: 100, t: 30, b: 50 }
            }, PLOTLY_CONFIG);

            console.log('✅ chart-arr-ranking rendered');
        } else {
            console.warn('⚠️ No ARR ranking data');
            Plotly.purge('chart-arr-ranking');
        }
    } catch (e) {
        console.error('❌ Chart ARR Ranking error:', e.message);
    }

    console.log('✅ [startup_review] Render completed');
}
