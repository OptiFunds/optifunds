import streamlit as st
import pandas as pd
from modules.data_loader import load_all_data

st.set_page_config(
    page_title="OptiFunds Analytics",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

df_master, df_holdings, df_metrics, df_fees, fund_options = load_all_data()

# Capçalera Institucional
st.title("OptiFunds Analytics Platform")
st.caption("Plataforma quantitativa d'auditoria de carteres, anàlisi d'overlap i optimització de costos")
st.write("---")

# Mètriques Clau Globals
c1, c2, c3, c4 = st.columns(4)
c1.metric("Fons a la Base de Dades", len(fund_options))
c2.metric("Posicions de Cartera Analitzades", len(df_holdings))

avg_ter = df_master["TER_Estimat"].mean() if "TER_Estimat" in df_master.columns else 1.25
c3.metric("TER Mitjà de l'Univers", f"{avg_ter:.2f} %")

top_sharpe_fund = "-"
if not df_metrics.empty and "Sharpe Ratio" in df_metrics.columns:
    top_sharpe_fund = df_metrics.sort_values(by="Sharpe Ratio", ascending=False).iloc[0]["Fons"]
c4.metric("Millor Ràtio de Sharpe", f"{df_metrics['Sharpe Ratio'].max():.2f}" if not df_metrics.empty else "-", top_sharpe_fund[:20])

st.write("---")

# Targetes d'Eines (Grid 2 columnes)
st.subheader("Mòduls Analítics Disponibles")
col_left, col_right = st.columns(2)

with col_left:
    with st.container(border=True):
        st.subheader("1. Detector de Closet Indexing")
        st.write("Calcula l'Active Share pur davant del benchmark i desemmascara el TER efectiu pagat per la gestió autèntica.")
        st.caption("Eina recomanada per auditar fons bancaris tradicionals.")

    with st.container(border=True):
        st.subheader("2. Portfolio Builder Multi-Fons")
        st.write("Agrega carteres barrejades, consolida els actius subjacents reals i avalua la concentració al Top 10.")
        st.caption("Permet assignar percentatges personalitzats de capital.")

    with st.container(border=True):
        st.subheader("3. Solapament Pairwise (1 vs 1)")
        st.write("Inspecciona la intersecció de carteres entre dos fons per evitar duplicitats innecessàries de companyies.")
        st.caption("Identifica títols coincidents per codi RIC i pes.")

with col_right:
    with st.container(border=True):
        st.subheader("4. Risc i Rendibilitat Històrica")
        st.write("Avalua la frontera eficient creuant el CAGR anualitzat amb la volatilitat, el màxim drawdown i el Sharpe.")
        st.caption("Mapat complet de dispersió sobre dades reals.")

    with st.container(border=True):
        st.subheader("5. Simulador d'Erosió per Costos (TER)")
        st.write("Projecció patrimonial actuarial de l'impacte de les comissions compostes a horitzons de 10 a 40 anys.")
        st.caption("Calcula els diners totals perduts davant un indexat equivalent.")

st.write("---")

# Resum dels Top Fons per Eficiència
if not df_metrics.empty:
    st.subheader("Top Fons per Eficiència (Ràtio de Sharpe)")
    top_table = df_metrics.sort_values(by="Sharpe Ratio", ascending=False).head(5)[[
        "Fons", "Sharpe Ratio", "CAGR Anualitzat (%)", "Volatilitat (%)", "Max Drawdown (%)"
    ]]
    st.dataframe(top_table, width='stretch')
