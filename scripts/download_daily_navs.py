#!/usr/bin/env python3
"""
Script CLI per a la descàrrega i ingesta automàtica de valors liquidatius (NAV) diaris.
Font: Registres Oficials de la CNMV (Circular 4/2008)

Ús:
    # Descarregar tots els mesos de 2024 amb pausa de 3s entre sol·licituds per no saturar la CNMV:
    python3 scripts/download_daily_navs.py --year 2024 --all-months --pace 3.0

    # Descarregar mesos específics:
    python3 scripts/download_daily_navs.py --year 2024 --months 10 11 12

    # Processar un fitxer ZIP local:
    python3 scripts/download_daily_navs.py --local-zip /path/to/cnmv_202412.zip
"""

import sys
import time
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from modules.nav_downloader import (
    extract_navs_from_zip,
    fetch_cnmv_month_download_links,
    get_cached_or_download_zip,
    merge_navs_into_parquet,
    CACHE_DIR,
    DEFAULT_NAV_PARQUET,
    OFFICIAL_BENCHMARK_ISINS
)
import duckdb


def main():
    parser = argparse.ArgumentParser(description="Descarregador massiu de NAVs diaris de la CNMV")
    parser.add_argument("--local-zip", type=str, help="Camí a un fitxer ZIP de la CNMV ja descarregat")
    parser.add_argument("--year", type=int, default=2024, help="Any a consultar (per defecte 2024)")
    parser.add_argument("--months", type=int, nargs="+", help="Llista de mesos (1..12)")
    parser.add_argument("--all-months", action="store_true", help="Descarrega tots els mesos disponibles de l'any")
    parser.add_argument("--pace", type=float, default=3.0, help="Segons d'espera entre descàrregues (pacing anti-bloqueig, per defecte 3.0s)")
    parser.add_argument("--output", type=str, default=str(DEFAULT_NAV_PARQUET), help="Ruta del fitxer Parquet")

    args = parser.parse_args()
    output_path = Path(args.output)

    print("=" * 72)
    print(" OPTIFUNDS: INGESTA MASSIVA DE VALORS LIQUIDATIUS DIARIS (CNMV)")
    print("=" * 72)

    # 1. Comprovació inicial de l'estat existent
    if output_path.exists():
        con = duckdb.connect()
        initial_stats = con.execute(f"""
            SELECT COUNT(*), COUNT(DISTINCT instrument), MIN(date), MAX(date)
            FROM read_parquet('{output_path}')
        """).fetchone()
        con.close()
        print(f"Estat previ a la base de dades:")
        print(f"  • Punts de NAV existents: {initial_stats[0]:,}")
        print(f"  • Instruments únics:       {initial_stats[1]:,}")
        print(f"  • Rang temporal:           {initial_stats[2]} fins a {initial_stats[3]}")
    else:
        print("Fitxer Parquet de NAVs no existent prèviament. Es crearà de zero.")

    print("-" * 72)

    # 2. Cas A: Fitxer ZIP local individual
    if args.local_zip:
        local_path = Path(args.local_zip)
        if not local_path.exists():
            print(f"Error: El fitxer {local_path} no existeix!")
            sys.exit(1)
            
        print(f"Processant fitxer ZIP local: {local_path.name}...")
        year = args.year
        month = 12
        if "202412" in local_path.name or "2024_12" in local_path.name:
            year, month = 2024, 12
        elif "202411" in local_path.name or "2024_11" in local_path.name:
            year, month = 2024, 11

        df_navs = extract_navs_from_zip(local_path, year, month)
        print(f"  ✓ Extrets {len(df_navs):,} punts de NAV per a {df_navs['instrument'].nunique():,} instruments.")
        
        total_rows, total_instruments = merge_navs_into_parquet(df_navs, output_path)
        print(f"  ✓ Base de dades actualitzada: {total_rows:,} registres ({total_instruments:,} instruments).")

    # 3. Cas B: Descàrrega orquestrada amb temporitzador / pacing
    else:
        print(f"Consultant el registre oficial de la CNMV per a l'any {args.year}...")
        try:
            available_months = fetch_cnmv_month_download_links(args.year)
            print(f"  ✓ Trobats {len(available_months)} mesos oficials disponibles.")
        except Exception as e:
            print(f"Error connectant amb la seu de la CNMV: {e}")
            sys.exit(1)

        months_to_process = []
        if args.months:
            months_to_process = [m for m in available_months if m["month"] in args.months]
        elif args.all_months:
            months_to_process = available_months
        else:
            if available_months:
                months_to_process = [available_months[-1]]

        print(f"\nMesos seleccionats per a la ingesta: {len(months_to_process)}")
        print(f"Pausa entre descàrregues configurada a: {args.pace}s (Polite Pacing)")
        print("-" * 72)

        total_extracted_session = 0

        for idx, m_info in enumerate(months_to_process, 1):
            m_name = m_info["month_name"]
            m_year = m_info["year"]
            m_num = m_info["month"]
            print(f"[{idx}/{len(months_to_process)}] Processant {m_name} {m_year}...")

            try:
                zip_path, was_downloaded = get_cached_or_download_zip(
                    m_year, m_num, m_info["download_url"], 
                    cache_dir=CACHE_DIR, 
                    pace_seconds=args.pace if idx > 1 else 0
                )
                
                status_orig = "descarregat de CNMV" if was_downloaded else "recuperat de memòria cau local"
                size_mb = zip_path.stat().st_size / 1024 / 1024
                print(f"    • Fitxer {zip_path.name} ({size_mb:.2f} MB, {status_orig})")

                df_month = extract_navs_from_zip(zip_path, m_year, m_num)
                pts_cnt = len(df_month)
                funds_cnt = df_month["instrument"].nunique()
                total_extracted_session += pts_cnt
                print(f"    • Parsejats {pts_cnt:,} punts de NAV ({funds_cnt:,} instruments).")

                # Fusió atòmica a DuckDB
                total_rows, total_instruments = merge_navs_into_parquet(df_month, output_path)
                print(f"    • Parquet actualitzat: {total_rows:,} punts totals ({total_instruments:,} instruments).")

            except Exception as e:
                print(f"    ✗ Error processant {m_name} {m_year}: {e}")
                time.sleep(2.0)

    # 4. Resum final
    print("\n" + "=" * 72)
    print(" VERIFICACIÓ D'ÍNDEXS I COBERTURA FINAL A LA BASE DE DADES")
    print("=" * 72)
    if output_path.exists():
        con = duckdb.connect()
        final_stats = con.execute(f"""
            SELECT COUNT(*), COUNT(DISTINCT instrument), MIN(date), MAX(date)
            FROM read_parquet('{output_path}')
        """).fetchone()

        print(f"Total global consolidat:")
        print(f"  • Punts de NAV diaris:     {final_stats[0]:,}")
        print(f"  • Instruments / Fons:      {final_stats[1]:,}")
        print(f"  • Període complet:         {final_stats[2]} fins a {final_stats[3]}")
        print("-" * 72)
        print("Benchmarks de mercat:")
        for isin, label in OFFICIAL_BENCHMARK_ISINS.items():
            cnt = con.execute(f"""
                SELECT COUNT(*), MIN(date), MAX(date), MIN(nav), MAX(nav)
                FROM read_parquet('{output_path}')
                WHERE instrument = '{isin}'
            """).fetchone()
            if cnt and cnt[0] > 0:
                print(f"  [OK] {label:<38} ({isin}): {cnt[0]} dies ({cnt[1]} a {cnt[2]}), rang {cnt[3]:.2f}-{cnt[4]:.2f}€")
            else:
                print(f"  [--] {label:<38} ({isin}): Pendent")
        con.close()

    print("=" * 72)
    print(" Ingesta finalitzada amb èxit!")
    print("=" * 72)


if __name__ == "__main__":
    main()
