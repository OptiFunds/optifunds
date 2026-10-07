import duckdb
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

DATA_DIR = Path("/Users/lluisbernadi/LSEG/data")
NAV_PARQUET = DATA_DIR / "optifunds_nav_history.parquet"
MASTER_PARQUET = DATA_DIR / "optifunds_master_spain.parquet"

TRADING_DAYS = 252
RF_RATE = 0.025  # 2.5% Taxa lliure de risc

# Benchmarks oficials preconfigurats a la base de dades
BENCHMARK_CATALOG = {
    "IBEX35": {
        "isin": "ES0105336038",
        "name": "IBEX 35 (Acción IBEX 35 ETF)",
        "default_region": "spain"
    },
    "EUROSTOXX50": {
        "isin": "ES0105321030",
        "name": "EURO STOXX 50 (Acción EuroStoxx 50 ETF)",
        "default_region": "europe"
    },
    "SP500": {
        "isin": "ES0114763032",
        "name": "S&P 500 (Bankinter Índice América)",
        "default_region": "global"
    }
}


def resolve_fund_metadata(con: duckdb.DuckDBPyConnection, isin_or_ric: str) -> dict:
    """Recupera el nom, gestora i categoria d'un fons a partir de l'ISIN o Instrument."""
    clean_id = isin_or_ric.strip().upper()
    default_meta = {"isin": clean_id, "name": clean_id, "category": "Fons d'Inversió", "ter": 1.5}
    if not MASTER_PARQUET.exists():
        return default_meta

    try:
        query = f"""
            SELECT 
                ISIN,
                COALESCE("Fund Name", "Fund_Name_Full", ISIN) AS fund_name,
                COALESCE("Asset_Class", "Asset_Universe", 'Renda Variable') AS category,
                COALESCE(TER_Estimat, Management_Fee, 1.5) AS ter
            FROM read_parquet('{MASTER_PARQUET}')
            WHERE ISIN = '{clean_id}' 
               OR RIC = '{clean_id}' 
               OR Instrument = '{clean_id}'
            LIMIT 1
        """
        df = con.execute(query).df()
        if not df.empty:
            row = df.iloc[0]
            return {
                "isin": str(row["ISIN"]),
                "name": str(row["fund_name"]),
                "category": str(row["category"]),
                "ter": float(row["ter"]) if pd.notnull(row["ter"]) else 1.5
            }
    except Exception:
        pass
    return default_meta


def get_fund_history(
    isin: str,
    period: str = "max",
    benchmark_isin: Optional[str] = None
) -> dict:
    """
    Retorna la sèrie històrica diària real oficial de la CNMV d'un fons i el seu benchmark.
    """
    if not NAV_PARQUET.exists():
        return {"error": "Fitxer històric de NAV no trobat."}

    con = duckdb.connect()
    fund_meta = resolve_fund_metadata(con, isin)
    target_isin = fund_meta["isin"]

    # Benchmark automàtic si no s'especifica
    if not benchmark_isin:
        cat_lower = fund_meta["category"].lower()
        name_lower = fund_meta["name"].lower()
        if any(x in cat_lower or x in name_lower for x in ["ibex", "españ", "spain", "iber"]):
            bmk_key = "IBEX35"
        elif any(x in cat_lower or x in name_lower for x in ["euro", "stoxx"]):
            bmk_key = "EUROSTOXX50"
        else:
            bmk_key = "SP500"
        bmk_isin = BENCHMARK_CATALOG[bmk_key]["isin"]
        bmk_name = BENCHMARK_CATALOG[bmk_key]["name"]
    else:
        req_b = benchmark_isin.strip().upper()
        if req_b in BENCHMARK_CATALOG:
            bmk_isin = BENCHMARK_CATALOG[req_b]["isin"]
            bmk_name = BENCHMARK_CATALOG[req_b]["name"]
        else:
            bmk_isin = req_b
            bmk_meta = resolve_fund_metadata(con, bmk_isin)
            bmk_name = bmk_meta["name"]

    # Obtenir dades del fons i del benchmark
    q = f"""
        SELECT 
            instrument,
            CAST(date AS DATE) AS date,
            CAST(nav AS DOUBLE) AS nav
        FROM read_parquet('{NAV_PARQUET}')
        WHERE instrument IN ('{target_isin}', '{bmk_isin}')
          AND nav > 0
        ORDER BY date ASC
    """
    df_raw = con.execute(q).df()
    con.close()

    if df_raw.empty or target_isin not in df_raw["instrument"].values:
        return {"error": f"No s'ha trobat cap sèrie històrica de NAV per al fons {isin}."}

    pivot = df_raw.pivot(index="date", columns="instrument", values="nav")
    pivot = pivot.dropna(subset=[target_isin])

    # Si hi ha benchmark, emplenar valors absents i alinear dates
    has_bmk = bmk_isin in pivot.columns and not pivot[bmk_isin].dropna().empty
    if has_bmk:
        pivot = pivot.ffill().bfill().dropna()
    else:
        pivot = pivot[[target_isin]].dropna()

    if pivot.empty:
        return {"error": "Dades insuficients després de la depuració."}

    # Filtrar per període sol·licitat
    latest_date = pivot.index.max()
    if period == "1y":
        start_filter = latest_date - pd.DateOffset(years=1)
    elif period == "3y":
        start_filter = latest_date - pd.DateOffset(years=3)
    elif period == "5y":
        start_filter = latest_date - pd.DateOffset(years=5)
    elif period == "10y":
        start_filter = latest_date - pd.DateOffset(years=10)
    else:
        start_filter = pivot.index.min()

    pivot = pivot[pivot.index >= start_filter]
    if len(pivot) < 5:
        return {"error": "Pocs dies de cotització per al rang temporal escollit."}

    fund_prices = pivot[target_isin]
    first_fund_nav = fund_prices.iloc[0]
    fund_base100 = (fund_prices / first_fund_nav) * 100.0

    # Drawdown del fons
    running_max = fund_prices.cummax()
    drawdowns = (fund_prices - running_max) / running_max * 100.0
    max_dd = float(drawdowns.min())
    max_dd_date = str(drawdowns.idxmin().strftime("%Y-%m-%d"))

    # Mètriques quantitatives
    years = max(0.1, (pivot.index[-1] - pivot.index[0]).days / 365.25)
    total_ret = float(((fund_prices.iloc[-1] / first_fund_nav) - 1.0) * 100.0)
    cagr = float(((fund_prices.iloc[-1] / first_fund_nav) ** (1.0 / years) - 1.0) * 100.0) if fund_prices.iloc[-1] > 0 else 0.0

    daily_pct = fund_prices.pct_change().dropna()
    volatility = float(daily_pct.std() * np.sqrt(TRADING_DAYS) * 100.0)
    sharpe = float((cagr - (RF_RATE * 100.0)) / volatility) if volatility > 0 else 0.0

    # Benchmark Base 100 i mètriques
    bmk_base100_data = []
    bmk_metrics = {}
    if has_bmk:
        bmk_prices = pivot[bmk_isin]
        first_bmk_nav = bmk_prices.iloc[0]
        bmk_b100 = (bmk_prices / first_bmk_nav) * 100.0
        bmk_total_ret = float(((bmk_prices.iloc[-1] / first_bmk_nav) - 1.0) * 100.0)
        bmk_cagr = float(((bmk_prices.iloc[-1] / first_bmk_nav) ** (1.0 / years) - 1.0) * 100.0)
        bmk_vol = float(bmk_prices.pct_change().dropna().std() * np.sqrt(TRADING_DAYS) * 100.0)
        
        bmk_running_max = bmk_prices.cummax()
        bmk_dd = (bmk_prices - bmk_running_max) / bmk_running_max * 100.0
        bmk_max_dd = float(bmk_dd.min())

        # Beta i Alpha
        bmk_daily_pct = bmk_prices.pct_change().dropna()
        common_idx = daily_pct.index.intersection(bmk_daily_pct.index)
        if len(common_idx) > 20:
            cov = np.cov(daily_pct.loc[common_idx], bmk_daily_pct.loc[common_idx])[0][1]
            var_bmk = np.var(bmk_daily_pct.loc[common_idx])
            beta = float(cov / var_bmk) if var_bmk > 0 else 1.0
            alpha = float(cagr - (RF_RATE * 100.0 + beta * (bmk_cagr - RF_RATE * 100.0)))
        else:
            beta = 1.0
            alpha = 0.0

        bmk_metrics = {
            "name": bmk_name,
            "isin": bmk_isin,
            "total_return_pct": round(bmk_total_ret, 2),
            "cagr_pct": round(bmk_cagr, 2),
            "volatility_pct": round(bmk_vol, 2),
            "max_drawdown_pct": round(bmk_max_dd, 2),
            "beta": round(beta, 2),
            "alpha_annual_pct": round(alpha, 2)
        }

    # Downsampling per mantenir la resposta HTTP lleugera (<400 punts)
    step = max(1, len(pivot) // 350)
    sampled = pivot.iloc[::step]
    if pivot.index[-1] not in sampled.index:
        sampled = pd.concat([sampled, pivot.iloc[[-1]]])

    sampled_dates = [d.strftime("%Y-%m-%d") for d in sampled.index]
    sampled_nav = [round(float(fund_prices.loc[d]), 4) for d in sampled.index]
    sampled_base100 = [round(float(fund_base100.loc[d]), 2) for d in sampled.index]
    sampled_dd = [round(float(drawdowns.loc[d]), 2) for d in sampled.index]
    sampled_bmk_b100 = [round(float((pivot[bmk_isin].loc[d] / pivot[bmk_isin].iloc[0]) * 100.0), 2) for d in sampled.index] if has_bmk else []

    # Taula anual (retorns per anys naturals 2015-2024)
    yearly_rows = []
    years_present = sorted(list(set(pivot.index.year)))
    for yr in years_present:
        yr_data = pivot[pivot.index.year == yr]
        if len(yr_data) >= 10:
            f_start = yr_data[target_isin].iloc[0]
            f_end = yr_data[target_isin].iloc[-1]
            f_yr_ret = float(((f_end / f_start) - 1.0) * 100.0) if f_start > 0 else 0.0

            b_yr_ret = None
            if has_bmk and bmk_isin in yr_data.columns:
                b_start = yr_data[bmk_isin].iloc[0]
                b_end = yr_data[bmk_isin].iloc[-1]
                b_yr_ret = float(((b_end / b_start) - 1.0) * 100.0) if b_start > 0 else 0.0

            diff = round(f_yr_ret - b_yr_ret, 2) if b_yr_ret is not None else None
            yearly_rows.append({
                "year": yr,
                "fund_return_pct": round(f_yr_ret, 2),
                "benchmark_return_pct": round(b_yr_ret, 2) if b_yr_ret is not None else None,
                "excess_return_pct": diff
            })

    return {
        "fund": {
            "isin": fund_meta["isin"],
            "name": fund_meta["name"],
            "category": fund_meta["category"],
            "ter": fund_meta["ter"]
        },
        "period": period,
        "date_range": {
            "start": pivot.index[0].strftime("%Y-%m-%d"),
            "end": pivot.index[-1].strftime("%Y-%m-%d"),
            "total_days": len(pivot)
        },
        "metrics": {
            "total_return_pct": round(total_ret, 2),
            "cagr_pct": round(cagr, 2),
            "volatility_pct": round(volatility, 2),
            "sharpe_ratio": round(sharpe, 2),
            "max_drawdown_pct": round(max_dd, 2),
            "max_drawdown_date": max_dd_date,
            "calmar_ratio": round(abs(cagr / max_dd), 2) if max_dd != 0 else 0.0
        },
        "benchmark": bmk_metrics,
        "timeline": sampled_dates,
        "nav_series": sampled_nav,
        "base100_series": sampled_base100,
        "drawdown_series": sampled_dd,
        "benchmark_base100_series": sampled_bmk_b100,
        "yearly_performance": yearly_rows
    }


def backtest_portfolio_history(
    allocations: Dict[str, float],
    period: str = "max",
    benchmark_isin: Optional[str] = None
) -> dict:
    """
    Executa un backtest quantitatiu diari real complet per a una cartera ponderada
    sobre els 10 anys de dades oficials de la CNMV.
    """
    if not NAV_PARQUET.exists():
        return {"error": "Fitxer històric de NAV no trobat."}

    valid_allocs = {k.strip().upper(): float(v) for k, v in allocations.items() if float(v) > 0}
    if not valid_allocs:
        return {"error": "Cal especificar com a mínim un fons amb pes superior a 0."}

    total_weight = sum(valid_allocs.values())
    norm_weights = {k: v / total_weight for k, v in valid_allocs.items()}
    instruments = list(norm_weights.keys())

    con = duckdb.connect()

    # Mapejar metadades de cada fons
    fund_metadata = {}
    resolved_to_req = {}
    for inst in instruments:
        meta = resolve_fund_metadata(con, inst)
        fund_metadata[meta["isin"]] = meta
        resolved_to_req[meta["isin"]] = inst

    # Benchmark per defecte (IBEX 35, EuroStoxx 50 o S&P 500)
    req_b = benchmark_isin.strip().upper() if benchmark_isin else "IBEX35"
    if req_b in BENCHMARK_CATALOG:
        bmk_target = BENCHMARK_CATALOG[req_b]["isin"]
        bmk_name = BENCHMARK_CATALOG[req_b]["name"]
    else:
        bmk_target = req_b
        bmk_meta = resolve_fund_metadata(con, bmk_target)
        bmk_name = bmk_meta["name"]

    all_query_isins = list(fund_metadata.keys()) + [bmk_target]
    ids_str = ", ".join([f"'{x}'" for x in all_query_isins])

    q = f"""
        SELECT 
            instrument,
            CAST(date AS DATE) AS date,
            CAST(nav AS DOUBLE) AS nav
        FROM read_parquet('{NAV_PARQUET}')
        WHERE instrument IN ({ids_str})
          AND nav > 0
        ORDER BY date ASC
    """
    df_raw = con.execute(q).df()
    con.close()

    if df_raw.empty:
        return {"error": "No s'han trobat cotitzacions per als fons seleccionats."}

    pivot = df_raw.pivot(index="date", columns="instrument", values="nav")

    # Comprovar fons presents
    present_funds = [f for f in fund_metadata.keys() if f in pivot.columns and not pivot[f].dropna().empty]
    if not present_funds:
        return {"error": "Cap dels fons sol·licitats disposa d'històric de preus a la base de dades."}

    # Re-normalitzar pesos amb els fons que sí tenen dades
    active_weights = {f: norm_weights.get(resolved_to_req.get(f, f), 0.0) for f in present_funds}
    w_sum = sum(active_weights.values())
    if w_sum <= 0:
        return {"error": "Els pesos dels fons presents sumen 0."}
    for f in active_weights:
        active_weights[f] /= w_sum

    # Alinear dates: forward-fill per dies festius i eliminar NAs comuns
    cols_to_use = present_funds + ([bmk_target] if bmk_target in pivot.columns else [])
    sub_pivot = pivot[cols_to_use].dropna(how="all")
    sub_pivot = sub_pivot.ffill().dropna(subset=present_funds)

    if len(sub_pivot) < 20:
        return {"error": "Sèrie temporal comuna massa curta per al càlcul de backtest."}

    # Filtrar per període sol·licitat
    latest_date = sub_pivot.index.max()
    if period == "1y":
        start_filter = latest_date - pd.DateOffset(years=1)
    elif period == "3y":
        start_filter = latest_date - pd.DateOffset(years=3)
    elif period == "5y":
        start_filter = latest_date - pd.DateOffset(years=5)
    elif period == "10y":
        start_filter = latest_date - pd.DateOffset(years=10)
    else:
        start_filter = sub_pivot.index.min()

    sub_pivot = sub_pivot[sub_pivot.index >= start_filter]
    if len(sub_pivot) < 10:
        return {"error": "Dades insuficients en el rang temporal sol·licitat."}

    # Càlcul de rendibilitats diàries
    returns_df = sub_pivot[present_funds].pct_change().dropna()
    weights_vec = np.array([active_weights[f] for f in present_funds])

    portfolio_daily_ret = (returns_df * weights_vec).sum(axis=1)

    # Trajectòria de la cartera Base 100
    portfolio_base100 = (1.0 + portfolio_daily_ret).cumprod() * 100.0
    first_date = sub_pivot.index[0]
    portfolio_base100 = pd.concat([pd.Series([100.0], index=[first_date]), portfolio_base100])

    # Trajectòria dels fons individuals Base 100
    individual_base100 = {}
    for f in present_funds:
        f_series = sub_pivot[f]
        b100 = (f_series / f_series.iloc[0]) * 100.0
        individual_base100[f] = b100

    # Drawdown de la cartera
    running_max = portfolio_base100.cummax()
    portfolio_dd = (portfolio_base100 - running_max) / running_max * 100.0
    max_dd = float(portfolio_dd.min())
    max_dd_date = str(portfolio_dd.idxmin().strftime("%Y-%m-%d"))

    # Mètriques de la cartera
    years = max(0.1, (sub_pivot.index[-1] - sub_pivot.index[0]).days / 365.25)
    total_ret = float(((portfolio_base100.iloc[-1] / 100.0) - 1.0) * 100.0)
    cagr = float(((portfolio_base100.iloc[-1] / 100.0) ** (1.0 / years) - 1.0) * 100.0)
    volatility = float(portfolio_daily_ret.std() * np.sqrt(TRADING_DAYS) * 100.0)
    sharpe = float((cagr - (RF_RATE * 100.0)) / volatility) if volatility > 0 else 0.0

    # Sortino Ratio
    neg_ret = portfolio_daily_ret[portfolio_daily_ret < 0]
    downside_vol = float(neg_ret.std() * np.sqrt(TRADING_DAYS) * 100.0) if len(neg_ret) > 1 else 0.001
    sortino = float((cagr - (RF_RATE * 100.0)) / downside_vol) if downside_vol > 0 else 0.0

    # Benchmark Base 100 i mètriques
    has_bmk = bmk_target in sub_pivot.columns and not sub_pivot[bmk_target].dropna().empty
    bmk_metrics = {}
    bmk_b100_series = pd.Series(dtype=float)
    if has_bmk:
        bmk_prices = sub_pivot[bmk_target].ffill().bfill()
        first_b = bmk_prices.iloc[0]
        bmk_b100_series = (bmk_prices / first_b) * 100.0

        bmk_total_ret = float(((bmk_prices.iloc[-1] / first_b) - 1.0) * 100.0)
        bmk_cagr = float(((bmk_prices.iloc[-1] / first_b) ** (1.0 / years) - 1.0) * 100.0)
        bmk_daily_ret = bmk_prices.pct_change().dropna()
        bmk_vol = float(bmk_daily_ret.std() * np.sqrt(TRADING_DAYS) * 100.0)

        bmk_running_max = bmk_b100_series.cummax()
        bmk_dd = (bmk_b100_series - bmk_running_max) / bmk_running_max * 100.0
        bmk_max_dd = float(bmk_dd.min())

        # Beta i Alpha de la Cartera vs Benchmark
        common_idx = portfolio_daily_ret.index.intersection(bmk_daily_ret.index)
        if len(common_idx) > 20:
            cov = np.cov(portfolio_daily_ret.loc[common_idx], bmk_daily_ret.loc[common_idx])[0][1]
            var_bmk = np.var(bmk_daily_ret.loc[common_idx])
            beta = float(cov / var_bmk) if var_bmk > 0 else 1.0
            alpha = float(cagr - (RF_RATE * 100.0 + beta * (bmk_cagr - RF_RATE * 100.0)))
        else:
            beta = 1.0
            alpha = 0.0

        bmk_metrics = {
            "name": bmk_name,
            "isin": bmk_target,
            "total_return_pct": round(bmk_total_ret, 2),
            "cagr_pct": round(bmk_cagr, 2),
            "volatility_pct": round(bmk_vol, 2),
            "max_drawdown_pct": round(bmk_max_dd, 2),
            "beta": round(beta, 2),
            "alpha_annual_pct": round(alpha, 2)
        }

    # Downsampling per transmetre sèries compactes al frontend (<350 punts)
    step = max(1, len(sub_pivot) // 350)
    sampled_dates_idx = sub_pivot.index[::step]
    if sub_pivot.index[-1] not in sampled_dates_idx:
        sampled_dates_idx = sampled_dates_idx.union(pd.DatetimeIndex([sub_pivot.index[-1]]))

    timeline_str = [d.strftime("%Y-%m-%d") for d in sampled_dates_idx]
    port_b100_vals = [round(float(portfolio_base100.asof(d)), 2) for d in sampled_dates_idx]
    port_dd_vals = [round(float(portfolio_dd.asof(d)), 2) for d in sampled_dates_idx]
    bmk_b100_vals = [round(float(bmk_b100_series.asof(d)), 2) for d in sampled_dates_idx] if has_bmk else []

    funds_data = {}
    for f in present_funds:
        meta = fund_metadata[f]
        f_b100 = individual_base100[f]
        f_total_ret = float(((f_b100.iloc[-1] / 100.0) - 1.0) * 100.0)
        funds_data[f] = {
            "name": meta["name"],
            "isin": f,
            "weight_pct": round(active_weights[f] * 100.0, 1),
            "total_return_pct": round(f_total_ret, 2),
            "base100_series": [round(float(f_b100.asof(d)), 2) for d in sampled_dates_idx]
        }

    # Retorns any per any
    yearly_rows = []
    years_present = sorted(list(set(sub_pivot.index.year)))
    for yr in years_present:
        yr_idx = sub_pivot.index[sub_pivot.index.year == yr]
        if len(yr_idx) >= 10:
            p_start = portfolio_base100.asof(yr_idx[0])
            p_end = portfolio_base100.asof(yr_idx[-1])
            p_yr_ret = float(((p_end / p_start) - 1.0) * 100.0) if p_start > 0 else 0.0

            b_yr_ret = None
            if has_bmk:
                b_start = bmk_b100_series.asof(yr_idx[0])
                b_end = bmk_b100_series.asof(yr_idx[-1])
                b_yr_ret = float(((b_end / b_start) - 1.0) * 100.0) if b_start > 0 else 0.0

            diff = round(p_yr_ret - b_yr_ret, 2) if b_yr_ret is not None else None
            yearly_rows.append({
                "year": yr,
                "portfolio_return_pct": round(p_yr_ret, 2),
                "benchmark_return_pct": round(b_yr_ret, 2) if b_yr_ret is not None else None,
                "excess_return_pct": diff
            })

    return {
        "period": period,
        "date_range": {
            "start": sub_pivot.index[0].strftime("%Y-%m-%d"),
            "end": sub_pivot.index[-1].strftime("%Y-%m-%d"),
            "total_days": len(sub_pivot)
        },
        "metrics": {
            "total_return_pct": round(total_ret, 2),
            "cagr_pct": round(cagr, 2),
            "volatility_pct": round(volatility, 2),
            "sharpe_ratio": round(sharpe, 2),
            "sortino_ratio": round(sortino, 2),
            "max_drawdown_pct": round(max_dd, 2),
            "max_drawdown_date": max_dd_date,
            "calmar_ratio": round(abs(cagr / max_dd), 2) if max_dd != 0 else 0.0
        },
        "benchmark": bmk_metrics,
        "funds": funds_data,
        "timeline": timeline_str,
        "portfolio_base100_series": port_b100_vals,
        "portfolio_drawdown_series": port_dd_vals,
        "benchmark_base100_series": bmk_b100_vals,
        "yearly_performance": yearly_rows
    }


def compare_funds_pairwise_history(
    isin1: str,
    isin2: str,
    period: str = "max"
) -> dict:
    """
    Compara dues sèries temporals reals de NAV oficial de la CNMV cara a cara.
    Calcula correlació històrica real, trajectòria Base 100, drawdown i diferencial en euros.
    """
    if not NAV_PARQUET.exists():
        return {"error": "Fitxer històric de NAV no trobat."}

    con = duckdb.connect()
    m1 = resolve_fund_metadata(con, isin1)
    m2 = resolve_fund_metadata(con, isin2)
    id1, id2 = m1["isin"], m2["isin"]

    q = f"""
        SELECT 
            instrument,
            CAST(date AS DATE) AS date,
            CAST(nav AS DOUBLE) AS nav
        FROM read_parquet('{NAV_PARQUET}')
        WHERE instrument IN ('{id1}', '{id2}')
          AND nav > 0
        ORDER BY date ASC
    """
    df_raw = con.execute(q).df()
    con.close()

    if df_raw.empty:
        return {"error": "No s'han trobat cotitzacions per a cap dels dos fons."}

    pivot = df_raw.pivot(index="date", columns="instrument", values="nav")
    
    # Comprovar presència de tots dos
    has_1 = id1 in pivot.columns and not pivot[id1].dropna().empty
    has_2 = id2 in pivot.columns and not pivot[id2].dropna().empty

    if not has_1 and not has_2:
        return {"error": f"Cap dels dos fons ({isin1}, {isin2}) té sèrie històrica a la base de dades."}
    if not has_1:
        return {"error": f"El fons 1 ({isin1}) no té sèrie històrica a la base de dades."}
    if not has_2:
        return {"error": f"El fons 2 ({isin2}) no té sèrie històrica a la base de dades."}

    # Alinear dates comunes
    sub_pivot = pivot[[id1, id2]].ffill().bfill().dropna()
    if len(sub_pivot) < 20:
        return {"error": "Sèrie temporal comuna massa curta entre aquests dos fons."}

    latest_date = sub_pivot.index.max()
    if period == "1y":
        start_filter = latest_date - pd.DateOffset(years=1)
    elif period == "3y":
        start_filter = latest_date - pd.DateOffset(years=3)
    elif period == "5y":
        start_filter = latest_date - pd.DateOffset(years=5)
    elif period == "10y":
        start_filter = latest_date - pd.DateOffset(years=10)
    else:
        start_filter = sub_pivot.index.min()

    sub_pivot = sub_pivot[sub_pivot.index >= start_filter]
    if len(sub_pivot) < 10:
        return {"error": "Dades insuficients en el rang temporal sol·licitat."}

    p1 = sub_pivot[id1]
    p2 = sub_pivot[id2]

    # Base 100
    b100_1 = (p1 / p1.iloc[0]) * 100.0
    b100_2 = (p2 / p2.iloc[0]) * 100.0

    # Drawdowns
    dd1 = (p1 - p1.cummax()) / p1.cummax() * 100.0
    dd2 = (p2 - p2.cummax()) / p2.cummax() * 100.0

    # Mètriques quantitatives
    years = max(0.1, (sub_pivot.index[-1] - sub_pivot.index[0]).days / 365.25)
    
    ret1 = float(((p1.iloc[-1] / p1.iloc[0]) - 1.0) * 100.0)
    ret2 = float(((p2.iloc[-1] / p2.iloc[0]) - 1.0) * 100.0)

    cagr1 = float(((p1.iloc[-1] / p1.iloc[0]) ** (1.0 / years) - 1.0) * 100.0)
    cagr2 = float(((p2.iloc[-1] / p2.iloc[0]) ** (1.0 / years) - 1.0) * 100.0)

    pct1 = p1.pct_change().dropna()
    pct2 = p2.pct_change().dropna()

    vol1 = float(pct1.std() * np.sqrt(TRADING_DAYS) * 100.0)
    vol2 = float(pct2.std() * np.sqrt(TRADING_DAYS) * 100.0)

    sharpe1 = float((cagr1 - (RF_RATE * 100.0)) / vol1) if vol1 > 0 else 0.0
    sharpe2 = float((cagr2 - (RF_RATE * 100.0)) / vol2) if vol2 > 0 else 0.0

    corr = float(pct1.corr(pct2)) if len(pct1) > 10 else 1.0

    # Simulació de capital en 10.000 €
    cap1_10k = round(10000.0 * (1.0 + ret1 / 100.0), 2)
    cap2_10k = round(10000.0 * (1.0 + ret2 / 100.0), 2)
    diff_10k = round(cap2_10k - cap1_10k, 2)

    ter1 = m1.get("ter", 1.5)
    ter2 = m2.get("ter", 0.3)
    ter_diff_annual = round(10000.0 * (abs(ter1 - ter2) / 100.0), 2)

    # Downsampling
    step = max(1, len(sub_pivot) // 350)
    sampled_idx = sub_pivot.index[::step]
    if sub_pivot.index[-1] not in sampled_idx:
        sampled_idx = sampled_idx.union(pd.DatetimeIndex([sub_pivot.index[-1]]))

    timeline_str = [d.strftime("%Y-%m-%d") for d in sampled_idx]
    s_b1 = [round(float(b100_1.asof(d)), 2) for d in sampled_idx]
    s_b2 = [round(float(b100_2.asof(d)), 2) for d in sampled_idx]
    s_dd1 = [round(float(dd1.asof(d)), 2) for d in sampled_idx]
    s_dd2 = [round(float(dd2.asof(d)), 2) for d in sampled_idx]

    # Diferencial Base 100 (Fons 2 - Fons 1)
    spread_series = [round(s2 - s1, 2) for s1, s2 in zip(s_b1, s_b2)]

    # Taula anual
    yearly_rows = []
    years_present = sorted(list(set(sub_pivot.index.year)))
    for yr in years_present:
        yr_idx = sub_pivot.index[sub_pivot.index.year == yr]
        if len(yr_idx) >= 10:
            y_r1 = float(((p1.asof(yr_idx[-1]) / p1.asof(yr_idx[0])) - 1.0) * 100.0)
            y_r2 = float(((p2.asof(yr_idx[-1]) / p2.asof(yr_idx[0])) - 1.0) * 100.0)
            yearly_rows.append({
                "year": yr,
                "fund1_return_pct": round(y_r1, 2),
                "fund2_return_pct": round(y_r2, 2),
                "spread_return_pct": round(y_r2 - y_r1, 2)
            })

    return {
        "period": period,
        "date_range": {
            "start": sub_pivot.index[0].strftime("%Y-%m-%d"),
            "end": sub_pivot.index[-1].strftime("%Y-%m-%d"),
            "total_days": len(sub_pivot)
        },
        "fund1": {
            "isin": id1,
            "name": m1["name"],
            "category": m1["category"],
            "ter": ter1,
            "metrics": {
                "total_return_pct": round(ret1, 2),
                "cagr_pct": round(cagr1, 2),
                "volatility_pct": round(vol1, 2),
                "sharpe_ratio": round(sharpe1, 2),
                "max_drawdown_pct": round(float(dd1.min()), 2),
                "max_drawdown_date": str(dd1.idxmin().strftime("%Y-%m-%d"))
            }
        },
        "fund2": {
            "isin": id2,
            "name": m2["name"],
            "category": m2["category"],
            "ter": ter2,
            "metrics": {
                "total_return_pct": round(ret2, 2),
                "cagr_pct": round(cagr2, 2),
                "volatility_pct": round(vol2, 2),
                "sharpe_ratio": round(sharpe2, 2),
                "max_drawdown_pct": round(float(dd2.min()), 2),
                "max_drawdown_date": str(dd2.idxmin().strftime("%Y-%m-%d"))
            }
        },
        "comparison": {
            "correlation": round(corr, 3),
            "spread_total_return_pct": round(ret2 - ret1, 2),
            "spread_cagr_pct": round(cagr2 - cagr1, 2),
            "capital_10k_fund1": cap1_10k,
            "capital_10k_fund2": cap2_10k,
            "difference_10k_euros": diff_10k,
            "ter_differential_annual_10k": ter_diff_annual,
            "is_closet_clone": bool(corr >= 0.90 and abs(ter1 - ter2) >= 0.8)
        },
        "timeline": timeline_str,
        "fund1_base100": s_b1,
        "fund2_base100": s_b2,
        "fund1_drawdown": s_dd1,
        "fund2_drawdown": s_dd2,
        "spread_series": spread_series,
        "yearly_performance": yearly_rows
    }

