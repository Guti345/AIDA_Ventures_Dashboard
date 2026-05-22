// market_reality.js — Layer 1: Market Reality
// Working with wide-format CSV (columns per metric)

async function renderMarketReality(filters) {
    console.log('🔍 [market_reality] Starting render with filters:', filters);

    if (!AppData.market || AppData.market.numRows() === 0) {
        console.warn('⚠️ Market data is empty or not loaded');
        document.getElementById('market-kpis').innerHTML = '<p style="padding: 20px; color: #ef4444;">No market data available</p>';
        return;
    }

    let table = AppData.market;
    console.log('📊 Market Reality — Total rows:', table.numRows());

    // Apply filters
    const cols = table.columnNames();
    table = applyFiltersToTable(table, filters, cols);

    if (table.numRows() === 0) {
        console.warn('⚠️ Filters removed all data. Using unfiltered data.');
        table = AppData.market;
    }

    console.log('📊 After filters:', table.numRows(), 'rows');

    // KPI Cards
    const totalBenchmarks = table.numRows();
    const countryArray = table.array('country').filter(v => v && v !== '');
    const uniqueCountries = [...new Set(countryArray)].length;
    const sectorArray = table.array('sector').filter(v => v && v !== '');
    const uniqueSectors = [...new Set(sectorArray)].length;
    const sourceArray = table.array('source_name').filter(v => v && v !== '');
    const uniqueSources = [...new Set(sourceArray)].length;

    console.log('📈 KPI Stats:', { totalBenchmarks, uniqueCountries, uniqueSectors, uniqueSources });

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

    // Chart 1 — Investment by Sector (sum of investment_amount_usd)
    try {
        console.log('Chart 1: Investment by Sector');
        const investData = table
            .filter(aq.escape(d => d.investment_amount_usd != null && d.investment_amount_usd !== ''))
            .groupby('sector')
            .rollup({ total: d => aq.op.sum(d.investment_amount_usd) })
            .orderby(aq.desc('total'))
            .limit(10)
            .objects();

        console.log('  Data rows:', investData.length);
        if (investData.length > 0) console.log('  Sample:', investData[0]);

        if (investData.length > 0) {
            Plotly.newPlot('chart-investment-sector', [{
                type: 'bar',
                x: investData.map(d => d.total),
                y: investData.map(d => d.sector),
                orientation: 'h',
                marker: { color: AIDA_COLORS.accent },
                text: investData.map(d => fmtUSD(d.total * 1e6)), // Convert from millions to USD
                textposition: 'outside',
            }], {
                title: { text: '' },
                xaxis: { title: 'Investment ($ Millions)' },
                yaxis: { title: '' },
                ...PLOTLY_LAYOUT_BASE,
                margin: { l: 150, r: 100, t: 30, b: 50 }
            }, PLOTLY_CONFIG);

            console.log('✅ chart-investment-sector rendered');
        } else {
            console.warn('⚠️ No investment data');
            Plotly.purge('chart-investment-sector');
        }
    } catch (e) {
        console.error('❌ Chart 1 error:', e.message);
    }

    // Chart 2 — Valuation Range by Stage (box plot)
    try {
        console.log('Chart 2: Valuation by Stage');
        const valuationData = table
            .filter(aq.escape(d => d.valuation_pre_money_usd != null && d.valuation_pre_money_usd !== ''))
            .objects();

        console.log('  Data rows:', valuationData.length);

        if (valuationData.length > 0) {
            const stages = [...new Set(valuationData.map(d => d.round_stage).filter(Boolean))];
            console.log('  Stages:', stages);

            const traces = stages.map(stage => {
                const stageValues = valuationData
                    .filter(d => d.round_stage === stage && d.valuation_pre_money_usd != null)
                    .map(d => d.valuation_pre_money_usd);

                console.log(`    ${stage}: ${stageValues.length} values`);

                return {
                    type: 'box',
                    y: stageValues,
                    name: stage,
                    marker: { color: AIDA_COLORS.accent }
                };
            });

            Plotly.newPlot('chart-valuation-stage', traces, {
                title: { text: '' },
                yaxis: { title: 'Valuation ($ Millions)', type: 'log' },
                xaxis: { title: 'Stage' },
                ...PLOTLY_LAYOUT_BASE,
            }, PLOTLY_CONFIG);

            console.log('✅ chart-valuation-stage rendered');
        } else {
            console.warn('⚠️ No valuation data');
            Plotly.purge('chart-valuation-stage');
        }
    } catch (e) {
        console.error('❌ Chart 2 error:', e.message);
    }

    // Chart 3 — Revenue Multiples by Sector
    try {
        console.log('Chart 3: Revenue Multiples by Sector');
        const multData = table
            .filter(aq.escape(d => d.revenue_multiple != null && d.revenue_multiple !== ''))
            .groupby('sector')
            .rollup({ avg_multiple: d => aq.op.mean(d.revenue_multiple) })
            .orderby(aq.desc('avg_multiple'))
            .limit(10)
            .objects();

        console.log('  Data rows:', multData.length);
        if (multData.length > 0) console.log('  Sample:', multData[0]);

        if (multData.length > 0) {
            Plotly.newPlot('chart-multiples-sector', [{
                type: 'bar',
                x: multData.map(d => d.sector),
                y: multData.map(d => d.avg_multiple),
                marker: { color: AIDA_COLORS.accent },
                text: multData.map(d => fmtMultiple(d.avg_multiple || 0)),
                textposition: 'outside',
            }], {
                title: { text: '' },
                yaxis: { title: 'Revenue Multiple (x)' },
                xaxis: { title: 'Sector' },
                ...PLOTLY_LAYOUT_BASE,
                margin: { b: 80, t: 30 }
            }, PLOTLY_CONFIG);

            console.log('✅ chart-multiples-sector rendered');
        } else {
            console.warn('⚠️ No revenue multiple data');
            Plotly.purge('chart-multiples-sector');
        }
    } catch (e) {
        console.error('❌ Chart 3 error:', e.message);
    }

    // Chart 4 — Time Between Rounds by Stage
    try {
        console.log('Chart 4: Time Between Rounds');
        const timeData = table
            .filter(aq.escape(d => d.time_between_rounds_months != null && d.time_between_rounds_months !== ''))
            .groupby('round_stage')
            .rollup({ avg_months: d => aq.op.mean(d.time_between_rounds_months) })
            .objects();

        console.log('  Data rows:', timeData.length);
        if (timeData.length > 0) console.log('  Sample:', timeData[0]);

        if (timeData.length > 0) {
            Plotly.newPlot('chart-time-rounds', [{
                type: 'bar',
                x: timeData.map(d => d.round_stage),
                y: timeData.map(d => d.avg_months),
                marker: { color: AIDA_COLORS.accent },
                text: timeData.map(d => fmtMonths(d.avg_months || 0)),
                textposition: 'outside',
            }], {
                title: { text: '' },
                yaxis: { title: 'Months' },
                xaxis: { title: 'Stage' },
                ...PLOTLY_LAYOUT_BASE,
            }, PLOTLY_CONFIG);

            console.log('✅ chart-time-rounds rendered');
        } else {
            console.warn('⚠️ No time between rounds data');
            Plotly.purge('chart-time-rounds');
        }
    } catch (e) {
        console.error('❌ Chart 4 error:', e.message);
    }

    // Chart 5 — Graduation Rates by Stage
    try {
        console.log('Chart 5: Graduation Rates');
        const gradData = table
            .filter(aq.escape(d => d.graduation_rate != null && d.graduation_rate !== ''))
            .groupby('round_stage')
            .rollup({ avg_rate: d => aq.op.mean(d.graduation_rate) })
            .objects();

        console.log('  Data rows:', gradData.length);
        if (gradData.length > 0) console.log('  Sample:', gradData[0]);

        if (gradData.length > 0) {
            Plotly.newPlot('chart-graduation', [{
                type: 'bar',
                x: gradData.map(d => d.round_stage),
                y: gradData.map(d => (d.avg_rate || 0) * 100),
                marker: { color: AIDA_COLORS.accent },
                text: gradData.map(d => fmtPct(d.avg_rate || 0)),
                textposition: 'outside',
            }], {
                title: { text: '' },
                yaxis: { title: 'Graduation Rate (%)' },
                xaxis: { title: 'Stage' },
                ...PLOTLY_LAYOUT_BASE,
            }, PLOTLY_CONFIG);

            console.log('✅ chart-graduation rendered');
        } else {
            console.warn('⚠️ No graduation rate data');
            Plotly.purge('chart-graduation');
        }
    } catch (e) {
        console.error('❌ Chart 5 error:', e.message);
    }

    // Chart 6 — Growth Rate by Reference Date
    try {
        console.log('Chart 6: Growth Rate Over Time');
        const tempData = table
            .filter(aq.escape(d => d.growth_rate != null && d.growth_rate !== '' && d.data_reference_date != null && d.data_reference_date !== ''))
            .orderby('data_reference_date')
            .groupby('data_reference_date')
            .rollup({ avg_growth: d => aq.op.mean(d.growth_rate) })
            .objects();

        console.log('  Data rows:', tempData.length);
        if (tempData.length > 0) console.log('  Sample:', tempData[0]);

        if (tempData.length > 1) {
            Plotly.newPlot('chart-temporal', [{
                type: 'scatter',
                mode: 'lines+markers',
                x: tempData.map(d => d.data_reference_date),
                y: tempData.map(d => d.avg_growth),
                line: { color: AIDA_COLORS.accent, width: 3 },
                marker: { size: 6 },
                fill: 'tozeroy',
                fillcolor: 'rgba(19, 78, 151, 0.1)',
            }], {
                title: { text: '' },
                xaxis: { title: 'Date' },
                yaxis: { title: 'Average Growth Rate (%)' },
                ...PLOTLY_LAYOUT_BASE,
            }, PLOTLY_CONFIG);

            console.log('✅ chart-temporal rendered');
        } else {
            console.warn('⚠️ Not enough temporal data');
            Plotly.purge('chart-temporal');
        }
    } catch (e) {
        console.error('❌ Chart 6 error:', e.message);
    }

    console.log('✅ [market_reality] Render completed');
}
