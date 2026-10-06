from pathlib import Path
import math
import duckdb
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MASTER_P = DATA_DIR / "optifunds_master_spain.parquet"
HOLDINGS_P = DATA_DIR / "optifunds_holdings_spain.parquet"


# ─────────────────────────────────────────────────────────────────────────────
# Utilitats
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
# Diccionaris de detecció
# ─────────────────────────────────────────────────────────────────────────────

REGION_KEYWORDS = {
    "spain":    ["ibex", "spain", "españa", "iberia"],
    "japan":    ["japan", "topix", "nikkei"],
    "china":    ["china", "greater china", "csi 300", "csi300", "hang seng"],
    "india":    ["india", "nifty", "sensex"],
    "emerging": ["emerging markets", "emerging market", "em equity", "msci em"],
    "europe":   ["europe", "europa", "stoxx", "eurozone", "euroland", "emua", "emu "],
    "usa":      ["s&p 500", "s&p500", "sp500", "nasdaq", "russell 2000", "russell 1000", "us equity", "united states"],
    "world":    ["world", "global", "developed markets", "developed market", "all-country", "all country", "acwi"],
}

SECTOR_KEYWORDS = {
    "financials":   ["financial", "bank", "insurance"],
    "healthcare":   ["health", "pharma", "biotech", "medical"],
    "technology":   ["technology", "tech ", "software", "semiconductor", "digital economy"],
    "energy":       ["energy", "oil", "gas"],
    "utilities":    ["utilities", "utility"],
    "consumer":     ["consumer", "retail", "staples", "discretionary"],
    "real_estate":  ["real estate", "reit", "property"],
    "industrials":  ["industrial"],
    "materials":    ["material", "mining", "metals"],
    "telecom":      ["telecom", "communication"],
}

STYLE_KEYWORDS = [
    "small cap", "small-cap", "smallcap",
    "mid cap", "mid-cap", "midcap",
    "large cap", "large-cap", "largecap",
    "dividend", "growth", "value", "quality", "momentum",
    "min vol", "minvol", "low vol", "low volatility",
]

THEME_KEYWORDS = ["esg", "sri", "sustainable", "climate", "green"]

INDEX_PROVIDERS = {
    "msci":   ["msci"],
    "sp":     ["s&p ", "s&p500", "s&p 500", "sp 500", "sp500"],   # cuidado con "s&p global"
    "ftse":   ["ftse"],
    "stoxx":  ["stoxx"],
    "russell":["russell"],
    "nasdaq": ["nasdaq"],
    "markit": ["markit", "iboxx"],
}


# ─────────────────────────────────────────────────────────────────────────────
# Fingerprint
# ─────────────────────────────────────────────────────────────────────────────

def extract_index_fingerprint(fund_name: str) -> dict:
    """
    Extreu del nom del fons una 'empremta' que ha de coincidir amb la del candidat.
    Inclou: regió, sector, estil, tema i proveïdor de l'índex (MSCI/S&P/FTSE...).
    """
    n = (fund_name or "").lower().strip()

    region = sector = style = theme = index_provider = None

    # Regió (per ordre de prioritat)
    for r_key, kws in REGION_KEYWORDS.items():
        if any(k in n for k in kws):
            region = r_key
            break

    # Sector
    for s_key, kws in SECTOR_KEYWORDS.items():
        if any(k in n for k in kws):
            sector = s_key
            break

    # Estil
    for st in STYLE_KEYWORDS:
        if st in n:
            if "small" in st:
                style = "small cap"
            elif "mid" in st:
                style = "mid cap"
            elif "large" in st:
                style = "large cap"
            else:
                style = st
            break

    # Tema
    for th in THEME_KEYWORDS:
        if th in n:
            theme = th
            break

    # Proveïdor de l'índex
    for prov, kws in INDEX_PROVIDERS.items():
        if any(k in n for k in kws):
            index_provider = prov
            break

    # ── Construcció de requires_all / excludes ──────────────────────────────
    requires_all = []
    excludes = []

    if region:
        requires_all.append(region)
        for other_r, other_kws in REGION_KEYWORDS.items():
            if other_r == region:
                continue
            if other_r == "world" and region != "world":
                excludes.extend(other_kws)
            elif region == "world" and other_r in ("europe", "japan", "china", "india", "spain", "usa"):
                excludes.extend(other_kws)

    if sector:
        requires_all.append(sector)

    if style:
        requires_all.append(style)

    if theme:
        requires_all.append(theme)

    if index_provider:
        requires_all.append(index_provider)

    is_valid = bool(requires_all)

    return {
        "region": region,
        "sector": sector,
        "style": style,
        "theme": theme,
        "index_provider": index_provider,
        "requires_all": requires_all,
        "excludes": excludes,
        "is_valid": is_valid,
    }


def _sql_keyword(col_expr: str, kw: str) -> str:
    """
    Genera SQL per comprovar keyword respectant els límits de paraula quan cal.
    - 'msci' → LIKE '%msci%'  (substring, porque msci no aparece en otras palabras)
    - 'sp'   → LIKE '% s&p%' o '%s&p%' (más específico)
    - 'usa'  → LIKE '% usa%' o '%usa %' o '% usa %' (evitar 'usage')
    """
    kw_clean = kw.replace("'", "''").lower()

    # Providers con keyword corta → exigimos límites de palabra vía espacios o símbolos
    if kw_clean in ("usa", "sp"):
        if kw_clean == "sp":
            return f"(LOWER({col_expr}) LIKE '%s&p%' OR LOWER({col_expr}) LIKE '% s&p %')"
        # usa
        return (
            f"(LOWER({col_expr}) LIKE '% usa%' "
            f"OR LOWER({col_expr}) LIKE '%usa %' "
            f"OR LOWER({col_expr}) LIKE '% usa %')"
        )

    return f"LOWER({col_expr}) LIKE '%{kw_clean}%'"


def build_fp_sql_conditions(fp: dict, name_col: str, relax_sector: bool = False) -> str:
    """
    Construeix les condicions SQL per al fingerprint.
    Si relax_sector=True, s'elimina la keyword del sector (però es manté la regió,
    estil, tema i proveïdor de l'índex).
    """
    if not fp.get("is_valid"):
        return ""

    conds = []
    sector_kw = fp.get("sector")

    for kw in fp["requires_all"]:
        if relax_sector and kw == sector_kw:
            continue
        conds.append(_sql_keyword(name_col, kw))

    for kw in fp.get("excludes", []):
        conds.append(f"NOT ({_sql_keyword(name_col, kw)})")

    if not conds:
        return ""

    return " AND " + " AND ".join(conds)


# ─────────────────────────────────────────────────────────────────────────────
# Cerca principal
# ─────────────────────────────────────────────────────────────────────────────

def find_cheaper_alternatives(
    query_fund: str,
    min_overlap: float = 0.0,
    relax_sector: bool = False,
):
    con = duckdb.connect(database=":memory:")
    q_param = query_fund.strip()

    ter_expr = _clean_num_sql('COALESCE("TER_Estimat", "Management_Fee", 1.50)')
    ret_expr = _clean_num_sql('"Return_3Y"')
    cat_expr = "LOWER(COALESCE(CAST(\"Asset_Class\" AS VARCHAR), ''))"
    weight_expr = _clean_num_sql('"Clean_Weight"')

    # ── 1) Fons origen ──────────────────────────────────────────────────────
    src_df = con.execute(
        f"""
        SELECT 
            "Fund Name" AS name,
            COALESCE(CAST("ISIN" AS VARCHAR), CAST("Instrument" AS VARCHAR)) AS isin,
            COALESCE(CAST("RIC" AS VARCHAR), '') AS ric,
            COALESCE(CAST("Instrument" AS VARCHAR), '') AS inst,
            COALESCE({ter_expr}, 1.50) AS ter,
            {ret_expr} AS ret3y,
            {cat_expr} AS cat
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
            "error": f"Fund '{query_fund}' not found in database",
            "alternatives": [],
        }

    src = src_df.iloc[0]
    src_isin = str(src["isin"])
    src_name = str(src["name"])
    src_ric = str(src["ric"])
    src_inst = str(src["inst"])
    src_ter = safe_float(src["ter"], 1.50) or 1.50
    src_ret3y = safe_float(src["ret3y"], None)
    src_cat = str(src["cat"] or "").strip()

    src_ids = [_q(x) for x in [src_isin, src_ric, src_inst]
               if str(x).strip() not in ("", "None", "nan")]
    src_ids_clause = ", ".join(src_ids) if src_ids else _q(src_isin)
    src_excl = ", ".join([_q(x) for x in [src_isin, src_ric, src_inst]
                          if str(x).strip() not in ("", "None", "nan")])

    cat_filter = ""
    if src_cat:
        cat_clean = src_cat.lower()
        if "equity" in cat_clean:
            cat_filter = (
                "AND LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%equity%'"
            )
        elif "bond" in cat_clean or "fixed" in cat_clean:
            cat_filter = (
                "AND (LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%bond%' "
                "OR LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%fixed%')"
            )
        elif "money" in cat_clean:
            cat_filter = (
                "AND LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%money%'"
            )
        elif "real estate" in cat_clean or "reit" in cat_clean:
            cat_filter = (
                "AND LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%real estate%'"
            )
        elif "commodit" in cat_clean:
            cat_filter = (
                "AND LOWER(COALESCE(CAST(m.\"Asset_Class\" AS VARCHAR), '')) LIKE '%commodit%'"
            )

    # ── 2) Fingerprint ──────────────────────────────────────────────────────
    fp = extract_index_fingerprint(src_name)
    fp_cond = build_fp_sql_conditions(fp, 'm."Fund Name"', relax_sector=relax_sector)

    # ── 3) Query d'alternatives ─────────────────────────────────────────────
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
            WHERE COALESCE(CAST(m."ISIN" AS VARCHAR), '') NOT IN ({src_excl})
              AND COALESCE(CAST(m."RIC" AS VARCHAR), '') NOT IN ({src_excl})
              AND COALESCE(CAST(m."Instrument" AS VARCHAR), '') NOT IN ({src_excl})
              AND COALESCE({ter_expr}, 0.15) < {src_ter}
              AND (
                  LOWER(m."Fund Name") LIKE '%index%' 
                  OR LOWER(m."Fund Name") LIKE '%etf%'
                  OR LOWER(m."Fund Name") LIKE '%ucits%'
                  OR LOWER(m."Fund Name") LIKE '%vanguard%'
                  OR LOWER(m."Fund Name") LIKE '%amundi%'
                  OR LOWER(m."Fund Name") LIKE '%ishares%'
                  OR LOWER(m."Fund Name") LIKE '%xtrackers%'
                  OR LOWER(m."Fund Name") LIKE '%spdr%'
                  OR LOWER(m."Fund Name") LIKE '%lyxor%'
                  OR LOWER(m."Fund Name") LIKE '%invesco%'
                  OR LOWER(m."Fund Name") LIKE '%wisdomtree%'
                  OR LOWER(m."Fund Name") LIKE '%fidelity%'
              )
              AND LOWER(m."Fund Name") NOT LIKE '%lev %'
              AND LOWER(m."Fund Name") NOT LIKE '%short%'
              AND LOWER(m."Fund Name") NOT LIKE '%fctr%'
              AND LOWER(m."Fund Name") NOT LIKE '%factor%'
              {fp_cond}
              {cat_filter}
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
                ROUND(LEAST(100.0, COALESCE(SUM(LEAST(s.w_src, c.w_cand)), 0.0)), 1) AS overlap
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
            ROUND({src_ter} - cand_ter, 2) AS ter_savings,
            cand_ret3y
        FROM overlap_summary
        ORDER BY overlap DESC, ter_savings DESC
        LIMIT 5
    """

    try:
        res_df = con.execute(sql_alternatives).df()
    except Exception as e:
        print("SQL_ERROR (alternatives):", repr(e))
        res_df = pd.DataFrame()

    # ── 4) Fallback: sense overlap, mateix fingerprint ──────────────────────
    if res_df.empty:
        fb_sql = f"""
            SELECT 
                "Fund Name" AS cand_name,
                COALESCE(CAST("ISIN" AS VARCHAR), CAST("Instrument" AS VARCHAR)) AS cand_isin,
                COALESCE({ter_expr}, 0.15) AS cand_ter,
                0.0 AS overlap,
                ROUND({src_ter} - COALESCE({ter_expr}, 0.15), 2) AS ter_savings,
                {ret_expr} AS cand_ret3y
            FROM read_parquet('{MASTER_P}') m
            WHERE COALESCE(CAST("ISIN" AS VARCHAR), '') NOT IN ({src_excl})
              AND COALESCE(CAST("RIC" AS VARCHAR), '') NOT IN ({src_excl})
              AND COALESCE(CAST("Instrument" AS VARCHAR), '') NOT IN ({src_excl})
              AND COALESCE({ter_expr}, 0.15) < {src_ter}
              AND (LOWER("Fund Name") LIKE '%index%' OR LOWER("Fund Name") LIKE '%etf%')
              {fp_cond}
              {cat_filter}
            ORDER BY cand_ter ASC
            LIMIT 5
        """
        try:
            res_df = con.execute(fb_sql).df()
        except Exception as e:
            print("SQL_ERROR (fallback):", repr(e))
            res_df = pd.DataFrame()

    con.close()

    # ── 5) Sanititzar ───────────────────────────────────────────────────────
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
        status = "no_alternatives"
        fp_desc = " / ".join(
            filter(None, [
                fp.get("index_provider"),
                fp.get("region"),
                fp.get("sector"),
                fp.get("style"),
                fp.get("theme"),
            ])
        )
        if relax_sector:
            message = (
                f"No s'han trobat alternatives indexades del mateix perfil "
                f"({fp_desc or 'sense fingerprint'}) amb TER inferior a {round(src_ter, 2)}%, "
                f"ni tan sols relaxant el sector. És probable que el teu univers no contingui "
                f"més vehicles d'aquest tipus."
            )
        else:
            message = (
                f"No s'han trobat alternatives indexades del mateix perfil "
                f"({fp_desc or 'sense fingerprint'}) amb TER inferior a {round(src_ter, 2)}%. "
                f"Pots provar d'ampliar la cerca amb 'relax_sector=true' per veure altres "
                f"vehicles de la mateixa regió i proveïdor d'índex."
            )

    return {
        "source_name": src_name,
        "source_isin": src_isin,
        "source_ter": round(src_ter, 2),
        "source_ret3y": round(src_ret3y, 2) if src_ret3y is not None else None,
        "fingerprint": {
            "region": fp.get("region"),
            "sector": fp.get("sector"),
            "style": fp.get("style"),
            "theme": fp.get("theme"),
            "index_provider": fp.get("index_provider"),
        },
        "relax_sector": relax_sector,
        "status": status,
        "alternatives": clean_records,
        "message": message,
    }