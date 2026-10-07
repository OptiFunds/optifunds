"""
Motor del Cercador / Screener d'Univers de Fons d'Inversió
Permet filtrar, cercar i ordenar fons espanyols i internacionals
amb mètriques històriques oficials de la CNMV (2015-2024):
- Retorn 1A, CAGR 3A, CAGR 5A, CAGR 10A
- Volatilitat anualitzada
- Max Drawdown històric
- Ràtio de Sharpe
- TER (Comissions) i Gestora
"""

import math
from pathlib import Path
from typing import Dict, Any, List, Optional
import duckdb
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MASTER_PARQUET = DATA_DIR / "optifunds_master_spain.parquet"
NAV_PARQUET = DATA_DIR / "optifunds_nav_history.parquet"
SCREENER_MASTER_PARQUET = DATA_DIR / "optifunds_screener_master.parquet"


def build_screener_master(force: bool = False) -> Path:
    """
    Construeix o regenera data/optifunds_screener_master.parquet
    creuant optifunds_master_spain amb les mètriques agregades de optifunds_nav_history.
    """
    if SCREENER_MASTER_PARQUET.exists() and not force:
        return SCREENER_MASTER_PARQUET

    if not MASTER_PARQUET.exists():
        raise FileNotFoundError(f"Fitxer mestre no trobat: {MASTER_PARQUET}")

    con = duckdb.connect()

    intl_records = []
    try:
        from modules.international_nav_engine import KNOWN_INTERNATIONAL_METADATA
        intl_records = [
            {
                "isin": k,
                "name": v["name"],
                "category": v.get("category", "Renda Variable"),
                "ter": v.get("ter", 0.20),
                "manager": v.get("manager", "Internacional")
            }
            for k, v in KNOWN_INTERNATIONAL_METADATA.items()
        ]
    except Exception:
        pass
    con.register("intl_meta_df", pd.DataFrame(intl_records) if intl_records else pd.DataFrame(columns=["isin", "name", "category", "ter", "manager"]))

    has_nav = NAV_PARQUET.exists()

    if has_nav:
        sql = f"""
        -- 1. Dates i punts per instrument a la base de dades
        CREATE TEMP TABLE inst_dates AS
        SELECT 
            instrument,
            min(date) as min_date,
            max(date) as max_date,
            count(*) as n_days
        FROM read_parquet('{NAV_PARQUET}')
        WHERE nav > 0
        GROUP BY instrument;

        -- 2. NAVs històrics claus (actual, 1A, 3A, 5A, 10A)
        CREATE TEMP TABLE inst_summary AS
        SELECT 
            h.instrument,
            d.min_date,
            d.max_date,
            d.n_days,
            arg_max(h.nav, h.date) as last_nav,
            arg_max(CASE WHEN h.date <= d.max_date - INTERVAL 365 DAY THEN h.nav ELSE NULL END, 
                    CASE WHEN h.date <= d.max_date - INTERVAL 365 DAY THEN h.date ELSE NULL END) as nav_1y,
            arg_max(CASE WHEN h.date <= d.max_date - INTERVAL 1095 DAY THEN h.nav ELSE NULL END, 
                    CASE WHEN h.date <= d.max_date - INTERVAL 1095 DAY THEN h.date ELSE NULL END) as nav_3y,
            arg_max(CASE WHEN h.date <= d.max_date - INTERVAL 1825 DAY THEN h.nav ELSE NULL END, 
                    CASE WHEN h.date <= d.max_date - INTERVAL 1825 DAY THEN h.date ELSE NULL END) as nav_5y,
            arg_max(CASE WHEN h.date <= d.max_date - INTERVAL 3650 DAY THEN h.nav ELSE NULL END, 
                    CASE WHEN h.date <= d.max_date - INTERVAL 3650 DAY THEN h.date ELSE NULL END) as nav_10y
        FROM read_parquet('{NAV_PARQUET}') h
        JOIN inst_dates d ON h.instrument = d.instrument
        WHERE h.nav > 0
        GROUP BY h.instrument, d.min_date, d.max_date, d.n_days;

        -- 3. Volatilitat i Max Drawdown diari
        CREATE TEMP TABLE inst_risk AS
        WITH nav_lags AS (
            SELECT 
                instrument,
                date,
                nav,
                lag(nav) OVER (PARTITION BY instrument ORDER BY date) as prev_nav,
                max(nav) OVER (PARTITION BY instrument ORDER BY date) as peak_nav
            FROM read_parquet('{NAV_PARQUET}')
            WHERE nav > 0
        ),
        daily_stats AS (
            SELECT 
                instrument,
                (nav / prev_nav - 1.0) as daily_return,
                (nav / peak_nav - 1.0) as drawdown
            FROM nav_lags
            WHERE prev_nav IS NOT NULL AND prev_nav > 0
        )
        SELECT 
            instrument,
            ROUND(stddev_samp(daily_return) * sqrt(252.0) * 100.0, 2) as volatility_annualized,
            ROUND(min(drawdown) * 100.0, 2) as max_drawdown
        FROM daily_stats
        GROUP BY instrument;

        -- 4. Consolidació CNMV
        CREATE TEMP TABLE cnmv_metrics AS
        SELECT 
            s.instrument as isin,
            s.min_date,
            s.max_date,
            s.n_days,
            ROUND(s.last_nav, 4) as last_nav,
            ROUND((s.last_nav / s.nav_1y - 1.0) * 100.0, 2) as hist_ret_1y,
            ROUND((power(s.last_nav / s.nav_3y, 1.0 / 3.0) - 1.0) * 100.0, 2) as hist_cagr_3y,
            ROUND((power(s.last_nav / s.nav_5y, 1.0 / 5.0) - 1.0) * 100.0, 2) as hist_cagr_5y,
            ROUND((power(s.last_nav / s.nav_10y, 1.0 / 10.0) - 1.0) * 100.0, 2) as hist_cagr_10y,
            r.volatility_annualized as hist_volatility,
            r.max_drawdown as hist_max_drawdown,
            ROUND((((power(s.last_nav / s.nav_3y, 1.0 / 3.0) - 1.0) * 100.0) - 2.0) / NULLIF(r.volatility_annualized, 0), 2) as hist_sharpe
        FROM inst_summary s
        LEFT JOIN inst_risk r ON s.instrument = r.instrument;

        -- 5. Creació taula final
        CREATE TABLE screener_master AS
        SELECT 
            COALESCE(m.ISIN, m.Instrument, c.isin) as isin,
            COALESCE(m."Fund Name", m.Fund_Name_Full, im.name, 'Fons ' || c.isin) as fund_name,
            COALESCE(m.Management_Company, im.manager, 'Desconeguda') as management_company,
            COALESCE(m.Asset_Class, im.category, 'Renda Variable / General') as asset_class,
            COALESCE(
                im.category,
                CASE 
                    WHEN m.Asset_Class ILIKE '%Equity%' THEN 'Renda Variable'
                    WHEN m.Asset_Class ILIKE '%Bond%' THEN 'Renda Fixa'
                    WHEN m.Asset_Class ILIKE '%Mixed%' THEN 'Mixts'
                    WHEN m.Asset_Class ILIKE '%Money%' THEN 'Monetaris'
                    WHEN m.Asset_Class ILIKE '%Alternative%' OR m.Asset_Class ILIKE '%Hedge%' THEN 'Alternatius'
                    WHEN m.Asset_Class ILIKE '%Commodity%' THEN 'Matèries Primeres'
                    ELSE 'Altres / Global'
                END
            ) as asset_class_group,
            ROUND(COALESCE(TRY_CAST(REPLACE(REPLACE(CAST(m.TER_Estimat AS VARCHAR), '%', ''), ',', '.') AS DOUBLE), im.ter, 1.25), 2) as ter,
            ROUND(COALESCE(TRY_CAST(REPLACE(REPLACE(CAST(m.Management_Fee AS VARCHAR), '%', ''), ',', '.') AS DOUBLE), 0.90), 2) as management_fee,
            COALESCE(c.hist_ret_1y, TRY_CAST(REPLACE(REPLACE(CAST(m.Return_1Y AS VARCHAR), '%', ''), ',', '.') AS DOUBLE)) as ret_1y,
            c.hist_cagr_3y as cagr_3y,
            c.hist_cagr_5y as cagr_5y,
            c.hist_cagr_10y as cagr_10y,
            COALESCE(c.hist_volatility, TRY_CAST(REPLACE(REPLACE(CAST(m.Volatility_3Y AS VARCHAR), '%', ''), ',', '.') AS DOUBLE)) as volatility,
            c.hist_max_drawdown as max_drawdown,
            COALESCE(c.hist_sharpe, TRY_CAST(REPLACE(REPLACE(CAST(m.Sharpe_3Y AS VARCHAR), '%', ''), ',', '.') AS DOUBLE)) as sharpe_ratio,
            (c.isin IS NOT NULL) as has_cnmv_history,
            COALESCE(ROUND(c.n_days / 365.25, 1), 0.0) as history_years,
            c.min_date as history_start_date,
            c.max_date as history_end_date,
            COALESCE(c.n_days, 0) as history_data_points
        FROM read_parquet('{MASTER_PARQUET}') m
        FULL OUTER JOIN cnmv_metrics c ON m.ISIN = c.isin
        LEFT JOIN intl_meta_df im ON COALESCE(m.ISIN, c.isin) = im.isin;

        COPY screener_master TO '{SCREENER_MASTER_PARQUET}' (FORMAT PARQUET);
        """
    else:
        sql = f"""
        CREATE TABLE screener_master AS
        SELECT 
            COALESCE(m.ISIN, m.Instrument, '') as isin,
            COALESCE(m."Fund Name", m.Fund_Name_Full, 'Fons') as fund_name,
            COALESCE(m.Management_Company, 'Desconeguda') as management_company,
            COALESCE(m.Asset_Class, 'Renda Variable / General') as asset_class,
            CASE 
                WHEN m.Asset_Class ILIKE '%Equity%' THEN 'Renda Variable'
                WHEN m.Asset_Class ILIKE '%Bond%' THEN 'Renda Fixa'
                WHEN m.Asset_Class ILIKE '%Mixed%' THEN 'Mixts'
                WHEN m.Asset_Class ILIKE '%Money%' THEN 'Monetaris'
                WHEN m.Asset_Class ILIKE '%Alternative%' OR m.Asset_Class ILIKE '%Hedge%' THEN 'Alternatius'
                WHEN m.Asset_Class ILIKE '%Commodity%' THEN 'Matèries Primeres'
                ELSE 'Altres / Global'
            END as asset_class_group,
            ROUND(COALESCE(TRY_CAST(REPLACE(REPLACE(CAST(m.TER_Estimat AS VARCHAR), '%', ''), ',', '.') AS DOUBLE), 1.25), 2) as ter,
            ROUND(COALESCE(TRY_CAST(REPLACE(REPLACE(CAST(m.Management_Fee AS VARCHAR), '%', ''), ',', '.') AS DOUBLE), 0.90), 2) as management_fee,
            TRY_CAST(REPLACE(REPLACE(CAST(m.Return_1Y AS VARCHAR), '%', ''), ',', '.') AS DOUBLE) as ret_1y,
            NULL::DOUBLE as cagr_3y,
            NULL::DOUBLE as cagr_5y,
            NULL::DOUBLE as cagr_10y,
            TRY_CAST(REPLACE(REPLACE(CAST(m.Volatility_3Y AS VARCHAR), '%', ''), ',', '.') AS DOUBLE) as volatility,
            NULL::DOUBLE as max_drawdown,
            TRY_CAST(REPLACE(REPLACE(CAST(m.Sharpe_3Y AS VARCHAR), '%', ''), ',', '.') AS DOUBLE) as sharpe_ratio,
            false as has_cnmv_history,
            0.0 as history_years,
            NULL::DATE as history_start_date,
            NULL::DATE as history_end_date,
            0 as history_data_points
        FROM read_parquet('{MASTER_PARQUET}') m;

        COPY screener_master TO '{SCREENER_MASTER_PARQUET}' (FORMAT PARQUET);
        """

    con.execute(sql)
    return SCREENER_MASTER_PARQUET


def query_screener(
    q: str = "",
    category: str = "",
    manager: str = "",
    only_cnmv: bool = False,
    min_ret_1y: Optional[float] = None,
    min_ret_3y: Optional[float] = None,
    min_ret_5y: Optional[float] = None,
    min_ret_10y: Optional[float] = None,
    max_ter: Optional[float] = None,
    min_sharpe: Optional[float] = None,
    max_volatility: Optional[float] = None,
    sort_by: str = "cagr_10y",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 25
) -> Dict[str, Any]:
    """
    Executa una consulta filtrada, ordenada i paginada sobre optifunds_screener_master.parquet.
    Temps típic d'execució: < 5 ms.
    """
    build_screener_master(force=False)

    con = duckdb.connect()

    where_clauses = ["1=1"]

    q_clean = q.replace("'", "''").strip()
    if q_clean:
        where_clauses.append(
            f"(fund_name ILIKE '%{q_clean}%' OR isin ILIKE '%{q_clean}%' OR management_company ILIKE '%{q_clean}%')"
        )

    if category and category != "Totes":
        cat_clean = category.replace("'", "''").strip()
        where_clauses.append(f"asset_class_group = '{cat_clean}'")

    if manager and manager != "Totes":
        mgr_clean = manager.replace("'", "''").strip()
        where_clauses.append(f"management_company = '{mgr_clean}'")

    if only_cnmv:
        where_clauses.append("has_cnmv_history = true")

    if min_ret_1y is not None:
        where_clauses.append(f"ret_1y >= {min_ret_1y}")
    if min_ret_3y is not None:
        where_clauses.append(f"cagr_3y >= {min_ret_3y}")
    if min_ret_5y is not None:
        where_clauses.append(f"cagr_5y >= {min_ret_5y}")
    if min_ret_10y is not None:
        where_clauses.append(f"cagr_10y >= {min_ret_10y}")

    if max_ter is not None:
        where_clauses.append(f"ter <= {max_ter}")

    if min_sharpe is not None:
        where_clauses.append(f"sharpe_ratio >= {min_sharpe}")

    if max_volatility is not None:
        where_clauses.append(f"volatility <= {max_volatility}")

    where_sql = " AND ".join(where_clauses)

    valid_sort_cols = {
        "cagr_10y": "cagr_10y",
        "cagr_5y": "cagr_5y",
        "cagr_3y": "cagr_3y",
        "ret_1y": "ret_1y",
        "volatility": "volatility",
        "max_drawdown": "max_drawdown",
        "sharpe_ratio": "sharpe_ratio",
        "ter": "ter",
        "fund_name": "fund_name",
        "isin": "isin",
        "history_years": "history_years"
    }
    col = valid_sort_cols.get(sort_by, "cagr_10y")
    direction = "DESC" if sort_order.lower() == "desc" else "ASC"
    
    # Nulls always at the end when sorting
    order_sql = f"{col} {direction} NULLS LAST"

    # 1. Total matching
    count_sql = f"""
    SELECT count(*) 
    FROM read_parquet('{SCREENER_MASTER_PARQUET}')
    WHERE {where_sql}
    """
    total_matching = con.execute(count_sql).fetchone()[0]

    # 2. Paginació
    page = max(1, page)
    page_size = max(5, min(100, page_size))
    offset = (page - 1) * page_size
    total_pages = math.ceil(total_matching / page_size) if total_matching > 0 else 1

    # 3. Query de dades
    query_sql = f"""
    SELECT 
        isin,
        fund_name,
        management_company,
        asset_class,
        asset_class_group,
        ter,
        management_fee,
        ret_1y,
        cagr_3y,
        cagr_5y,
        cagr_10y,
        volatility,
        max_drawdown,
        sharpe_ratio,
        has_cnmv_history,
        history_years,
        strftime(history_start_date, '%Y-%m-%d') as history_start_date,
        strftime(history_end_date, '%Y-%m-%d') as history_end_date,
        history_data_points
    FROM read_parquet('{SCREENER_MASTER_PARQUET}')
    WHERE {where_sql}
    ORDER BY {order_sql}
    LIMIT {page_size} OFFSET {offset}
    """
    funds = con.execute(query_sql).df().to_dict(orient="records")

    # Clean NaN / None in JSON serialization
    for f in funds:
        for k, v in f.items():
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                f[k] = None

    # 4. Estadístiques de l'Univers Global
    stats_sql = f"""
    SELECT 
        count(*) as total_universe,
        count(CASE WHEN has_cnmv_history THEN 1 END) as total_cnmv_funds,
        count(CASE WHEN cagr_10y IS NOT NULL THEN 1 END) as total_cnmv_10y,
        ROUND(avg(ter), 2) as avg_ter,
        ROUND(avg(cagr_10y), 2) as avg_cagr_10y,
        ROUND(avg(volatility), 2) as avg_volatility
    FROM read_parquet('{SCREENER_MASTER_PARQUET}')
    """
    universe_stats = con.execute(stats_sql).df().to_dict(orient="records")[0]

    # 5. Top categories i gestores per als filtres
    categories_sql = f"""
    SELECT asset_class_group as name, count(*) as count
    FROM read_parquet('{SCREENER_MASTER_PARQUET}')
    GROUP BY asset_class_group
    ORDER BY count DESC
    """
    categories = con.execute(categories_sql).df().to_dict(orient="records")

    managers_sql = f"""
    SELECT management_company as name, count(*) as count
    FROM read_parquet('{SCREENER_MASTER_PARQUET}')
    WHERE management_company != 'Desconeguda'
    GROUP BY management_company
    ORDER BY count DESC
    LIMIT 30
    """
    managers = con.execute(managers_sql).df().to_dict(orient="records")

    return {
        "funds": funds,
        "total": total_matching,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "universe_stats": universe_stats,
        "categories": categories,
        "managers": managers
    }
