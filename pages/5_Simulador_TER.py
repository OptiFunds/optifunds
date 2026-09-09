import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from modules.data_loader import load_all_data

st.set_page_config(page_title="Simulador TER - OptiFunds", layout="wide")
df_master, _, _, _, fund_options = load_all_data()

st.title("Simulador d'Erosió per Costos (TER)")
st.caption("Projecció de pèrdua patrimonial acumulada per comissions compostes a llarg termini")

col_f1, col_f2 = st.columns(2)
with col_f1:
    fons_actiu = st.selectbox(
        "Fons o producte amb comissió tradicional:", 
        fund_options, 
        index=fund_options.index("Fundsmith SICAV-Fundsmith Equity EUR T Acc") if "Fundsmith SICAV-Fundsmith Equity EUR T Acc" in fund_options else 0
    )
with col_f2:
    fons_indexat = st.selectbox(
        "Alternativa indexada / baix cost:", 
        fund_options, 
        index=fund_options.index("Vanguard Global Stock Index EUR Acc") if "Vanguard Global Stock Index EUR Acc" in fund_options else 0
    )

isin_act = df_master.loc[df_master["Fund Name"] == fons_actiu, "Instrument"].values[0]
isin_idx = df_master.loc[df_master["Fund Name"] == fons_indexat, "Instrument"].values[0]

ter_act = float(df_master.loc[df_master["Instrument"] == isin_act, "TER_Estimat"].values[0])
ter_idx = float(df_master.loc[df_master["Instrument"] == isin_idx, "TER_Estimat"].values[0])

st.write("---")
c1, c2, c3, c4 = st.columns(4)
with c1:
    init_cap = st.number_input("Capital Inicial (€):", min_value=1000, value=10000, step=1000)
with c2:
    monthly_cap = st.number_input("Aportació Mensual (€):", min_value=0, value=300, step=50)
with c3:
    years = st.slider("Horitzó Temporal (Anys):", min_value=5, max_value=40, value=25, step=5)
with c4:
    gross_return = st.slider("Rendibilitat Bruta Anual (%):", min_value=1.0, max_value=12.0, value=7.0, step=0.5)

# Càlcul mes a mes amb aportacions
months = years * 12
r_gross = gross_return / 100.0 / 12.0
r_act = (gross_return - ter_act) / 100.0 / 12.0
r_idx = (gross_return - ter_idx) / 100.0 / 12.0

timeline = list(range(years + 1))
curve_gross, curve_act, curve_idx = [init_cap], [init_cap], [init_cap]

cur_g, cur_a, cur_i = init_cap, init_cap, init_cap
for m in range(1, months + 1):
    cur_g = cur_g * (1 + r_gross) + monthly_cap
    cur_a = cur_a * (1 + r_act) + monthly_cap
    cur_i = cur_i * (1 + r_idx) + monthly_cap
    
    if m % 12 == 0:
        curve_gross.append(round(cur_g, 2))
        curve_act.append(round(cur_a, 2))
        curve_idx.append(round(cur_i, 2))

diff_money = curve_idx[-1] - curve_act[-1]
diff_pct = (diff_money / curve_idx[-1]) * 100.0 if curve_idx[-1] > 0 else 0.0

m1, m2, m3 = st.columns(3)
m1.metric("Capital amb Fons Actiu", f"{curve_act[-1]:,.2f} €", f"TER: {ter_act:.2f}%")
m2.metric("Capital amb Fons Indexat", f"{curve_idx[-1]:,.2f} €", f"TER: {ter_idx:.2f}%")
m3.metric("Estalvi / Diners Perduts", f"{diff_money:,.2f} €", f"-{diff_pct:.1f}%")

fig = go.Figure()
fig.add_trace(go.Scatter(x=timeline, y=curve_gross, mode="lines", name="Retorn Brut Teòric", line=dict(dash="dash", color="#94A3B8")))
fig.add_trace(go.Scatter(x=timeline, y=curve_idx, mode="lines", name=f"Indexat ({ter_idx:.2f}%)", line=dict(color="#0D9488", width=3)))
fig.add_trace(go.Scatter(x=timeline, y=curve_act, mode="lines", name=f"Actiu ({ter_act:.2f}%)", line=dict(color="#DC2626", width=3)))

fig.update_layout(
    title="Evolució del Patrimoni Net al Llarg del Temps",
    xaxis_title="Anys",
    yaxis_title="Patrimoni Acumulat (€)",
    hovermode="x unified"
)
st.plotly_chart(fig, width='stretch')
