#!/usr/bin/env python3
"""
OptiFunds: Actualitzador Mensual Incremental de NAVs de la CNMV
Aquest script:
1. Comprova quins mesos ja estan completament descarregats a la base de dades.
2. Consulta el registre oficial d'IICs de la CNMV per detectar nous mesos publicats.
3. Descarrega només els mesos pendents respectant el temps de guarda (pacing anti-bloqueig).
4. Parseja els preus liquidatius diaris dels fitxers XML oficials.
5. Fusiona els nous registres a data/optifunds_nav_history.parquet (sense duplicats).
6. Regenera automàticament data/optifunds_screener_master.parquet amb les noves mètriques.
7. Desa un registre d'estat a data/cnmv_sync_status.json per a auditoria i seguiment.
"""

import sys
import os
import json
import time
import argparse
from datetime import datetime, date, timezone
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import duckdb
import pandas as pd

from modules.nav_downloader import (
    fetch_cnmv_month_download_links,
    extract_navs_from_zip,
    get_cached_or_download_zip,
    merge_navs_into_parquet,
    CACHE_DIR,
    DEFAULT_NAV_PARQUET
)
from modules.screener_engine import build_screener_master

DATA_DIR = BASE_DIR / "data"
STATUS_FILE = DATA_DIR / "cnmv_sync_status.json"


def get_existing_completed_months(parquet_path: Path = DEFAULT_NAV_PARQUET, min_funds: int = 1000) -> Dict[str, Dict[str, Any]]:
    """
    Retorna els mesos que ja estan completament registrats a la base de dades local.
    Un mes es considera complet si conté almenys `min_funds` fons diferents.
    """
    if not parquet_path.exists():
        return {}

    con = duckdb.connect()
    try:
        query = f"""
            SELECT 
                strftime(date, '%Y-%m') as ym,
                COUNT(*) as rows_count,
                COUNT(DISTINCT instrument) as funds_count,
                MIN(date) as min_date,
                MAX(date) as max_date
            FROM read_parquet('{parquet_path}')
            GROUP BY ym
            HAVING funds_count >= {min_funds}
            ORDER BY ym ASC
        """
        df = con.execute(query).df()
        result = {}
        for _, row in df.iterrows():
            result[row["ym"]] = {
                "rows_count": int(row["rows_count"]),
                "funds_count": int(row["funds_count"]),
                "min_date": str(row["min_date"]),
                "max_date": str(row["max_date"]),
            }
        return result
    finally:
        con.close()


def detect_published_cnmv_months(start_year: int, end_year: int) -> List[Dict[str, Any]]:
    """
    Explora el portal de la CNMV per a cada any i en retorna la llista
    completa de mesos publicats amb els seus enllaços de descàrrega.
    """
    all_published = []
    for y in range(start_year, end_year + 1):
        try:
            links = fetch_cnmv_month_download_links(y)
            for item in links:
                ym_str = f"{y:04d}-{item['month']:02d}"
                all_published.append({
                    "ym": ym_str,
                    "year": y,
                    "month": item["month"],
                    "month_name": item["month_name"],
                    "download_url": item["download_url"]
                })
        except Exception as e:
            print(f"  [Avís] No s'han pogut obtenir enllaços per a l'any {y}: {e}")
    return sorted(all_published, key=lambda x: x["ym"])


def run_monthly_sync(
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    pace: float = 2.5,
    force: bool = False,
    max_months: Optional[int] = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Executa el cicle complet de sincronització mensual incremental.
    """
    current_year = datetime.now().year
    
    # 1. Comprovació de mesos existents a la base de dades
    completed_months = get_existing_completed_months()
    print(f"Base de dades local: {len(completed_months)} mesos completament registrats.")
    if completed_months:
        first_ym = min(completed_months.keys())
        last_ym = max(completed_months.keys())
        print(f"Rang existent: {first_ym} a {last_ym}")
        detected_start = int(last_ym.split("-")[0])
    else:
        detected_start = 2015

    y_start = start_year if start_year is not None else detected_start
    y_end = end_year if end_year is not None else current_year

    print(f"Cercant nous mesos a la CNMV entre els anys {y_start} i {y_end}...")
    published = detect_published_cnmv_months(y_start, y_end)
    print(f"S'han trobat {len(published)} mesos publicats al portal oficial.")

    # 2. Identificació dels mesos pendents de descarregar
    pending_months = []
    for item in published:
        ym = item["ym"]
        if force or ym not in completed_months:
            pending_months.append(item)

    if max_months and max_months > 0:
        pending_months = pending_months[:max_months]

    print(f"Mesos pendents d'ingesta: {len(pending_months)}")
    for m in pending_months:
        print(f"  → Pendent: {m['ym']} ({m['month_name']} {m['year']})")

    if not pending_months:
        print("✓ La base de dades ja està al dia amb la CNMV. No cal cap descàrrega.")
        sync_result = {
            "status": "up_to_date",
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "completed_months_count": len(completed_months),
            "new_months_ingested": [],
            "pending_count": 0,
            "message": "La base de dades ja conté tots els mesos publicats per la CNMV."
        }
        with open(STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(sync_result, f, indent=2, ensure_ascii=False)
        return sync_result

    if dry_run:
        print("[Dry-run] S'han detectat mesos pendents però no s'ha descarregat cap fitxer.")
        return {
            "status": "dry_run",
            "pending_months": [m["ym"] for m in pending_months],
            "pending_count": len(pending_months)
        }

    # 3. Descàrrega i extracció dels nous mesos
    ingested_list = []
    all_new_dfs = []

    for idx, item in enumerate(pending_months, start=1):
        ym = item["ym"]
        y = item["year"]
        m = item["month"]
        url = item["download_url"]
        
        print(f"[{idx}/{len(pending_months)}] Descarregant {ym} ({item['month_name']})...")
        try:
            zip_file, downloaded = get_cached_or_download_zip(y, m, url, pace_seconds=pace)
            df_nav = extract_navs_from_zip(zip_file, y, m)
            n_funds = df_nav["instrument"].nunique()
            n_rows = len(df_nav)
            print(f"    ✓ Extrets {n_rows:,} registres per a {n_funds:,} fons.")
            
            if not df_nav.empty:
                all_new_dfs.append(df_nav)
                ingested_list.append({
                    "ym": ym,
                    "rows": n_rows,
                    "funds": n_funds,
                    "file": zip_file.name
                })
        except Exception as e:
            print(f"    ✗ Error processant {ym}: {e}")

    # 4. Fusió acumulada a data/optifunds_nav_history.parquet
    if all_new_dfs:
        print(f"Fusionant {len(all_new_dfs)} mesos nous a la base de dades Parquet...")
        combined_df = pd.concat(all_new_dfs, ignore_index=True)
        total_rows, total_funds = merge_navs_into_parquet(combined_df, DEFAULT_NAV_PARQUET)
        print(f"✓ Base de dades actualitzada amb èxit: {total_rows:,} registres totals ({total_funds:,} fons).")

        # 5. Regeneració de la taula mestra del Screener
        print("Regenerant taula mestra del Catàleg & Screener (optifunds_screener_master.parquet)...")
        build_screener_master(force=True)
        print("✓ Screener actualitzat amb les noves mètriques històriques.")
    else:
        total_rows = 0
        total_funds = 0

    # 6. Registre d'estat a JSON
    sync_result = {
        "status": "updated" if ingested_list else "no_data",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "new_months_ingested": [item["ym"] for item in ingested_list],
        "ingested_details": ingested_list,
        "database_total_rows": total_rows,
        "database_total_funds": total_funds,
        "completed_months_count": len(completed_months) + len(ingested_list)
    }

    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(sync_result, f, indent=2, ensure_ascii=False)
    print(f"Estat desat a {STATUS_FILE.relative_to(BASE_DIR)}.")

    return sync_result


def main():
    parser = argparse.ArgumentParser(description="Actualització mensual automàtica de valors liquidatius de la CNMV")
    parser.add_argument("--start-year", type=int, help="Any d'inici de cerca (per defecte: detectat automàticament)")
    parser.add_argument("--end-year", type=int, help="Any final de cerca (per defecte: any actual)")
    parser.add_argument("--pace", type=float, default=2.5, help="Segons d'espera entre sol·licituds (pacing anti-bloqueig, defecte: 2.5s)")
    parser.add_argument("--force", action="store_true", help="Força la re-descàrrega de mesos ja existents")
    parser.add_argument("--max-months", type=int, help="Límit de mesos a descarregar en aquesta execució")
    parser.add_argument("--check-only", action="store_true", help="Només comprova si hi ha mesos pendents sense descarregar")
    
    args = parser.parse_args()

    print("=" * 72)
    print(" OPTIFUNDS: SINCRONITZACIÓ MENSUAL AUTOMÀTICA DE NAVs (CNMV)")
    print("=" * 72)

    res = run_monthly_sync(
        start_year=args.start_year,
        end_year=args.end_year,
        pace=args.pace,
        force=args.force,
        max_months=args.max_months,
        dry_run=args.check_only
    )

    print("=" * 72)
    print(f"Resultat de la sincronització: {res.get('status', 'completat')}")
    print("=" * 72)


if __name__ == "__main__":
    main()
