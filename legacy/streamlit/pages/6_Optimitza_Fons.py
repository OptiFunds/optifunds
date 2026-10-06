import streamlit as st
import pandas as pd
from modules.data_loader import load_all_data
from modules.optimizer import find_cheaper_alternatives

st.set_page_config(page_title="Optimitza el teu Fons | OptiFunds", layout="wide")

df_master, _, _, _, fund_options = load_all_data()

st.title("Optimitza el teu Fons d'Inversió")
st.caption("Introdueix qualsevol fons o ISIN comercialitzat a Espanya i descobreix si estàs pagant comissions de més per una cartera replicable.")

# Selecció per text/ISIN o desplegable
c_input, c_thresh = st.columns([2, 1])

with c_input:
    search_query = st.text_input("Escriu l'ISIN o el nom del fons:", value="Fondo Naranja Nasdaq 100, FI")

with c_thresh:
    min_sim = st.slider("Solapament mínim exigit (%):", min_value=20, max_value=90, value=35, step=5)

if search_query:
    with st.spinner("Rastrejant alternatives a la base de dades DuckDB..."):
        res = find_cheaper_alternatives(search_query, min_overlap=float(min_sim))

    if "error" in res:
        st.warning(res["error"])
    else:
        src = res["source"]
        alts = res["alternatives"]

        st.subheader(f"Anàlisi per a: {src['name']}")
        c1, c2, c3 = st.columns(3)
        c1.metric("ISIN", src["isin"])
        c2.metric("Comissió Oficial (TER)", f"{src['ter']:.2f} %")
        c3.metric("Rendibilitat 3 Anys", f"{src['ret_3y']:.2f} %" if src['ret_3y'] is not None else "N/D")

        st.markdown("---")

        if not alts:
            st.info(f"No s'han trobat fons indexats amb més del {min_sim}% de solapament i menor comissió. El teu fons manté una selecció prou diferenciada o ja és de baix cost.")
        else:
            st.subheader(f"S'han trobat {len(alts)} alternatives més eficients:")

            best = alts[0]
            
            # Frase d'impacte directe tipus reclam
            st.success(
                f"**Diagnòstic d'Optimitza:** L'alternativa **{best['cand_name']}** (ISIN: `{best['cand_isin']}`) "
                f"és un **{best['overlap']:.1f}% idèntica** a la teva cartera i cobra un **{best['ter_savings']:.2f}% menys a l'any** "
                f"(TER {best['cand_ter']:.2f}% vs {src['ter']:.2f}%)."
            )

            if best["ret_gap_3y"] is not None and best["ret_gap_3y"] > 0:
                st.write(
                    f"A més, en els darrers 3 anys aquesta alternativa t'hauria aportat un **+{best['ret_gap_3y']:.2f}% de rendibilitat addicional** gràcies a l'estalvi compost de comissions."
                )

            # Taula comparativa d'alternatives
            table_rows = []
            for a in alts:
                ret_diff_str = f"+{a['ret_gap_3y']:.2f} %" if (a['ret_gap_3y'] is not None and a['ret_gap_3y'] >= 0) else (f"{a['ret_gap_3y']:.2f} %" if a['ret_gap_3y'] is not None else "N/D")
                table_rows.append({
                    "Alternativa": a["cand_name"],
                    "ISIN": a["cand_isin"],
                    "Solapament (%)": f"{a['overlap']:.1f} %",
                    "TER (%)": f"{a['cand_ter']:.2f} %",
                    "Estalvi TER Anual": f"-{a['ter_savings']:.2f} %",
                    "Diferència Retorn (3Y)": ret_diff_str
                })

            st.dataframe(pd.DataFrame(table_rows), hide_index=True, use_container_width=True)

            # Simulació d'estalvi econòmic a 20 anys
            st.subheader("Projecció de traspàs patrimonial a 20 anys")
            cap_inv = st.number_input("Capital invertit (€):", min_value=1000, value=25000, step=5000)
            
            # Càlcul del cost acumulat només pel diferencial de TER a 20 anys
            diff_ter = best["ter_savings"] / 100.0
            r_gross = 0.07
            months = 20 * 12
            
            # Balanç amb el fons actual
            r_net_src = (1 + (r_gross - (src["ter"] / 100.0))) ** (1 / 12) - 1
            cap_src = cap_inv * ((1 + r_net_src) ** months)
            
            # Balanç amb l'alternativa
            r_net_alt = (1 + (r_gross - (best["cand_ter"] / 100.0))) ** (1 / 12) - 1
            cap_alt = cap_inv * ((1 + r_net_alt) ** months)
            
            estalvi_total = cap_alt - cap_src

            m_c1, m_c2, m_c3 = st.columns(3)
            m_c1.metric("Capital amb el teu fons actual", f"{cap_src:,.0f} €")
            m_c2.metric("Capital amb l'alternativa indexada", f"{cap_alt:,.0f} €")
            m_c3.metric("Diners perduts en comissions", f"-{estalvi_total:,.0f} €", delta_color="inverse")
            
            st.caption("A Espanya el traspàs entre fons d'inversió està exempt de tributació fiscal (Llei 35/2006).")
