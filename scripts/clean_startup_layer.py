# clean_startup_layer.py
# Propósito: Leer, validar, estandarizar y exportar startup_deal_layer.csv
# Ref: instrucciones_v2 — Sección 7.2

import pandas as pd
import numpy as np
from datetime import datetime
import unicodedata
import re
import os

# Mapas de estandarización (igual que en clean_market_layer.py)
REGION_MAP = {
    "brazil": "brazil", "brasil": "brazil",
    "mexico": "mexico_ca", "méxico": "mexico_ca",
    "central america": "mexico_ca",
    "colombia": "andean", "peru": "andean", "perú": "andean",
    "ecuador": "andean", "bolivia": "andean",
    "argentina": "south_cone", "chile": "south_cone", "uruguay": "south_cone",
    "caribbean": "caribbean", "caribe": "caribbean",
    "latam": "latam", "latin america": "latam", "latinoamérica": "latam",
    "united states": "north_america", "us": "north_america",
    "global": "global", "all_sectors": "global",
}

SECTOR_MAP = {
    "saas": "saas", "enterprise software": "saas",
    "fintech": "fintech",
    "logtech": "logtech", "supply chain": "logtech",
    "healthtech": "healthtech", "health": "healthtech",
    "edtech": "edtech",
    "proptech": "proptech",
    "agritech": "agritech",
    "all_sectors": "all_sectors", "general": "all_sectors",
}

STAGE_MAP = {
    "pre-seed": "pre_seed", "pre_seed": "pre_seed",
    "seed": "seed",
    "series a": "series_a", "serie a": "series_a",
    "series b": "series_b", "serie b": "series_b",
    "series c+": "series_c_plus",
    "all_stages": "all_stages",
}


def standardize_value(value, mapping, default="other"):
    """Estandariza un valor contra un mapping."""
    if not value or not isinstance(value, str):
        return default

    value_lower = value.lower().strip()

    for key, mapped_val in mapping.items():
        if key.lower() in value_lower or value_lower == key.lower():
            return mapped_val

    return value


def normalize_startup_name(name):
    """Normaliza nombre de startup a minúsculas sin caracteres especiales."""
    if not isinstance(name, str):
        return ""

    # NFD normalization y limpieza ASCII
    name = unicodedata.normalize("NFKD", name)
    name = name.encode("ascii", "ignore").decode("ascii")

    # Minúsculas y espacios
    name = name.lower().strip()

    # Remover caracteres especiales
    name = re.sub(r"[^a-z0-9\s]", "", name)

    # Remover espacios múltiples y reemplazar con underscore
    name = re.sub(r"\s+", "_", name)

    return name


def run():
    """Función principal que limpia y exporta startup_deal_layer.csv."""

    # Detectar ruta
    if os.path.exists("data/master/startup_deal_layer.xlsx"):
        input_file = "data/master/startup_deal_layer.xlsx"
    else:
        input_file = "../../data/master/startup_deal_layer.xlsx"

    print("\n[clean_startup_layer] Iniciando limpieza de startups...")
    print(f"Leyendo: {input_file}")

    try:
        df = pd.read_excel(input_file)
    except Exception as e:
        print(f"ERROR: No se puede leer {input_file}: {e}")
        return

    initial_rows = len(df)
    print(f"Filas iniciales: {initial_rows}")

    # Estandarizar valores categóricos
    print("\n[STANDARDIZATION] Estandarizando valores...")

    if "country" in df.columns:
        df["region"] = df["country"].apply(lambda x: standardize_value(x, REGION_MAP, "other"))

    if "sector" in df.columns:
        df["sector"] = df["sector"].apply(lambda x: standardize_value(x, SECTOR_MAP, "other"))

    if "round_stage" in df.columns:
        df["round_stage"] = df["round_stage"].apply(lambda x: standardize_value(x, STAGE_MAP, "undisclosed"))

    # Convertir fechas
    print("\n[FECHA] Convertiendo dates...")
    for date_col in ["data_reference_date", "data_entry_date", "last_updated",
                     "last_round_date", "next_round_expected_date"]:
        if date_col in df.columns:
            df[date_col] = pd.to_datetime(df[date_col], errors="coerce")

    # Convertir valores numéricos
    print("\n[NUMERICO] Convertiendo a float...")
    numeric_cols = [
        "arr_usd", "mrr_usd", "revenue_usd", "growth_mom", "growth_yoy",
        "gross_margin", "burn_rate_usd", "runway_months", "cash_balance_usd",
        "cac_usd", "ltv_usd", "ltv_cac_ratio", "cac_payback_months",
        "nrr", "grr", "churn_rate", "active_customers", "headcount",
        "arr_per_employee", "round_amount_usd", "valuation_pre_money_usd",
        "valuation_post_money_usd", "ownership_target", "ownership_actual",
        "investment_amount_usd", "entry_multiple", "thesis_fit_score",
        "priority_score", "burn_multiple"
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Normalizar startup_name
    print("\n[NORMALIZACION] Normalizando nombres de startups...")
    if "startup_name" in df.columns:
        df["normalized_startup_name"] = df["startup_name"].apply(normalize_startup_name)

    # Calcular campos derivados
    print("\n[CAMPOS_DERIVADOS] Calculando campos derivados...")

    # arr_per_employee
    if "arr_per_employee" not in df.columns or df["arr_per_employee"].isna().all():
        mask = df["arr_usd"].notna() & df["headcount"].notna() & (df["headcount"] > 0)
        df.loc[mask, "arr_per_employee"] = df.loc[mask, "arr_usd"] / df.loc[mask, "headcount"]

    # entry_multiple
    if "entry_multiple" not in df.columns or df["entry_multiple"].isna().all():
        mask = df["valuation_post_money_usd"].notna() & df["arr_usd"].notna() & (df["arr_usd"] > 0)
        df.loc[mask, "entry_multiple"] = df.loc[mask, "valuation_post_money_usd"] / df.loc[mask, "arr_usd"]

    # burn_multiple
    if "burn_multiple" not in df.columns or df["burn_multiple"].isna().all():
        mask = df["burn_rate_usd"].notna() & df["arr_usd"].notna() & (df["arr_usd"] > 0)
        df.loc[mask, "burn_multiple"] = (df.loc[mask, "burn_rate_usd"] * 12) / df.loc[mask, "arr_usd"]

    # ltv_cac_ratio
    if "ltv_cac_ratio" not in df.columns or df["ltv_cac_ratio"].isna().any():
        mask = df["ltv_cac_ratio"].isna() & df["ltv_usd"].notna() & df["cac_usd"].notna() & (df["cac_usd"] > 0)
        df.loc[mask, "ltv_cac_ratio"] = df.loc[mask, "ltv_usd"] / df.loc[mask, "cac_usd"]

    # Exportar
    output_file = "data/processed/startup_deal_layer.csv"
    print(f"\n[EXPORT] Exportando a {output_file}...")
    df.to_csv(output_file, index=False)

    # Resumen
    print("\n" + "="*70)
    print("RESUMEN — clean_startup_layer.py")
    print("="*70)
    print(f"Filas exportadas:      {len(df)}")
    print(f"Columnas:              {len(df.columns)}")
    print(f"\nNulls en columnas críticas:")
    critical = ["startup_id", "startup_name", "sector", "round_stage", "data_reference_date", "deal_status"]
    for col in critical:
        if col in df.columns:
            null_pct = (df[col].isna().sum() / len(df)) * 100
            print(f"  {col}: {df[col].isna().sum():3d} ({null_pct:5.1f}%)")

    print(f"\nCampos derivados calculados:")
    print(f"  arr_per_employee:    {df['arr_per_employee'].notna().sum()} valores")
    print(f"  entry_multiple:      {df['entry_multiple'].notna().sum()} valores")
    print(f"  burn_multiple:       {df['burn_multiple'].notna().sum()} valores")
    print(f"  ltv_cac_ratio:       {df['ltv_cac_ratio'].notna().sum()} valores")

    print(f"\nSectores únicos: {df['sector'].nunique()}")
    print(f"Países únicos:   {df['country'].nunique()}")
    print(f"Etapas únicas:   {df['round_stage'].nunique()}")
    print(f"Statuses únicos: {df['deal_status'].nunique() if 'deal_status' in df.columns else 'N/A'}")
    print("="*70 + "\n")

    return df


if __name__ == "__main__":
    run()
