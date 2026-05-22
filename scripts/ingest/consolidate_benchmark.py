# consolidate_benchmark.py
# Propósito: Consolida las 3 fuentes de ingesta, deduplica y exporta a Excel
# Ref: instrucciones_v2 — Sección 6

import pandas as pd
import numpy as np
from datetime import datetime
import os
import sys

# Agregar scripts al path para importarlos
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ingest_source_1 import run as run_source_1
from ingest_source_2 import run as run_source_2
from ingest_source_3 import run as run_source_3

OUTPUT_COLUMNS = [
    "record_id", "data_entry_date", "data_reference_date", "source_name",
    "source_type", "country", "region", "sector", "subsector", "round_stage",
    "metric_category", "metric_name", "metric_value_min", "metric_value_max",
    "metric_value_mid", "metric_unit", "currency", "investment_amount_usd",
    "valuation_pre_money_usd", "valuation_post_money_usd", "revenue_multiple",
    "growth_rate", "round_size_usd", "time_between_rounds_months",
    "graduation_rate", "deal_count", "startup_count", "notes",
    "confidence_level", "last_updated"
]


def run():
    """Ejecuta la consolidación completa."""

    print("\n" + "="*70)
    print("CONSOLIDACIÓN DE BENCHMARKS — AIDA Market Intelligence v1")
    print("="*70 + "\n")

    # Crear carpeta de caché si no existe
    cache_dir = "data/processed/.ingest_cache"
    os.makedirs(cache_dir, exist_ok=True)

    # Correr scripts de ingesta
    print("[1/3] Corriendo ingest_source_1.py...")
    df1 = run_source_1()
    count1 = len(df1) if df1 is not None else 0

    print("[2/3] Corriendo ingest_source_2.py...")
    df2 = run_source_2()
    count2 = len(df2) if df2 is not None else 0

    print("[3/3] Corriendo ingest_source_3.py...")
    df3 = run_source_3()
    count3 = len(df3) if df3 is not None else 0

    # Concatenar
    print("\n[CONCAT] Concatenando DataFrames...")
    dfs = [df for df in [df1, df2, df3] if df is not None and len(df) > 0]

    if not dfs:
        print("ERROR: No data generated from any source!")
        return

    df = pd.concat(dfs, ignore_index=True)
    initial_count = len(df)

    # Asegurar que todas las columnas existen
    for col in OUTPUT_COLUMNS:
        if col not in df.columns:
            df[col] = np.nan

    # Reordenar columnas
    df = df[OUTPUT_COLUMNS]

    # Deduplicar
    print("[DEDUP] Deduplicando registros...")
    dedup_cols = ["source_name", "metric_name", "round_stage", "country",
                  "sector", "data_reference_date"]
    df_dedup = df.drop_duplicates(subset=dedup_cols, keep="first")
    dup_count = initial_count - len(df_dedup)

    # Regenerar record_ids
    print("[RECORD_ID] Generando record_ids únicos...")
    df_dedup["record_id"] = [f"BM_S{i//100 + 1}_{i%100:04d}" for i in range(len(df_dedup))]

    # Asignar data_entry_date y last_updated
    today = datetime.now().date()
    df_dedup["data_entry_date"] = today
    df_dedup["last_updated"] = today

    # Validar tipos numéricos
    for col in ["metric_value_min", "metric_value_max", "metric_value_mid",
                "deal_count", "startup_count"]:
        if col in df_dedup.columns:
            df_dedup[col] = pd.to_numeric(df_dedup[col], errors="coerce")

    # Exportar a Excel
    output_file = "data/master/market_benchmark_layer.xlsx"
    print(f"\n[EXPORT] Exportando a {output_file}...")
    df_dedup.to_excel(output_file, index=False, sheet_name="benchmarks")

    # Calcular estadísticas
    unique_sectors = df_dedup["sector"].dropna().unique().tolist()
    unique_countries = df_dedup["country"].dropna().unique().tolist()
    unique_stages = df_dedup["round_stage"].dropna().unique().tolist()
    unique_metrics = df_dedup["metric_name"].dropna().unique().tolist()

    # Imprimir resumen
    print("\n" + "="*70)
    print("CONSOLIDACIÓN COMPLETADA")
    print("="*70)
    print(f"\nTotal filas:          {len(df_dedup)}")
    print(f"Filas source_1:       {count1}")
    print(f"Filas source_2:       {count2}")
    print(f"Filas source_3:       {count3}")
    print(f"Duplicados eliminados: {dup_count}")
    print(f"\nSectores únicos ({len(unique_sectors)}):     {', '.join(sorted(unique_sectors)[:10])}")
    if len(unique_sectors) > 10:
        print(f"                      ... y {len(unique_sectors)-10} más")
    print(f"\nPaíses únicos ({len(unique_countries)}):     {', '.join(sorted(unique_countries))[:60]}")
    print(f"\nEtapas únicas ({len(unique_stages)}):      {', '.join(sorted(unique_stages))}")
    print(f"\nMétricas únicas ({len(unique_metrics)}):    {', '.join(sorted(unique_metrics)[:20])}")
    if len(unique_metrics) > 20:
        print(f"                      ... y {len(unique_metrics)-20} más")
    print(f"\nArchivo exportado:    {output_file}")
    print("\n" + "="*70 + "\n")

    return df_dedup


if __name__ == "__main__":
    run()
