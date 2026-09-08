import os
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 1. Carregar dades
df_master = pd.read_csv(os.path.join(BASE_DIR, "optifunds_master.csv"))
df_metrics = pd.read_csv(os.path.join(BASE_DIR, "optifunds_risk_metrics.csv"))

# Mapeig de TER per defecte en cas que no estigui informat al fitxer Master
# (Vanguard: 0.18%, Amundi: 0.30%, Fundsmith: 1.05%, Gestió bancària clàssica: 1.80%)
DEFAULT_TER = {
    "IE00B03HD191": 0.18,
    "LU0996182563": 0.30,
    "LU0690375182": 1.05
}

def simulate_fee_drag(
    initial_investment: float = 10000.0,
    monthly_contribution: float = 300.0,
    gross_annual_return: float = 0.07,  # Retorn brut de referència: 7% anual
    ter_percent: float = 0.18,
    years: int = 25
) -> dict:
    months = years * 12
    monthly_gross_r = (1 + gross_annual_return) ** (1 / 12) - 1
    monthly_net_r = (1 + (gross_annual_return - (ter_percent / 100))) ** (1 / 12) - 1

    balance_gross = initial_investment
    balance_net = initial_investment

    for _ in range(months):
        balance_gross = balance_gross * (1 + monthly_gross_r) + monthly_contribution
        balance_net = balance_net * (1 + monthly_net_r) + monthly_contribution

    total_contributions = initial_investment + (monthly_contribution * months)
    lost_to_fees = balance_gross - balance_net

    return {
        "Capital Aportat (€)": round(total_contributions, 2),
        "Capital Final Net (€)": round(balance_net, 2),
        "Cost Acumulat de Comissions (€)": round(lost_to_fees, 2),
        "Pèrdua Patrimonial (%)": round((lost_to_fees / balance_gross) * 100, 2)
    }

# Simulació comparativa a 25 anys amb 10.000 € inicials + 300 €/mes
INVESTMENT_HORIZON_YEARS = 25
INITIAL_CAPITAL = 10000.0
MONTHLY_SAVING = 300.0
MARKET_GROSS_RETURN = 0.07

results = []
for isin, ter in DEFAULT_TER.items():
    fund_name = df_master.loc[df_master["Instrument"] == isin, "Fund Name"].values[0]
    sim = simulate_fee_drag(
        initial_investment=INITIAL_CAPITAL,
        monthly_contribution=MONTHLY_SAVING,
        gross_annual_return=MARKET_GROSS_RETURN,
        ter_percent=ter,
        years=INVESTMENT_HORIZON_YEARS
    )
    results.append({
        "Fons": fund_name,
        "TER (%)": ter,
        **sim
    })

# Cas de referència: Fons bancari estàndard d'autor amb comissió del 1.80%
bank_sim = simulate_fee_drag(
    initial_investment=INITIAL_CAPITAL,
    monthly_contribution=MONTHLY_SAVING,
    gross_annual_return=MARKET_GROSS_RETURN,
    ter_percent=1.80,
    years=INVESTMENT_HORIZON_YEARS
)
results.append({
    "Fons": "Fons Renda Variable Tradicional (Banca)",
    "TER (%)": 1.80,
    **bank_sim
})

df_costs = pd.DataFrame(results)

print("=" * 95)
print(f"OPTIFUNDS - SIMULACIÓ D'IMPACTE DE COMISSIONS A {INVESTMENT_HORIZON_YEARS} ANYS")
print(f"Base: {INITIAL_CAPITAL:,.0f} € inicials + {MONTHLY_SAVING:,.0f} €/mes | Retorn brut estimat: {MARKET_GROSS_RETURN*100:.1f}%")
print("=" * 95)
print(df_costs[["Fons", "TER (%)", "Capital Final Net (€)", "Cost Acumulat de Comissions (€)", "Pèrdua Patrimonial (%)"]].to_string(index=False))

df_costs.to_csv(os.path.join(BASE_DIR, "optifunds_fee_impact.csv"), index=False)
print(f"\nResultats guardats a '{os.path.join(BASE_DIR, 'optifunds_fee_impact.csv')}'.")