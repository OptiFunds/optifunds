const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

// ==========================================
// 1. TIPUS I INTERFÍCIES DE MERCAT I FONS
// ==========================================
export interface FundSummary {
  isin: string;
  fund_name: string;
  ter?: number;
  category?: string;
}

export interface ClosetIndexResponse {
  fund_name: string;
  bmk_name: string;
  overlap_pct: number;
  active_share_pct: number;
  official_ter: number;
  active_ter: number;
  is_closet_indexer: boolean;
}

export interface SharedHolding {
  name: string;
  ric: string;
  weight_fund1: number;
  weight_fund2: number;
  overlap_weight: number;
}

export interface OverlapComparison {
  fund1_name?: string;
  fund2_name?: string;
  overlap_pct: number;
  active_share_pct: number;
  ter_fund1?: number;
  ter_fund2?: number;
  shared_holdings?: SharedHolding[];
}

export interface FundPairwiseInfo {
  isin: string;
  fund_name: string;
  ter: number | null;
  volatility: number | null;
  return_1y: number | null;
  return_3y: number | null;
  sharpe: number | null;
  ric?: string;
}

export interface SharedHoldingPairwise {
  holding_name: string;
  holding_ric: string;
  weight_fund1: number;
  weight_fund2: number;
  overlap_weight: number;
}

export interface PairwiseComparisonData {
  fund1: FundPairwiseInfo;
  fund2: FundPairwiseInfo;
  total_overlap: number;
  active_share: number | null;
  shared_holdings: SharedHoldingPairwise[];
}

export interface RiskReturnPoint {
  isin: string;
  fund_name: string;
  ter: number;
  volatility: number;
  return_annual: number;
  sharpe_ratio: number;
}

export interface OptimizeAlternative {
  cand_name: string;
  cand_isin: string;
  cand_ter: number;
  ter_savings: number;
  overlap: number;
  cand_ret3y?: number | null;
  ret_gap_3y?: number | null;
}

export interface OptimizeResult {
  source_name: string;
  source_isin: string;
  source_ter: number;
  source_ret3y?: number | null;
  fingerprint?: {
    region?: string | null;
    sector?: string | null;
    style?: string | null;
    theme?: string | null;
    index_provider?: string | null;
  };
  relax_sector?: boolean;
  status?: string;
  message?: string | null;
  alternatives: OptimizeAlternative[];
}

export interface PortfolioHolding {
  holding_name: string;
  holding_ric: string;
  portfolio_weight: number;
}
export type HoldingExposure = PortfolioHolding;

export interface PortfolioResponse {
  top5_concentration: number;
  top10_concentration: number;
  top_holdings: PortfolioHolding[];
}

export interface FundDeepDive {
  profile: {
    isin: string;
    ric: string;
    name: string;
    category: string;
    currency: string;
    ter: number;
    mgmt_fee: number | null;
  };
  performance: {
    ret_1y: number | null;
    ret_3y: number | null;
    ret_5y: number | null;
    volatility: number | null;
    sharpe: number | null;
  };
  holdings: Array<{
    name: string;
    ric: string;
    weight: number;
  }>;
  closet_audit: {
    active_share: number | null;
    overlap: number | null;
    benchmark_name: string;
    active_ter: number | null;
    is_closet: boolean;
    has_holdings?: boolean;
  };
  alternatives: Array<{
    cand_name: string;
    cand_isin: string;
    cand_ter: number;
    ter_savings: number;
    overlap: number;
    cand_ret3y?: number | null;
    ret_gap_3y?: number | null;
  }>;
}

// ==========================================
// 2. TIPUS DEL SIMULADOR DE COSTOS (TER)
// ==========================================
export interface SimulationResult {
  year: number;
  gross_capital: number;
  net_capital: number;
  lost_to_fees: number;
}
export type SimulationPoint = SimulationResult;

// ==========================================
// 3. TIPUS DEL MOTOR MPT & MARKOWITZ
// ==========================================
export interface MPTResponse {
  user_portfolio: {
    return_annual_pct: number;
    volatility_annual_pct: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    var_95_monthly_pct: number;
    cvar_95_monthly_pct: number;
    diversification_benefit_pct: number;
    diversification_ratio: number;
  };
  max_sharpe_portfolio: {
    weights_pct: Record<string, number>;
    return_annual_pct: number;
    volatility_annual_pct: number;
    sharpe_ratio: number;
  };
  min_volatility_portfolio: {
    weights_pct: Record<string, number>;
    return_annual_pct: number;
    volatility_annual_pct: number;
    sharpe_ratio: number;
  };
  correlations: Record<string, Record<string, number>>;
  covariances_annual: Record<string, Record<string, number>>;
  risk_breakdown: Record<string, {
    weight_pct: number;
    risk_contrib_pct: number;
    risk_contribution_absolute: number;
    ratio_risk_weight: number;
  }>;
  individual_assets: Record<string, { return_annual_pct: number; volatility_annual_pct: number }>;
  monte_carlo_frontier: Array<{ volatility: number; return: number; sharpe: number }>;
}

// ==========================================
// 4. FUNCIONS D'API FETCH I CÀLCUL
// ==========================================
export async function searchFunds(query: string = ""): Promise<FundSummary[]> {
  const res = await fetch(`${API_BASE}/funds/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Error obtenint els fons");
  return res.json();
}

export async function auditClosetIndexing(isinFund: string, isinBmk: string): Promise<ClosetIndexResponse> {
  const res = await fetch(`${API_BASE}/analytics/closet-indexing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isin_fund: isinFund, isin_bmk: isinBmk }),
  });
  if (!res.ok) throw new Error("Error calculant l'Active Share");
  return res.json();
}

export async function comparePairwise(f1: string, f2: string): Promise<OverlapComparison> {
  const res = await fetch(`${API_BASE}/analytics/closet-indexing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isin_fund: f1, isin_bmk: f2 }),
  });
  if (!res.ok) throw new Error("Error comparant els dos fons");
  const data = await res.json();
  return {
    fund1_name: data.fund_name,
    fund2_name: data.bmk_name,
    overlap_pct: data.overlap_pct,
    active_share_pct: data.active_share_pct,
    shared_holdings: data.shared_holdings || []
  };
}

export async function computePortfolio(allocations: Array<{ isin: string; weight: number }>): Promise<PortfolioResponse> {
  const res = await fetch(`${API_BASE}/analytics/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ allocations }),
  });
  if (!res.ok) throw new Error("Error calculant la cartera");
  return res.json();
}
export const analyzePortfolio = computePortfolio;

export async function getFundDeepDive(isin: string): Promise<FundDeepDive> {
  const res = await fetch(`${API_BASE}/funds/${encodeURIComponent(isin)}/deep-dive`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.detail || `Error ${res.status}: No s'ha pogut carregar el fons ${isin}`);
  }
  return res.json();
}

export function simulateCompoundInterest(
  initialCapital: number,
  monthlyContribution: number,
  terPercent: number,
  expectedReturnPercent: number,
  years: number
): SimulationResult[] {
  const results: SimulationResult[] = [];
  const rGrossMonthly = Math.pow(1 + expectedReturnPercent / 100, 1 / 12) - 1;
  const netReturn = Math.max(0, expectedReturnPercent - terPercent);
  const rNetMonthly = Math.pow(1 + netReturn / 100, 1 / 12) - 1;

  let gross = initialCapital;
  let net = initialCapital;

  for (let m = 1; m <= years * 12; m++) {
    gross = gross * (1 + rGrossMonthly) + monthlyContribution;
    net = net * (1 + rNetMonthly) + monthlyContribution;

    if (m % 12 === 0) {
      const yr = m / 12;
      results.push({
        year: yr,
        gross_capital: Math.round(gross),
        net_capital: Math.round(net),
        lost_to_fees: Math.round(gross - net),
      });
    }
  }

  return results;
}

export async function fetchPortfolioMPT(allocations: Record<string, number>): Promise<MPTResponse> {
  const res = await fetch(`${API_BASE}/analytics/portfolio-mpt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ allocations }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error calculant l'optimització MPT" }));
    throw new Error(err.detail || "Error calculant l'optimització MPT");
  }
  return res.json();
}

// ==========================================
// 5. TIPUS I CRIDA LOOK-THROUGH GEOGRÀFIC
// ==========================================
export interface LookThroughResponse {
  geographic_distribution: Array<{ region: string; weight_pct: number }>;
  sector_distribution: Array<{ sector: string; weight_pct: number }>;
  top_consolidated_holdings: Array<{
    holding_name: string;
    holding_ric: string;
    region: string;
    sector: string;
    portfolio_exposure: number;
  }>;
}

export async function fetchPortfolioLookthrough(allocations: Record<string, number>): Promise<LookThroughResponse> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
  const res = await fetch(`${API_URL}/analytics/portfolio-lookthrough`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ allocations }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error calculant el Look-Through" }));
    throw new Error(err.detail || "Error calculant el Look-Through");
  }
  return res.json();
}

// ==========================================
// 6. FUNCIONS COMPLEMENTÀRIES (PAIRWISE, RISC-RETORN, OPTIMITZACIÓ)
// ==========================================
export async function getPairwiseComparison(f1: string, f2: string): Promise<PairwiseComparisonData> {
  const res = await fetch(`${API_BASE}/funds/compare-pairwise?f1=${encodeURIComponent(f1)}&f2=${encodeURIComponent(f2)}`);
  if (!res.ok) throw new Error("Error comparant els dos fons");
  return res.json();
}

export async function getRiskReturnUniverse(): Promise<RiskReturnPoint[]> {
  const res = await fetch(`${API_BASE}/analytics/risk-return`);
  if (!res.ok) throw new Error("Error obtenint l'univers de risc-retorn");
  return res.json();
}

export async function optimizeFund(
  query: string,
  minOverlap: number = 0.0,
  relaxSector: boolean = false
): Promise<OptimizeResult> {
  const res = await fetch(`${API_BASE}/analytics/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, min_overlap: minOverlap, relax_sector: relaxSector }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error cercant alternatives del fons" }));
    throw new Error(err.detail || "Error cercant alternatives del fons");
  }
  return res.json();
}
