import streamlit as st
import pandas as pd
import plotly.express as px
from modules.data_loader import load_all_data

st.set_page_config(page_title="Solapament Pairwise - OptiFunds", layout="wide")
df_master, df_holdings, _, _, fund_options = load_all_data()

st.title("Solapament Pairwise")
st.caption("Intersecció exacta de títols compartits entre dos fons d'inversió")

col1, col2 = st.columns(2)
with col1:
    f1_name = st.selectbox(
        "Primer Fons:", 
        fund_options, 
        index=0
    )
with col2:
    f2_default_idx = 1 if len(fund_options) > 1 else 0
    f2_name = st.selectbox(
        "Segon Fons:", 
        fund_options, 
        index=f2_default_idx
    )

isin_1 = df_master.loc[df_master["Fund Name"] == f1_name, "Instrument"].values[0]
isin_2 = df_master.loc[df_master["Fund Name"] == f2_name, "Instrument"].values[0]

port1 = df_holdings[df_holdings["Instrument"] == isin_1][["Holding RIC", "Holding Name", "Clean_Weight"]]
port2 = df_holdings[df_holdings["Instrument"] == isin_2][["Holding RIC", "Clean_Weight"]]

merged = pd.merge(port1, port2, on="Holding RIC", suffixes=(f"_f1", f"_f2"))

if not merged.empty:
    merged["Overlap_%"] = merged[["Clean_Weight_f1", "Clean_Weight_f2"]].min(axis=1)
    merged = merged.sort_values(by="Overlap_%", ascending=False).reset_index(drop=True)
    total_overlap = float(merged["Overlap_%"].sum())
else:
    total_overlap = 0.0

st.write("---")
m1, m2, m3 = st.columns(3)
m1.metric("Solapament Total", f"{total_overlap:.2f} %")
m2.metric("Títols Coincidents", len(merged))
diff_weight = max(0.0, 100.0 - total_overlap)
m3.metric("Diversificació Real", f"{diff_weight:.2f} %")

if not merged.empty:
    fig = px.bar(
        merged.head(10),
        x="Overlap_%",
        y="Holding Name",
        orientation="h",
        title="Top 10 Accions Amb Major Solapament",
        labels={"Overlap_%": "Solapament Conjunt (%)", "Holding Name": "Companyia"},
        color="Overlap_%",
        color_continuous_scale="Viridis"
    )
    fig.update_layout(yaxis=dict(autorange="reversed"))
    st.plotly_chart(fig, width='stretch')

    st.subheader("Desglossament Complet d'Accions Compartides")
    st.dataframe(
        merged.rename(columns={
            "Holding Name": "Companyia Subjacent",
            "Holding RIC": "Identificador RIC",
            "Clean_Weight_f1": f"Pes a {f1_name[:20]} (%)",
            "Clean_Weight_f2": f"Pes a {f2_name[:20]} (%)",
            "Overlap_%": "Solapament Mínim (%)"
        }),
        width='stretch'
    )
else:
    st.info("No s'han trobat títols coincidents entre les carteres seleccionades.")
