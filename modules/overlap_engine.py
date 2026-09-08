import os
import numpy as np
import pandas as pd

# Obtenir la ruta exacta on està guardat aquest mateix script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 1. Carregar dades locals usant la ruta absoluta automàtica
df_master = pd.read_csv(os.path.join(BASE_DIR, "optifunds_master.csv"))
df_holdings = pd.read_csv(os.path.join(BASE_DIR, "optifunds_holdings.csv"))

# Mapeig d'identificadors a noms reals per a visualització neta
name_map = dict(zip(df_master["Instrument"], df_master["Fund Name"]))
df_holdings["Fund_Display_Name"] = df_holdings["Instrument"].map(name_map).fillna(df_holdings["Instrument"])

# =====================================================================
# MATRIU DE SOLAPAMENT PAIRWISE (NxN)
# =====================================================================
pivot_weights = df_holdings.pivot_table(
    index="Fund_Display_Name",
    columns="Holding RIC",
    values="Clean_Weight",
    fill_value=0.0
)

fund_names = pivot_weights.index.tolist()
weights_arr = pivot_weights.to_numpy()
n = len(fund_names)

overlap_mat = np.zeros((n, n))

for i in range(n):
    for j in range(i, n):
        val = np.sum(np.minimum(weights_arr[i], weights_arr[j]))
        overlap_mat[i, j] = val
        overlap_mat[j, i] = val

df_matrix = pd.DataFrame(overlap_mat, index=fund_names, columns=fund_names)

print("=" * 70)
print("OPTIFUNDS - MATRIU DE SOLAPAMENT ENTRE CARTERES (%)")
print("=" * 70)
print(df_matrix.round(2))
print("\n")

# =====================================================================
# DESGLOSS D'ACCIONS COMPARTIDES
# =====================================================================
def analyze_pair_overlap(fund1_id: str, fund2_id: str, df: pd.DataFrame):
    f1_name = name_map.get(fund1_id, fund1_id)
    f2_name = name_map.get(fund2_id, fund2_id)
    
    p1 = df[df["Instrument"] == fund1_id][["Holding RIC", "Holding Name", "Clean_Weight"]]
    p2 = df[df["Instrument"] == fund2_id][["Holding RIC", "Clean_Weight"]]
    
    merged = pd.merge(p1, p2, on="Holding RIC", suffixes=(f"_{fund1_id}", f"_{fund2_id}"))
    merged["Overlap_%"] = merged[[f"Clean_Weight_{fund1_id}", f"Clean_Weight_{fund2_id}"]].min(axis=1)
    merged = merged.sort_values(by="Overlap_%", ascending=False).reset_index(drop=True)
    
    total = merged["Overlap_%"].sum()
    
    print("-" * 70)
    print(f"ANÀLISI EN DETALL: {f1_name}")
    print(f"vs {f2_name}")
    print(f"Solapament conjunt: {total:.2f}%")
    print("-" * 70)
    
    if not merged.empty:
        cols_show = ["Holding Name", "Holding RIC", f"Clean_Weight_{fund1_id}", f"Clean_Weight_{fund2_id}", "Overlap_%"]
        print(merged[cols_show].to_string(index=False))
    else:
        print("No hi ha posicions comunes al Top 25.")
    print("\n")

# Vanguard vs Fundsmith
analyze_pair_overlap("IE00B03HD191", "LU0690375182", df_holdings)

# Vanguard vs Amundi
analyze_pair_overlap("IE00B03HD191", "LU0996182563", df_holdings)

# Exportar la matriu resultant
df_matrix.round(2).to_csv(os.path.join(BASE_DIR, "optifunds_overlap_matrix.csv"))
print(f"Matriu exportada correctament a '{os.path.join(BASE_DIR, 'optifunds_overlap_matrix.csv')}'.")