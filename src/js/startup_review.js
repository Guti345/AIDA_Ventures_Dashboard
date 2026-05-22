// startup_review.js — Layer 2: Startup Review
// Ref: instrucciones_v2 — Sección 15

async function renderStartupReview(filters) {
    if (!AppData.startups || AppData.startups.numRows() === 0) {
        console.warn('⚠️ Startup data is empty');
        return;
    }

    let table = AppData.startups;
    console.log('🔍 Startup Review — Total rows:', table.numRows());

    // Aplicar filtros
    if (filters.sector && filters.sector !== '') {
        table = table.filter(aq.escape(d => d.sector === filters.sector));
    }
    if (filters.country && filters.country !== '') {
        table = table.filter(aq.escape(d => d.country === filters.country));
    }
    if (filters.round_stage && filters.round_stage !== '') {
        table = table.filter(aq.escape(d => d.round_stage === filters.round_stage));
    }

    if (table.numRows() === 0) {
        table = AppData.startups;
    }

    // KPI Cards
    const medianARR = computeStats(table.array('arr_usd').filter(v => v != null && v > 0)).median || 0;
    const medianGrowth = computeStats(table.array('growth_yoy').filter(v => v != null)).median || 0;
    const medianBurn = computeStats(table.array('burn_rate_usd').filter(v => v != null)).median || 0;
    const avgRunway = computeStats(table.array('runway_months').filter(v => v != null)).mean || 0;

    document.getElementById('startup-kpis').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-value">${fmtUSD(medianARR)}</div>
            <div class="kpi-label">Median ARR</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${fmtPct(medianGrowth)}</div>
            <div class="kpi-label">Median Growth YoY</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${fmtUSD(medianBurn)}</div>
            <div class="kpi-label">Median Burn</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${Math.round(avgRunway)}</div>
            <div class="kpi-label">Avg Runway (months)</div>
        </div>
    `;

    // Tabla de startups (limitada a 50 filas con paginación)
    const paginationSize = 50;
    const paginated = table.slice(0, paginationSize);

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
                ${paginated.objects().map(row => `
                    <tr>
                        <td><strong>${row.startup_name || ''}</strong></td>
                        <td>${row.sector || ''}</td>
                        <td>${row.round_stage || ''}</td>
                        <td>${row.country || ''}</td>
                        <td>${fmtUSD(row.arr_usd || 0)}</td>
                        <td>${fmtPct(row.growth_yoy || 0)}</td>
                        <td>${fmtUSD(row.burn_rate_usd || 0)}</td>
                        <td>${row.runway_months ? Math.round(row.runway_months) + 'mo' : 'N/A'}</td>
                        <td><span class="badge badge-${row.deal_status === 'passed' ? 'cheap' : row.deal_status === 'in_review' ? 'fair' : 'expensive'}">${row.deal_status || 'N/A'}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${table.numRows() > paginationSize ? `<p style="margin-top: 16px; color: var(--color-text-secondary); font-size: 12px;">Showing ${paginationSize} of ${table.numRows()} startups</p>` : ''}
    `;

    document.getElementById('table-startups').innerHTML = tableHTML;

    // Chart: ARR Distribution
    const arrValues = table.array('arr_usd')
        .filter(v => v != null && v > 0)
        .map(v => Math.log10(v + 1));  // Log scale para mejor visualización

    Plotly.newPlot('chart-arr-dist', [{
        type: 'histogram',
        x: arrValues,
        nbinsx: 30,
        marker: { color: AIDA_COLORS.accent },
    }], {
        ...PLOTLY_LAYOUT_BASE,
        xaxis: { title: 'ARR (log scale)' },
        yaxis: { title: 'Count' },
    }, PLOTLY_CONFIG);

    // Chart: Growth vs Burn Multiple
    const burnMultiples = table
        .filter(aq.escape(d => d.burn_multiple != null && d.growth_yoy != null))
        .array('burn_multiple');
    const growthRates = table
        .filter(aq.escape(d => d.burn_multiple != null && d.growth_yoy != null))
        .array('growth_yoy');
    const arrForSize = table
        .filter(aq.escape(d => d.burn_multiple != null && d.growth_yoy != null))
        .array('arr_usd');

    if (burnMultiples.length > 0) {
        Plotly.newPlot('chart-growth-burn', [{
            type: 'scatter',
            mode: 'markers',
            x: burnMultiples,
            y: growthRates,
            marker: {
                size: arrForSize.map(v => Math.min(30, Math.sqrt(v / 100000))),
                color: AIDA_COLORS.accent,
                opacity: 0.7,
            },
            text: table.filter(aq.escape(d => d.burn_multiple != null)).array('startup_name'),
            hovertemplate: '<b>%{text}</b><br>Burn Multiple: %{x:.2f}x<br>Growth: %{y:.0%}<extra></extra>'
        }], {
            ...PLOTLY_LAYOUT_BASE,
            xaxis: { title: 'Burn Multiple (lower is better)' },
            yaxis: { title: 'Growth YoY (%)' },
        }, PLOTLY_CONFIG);
    }

    // Chart: Ranking por ARR
    const topARR = table
        .filter(aq.escape(d => d.arr_usd != null && d.arr_usd > 0))
        .orderby(aq.desc('arr_usd'))
        .limit(15);

    if (topARR.numRows() > 0) {
        Plotly.newPlot('chart-arr-ranking', [{
            type: 'bar',
            x: topARR.array('arr_usd'),
            y: topARR.array('startup_name'),
            orientation: 'h',
            marker: { color: AIDA_COLORS.accent },
            text: topARR.array('arr_usd').map(v => fmtUSD(v)),
            textposition: 'outside',
        }], {
            ...PLOTLY_LAYOUT_BASE,
            xaxis: { title: 'ARR (USD)' },
            margin: { l: 200, r: 80, t: 30, b: 50 }
        }, PLOTLY_CONFIG);
    }
}
