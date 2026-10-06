from pathlib import Path
import math
import duckdb
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MASTER_P = DATA_DIR / "optifunds_master_spain.parquet"
HOLDINGS_P = DATA_DIR / "optifunds_holdings_spain.parquet"


# ─────────────────────────────────────────────────────────────────────────────
# Utilitats de neteja numèrica i SQL
# ─────────────────────────────────────────────────────────────────────────────

def safe_float(val, default=None):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return default
    try:
        f = float(str(val).replace("%", "").replace(",", ".").strip())
        return None if math.isnan(f) or math.isinf(f) else f
    except Exception:
        return default


def _clean_num_sql(col_expr: str) -> str:
    return f"TRY_CAST(REPLACE(REPLACE(CAST({col_expr} AS VARCHAR), '%', ''), ',', '.') AS DOUBLE)"


def _q(x) -> str:
    return "'" + str(x).replace("'", "''").strip() + "'"


# ─────────────────────────────────────────────────────────────────────────────
# Diccionaris de Detecció Semàntica
# ─────────────────────────────────────────────────────────────────────────────

REGION_KEYWORDS = {
    "spain":    ["ibex", "spain", "españa", "espana", "iberia", "bolsa española", "bolsa espanola", "acciones españolas", "acciones espanolas"],
    "japan":    ["japan", "japon", "japón", "topix", "nikkei"],
    "china":    ["china", "greater china", "csi 300", "csi300", "hang seng"],
    "india":    ["india", "nifty", "sensex"],
    "emerging": ["emerging markets", "emerging market", "em equity", "msci em", "mercados emergentes"],
    "europe":   ["europe", "europa", "stoxx", "eurostoxx", "eurozone", "euroland", "dax", "cac 40", "ftse 100", "emua", "emu "],
    "usa":      ["s&p 500", "s&p500", "sp500", "nasdaq", "russell 2000", "russell 1000", "russell", "eeuu", "ee.uu", "us equity", "united states", "dow jones", "wall street"],
    "world":    ["world", "global", "developed markets", "developed market", "all-country", "all country", "acwi"],
}

SECTOR_KEYWORDS = {
    "financials":   ["sector financiero", "financial services", "financial sector", "sector financials"],
    "healthcare":   ["healthcare", "health", "pharma", "biotech", "salud", "medical"],
    "technology":   ["technology", "tech ", "software", "semiconductor", "digital economy", "tecnologia", "tecnología"],
    "energy":       ["energy sector", "clean energy", "oil & gas"],
    "utilities":    ["utilities", "utility"],
    "consumer":     ["consumer staples", "consumer discretionary"],
    "real_estate":  ["real estate", "reit", "property"],
    "industrials":  ["industrial", "industrials"],
    "materials":    ["materials", "mining", "basic resources"],
    "telecom":      ["telecom", "communication services"],
}

STYLE_KEYWORDS = [
    "small cap", "small-cap", "smallcap", "sm&mid cap", "small & mid",
    "mid cap", "mid-cap", "midcap",
    "large cap", "large-cap", "largecap",
    "dividend", "dividendos", "high dividend", "income",
    "growth", "value", "quality", "momentum",
    "min vol", "minvol", "low vol", "low volatility",
]

THEME_KEYWORDS = ["esg", "sri", "sustainable", "climate", "green", "water", "clean energy"]

INDEX_PROVIDERS = {
    "msci":   ["msci"],
    "sp":     ["s&p ", "s&p500", "s&p 500", "sp 500", "sp500"],
    "ftse":   ["ftse"],
    "stoxx":  ["stoxx", "eurostoxx"],
    "russell":["russell"],
    "nasdaq": ["nasdaq"],
    "ibex":   ["ibex", "ibex 35", "ibex35"],
    "markit": ["markit", "iboxx"],
}


# ─────────────────────────────────────────────────────────────────────────────
# Fingerprint / Extracció Semàntica
# ─────────────────────────────────────────────────────────────────────────────

def extract_index_fingerprint(fund_name: str, asset_class: str = "") -> dict:
    """
    Extreu del nom del fons i de la seva categoria oficial (Asset_Class)
    una empremta fiduciària (regió, classe d'actius, sector, estil, tema i proveïdor).
    Evita falsos positius comuns (com associar 'Kutxabank' o 'CaixaBank' al sector financer).
    """
    n = (fund_name or "").lower().strip()
    c = (asset_class or "").lower().strip()

    # 1. Classe d'actius principal (Broad Asset Class)
    broad_asset_class = None
    if "equity" in c or any(w in n for w in ["acciones", "bolsa", "renta variable", "equity", "stock"]):
        broad_asset_class = "equity"
    elif "bond" in c or "fixed" in c or any(w in n for w in ["bonos", "renta fija", "bond", "obligaciones", "fixed income"]):
        broad_asset_class = "bond"
    elif "money" in c or any(w in n for w in ["monetario", "money market", "liquidez"]):
        broad_asset_class = "money_market"
    elif "commodit" in c or "commodity" in n:
        broad_asset_class = "commodity"
    elif "real estate" in c or "reit" in c:
        broad_asset_class = "real_estate"
    elif "mixed" in c or "balanced" in c or "flexible" in c:
        broad_asset_class = "mixed"
    elif "alternative" in c or "absolute return" in c:
        broad_asset_class = "alternative"

    # 2. Regió Geogràfica
    region = None
    # Prioritat a Asset_Class
    if "spain" in c or "iberia" in c:
        region = "spain"
    elif "equity us" in c or "united states" in c:
        region = "usa"
    elif "europe" in c or "eurozone" in c or any(x in c for x in ["france", "germany", "italy", "nordic", "switzerland", "uk"]):
        region = "europe"
    elif "japan" in c:
        region = "japan"
    elif "china" in c or "greater china" in c:
        region = "china"
    elif "india" in c:
        region = "india"
    elif "emerging" in c or "latin america" in c or "asia" in c:
        region = "emerging"
    elif "global" in c or "world" in c:
        region = "world"

    # Si no s'ha deduït d'Asset_Class, cercar per nom
    if not region:
        for r_key, kws in REGION_KEYWORDS.items():
            if any(k in n for k in kws):
                region = r_key
                break

    # 3. Sector
    sector = None
    if "information technology" in c:
        sector = "technology"
    elif "sector financials" in c:
        sector = "financials"
    elif "healthcare" in c or "biotechnology" in c:
        sector = "healthcare"
    elif "energy" in c:
        sector = "energy"
    elif "utilities" in c:
        sector = "utilities"
    elif "consumer" in c:
        sector = "consumer"
    elif "industrials" in c:
        sector = "industrials"
    elif "materials" in c:
        sector = "materials"
    elif "real estate" in c:
        sector = "real_estate"
    elif "communication services" in c:
        sector = "telecom"

    # Només comprovar paraules del nom si no és fons país com Espanya (evitar 'bank' en gestores)
    if not sector and region != "spain":
        for s_key, kws in SECTOR_KEYWORDS.items():
            if any(k in n for k in kws):
                sector = s_key
                break

    # 4. Estil
    style = None
    for st in STYLE_KEYWORDS:
        if st in n or st in c:
            if "small" in st:
                style = "small cap"
            elif "mid" in st:
                style = "mid cap"
            elif "large" in st:
                style = "large cap"
            elif "dividend" in st or "income" in st:
                style = "dividend"
            else:
                style = st
            break

    # 5. Tema
    theme = None
    for th in THEME_KEYWORDS:
        if th in n or th in c:
            theme = th
            break

    # 6. Proveïdor d'índex
    index_provider = None
    for prov, kws in INDEX_PROVIDERS.items():
        if any(k in n for k in kws):
            index_provider = prov
            break

    return {
        "broad_asset_class": broad_asset_class,
        "region": region,
        "sector": sector,
        "style": style,
        "theme": theme,
        "index_provider": index_provider,
        "is_valid": bool(region or sector or style or broad_asset_class),
    }


def _sql_keyword(col_expr: str, kw: str) -> str:
    kw_clean = kw.replace("'", "''").lower()
    if kw_clean in ("usa", "sp"):
        if kw_clean == "sp":
            return f"(LOWER({col_expr}) LIKE '%s&p%' OR LOWER({col_expr}) LIKE '% s&p %')"
        return (
            f"(LOWER({col_expr}) LIKE '% usa%' "
            f"OR LOWER({col_expr}) LIKE '%usa %' "
            f"OR LOWER({col_expr}) LIKE '% usa %')"
        )
    return f"LOWER({col_expr}) LIKE '%{kw_clean}%'"


def build_fp_sql_conditions(fp: dict, name_col: str, relax_sector: bool = False) -> str:
    """Compatibilitat amb versions prèvies de la funció."""
    conds = []
    if fp.get("region"):
        r_kws = REGION_KEYWORDS.get(fp["region"], [fp["region"]])
        sub_c = " OR ".join([f"LOWER({name_col}) LIKE '%{k}%'" for k in r_kws])
        conds.append(f"({sub_c})")
    if fp.get("sector") and not relax_sector:
        s_kws = SECTOR_KEYWORDS.get(fp["sector"], [fp["sector"]])
        sub_c = " OR ".join([f"LOWER({name_col}) LIKE '%{k}%'" for k in s_kws])
        conds.append(f"({sub_c})")
    if not conds:
        return ""
    return " AND " + " AND ".join(conds)


# ─────────────────────────────────────────────────────────────────────────────
# Cerca Principal d'Alternatives (Smart Switch Engine)
# ─────────────────────────────────────────────────────────────────────────────

def find_cheaper_alternatives(
    query_fund: str,
    min_overlap: float = 0.0,
    relax_sector: bool = False,
):
    """
    Cerca alternatives d'inversió indexades i ETFs autèntics per a un fons actiu.
    
    Arquitectura Quantitativa en 2 Etapes:
      Etapa 1 (Look-Through Overlap):
        Calcula el solapament real de carteres (∑ min(w_src, w_cand)) entre les posicions
        del fons origen i un univers estricte de vehicles passius (sense palanquejament ni inversos)
        dins de la mateixa categoria/geografia, prioritzant els que superen min_overlap i
        ponderant la fidelitat de la cartera i l'estalvi de comissions.
      Etapa 2 (Fallback Categoria / Fingerprint):
        Si el fons origen no té posicions detallades o cap candidat supera min_overlap,
        retorna els millors vehicles indexats de cost mínim de la mateixa classe d'actius i regió.
    """
    con = duckdb.connect(database=":memory:")
    q_param = query_fund.strip()

    ter_expr = _clean_num_sql('COALESCE("TER_Estimat", "Management_Fee", 1.50)')
    ret_expr = _clean_num_sql('"Return_3Y"')
    cat_expr = "COALESCE(CAST(\"Asset_Class\" AS VARCHAR), '')"
    weight_expr = _clean_num_sql('"Clean_Weight"')

    # ── 1) Recuperar Fons Origen ────────────────────────────────────────────
    src_df = con.execute(
        f"""
        SELECT 
            "Fund Name" AS name,
            COALESCE(CAST("ISIN" AS VARCHAR), CAST("Instrument" AS VARCHAR)) AS isin,
            COALESCE(CAST("RIC" AS VARCHAR), '') AS ric,
            COALESCE(CAST("Instrument" AS VARCHAR), '') AS inst,
            COALESCE({ter_expr}, 1.50) AS ter,
            {ret_expr} AS ret3y,
            {cat_expr} AS asset_class
        FROM read_parquet('{MASTER_P}')
        WHERE LOWER(COALESCE(CAST("ISIN" AS VARCHAR), '')) = LOWER(?)
           OR LOWER(COALESCE(CAST("Instrument" AS VARCHAR), '')) = LOWER(?)
           OR LOWER(COALESCE(CAST("RIC" AS VARCHAR), '')) = LOWER(?)
           OR LOWER(COALESCE(CAST("Fund Name" AS VARCHAR), '')) LIKE LOWER(?)
        LIMIT 1
        """,
        [q_param, q_param, q_param, f"%{q_param}%"],
    ).df()

    if src_df.empty:
        con.close()
        return {
            "error": f"Fons '{query_fund}' no trobat a la base de dades",
            "alternatives": [],
        }

    src = src_df.iloc[0]
    src_isin = str(src["isin"])
    src_name = str(src["name"])
    src_ric = str(src["ric"])
    src_inst = str(src["inst"])
    src_ter = safe_float(src["ter"], 1.50) or 1.50
    src_ret3y = safe_float(src["ret3y"], None)
    src_asset_class = str(src["asset_class"] or "").strip()

    # Perfil semàntic
    fp = extract_index_fingerprint(src_name, src_asset_class)
    broad_cat = fp["broad_asset_class"]
    region = fp["region"]
    sector = fp["sector"]
    style = fp["style"]

    src_ids = [_q(x) for x in [src_isin, src_ric, src_inst]
               if str(x).strip() not in ("", "None", "nan")]
    src_ids_clause = ", ".join(src_ids) if src_ids else _q(src_isin)

    # ── 2) Construcció de Condicions de Compatibilitat ──────────────────────
    scope_conds = []

    # Compatibilitat de classe d'actius
    if broad_cat == "equity":
        scope_conds.append(
            "(LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%equity%' "
            "OR m.\"Asset_Class\" IS NULL OR m.\"Asset_Class\" = 'Unclassified')"
        )
    elif broad_cat == "bond":
        scope_conds.append(
            "(LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%bond%' "
            "OR LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%fixed%')"
        )
    elif broad_cat == "money_market":
        scope_conds.append(
            "LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%money%'"
        )

    # Compatibilitat geogràfica
    if region == "spain":
        scope_conds.append(
            "(m.\"Asset_Class\" IN ('Equity Spain', 'Equity Iberia') "
            "OR LOWER(m.\"Fund Name\") LIKE '%ibex%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%spain%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%espana%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%españa%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%iberia%')"
        )
    elif region == "usa":
        scope_conds.append(
            "(LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%equity us%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%s&p 500%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%sp500%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%s&p%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%nasdaq%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%russell%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%us equity%')"
        )
    elif region == "europe":
        scope_conds.append(
            "(LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%equity europe%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%stoxx%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%eurozone%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%europe%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%europa%')"
        )
    elif region == "world":
        scope_conds.append(
            "(LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%equity global%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%world%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%acwi%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%global%')"
        )
    elif region == "japan":
        scope_conds.append(
            "(LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%equity japan%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%japan%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%topix%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%nikkei%')"
        )
    elif region == "emerging":
        scope_conds.append(
            "(LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%emerging%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%emerging%' "
            "OR LOWER(m.\"Fund Name\") LIKE '%msci em%')"
        )

    # Sector (si no està relaxat)
    if sector and not relax_sector:
        if sector == "technology":
            scope_conds.append(
                "(LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%technology%' "
                "OR LOWER(m.\"Fund Name\") LIKE '%tech%' "
                "OR LOWER(m.\"Fund Name\") LIKE '%information technology%')"
            )
        elif sector == "financials":
            scope_conds.append(
                "(LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%financials%' "
                "OR LOWER(m.\"Fund Name\") LIKE '%financial%')"
            )
        elif sector == "healthcare":
            scope_conds.append(
                "(LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%healthcare%' "
                "OR LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%biotechnology%' "
                "OR LOWER(m.\"Fund Name\") LIKE '%health%' "
                "OR LOWER(m.\"Fund Name\") LIKE '%pharma%')"
            )
        elif sector == "energy":
            scope_conds.append(
                "(LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%energy%' "
                "OR LOWER(m.\"Fund Name\") LIKE '%energy%')"
            )
        elif sector == "utilities":
            scope_conds.append(
                "(LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%utilities%' "
                "OR LOWER(m.\"Fund Name\") LIKE '%utilit%')"
            )

    scope_clause = (" AND " + " AND ".join(scope_conds)) if scope_conds else ""

    # Clàusula base de candidats indexats/ETFs:
    # 1. Menor TER que el fons origen
    # 2. Exclusió estricta de productes apalancats, inversos, curts i estructurats garantits
    # 3. Identificació per termes d'índex i grans gestores passives
    index_filter_sql = f"""
        WHERE COALESCE(CAST(m."ISIN" AS VARCHAR), '') NOT IN ({src_ids_clause})
          AND COALESCE(CAST(m."RIC" AS VARCHAR), '') NOT IN ({src_ids_clause})
          AND COALESCE(CAST(m."Instrument" AS VARCHAR), '') NOT IN ({src_ids_clause})
          AND COALESCE({ter_expr}, 0.15) < {src_ter}
          AND (
              LOWER(m."Fund Name") LIKE '%index%' 
              OR LOWER(m."Fund Name") LIKE '%indice%'
              OR LOWER(m."Fund Name") LIKE '%índice%'
              OR LOWER(m."Fund Name") LIKE '%etf%'
              OR LOWER(m."Fund Name") LIKE '%cotizado%'
              OR LOWER(m."Fund Name") LIKE '%bindex%'
              OR LOWER(m."Fund Name") LIKE '%tracker%'
              OR LOWER(m."Fund Name") LIKE '%ucits%'
              OR LOWER(m."Fund Name") LIKE '%passive%'
              OR LOWER(m."Fund Name") LIKE '%ibex%'
              OR LOWER(m."Fund Name") LIKE '%ishares%'
              OR LOWER(m."Fund Name") LIKE '%vanguard%'
              OR LOWER(m."Fund Name") LIKE '%xtrackers%'
              OR LOWER(m."Fund Name") LIKE '%amundi%'
              OR LOWER(m."Fund Name") LIKE '%spdr%'
              OR LOWER(m."Fund Name") LIKE '%lyxor%'
              OR LOWER(m."Fund Name") LIKE '%invesco%'
              OR LOWER(m."Fund Name") LIKE '%wisdomtree%'
              OR LOWER(m."Fund Name") LIKE '%fidelity%'
              OR LOWER(m."Fund Name") LIKE '%dws invest%'
          )
          AND LOWER(m."Fund Name") NOT LIKE '%lev %'
          AND LOWER(m."Fund Name") NOT LIKE '%leverag%'
          AND LOWER(m."Fund Name") NOT LIKE '%apalancad%'
          AND LOWER(m."Fund Name") NOT LIKE '%2x%'
          AND LOWER(m."Fund Name") NOT LIKE '%3x%'
          AND LOWER(m."Fund Name") NOT LIKE '%short%'
          AND LOWER(m."Fund Name") NOT LIKE '%inverse%'
          AND LOWER(m."Fund Name") NOT LIKE '%ultra%'
          AND LOWER(m."Fund Name") NOT LIKE '%garantiz%'
          AND LOWER(m."Fund Name") NOT LIKE '%rentas%'
          AND COALESCE(CAST(m."Asset_Class" AS VARCHAR), '') NOT IN ('Guaranteed', 'Protected')
          AND COALESCE(CAST(m."Asset_Class" AS VARCHAR), '') NOT LIKE '%Leveraged%'
          AND COALESCE(CAST(m."Asset_Class" AS VARCHAR), '') NOT LIKE '%Short Bias%'
          {scope_clause}
    """

    # ── 3) Etapa 1: Overlap Real de Carteres (Look-Through) ──────────────────
    sql_alternatives = f"""
        WITH 
        src_raw AS (
            SELECT 
                "Holding RIC" AS ric,
                SUM({weight_expr}) AS w
            FROM read_parquet('{HOLDINGS_P}')
            WHERE "Instrument" IN ({src_ids_clause})
              AND "Holding RIC" IS NOT NULL
              AND "Holding RIC" != ''
            GROUP BY 1
        ),
        src_pos AS (
            SELECT ric, w / NULLIF((SELECT SUM(w) FROM src_raw), 0) * 100.0 AS w_src
            FROM src_raw
        ),
        candidates AS (
            SELECT 
                m."Fund Name" AS cand_name,
                COALESCE(CAST(m."ISIN" AS VARCHAR), CAST(m."Instrument" AS VARCHAR)) AS cand_isin,
                COALESCE(CAST(m."RIC" AS VARCHAR), '') AS cand_ric,
                COALESCE(CAST(m."Instrument" AS VARCHAR), '') AS cand_inst,
                COALESCE({ter_expr}, 0.15) AS cand_ter,
                {ret_expr} AS cand_ret3y
            FROM read_parquet('{MASTER_P}') m
            {index_filter_sql}
        ),
        cand_pos_raw AS (
            SELECT 
                c.cand_name, c.cand_isin, c.cand_ric, c.cand_inst,
                c.cand_ter, c.cand_ret3y,
                h."Holding RIC" AS ric,
                SUM({weight_expr}) AS w_raw
            FROM candidates c
            JOIN read_parquet('{HOLDINGS_P}') h
              ON (h."Instrument" = c.cand_isin 
                  OR h."Instrument" = c.cand_ric 
                  OR h."Instrument" = c.cand_inst)
            WHERE h."Holding RIC" IS NOT NULL
              AND h."Holding RIC" != ''
            GROUP BY 1, 2, 3, 4, 5, 6, 7
        ),
        cand_totals AS (
            SELECT cand_isin, SUM(w_raw) AS w_total
            FROM cand_pos_raw
            GROUP BY 1
        ),
        cand_pos AS (
            SELECT 
                cp.cand_name, cp.cand_isin, cp.cand_ter, cp.cand_ret3y,
                cp.ric,
                cp.w_raw / NULLIF(ct.w_total, 0) * 100.0 AS w_cand
            FROM cand_pos_raw cp
            JOIN cand_totals ct ON cp.cand_isin = ct.cand_isin
        ),
        overlap_summary AS (
            SELECT 
                c.cand_name,
                c.cand_isin,
                c.cand_ter,
                c.cand_ret3y,
                ROUND(LEAST(100.0, COALESCE(SUM(LEAST(s.w_src, c.w_cand)), 0.0)), 1) AS overlap,
                ROUND({src_ter} - c.cand_ter, 2) AS ter_savings
            FROM cand_pos c
            JOIN src_pos s ON c.ric = s.ric
            GROUP BY 1, 2, 3, 4
            HAVING LEAST(100.0, COALESCE(SUM(LEAST(s.w_src, c.w_cand)), 0.0)) >= {min_overlap}
        )
        SELECT 
            cand_name,
            cand_isin,
            cand_ter,
            overlap,
            ter_savings,
            cand_ret3y,
            ROUND(overlap * 0.6 + (ter_savings * 20.0) * 0.4, 2) AS score
        FROM overlap_summary
        ORDER BY score DESC, overlap DESC, ter_savings DESC
        LIMIT 5
    """

    used_fallback = False
    try:
        res_df = con.execute(sql_alternatives).df()
    except Exception as e:
        print("SQL_ERROR (alternatives):", repr(e))
        res_df = pd.DataFrame()

    # ── 4) Etapa 2: Fallback (si no hi ha posicions o no superen min_overlap) ──
    if res_df.empty:
        used_fallback = True
        fb_sql = f"""
            SELECT 
                m."Fund Name" AS cand_name,
                COALESCE(CAST(m."ISIN" AS VARCHAR), CAST(m."Instrument" AS VARCHAR)) AS cand_isin,
                COALESCE({ter_expr}, 0.15) AS cand_ter,
                0.0 AS overlap,
                ROUND({src_ter} - COALESCE({ter_expr}, 0.15), 2) AS ter_savings,
                {ret_expr} AS cand_ret3y,
                ROUND(({src_ter} - COALESCE({ter_expr}, 0.15)) * 10.0, 2) AS score
            FROM read_parquet('{MASTER_P}') m
            {index_filter_sql}
            ORDER BY cand_ter ASC, ter_savings DESC
            LIMIT 5
        """
        try:
            res_df = con.execute(fb_sql).df()
        except Exception as e:
            print("SQL_ERROR (fallback):", repr(e))
            res_df = pd.DataFrame()

    con.close()

    # ── 5) Sanititzar registres ─────────────────────────────────────────────
    clean_records = []
    for _, r in res_df.iterrows():
        c_ter = safe_float(r.get("cand_ter"), 0.15) or 0.15
        savings = safe_float(r.get("ter_savings"), max(src_ter - c_ter, 0.0))
        ov = safe_float(r.get("overlap"), 0.0) or 0.0
        c_ret = safe_float(r.get("cand_ret3y"), None)
        gap = (
            round(c_ret - src_ret3y, 2)
            if (c_ret is not None and src_ret3y is not None)
            else None
        )
        clean_records.append({
            "cand_name": str(r["cand_name"]),
            "cand_isin": str(r["cand_isin"]),
            "cand_ter": round(c_ter, 2),
            "ter_savings": round(savings, 2) if savings is not None else round(max(src_ter - c_ter, 0.0), 2),
            "overlap": round(ov, 1),
            "cand_ret3y": round(c_ret, 2) if c_ret is not None else None,
            "ret_gap_3y": gap,
        })

    # ── 6) Missatge i estat ─────────────────────────────────────────────────
    status = "ok"
    message = None

    if not clean_records:
        if src_ter <= 0.30:
            status = "already_optimal"
            message = (
                f"El fons analitzat ja compta amb una comissió molt reduïda ({round(src_ter, 2)}% TER). "
                f"No s'han detectat alternatives passives significativament més econòmiques."
            )
        else:
            status = "no_alternatives"
            message = (
                f"No s'han trobat alternatives indexades del mateix perfil amb TER inferior a {round(src_ter, 2)}%."
            )
    elif used_fallback:
        message = (
            f"No s'han trobat vehicles amb un solapament de cartera superior al {min_overlap}%. "
            f"Es mostren les alternatives indexades amb menor cost de la mateixa categoria."
        )

    return {
        "source_name": src_name,
        "source_isin": src_isin,
        "source_ter": round(src_ter, 2),
        "source_ret3y": round(src_ret3y, 2) if src_ret3y is not None else None,
        "fingerprint": {
            "region": region,
            "sector": sector,
            "style": style,
            "theme": fp.get("theme"),
            "index_provider": fp.get("index_provider"),
        },
        "relax_sector": relax_sector,
        "status": status,
        "alternatives": clean_records,
        "message": message,
    }