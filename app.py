import streamlit as st
from modules.data_loader import load_all_data

# Configuració de la pàgina principal
st.set_page_config(
    page_title="OptiFunds Analytics",
    page_icon="📊",
    layout="wide"
)

st.title("OptiFunds Analytics")
st.caption("Plataforma institucional d'auditoria de fons, anàlisi de solapament i costos.")

# Carregar dades a memòria des del mòdul central
try:
    df_master, df_holdings, df_metrics, fund_options = load_all_data()
    st.success(f"Base de dades operativa: **{len(fund_options)} fons** i carteres preparades per a l'anàlisi.")
except Exception as e:
    st.error(f"Error connectant amb les dades locals: {e}")
    st.stop()

st.markdown("---")

# Resum d'eines disponibles
st.subheader("Mòduls analítics de la plataforma")
st.markdown("Fes servir la **barra lateral esquerra** per accedir a cadascuna de les eines:")

col1, col2 = st.columns(2)

with col1:
    st.markdown("""
    * **🕵️ Detector de Closet Indexing:**
      Audita si un fons actiu car replica el seu benchmark i calcula la comissió real pagada per la part diferencial.
      
    * **🧩 Portfolio Builder:**
      Combina múltiples fons en percentatges personalitzats i obtén la radiografia ponderada d'accions reals.
    """)

with col2:
    st.markdown("""
    * **🔍 Solapament Pairwise:**
      Matriu creuada d'accions compartides entre dos fons qualsevol.
      
    * **📈 Risc i Rendibilitat:**
      Quadre de comandament amb ràtio de Sharpe, CAGR, volatilitat i drawdown històric.
      
    * **💸 Simulador de TER:**
      Projecció financera de l'erosió patrimonial per costos a llarg termini.
    """)