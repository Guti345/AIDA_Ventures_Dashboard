# AIDA Market Intelligence

Internal investment intelligence platform for AIDA Ventures.

The system consolidates market benchmarks and startup data into a static dashboard that helps the fund answer three questions: where to invest, how much an opportunity is worth, and which deals deserve priority attention.

The final product is a web dashboard deployed on GitHub Pages, fed by two structured Excel files that the team updates manually. A set of Python scripts processes those files into clean CSVs that the dashboard reads directly — no backend, no database, no server required.

---

## Repository structure

```
AIDA-Market-Intelligence/
│
├── README.md
├── index.html
├── package.json
│
├── data/
│   ├── raw/
│   │   ├── sources/          ← Original benchmark Excel files, never modified
│   │   └── notes/            ← Notes on sources and data decisions
│   │
│   ├── master/
│   │   ├── market_benchmark_layer.xlsx   ← Editable benchmark database
│   │   └── startup_deal_layer.xlsx       ← Editable startup and deal database
│   │
│   └── processed/
│       ├── market_benchmark_layer.csv
│       ├── startup_deal_layer.csv
│       └── merged_valuation_layer.csv
│
├── src/
│   ├── js/
│   │   ├── data_loader.js
│   │   ├── market_reality.js
│   │   ├── startup_review.js
│   │   ├── valuation_layer.js
│   │   └── utils.js
│   │
│   └── css/
│       └── styles.css
│
├── scripts/
│   ├── ingest/
│   │   ├── ingest_source_1.py
│   │   ├── ingest_source_2.py
│   │   ├── ingest_source_3.py
│   │   ├── ingest_source_4.py
│   │   ├── ingest_source_5.py
│   │   └── consolidate_benchmark.py
│   │
│   ├── clean_market_layer.py
│   ├── clean_startup_layer.py
│   ├── build_processed_data.py
│   ├── validate_data.py
│   └── fund_thesis_config.json
│
├── docs/
│   ├── data_dictionary.md
│   ├── methodology.md
│   └── dashboard_spec.md
│
└── outputs/
    ├── figures/
    └── reports/
```