#!/usr/bin/env python3
"""
Script CLI per a la descàrrega i ingesta automàtica de valors liquidatius (NAV) diaris.
Font: Registres Oficials de la CNMV (Circular 4/2008)

Ús:
    python3 scripts/download_daily_navs.py --local-zip /path/to/cnmv_202412.zip
    python3 scripts/download_daily_navs.py --year 2024 --months 12
    python3 scripts/download_daily_navs.py --year 2024 --all-months
"""

import sys
import argparse
from pathlib import Path

# Assegura que l'arrel del projecte està a sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from modules.nav_downloader import (
    extract_navs_from_zip,
    fetch_cnmv_month_download_links,
    download_cnmv_zip,
    merge_navs_into_parquet,
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
    parser.add_argument("--output", type=str, default=str(DEFAULT_NAV_PARQUET), help="Ruta de sortida del fitxer Parquet")

    args = parser.parse_args()
    output_path = Path(args.output)

    print("=" * 70)
    print(" OPTIFUNDS: MÒDUL D'INGESTA DE NAVs DIARIS I ÍNDEXS DE LA CNMV")
    print("=" * 70)

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

    print("-" * 70)

    # 2. Cas A: Fitxer ZIP local
    if args.local_zip:
        local_path = Path(args.local_zip)
        if not local_path.exists():
            print(f"Error: El fitxer {local_path} no existeix!")
            sys.exit(1)
            
        print(f"Processant fitxer ZIP local: {local_path.name}...")
        # Intenta deduir mes i any pel nom (ex: cnmv_202412.zip)
        year = args.year
        month = 12
        if "202412" in local_path.name:
            year, month = 2024, 12
        elif "202411" in local_path.name:
            year, month = 2024, 11

        df_navs = extract_navs_from_zip(local_path, year, month)
        print(f"  ✓ Extrets {len(df_navs):,} punts de NAV diaris per a {df_navs['instrument'].nunique():,} instruments.")
        
        # Guardar / Fusionar
        total_rows, total_instruments = merge_navs_into_parquet(df_navs, output_path)
        print(f"  ✓ Base de dades actualitzada a: {output_path}")
        print(f"    Total acumulat: {total_rows:,} registres ({total_instruments:,} fons i índexs).")

    # 3. Cas B: Descàrrega remota de la CNMV
    else:
        print(f"Consultant enllaços oficials de la CNMV per a l'any {args.year}...")
        try:
            available_months = fetch_cnmv_month_download_links(args.year)
            print(f"  ✓ Trobats {len(available_months)} mesos publicats a la CNMV:")
            for m in available_months:
                print(f"    - {m['month_name']} {m['year']}")
        except Exception as e:
            print(f"Error connectant amb la CNMV: {e}")
            sys.exit(1)

        months_to_process = []
        if args.months:
            months_to_process = [m for m in available_months if m["month"] in args.months]
        elif args.all_months:
            months_to_process = available_months
        else:
            # Per defecte l'últim mes disponible
            if available_months:
                months_to_process = [available_months[-1]]

        for m_info in months_to_process:
            print(f"\nDescarregant paquet de {m_info['month_name']} {m_info['year']}...")
            try:
                zip_bytes = download_cnmv_zip(m_info["download_url"])
                print(f"  ✓ Descarregats {len(zip_bytes) / 1024 / 1024:.2f} MB. Processant XML...")
                df_month = extract_navs_from_zip(zip_bytes, m_info["year"], m_info["month"])
                print(f"  ✓ Extrets {len(df_month):,} punts de NAV ({df_month['instrument'].nunique():,} instruments).")
                
                total_rows, total_instruments = merge_navs_into_parquet(df_month, output_path)
                print(f"  ✓ Parquet actualitzat: {total_rows:,} punts totals ({total_instruments:,} instruments).")
            except Exception as e:
                print(f"  ✗ Error processant {m_info['month_name']}: {e}")

    # 4. Resum de benchmarks i índexs presents
    print("\n" + "=" * 70)
    print(" VERIFICACIÓ D'ÍNDEXS I BENCHMARKS A LA BASE DE DADES")
    print("=" * 70)
    con = duckdb.connect()
    for isin, label in OFFICIAL_BENCHMARK_ISINS.items():
        cnt = con.execute(f"""
            SELECT COUNT(*), MIN(date), MAX(date), MIN(nav), MAX(nav)
            FROM read_parquet('{output_path}')
            WHERE instrument = '{isin}'
        """).fetchone()
        if cnt and cnt[0] > 0:
            print(f"  [OK] {label} ({isin}):")
            print(f"       {cnt[0]} dies històrics ({cnt[1]} a {cnt[2]}), rang: {cnt[3]:.2f} - {cnt[4]:.2f} €")
        else:
            print(f"  [--] {label} ({isin}): Pendent d'afegir")
    con.close()
    print("=" * 70)
    print(" Ingesta finalitzada amb èxit!")
    print("=" * 70)


if __name__ == "__main__":
    main()
