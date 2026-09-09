import streamlit as st
import pandas as pd
import plotly.express as px
from modules.data_loader import load_all_data
from modules.closet_indexing import audit_closet_indexing, BENCHMARK_PROXIES

st.set_page_config(page_title="Detector Closet Indexing | OptiFunds", layout="wide")

df_master, df_holdings, _, _, fund_options = load_all_data()

st.title("Detector de Closet Indexing & Active Share")
st.caption("Auditoria de carteres sobre l'univers de fons comercialitzats a Espanya.")

# Selectors
col1, col2 = st.columns(2)

with col1:
    default_fnd = "Fundsmith SICAV-Fundsmith Equity EUR T Acc"
    idx_fnd = fund_options.index(default_fnd) if default_fnd in fund_options else 0
    selected_fund_name = st.selectbox("Fons a auditar:", fund_options, index=idx_fnd)

with col2:
    # Llista de benchmarks disponibles al mercat
    bmk_options = [b["name"] for b in BENCHMARK_PROXIES.values()] + fund_options[:50]
    bmk_options = sorted(list(set(bmk_options)))
    default_bmk = BENCHMARK_PROXIES["GLOBAL"]["name"]
    idx_bmk = bmk_options.index(default_bmk) if default_bmk in bmk_options else 0
    selected_bmk_name = st.selectbox("Benchmark de referència:", bmk_options, index=idx_bmk)

# Recuperar ISINs
isin_fund = df_master.loc[df_master["Fund Name"] == selected_fund_name, "Instrument"].values[0]
isin_bmk_series = df_master.loc[df_master["Fund Name"] == selected_bmk_name, "Instrument"]
isin_bmk = isin_bmk_series.values[0] if not isin_bmk_series.empty else BENCHMARK_PROXIES["GLOBAL"]["isin"]

result = audit_closet_indexing(isin_fund, isin_bmk)

if result is None or "error" in result:
    st.warning("No s'han trobat suficients posicions de cartera per auditar aquest vehicle.")
else:
    # Panell de mètriques
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Solapament de Cartera", f"{result['overlap']:.1f} %")
    m2.metric("Active Share", f"{result['active_share']:.1f} %")
    m3.metric("Comissió Oficial (TER)", f"{result['ter_fund']:.2f} %")
    m4.metric("TER Efectiu Part Activa", f"{result['ter_active_effective']:.2f} %")

    st.markdown("---")

    # Banner d'avaluació institucional
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

    # Gràfics: Distribució i solapament de títols
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
