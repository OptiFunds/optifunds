import duckdb
import numpy as np
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
HOLDINGS_PATH = DATA_DIR / "optifunds_holdings_spain.parquet"
MASTER_PATH = DATA_DIR / "optifunds_master_spain.parquet"

def find_fund_by_identifier(con, query_str: str) -> pd.DataFrame:
    q = f"""
        SELECT *
        FROM read_parquet('{MASTER_PATH}')
        WHERE LOWER("ISIN") = LOWER(?)
           OR LOWER("Instrument") = LOWER(?)
           OR LOWER("Fund Name") LIKE LOWER(?)
        LIMIT 1
    """
    param = query_str.strip()
    return con.execute(q, [param, param, f"%{param}%"]).df()

def get_fund_positions(con, isin, ric, instrument):
    ids = [f"'{x}'" for x in [isin, ric, instrument] if pd.notna(x) and str(x).strip() != ""]
    if not ids:
        return pd.DataFrame()
    clause = ", ".join(ids)
    query = f"""
        SELECT "Holding RIC", "Holding Name", "Clean_Weight"
        FROM read_parquet('{HOLDINGS_PATH}')
        WHERE "Instrument" IN ({clause})
    """
    return con.execute(query).df()

def find_cheaper_alternatives(query_fund: str, min_overlap: float = 40.0):
    con = duckdb.connect(database=":memory:")
    
    # 1. Trobar el fons d'origen
    df_src = find_fund_by_identifier(con, query_fund)
    if df_src.empty:
        con.close()
        return {"error": "Fons d'origen no trobat"}
        
    src = df_src.iloc[0]
    src_isin = src.get("ISIN", "N/D")
    src_name = src.get("Fund Name", "N/D")
    src_ter = float(src.get("TER_Estimat", 1.65)) if pd.notna(src.get("TER_Estimat")) else 1.65
    src_ret3y = float(src.get("Return_3Y", 0.0)) if pd.notna(src.get("Return_3Y")) else None
    src_class = src.get("Asset_Class", "")

    # 2. Holdings de l'origen
    p_src = get_fund_positions(con, src_isin, src.get("RIC"), src.get("Instrument"))
    if p_src.empty:
        con.close()
        return {"error": "El fons seleccionat no té el desglossament de cartera disponible per avaluar solapaments."}

    sum_src = p_src["Clean_Weight"].sum()
    if sum_src > 0:
        p_src["Weight_Norm"] = (p_src["Clean_Weight"] / sum_src) * 100.0
    else:
        con.close()
        return {"error": "Pesos invàlids al fons d'origen"}

    # 3. Buscar candidats alternatius més barats (indexats o TER menor)
    cands_query = f"""
        SELECT "Fund Name", ISIN, RIC, Instrument, COALESCE(TER_Estimat, 0.20) AS TER, "Return_3Y", "Sharpe_3Y"
        FROM read_parquet('{MASTER_PATH}')
        WHERE COALESCE(TER_Estimat, 0.20) < ?
          AND ("ISIN" != ? OR "ISIN" IS NULL)
          AND (
            LOWER("Fund Name") LIKE '%index%' 
            OR LOWER("Fund Name") LIKE '%etf%' 
            OR LOWER("Fund Name") LIKE '%vanguard%' 
            OR LOWER("Fund Name") LIKE '%ishares%' 
            OR LOWER("Fund Name") LIKE '%amundi%'
          )
        ORDER BY TER ASC
        LIMIT 60
    """
    df_cands = con.execute(cands_query, [src_ter, src_isin]).df()

    alternatives = []

    # 4. Avaluar solapament de cada candidat
    for _, cand in df_cands.iterrows():
        p_cand = get_fund_positions(con, cand["ISIN"], cand["RIC"], cand["Instrument"])
        if p_cand.empty:
            continue
            
        sum_c = p_cand["Clean_Weight"].sum()
        if sum_c <= 0:
            continue
        p_cand["Weight_Norm"] = (p_cand["Clean_Weight"] / sum_c) * 100.0

        merged = pd.merge(p_src, p_cand, on="Holding RIC", suffixes=("_src", "_cand"))
        if merged.empty:
            continue
            
        overlap = float(np.sum(np.minimum(merged["Weight_Norm_src"], merged["Weight_Norm_cand"])))

        if overlap >= min_overlap:
            cand_ter = float(cand["TER"])
            ter_diff = src_ter - cand_ter
            cand_ret3y = float(cand["Return_3Y"]) if pd.notna(cand["Return_3Y"]) else None
            
            # Càlcul de diferencial de rendibilitat
            ret_gap_3y = (cand_ret3y - src_ret3y) if (cand_ret3y is not None and src_ret3y is not None) else None

            alternatives.append({
                "cand_name": cand["Fund Name"],
                "cand_isin": cand["ISIN"],
                "cand_ter": cand_ter,
                "ter_savings": ter_diff,
                "overlap": overlap,
                "cand_ret3y": cand_ret3y,
                "ret_gap_3y": ret_gap_3y
            })

    con.close()

    # Ordenar per millor equilibri de solapament i estalvi
    alternatives = sorted(alternatives, key=lambda x: (x["overlap"], x["ter_savings"]), reverse=True)

    return {
        "source": {
            "name": src_name,
            "isin": src_isin,
            "ter": src_ter,
            "ret_3y": src_ret3y,
            "class": src_class
        },
        "alternatives": alternatives
    }
