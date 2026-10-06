import streamlit as st
import pandas as pd
import plotly.express as px
from modules.data_loader import load_all_data
from modules.closet_indexing import audit_closet_indexing

st.set_page_config(page_title="Detector Closet Indexing | OptiFunds", layout="wide")

df_master, df_holdings, _, _, fund_options = load_all_data()

st.title("Detector de Closet Indexing & Active Share")
st.caption("Auditoria de carteres sobre l'univers de fons comercialitzats a Espanya.")

# Indexats representatius existents a la BD com a benchmarks
indexed_benchmarks = [f for f in fund_options if any(k in f.lower() for k in ["vanguard", "ishares core", "msci world", "s&p 500", "index"])]
if not indexed_benchmarks:
    indexed_benchmarks = fund_options

col1, col2 = st.columns(2)

with col1:
    default_fnd = "Fundsmith SICAV-Fundsmith Equity EUR T Acc"
    idx_fnd = fund_options.index(default_fnd) if default_fnd in fund_options else 0
    selected_fund_name = st.selectbox("Fons a auditar:", fund_options, index=idx_fnd)

with col2:
    default_bmk = "Vanguard Global Stock Index EUR Acc"
    idx_bmk = indexed_benchmarks.index(default_bmk) if default_bmk in indexed_benchmarks else 0
    selected_bmk_name = st.selectbox("Benchmark de referència:", indexed_benchmarks, index=idx_bmk)

result = audit_closet_indexing(selected_fund_name, selected_bmk_name)

if result is None or "error" in result:
    st.warning(f"No s'han trobat suficients posicions de cartera: {result.get('error', '')}")
else:
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Solapament de Cartera", f"{result['overlap']:.1f} %")
    m2.metric("Active Share", f"{result['active_share']:.1f} %")
    m3.metric("Comissió Oficial (TER)", f"{result['ter_fund']:.2f} %")
    m4.metric("TER Efectiu Part Activa", f"{result['ter_active_effective']:.2f} %")

    st.markdown("---")

    if result["alert_code"] == "CRITICAL":
        st.error(
            f"**Diagnòstic: {result['category']}**. "
            f"El fons replica un {result['overlap']:.1f}% de la referència. "
            f"Estàs pagant un **{result['ter_active_effective']:.2f}% anual** pel capital realment diferenciat."
        )
    elif result["alert_code"] == "WARNING":
        st.warning(
            f"**Diagnòstic: {result['category']}**. "
            f"Active Share del {result['active_share']:.1f}%. El gestor pren un risc limitat respecte a l'índex."
        )
    elif result["alert_code"] == "INDEXED":
        st.info(
            f"**Diagnòstic: {result['category']}**. "
            "Vehicle indexat d'estructura sistemàtica i baix cost operatiu."
        )
    else:
        st.success(
            f"**Diagnòstic: {result['category']}**. "
            f"Active Share elevat ({result['active_share']:.1f}%). Convicció autèntica de cartera."
        )

    c_left, c_right = st.columns([1, 1])

    with c_left:
        st.subheader("Estructura de la Cartera")
        df_pie = pd.DataFrame({
            "Component": ["Rèplica de l'Índex", "Gestió Diferenciada Activa"],
            "Percentatge": [result["overlap"], result["active_share"]]
        })
        fig_pie = px.pie(
            df_pie,
            values="Percentatge",
            names="Component",
            color_discrete_sequence=["#94A3B8", "#0D9488"],
            hole=0.4
        )
        st.plotly_chart(fig_pie, use_container_width=True)

    with c_right:
        st.subheader("Top Valors Compartits")
        df_top = result["top_overlaps"]
        if not df_top.empty:
            df_top_renamed = df_top.rename(columns={
                "Resolved_Name": "Actiu",
                "Shared_Weight": "Pes Comú (%)",
                "Clean_Weight_fnd": "Pes al Fons (%)",
                "Clean_Weight_bmk": "Pes al Benchmark (%)"
            })
            st.dataframe(df_top_renamed, hide_index=True, use_container_width=True)
        else:
            st.write("No hi ha posicions comunes rellevants.")
