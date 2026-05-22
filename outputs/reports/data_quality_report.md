# Data Quality Report — AIDA Market Intelligence
Generated: 2026-05-22 00:15:25

## 1. File Summary

| File | Rows | Columns |
|------|------|----------|
| market_benchmark | 5880 | 30 |
| startup_deal | 175 | 58 |
| merged_valuation | 175 | 73 |

## 2. Missing Values in Critical Columns

### market_benchmark

| Column | Missing | % |
|--------|---------|---|
| record_id | 0 | 0.0% |
| metric_name | 0 | 0.0% |
| metric_value_mid | 0 | 0.0% |
| sector | 0 | 0.0% |
| round_stage | 0 | 0.0% |
| data_reference_date | 0 | 0.0% |

### startup_deal

| Column | Missing | % |
|--------|---------|---|
| startup_id | 0 | 0.0% |
| startup_name | 0 | 0.0% |
| sector | 0 | 0.0% |
| round_stage | 0 | 0.0% |
| deal_status | 0 | 0.0% |
| data_reference_date | 0 | 0.0% |

### merged_valuation

| Column | Missing | % |
|--------|---------|---|
| startup_name | 0 | 0.0% |
| metric_name | N/A (column missing) | — |
| valuation_signal | 0 | 0.0% |
| benchmark_match_quality | 0 | 0.0% |
| relative_attractiveness_score | 0 | 0.0% |

## 3. Duplicates

### market_benchmark

Duplicate record_id: 0

### startup_deal

Duplicate startup_record_id: 0

### merged_valuation

Duplicate startup_record_id: 0

## 4. Date Range

### market_benchmark

**data_entry_date**: 1970-01-01 00:00:00.000046164 to 1970-01-01 00:00:00.000046164

**data_reference_date**: 1970-01-01 00:00:00.000045658 to 1970-01-01 00:00:00.000046204

**last_updated**: 1970-01-01 00:00:00.000046164 to 1970-01-01 00:00:00.000046164

### startup_deal

**data_entry_date**: 2026-05-21 00:00:00 to 2026-05-21 00:00:00

**data_reference_date**: 2026-02-08 00:00:00 to 2026-02-08 00:00:00

**last_round_date**: 2025-11-07 00:00:00 to 2025-11-07 00:00:00

**next_round_expected_date**: 2026-09-25 00:00:00 to 2026-09-25 00:00:00

**last_updated**: 2026-05-21 00:00:00 to 2026-05-21 00:00:00

### merged_valuation

**data_entry_date**: 2026-05-21 00:00:00 to 2026-05-21 00:00:00

**data_reference_date**: 2026-02-08 00:00:00 to 2026-02-08 00:00:00

**last_round_date**: 2025-11-07 00:00:00 to 2025-11-07 00:00:00

**next_round_expected_date**: 2026-09-25 00:00:00 to 2026-09-25 00:00:00

**last_updated**: 2026-05-21 00:00:00 to 2026-05-21 00:00:00

## 5. Categorical Distributions

### market_benchmark

**sector**:
  - fintech: 1960
  - saas: 1960
  - logtech: 1960

**round_stage**:
  - pre_seed: 1470
  - seed: 1470
  - series_a: 1470
  - series_b: 1470

**metric_name**:
  - 2025Q1: 840
  - 2025Q2: 840
  - 2025Q3: 840
  - 2025Q4: 840
  - 2026Q1: 840
  - 2026Q2: 840
  - 2026Q3: 840

### startup_deal

**sector**:
  - edtech: 47
  - saas: 37
  - fintech: 34
  - healthtech: 31
  - logtech: 26

**round_stage**:
  - series_a: 50
  - pre_seed: 43
  - seed: 42
  - series_b: 40

**deal_status**:
  - pipeline: 65
  - in_review: 61
  - passed: 49

### merged_valuation

**valuation_signal**:
  - no_benchmark: 175

**benchmark_match_quality**:
  - low: 97
  - no_match: 78

## 6. Data Quality Alerts

[OK] No critical alerts detected

