# AIDA MARKET INTELLIGENCE — INSTRUCCIONES DE PROYECTO v2.0
**Versión:** 2.0 — Documento rector del proyecto  
**Fondo:** AIDA Ventures  
**Fecha:** Mayo 2025  
**Estado:** Listo para ejecución

---

## RESULTADO ESPERADO EN UNA FRASE

Construir una primera versión de una plataforma de inteligencia de inversión para AIDA Ventures, basada en dos bases Excel estructuradas y un dashboard HTML/JS desplegable en GitHub Pages, que permita analizar el mercado latinoamericano de startups, revisar un pipeline de 30 a 100 compañías y comparar oportunidades contra benchmarks para mejorar decisiones de inversión.

---

## 1. OBJETIVO GENERAL

El sistema debe permitir responder tres preguntas estratégicas para AIDA Ventures:

1. **¿Dónde invertir?** Identificar sectores, países, regiones, rondas y verticales con mayor actividad, crecimiento o potencial en Latinoamérica.

2. **¿Cuánto vale?** Comparar startups contra benchmarks de mercado para evaluar si una oportunidad está cara, barata o dentro del rango esperado.

3. **¿Qué oportunidades deben priorizarse?** Evaluar la relación entre desempeño, valuación, eficiencia, crecimiento y fit con la tesis del fondo.

---

## 2. USUARIOS Y USO ESPERADO

- **Usuarios:** Equipo interno de AIDA Ventures (analistas y GPs).
- **Uso principal:** Revisión interna antes de comités de inversión y monitoreo continuo del pipeline.
- **Uso secundario:** Eventualmente podría mostrarse a co-inversores o advisors (el diseño debe contemplar esto sin depender de ello).
- **Pipeline inicial:** Entre 30 y 100 startups.
- **Actualización:** Quien actualice los datos requiere instrucciones claras en el README. El proceso manual (Excel → Python → CSV → GitHub) es aceptable para la primera versión.
- **Idioma del dashboard:** Inglés.

---

## 3. ARQUITECTURA GENERAL

```
Excel manual → Scripts Python de ingesta e ingesta → market_benchmark_layer.xlsx
                                                    → startup_deal_layer.xlsx
                                                              ↓
                                            Scripts Python de limpieza y validación
                                                              ↓
                                        data/processed/ (CSV limpios)
                                                              ↓
                              Dashboard HTML + Arquero.js + Plotly.js
                                                              ↓
                                              GitHub Pages (deployment)
```

**Restricciones de arquitectura:**
- Sin backend ni base de datos SQL.
- Sin dependencias de servidor en runtime.
- Archivos raw y procesados siempre separados.
- Repositorio público en GitHub (v1). Considerar migración a privado si los datos se vuelven sensibles.

---

## 4. ESTRUCTURA DEL REPOSITORIO

```
AIDA-Market-Intelligence/
│
├── README.md                          ← Instrucciones de actualización para GPs
├── index.html                         ← Dashboard principal
├── package.json
│
├── data/
│   ├── raw/
│   │   ├── sources/                   ← Los 5 Excels originales de benchmarks sin tocar
│   │   └── notes/                     ← Notas sobre fuentes y decisiones de datos
│   │
│   ├── master/
│   │   ├── market_benchmark_layer.xlsx ← Base consolidada de benchmarks (editable)
│   │   └── startup_deal_layer.xlsx     ← Base de startups del fondo (editable)
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
│   │   ├── ingest_source_1.py         ← Script de ingesta para cada Excel de benchmarks
│   │   ├── ingest_source_2.py
│   │   ├── ingest_source_3.py
│   │   ├── ingest_source_4.py
│   │   ├── ingest_source_5.py
│   │   └── consolidate_benchmark.py   ← Consolida los 5 en market_benchmark_layer.xlsx
│   │
│   ├── clean_market_layer.py
│   ├── clean_startup_layer.py
│   ├── build_processed_data.py
│   └── validate_data.py
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

---

## 5. ESTRUCTURA DE DATOS

### 5.1 BASE 1 — MARKET BENCHMARK LAYER

**Archivo:** `data/master/market_benchmark_layer.xlsx`  
**Origen:** Consolidado a partir de los 5 Excels de fuentes externas e internas.  
**Propósito:** Registrar benchmarks de mercado observables por país, sector, etapa y fecha.

**Columnas obligatorias:**

| Columna | Tipo | Descripción |
|---|---|---|
| record_id | string | Identificador único del registro |
| data_entry_date | date | Fecha en que se cargó el dato |
| data_reference_date | date | Periodo al que corresponde el dato |
| source_name | string | Nombre de la fuente |
| source_type | string | `public_report` / `internal` / `primary_research` |
| country | string | País estandarizado |
| region | string | Región (ver catálogo) |
| sector | string | Sector estandarizado (ver catálogo) |
| subsector | string | Subsector estandarizado |
| round_stage | string | Etapa de ronda (ver catálogo) |
| metric_category | string | Categoría de la métrica |
| metric_name | string | Nombre de la métrica |
| metric_value_min | float | Valor mínimo observado |
| metric_value_max | float | Valor máximo observado |
| metric_value_mid | float | Valor medio (calculado si no existe: (min+max)/2) |
| metric_unit | string | Unidad de la métrica |
| currency | string | Moneda (siempre USD cuando aplique) |
| investment_amount_usd | float | Monto de inversión en USD |
| valuation_pre_money_usd | float | Valuación pre-money en USD |
| valuation_post_money_usd | float | Valuación post-money en USD |
| revenue_multiple | float | Múltiplo de revenue de mercado |
| growth_rate | float | Tasa de crecimiento de referencia |
| round_size_usd | float | Tamaño de ronda en USD |
| time_between_rounds_months | float | Tiempo entre rondas en meses |
| graduation_rate | float | Tasa de graduación entre etapas |
| deal_count | int | Número de deals observados |
| startup_count | int | Número de startups en la muestra |
| notes | string | Notas adicionales |
| confidence_level | string | `high` / `medium` / `low` |
| last_updated | date | Fecha de última actualización del registro |

---

### 5.2 BASE 2 — STARTUP DEAL LAYER

**Archivo:** `data/master/startup_deal_layer.xlsx`  
**Propósito:** Registrar startups revisadas por el fondo, con múltiples observaciones en el tiempo por startup.

**Identificadores:**
- `startup_id`: Identifica la startup (constante a lo largo del tiempo).
- `startup_record_id`: Identifica cada observación temporal de esa startup.

**Columnas obligatorias:**

| Columna | Tipo | Descripción |
|---|---|---|
| startup_record_id | string | ID único de la observación |
| startup_id | string | ID único de la startup |
| data_entry_date | date | Fecha de carga del registro |
| data_reference_date | date | Periodo al que corresponde la información |
| startup_name | string | Nombre de la startup |
| normalized_startup_name | string | Nombre normalizado (minúsculas, sin espacios) |
| country | string | País |
| region | string | Región |
| city | string | Ciudad |
| sector | string | Sector |
| subsector | string | Subsector |
| business_model | string | Modelo de negocio |
| round_stage | string | Etapa de ronda actual |
| founded_year | int | Año de fundación |
| website | string | URL del sitio web |
| linkedin_url | string | URL de LinkedIn |
| founder_names | string | Nombres de fundadores |
| founder_background | string | Perfil de los fundadores |
| deal_source | string | Origen del deal |
| deal_owner | string | Analista responsable del deal |
| deal_status | string | `pipeline` / `in_review` / `passed` / `portfolio` |
| thesis_fit_score | float | Score de fit con la tesis (0–10, llenado por el analista) |
| priority_score | float | Score de priorización del deal (calculado) |
| arr_usd | float | ARR en USD |
| mrr_usd | float | MRR en USD |
| revenue_usd | float | Revenue total en USD |
| growth_mom | float | Crecimiento mes a mes (%) |
| growth_yoy | float | Crecimiento año a año (%) |
| gross_margin | float | Margen bruto (%) |
| burn_rate_usd | float | Burn mensual en USD |
| runway_months | float | Runway en meses |
| cash_balance_usd | float | Saldo de caja en USD |
| cac_usd | float | CAC en USD |
| ltv_usd | float | LTV en USD |
| ltv_cac_ratio | float | Ratio LTV/CAC |
| cac_payback_months | float | Payback de CAC en meses |
| nrr | float | Net Revenue Retention (%) |
| grr | float | Gross Revenue Retention (%) |
| churn_rate | float | Churn rate (%) |
| active_customers | int | Número de clientes activos |
| headcount | int | Número de empleados |
| arr_per_employee | float | ARR por empleado (calculado si no existe) |
| round_amount_usd | float | Monto de la ronda en USD |
| valuation_pre_money_usd | float | Valuación pre-money en USD |
| valuation_post_money_usd | float | Valuación post-money en USD |
| ownership_target | float | Ownership objetivo del fondo (%) |
| ownership_actual | float | Ownership real del fondo (%) |
| investment_amount_usd | float | Monto invertido en USD |
| entry_multiple | float | Múltiplo de entrada (calculado si no existe) |
| lead_investor | string | Inversor líder de la ronda |
| co_investors | string | Co-inversores |
| last_round_date | date | Fecha de la última ronda |
| next_round_expected_date | date | Fecha esperada de siguiente ronda |
| notes | string | Notas adicionales |
| source_name | string | Fuente de la información |
| confidence_level | string | `high` / `medium` / `low` |
| last_updated | date | Fecha de última actualización |

---

### 5.3 CATÁLOGOS DE ESTANDARIZACIÓN

Los scripts deben estandarizar los valores de texto contra estos catálogos.

**Regiones de Latinoamérica:**
- `south_cone` — Argentina, Chile, Uruguay
- `andean` — Colombia, Perú, Ecuador, Bolivia
- `brazil` — Brasil
- `mexico_ca` — México, Centroamérica
- `caribbean` — Caribe

**Sectores:**
- `fintech`, `saas`, `logtech`, `healthtech`, `edtech`, `proptech`, `agritech`,
  `cleantech`, `marketplace`, `ecommerce`, `insurtech`, `hrtech`, `legaltech`, `other`

**Etapas de ronda:**
- `pre_seed`, `seed`, `series_a`, `series_b`, `series_c_plus`, `bridge`, `undisclosed`

**Tipos de fuente:**
- `public_report`, `internal`, `primary_research`, `press`, `crunchbase`, `dealroom`, `lavca`

---

## 6. PIPELINE DE INGESTA DE BENCHMARKS

Los 5 Excels de fuentes se encuentran en `data/raw/sources/`. Cada uno tiene formato diferente y debe procesarse con un script dedicado.

**Flujo:**

```
data/raw/sources/source_1.xlsx  →  scripts/ingest/ingest_source_1.py  ↘
data/raw/sources/source_2.xlsx  →  scripts/ingest/ingest_source_2.py  →  consolidate_benchmark.py
data/raw/sources/source_3.xlsx  →  scripts/ingest/ingest_source_3.py  →
data/raw/sources/source_4.xlsx  →  scripts/ingest/ingest_source_4.py  →  market_benchmark_layer.xlsx
data/raw/sources/source_5.xlsx  →  scripts/ingest/ingest_source_5.py  ↗
```

**Cada script de ingesta debe:**
1. Leer el Excel fuente.
2. Mapear sus columnas originales al esquema de `market_benchmark_layer`.
3. Asignar `source_name`, `source_type` y `confidence_level` según la fuente.
4. Estandarizar países, regiones, sectores y etapas contra los catálogos.
5. Exportar un DataFrame limpio en el formato estándar.

**`consolidate_benchmark.py` debe:**
1. Leer la salida de cada script de ingesta.
2. Deduplicar registros idénticos (misma fuente, mismo periodo, misma métrica).
3. Asignar `record_id` únicos.
4. Exportar `data/master/market_benchmark_layer.xlsx`.

**Proceso iterativo:** Cada script de ingesta debe poder correrse individualmente para revisar resultados y ajustar el mapeo de columnas antes de consolidar.

---

## 7. SCRIPTS DE LIMPIEZA Y VALIDACIÓN

### 7.1 `scripts/clean_market_layer.py`
- Leer `market_benchmark_layer.xlsx`.
- Validar presencia de columnas obligatorias.
- Estandarizar países, regiones, sectores, subsectores y etapas contra catálogos.
- Convertir fechas a formato ISO 8601.
- Convertir variables numéricas; manejar valores vacíos como `NaN`, no como 0.
- Calcular `metric_value_mid = (metric_value_min + metric_value_max) / 2` cuando solo existen min y max.
- Exportar `data/processed/market_benchmark_layer.csv`.

### 7.2 `scripts/clean_startup_layer.py`
- Leer `startup_deal_layer.xlsx`.
- Validar presencia de columnas obligatorias.
- Estandarizar campos de texto contra catálogos.
- Normalizar `normalized_startup_name`: minúsculas, sin espacios extra, sin caracteres especiales.
- Convertir fechas a formato ISO 8601.
- Convertir variables numéricas; manejar vacíos como `NaN`.
- Calcular `arr_per_employee = arr_usd / headcount` si no existe y hay datos disponibles.
- Calcular `entry_multiple = valuation_post_money_usd / arr_usd` si no existe y hay datos.
- Exportar `data/processed/startup_deal_layer.csv`.

### 7.3 `scripts/build_processed_data.py`
- Leer los CSVs limpios.
- Ejecutar el cruce startup ↔ benchmark con la lógica de 7 niveles (ver Sección 8).
- Calcular los indicadores derivados (ver Sección 9).
- Calcular el `efficiency_score` compuesto (ver Sección 10).
- Calcular el `relative_attractiveness_score` (ver Sección 11).
- Guardar `benchmark_match_level` y `benchmark_match_quality` en cada fila del cruce.
- Exportar `data/processed/merged_valuation_layer.csv`.

### 7.4 `scripts/validate_data.py`
- Revisar columnas faltantes en ambas bases.
- Revisar valores vacíos en campos críticos (`startup_id`, `sector`, `round_stage`, `data_reference_date`).
- Revisar duplicados por `record_id` y `startup_record_id`.
- Revisar formatos de fechas.
- Revisar valores numéricos inválidos (negativos donde no corresponde, fuera de rango).
- Generar reporte de calidad en `outputs/reports/data_quality_report.md`.

---

## 8. LÓGICA DE CRUCE STARTUP ↔ BENCHMARK (7 NIVELES)

El sistema intenta encontrar el benchmark más específico posible. Si no existe, baja al siguiente nivel.

| Nivel | Llaves de cruce | Match quality |
|---|---|---|
| 1 | `country + region + sector + subsector + round_stage + data_reference_date` | `high` |
| 2 | `country + region + sector + round_stage + data_reference_date` | `high` |
| 3 | `region + sector + subsector + round_stage + data_reference_date` | `medium` |
| 4 | `region + sector + round_stage + data_reference_date` | `medium` |
| 5 | `sector + round_stage + data_reference_date` | `low` |
| 6 | `region + sector + round_stage` (sin fecha exacta) | `low` |
| 7 | `sector + round_stage` (sin fecha exacta) | `low` |
| — | Sin match | `no_match` |

**Desempate dentro del mismo nivel (en orden de prioridad):**
1. `data_reference_date` más reciente.
2. `confidence_level` más alto (`high > medium > low`).
3. `source_type` más confiable (definir jerarquía en `methodology.md`).
4. Si persiste el empate: promediar los benchmarks disponibles.

**Columnas que debe guardar el cruce:**
- `benchmark_match_level`: número del nivel (1–7) o `null` si no hay match.
- `benchmark_match_quality`: `high` (niveles 1–2), `medium` (niveles 3–4), `low` (niveles 5–7), `no_match`.
- `benchmark_record_ids`: IDs de los benchmarks usados en el cruce (lista separada por coma).

**Nota:** La lógica de cruce debe documentarse completamente en `docs/methodology.md`.

---

## 9. INDICADORES DERIVADOS (VALUATION LAYER)

Calculados en `build_processed_data.py` y almacenados en `merged_valuation_layer.csv`.

```python
valuation_gap    = startup_valuation_post_money_usd - benchmark_valuation_mid
multiple_gap     = startup_entry_multiple - benchmark_revenue_multiple_mid
growth_gap       = startup_growth_rate - benchmark_growth_rate_mid
efficiency_gap   = startup_efficiency_score - benchmark_efficiency_mid  # ver Sección 10

price_performance_score = startup_growth_yoy / startup_entry_multiple
# Interpretar: mayor es mejor (más crecimiento por cada punto de múltiplo pagado)
```

**Señal de valuación:**
- `cheap`: `multiple_gap < -0.5x` (startup por debajo del benchmark)
- `fair`: `-0.5x ≤ multiple_gap ≤ 0.5x`
- `expensive`: `multiple_gap > 0.5x`
- `no_benchmark`: cuando `benchmark_match_quality = no_match`

---

## 10. EFFICIENCY SCORE (ÍNDICE COMPUESTO 0–100)

Cada sub-dimensión se normaliza contra benchmarks del mismo segmento (sector + etapa) antes de combinarse.

```
efficiency_score =
    0.40 × commercial_efficiency_score
  + 0.35 × capital_efficiency_score
  + 0.25 × operating_efficiency_score
```

**Componentes:**

| Dimensión | Peso | Métricas |
|---|---|---|
| Commercial efficiency | 40% | `ltv_cac_ratio`, `cac_payback_months`, `gross_margin` |
| Capital efficiency | 35% | `burn_rate_usd`, `runway_months`, `burn_multiple` (si calculable) |
| Operating efficiency | 25% | `arr_per_employee`, `revenue_usd / headcount` |

**`burn_multiple`** (si `arr_usd` y `burn_rate_usd` están disponibles):
```python
burn_multiple = burn_rate_usd / (arr_usd / 12)
# Menor es mejor: < 1 = muy eficiente, > 2 = ineficiente
```

**Normalización de métricas:**
- Cada métrica se lleva a escala 0–100 contra el rango P10–P90 del segmento en benchmarks.
- Métricas donde "menor es mejor" (burn, CAC, payback) se invierten antes de normalizar.
- Si una métrica falta, se excluye del promedio ponderado y se redistribuyen los pesos proporcionalmente.

**`efficiency_data_quality`:**
- `high`: las 3 dimensiones tienen al menos 1 métrica disponible.
- `medium`: 2 de 3 dimensiones tienen datos.
- `low`: solo 1 dimensión tiene datos.
- `insufficient`: ninguna dimensión tiene datos.

---

## 11. RELATIVE ATTRACTIVENESS SCORE (0–100)

Score compuesto ponderado que resume el atractivo de una oportunidad para el fondo.

```
relative_attractiveness_score =
    0.30 × growth_score
  + 0.25 × efficiency_score
  + 0.25 × valuation_attractiveness_score
  + 0.10 × retention_score
  + 0.10 × strategic_fit_score
```

**Definición de cada componente:**

| Componente | Peso | Base de cálculo |
|---|---|---|
| Growth score | 30% | Normalización de `growth_yoy` vs benchmark P10–P90 del segmento |
| Efficiency score | 25% | `efficiency_score` de la Sección 10 |
| Valuation attractiveness | 25% | Inverso normalizado de `multiple_gap` (startups más baratas = más atractivas) |
| Retention score | 10% | Normalización de `nrr` y `grr` vs benchmark del segmento |
| Strategic fit score | 10% | Calculado en base a: sector en tesis del fondo, país objetivo, etapa objetivo |

**`strategic_fit_score`** (0–10, luego re-escalado a 0–100):
- `+4` si el sector está en la tesis principal del fondo.
- `+3` si el país o región está en el foco geográfico del fondo.
- `+2` si la etapa es la etapa objetivo del fondo.
- `+1` bonus si cumple los tres criterios anteriores.
- La tesis del fondo debe definirse como un archivo de configuración: `scripts/fund_thesis_config.json`.

**Si algún componente no tiene datos disponibles:** se excluye del cálculo y los pesos restantes se redistribuyen proporcionalmente. Se guarda la variable `attractiveness_data_quality` con los mismos valores que `efficiency_data_quality`.

---

## 12. INTERVALO DE CONFIANZA (P10–P90)

Para cualquier métrica numérica agregada, el sistema calcula:

```
mean, median, min, max, count, std_dev, p10, p90
```

El rango P10–P90 se usa como "intervalo de referencia" del mercado o del segmento. Se usa para:
- Contextualizar una startup dentro de su segmento.
- Normalizar métricas en los scores compuestos.
- Mostrar rangos de referencia en el dashboard.

**Nota metodológica:** Con muestras pequeñas (n < 30), el rango P10–P90 es más honesto que un intervalo de confianza estadístico clásico. Esto debe documentarse en `methodology.md`.

---

## 13. DASHBOARD — ESPECIFICACIONES TÉCNICAS

### Stack tecnológico
- **Python:** `pandas`, `openpyxl`, `numpy`
- **JavaScript:** `Plotly.js` (visualizaciones), `Arquero.js` (filtros y agregaciones en browser)
- **Hosting:** GitHub Pages (estático)
- **Entrada de datos:** archivos CSV en `data/processed/`

### Identidad visual (AIDA Ventures)

```css
--color-primary-dark:    #070B14;
--color-primary-navy:    #132139;
--color-secondary-dark:  #10141C;
--color-text-gray:       #61646D;
--color-muted-gray:      #8A8F98;
--color-border-gray:     #E0E5EB;
--color-light-bg:        #FBFBFC;
--color-white:           #FFFFFF;
--color-accent-blue:     #134E97;
--color-logo-black:      #141414;
```

**Modo:** Dark mode como base (fondos en `--color-primary-dark` y `--color-primary-navy`).  
**Estilo:** Clean, professional, minimalist. Adecuado para decisiones de venture capital.

### Estructura de navegación
```
[Market Reality]  [Startup Review]  [Valuation Layer]  [Portfolio & Returns ↗ coming soon]
```

### Elementos globales del dashboard
- Filtros globales visibles en todas las capas.
- Cards de resumen (KPIs principales).
- Gráficos interactivos con Plotly.js.
- Tablas dinámicas filtradas con Arquero.js.
- Indicador de "Last updated" basado en el CSV más reciente.
- Indicador de fuentes de datos activas.
- Botón de descarga de datos filtrados (CSV).

---

## 14. CAPA 1 — MARKET REALITY

**Fuente de datos:** `market_benchmark_layer.csv`

**Objetivo:** Mostrar el estado del mercado de startups en Latinoamérica por sector, país, región y etapa.

**Filtros:**
`country` / `region` / `sector` / `subsector` / `round_stage` / `metric_name` / `source_name` / `data_reference_date`

**Visualizaciones:**

| Visualización | Tipo de gráfico | Descripción |
|---|---|---|
| Market activity by country | Choropleth o bar chart | Número de deals o inversión total por país |
| Investment by sector | Treemap o bar chart | Volumen de inversión por sector |
| Valuation range by stage | Box plot o range chart | P10–P90 de valuaciones por etapa |
| Revenue multiples by sector | Bar chart con rangos | Múltiplos de revenue P10–P90 por sector |
| Time between rounds | Bar chart | Meses promedio entre rondas por etapa |
| Graduation rates | Bar chart | Tasa de graduación entre etapas |
| Temporal evolution | Line chart | Evolución de indicadores clave en el tiempo |

**Preguntas que responde:**
- ¿Qué sectores están más activos?
- ¿Qué países concentran más inversión?
- ¿Cómo evolucionan los benchmarks en el tiempo?
- ¿Qué verticales parecen más atractivas?

---

## 15. CAPA 2 — STARTUP REVIEW

**Fuente de datos:** `startup_deal_layer.csv`

**Objetivo:** Revisar desempeño de startups del pipeline, tanto de forma individual como agregada.

**Filtros:**
`startup_name` / `country` / `region` / `sector` / `subsector` / `round_stage` / `deal_status` / `deal_owner` / `data_reference_date`

**Vista individual de startup (ficha completa):**
Cuando se selecciona una startup, debe mostrarse:
1. Métricas del momento más reciente registrado.
2. Evolución temporal de métricas clave (ARR, growth, burn, runway) en líneas de tiempo.
3. Comparación contra el promedio del segmento (percentil de la startup en su benchmark).

**Visualizaciones de vista agregada:**

| Visualización | Tipo |
|---|---|
| Startup performance table | Tabla ordenable con todas las métricas clave |
| Startup metric cards | Cards con KPIs del segmento filtrado |
| ARR evolution | Line chart multi-startup |
| Growth evolution | Line chart multi-startup |
| Burn & runway | Bar + line chart |
| Ranking por performance | Bar chart horizontal |
| Promedios por sector / país / etapa | Bar chart agrupado |
| Confidence interval visualization (P10–P90) | Range bar o violin chart |

**Lógica analítica en browser (Arquero.js):**
Cuando el usuario aplique filtros, recalcular en tiempo real:
`mean`, `median`, `min`, `max`, `count`, `std_dev`, `p10`, `p90` para cada métrica numérica.

---

## 16. CAPA 3 — VALUATION LAYER

**Fuente de datos:** `merged_valuation_layer.csv`

**Objetivo:** Comparar startups del pipeline contra benchmarks de mercado para evaluar atractivo de precio y desempeño.

**Filtros:**
`startup_name` / `sector` / `round_stage` / `deal_status` / `benchmark_match_quality` / `valuation_signal`

**Visualizaciones:**

| Visualización | Tipo |
|---|---|
| Startup valuation vs benchmark | Bar chart comparativo |
| Entry multiple vs market multiple | Scatter o bar con benchmark line |
| Growth vs valuation scatter | Scatter plot (size = deal_size, color = signal) |
| Price-performance matrix | 2x2 matrix: growth vs multiple |
| Valuation signal | Color-coded table: cheap / fair / expensive / no_benchmark |
| Relative attractiveness ranking | Bar chart horizontal ordenado por score |
| Efficiency score breakdown | Stacked bar por componente |
| Benchmark match quality indicator | Badge o color por fila |

**Preguntas que responde:**
- ¿La startup está cara o barata frente al mercado?
- ¿El crecimiento justifica la valuación?
- ¿Qué startups tienen mejor relación precio/desempeño?
- ¿Qué deals deberían priorizarse?

---

## 17. CAPA 4 — PORTFOLIO & RETURNS (PLACEHOLDER)

Esta capa no se desarrolla en v1 pero debe aparecer como pestaña deshabilitada con un mensaje "Coming soon".

**La arquitectura debe dejar previstas estas variables futuras en el modelo de datos:**
`capital_deployed`, `capital_reserved`, `ownership_pct`, `follow_on_reserves`,
`moic_expected`, `tvpi_expected`, `dpi_expected`, `exit_scenarios`,
`vintage_year`, `country_exposure`, `sector_exposure`, `stage_exposure`

---

## 18. GITHUB Y DEPLOYMENT

**Repositorio:** `AIDA-Market-Intelligence`  
**Visibilidad:** Público (v1). Considerar privado si los datos de startups se vuelven sensibles.  
**Deployment:** GitHub Pages desde `main` branch, archivo `index.html` en raíz.

**Convención de commits:**
```
Initial project structure
Add benchmark ingestion scripts (sources 1-5)
Add Excel templates for data layers
Add market benchmark cleaning script
Add startup deal cleaning script
Add processed data builder with 7-level matching logic
Add valuation indicators and scoring
Add Market Reality dashboard
Add Startup Review dashboard
Add Valuation Layer dashboard
Configure GitHub Pages deployment
Add documentation (data dictionary, methodology, dashboard spec)
```

**Ramas sugeridas:**
- `main`: versión estable lista para deployment.
- `dev`: desarrollo activo.
- `feature/[nombre]`: por funcionalidad específica.

---

## 19. DOCUMENTACIÓN REQUERIDA

### `docs/data_dictionary.md`
- Definición de cada variable de las dos bases Excel y del merged layer.
- Valores permitidos para campos categóricos (catálogos).
- Unidades de medida.
- Notas sobre cálculos derivados.

### `docs/methodology.md`
- Proceso de ingesta y consolidación de benchmarks.
- Lógica de limpieza y estandarización.
- Lógica completa de cruce startup ↔ benchmark (7 niveles con ejemplos).
- Cálculo de P10–P90 y justificación de su uso vs CI clásico.
- Fórmulas de `valuation_gap`, `multiple_gap`, `growth_gap`, `price_performance_score`.
- Fórmula y componentes del `efficiency_score`.
- Fórmula y componentes del `relative_attractiveness_score`.
- Definición de `valuation_signal` (cheap / fair / expensive).
- Jerarquía de confiabilidad de fuentes (`source_type`).

### `docs/dashboard_spec.md`
- Descripción de cada capa del dashboard.
- Filtros disponibles por capa.
- Gráficos incluidos y datos que usan.
- Preguntas que responde cada capa.
- Archivos CSV que consume cada capa.

---

## 20. README — INSTRUCCIONES PARA GPs

El `README.md` debe incluir una sección clara titulada **"Cómo actualizar los datos"** con los siguientes pasos en lenguaje no técnico:

```
ACTUALIZAR EL DASHBOARD

1. Abre el archivo data/master/startup_deal_layer.xlsx y agrega/edita los registros.
2. Abre el archivo data/master/market_benchmark_layer.xlsx si hay nuevos benchmarks.
3. Abre la terminal y navega a la carpeta del proyecto.
4. Corre: python scripts/validate_data.py   (revisa el reporte de calidad)
5. Corre: python scripts/clean_startup_layer.py
6. Corre: python scripts/clean_market_layer.py
7. Corre: python scripts/build_processed_data.py
8. Haz commit y push de los archivos en data/processed/ a GitHub.
9. El dashboard se actualiza automáticamente en GitHub Pages en ~2 minutos.
```

---

## 21. RESTRICCIONES IMPORTANTES

- No asumir que existe una base SQL ni un backend.
- No depender de ningún servidor en runtime.
- No mezclar archivos `raw` con archivos `processed`.
- No modificar los archivos originales en `data/raw/sources/` sin guardar copia.
- No usar nombres de columnas inconsistentes entre scripts y dashboard.
- No eliminar la dimensión temporal (`data_reference_date`) de ninguna tabla.
- No avanzar al dashboard sin validar primero la estructura de datos.
- No dejar cálculos clave sin documentar en `methodology.md`.
- No construir una arquitectura innecesariamente compleja. La prioridad es funcional y escalable.

---

## 22. ENTREGABLES FINALES

| # | Archivo | Descripción |
|---|---|---|
| 1 | `data/master/market_benchmark_layer.xlsx` | Base consolidada de benchmarks |
| 2 | `data/master/startup_deal_layer.xlsx` | Base de startups del fondo |
| 3 | `data/processed/market_benchmark_layer.csv` | CSV limpio de benchmarks |
| 4 | `data/processed/startup_deal_layer.csv` | CSV limpio de startups |
| 5 | `data/processed/merged_valuation_layer.csv` | CSV cruzado con indicadores derivados |
| 6 | `index.html` | Dashboard principal |
| 7 | `src/css/styles.css` | Estilos con variables AIDA |
| 8 | `src/js/data_loader.js` | Carga de CSVs |
| 9 | `src/js/market_reality.js` | Lógica Capa 1 |
| 10 | `src/js/startup_review.js` | Lógica Capa 2 |
| 11 | `src/js/valuation_layer.js` | Lógica Capa 3 |
| 12 | `src/js/utils.js` | Utilidades compartidas |
| 13 | `scripts/ingest/ingest_source_[1-5].py` | Scripts de ingesta por fuente |
| 14 | `scripts/ingest/consolidate_benchmark.py` | Consolidador de benchmarks |
| 15 | `scripts/clean_market_layer.py` | Limpieza de benchmarks |
| 16 | `scripts/clean_startup_layer.py` | Limpieza de startups |
| 17 | `scripts/build_processed_data.py` | Cruce + indicadores derivados |
| 18 | `scripts/validate_data.py` | Validación y reporte de calidad |
| 19 | `scripts/fund_thesis_config.json` | Configuración de tesis del fondo |
| 20 | `README.md` | Instrucciones para GPs |
| 21 | `docs/data_dictionary.md` | Diccionario de datos |
| 22 | `docs/methodology.md` | Metodología de cálculos |
| 23 | `docs/dashboard_spec.md` | Especificación del dashboard |
| 24 | GitHub Pages deployment | Dashboard accesible en web |

---

## 23. ORDEN DE CONSTRUCCIÓN (INCREMENTAL)

1. Estructura del repositorio + README base.
2. Archivos de configuración: `fund_thesis_config.json` + catálogos de estandarización.
3. Scripts de ingesta de los 5 Excels de benchmarks.
4. Script de consolidación de benchmarks.
5. Plantillas Excel (`market_benchmark_layer.xlsx` y `startup_deal_layer.xlsx`).
6. Scripts de validación y limpieza.
7. Script de construcción del merged layer (cruce 7 niveles + scores).
8. Dashboard base: estructura HTML + estilos AIDA + navegación por tabs.
9. Capa 1: Market Reality.
10. Capa 2: Startup Review.
11. Capa 3: Valuation Layer.
12. Capa 4: Portfolio placeholder.
13. Documentación completa.
14. GitHub Pages deployment.

**Regla:** No avanzar al siguiente paso sin validar el anterior.

---

*Documento generado como resultado del proceso socrático de definición del proyecto. Versión 2.0 — Mayo 2025.*
