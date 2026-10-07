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

export interface ClosetIndexHolding {
  Resolved_Name: string;
  holding_ric: string;
  Clean_Weight_fnd: number;
  Clean_Weight_bmk: number;
  Shared_Weight: number;
}

export interface ClosetIndexResponse {
  fund_name: string;
  bmk_name: string;
  overlap_pct: number;
  active_share_pct: number;
  official_ter: number;
  ter_benchmark?: number;
  active_ter: number;
  is_closet_indexer: boolean;
  top_overlaps?: ClosetIndexHolding[];
}

export interface BenchmarkItem {
  isin: string;
  name: string;
  market: string;
  region: string;
  ter: number;
  is_default: boolean;
}

export interface BenchmarkRecommendationResponse {
  fund_isin: string;
  fund_name: string;
  category: string;
  detected_region: string;
  recommended_benchmark: BenchmarkItem;
  reason: string;
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

export interface HistoricalComparisonData {
  period: string;
  date_range: {
    start: string;
    end: string;
    total_days: number;
  };
  fund1: {
    isin: string;
    name: string;
    category: string;
    ter: number;
    metrics: {
      total_return_pct: number;
      cagr_pct: number;
      volatility_pct: number;
      sharpe_ratio: number;
      max_drawdown_pct: number;
      max_drawdown_date: string;
    };
  };
  fund2: {
    isin: string;
    name: string;
    category: string;
    ter: number;
    metrics: {
      total_return_pct: number;
      cagr_pct: number;
      volatility_pct: number;
      sharpe_ratio: number;
      max_drawdown_pct: number;
      max_drawdown_date: string;
    };
  };
  comparison: {
    correlation: number;
    spread_total_return_pct: number;
    spread_cagr_pct: number;
    capital_10k_fund1: number;
    capital_10k_fund2: number;
    difference_10k_euros: number;
    ter_differential_annual_10k: number;
    is_closet_clone: boolean;
  };
  timeline: string[];
  fund1_base100: number[];
  fund2_base100: number[];
  fund1_drawdown: number[];
  fund2_drawdown: number[];
  spread_series: number[];
  yearly_performance: Array<{
    year: number;
    fund1_return_pct: number;
    fund2_return_pct: number;
    spread_return_pct: number;
  }>;
}

export interface PairwiseComparisonData {
  fund1: FundPairwiseInfo;
  fund2: FundPairwiseInfo;
  total_overlap: number;
  active_share: number | null;
  shared_holdings: SharedHoldingPairwise[];
  historical_comparison?: HistoricalComparisonData | null;
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

export function getFundAuditPdfUrl(isin: string): string {
  return `${API_BASE}/funds/${encodeURIComponent(isin)}/pdf`;
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
export async function getPairwiseComparison(f1: string, f2: string, period: string = "10y"): Promise<PairwiseComparisonData> {
  const res = await fetch(`${API_BASE}/funds/compare-pairwise?f1=${encodeURIComponent(f1)}&f2=${encodeURIComponent(f2)}&period=${encodeURIComponent(period)}`);
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

export async function fetchBenchmarksCatalog(): Promise<BenchmarkItem[]> {
  const res = await fetch(`${API_BASE}/analytics/benchmarks`);
  if (!res.ok) throw new Error("Error obtenint el catàleg de benchmarks");
  const data = await res.json();
  return data.benchmarks;
}

export async function fetchBenchmarkRecommendation(fund: string): Promise<BenchmarkRecommendationResponse> {
  const res = await fetch(`${API_BASE}/analytics/benchmark-recommendation?fund=${encodeURIComponent(fund)}`);
  if (!res.ok) throw new Error("Error obtenint la recomanació de benchmark");
  return res.json();
}

// ==========================================
// 7. SÈRIES HISTÒRIQUES CNMV I BACKTEST DE CARTERA (2015-2024)
// ==========================================
export interface BacktestFundItem {
  name: string;
  isin: string;
  weight_pct: number;
  total_return_pct: number;
  base100_series: number[];
}

export interface BacktestYearlyRow {
  year: number;
  portfolio_return_pct: number;
  benchmark_return_pct: number | null;
  excess_return_pct: number | null;
}

export interface PortfolioBacktestResponse {
  period: string;
  date_range: {
    start: string;
    end: string;
    total_days: number;
  };
  metrics: {
    total_return_pct: number;
    cagr_pct: number;
    volatility_pct: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    max_drawdown_pct: number;
    max_drawdown_date: string;
    calmar_ratio: number;
  };
  benchmark: {
    name: string;
    isin: string;
    total_return_pct: number;
    cagr_pct: number;
    volatility_pct: number;
    max_drawdown_pct: number;
    beta: number;
    alpha_annual_pct: number;
  };
  funds: Record<string, BacktestFundItem>;
  timeline: string[];
  portfolio_base100_series: number[];
  portfolio_drawdown_series: number[];
  benchmark_base100_series: number[];
  yearly_performance: BacktestYearlyRow[];
}

export interface FundHistoryResponse {
  fund: {
    isin: string;
    name: string;
    category: string;
    ter: number;
  };
  period: string;
  date_range: {
    start: string;
    end: string;
    total_days: number;
  };
  metrics: {
    total_return_pct: number;
    cagr_pct: number;
    volatility_pct: number;
    sharpe_ratio: number;
    max_drawdown_pct: number;
    max_drawdown_date: string;
    calmar_ratio: number;
  };
  benchmark: {
    name: string;
    isin: string;
    total_return_pct: number;
    cagr_pct: number;
    volatility_pct: number;
    max_drawdown_pct: number;
    beta: number;
    alpha_annual_pct: number;
  };
  timeline: string[];
  nav_series: number[];
  base100_series: number[];
  drawdown_series: number[];
  benchmark_base100_series: number[];
  yearly_performance: Array<{
    year: number;
    fund_return_pct: number;
    benchmark_return_pct: number | null;
    excess_return_pct: number | null;
  }>;
}

export async function fetchPortfolioBacktest(
  allocations: Record<string, number>,
  period: string = "max",
  benchmarkIsin?: string
): Promise<PortfolioBacktestResponse> {
  const res = await fetch(`${API_BASE}/analytics/portfolio-backtest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      allocations,
      period,
      benchmark_isin: benchmarkIsin || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error calculant el backtest històric" }));
    throw new Error(err.detail || "Error calculant el backtest històric");
  }
  return res.json();
}

export async function fetchFundHistory(
  isin: string,
  period: string = "max",
  benchmark?: string
): Promise<FundHistoryResponse> {
  let url = `${API_BASE}/funds/${encodeURIComponent(isin)}/history?period=${encodeURIComponent(period)}`;
  if (benchmark) {
    url += `&benchmark=${encodeURIComponent(benchmark)}`;
  }
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error obtenint l'històric del fons" }));
    throw new Error(err.detail || "Error obtenint l'històric del fons");
  }
  return res.json();
}

// ==========================================
// SCREENER I CATÀLEG HISTÒRIC DE FONS
// ==========================================
export interface ScreenerFund {
  isin: string;
  fund_name: string;
  management_company: string;
  asset_class: string;
  asset_class_group: string;
  ter: number;
  management_fee?: number;
  ret_1y: number | null;
  cagr_3y: number | null;
  cagr_5y: number | null;
  cagr_10y: number | null;
  volatility: number | null;
  max_drawdown: number | null;
  sharpe_ratio: number | null;
  has_cnmv_history: boolean;
  history_years: number;
  history_start_date: string | null;
  history_end_date: string | null;
  history_data_points: number;
}

export interface ScreenerFilterOptions {
  name: string;
  count: number;
}

export interface ScreenerUniverseStats {
  total_universe: number;
  total_cnmv_funds: number;
  total_cnmv_10y: number;
  avg_ter: number;
  avg_cagr_10y: number;
  avg_volatility: number;
}

export interface ScreenerResponse {
  funds: ScreenerFund[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  universe_stats: ScreenerUniverseStats;
  categories: ScreenerFilterOptions[];
  managers: ScreenerFilterOptions[];
}

export interface ScreenerParams {
  q?: string;
  category?: string;
  manager?: string;
  only_cnmv?: boolean;
  min_ret_1y?: number;
  min_ret_3y?: number;
  min_ret_5y?: number;
  min_ret_10y?: number;
  max_ter?: number;
  min_sharpe?: number;
  max_volatility?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export async function fetchFundsScreener(params: ScreenerParams = {}): Promise<ScreenerResponse> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.category) query.set("category", params.category);
  if (params.manager) query.set("manager", params.manager);
  if (params.only_cnmv) query.set("only_cnmv", "true");
  if (params.min_ret_1y !== undefined) query.set("min_ret_1y", String(params.min_ret_1y));
  if (params.min_ret_3y !== undefined) query.set("min_ret_3y", String(params.min_ret_3y));
  if (params.min_ret_5y !== undefined) query.set("min_ret_5y", String(params.min_ret_5y));
  if (params.min_ret_10y !== undefined) query.set("min_ret_10y", String(params.min_ret_10y));
  if (params.max_ter !== undefined) query.set("max_ter", String(params.max_ter));
  if (params.min_sharpe !== undefined) query.set("min_sharpe", String(params.min_sharpe));
  if (params.max_volatility !== undefined) query.set("max_volatility", String(params.max_volatility));
  if (params.sort_by) query.set("sort_by", params.sort_by);
  if (params.sort_order) query.set("sort_order", params.sort_order);
  if (params.page) query.set("page", String(params.page));
  if (params.page_size) query.set("page_size", String(params.page_size));

  const res = await fetch(`${API_BASE}/funds/screener?${query.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error consultant el catàleg de fons" }));
    throw new Error(err.detail || "Error consultant el catàleg de fons");
  }
  return res.json();
}


