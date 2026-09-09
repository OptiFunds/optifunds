import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
from modules.data_loader import load_all_data
from modules.pdf_generator import build_closet_indexing_pdf

st.set_page_config(page_title="Closet Indexing - OptiFunds", layout="wide")
df_master, df_holdings, _, _, fund_options = load_all_data()

st.title("Detector de Closet Indexing")
st.caption("Auditoria de gestió activa versus índex de referència")

col1, col2 = st.columns(2)
with col1:
    default_bmk = "Vanguard Global Stock Index EUR Acc"
    bmk_name = st.selectbox(
        "Benchmark de referència:", 
        fund_options, 
        index=fund_options.index(default_bmk) if default_bmk in fund_options else 0
    )
with col2:
    default_fnd = "Fundsmith SICAV-Fundsmith Equity EUR T Acc"
    fund_name = st.selectbox(
        "Fons a auditar:", 
        fund_options, 
        index=fund_options.index(default_fnd) if default_fnd in fund_options else (1 if len(fund_options) > 1 else 0)
    )

isin_bmk = df_master.loc[df_master["Fund Name"] == bmk_name, "Instrument"].values[0]
isin_fnd = df_master.loc[df_master["Fund Name"] == fund_name, "Instrument"].values[0]

ter_bmk = float(df_master.loc[df_master["Instrument"] == isin_bmk, "TER_Estimat"].values[0])
ter_fnd = float(df_master.loc[df_master["Instrument"] == isin_fnd, "TER_Estimat"].values[0])

p_bmk = df_holdings[df_holdings["Instrument"] == isin_bmk][["Holding RIC", "Clean_Weight"]]
p_fnd = df_holdings[df_holdings["Instrument"] == isin_fnd][["Holding RIC", "Clean_Weight"]]

merged = pd.merge(p_fnd, p_bmk, on="Holding RIC", how="outer", suffixes=("_fnd", "_bmk")).fillna(0.0)

sum_fnd = merged["Clean_Weight_fnd"].sum()
sum_bmk = merged["Clean_Weight_bmk"].sum()

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
m1.metric("Solapament amb Índex", f"{overlap:.1f} %")
m2.metric("Active Share", f"{active_share:.1f} %")
m3.metric("TER Oficial", f"{ter_fnd:.2f} %")
m4.metric("TER Efectiu Actiu", f"{ter_actiu:.2f} %")

is_closet = active_share < 50 and not any(k in fund_name.lower() for k in ["index", "etf", "vanguard", "core"])

if is_closet:
    st.error(f"Alerta de Closet Indexing: Solapament del {overlap:.1f}%. Es paga un {ter_actiu:.2f}% pel capital realment gestionat.")
else:
    st.success(f"Gestió diferencial confirmada (Active Share: {active_share:.1f}%).")

# Generador del fitxer PDF
pdf_bytes = build_closet_indexing_pdf(
    fund_name=fund_name,
    bmk_name=bmk_name,
    isin_fund=isin_fnd,
    isin_bmk=isin_bmk,
    overlap=overlap,
    active_share=active_share,
    ter_fund=ter_fnd,
    ter_actiu=ter_actiu,
    is_closet=is_closet
)

st.download_button(
    label="Descarregar Informe Executiu (PDF)",
    data=pdf_bytes,
    file_name=f"Auditoria_{isin_fnd}.pdf",
    mime="application/pdf"
)

df_drag = pd.DataFrame({
    "Component": ["Part Replicada de l'Índex", "Part Activa Diferenciada"],
    "Pes (%)": [overlap, active_share]
})
fig_drag = px.pie(
    df_drag,
    values="Pes (%)",
    names="Component",
    title="Desglossament de la Cartera: Índex vs Gestió Pròpia",
    color_discrete_sequence=["#94A3B8", "#0D9488"]
)
st.plotly_chart(fig_drag, width='stretch')
