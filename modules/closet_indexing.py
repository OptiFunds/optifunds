import duckdb
import numpy as np
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
HOLDINGS_PATH = DATA_DIR / "optifunds_holdings_spain.parquet"
MASTER_PATH = DATA_DIR / "optifunds_master_spain.parquet"

def get_positions_by_fund_name(con, fund_name: str) -> pd.DataFrame:
    query = f"""
        WITH target_fund AS (
            SELECT "Fund Name", ISIN, RIC, Instrument, COALESCE(TER_Estimat, 1.65) AS ter
            FROM read_parquet('{MASTER_PATH}')
            WHERE "Fund Name" = ?
            LIMIT 1
        )
        SELECT 
            h."Holding RIC", 
            h."Holding Name", 
            h."Clean_Weight"
        FROM read_parquet('{HOLDINGS_PATH}') h
        JOIN target_fund f
          ON h."Instrument" = f.ISIN 
          OR h."Instrument" = f.RIC 
          OR h."Instrument" = f.Instrument
    """
    return con.execute(query, [fund_name]).df()

def audit_closet_indexing(active_fund_name: str, benchmark_fund_name: str):
    con = duckdb.connect(database=":memory:")

    # 1. Recuperar dades mestres
    f_act = con.execute(
        f"SELECT * FROM read_parquet('{MASTER_PATH}') WHERE \"Fund Name\" = ?", 
        [active_fund_name]
    ).df()
    
    f_bmk = con.execute(
        f"SELECT * FROM read_parquet('{MASTER_PATH}') WHERE \"Fund Name\" = ?", 
        [benchmark_fund_name]
    ).df()

    if f_act.empty or f_bmk.empty:
        con.close()
        return {"error": "Fons no trobat a la base de dades mestra"}

    ter_fund = float(f_act.iloc[0].get("TER_Estimat", 1.65)) if pd.notna(f_act.iloc[0].get("TER_Estimat")) else 1.65
    ter_bmk = float(f_bmk.iloc[0].get("TER_Estimat", 0.18)) if pd.notna(f_bmk.iloc[0].get("TER_Estimat")) else 0.18

    # 2. Holdings mitjançant JOIN
    p_act = get_positions_by_fund_name(con, active_fund_name)
    p_bmk = get_positions_by_fund_name(con, benchmark_fund_name)
    con.close()

    if p_act.empty or p_bmk.empty:
        return {
            "fund_name": active_fund_name,
            "benchmark_name": benchmark_fund_name,
            "error": f"Sense holdings (Fons: {len(p_act)} posicions, Benchmark: {len(p_bmk)} posicions)"
        }

    # 3. Solapament i Active Share
    merged = pd.merge(p_act, p_bmk, on="Holding RIC", how="outer", suffixes=("_fnd", "_bmk")).fillna(0.0)

    sum_fnd = merged["Clean_Weight_fnd"].sum()
    sum_bmk = merged["Clean_Weight_bmk"].sum()

    if sum_fnd > 0 and sum_bmk > 0:
        w_fnd = (merged["Clean_Weight_fnd"] / sum_fnd) * 100.0
        w_bmk = (merged["Clean_Weight_bmk"] / sum_bmk) * 100.0
        active_share = float(0.5 * np.sum(np.abs(w_fnd - w_bmk)))
        overlap = float(np.sum(np.minimum(w_fnd, w_bmk)))
    else:
        active_share, overlap = 100.0, 0.0

    as_ratio = max(active_share / 100.0, 0.05)
    ter_actiu = (ter_fund - (1 - as_ratio) * ter_bmk) / as_ratio

    is_indexed = any(k in active_fund_name.lower() for k in ["index", "etf", "vanguard", "core", "swap", "screened"])
    if is_indexed:
        category = "Indexat Legítim"
        alert_code = "INDEXED"
    elif active_share < 35.0:
        category = "Closet Indexing Flagrant"
        alert_code = "CRITICAL"
    elif active_share < 60.0:
        category = "Gestió Activa Feble"
        alert_code = "WARNING"
    else:
        category = "Gestió Activa de Convicció"
        alert_code = "HEALTHY"

    merged["Shared_Weight"] = np.minimum(merged["Clean_Weight_fnd"], merged["Clean_Weight_bmk"])
    merged["Resolved_Name"] = merged["Holding Name_fnd"].replace(0.0, np.nan).fillna(merged["Holding Name_bmk"])
    top_overlap_holdings = (
        merged[merged["Shared_Weight"] > 0][["Resolved_Name", "Shared_Weight", "Clean_Weight_fnd", "Clean_Weight_bmk"]]
        .sort_values(by="Shared_Weight", ascending=False)
        .head(10)
    )

    return {
        "fund_name": active_fund_name,
        "benchmark_name": benchmark_fund_name,
        "ter_fund": ter_fund,
        "ter_benchmark": ter_bmk,
        "overlap": overlap,
        "active_share": active_share,
        "ter_active_effective": ter_actiu,
        "category": category,
        "alert_code": alert_code,
        "top_overlaps": top_overlap_holdings
    }
