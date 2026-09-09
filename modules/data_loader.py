from pathlib import Path
import pandas as pd
import streamlit as st

# BASE_DIR apunta a /Users/lluisbernadi/LSEG
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

TER_LOOKUP = {
    "IE00B03HD191": 0.18, "LU0996182563": 0.30, "LU0690375182": 1.05,
    "IE0031786142": 0.23, "IE0031786696": 0.23, "LU0389811885": 0.12,
    "LU0389812693": 0.10, "LU0389812933": 0.10, "IE00B4L5Y983": 0.20,
    "IE00B5BMR087": 0.07, "ES0152745003": 1.85, "ES0174115012": 1.75,
    "ES0112611001": 1.80
}

def resolve_ter(isin: str, name: str) -> float:
    if isin in TER_LOOKUP:
        return TER_LOOKUP[isin]
    n = str(name).lower()
    if any(k in n for k in ["index", "etf", "core", "vanguard"]):
        return 0.20
    return 1.75

@st.cache_data
def load_all_data():
    master_path = DATA_DIR / "optifunds_master.csv"
    holdings_path = DATA_DIR / "optifunds_holdings.csv"
    metrics_path = DATA_DIR / "optifunds_risk_metrics.csv"
    fees_path = DATA_DIR / "optifunds_fee_impact.csv"

    if not master_path.exists():
        raise FileNotFoundError(f"Fitxer no trobat a: {master_path}")

    df_master = pd.read_csv(master_path)
    df_holdings = pd.read_csv(holdings_path)
    df_metrics = pd.read_csv(metrics_path) if metrics_path.exists() else pd.DataFrame()
    df_fees = pd.read_csv(fees_path) if fees_path.exists() else pd.DataFrame()

    df_master["TER_Estimat"] = [
        resolve_ter(r["Instrument"], r["Fund Name"]) 
        for _, r in df_master.iterrows()
    ]
    fund_options = sorted(df_master["Fund Name"].dropna().unique().tolist())
    
    return df_master, df_holdings, df_metrics, df_fees, fund_options
