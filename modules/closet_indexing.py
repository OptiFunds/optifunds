import os
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

df_master = pd.read_csv(os.path.join(BASE_DIR, "optifunds_master.csv"))
df_holdings = pd.read_csv(os.path.join(BASE_DIR, "optifunds_holdings.csv"))

# Taula de despeses corrents reals conegudes (TER)
TER_LOOKUP = {
    "IE00B03HD191": 0.18,  # Vanguard Global Stock
    "LU0996182563": 0.30,  # Amundi MSCI World
    "LU0690375182": 1.05,  # Fundsmith Equity
    "IE0031786142": 0.23,  # Vanguard Emerging Markets
    "IE0031786696": 0.23,  # Vanguard Emerging Markets Acc
    "LU0389811885": 0.12,  # Amundi Core MSCI Europe
    "LU0389812693": 0.10,  # Amundi Gov Bond
    "LU0389812933": 0.10,  # Amundi Gov Bond Acc
    "IE00B4L5Y983": 0.20,  # iShares Core MSCI World
    "IE00B5BMR087": 0.07,  # iShares Core S&P 500
    "ES0152745003": 1.85,  # Magallanes European
    "ES0174115012": 1.75,  # Cobas Selección
    "ES0112611001": 1.80,  # Azvalor Internacional
}

def resolve_ter(isin: str, name: str) -> float:
    if isin in TER_LOOKUP:
        return TER_LOOKUP[isin]
    n = str(name).lower()
    if "index" in n or "etf" in n or "core" in n or "vanguard" in n:
        return 0.20
    return 1.75  # Fons actiu estàndard comercialitzat a banca

df_master["TER_Estimat"] = [
    resolve_ter(row["Instrument"], row["Fund Name"]) 
    for _, row in df_master.iterrows()
]

def run_closet_indexing_audit(benchmark_isin: str = "IE00B03HD191"):
    bmk_row = df_master.loc[df_master["Instrument"] == benchmark_isin]
    if bmk_row.empty:
        return
    bmk_name = bmk_row["Fund Name"].values[0]
    bmk_ter = float(bmk_row["TER_Estimat"].values[0])
    
    p_bmk = df_holdings[df_holdings["Instrument"] == benchmark_isin][["Holding RIC", "Clean_Weight"]]
    
    print("=" * 95)
    print(f"OPTIFUNDS - AUDITORIA D'ACTIVE SHARE I CLOSET INDEXING")
    print(f"Benchmark de Referència: {bmk_name} (TER: {bmk_ter:.2f}%)")
    print("=" * 95)
    
    records = []
    
    for _, row in df_master.iterrows():
        isin = row["Instrument"]
        name = row["Fund Name"]
        ter = row["TER_Estimat"]
        
        if isin == benchmark_isin:
            continue
            
        p_act = df_holdings[df_holdings["Instrument"] == isin][["Holding RIC", "Clean_Weight"]]
        if p_act.empty:
            continue
            
        merged = pd.merge(p_act, p_bmk, on="Holding RIC", how="outer", suffixes=("_act", "_bmk")).fillna(0.0)
        
        # Càlcul normalitzat d'Active Share
        sum_act = merged["Clean_Weight_act"].sum()
        sum_bmk = merged["Clean_Weight_bmk"].sum()
        
        if sum_act > 0 and sum_bmk > 0:
            w_act = merged["Clean_Weight_act"] / sum_act
            w_bmk = merged["Clean_Weight_bmk"] / sum_bmk
            active_share = 0.5 * np.sum(np.abs(w_act - w_bmk)) * 100
            overlap = np.sum(np.minimum(w_act, w_bmk)) * 100
        else:
            active_share = 100.0
            overlap = 0.0
            
        is_indexed = ("index" in name.lower() or "etf" in name.lower() or "vanguard" in name.lower() or "core" in name.lower())
        
        # Diagnòstic segons estil i cost
        if is_indexed:
            verdict = "Indexat legítim de baix cost"
            alert = "INDEXAT"
            active_fee = ter
        elif active_share < 35:
            verdict = "Closet Indexing Flagrant (Còpia cara)"
            alert = "CRÍTIC"
            as_ratio = max(active_share / 100.0, 0.05)
            active_fee = (ter - (1 - as_ratio) * bmk_ter) / as_ratio
        elif active_share < 60:
            verdict = "Gestió activa feble (Risc d'indexació)"
            alert = "ALTA"
            as_ratio = active_share / 100.0
            active_fee = (ter - (1 - as_ratio) * bmk_ter) / as_ratio
        else:
            verdict = "Gestió d'autor d'alta convicció"
            alert = "BONA"
            as_ratio = active_share / 100.0
            active_fee = (ter - (1 - as_ratio) * bmk_ter) / as_ratio

        records.append({
            "Fons": name[:42],
            "TER": f"{ter:.2f}%",
            "Solapament": f"{overlap:.1f}%",
            "Active Share": f"{active_share:.1f}%",
            "Alerta": alert,
            "Diagnòstic": verdict,
            "TER Actiu": f"{active_fee:.2f}%"
        })

    df_out = pd.DataFrame(records)
    print(df_out.to_string(index=False))

if __name__ == "__main__":
    run_closet_indexing_audit("IE00B03HD191")