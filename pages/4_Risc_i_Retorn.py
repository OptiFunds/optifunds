import streamlit as st
import pandas as pd
import plotly.express as px
from modules.data_loader import load_all_data

st.set_page_config(page_title="Risc i Retorn | OptiFunds", layout="wide")

df_master, _, _, _, fund_options = load_all_data()

st.title("Risc i Rendibilitat Institucional")
st.caption("Frontera empírica i ràtios de Sharpe oficials Lipper.")

# Neteja de dades per al gràfic
df_valid = df_master.dropna(subset=["Volatility_3Y", "Return_3Y"]).copy()
df_valid = df_valid[df_valid["Volatility_3Y"] > 0]

categories = ["Totes"] + sorted(df_valid["Asset_Class"].dropna().unique().tolist())
cat_selected = st.selectbox("Filtrar per categoria Lipper:", categories)

if cat_selected != "Totes":
    df_valid = df_valid[df_valid["Asset_Class"] == cat_selected]

c1, c2, c3 = st.columns(3)
c1.metric("Fons Analitzats", len(df_valid))
c2.metric("Sharpe Mitjà (3Y)", f"{df_valid['Sharpe_3Y'].mean():.2f}" if "Sharpe_3Y" in df_valid else "N/D")
c3.metric("Volatilitat Mitjana (3Y)", f"{df_valid['Volatility_3Y'].mean():.2f} %")

st.markdown("---")

fig_scatter = px.scatter(
    df_valid.head(500), # Mostrem els 500 primers per fluïdesa
    x="Volatility_3Y",
    y="Return_3Y",
    hover_name="Fund Name",
    color="Sharpe_3Y",
    color_continuous_scale="Viridis",
    title="Frontera Empírica: Volatilitat vs Retorn (3 Anys)",
    labels={"Volatility_3Y": "Volatilitat Anualitzada (%)", "Return_3Y": "Retorn Anualitzat (%)"}
)
st.plotly_chart(fig_scatter, use_container_width=True)

st.subheader("Top 20 Fons per Ràtio de Sharpe (3 Anys)")
top_sharpe = df_valid.sort_values(by="Sharpe_3Y", ascending=False).head(20)
st.dataframe(
    top_sharpe[["Fund Name", "Asset_Class", "Sharpe_3Y", "Return_3Y", "Volatility_3Y", "TER_Estimat"]].rename(columns={
        "Fund Name": "Fons",
        "Asset_Class": "Categoria",
        "Sharpe_3Y": "Sharpe (3Y)",
        "Return_3Y": "Retorn 3Y (%)",
        "Volatility_3Y": "Volatilitat 3Y (%)",
        "TER_Estimat": "TER (%)"
    }),
    hide_index=True,
    use_container_width=True
)
