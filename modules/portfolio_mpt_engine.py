import numpy as np
import pandas as pd
import duckdb
from pathlib import Path
from scipy.optimize import minimize
from scipy.stats import norm

DATA_DIR = Path("/Users/lluisbernadi/LSEG/data")
NAV_PARQUET = DATA_DIR / "optifunds_nav_history.parquet"
NAV_CSV = DATA_DIR / "optifunds_nav_history.csv"
MASTER_PARQUET = DATA_DIR / "optifunds_master_spain.parquet"

TRADING_DAYS = 252
RF_RATE = 0.025  # 2.5% Taxa lliure de risc

def resolve_nav_identifiers(requested_ids: list[str]) -> dict[str, str]:
    """Mapeja codis ISIN o RIC a l'identificador present a la taula de NAV."""
    con = duckdb.connect()
    nav_path = NAV_PARQUET if NAV_PARQUET.exists() else NAV_CSV
    
    existing_nav_ids = set(con.execute(f"""
        SELECT DISTINCT instrument FROM read_parquet('{nav_path}')
    """ if NAV_PARQUET.exists() else f"""
        SELECT DISTINCT Instrument AS instrument FROM read_csv_auto('{nav_path}')
    """).df()["instrument"].dropna().tolist())
    
    mapping = {}
    missing = []
    for req in requested_ids:
        if req in existing_nav_ids:
            mapping[req] = req
        else:
            missing.append(req)
            
    if missing and MASTER_PARQUET.exists():
        missing_str = ", ".join([f"'{m}'" for m in missing])
        alias_df = con.execute(f"""
            SELECT ISIN, RIC, Instrument
            FROM read_parquet('{MASTER_PARQUET}')
            WHERE ISIN IN ({missing_str}) OR RIC IN ({missing_str}) OR Instrument IN ({missing_str})
        """).df()
        
        for _, row in alias_df.iterrows():
            candidates = [str(row["ISIN"]), str(row["RIC"]), str(row["Instrument"])]
            for req in missing:
                if req in candidates:
                    for cand in candidates:
                        if cand in existing_nav_ids:
                            mapping[req] = cand
                            break
    con.close()
    return mapping

def load_nav_matrix(instruments: list[str]) -> tuple[pd.DataFrame, list[str]]:
    """Carrega la matriu de preus diaris pivotada per data."""
    mapping = resolve_nav_identifiers(instruments)
    nav_ids = [mapping.get(i) for i in instruments if mapping.get(i)]
    
    if len(nav_ids) < len(instruments):
        return pd.DataFrame(), []

    nav_path = NAV_PARQUET if NAV_PARQUET.exists() else NAV_CSV
    con = duckdb.connect()
    ids_str = ", ".join([f"'{x}'" for x in nav_ids])
    
    query = f"""
        SELECT 
            instrument,
            CAST(date AS DATE) AS date,
            CAST(nav AS DOUBLE) AS nav
        FROM read_parquet('{nav_path}')
        WHERE instrument IN ({ids_str})
        ORDER BY date ASC
    """ if NAV_PARQUET.exists() else f"""
        SELECT 
            Instrument AS instrument,
            CAST(date AS DATE) AS date,
            TRY_CAST(nav AS DOUBLE) AS nav
        FROM read_csv_auto('{nav_path}')
        WHERE Instrument IN ({ids_str})
        ORDER BY date ASC
    """
    
    df_nav = con.execute(query).df().dropna()
    con.close()
    
    if df_nav.empty:
        return pd.DataFrame(), []
        
    nav_pivot = df_nav.pivot(index="date", columns="instrument", values="nav")
    nav_pivot = nav_pivot.ffill().dropna()
    
    inv_mapping = {v: k for k, v in mapping.items()}
    nav_pivot = nav_pivot.rename(columns=inv_mapping)
    
    return nav_pivot, list(nav_pivot.columns)

def portfolio_performance(weights: np.ndarray, mean_returns: pd.Series, cov_matrix: pd.DataFrame):
    ret = float(np.sum(mean_returns * weights) * TRADING_DAYS)
    vol = float(np.sqrt(np.dot(weights.T, np.dot(cov_matrix * TRADING_DAYS, weights))))
    sharpe = float((ret - RF_RATE) / vol) if vol > 0 else 0.0
    return ret, vol, sharpe

def optimize_portfolio_mpt(allocations: dict[str, float]):
    instruments = list(allocations.keys())
    user_weights = np.array([allocations[i] / 100.0 for i in instruments])
    
    df_prices, found_instruments = load_nav_matrix(instruments)
    if df_prices.empty or len(found_instruments) < len(instruments):
        missing = set(instruments) - set(found_instruments)
        return {"error": f"No s'han trobat sèries de NAV suficients per a: {', '.join(missing)}"}
    
    returns = np.log(df_prices / df_prices.shift(1)).dropna()
    if len(returns) < 30:
        return {"error": "Les sèries no tenen prou dies en comú per calcular mètriques fiables."}
        
    mean_daily = returns.mean()
    cov_daily = returns.cov()
    cov_annual = cov_daily * TRADING_DAYS
    corr_matrix = returns.corr().round(3).to_dict()
    num_assets = len(instruments)
    
    # 1. Mètriques de Cartera Actual
    u_ret, u_vol, u_sharpe = portfolio_performance(user_weights, mean_daily, cov_daily)
    
    # Retorns de la cartera dia a dia per a càlculs asimètrics
    portfolio_daily_returns = (returns * user_weights).sum(axis=1)
    
    # Sortino Ratio (Downside deviation)
    negative_returns = portfolio_daily_returns[portfolio_daily_returns < 0]
    downside_std = np.sqrt(np.mean(negative_returns**2)) * np.sqrt(TRADING_DAYS) if len(negative_returns) > 0 else 0.0001
    sortino = float((u_ret - RF_RATE) / downside_std)
    
    # VaR 95% i CVaR 95% mensuals (paramètric t=21 dies)
    z_score = norm.ppf(0.95)
    monthly_vol = u_vol * np.sqrt(21 / 252)
    monthly_ret = u_ret * (21 / 252)
    var_95_pct = float(max(0, (z_score * monthly_vol - monthly_ret) * 100))
    cvar_95_pct = float(max(0, (monthly_vol * (norm.pdf(z_score) / 0.05) - monthly_ret) * 100))
    
    # 2. Contribució Marginal al Risc (Risk Contribution)
    marginal_contrib = np.dot(cov_annual, user_weights) / u_vol if u_vol > 0 else np.zeros(num_assets)
    component_risk = user_weights * marginal_contrib
    pct_risk_contrib = (component_risk / u_vol) * 100 if u_vol > 0 else np.zeros(num_assets)
    
    risk_breakdown = {}
    for idx, inst in enumerate(instruments):
        risk_breakdown[inst] = {
            "weight_pct": round(allocations[inst], 1),
            "risk_contrib_pct": round(float(pct_risk_contrib[idx]), 1),
            "risk_contribution_absolute": round(float(component_risk[idx]) * 100, 2),
            "ratio_risk_weight": round(float(pct_risk_contrib[idx] / allocations[inst]), 2) if allocations[inst] > 0 else 0.0
        }

    ind_vols = (returns.std() * np.sqrt(TRADING_DAYS)).to_dict()
    ind_returns = (mean_daily * TRADING_DAYS).to_dict()
    
    # 3. Optimitzador de Markowitz: Màxim Sharpe
    def neg_sharpe(w):
        r, v, s = portfolio_performance(w, mean_daily, cov_daily)
        return -s
        
    bounds = tuple((0.0, 1.0) for _ in range(num_assets))
    constraints = ({'type': 'eq', 'fun': lambda w: np.sum(w) - 1.0})
    init_guess = num_assets * [1.0 / num_assets]
    
    opt_sharpe = minimize(neg_sharpe, init_guess, method='SLSQP', bounds=bounds, constraints=constraints)
    max_s_weights = dict(zip(instruments, np.round(opt_sharpe.x * 100, 2)))
    s_ret, s_vol, s_sharpe = portfolio_performance(opt_sharpe.x, mean_daily, cov_daily)
    
    # 4. Optimitzador: Mínima Volatilitat
    def min_vol(w):
        r, v, s = portfolio_performance(w, mean_daily, cov_daily)
        return v
        
    opt_vol = minimize(min_vol, init_guess, method='SLSQP', bounds=bounds, constraints=constraints)
    min_v_weights = dict(zip(instruments, np.round(opt_vol.x * 100, 2)))
    v_ret, v_vol, v_sharpe = portfolio_performance(opt_vol.x, mean_daily, cov_daily)
    
    # 5. Simulació de Monte Carlo
    NUM_SIMS = 2000
    sim_results = []
    np.random.seed(42)
    for _ in range(NUM_SIMS):
        w = np.random.random(num_assets)
        w /= np.sum(w)
        r, v, s = portfolio_performance(w, mean_daily, cov_daily)
        sim_results.append({
            "volatility": round(float(v) * 100, 2),
            "return": round(float(r) * 100, 2),
            "sharpe": round(float(s), 2)
        })

    weighted_ind_vol = sum(user_weights[i] * ind_vols[instruments[i]] for i in range(num_assets))
    diversification_gain = round(float((weighted_ind_vol - u_vol) * 100), 2)
    diversification_ratio = round(float(weighted_ind_vol / u_vol), 2) if u_vol > 0 else 1.0

    return {
        "user_portfolio": {
            "return_annual_pct": round(u_ret * 100, 2),
            "volatility_annual_pct": round(u_vol * 100, 2),
            "sharpe_ratio": round(u_sharpe, 2),
            "sortino_ratio": round(sortino, 2),
            "var_95_monthly_pct": round(var_95_pct, 2),
            "cvar_95_monthly_pct": round(cvar_95_pct, 2),
            "diversification_benefit_pct": diversification_gain,
            "diversification_ratio": diversification_ratio
        },
        "max_sharpe_portfolio": {
            "weights_pct": max_s_weights,
            "return_annual_pct": round(s_ret * 100, 2),
            "volatility_annual_pct": round(s_vol * 100, 2),
            "sharpe_ratio": round(s_sharpe, 2)
        },
        "min_volatility_portfolio": {
            "weights_pct": min_v_weights,
            "return_annual_pct": round(v_ret * 100, 2),
            "volatility_annual_pct": round(v_vol * 100, 2),
            "sharpe_ratio": round(v_sharpe, 2)
        },
        "correlations": corr_matrix,
        "covariances_annual": {
            i: {j: round(float(cov_annual.loc[i, j]) * 10000, 2) for j in instruments}
            for i in instruments
        },
        "risk_breakdown": risk_breakdown,
        "individual_assets": {
            inst: {
                "return_annual_pct": round(ind_returns[inst] * 100, 2),
                "volatility_annual_pct": round(ind_vols[inst] * 100, 2)
            } for inst in instruments
        },
        "monte_carlo_frontier": sim_results[::4]
    }
