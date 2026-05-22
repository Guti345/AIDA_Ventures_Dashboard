# build_processed_data.py
# Propósito: Cruzar startups con benchmarks, calcular indicadores derivados y scores
# Ref: instrucciones_v2 — Sección 7.3, 8, 9, 10, 11

import pandas as pd
import numpy as np
from datetime import datetime
import json
import os

# Niveles de matching
MATCH_LEVELS = [
    (1, ["country","region","sector","subsector","round_stage","data_reference_date"], "high"),
    (2, ["country","region","sector","round_stage","data_reference_date"],             "high"),
    (3, ["region","sector","subsector","round_stage","data_reference_date"],           "medium"),
    (4, ["region","sector","round_stage","data_reference_date"],                       "medium"),
    (5, ["sector","round_stage","data_reference_date"],                                "low"),
    (6, ["region","sector","round_stage"],                                             "low"),
    (7, ["sector","round_stage"],                                                      "low"),
]

# Fund thesis (por ahora genérico, puede ser parametrizado desde fund_thesis_config.json)
FUND_THESIS = {
    "target_sectors": ["saas", "fintech", "logtech"],
    "target_regions": ["andean", "mexico_ca", "south_cone"],
    "target_stages":  ["seed", "series_a"],
}


def find_benchmark_for_startup(startup_row, benchmark_df):
    """Encuentra el benchmark más específico para una startup (7 niveles)."""

    for level, keys, quality in MATCH_LEVELS:
        # Filtrar claves que existan en ambos DataFrames
        valid_keys = [k for k in keys
                      if k in benchmark_df.columns
                      and k in startup_row.index
                      and pd.notna(startup_row.get(k))]

        if not valid_keys:
            continue

        # Construir máscara de filtro
        mask = pd.Series([True] * len(benchmark_df))
        for k in valid_keys:
            if k in benchmark_df.columns:
                mask &= (benchmark_df[k] == startup_row[k])

        matches = benchmark_df[mask]
        if len(matches) == 0:
            continue

        # Desempate: más reciente primero
        if "data_reference_date" in matches.columns:
            matches = matches.sort_values("data_reference_date", ascending=False)

        # Retornar benchmark más cercano
        return {
            "benchmark_match_level":   level,
            "benchmark_match_quality": quality,
            "benchmark_record_ids":    ",".join(matches["record_id"].astype(str).tolist()[:3]),
            "bm_valuation_mid":        matches[matches["metric_name"]=="valuation_pre_money_usd"]["metric_value_mid"].mean()
                                       if len(matches[matches["metric_name"]=="valuation_pre_money_usd"]) > 0 else np.nan,
            "bm_revenue_multiple_mid": matches[matches["metric_name"]=="revenue_multiple"]["metric_value_mid"].mean()
                                       if len(matches[matches["metric_name"]=="revenue_multiple"]) > 0 else np.nan,
            "bm_growth_rate_mid":      matches[matches["metric_name"]=="growth_yoy"]["metric_value_mid"].mean()
                                       if len(matches[matches["metric_name"]=="growth_yoy"]) > 0 else np.nan,
        }

    return {
        "benchmark_match_level":   None,
        "benchmark_match_quality": "no_match",
        "benchmark_record_ids":    "",
        "bm_valuation_mid":        np.nan,
        "bm_revenue_multiple_mid": np.nan,
        "bm_growth_rate_mid":      np.nan,
    }


def normalize_metric(value, p10, p90, higher_is_better=True):
    """Normaliza un valor al rango [0, 1] basado en P10-P90."""
    if pd.isna(value) or pd.isna(p10) or pd.isna(p90):
        return np.nan

    if p90 == p10:
        return 0.5

    score = (value - p10) / (p90 - p10)
    score = max(0, min(1, score))

    return score if higher_is_better else (1 - score)


def compute_efficiency_score(row):
    """Calcula efficiency_score (0-100) con 3 componentes."""

    components = {}

    # Commercial efficiency (40%)
    commercial = []
    if pd.notna(row.get("ltv_cac_ratio")):
        # P10-P90: 1.0 a 4.0
        commercial.append(normalize_metric(row["ltv_cac_ratio"], 1.0, 4.0, higher_is_better=True))

    if pd.notna(row.get("gross_margin")):
        # P10-P90: 40% a 85%
        commercial.append(normalize_metric(row["gross_margin"], 40, 85, higher_is_better=True))

    if pd.notna(row.get("cac_payback_months")):
        # P10-P90: 6 a 36 meses (menor es mejor)
        commercial.append(normalize_metric(row["cac_payback_months"], 6, 36, higher_is_better=False))

    if commercial:
        components["commercial"] = np.mean(commercial)

    # Capital efficiency (35%)
    capital = []
    if pd.notna(row.get("burn_multiple")):
        # P10-P90: 0.5 a 5 (menor es mejor)
        capital.append(normalize_metric(row["burn_multiple"], 0.5, 5, higher_is_better=False))

    if pd.notna(row.get("runway_months")):
        # P10-P90: 6 a 30 meses
        capital.append(normalize_metric(row["runway_months"], 6, 30, higher_is_better=True))

    if capital:
        components["capital"] = np.mean(capital)

    # Operating efficiency (25%)
    operating = []
    if pd.notna(row.get("arr_per_employee")):
        # P10-P90: $50K a $200K
        operating.append(normalize_metric(row["arr_per_employee"], 50000, 200000, higher_is_better=True))

    if operating:
        components["operating"] = np.mean(operating)

    # Weighted composite
    weights = {"commercial": 0.40, "capital": 0.35, "operating": 0.25}
    available = {k: v for k, v in components.items() if v is not None}

    if not available:
        return np.nan, "insufficient"

    total_weight = sum(weights[k] for k in available)
    final_score = sum(v * weights[k] / total_weight for k, v in available.items()) * 100

    quality = "high" if len(available) == 3 else ("medium" if len(available) == 2 else "low")

    return round(final_score, 2), quality


def compute_attractiveness_score(row):
    """Calcula relative_attractiveness_score (0-100) con 5 componentes."""

    components = {}

    # Growth (30%)
    if pd.notna(row.get("growth_yoy")):
        components["growth"] = normalize_metric(row["growth_yoy"], 30, 200, higher_is_better=True) * 100

    # Efficiency (25%)
    if pd.notna(row.get("efficiency_score")):
        components["efficiency"] = row["efficiency_score"]

    # Valuation attractiveness (25%) — inverso del multiple_gap
    if pd.notna(row.get("multiple_gap")):
        inv = normalize_metric(row["multiple_gap"], -3, 5, higher_is_better=False)
        components["valuation"] = inv * 100

    # Retention (10%)
    if pd.notna(row.get("nrr")):
        components["retention"] = normalize_metric(row["nrr"], 70, 130, higher_is_better=True) * 100

    # Strategic fit (10%)
    fit = 0
    if row.get("sector") in FUND_THESIS["target_sectors"]:
        fit += 4
    if row.get("region") in FUND_THESIS["target_regions"]:
        fit += 3
    if row.get("round_stage") in FUND_THESIS["target_stages"]:
        fit += 2
    if (row.get("sector") in FUND_THESIS["target_sectors"] and
        row.get("region") in FUND_THESIS["target_regions"] and
        row.get("round_stage") in FUND_THESIS["target_stages"]):
        fit += 1
    components["fit"] = (fit / 10) * 100

    if not components:
        return np.nan, "insufficient"

    weights = {"growth": 0.30, "efficiency": 0.25, "valuation": 0.25,
               "retention": 0.10, "fit": 0.10}
    available = {k: v for k, v in components.items() if v is not None}

    if not available:
        return np.nan, "insufficient"

    total_w = sum(weights.get(k, 0) for k in available)
    if total_w == 0:
        return np.nan, "insufficient"

    score = sum(v * weights.get(k, 0) / total_w for k, v in available.items())
    quality = "high" if len(available) >= 4 else ("medium" if len(available) >= 2 else "low")

    return round(score, 2), quality


def run():
    """Función principal que construye el merged_valuation_layer."""

    print("\n[build_processed_data] Iniciando construcción de valuation layer...")

    # Cargar CSVs limpios
    if os.path.exists("data/processed/market_benchmark_layer.csv"):
        market_file = "data/processed/market_benchmark_layer.csv"
        startup_file = "data/processed/startup_deal_layer.csv"
    else:
        market_file = "../../data/processed/market_benchmark_layer.csv"
        startup_file = "../../data/processed/startup_deal_layer.csv"

    try:
        df_market = pd.read_csv(market_file)
        df_startups = pd.read_csv(startup_file)
    except Exception as e:
        print(f"ERROR: No se pueden leer CSVs: {e}")
        return

    print(f"Market benchmarks: {len(df_market)} filas")
    print(f"Startups: {len(df_startups)} filas")

    # Cruce de 7 niveles
    print("\n[MATCHING] Ejecutando cruce de 7 niveles...")
    match_levels = []
    for idx, row in df_startups.iterrows():
        benchmark = find_benchmark_for_startup(row, df_market)
        match_levels.append(benchmark)

    df_matches = pd.DataFrame(match_levels)
    df_merged = pd.concat([df_startups.reset_index(drop=True), df_matches.reset_index(drop=True)], axis=1)

    print(f"Cruces completados. Resultado: {len(df_merged)} filas")

    # Contar matches por nivel
    level_counts = df_merged["benchmark_match_level"].value_counts().sort_index()
    print("\nDistribución de matches por nivel:")
    for level, count in level_counts.items():
        print(f"  Nivel {level}: {count}")
    print(f"  No match:  {df_merged['benchmark_match_level'].isna().sum()}")

    # Calcular indicadores derivados
    print("\n[INDICADORES] Calculando indicadores derivados...")

    df_merged["valuation_gap"] = (df_merged["valuation_post_money_usd"] -
                                   df_merged["bm_valuation_mid"])

    df_merged["multiple_gap"] = (df_merged["entry_multiple"] -
                                  df_merged["bm_revenue_multiple_mid"])

    df_merged["growth_gap"] = (df_merged["growth_yoy"] -
                                df_merged["bm_growth_rate_mid"])

    df_merged["price_performance_score"] = (df_merged["growth_yoy"] /
                                             df_merged["entry_multiple"].replace(0, np.nan))

    # Valuation signal
    def valuation_signal(row):
        if pd.isna(row["multiple_gap"]):
            return "no_benchmark"
        if row["multiple_gap"] < -0.5:
            return "cheap"
        if row["multiple_gap"] > 0.5:
            return "expensive"
        return "fair"

    df_merged["valuation_signal"] = df_merged.apply(valuation_signal, axis=1)

    # Efficiency score
    print("[EFFICIENCY] Calculando efficiency_score...")
    eff_scores = []
    eff_qualities = []
    for idx, row in df_merged.iterrows():
        score, quality = compute_efficiency_score(row)
        eff_scores.append(score)
        eff_qualities.append(quality)

    df_merged["efficiency_score"] = eff_scores
    df_merged["efficiency_data_quality"] = eff_qualities

    # Relative attractiveness score
    print("[ATTRACTIVENESS] Calculando relative_attractiveness_score...")
    attr_scores = []
    attr_qualities = []
    for idx, row in df_merged.iterrows():
        score, quality = compute_attractiveness_score(row)
        attr_scores.append(score)
        attr_qualities.append(quality)

    df_merged["relative_attractiveness_score"] = attr_scores
    df_merged["attractiveness_data_quality"] = attr_qualities

    # Exportar
    output_file = "data/processed/merged_valuation_layer.csv"
    print(f"\n[EXPORT] Exportando a {output_file}...")
    df_merged.to_csv(output_file, index=False)

    # Resumen
    print("\n" + "="*70)
    print("RESUMEN — build_processed_data.py")
    print("="*70)
    print(f"Filas exportadas:      {len(df_merged)}")
    print(f"Columnas:              {len(df_merged.columns)}")

    print(f"\nDistribución de valuation_signal:")
    signals = df_merged["valuation_signal"].value_counts()
    for signal, count in signals.items():
        print(f"  {signal}: {count}")

    print(f"\nDistribución de benchmark_match_quality:")
    qualities = df_merged["benchmark_match_quality"].value_counts()
    for quality, count in qualities.items():
        print(f"  {quality}: {count}")

    print(f"\nEficiency score — Data quality:")
    eff_q = df_merged["efficiency_data_quality"].value_counts()
    for quality, count in eff_q.items():
        print(f"  {quality}: {count}")

    print(f"\nAtractiveness score — Data quality:")
    attr_q = df_merged["attractiveness_data_quality"].value_counts()
    for quality, count in attr_q.items():
        print(f"  {quality}: {count}")

    print(f"\nScore ranges:")
    print(f"  efficiency_score:            {df_merged['efficiency_score'].min():.1f} — {df_merged['efficiency_score'].max():.1f}")
    print(f"  relative_attractiveness:     {df_merged['relative_attractiveness_score'].min():.1f} — {df_merged['relative_attractiveness_score'].max():.1f}")

    print("="*70 + "\n")

    return df_merged


if __name__ == "__main__":
    run()
