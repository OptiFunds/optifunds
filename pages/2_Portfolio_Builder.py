import streamlit as st
import pandas as pd
import plotly.express as px
from modules.data_loader import load_all_data

st.set_page_config(page_title="Portfolio Builder - OptiFunds", layout="wide")
df_master, df_holdings, _, _, fund_options = load_all_data()

st.title("Portfolio Builder")
st.caption("Radiografia consolidada d'actius subjacents per a carteres multi-fons")

# Selecció de carteres
default_selection = [fund_options[0], fund_options[1]] if len(fund_options) > 1 else [fund_options[0]]
selected_funds = st.multiselect("Selecciona els fons de la teva cartera:", fund_options, default=default_selection)

if not selected_funds:
    st.info("Selecciona com a mínim un fons per generar la radiografia de cartera.")
    st.stop()

# Assignació dinàmica de pesos percentuals
st.write("---")
cols = st.columns(len(selected_funds))
weights = {}
equal_weight = round(100.0 / len(selected_funds), 1)

for idx, fund_name in enumerate(selected_funds):
    with cols[idx]:
        weights[fund_name] = st.number_input(
            f"Pes % ({fund_name[:15]}...)", 
            min_value=0.0, 
            max_value=100.0, 
            value=equal_weight, 
            step=5.0
        )

total_w = sum(weights.values())
if total_w != 100.0:
    st.warning(f"La suma dels pesos és del {total_w:.1f}%. Ajusta'ls fins al 100.0% per a una anàlisi precisa.")

# Agregació ponderada de posicions (Holdings)
aggregated_list = []
weighted_ter = 0.0

for fund_name, weight in weights.items():
    if weight <= 0:
        continue
    isin = df_master.loc[df_master["Fund Name"] == fund_name, "Instrument"].values[0]
    ter = float(df_master.loc[df_master["Instrument"] == isin, "TER_Estimat"].values[0])
    weighted_ter += ter * (weight / 100.0)
    
    sub_h = df_holdings[df_holdings["Instrument"] == isin].copy()
    sub_h["Effective_Weight"] = sub_h["Clean_Weight"] * (weight / 100.0)
    aggregated_list.append(sub_h)

if aggregated_list:
    df_portfolio = pd.concat(aggregated_list)
    df_consolidated = (
        df_portfolio.groupby(["Holding RIC", "Holding Name"])["Effective_Weight"]
        .sum()
        .reset_index()
        .sort_values(by="Effective_Weight", ascending=False)
        .reset_index(drop=True)
    )

    st.write("---")
    m1, m2, m3 = st.columns(3)
    m1.metric("TER Mitjà Ponderat", f"{weighted_ter:.2f} %")
    m2.metric("Posicions Diferents Identificades", len(df_consolidated))
    top_10_weight = df_consolidated["Effective_Weight"].head(10).sum()
    m3.metric("Concentració Top 10 Accions", f"{top_10_weight:.1f} %")

    # Gràfic de barres horitzontal de concentració real
    fig_holdings = px.bar(
        df_consolidated.head(10),
        x="Effective_Weight",
        y="Holding Name",
        orientation="h",
        title="Top 10 Posicions Reals de la Cartera Conjunta",
        labels={"Effective_Weight": "Pes Ponderat (%)", "Holding Name": "Companyia"},
        color="Effective_Weight",
        color_continuous_scale="Teal"
    )
    fig_holdings.update_layout(yaxis=dict(autorange="reversed"))
    st.plotly_chart(fig_holdings, width='stretch')

    # Taula detallada
    st.dataframe(
        df_consolidated.rename(columns={
            "Holding Name": "Empresa Subjacent",
            "Holding RIC": "Identificador RIC",
            "Effective_Weight": "Pes Net a Cartera (%)"
        }).head(20),
        width='stretch'
    )
