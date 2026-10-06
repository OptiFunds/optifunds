import streamlit as st
import pandas as pd
import plotly.express as px
from modules.data_loader import load_all_data

st.set_page_config(page_title="Simulador TER | OptiFunds", layout="wide")

df_master, _, _, _, fund_options = load_all_data()

st.title("Simulador d'Erosió de Capital per Comissions")
st.caption("Compara el cost compost a llarg termini entre qualsevol fons i una solució indexada.")

col_sel, _ = st.columns([2, 1])
with col_sel:
    default_f = "Fundsmith SICAV-Fundsmith Equity EUR T Acc"
    idx = fund_options.index(default_f) if default_f in fund_options else 0
    f_chosen = st.selectbox("Fons a comparar:", fund_options, index=idx)

ter_f = float(df_master.loc[df_master["Fund Name"] == f_chosen, "TER_Estimat"].values[0])

c1, c2, c3, c4 = st.columns(4)
init_cap = c1.number_input("Capital Inicial (€)", value=10000, step=1000)
monthly = c2.number_input("Aportació Mensual (€)", value=300, step=50)
years = c3.slider("Horitzó (Anys)", 5, 40, 25)
gross_ret = c4.number_input("Rendibilitat Bruta Anual (%)", value=7.0, step=0.5) / 100.0

# Comparació contra indexat estàndard (0.18% TER)
ter_index = 0.18

def simulate_wealth(ter):
    months = years * 12
    r_net = (1 + (gross_ret - (ter / 100.0))) ** (1 / 12) - 1
    bal = init_cap
    for _ in range(months):
        bal = bal * (1 + r_net) + monthly
    return bal

net_fund = simulate_wealth(ter_f)
net_index = simulate_wealth(ter_index)
loss_fees = net_index - net_fund

m1, m2, m3 = st.columns(3)
m1.metric("Capital amb Fons Escollit", f"{net_fund:,.0f} €")
m2.metric("Capital amb Solució Indexada", f"{net_index:,.0f} €")
m3.metric("Erosió Total per Comissions", f"-{loss_fees:,.0f} €", delta_color="inverse")

df_sim = pd.DataFrame({
    "Vehicle": [f_chosen[:30], "Alternativa Indexada (0.18% TER)"],
    "TER (%)": [ter_f, ter_index],
    "Capital Final (€)": [round(net_fund, 2), round(net_index, 2)]
})

fig_bar = px.bar(
    df_sim,
    x="Vehicle",
    y="Capital Final (€)",
    text="Capital Final (€)",
    color="Vehicle",
    color_discrete_sequence=["#94A3B8", "#0D9488"]
)
st.plotly_chart(fig_bar, use_container_width=True)
