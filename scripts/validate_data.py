# validate_data.py
# Propósito: Validar integridad de datos y generar reporte de calidad
# Ref: instrucciones_v2 — Sección 7.4

import pandas as pd
import os
from datetime import datetime


def run():
    """Función principal que valida datos y genera reporte."""

    print("\n[validate_data] Iniciando validación de datos...")

    # Cargar CSVs
    if os.path.exists("data/processed/"):
        base_path = "data/processed/"
    else:
        base_path = "../../data/processed/"

    files = {
        "market_benchmark":    f"{base_path}market_benchmark_layer.csv",
        "startup_deal":        f"{base_path}startup_deal_layer.csv",
        "merged_valuation":    f"{base_path}merged_valuation_layer.csv",
    }

    dfs = {}
    for name, path in files.items():
        try:
            dfs[name] = pd.read_csv(path)
            print(f"[OK] Cargado {name}: {len(dfs[name])} filas")
        except Exception as e:
            print(f"[ERROR] No se puede cargar {name}: {e}")
            return

    # Generar reporte
    report = []
    report.append("# Data Quality Report — AIDA Market Intelligence\n")
    report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

    # Sección 1: Conteo de filas
    report.append("## 1. File Summary\n\n")
    report.append("| File | Rows | Columns |\n")
    report.append("|------|------|----------|\n")
    for name, df in dfs.items():
        report.append(f"| {name} | {len(df)} | {len(df.columns)} |\n")
    report.append("\n")

    # Sección 2: Nulls en columnas críticas
    report.append("## 2. Missing Values in Critical Columns\n\n")

    critical_cols_by_file = {
        "market_benchmark": ["record_id", "metric_name", "metric_value_mid", "sector", "round_stage", "data_reference_date"],
        "startup_deal": ["startup_id", "startup_name", "sector", "round_stage", "deal_status", "data_reference_date"],
        "merged_valuation": ["startup_name", "metric_name", "valuation_signal", "benchmark_match_quality", "relative_attractiveness_score"],
    }

    for file_name, df in dfs.items():
        report.append(f"### {file_name}\n\n")
        critical = critical_cols_by_file.get(file_name, [])
        report.append("| Column | Missing | % |\n")
        report.append("|--------|---------|---|\n")

        for col in critical:
            if col in df.columns:
                missing = df[col].isna().sum()
                pct = (missing / len(df)) * 100
                report.append(f"| {col} | {missing} | {pct:.1f}% |\n")
            else:
                report.append(f"| {col} | N/A (column missing) | — |\n")

        report.append("\n")

    # Sección 3: Duplicados
    report.append("## 3. Duplicates\n\n")

    for file_name, df in dfs.items():
        report.append(f"### {file_name}\n\n")

        if file_name == "market_benchmark":
            id_col = "record_id"
        elif file_name == "startup_deal":
            id_col = "startup_record_id"
        else:
            id_col = "startup_record_id"

        if id_col in df.columns:
            dups = df[id_col].duplicated().sum()
            report.append(f"Duplicate {id_col}: {dups}\n\n")
        else:
            report.append(f"ID column '{id_col}' not found\n\n")

    # Sección 4: Fechas
    report.append("## 4. Date Range\n\n")

    for file_name, df in dfs.items():
        report.append(f"### {file_name}\n\n")

        date_cols = [col for col in df.columns if 'date' in col.lower()]
        if date_cols:
            for col in date_cols:
                df[col] = pd.to_datetime(df[col], errors='coerce')
                min_date = df[col].min()
                max_date = df[col].max()
                report.append(f"**{col}**: {min_date} to {max_date}\n\n")
        else:
            report.append("No date columns found\n\n")

    # Sección 5: Distribuciones categóricas
    report.append("## 5. Categorical Distributions\n\n")

    for file_name, df in dfs.items():
        report.append(f"### {file_name}\n\n")

        if file_name == "market_benchmark":
            cat_cols = ["sector", "round_stage", "metric_name"]
        elif file_name == "startup_deal":
            cat_cols = ["sector", "round_stage", "deal_status"]
        else:
            cat_cols = ["valuation_signal", "benchmark_match_quality"]

        for col in cat_cols:
            if col in df.columns:
                report.append(f"**{col}**:\n")
                dist = df[col].value_counts()
                for val, count in dist.items():
                    report.append(f"  - {val}: {count}\n")
                report.append("\n")

    # Sección 6: Alertas
    report.append("## 6. Data Quality Alerts\n\n")

    alerts = []

    # Alerta 1: Columnas con > 50% nulls en campos críticos
    for file_name, df in dfs.items():
        critical = critical_cols_by_file.get(file_name, [])
        for col in critical:
            if col in df.columns:
                null_pct = (df[col].isna().sum() / len(df)) * 100
                if null_pct > 50:
                    alerts.append(f"⚠ {file_name}.{col}: {null_pct:.1f}% missing")

    # Alerta 2: Archivos muy pequeños
    for file_name, df in dfs.items():
        if len(df) < 50:
            alerts.append(f"⚠ {file_name}: Muy pocas filas ({len(df)})")

    if alerts:
        for alert in alerts:
            report.append(f"- {alert}\n")
    else:
        report.append("[OK] No critical alerts detected\n")

    report.append("\n")

    # Exportar reporte
    output_file = "outputs/reports/data_quality_report.md"
    print(f"\n[EXPORT] Exportando reporte a {output_file}...")

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w') as f:
        f.writelines(report)

    print(f"\n[OK] Reporte generado en {output_file}")

    # Imprimir resumen
    print("\n" + "="*70)
    print("RESUMEN — validate_data.py")
    print("="*70)
    for name, df in dfs.items():
        print(f"{name}: {len(df)} filas × {len(df.columns)} columnas")
    print(f"\nAlertas: {len(alerts)}")
    print("="*70 + "\n")


if __name__ == "__main__":
    run()
