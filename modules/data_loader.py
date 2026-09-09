from pathlib import Path
import duckdb
import pandas as pd
import streamlit as st

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MASTER_PARQUET = DATA_DIR / "optifunds_master_spain.parquet"
HOLDINGS_PARQUET = DATA_DIR / "optifunds_holdings_spain.parquet"

@st.cache_resource
def get_db_con():
    return duckdb.connect(database=":memory:")

@st.cache_data
def load_all_data():
    con = get_db_con()
    
    # 1. Carregar taula mestra
    df_master = con.execute(f"SELECT * FROM read_parquet('{MASTER_PARQUET}')").df()
    
    # Assegurar camps bàsics si tenen noms alternatius
    if "Fund Name" not in df_master.columns and "Asset Name" in df_master.columns:
        df_master["Fund Name"] = df_master["Asset Name"]
    if "Instrument" not in df_master.columns and "ISIN" in df_master.columns:
        df_master["Instrument"] = df_master["ISIN"]
        
    if "TER_Estimat" not in df_master.columns:
        df_master["TER_Estimat"] = 1.25
    df_master["TER_Estimat"] = df_master["TER_Estimat"].fillna(1.25)

    # 2. Carregar holdings
    df_holdings = con.execute(f"SELECT * FROM read_parquet('{HOLDINGS_PARQUET}')").df()
    
    # Llista ordenada de fons disponibles
    fund_options = sorted(df_master["Fund Name"].dropna().unique().tolist())
    
    # DataFrames auxiliars buits per mantenir compatibilitat
    df_metrics = pd.DataFrame()
    df_fees = pd.DataFrame()
    
    return df_master, df_holdings, df_metrics, df_fees, fund_options

def get_fund_holdings(fund_identifier: str) -> pd.DataFrame:
    con = get_db_con()
    query = f"""
        SELECT "Holding Name", "Holding RIC", "Clean_Weight"
        FROM read_parquet('{HOLDINGS_PARQUET}')
        WHERE "Instrument" = '{fund_identifier}'
        ORDER BY "Clean_Weight" DESC
    """
    return con.execute(query).df()
