import os
import numpy as np
import pandas as pd

# Obtenir ruta absoluta del directori actual
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 1. Carregar dades
df_master = pd.read_csv(os.path.join(BASE_DIR, "optifunds_master.csv"))
df_nav = pd.read_csv(os.path.join(BASE_DIR, "optifunds_nav_history.csv"))

# Mapeig de noms
name_map = dict(zip(df_master["Instrument"], df_master["Fund Name"]))

# Neteja de la sèrie històrica de NAV
df_nav.columns = [c.strip() for c in df_nav.columns]
date_col = [c for c in df_nav.columns if "date" in c.lower()][0]
nav_col = [c for c in df_nav.columns if c not in ["Instrument", date_col]][0]

df_nav[date_col] = pd.to_datetime(df_nav[date_col])
df_nav[nav_col] = pd.to_numeric(df_nav[nav_col], errors="coerce")
df_nav = df_nav.dropna(subset=[nav_col]).sort_values(by=[date_col])

# Pivotar dades: Files = Data, Columnes = Fons
nav_pivot = df_nav.pivot(index=date_col, columns="Instrument", values=nav_col).dropna()
nav_pivot = nav_pivot.rename(columns=name_map)

# 2. Càlcul de rendibilitats diàries
daily_returns = nav_pivot.pct_change().dropna()

# 3. Càlcul de Mètriques Clau
TRADING_DAYS = 252
RF_RATE = 0.03  # Taxa lliure de risc anual de referència (3.0%)

metrics = []

for fund in nav_pivot.columns:
    prices = nav_pivot[fund]
    returns = daily_returns[fund]
    
    # Rendibilitat total i CAGR
    total_ret = (prices.iloc[-1] / prices.iloc[0]) - 1
    n_years = (prices.index[-1] - prices.index[0]).days / 365.25
    cagr = ((1 + total_ret) ** (1 / n_years)) - 1
    
    # Volatilitat anualitzada
    volatility = returns.std() * np.sqrt(TRADING_DAYS)
    
    # Ràtio de Sharpe
    sharpe = (cagr - RF_RATE) / volatility if volatility != 0 else 0
    
    # Màxim Drawdown (MDD)
    rolling_max = prices.cummax()
    drawdowns = (prices - rolling_max) / rolling_max
    max_drawdown = drawdowns.min()
    
    metrics.append({
        "Fons": fund,
        "Retorn Total (%)": round(total_ret * 100, 2),
        "CAGR Anualitzat (%)": round(cagr * 100, 2),
        "Volatilitat (%)": round(volatility * 100, 2),
        "Sharpe Ratio": round(sharpe, 2),
        "Max Drawdown (%)": round(max_drawdown * 100, 2)
    })

df_metrics = pd.DataFrame(metrics)

print("=" * 85)
print("OPTIFUNDS - QUADRE DE COMANDAMENT DE RISC I RENDIBILITAT HISTÒRICA")
print(f"Període analitzat: Des de {nav_pivot.index[0].strftime('%Y-%m-%d')} fins a {nav_pivot.index[-1].strftime('%Y-%m-%d')}")
print("=" * 85)
print(df_metrics.to_string(index=False))

# Guardar resultat
df_metrics.to_csv(os.path.join(BASE_DIR, "optifunds_risk_metrics.csv"), index=False)
print(f"\nMètriques exportades correctament a '{os.path.join(BASE_DIR, 'optifunds_risk_metrics.csv')}'.")