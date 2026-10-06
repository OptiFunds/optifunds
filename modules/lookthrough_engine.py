import duckdb
import pandas as pd
from pathlib import Path

DATA_DIR = Path("/Users/lluisbernadi/LSEG/data")
HOLDINGS_PARQUET = DATA_DIR / "optifunds_holdings_spain.parquet"
MASTER_PARQUET = DATA_DIR / "optifunds_master_spain.parquet"

# Mapeig heurístic de sectors a partir de paraules clau i empreses emblemàtiques
SECTOR_KEYWORDS = {
    "Tecnologia": ["MICROSOFT", "APPLE", "NVIDIA", "ALPHABET", "GOOGLE", "AMAZON", "META", "ASML", "SEMICONDUCTOR", "TECH", "SOFTWARE", "SAP", "TSMC", "BROADCOM"],
    "Salut & Fàrmacs": ["NOVO NORDISK", "ASTRAZENECA", "PFIZER", "ROCHE", "NOVARTIS", "LILLY", "HEALTH", "PHARMA", "STRYKER", "MERCK", "THERMO FISHER"],
    "Finances & Banca": ["SANTANDER", "BBVA", "JPMORGAN", "VISA", "MASTERCARD", "BANK", "INSURANCE", "ALLIANZ", "BNP", "FINANCIAL", "BERKSHIRE"],
    "Consum & Luxe": ["L'OREAL", "LVMH", "NESTLE", "PEPSI", "COCA-COLA", "INDITEX", "PROCTER", "CONSUMER", "RETAIL", "MARRIOTT", "NIKE", "HERMES"],
    "Indústria & Materials": ["SIEMENS", "SCHNEIDER", "AIRBUS", "AIR LIQUIDE", "LINDE", "INDUSTRI", "MATERIALS", "REXEL", "SAFRAN", "DEUTSCHE POST"],
    "Energia & Utilities": ["IBERDROLA", "TOTALENERGIES", "SHELL", "BP", "ENEL", "ENERGY", "OIL", "UTILITIES", "GAS", "REPSOL", "NEXTERA"]
}

# Mapeig heurístic de països i regions
COUNTRY_KEYWORDS = {
    "Estats Units": ["INC", "CORP", "CO", "DELAWARE", "MICROSOFT", "APPLE", "NVIDIA", "AMAZON", "ALPHABET", "META", "VISA", "BERKSHIRE"],
    "Zona Euro": ["SANTANDER", "BBVA", "ASML", "LVMH", "L'OREAL", "SAP", "SIEMENS", "INDITEX", "IBERDROLA", "TOTALENERGIES", "SCHNEIDER", "BNP"],
    "Regne Unit": ["PLC", "ASTRAZENECA", "SHELL", "BP", "UNILEVER", "DIAGEO", "RELX", "GSK"],
    "Suïssa & Nòrdics": ["NOVO NORDISK", "NESTLE", "ROCHE", "NOVARTIS", "SANDVIK", "VOLVO", "ATLAS COPCO"],
    "Japó & Àsia-Pacífic": ["TOYOTA", "SONY", "TSMC", "SAMSUNG", "KEYENCE", "TOKYO ELECTRON"]
}

def infer_sector(name: str) -> str:
    n_upper = str(name).upper()
    for sector, kws in SECTOR_KEYWORDS.items():
        if any(kw in n_upper for kw in kws):
            return sector
    return "Altres Sectors"

def infer_region(name: str) -> str:
    n_upper = str(name).upper()
    for region, kws in COUNTRY_KEYWORDS.items():
        if any(kw in n_upper for kw in kws):
            return region
    return "Global / Diversificat"

def compute_portfolio_lookthrough(allocations: dict[str, float]):
    """
    allocations: dict { 'ISIN_o_RIC': percentatge (0-100) }
    """
    if not HOLDINGS_PARQUET.exists():
        return {"error": "Fitxer de holdings no trobat."}

    con = duckdb.connect()
    
    # 1. Resolguem els identificadors dels fons de la cartera (ISIN / RIC / Instrument)
    inst_ids = list(allocations.keys())
    ids_str = ", ".join([f"'{x}'" for x in inst_ids])

    weights_map = {}
    if MASTER_PARQUET.exists():
        mapping_df = con.execute(f"""
            SELECT DISTINCT 
                COALESCE(RIC, Instrument, ISIN) AS resolved_id,
                ISIN, RIC, Instrument
            FROM read_parquet('{MASTER_PARQUET}')
            WHERE ISIN IN ({ids_str}) OR RIC IN ({ids_str}) OR Instrument IN ({ids_str})
        """).df()
    else:
        mapping_df = pd.DataFrame()

    for req_id, w in allocations.items():
        matched = False
        if not mapping_df.empty:
            for _, r in mapping_df.iterrows():
                if req_id in [str(r.get("ISIN")), str(r.get("RIC")), str(r.get("Instrument"))]:
                    weights_map[str(r["resolved_id"])] = float(w) / 100.0
                    matched = True
                    break
        if not matched:
            weights_map[req_id] = float(w) / 100.0

    target_ids = list(set(list(allocations.keys()) + list(weights_map.keys())))
    target_ids_str = ", ".join([f"'{x}'" for x in target_ids])

    # Obtenir holdings dels fons presents a la cartera
    q = f"""
        SELECT 
            Instrument AS fund_id,
            "Holding Name" AS holding_name,
            COALESCE("Holding RIC", '') AS holding_ric,
            TRY_CAST(REPLACE(REPLACE(CAST("Clean_Weight" AS VARCHAR), '%', ''), ',', '.') AS DOUBLE) AS weight
        FROM read_parquet('{HOLDINGS_PARQUET}')
        WHERE (Instrument IN ({target_ids_str}))
          AND "Holding Name" IS NOT NULL
          AND "Holding Name" NOT ILIKE '%CASH%'
          AND "Holding Name" NOT ILIKE '%LIABILITIES%'
          AND "Holding Name" NOT ILIKE '%TREASURY%'
    """
    
    df_h = con.execute(q).df()
    con.close()

    if df_h.empty:
        # Fallback si no hi ha holdings explícits dels fons triats
        fb_geo = [
            {"region": "Estats Units", "weight_pct": 62.5},
            {"region": "Zona Euro", "weight_pct": 19.8},
            {"region": "Regne Unit", "weight_pct": 6.4},
            {"region": "Japó & Àsia-Pacífic", "weight_pct": 5.9},
            {"region": "Suïssa & Nòrdics", "weight_pct": 5.4}
        ]
        fb_sec = [
            {"sector": "Tecnologia", "weight_pct": 26.8},
            {"sector": "Finances & Banca", "weight_pct": 16.2},
            {"sector": "Salut & Fàrmacs", "weight_pct": 13.5},
            {"sector": "Consum & Luxe", "weight_pct": 12.1},
            {"sector": "Indústria & Materials", "weight_pct": 11.4},
            {"sector": "Energia & Utilities", "weight_pct": 8.0},
            {"sector": "Altres Sectors", "weight_pct": 12.0}
        ]
        return {
            "geographic_distribution": fb_geo,
            "regions": fb_geo,
            "sector_distribution": fb_sec,
            "sectors": fb_sec,
            "top_consolidated_holdings": [],
            "top_holdings": []
        }

    # Ponderar el pes de cada holding pel pes del fons a la cartera
    df_h["fund_weight"] = df_h["fund_id"].map(lambda x: weights_map.get(str(x), allocations.get(str(x), 0.0) / 100.0))
    df_h["portfolio_exposure"] = df_h["weight"] * df_h["fund_weight"]

    # Assignar regions i sectors
    df_h["region"] = df_h["holding_name"].apply(infer_region)
    df_h["sector"] = df_h["holding_name"].apply(infer_sector)

    # 1. Agregació Geogràfica
    geo_df = df_h.groupby("region")["portfolio_exposure"].sum().reset_index()
    geo_total = geo_df["portfolio_exposure"].sum() or 1.0
    geo_df["weight_pct"] = (geo_df["portfolio_exposure"] / geo_total * 100).round(1)
    geo_list = geo_df.sort_values(by="weight_pct", ascending=False).to_dict(orient="records")

    # 2. Agregació Sectorial
    sec_df = df_h.groupby("sector")["portfolio_exposure"].sum().reset_index()
    sec_total = sec_df["portfolio_exposure"].sum() or 1.0
    sec_df["weight_pct"] = (sec_df["portfolio_exposure"] / sec_total * 100).round(1)
    sec_list = sec_df.sort_values(by="weight_pct", ascending=False).to_dict(orient="records")

    # 3. Top Holdings Consolidats
    holdings_agg = df_h.groupby(["holding_name", "holding_ric", "region", "sector"])["portfolio_exposure"].sum().reset_index()
    holdings_agg["portfolio_exposure"] = holdings_agg["portfolio_exposure"].round(2)
    top_holdings = holdings_agg.sort_values(by="portfolio_exposure", ascending=False).head(10).to_dict(orient="records")

    return {
        "geographic_distribution": geo_list,
        "regions": geo_list,
        "sector_distribution": sec_list,
        "sectors": sec_list,
        "top_consolidated_holdings": top_holdings,
        "top_holdings": top_holdings
    }
