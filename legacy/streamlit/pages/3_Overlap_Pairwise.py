import streamlit as st
import pandas as pd
import plotly.express as px
import duckdb
from pathlib import Path
from modules.data_loader import load_all_data

st.set_page_config(page_title="Solapament Pairwise | OptiFunds", layout="wide")

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
HOLDINGS_PATH = DATA_DIR / "optifunds_holdings_spain.parquet"
MASTER_PATH = DATA_DIR / "optifunds_master_spain.parquet"

df_master, _, _, _, fund_options = load_all_data()

st.title("Solapament Pairwise (1 vs 1)")
st.caption("Inspecciona la intersecció de carteres entre dos fons qualsevol.")

col1, col2 = st.columns(2)
with col1:
    f1 = st.selectbox("Primer fons:", fund_options, index=0)
with col2:
    idx_f2 = 1 if len(fund_options) > 1 else 0
    f2 = st.selectbox("Segon fons:", fund_options, index=idx_f2)

def get_positions(con, fund_name):
    esc = fund_name.replace("'", "''")
    query = f"""
        WITH target AS (
            SELECT ISIN, RIC, Instrument FROM read_parquet('{MASTER_PATH}') WHERE \"Fund Name\" = '{esc}' LIMIT 1
        )
        SELECT h."Holding RIC", h."Holding Name", h."Clean_Weight"
        FROM read_parquet('{HOLDINGS_PATH}') h
        JOIN target t ON h."Instrument" = t.ISIN OR h."Instrument" = t.RIC OR h."Instrument" = t.Instrument
    """
    return con.execute(query).df()

con = duckdb.connect(database=":memory:")
p1 = get_positions(con, f1)
p2 = get_positions(con, f2)
con.close()

if not p1.empty and not p2.empty:
    merged = pd.merge(p1, p2, on="Holding RIC", suffixes=("_f1", "_f2"))
    merged["Overlap_%"] = merged[["Clean_Weight_f1", "Clean_Weight_f2"]].min(axis=1)
    merged = merged.sort_values(by="Overlap_%", ascending=False).reset_index(drop=True)

    total_overlap = merged["Overlap_%"].sum()
    st.metric("Solapament Total Conjunt", f"{total_overlap:.2f} %")

    if not merged.empty and total_overlap > 0:
        c_left, c_right = st.columns([1.2, 1])
        with c_left:
            fig_ov = px.bar(
                merged.head(10),
                x="Overlap_%",
                y="Holding Name_f1",
                orientation="h",
                title="Top Accions Solapades",
                labels={"Overlap_%": "Solapament (%)", "Holding Name_f1": "Actiu"},
                color="Overlap_%",
                color_continuous_scale="Blues"
            )
            fig_ov.update_layout(yaxis=dict(autorange="reversed"))
            st.plotly_chart(fig_ov, use_container_width=True)

        with c_right:
            display_df = merged[["Holding Name_f1", "Holding RIC", "Clean_Weight_f1", "Clean_Weight_f2", "Overlap_%"]].rename(columns={
                "Holding Name_f1": "Actiu",
                "Holding RIC": "RIC",
                "Clean_Weight_f1": f"Pes a {f1[:15]} (%)",
                "Clean_Weight_f2": f"Pes a {f2[:15]} (%)",
                "Overlap_%": "Mínim Compartit (%)"
            })
            st.dataframe(display_df, hide_index=True, use_container_width=True)
    else:
        st.info("No s'han trobat posicions coincidents entre aquests dos fons.")
else:
    st.warning("Un dels dos fons seleccionats no té desglossament de holdings disponible.")
