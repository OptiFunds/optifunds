import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
from modules.data_loader import load_all_data

st.set_page_config(page_title="Closet Indexing - OptiFunds", layout="wide")
df_master, df_holdings, _, fund_options = load_all_data()

st.title("Detector de Closet Indexing")
st.caption("Auditoria de gestio activa versus index de referencia")

col1, col2 = st.columns(2)
with col1:
    bmk_name = st.selectbox("Benchmark de referencia:", fund_options, index=0)
with col2:
    fund_name = st.selectbox("Fons a auditar:", fund_options, index=1 if len(fund_options) > 1 else 0)

isin_bmk = df_master.loc[df_master["Fund Name"] == bmk_name, "Instrument"].values[0]
isin_fnd = df_master.loc[df_master["Fund Name"] == fund_name, "Instrument"].values[0]

ter_bmk = float(df_master.loc[df_master["Instrument"] == isin_bmk, "TER_Estimat"].values[0])
ter_fnd = float(df_master.loc[df_master["Instrument"] == isin_fnd, "TER_Estimat"].values[0])

p_bmk = df_holdings[df_holdings["Instrument"] == isin_bmk][["Holding RIC", "Clean_Weight"]]
p_fnd = df_holdings[df_holdings["Instrument"] == isin_fnd][["Holding RIC", "Clean_Weight"]]

merged = pd.merge(p_fnd, p_bmk, on="Holding RIC", how="outer", suffixes=("_fnd", "_bmk")).fillna(0.0)

sum_fnd, sum_bmk = merged["Clean_Weight_fnd"].sum(), merged["Clean_Weight_bmk"].sum()
if sum_fnd > 0 and sum_bmk > 0:
    w_fnd = merged["Clean_Weight_fnd"] / sum_fnd
    w_bmk = merged["Clean_Weight_bmk"] / sum_bmk
    active_share = float(0.5 * np.sum(np.abs(w_fnd - w_bmk)) * 100)
    overlap = float(np.sum(np.minimum(w_fnd, w_bmk)) * 100)
else:
    active_share, overlap = 100.0, 0.0

as_ratio = max(active_share / 100.0, 0.05)
ter_actiu = (ter_fnd - (1 - as_ratio) * ter_bmk) / as_ratio

m1, m2, m3, m4 = st.columns(4)
m1.metric("Solapament amb Index", f"{overlap:.1f} %")
m2.metric("Active Share", f"{active_share:.1f} %")
m3.metric("TER Oficial", f"{ter_fnd:.2f} %")
m4.metric("TER Efectiu Actiu", f"{ter_actiu:.2f} %")

is_indexed = any(k in fund_name.lower() for k in ["index", "etf", "vanguard", "core"])
if is_indexed:
    st.info("Fons indexat legitim: cost reduit i replica sistematica de mercat.")
elif active_share < 50:
    st.error(f"Alerta de Closet Indexing: Solapament del {overlap:.1f}%. Es paga un {ter_actiu:.2f}% pel capital realment gestionat.")
else:
    st.success(f"Gestio diferencial confirmada (Active Share: {active_share:.1f}%).")

df_drag = pd.DataFrame({
    "Component": ["Part Indexada Replicada", "Part de Gestio Autentica"],
    "Pes (%)": [overlap, active_share]
})
fig_drag = px.pie(
    df_drag,
    values="Pes (%)",
    names="Component",
    title="Desglossament de la Cartera: Index vs Gestio Propia",
    color_discrete_sequence=["#94A3B8", "#0D9488"]
)
st.plotly_chart(fig_drag, use_container_width=True)