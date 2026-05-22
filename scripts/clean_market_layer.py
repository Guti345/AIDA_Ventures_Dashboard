# clean_market_layer.py
# Propósito: Leer, validar, estandarizar y exportar market_benchmark_layer.csv
# Ref: instrucciones_v2 — Sección 7.1

import pandas as pd
import numpy as np
from datetime import datetime
import os

REQUIRED_COLUMNS = [
    "record_id", "data_reference_date", "source_name", "source_type",
    "country", "region", "sector", "round_stage", "metric_name",
    "metric_value_min", "metric_value_max", "metric_value_mid",
    "metric_unit", "confidence_level"
]

REGION_MAP = {
    "brazil": "brazil", "brasil": "brazil",
    "mexico": "mexico_ca", "méxico": "mexico_ca",
    "central america": "mexico_ca",
    "colombia": "andean", "peru": "andean", "perú": "andean",
    "ecuador": "andean", "bolivia": "andean",
    "argentina": "south_cone", "chile": "south_cone", "uruguay": "south_cone",
    "caribbean": "caribbean", "caribe": "caribbean",
    "latam": "latam", "latin america": "latam", "latinoamérica": "latam",
    "united states": "north_america", "us": "north_america", "ee. uu.": "north_america",
    "global": "global", "all_sectors": "global",
}

SECTOR_MAP = {
    "saas": "saas", "enterprise software": "saas", "enterprise saas": "saas",
    "fintech": "fintech",
    "logtech": "logtech", "supply chain": "logtech", "logistics": "logtech",
    "healthtech": "healthtech", "health": "healthtech",
    "edtech": "edtech",
    "proptech": "proptech",
    "agritech": "agritech",
    "cleantech": "cleantech",
    "marketplace": "marketplace",
    "ecommerce": "ecommerce",
    "insurtech": "insurtech",
    "hrtech": "hrtech",
    "legaltech": "legaltech",
    "all_sectors": "all_sectors", "general": "all_sectors",
}

STAGE_MAP = {
    "pre-seed": "pre_seed", "pre_seed": "pre_seed", "preseed": "pre_seed",
    "seed": "seed",
    "series a": "series_a", "serie a": "series_a",
    "series b": "series_b", "serie b": "series_b",
    "series c": "series_c_plus", "serie c": "series_c_plus",
    "series c+": "series_c_plus", "late growth": "series_c_plus",
    "bridge": "bridge",
    "undisclosed": "undisclosed",
    "all_stages": "all_stages",
    "public comps": "public",
    "m&a exit": "exit",
}


def standardize_value(value, mapping, default="other"):
    """Estandariza un valor contra un mapping."""
    if not value or not isinstance(value, str):
        return default

    value_lower = value.lower().strip()

    for key, mapped_val in mapping.items():
        if key.lower() in value_lower or value_lower == key.lower():
            return mapped_val

    return value  # Dejar original si no coincide


def run():
    """Función principal que limpia y exporta market_benchmark_layer.csv."""

    # Detectar ruta del archivo
    if os.path.exists("data/master/market_benchmark_layer.xlsx"):
        input_file = "data/master/market_benchmark_layer.xlsx"
    else:
        input_file = "../../data/master/market_benchmark_layer.xlsx"

    print("\n[clean_market_layer] Iniciando limpieza de benchmarks...")
    print(f"Leyendo: {input_file}")

    try:
        df = pd.read_excel(input_file)
    except Exception as e:
        print(f"ERROR: No se puede leer {input_file}: {e}")
        return

    initial_rows = len(df)
    print(f"Filas iniciales: {initial_rows}")

    # Validar columnas requeridas
    print("\n[VALIDACION] Verificando columnas requeridas...")
    for col in REQUIRED_COLUMNS:
        if col not in df.columns:
            print(f"  ADVERTENCIA: Columna faltante '{col}'")
        else:
            print(f"  OK: {col}")

    # Asegurar que todas las columnas existen
    for col in REQUIRED_COLUMNS:
        if col not in df.columns:
            df[col] = np.nan

    # Estandarizar valores categóricos
    print("\n[STANDARDIZATION] Estandarizando valores...")

    # Country/Region
    if "country" in df.columns:
        df["region"] = df["country"].apply(lambda x: standardize_value(x, REGION_MAP, "other"))

    # Sector
    if "sector" in df.columns:
        df["sector"] = df["sector"].apply(lambda x: standardize_value(x, SECTOR_MAP, "other"))

    # Round Stage
    if "round_stage" in df.columns:
        df["round_stage"] = df["round_stage"].apply(lambda x: standardize_value(x, STAGE_MAP, "undisclosed"))

    # Convertir fechas
    print("\n[FECHA] Convertiendo dates...")
    for date_col in ["data_reference_date", "data_entry_date", "last_updated"]:
        if date_col in df.columns:
            df[date_col] = pd.to_datetime(df[date_col], errors="coerce")

    # Convertir valores numéricos
    print("\n[NUMERICO] Convertiendo a float...")
    for num_col in ["metric_value_min", "metric_value_max", "metric_value_mid"]:
        if num_col in df.columns:
            df[num_col] = pd.to_numeric(df[num_col], errors="coerce")

    # Calcular metric_value_mid = (min + max) / 2 donde sea NaN
    print("\n[CALCULO] Calculando metric_value_mid donde falta...")
    mask = df["metric_value_mid"].isna() & df["metric_value_min"].notna() & df["metric_value_max"].notna()
    df.loc[mask, "metric_value_mid"] = (df.loc[mask, "metric_value_min"] + df.loc[mask, "metric_value_max"]) / 2

    # Eliminar filas donde metric_name y metric_value_mid sean ambos NaN
    print("\n[LIMPIEZA] Eliminando filas vacías...")
    rows_before_clean = len(df)
    df = df.dropna(subset=["metric_name", "metric_value_mid"], how="all")
    rows_after_clean = len(df)
    print(f"  Filas eliminadas: {rows_before_clean - rows_after_clean}")

    # Exportar
    output_file = "data/processed/market_benchmark_layer.csv"
    print(f"\n[EXPORT] Exportando a {output_file}...")
    df.to_csv(output_file, index=False)

    # Resumen
    print("\n" + "="*70)
    print("RESUMEN — clean_market_layer.py")
    print("="*70)
    print(f"Filas exportadas:      {len(df)}")
    print(f"Columnas:              {len(df.columns)}")
    print(f"\nNulls en columnas críticas:")
    critical = ["record_id", "metric_name", "metric_value_mid", "sector", "round_stage", "data_reference_date"]
    for col in critical:
        if col in df.columns:
            null_pct = (df[col].isna().sum() / len(df)) * 100
            print(f"  {col}: {df[col].isna().sum():3d} ({null_pct:5.1f}%)")

    print(f"\nSectores únicos: {df['sector'].nunique()}")
    print(f"Países únicos:   {df['country'].nunique()}")
    print(f"Etapas únicas:   {df['round_stage'].nunique()}")
    print(f"Métricas únicas: {df['metric_name'].nunique()}")
    print("="*70 + "\n")

    return df


if __name__ == "__main__":
    run()
