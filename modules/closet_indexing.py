import duckdb
import numpy as np
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
HOLDINGS_PATH = DATA_DIR / "optifunds_holdings_spain.parquet"
MASTER_PATH = DATA_DIR / "optifunds_master_spain.parquet"

# Mapa de benchmarks de baix cost per categoria / paraula clau
BENCHMARK_PROXIES = {
    "GLOBAL": {"isin": "IE00B03HD191", "name": "Vanguard Global Stock Index EUR Acc", "ter": 0.18},
    "US": {"isin": "IE00B5BMR087", "name": "iShares Core S&P 500 UCITS ETF USD (Acc)", "ter": 0.07},
    "EUROPE": {"isin": "LU0389811885", "name": "Amundi Core MSCI Europe AE Acc", "ter": 0.12},
    "EMERGING": {"isin": "IE0031786696", "name": "Vanguard Emerging Markets Stock Index EUR Acc", "ter": 0.23},
    "TECH": {"isin": "LU0171310443", "name": "BGF World Technology Fund A2 EUR", "ter": 0.20}
}

def get_fund_positions(isin: str) -> pd.DataFrame:
    con = duckdb.connect(database=":memory:")
    query = f"""
        SELECT "Holding RIC", "Holding Name", "Clean_Weight"
        FROM read_parquet('{HOLDINGS_PATH}')
        WHERE "Instrument" = '{isin}'
    """
    df = con.execute(query).df()
    con.close()
    return df

def audit_closet_indexing(active_isin: str, benchmark_isin: str = None, benchmark_ter: float = None):
    con = duckdb.connect(database=":memory:")
    f_act = con.execute(f"SELECT * FROM read_parquet('{MASTER_PATH}') WHERE \"Instrument\" = '{active_isin}'").df()
    
    if f_act.empty:
        con.close()
        return None
        
    act_row = f_act.iloc[0]
    fund_name = act_row.get("Fund Name", "Fons Desconegut")
    ter_raw = act_row.get("TER_Estimat", 1.65)
    ter_fund = float(ter_raw) if pd.notna(ter_raw) else 1.65

    # Si no es passa benchmark explícit, seleccionar per defecte Vanguard Global
    if not benchmark_isin:
        benchmark_isin = BENCHMARK_PROXIES["GLOBAL"]["isin"]
        benchmark_ter = BENCHMARK_PROXIES["GLOBAL"]["ter"]
        bmk_name = BENCHMARK_PROXIES["GLOBAL"]["name"]
    else:
        f_bmk = con.execute(f"SELECT * FROM read_parquet('{MASTER_PATH}') WHERE \"Instrument\" = '{benchmark_isin}'").df()
        bmk_name = f_bmk.iloc[0].get("Fund Name", "Benchmark") if not f_bmk.empty else "Benchmark"
        if benchmark_ter is None:
            benchmark_ter = 0.18
            
    con.close()

    p_act = get_fund_positions(active_isin)
    p_bmk = get_fund_positions(benchmark_isin)

    if p_act.empty or p_bmk.empty:
        return {
            "fund_name": fund_name,
            "benchmark_name": bmk_name,
            "error": "Sense posicions detallades a la base de dades"
        }

    merged = pd.merge(p_act, p_bmk, on="Holding RIC", how="outer", suffixes=("_fnd", "_bmk")).fillna(0.0)

    sum_fnd = merged["Clean_Weight_fnd"].sum()
    sum_bmk = merged["Clean_Weight_bmk"].sum()

    if sum_fnd > 0 and sum_bmk > 0:
        w_fnd = merged["Clean_Weight_fnd"] / sum_fnd
        w_bmk = merged["Clean_Weight_bmk"] / sum_bmk
        active_share = float(0.5 * np.sum(np.abs(w_fnd - w_bmk)) * 100)
        overlap = float(np.sum(np.minimum(w_fnd, w_bmk)) * 100)
    else:
        active_share, overlap = 100.0, 0.0

    # Càlcul TER efectiu sobre la part activa
    as_ratio = max(active_share / 100.0, 0.05)
    ter_actiu = (ter_fund - (1 - as_ratio) * benchmark_ter) / as_ratio

    # Diagnòstic professional
    is_indexed = any(k in fund_name.lower() for k in ["index", "etf", "vanguard", "core", "swap", "screened"])
    
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

    # Top títols solapats
    merged["Shared_Weight"] = np.minimum(merged["Clean_Weight_fnd"], merged["Clean_Weight_bmk"])
    merged["Resolved_Name"] = merged["Holding Name_fnd"].replace(0.0, np.nan).fillna(merged["Holding Name_bmk"])
    top_overlap_holdings = (
        merged[merged["Shared_Weight"] > 0][["Resolved_Name", "Shared_Weight", "Clean_Weight_fnd", "Clean_Weight_bmk"]]
        .sort_values(by="Shared_Weight", ascending=False)
        .head(10)
    )

    return {
        "fund_name": fund_name,
        "benchmark_name": bmk_name,
        "ter_fund": ter_fund,
        "ter_benchmark": benchmark_ter,
        "overlap": overlap,
        "active_share": active_share,
        "ter_active_effective": ter_actiu,
        "category": category,
        "alert_code": alert_code,
        "top_overlaps": top_overlap_holdings
    }
