"""
Mòdul de descàrrega i ingesta de valors liquidatius (NAV) diaris oficials
Font primària: Registre mensual d'IICs de la CNMV (Circular 4/2008)
Format: XML massiu (FONDMENS_YYYYMM.xml) amb camps VL_Dia1 ... VL_Dia31
Cobertura: ~2.900 classes de fons espanyols, fons indexats i ETFs de referència (IBEX 35, EuroStoxx 50, S&P 500)
"""

import os
import io
import re
import calendar
import zipfile
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, date
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import pandas as pd
import duckdb

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DEFAULT_NAV_PARQUET = DATA_DIR / "optifunds_nav_history.parquet"

CNMV_BASE_URL = "https://www.cnmv.es"
CNMV_PAGE_URL = "https://www.cnmv.es/Portal/Publicaciones/descarga-informacion-individual.aspx?ejercicio={year}"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

# Benchmarks oficials registrats a la CNMV
OFFICIAL_BENCHMARK_ISINS = {
    "ES0105336038": "IBEX 35 (Acción IBEX 35 ETF)",
    "ES0105321030": "EURO STOXX 50 (Acción EuroStoxx 50 ETF)",
    "ES0114573001": "IBEX 35 (Bindex España Índice)",
    "ES0114564000": "EURO STOXX (Bindex Europa Índice)",
    "ES0114565007": "S&P 500 (Bindex USA Índice)",
    "ES0114430004": "GLOBAL (Bindex IXESG Global Leaders)",
}


def parse_fondmens_xml(xml_source, year: int, month: int) -> pd.DataFrame:
    """
    Parseja el fitxer FONDMENS_YYYYMM.xml de la CNMV i extreu tots els preus
    liquidatius diaris (VL_Dia1 ... VL_Dia31) per a cada ISIN.
    """
    days_in_month = calendar.monthrange(year, month)[1]
    
    # Suport tant per bytes/buffer com per camí de fitxer
    if isinstance(xml_source, (str, Path)):
        tree = ET.parse(xml_source)
        root = tree.getroot()
    else:
        root = ET.fromstring(xml_source)

    records = []
    
    for ent in root.findall("Entidad"):
        for comp in ent.findall("Compartimento"):
            for clase in comp.findall("Clase"):
                isin = clase.findtext("ISIN")
                if not isin:
                    continue
                isin = isin.strip()
                
                vld = clase.find("VLDiario")
                if vld is None:
                    continue
                
                for d_idx in range(1, days_in_month + 1):
                    day_tag = f"VL_Dia{d_idx}"
                    val_str = vld.findtext(day_tag)
                    if val_str:
                        try:
                            val = float(val_str)
                            if val > 0:
                                dt_str = f"{year:04d}-{month:02d}-{d_idx:02d}"
                                records.append({
                                    "instrument": isin,
                                    "date": dt_str,
                                    "nav": val
                                })
                        except (ValueError, TypeError):
                            continue

    df = pd.DataFrame(records)
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"]).dt.date
    return df


def extract_navs_from_zip(zip_path_or_bytes, year: int, month: int) -> pd.DataFrame:
    """
    Obre el ZIP de la CNMV, cerca el fitxer FONDMENS_*.xml i en parseja els NAVs.
    """
    if isinstance(zip_path_or_bytes, (bytes, io.BytesIO)):
        z = zipfile.ZipFile(zip_path_or_bytes if isinstance(zip_path_or_bytes, io.BytesIO) else io.BytesIO(zip_path_or_bytes))
    else:
        z = zipfile.ZipFile(zip_path_or_bytes)
    
    with z:
        target_name = None
        for name in z.namelist():
            if name.upper().startswith("FONDMENS") and name.upper().endswith(".XML"):
                target_name = name
                break
        
        if not target_name:
            raise FileNotFoundError(f"No s'ha trobat cap fitxer FONDMENS*.xml dins de l'arxiu ZIP.")
        
        with z.open(target_name) as f:
            xml_bytes = f.read()
            return parse_fondmens_xml(xml_bytes, year, month)


def fetch_cnmv_month_download_links(year: int = 2024) -> List[Dict[str, str]]:
    """
    Consulta la pàgina oficial de descàrregues de la CNMV per a un any i en
    retorna els enllaços als fitxers ZIP de cada mes disponible.
    """
    url = CNMV_PAGE_URL.format(year=year)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
    
    month_names_ca_es = {
        "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
        "julio": 7, "agosto": 8, "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
        "gener": 1, "febrer": 2, "març": 3, "maig": 5, "juny": 6,
        "juliol": 7, "agost": 8, "setembre": 9, "novembre": 11, "desembre": 12
    }
    
    results = []
    # Cerca files de taula amb mes i enllaç
    tr_matches = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL | re.IGNORECASE)
    for tr in tr_matches:
        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL | re.IGNORECASE)
        if len(tds) >= 2:
            m_text = re.sub(r'<[^>]+>', '', tds[0]).strip().lower()
            m_num = month_names_ca_es.get(m_text)
            link_match = re.search(r'href=["\']([^"\']+)["\']', tds[1], re.IGNORECASE)
            if m_num and link_match:
                link = link_match.group(1)
                if not link.startswith("http"):
                    link = CNMV_BASE_URL + link
                results.append({
                    "year": year,
                    "month": m_num,
                    "month_name": m_text.capitalize(),
                    "download_url": link
                })
                
    return sorted(results, key=lambda x: x["month"])


def download_cnmv_zip(download_url: str) -> bytes:
    """
    Descarrega el paquet ZIP oficial d'un mes de la CNMV.
    """
    req = urllib.request.Request(download_url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return resp.read()


def merge_navs_into_parquet(new_df: pd.DataFrame, parquet_path: Path = DEFAULT_NAV_PARQUET) -> Tuple[int, int]:
    """
    Fusiona els nous registres de NAV amb el fitxer Parquet existent de manera
    resilient i sense duplicats usant DuckDB.
    Retorna: (total_registres_finals, total_instruments_unics)
    """
    if new_df.empty:
        return 0, 0

    con = duckdb.connect()
    
    # Registra DataFrame en memòria
    con.register("new_navs", new_df)
    
    parquet_path.parent.mkdir(parents=True, exist_ok=True)
    temp_parquet = parquet_path.with_suffix(".tmp.parquet")
    
    if parquet_path.exists():
        # Fusiona taula existent i nova traient duplicats
        query = f"""
            COPY (
                WITH combined AS (
                    SELECT 
                        instrument, 
                        CAST(date AS DATE) AS date, 
                        CAST(nav AS DOUBLE) AS nav
                    FROM read_parquet('{parquet_path}')
                    UNION ALL
                    SELECT 
                        instrument, 
                        CAST(date AS DATE) AS date, 
                        CAST(nav AS DOUBLE) AS nav
                    FROM new_navs
                )
                SELECT instrument, date, nav
                FROM combined
                QUALIFY ROW_NUMBER() OVER (PARTITION BY instrument, date ORDER BY nav DESC) = 1
                ORDER BY instrument, date ASC
            ) TO '{temp_parquet}' (FORMAT PARQUET, COMPRESSION 'ZSTD')
        """
    else:
        query = f"""
            COPY (
                SELECT 
                    instrument, 
                    CAST(date AS DATE) AS date, 
                    CAST(nav AS DOUBLE) AS nav
                FROM new_navs
                QUALIFY ROW_NUMBER() OVER (PARTITION BY instrument, date ORDER BY nav DESC) = 1
                ORDER BY instrument, date ASC
            ) TO '{temp_parquet}' (FORMAT PARQUET, COMPRESSION 'ZSTD')
        """
        
    con.execute(query)
    
    # Substitueix atòmicament el fitxer
    if temp_parquet.exists():
        temp_parquet.replace(parquet_path)
        
    # Comprova el total
    stats = con.execute(f"""
        SELECT COUNT(*), COUNT(DISTINCT instrument)
        FROM read_parquet('{parquet_path}')
    """).fetchone()
    
    con.close()
    return stats[0], stats[1]
