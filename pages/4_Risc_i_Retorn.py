import streamlit as st
import pandas as pd
import plotly.express as px
from modules.data_loader import load_all_data

st.set_page_config(page_title="Risc i Rendibilitat - OptiFunds", layout="wide")
df_master, _, df_metrics, _, fund_options = load_all_data()

st.title("Risc i Rendibilitat Històrica")
st.caption("Avaluació del binomi rendibilitat-risc, Sharpe Ratio i màxim drawdown")

if df_metrics.empty:
    st.warning("No s'han trobat mètriques històriques calculades a optifunds_risk_metrics.csv.")
    st.stop()

# Selector interactiu per destacar un fons concret
selected_fund = st.selectbox("Destacar fons al mapa analític:", fund_options, index=0)

# Gràfic de dispersió: Risc vs Retorn (sense size negatiu)
fig_scatter = px.scatter(
    df_metrics,
    x="Volatilitat (%)",
    y="CAGR Anualitzat (%)",
    color="Sharpe Ratio",
    hover_name="Fons",
    hover_data={
        "Volatilitat (%)": ":.2f",
        "CAGR Anualitzat (%)": ":.2f",
        "Sharpe Ratio": ":.2f",
        "Retorn Total (%)": ":.2f",
        "Max Drawdown (%)": ":.2f"
    },
    title="Mapa de Risc i Retorn (Color: Sharpe Ratio)",
    color_continuous_scale="Viridis",
    labels={
        "Volatilitat (%)": "Volatilitat Anualitzada (%)",
        "CAGR Anualitzat (%)": "Rendibilitat Anualitzada CAGR (%)"
    }
)
fig_scatter.update_traces(marker=dict(size=10))

# Ressaltar el fons seleccionat
highlight_df = df_metrics[df_metrics["Fons"] == selected_fund]
if not highlight_df.empty:
    fig_scatter.add_scatter(
        x=highlight_df["Volatilitat (%)"],
        y=highlight_df["CAGR Anualitzat (%)"],
        mode="markers+text",
        marker=dict(color="red", size=16, symbol="star"),
        text=[selected_fund],
        textposition="top center",
        name="Seleccionat"
    )

st.plotly_chart(fig_scatter, width='stretch')

# Targetes de detall del fons triat
if not highlight_df.empty:
    row = highlight_df.iloc[0]
    st.subheader(f"Fitxa de Rendiment: {selected_fund}")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("CAGR Anualitzat", f"{row['CAGR Anualitzat (%)']:.2f} %")
    c2.metric("Volatilitat Anualitzada", f"{row['Volatilitat (%)']:.2f} %")
    c3.metric("Ràtio de Sharpe", f"{row['Sharpe Ratio']:.2f}")
    c4.metric("Màxim Drawdown", f"{row['Max Drawdown (%)']:.2f} %")

st.write("---")
st.subheader("Taula Completa de Mètriques de l'Univers")
st.dataframe(df_metrics.sort_values(by="Sharpe Ratio", ascending=False).reset_index(drop=True), width='stretch')
