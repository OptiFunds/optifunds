"""
Mòdul d'ingesta de sèries de preus liquidatius (NAV) per a fons internacionals.
Cobreix fons comercialitzats a MyInvestor / Allfunds amb domicilis a França (FR),
Luxemburg (LU), Irlanda (IE), Alemanya (DE), etc. que no reporten a la CNMV espanyola.
Font primària: Sèries oficials de NAV diaris (Yahoo Finance / Morningstar via quotes 0P0000... i ETFs).
"""

import ssl
import sys
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime, date
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
import duckdb
import requests
import yfinance as yf

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from modules.nav_downloader import merge_navs_into_parquet, DEFAULT_NAV_PARQUET

DATA_DIR = BASE_DIR / "data"
SYMBOLS_CACHE_FILE = DATA_DIR / "cache_international_symbols.json"

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

try:
    SSL_CONTEXT = ssl._create_unverified_context()
except AttributeError:
    SSL_CONTEXT = ssl.create_default_context()

# Metadades completes verificades dels fons internacionals més populars de MyInvestor
KNOWN_INTERNATIONAL_METADATA = {
    "FR0000447823": {
        "name": "AXA Trésor Court Terme C",
        "symbol": "0P00000F24.F",
        "category": "Monetaris",
        "ter": 0.06,
        "manager": "AXA Investment Managers"
    },
    "IE00B03HD191": {
        "name": "Vanguard Global Stock Index EUR Acc",
        "symbol": "0P00000WLG.F",
        "category": "Renda Variable",
        "ter": 0.18,
        "manager": "Vanguard Group (Ireland)"
    },
    "IE0032620787": {
        "name": "Vanguard US 500 Stock Index EUR Acc",
        "symbol": "0P00000G12.F",
        "category": "Renda Variable",
        "ter": 0.10,
        "manager": "Vanguard Group (Ireland)"
    },
    "IE0007987690": {
        "name": "Vanguard European Stock Index Inv EUR Acc",
        "symbol": "0P00000RQ8.F",
        "category": "Renda Variable",
        "ter": 0.12,
        "manager": "Vanguard Group (Ireland)"
    },
    "IE0007472115": {
        "name": "Vanguard Euro Government Bond Index EUR Acc",
        "symbol": "0P00000RNA.F",
        "category": "Renda Fixa",
        "ter": 0.12,
        "manager": "Vanguard Group (Ireland)"
    },
    "IE0007987708": {
        "name": "Vanguard Japan Stock Index EUR Acc",
        "symbol": "0P00000RN9.F",
        "category": "Renda Variable",
        "ter": 0.16,
        "manager": "Vanguard Group (Ireland)"
    },
    "IE00B04GQR24": {
        "name": "Vanguard Global Small-Cap Index EUR Acc",
        "symbol": "0P000019FE.F",
        "category": "Renda Variable",
        "ter": 0.29,
        "manager": "Vanguard Group (Ireland)"
    },
    "FR0010135103": {
        "name": "Carmignac Patrimoine A EUR Acc",
        "symbol": "0P00000FB4.F",
        "category": "Mixts",
        "ter": 1.50,
        "manager": "Carmignac Gestion"
    },
    "FR0010149302": {
        "name": "Carmignac Securite A EUR Acc",
        "symbol": "0P00000FB5.F",
        "category": "Renda Fixa",
        "ter": 1.12,
        "manager": "Carmignac Gestion"
    },
    "IE00BK5BQT80": {
        "name": "Vanguard FTSE All-World UCITS ETF (EUR)",
        "symbol": "VWCE.DE",
        "category": "Renda Variable",
        "ter": 0.22,
        "manager": "Vanguard Group (Ireland)"
    },
    "IE00B4L5Y983": {
        "name": "iShares Core MSCI World UCITS ETF (EUR)",
        "symbol": "IWDA.AS",
        "category": "Renda Variable",
        "ter": 0.20,
        "manager": "BlackRock Asset Management"
    },
    "LU1681043599": {
        "name": "Amundi MSCI World UCITS ETF EUR Acc",
        "symbol": "CW8.PA",
        "category": "Renda Variable",
        "ter": 0.38,
        "manager": "Amundi Asset Management"
    },
    "LU0996177215": {
        "name": "Amundi MSCI World UCITS ETF EUR Acc (ex-Lyxor)",
        "symbol": "CW8.PA",
        "category": "Renda Variable",
        "ter": 0.38,
        "manager": "Amundi Asset Management"
    },
}

KNOWN_INTERNATIONAL_SYMBOLS = {k: v["symbol"] for k, v in KNOWN_INTERNATIONAL_METADATA.items()}

# Gestor de sessió autenticada persistent (Cookie + Crumb)
_SESSION_CACHE: Optional[requests.Session] = None
_CRUMB_CACHE: Optional[str] = None
_SESSION_TIMESTAMP: float = 0.0


def _load_symbols_cache() -> Dict[str, str]:
    if SYMBOLS_CACHE_FILE.exists():
        try:
            with open(SYMBOLS_CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _save_symbols_cache(cache: Dict[str, str]):
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(SYMBOLS_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error desant cache de símbols: {e}")


def resolve_international_symbol(isin: str, fund_name: Optional[str] = None) -> Optional[str]:
    """
    Resol l'ISIN o nom d'un fons internacional al seu ticker corresponent a Yahoo Finance.
    Prioritza el mapeig conegut, la memòria cau local i finalment la cerca en línia.
    """
    clean_isin = isin.strip().upper()
    if clean_isin in KNOWN_INTERNATIONAL_SYMBOLS:
        return KNOWN_INTERNATIONAL_SYMBOLS[clean_isin]

    cache = _load_symbols_cache()
    if clean_isin in cache:
        return cache[clean_isin]

    # Cerca 1: Per ISIN directe
    symbol = _search_yahoo_symbol(clean_isin)
    
    # Cerca 2: Si no troba per ISIN i tenim el nom del fons, cercar pel nom net
    if not symbol and fund_name:
        clean_name = fund_name.replace(", FI", "").replace(" FI", "").strip()
        symbol = _search_yahoo_symbol(clean_name)

    if symbol:
        cache[clean_isin] = symbol
        _save_symbols_cache(cache)
        return symbol

    return None


def _search_yahoo_symbol(query_term: str) -> Optional[str]:
    """Cerca un ticker a l'API pública de cerca de Yahoo Finance."""
    try:
        encoded_q = urllib.parse.quote(query_term)
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={encoded_q}&quotesCount=6"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        
        with urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            quotes = data.get("quotes", [])
            if not quotes:
                return None

            # 1. Preferència per tickers de fons de Frankfurt (0P0000...F)
            for q in quotes:
                sym = q.get("symbol", "")
                if sym.startswith("0P") and sym.endswith(".F"):
                    return sym

            # 2. Preferència per tickers categoritzats com MUTUALFUND o ETF
            for q in quotes:
                qtype = q.get("quoteType", "")
                sym = q.get("symbol", "")
                if qtype in ("MUTUALFUND", "ETF") and sym:
                    return sym

            # 3. Primer resultat vàlid amb símbol
            for q in quotes:
                sym = q.get("symbol", "")
                if sym and not sym.startswith("^"):
                    return sym

    except Exception as e:
        print(f"Error cercant símbol Yahoo per '{query_term}': {e}")
    return None


def _get_authenticated_session(force_refresh: bool = False) -> Tuple[requests.Session, Optional[str]]:
    """
    Genera i manté una sessió HTTP amb cookies i crumb vàlids de Yahoo Finance.
    Això evita de forma garantida el bloqueig 429 Too Many Requests.
    """
    global _SESSION_CACHE, _CRUMB_CACHE, _SESSION_TIMESTAMP
    
    now = time.time()
    # Reutilitzar sessió si té menys d'1 hora i no es força refresc
    if not force_refresh and _SESSION_CACHE and _CRUMB_CACHE and (now - _SESSION_TIMESTAMP < 3600):
        return _SESSION_CACHE, _CRUMB_CACHE

    try:
        data_helper = yf.Ticker("0P00000F24.F")._data
        cookie, crumb = data_helper._get_cookie_and_crumb_basic(proxy=None, timeout=15)
        
        sess = requests.Session()
        sess.headers.update(data_helper.user_agent_headers)
        if cookie:
            sess.cookies.set(cookie.name, cookie.value, domain=".yahoo.com")
            
        _SESSION_CACHE = sess
        _CRUMB_CACHE = crumb
        _SESSION_TIMESTAMP = now
        return _SESSION_CACHE, _CRUMB_CACHE
    except Exception as e:
        print(f"Error obtenint cookie/crumb de Yahoo Finance: {e}")
        fallback_sess = requests.Session()
        fallback_sess.headers.update({"User-Agent": USER_AGENT})
        return fallback_sess, None


def fetch_international_nav(
    isin: str,
    symbol: Optional[str] = None,
    range_str: str = "10y"
) -> Optional[pd.DataFrame]:
    """
    Descarrega la sèrie temporal diària oficial de preus liquidatius (NAV) per a un fons internacional.
    Retorna un DataFrame amb les columnes: ['instrument', 'date', 'nav'].
    """
    clean_isin = isin.strip().upper()
    if not symbol:
        symbol = resolve_international_symbol(clean_isin)

    if not symbol:
        return None

    sess, crumb = _get_authenticated_session()
    
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?range={range_str}&interval=1d"
    if crumb:
        url += f"&crumb={crumb}"

    try:
        resp = sess.get(url, timeout=15)
        
        # Si respon 401, 403 o 429, reintentem una vegada refrescant el crumb
        if resp.status_code in (401, 403, 429):
            sess, crumb = _get_authenticated_session(force_refresh=True)
            url_retry = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?range={range_str}&interval=1d"
            if crumb:
                url_retry += f"&crumb={crumb}"
            resp = sess.get(url_retry, timeout=15)

        if resp.status_code != 200:
            print(f"Resposta no esperada ({resp.status_code}) per a {clean_isin} ({symbol})")
            return None

        data = resp.json()
        chart = data.get("chart", {})
        results = chart.get("result", [])
        if not results:
            return None

        result_item = results[0]
        timestamps = result_item.get("timestamp", [])
        indicators = result_item.get("indicators", {})
        quotes = indicators.get("quote", [{}])[0]
        closes = quotes.get("close", [])

        if not timestamps or not closes or len(timestamps) != len(closes):
            return None

        records = []
        for ts, cl in zip(timestamps, closes):
            if cl is not None:
                try:
                    val = float(cl)
                    if val > 0:
                        dt = date.fromtimestamp(ts)
                        records.append({
                            "instrument": clean_isin,
                            "date": dt,
                            "nav": val
                        })
                except (ValueError, TypeError, OverflowError):
                    continue

        if len(records) < 5:
            return None

        df = pd.DataFrame(records)
        df = df.drop_duplicates(subset=["date"]).sort_values("date").reset_index(drop=True)
        return df

    except Exception as e:
        print(f"Error descarregant NAV internacional per a {clean_isin} ({symbol}): {e}")
        return None


def ingest_international_nav(isin: str, force: bool = False) -> Tuple[bool, int]:
    """
    Descarrega i fusiona la sèrie diària d'un fons internacional dins del fitxer Parquet mestre.
    Retorna: (èxit: bool, punts_afegits: int)
    """
    clean_isin = isin.strip().upper()
    
    # Comprovar si ja el tenim amb prou dades
    if not force and DEFAULT_NAV_PARQUET.exists():
        try:
            con = duckdb.connect()
            cnt = con.execute(
                f"SELECT COUNT(*) FROM read_parquet('{DEFAULT_NAV_PARQUET}') WHERE instrument = ?",
                [clean_isin]
            ).fetchone()[0]
            con.close()
            if cnt >= 30:
                return True, cnt
        except Exception:
            pass

    df = fetch_international_nav(clean_isin)
    if df is None or df.empty:
        return False, 0

    points_count = len(df)
    try:
        merge_navs_into_parquet(df, DEFAULT_NAV_PARQUET)
        return True, points_count
    except Exception as e:
        print(f"Error fusionant sèrie internacional {clean_isin}: {e}")
        return False, 0


def ensure_fund_nav_available(isin: str) -> bool:
    """
    Comprova ràpidament si un fons té dades al Parquet mestre.
    Si no en té, intenta descarregar-ne la sèrie internacional sota demanda.
    """
    clean_isin = isin.strip().upper()
    
    if DEFAULT_NAV_PARQUET.exists():
        try:
            con = duckdb.connect()
            cnt = con.execute(
                f"SELECT COUNT(*) FROM read_parquet('{DEFAULT_NAV_PARQUET}') WHERE instrument = ?",
                [clean_isin]
            ).fetchone()[0]
            con.close()
            if cnt >= 15:
                return True
        except Exception:
            pass

    # No hi és al Parquet: intentem ingesta sota demanda
    success, _ = ingest_international_nav(clean_isin)
    return success


def sync_popular_myinvestor_funds() -> Dict[str, Any]:
    """
    Ingesta i sincronització massiva dels fons internacionals més rellevants de MyInvestor.
    """
    results = {}
    total_added = 0
    
    for isin, label in KNOWN_INTERNATIONAL_SYMBOLS.items():
        try:
            success, count = ingest_international_nav(isin, force=False)
            results[isin] = {
                "success": success,
                "data_points": count,
                "symbol": label
            }
            if success:
                total_added += count
            time.sleep(0.4)  # Pacing amable
        except Exception as e:
            results[isin] = {"success": False, "error": str(e)}

    return {
        "status": "success",
        "total_funds_processed": len(KNOWN_INTERNATIONAL_SYMBOLS),
        "total_points_synced": total_added,
        "details": results
    }


if __name__ == "__main__":
    print("=" * 70)
    print("OPTIFUNDS: SINCRONITZACIÓ DE SÈRIES DE PREUS DE FONS INTERNACIONALS")
    print("=" * 70)
    res = sync_popular_myinvestor_funds()
    print(f"Completat! Processats {res['total_funds_processed']} fons ({res['total_points_synced']:,} punts).")
    for k, v in res["details"].items():
        print(f"  • {k}: {'✓' if v.get('success') else '✗'} ({v.get('data_points', 0)} punts) [{v.get('symbol', '')}]")
