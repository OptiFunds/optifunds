import duckdb
import pandas as pd
from pathlib import Path

DATA_DIR = Path("/Users/lluisbernadi/LSEG/data")
HOLDINGS_PARQUET = DATA_DIR / "optifunds_holdings_spain.parquet"
MASTER_PARQUET = DATA_DIR / "optifunds_master_spain.parquet"

# Mapeig d'extensions de RIC de borsa a País i Regió
EXCHANGE_GEO_MAP = {
    "O": ("Estats Units", "Amèrica del Nord"),
    "N": ("Estats Units", "Amèrica del Nord"),
    "OQ": ("Estats Units", "Amèrica del Nord"),
    "AS": ("Països Baixos", "Europa"),
    "PA": ("França", "Europa"),
    "DE": ("Alemanya", "Europa"),
    "MC": ("Espanya", "Europa"),
    "L": ("Regne Unit", "Europa"),
    "MI": ("Itàlia", "Europa"),
    "S": ("Suïssa", "Europa"),
    "ST": ("Suècia", "Europa"),
    "T": ("Japó", "Àsia-Pacífic"),
    "HK": ("Hong Kong / Xina", "Àsia-Pacífic"),
    "KS": ("Corea del Sud", "Àsia-Pacífic"),
    "TW": ("Taiwan", "Àsia-Pacífic"),
    "AX": ("Austràlia", "Àsia-Pacífic"),
    "TO": ("Canadà", "Amèrica del Nord"),
}

def infer_sector_and_country(name: str, ric: str) -> tuple[str, str, str]:
    """Inferència heurística robusta de Sector, País i Regió a partir del RIC i Nom."""
    name_u = (name or "").upper()
    ric_str = str(ric or "")
    
    # 1. País / Regió pel sufix del RIC
    country = "Altres / Global"
    region = "Altres"
    
    if "." in ric_str:
        suffix = ric_str.rsplit(".", 1)[-1]
        if suffix in EXCHANGE_GEO_MAP:
            country, region = EXCHANGE_GEO_MAP[suffix]
            
    # Casos particulars per noms d'empreses destacades
    if any(k in name_u for k in ["MICROSOFT", "APPLE", "NVIDIA", "AMAZON", "ALPHABET", "META", "VISA", "MASTERCARD", "BERKSHIRE", "TESLA", "ELI LILLY", "BROADCOM"]):
        country, region = "Estats Units", "Amèrica del Nord"
    elif any(k in name_u for k in ["NOVO NORDISK"]):
        country, region = "Dinamarca", "Europa"
    elif any(k in name_u for k in ["ASML", "HEINEKEN"]):
        country, region = "Països Baixos", "Europa"
    elif any(k in name_u for k in ["L'OREAL", "LVMH", "TOTALENERGIES", "SCHNEIDER"]):
        country, region = "França", "Europa"
    elif any(k in name_u for k in ["SAP", "SIEMENS", "ALLIANZ"]):
        country, region = "Alemanya", "Europa"
    elif any(k in name_u for k in ["SANTANDER", "IBERDROLA", "INDITEX", "BBVA"]):
        country, region = "Espanya", "Europa"
    elif any(k in name_u for k in ["NESTLE", "ROCHE", "NOVARTIS"]):
        country, region = "Suïssa", "Europa"
    elif any(k in name_u for k in ["ASTRAZENECA", "SHELL", "UNILEVER", "BP"]):
        country, region = "Regne Unit", "Europa"
    elif any(k in name_u for k in ["TAIWAN SEMICONDUCTOR", "TSMC"]):
        country, region = "Taiwan", "Àsia-Pacífic"
    elif any(k in name_u for k in ["SAMSUNG"]):
        country, region = "Corea del Sud", "Àsia-Pacífic"

    # 2. Sector d'activitat
    sector = "Industrial & Béns de Consum"
    if any(k in name_u for k in ["TECH", "MICROSOFT", "APPLE", "NVIDIA", "ALPHABET", "SEMICONDUCTOR", "ASML", "BROADCOM", "SAP", "META", "AMAZON"]):
        sector = "Tecnologia & Comunicacions"
    elif any(k in name_u for k in ["HEALTH", "NOVO NORDISK", "ELI LILLY", "ROCHE", "NOVARTIS", "ASTRAZENECA", "PFIZER", "STRYKER", "JOHNSON & JOHNSON"]):
        sector = "Salut & Farmacèutica"
    elif any(k in name_u for k in ["BANK", "SANTANDER", "BBVA", "JPMORGAN", "VISA", "MASTERCARD", "ALLIANZ", "FINANC", "INSURANCE", "BERKSHIRE"]):
        sector = "Serveis Financers"
    elif any(k in name_u for k in ["ENERGY", "OIL", "TOTALENERGIES", "SHELL", "BP", "EXXON", "CHEVRON"]):
        sector = "Energia & Petroli"
    elif any(k in name_u for k in ["IBERDROLA", "ENEL", "UTILITIES", "ELECTRIC", "WATER"]):
        sector = "Subministraments & Utilities"
    elif any(k in name_u for k in ["L'OREAL", "LVMH", "NESTLE", "INDITEX", "CONSUMER", "UNILEVER", "PEPSI", "COCA-COLA"]):
        sector = "Consum Defensiu & Cíclic"

    return sector, country, region

def compute_portfolio_lookthrough(allocations: dict[str, float]) -> dict:
    """
    allocations: {'LP60078536': 50.0, 'LP68227672': 30.0, ...}
    Retorna desglossament per regions, països, sectors i Top 15 companyies consolidades.
    """
    if not HOLDINGS_PARQUET.exists():
        return {"error": "No es troba el fitxer de holdings de LSEG."}

    con = duckdb.connect()
    
    # 1. Resoldre identificadors per si vénen com a ISIN
    inst_ids = list(allocations.keys())
    ids_str = ", ".join([f"'{x}'" for x in inst_ids])
    
    mapping_df = con.execute(f"""
        SELECT DISTINCT 
            COALESCE(RIC, Instrument, ISIN) AS resolved_id,
            ISIN, RIC, Instrument
        FROM read_parquet('{MASTER_PARQUET}')
        WHERE ISIN IN ({ids_str}) OR RIC IN ({ids_str}) OR Instrument IN ({ids_str})
    """).df() if MASTER_PARQUET.exists() else pd.DataFrame()
    
    # Normalitzar pesos
    weights_map = {}
    for req_id, w in allocations.items():
        matched = False
        if not mapping_df.empty:
            for _, r in mapping_df.iterrows():
                if req_id in [str(r["ISIN"]), str(r["RIC"]), str(r["Instrument"])]:
                    weights_map[str(r["resolved_id"])] = w / 100.0
                    matched = True
                    break
        if not matched:
            weights_map[req_id] = w / 100.0

    target_ids_str = ", ".join([f"'{k}'" for k in weights_map.keys()])
    
    holdings_df = con.execute(f"""
        SELECT 
            Instrument AS fund_id,
            "Holding Name" AS holding_name,
            "Holding RIC" AS holding_ric,
            TRY_CAST(Clean_Weight AS DOUBLE) AS clean_weight
        FROM read_parquet('{HOLDINGS_PARQUET}')
        WHERE Instrument IN ({target_ids_str})
          AND "Holding Name" IS NOT NULL
          AND "Holding Name" NOT ILIKE '%CASH%'
          AND "Holding Name" NOT ILIKE '%LIABILITIES%'
    """).df()
    con.close()

    if holdings_df.empty:
        return {"error": "No s'han trobat posicions detallades per als fons seleccionats."}

    # Ponderar pes de cada acció segons el pes del fons a la cartera
    holdings_df["portfolio_weight"] = holdings_df.apply(
        lambda row: (row["clean_weight"] or 0.0) * weights_map.get(str(row["fund_id"]), 0.0),
        axis=1
    )

    # Classificació de cada posició
    sectors, countries, regions = [], [], []
    for _, r in holdings_df.iterrows():
        s, c, reg = infer_sector_and_country(r["holding_name"], r["holding_ric"])
        sectors.append(s)
        countries.append(c)
        regions.append(reg)

    holdings_df["sector"] = sectors
    holdings_df["country"] = countries
    holdings_df["region"] = regions

    # Consolidació d'accions compartides
    agg_holdings = holdings_df.groupby(["holding_name", "sector", "country"]).agg({
        "portfolio_weight": "sum"
    }).reset_index().sort_values(by="portfolio_weight", ascending=False)

    total_explained_weight = agg_holdings["portfolio_weight"].sum()
    norm_factor = 100.0 / total_explained_weight if total_explained_weight > 0 else 1.0

    # 1. Desglossament per Regió
    region_breakdown = holdings_df.groupby("region")["portfolio_weight"].sum() * norm_factor
    region_data = [{"name": k, "value": round(float(v), 2)} for k, v in region_breakdown.items() if v > 0.5]
    region_data.sort(key=lambda x: x["value"], reverse=True)

    # 2. Desglossament per País (Top 8 + Altres)
    country_breakdown = holdings_df.groupby("country")["portfolio_weight"].sum() * norm_factor
    country_data = [{"name": k, "value": round(float(v), 2)} for k, v in country_breakdown.items() if v > 0.5]
    country_data.sort(key=lambda x: x["value"], reverse=True)

    # 3. Desglossament per Sector
    sector_breakdown = holdings_df.groupby("sector")["portfolio_weight"].sum() * norm_factor
    sector_data = [{"name": k, "value": round(float(v), 2)} for k, v in sector_breakdown.items() if v > 0.5]
    sector_data.sort(key=lambda x: x["value"], reverse=True)

    # 4. Top 15 Companyies Subjacents Consolidades
    top_holdings = []
    for _, r in agg_holdings.head(15).iterrows():
        top_holdings.append({
            "name": r["holding_name"],
            "sector": r["sector"],
            "country": r["country"],
            "effective_weight": round(float(r["portfolio_weight"] * norm_factor), 2)
        })

    return {
        "regions": region_data,
        "countries": country_data,
        "sectors": sector_data,
        "top_companies": top_holdings,
        "total_analyzed_positions": int(len(agg_holdings))
    }
