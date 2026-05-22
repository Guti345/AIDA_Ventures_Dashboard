# utils_ingest.py
# Propósito: funciones compartidas para todos los scripts de ingesta
# Ref: instrucciones_v2 — Sección 6

import re
import numpy as np
import pandas as pd


def parse_range_value(raw_text: str) -> dict:
    """
    Parsea un string que puede contener un rango numérico.

    Retorna dict con:
      min (float), max (float), mid (float), unit (str), notes (str)

    Ejemplos:
      "8–12x"        → min=8.0,  max=12.0, mid=10.0, unit="x"
      "$100K–$1M"    → min=100000, max=1000000, mid=550000, unit="usd"
      "30–45%"       → min=30.0, max=45.0,  mid=37.5, unit="pct"
      "~$50K"        → min=50000, max=50000, mid=50000, unit="usd"
      "12–18 meses"  → min=12.0, max=18.0,  mid=15.0, unit="months"
      "$19.8M"       → min=19800000, max=19800000, mid=19800000, unit="usd"
    """
    if not raw_text or not isinstance(raw_text, str):
        return {"min": np.nan, "max": np.nan, "mid": np.nan,
                "unit": "text", "notes": str(raw_text) if raw_text else ""}

    text = raw_text.strip()
    notes = text  # siempre guardar el original

    # Detectar unidad
    unit = "text"
    if re.search(r'\$', text):
        unit = "usd"
    elif re.search(r'%', text):
        unit = "pct"
    elif re.search(r'\bx\b|x$', text, re.IGNORECASE):
        unit = "x"
    elif re.search(r'mes(es)?|months?', text, re.IGNORECASE):
        unit = "months"
    elif re.search(r'días?|days?', text, re.IGNORECASE):
        unit = "days"

    def to_number(s: str) -> float:
        """Convierte texto como '$1.5M', '100K', '3.2B' a float."""
        s = s.replace(",", "").replace("$", "").strip()
        multiplier = 1
        if s.upper().endswith("B"):
            multiplier = 1_000_000_000
            s = s[:-1]
        elif s.upper().endswith("M"):
            multiplier = 1_000_000
            s = s[:-1]
        elif s.upper().endswith("K"):
            multiplier = 1_000
            s = s[:-1]
        try:
            return float(s) * multiplier
        except:
            return np.nan

    # Limpiar prefijos (~, >, <, ≥, ≤, ▸)
    clean = re.sub(r'[~≈><≥≤▸▹]', '', text)
    clean = re.sub(r'%|x\b|\$|meses|months|días|days|/mes|/year|anual', '',
                   clean, flags=re.IGNORECASE).strip()

    # Detectar separador de rango: –, -, –, to, a
    sep_pattern = r'[–\-—]|(?:\s+to\s+)|(?:\s+a\s+)'
    parts = re.split(sep_pattern, clean, maxsplit=1)

    if len(parts) == 2:
        lo = to_number(parts[0].strip())
        hi = to_number(parts[1].strip())
        if not np.isnan(lo) and not np.isnan(hi):
            return {"min": lo, "max": hi,
                    "mid": round((lo + hi) / 2, 4),
                    "unit": unit, "notes": notes}

    # Valor único
    single = to_number(clean.split()[0] if clean.split() else clean)
    if not np.isnan(single):
        return {"min": single, "max": single,
                "mid": single, "unit": unit, "notes": notes}

    # No parseable
    return {"min": np.nan, "max": np.nan, "mid": np.nan,
            "unit": "text", "notes": notes}


def parse_reference_date(text: str):
    """
    Regla: '2024' o 'Q4 2024' → 2024-12-31
           '2025'              → 2025-01-01
           'Q1 2025'           → 2025-03-31
           sin fecha           → NaT
    """
    if not text or not isinstance(text, str):
        return pd.NaT

    quarter_map = {"Q1": "03-31", "Q2": "06-30", "Q3": "09-30", "Q4": "12-31"}
    for q, suffix in quarter_map.items():
        m = re.search(rf'{q}\s*(\d{{4}})', text, re.IGNORECASE)
        if m:
            return pd.to_datetime(f"{m.group(1)}-{suffix}")

    m = re.search(r'(20\d{2})', text)
    if m:
        year = int(m.group(1))
        if year == 2025:
            return pd.to_datetime(f"{year}-01-01")
        return pd.to_datetime(f"{year}-12-31")

    return pd.NaT


def detect_section_sector(marker_text: str, sector_map: dict = None) -> tuple:
    """
    Dado el texto de un marcador ▸, retorna (sector, subsector).
    Ej: '▸  SaaS / Enterprise Software — ARR Multiples'
        → ('saas', 'enterprise_software')
    """
    if not marker_text:
        return ("other", "")

    text = marker_text.lower().replace("▸", "").strip()

    # Diccionario simple de detección
    if "saas" in text or "enterprise software" in text:
        return ("saas", "")
    elif "fintech" in text:
        return ("fintech", "")
    elif "logtech" in text or "supply chain" in text or "logistics" in text:
        return ("logtech", "")
    elif "healthtech" in text or "health" in text:
        return ("healthtech", "")
    elif "edtech" in text:
        return ("edtech", "")

    return ("other", text[:50])


# Catálogos de estandarización
REGION_MAP = {
    "brazil": "brazil",
    "brasil": "brazil",
    "mexico": "mexico_ca",
    "méxico": "mexico_ca",
    "central america": "mexico_ca",
    "colombia": "andean",
    "peru": "andean",
    "perú": "andean",
    "ecuador": "andean",
    "bolivia": "andean",
    "argentina": "south_cone",
    "chile": "south_cone",
    "uruguay": "south_cone",
    "caribbean": "caribbean",
    "caribe": "caribbean",
    "latam": "latam",
    "latin america": "latam",
    "latinoamérica": "latam",
    "united states": "north_america",
    "us": "north_america",
    "ee. uu.": "north_america",
    "global": "global",
}

SECTOR_MAP = {
    "saas": "saas",
    "enterprise software": "saas",
    "enterprise saas": "saas",
    "fintech": "fintech",
    "logtech": "logtech",
    "supply chain": "logtech",
    "logistics": "logtech",
    "healthtech": "healthtech",
    "health": "healthtech",
    "edtech": "edtech",
    "all sectors": "all_sectors",
    "general": "all_sectors",
}

STAGE_MAP = {
    "pre-seed": "pre_seed",
    "pre_seed": "pre_seed",
    "preseed": "pre_seed",
    "seed": "seed",
    "series a": "series_a",
    "serie a": "series_a",
    "series b": "series_b",
    "serie b": "series_b",
    "series c": "series_c_plus",
    "serie c": "series_c_plus",
    "series c+": "series_c_plus",
    "late growth": "series_c_plus",
    "public comps": "public",
    "m&a exit": "exit",
}


def standardize_value(value: str, mapping: dict, default: str = "other") -> str:
    """Estandariza un valor contra un mapping."""
    if not value or not isinstance(value, str):
        return default

    value_lower = value.lower().strip()

    for key, mapped_val in mapping.items():
        if key.lower() in value_lower:
            return mapped_val

    return default


def standardize_region(country: str) -> str:
    """Estandariza país a región."""
    if not country or not isinstance(country, str):
        return "other"

    country_lower = country.lower().strip()

    for key, region in REGION_MAP.items():
        if key.lower() in country_lower:
            return region

    return "other"


def standardize_stage(stage: str) -> str:
    """Estandariza etapa de ronda."""
    if not stage or not isinstance(stage, str):
        return "undisclosed"

    stage_lower = stage.lower().strip()

    for key, mapped_val in STAGE_MAP.items():
        if key.lower() in stage_lower:
            return mapped_val

    return "undisclosed"
