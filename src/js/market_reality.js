// market_reality.js — Layer 1: Market Reality
// Ref: instrucciones_v2 — Sección 14

async function renderMarketReality(filters) {
    if (!AppData.market || AppData.market.numRows() === 0) {
        console.warn('⚠️ Market data is empty or not loaded');
        document.getElementById('market-kpis').innerHTML = '<p>No data available</p>';
        return;
    }

    let table = AppData.market;
    console.log('🔍 Market Reality — Total rows:', table.numRows());

    // Aplicar filtros
    if (filters.sector && filters.sector !== '') {
        table = table.filter(aq.escape(d => d.sector === filters.sector));
        console.log('After sector filter:', table.numRows());
    }
    if (filters.country && filters.country !== '') {
        table = table.filter(aq.escape(d => d.country === filters.country));
        console.log('After country filter:', table.numRows());
    }

    // 🔍 DEBUG: Si está vacío después de filtrar, usar sin filtros
    if (table.numRows() === 0) {
        console.warn('⚠️ Filters removed all data. Using unfiltered data.');
        table = AppData.market;
    }

    // KPI Cards
    const totalBenchmarks = table.numRows();
    const uniqueCountries = table.array('country').filter((v, i, a) => a.indexOf(v) === i).length;
    const uniqueSectors = table.array('sector').filter((v, i, a) => a.indexOf(v) === i).length;
    const uniqueSources = table.array('source_name').filter((v, i, a) => a.indexOf(v) === i).length;

    document.getElementById('market-kpis').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-value">${totalBenchmarks.toLocaleString()}</div>
            <div class="kpi-label">Total Benchmarks</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${uniqueCountries}</div>
            <div class="kpi-label">Countries</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${uniqueSectors}</div>
            <div class="kpi-label">Sectors</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${uniqueSources}</div>
            <div class="kpi-label">Sources</div>
        </div>
    `;

    // Chart 1 — Investment by Sector (Bar horizontal)
    const investmentBySector = table
        .filter(aq.escape(d => d.metric_name === 'investment_amount_usd'))
        .groupby('sector')
        .rollup({
            total: d => aq.op.sum(d.metric_value_mid),
            count: d => aq.op.count()
        })
        .orderby(aq.desc('total'))
        .limit(10);

    console.log('Investment by sector data:', investmentBySector.objects());

    if (investmentBySector.numRows() > 0) {
        const sectors = investmentBySector.array('sector');
        const values = investmentBySector.array('total');

        Plotly.newPlot('chart-investment-sector', [{
            type: 'bar',
            x: values,
            y: sectors,
            orientation: 'h',
            marker: { color: AIDA_COLORS.accent },
            text: values.map(v => fmtUSD(v)),
            textposition: 'outside',
        }], {
            ...PLOTLY_LAYOUT_BASE,
            xaxis: { title: 'Investment (USD)' },
            margin: { l: 150, r: 80, t: 30, b: 50 }
        }, PLOTLY_CONFIG);
    } else {
        Plotly.newPlot('chart-investment-sector', [], { ...PLOTLY_LAYOUT_BASE }, PLOTLY_CONFIG);
    }

    // Chart 2 — Valuation Range by Stage (Box plot)
    const valuationByStage = table
        .filter(aq.escape(d => d.metric_name === 'valuation_pre_money_usd' && d.metric_value_mid != null))
        .groupby('round_stage')
        .rollup({
            values: d => d.metric_value_mid,
            min: d => aq.op.min(d.metric_value_mid),
            max: d => aq.op.max(d.metric_value_mid),
            mean: d => aq.op.mean(d.metric_value_mid),
        });

    console.log('Valuation by stage:', valuationByStage.objects());

    if (valuationByStage.numRows() > 0) {
        const stages = valuationByStage.array('round_stage');
        const lowerFence = valuationByStage.array('min');
        const upperFence = valuationByStage.array('max');

        Plotly.newPlot('chart-valuation-stage', [{
            type: 'box',
            y: table
                .filter(aq.escape(d => d.metric_name === 'valuation_pre_money_usd'))
                .array('metric_value_mid'),
            x: table
                .filter(aq.escape(d => d.metric_name === 'valuation_pre_money_usd'))
                .array('round_stage'),
            marker: { color: AIDA_COLORS.accent },
        }], {
            ...PLOTLY_LAYOUT_BASE,
            yaxis: { title: 'Valuation (USD)', type: 'log' },
            xaxis: { title: 'Stage' }
        }, PLOTLY_CONFIG);
    }

    // Chart 3 — Revenue Multiples by Sector (Bar)
    const multiplesBySector = table
        .filter(aq.escape(d => d.metric_name === 'revenue_multiple' && d.metric_value_mid != null))
        .groupby('sector')
        .rollup({
            avg_multiple: d => aq.op.mean(d.metric_value_mid),
        })
        .orderby(aq.desc('avg_multiple'))
        .limit(10);

    if (multiplesBySector.numRows() > 0) {
        Plotly.newPlot('chart-multiples-sector', [{
            type: 'bar',
            x: multiplesBySector.array('sector'),
            y: multiplesBySector.array('avg_multiple'),
            marker: { color: AIDA_COLORS.accent },
            text: multiplesBySector.array('avg_multiple').map(v => fmtMultiple(v)),
            textposition: 'outside',
        }], {
            ...PLOTLY_LAYOUT_BASE,
            yaxis: { title: 'Revenue Multiple (x)' },
            xaxis: { title: 'Sector' }
        }, PLOTLY_CONFIG);
    }

    // Chart 4 — Time Between Rounds (Bar)
    const timeRounds = table
        .filter(aq.escape(d => d.metric_name === 'time_between_rounds_months' && d.metric_value_mid != null))
        .groupby('round_stage')
        .rollup({
            avg_months: d => aq.op.mean(d.metric_value_mid),
        });

    if (timeRounds.numRows() > 0) {
        Plotly.newPlot('chart-time-rounds', [{
            type: 'bar',
            x: timeRounds.array('round_stage'),
            y: timeRounds.array('avg_months'),
            marker: { color: AIDA_COLORS.accent },
            text: timeRounds.array('avg_months').map(v => fmtMonths(v)),
            textposition: 'outside',
        }], {
            ...PLOTLY_LAYOUT_BASE,
            yaxis: { title: 'Months' },
        }, PLOTLY_CONFIG);
    }

    // Chart 5 — Graduation Rates (Bar)
    const graduationRates = table
        .filter(aq.escape(d => d.metric_name === 'graduation_rate' && d.metric_value_mid != null))
        .groupby('round_stage')
        .rollup({
            avg_rate: d => aq.op.mean(d.metric_value_mid),
        });

    if (graduationRates.numRows() > 0) {
        Plotly.newPlot('chart-graduation', [{
            type: 'bar',
            x: graduationRates.array('round_stage'),
            y: graduationRates.array('avg_rate'),
            marker: { color: AIDA_COLORS.accent },
            text: graduationRates.array('avg_rate').map(v => fmtPct(v)),
            textposition: 'outside',
        }], {
            ...PLOTLY_LAYOUT_BASE,
            yaxis: { title: 'Graduation Rate (%)' },
        }, PLOTLY_CONFIG);
    }

    // Chart 6 — Temporal Evolution (Line chart)
    // Mostrar evolución de inversión en el tiempo
    const temporalData = table
        .filter(aq.escape(d => d.metric_name === 'investment_amount_usd' && d.data_reference_date != null))
        .groupby('data_reference_date', 'sector')
        .rollup({
            total: d => aq.op.sum(d.metric_value_mid)
        })
        .orderby('data_reference_date');

    if (temporalData.numRows() > 0) {
        const uniqueSectors = [...new Set(temporalData.array('sector'))];
        const traces = uniqueSectors.map(sector => ({
            type: 'scatter',
            mode: 'lines+markers',
            name: sector,
            x: temporalData
                .filter(aq.escape(d => d.sector === sector))
                .array('data_reference_date'),
            y: temporalData
                .filter(aq.escape(d => d.sector === sector))
                .array('total'),
            line: { width: 2 },
            marker: { size: 5 }
        }));

        Plotly.newPlot('chart-temporal', traces, {
            ...PLOTLY_LAYOUT_BASE,
            xaxis: { title: 'Date' },
            yaxis: { title: 'Investment (USD)' },
            showlegend: true,
            legend: { orientation: 'h', x: 0, y: 1.1 }
        }, PLOTLY_CONFIG);
    }
}
