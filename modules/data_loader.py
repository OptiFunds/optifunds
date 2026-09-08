import os
import pandas as pd
import streamlit as st

# Localitzar la carpeta arrel on viuen els CSVs
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))

TER_LOOKUP = {
    "IE00B03HD191": 0.18, "LU0996182563": 0.30, "LU0690375182": 1.05,
    "IE0031786142": 0.23, "IE0031786696": 0.23, "LU0389811885": 0.12,
    "LU0389812693": 0.10, "LU0389812933": 0.10, "IE00B4L5Y983": 0.20,
    "IE00B5BMR087": 0.07, "ES0152745003": 1.85, "ES0174115012": 1.75,
    "ES0112611001": 1.80
}

def resolve_ter(isin, name):
    if isin in TER_LOOKUP:
        return TER_LOOKUP[isin]
    n = str(name).lower()
    if any(k in n for k in ["index", "etf", "vanguard", "core"]):
        return 0.20
    return 1.75

@st.cache_data
def load_all_data():
    master_path = os.path.join(BASE_DIR, "optifunds_master.csv")
    holdings_path = os.path.join(BASE_DIR, "optifunds_holdings.csv")
    metrics_path = os.path.join(BASE_DIR, "optifunds_risk_metrics.csv")
    
    df_master = pd.read_csv(master_path)
    df_holdings = pd.read_csv(holdings_path)
    df_metrics = pd.read_csv(metrics_path) if os.path.exists(metrics_path) else pd.DataFrame()
    
    df_master["TER_Estimat"] = [
        resolve_ter(r["Instrument"], r["Fund Name"]) 
        for _, r in df_master.iterrows()
    ]
    fund_options = sorted(df_master["Fund Name"].dropna().unique().tolist())
    
    return df_master, df_holdings, df_metrics, fund_options