import streamlit as st
import pandas as pd
import plotly.express as px
import duckdb
from pathlib import Path
from modules.data_loader import load_all_data

st.set_page_config(page_title="Portfolio Builder | OptiFunds", layout="wide")

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
HOLDINGS_PATH = DATA_DIR / "optifunds_holdings_spain.parquet"
MASTER_PATH = DATA_DIR / "optifunds_master_spain.parquet"

df_master, _, _, _, fund_options = load_all_data()

st.title("Radiografia de Cartera Multi-Fons")
st.caption("Combina fons i descobreix les teves exposicions reals agregades.")

default_selection = [f for f in ["Fundsmith SICAV-Fundsmith Equity EUR T Acc", "Vanguard Global Stock Index EUR Acc"] if f in fund_options]
if not default_selection and fund_options:
    default_selection = fund_options[:2]

selected_funds = st.multiselect("Afegeix fons a la cartera:", fund_options, default=default_selection)

if selected_funds:
    cols = st.columns(len(selected_funds))
    weights = {}
    default_w = round(100.0 / len(selected_funds), 1)

    for idx, f_name in enumerate(selected_funds):
        with cols[idx]:
            weights[f_name] = st.number_input(
                f"Pes (%): {f_name[:20]}...",
                min_value=0.0,
                max_value=100.0,
                value=default_w,
                step=5.0
            )

    total_alloc = sum(weights.values())
    if abs(total_alloc - 100.0) > 0.01:
        st.warning(f"La suma dels pesos és **{total_alloc:.1f}%**. Recorda ajustar-la al 100%.")

    con = duckdb.connect(database=":memory:")
    
    # Resoldre identificadors
    fund_clauses = []
    for f_name, alloc in weights.items():
        if alloc > 0:
            esc_name = f_name.replace("'", "''")
            fund_clauses.append(f"SELECT ISIN, RIC, Instrument, {alloc / 100.0} AS weight FROM read_parquet('{MASTER_PATH}') WHERE \"Fund Name\" = '{esc_name}'")

    if fund_clauses:
        union_query = " UNION ALL ".join(fund_clauses)
        agg_query = f"""
            WITH selected_targets AS ({union_query}),
            raw_holdings AS (
                SELECT 
                    h."Holding RIC",
                    h."Holding Name",
                    h."Clean_Weight" * t.weight AS weighted_pct
                FROM read_parquet('{HOLDINGS_PATH}') h
                JOIN selected_targets t
                  ON h."Instrument" = t.ISIN 
                  OR h."Instrument" = t.RIC 
                  OR h."Instrument" = t.Instrument
            )
            SELECT 
                "Holding Name" AS Actiu,
                "Holding RIC" AS RIC,
                ROUND(SUM(weighted_pct), 2) AS "Pes Cartera (%)"
            FROM raw_holdings
            GROUP BY "Holding Name", "Holding RIC"
            ORDER BY "Pes Cartera (%)" DESC
        """
        consolidated = con.execute(agg_query).df()
        con.close()

        if not consolidated.empty:
            c1, c2 = st.columns([1.3, 1])
            with c1:
                fig_port = px.bar(
                    consolidated.head(10),
                    x="Pes Cartera (%)",
                    y="Actiu",
                    orientation="h",
                    title="Top 10 Accions Reals Ponderades",
                    color="Pes Cartera (%)",
                    color_continuous_scale="Teal"
                )
                fig_port.update_layout(yaxis=dict(autorange="reversed"))
                st.plotly_chart(fig_port, use_container_width=True)

            with c2:
                top5 = consolidated.head(5)["Pes Cartera (%)"].sum()
                top10 = consolidated.head(10)["Pes Cartera (%)"].sum()
                st.metric("Concentració Top 5", f"{top5:.2f} %")
                st.metric("Concentració Top 10", f"{top10:.2f} %")
                st.dataframe(consolidated.head(20), hide_index=True, use_container_width=True)
        else:
            st.info("No s'han trobat posicions detallades per als fons seleccionats.")
else:
    st.info("Selecciona com a mínim un fons per generar la radiografia.")
