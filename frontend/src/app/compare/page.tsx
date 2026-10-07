"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Chart from "@/components/Chart";
import { getPairwiseComparison, PairwiseComparisonData } from "@/lib/api";
import { FundSearchSelect } from "@/components/FundSearchSelect";
import { 
  ArrowLeft, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Layers, 
  Sparkles,
  ArrowLeftRight,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Award,
  Scale
} from "lucide-react";

const POPULAR_COMPARISON_PRESETS = [
  {
    label: "Kutxabank Bolsa vs Acción IBEX 35 ETF",
    f1: "ES0114388038",
    f2: "ES0105336038",
  },
  {
    label: "Santander Small Caps vs Bindex España",
    f1: "ES0175224031",
    f2: "ES0114573001",
  },
  {
    label: "ING Fondo Naranja S&P 500 vs Bindex España",
    f1: "ES0152769032",
    f2: "ES0114573001",
  },
  {
    label: "Bestinver Internacional vs Kutxabank Bolsa",
    f1: "ES0114638036",
    f2: "ES0114388038",
  },
];

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const f1Param = searchParams.get("f1") || searchParams.get("fund1") || "ES0114388038";
  const f2Param = searchParams.get("f2") || searchParams.get("fund2") || "ES0105336038";

  const [data, setData] = useState<PairwiseComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [comparePeriod, setComparePeriod] = useState<string>("10y");
  const [compareView, setCompareView] = useState<"base100" | "drawdown" | "spread">("base100");
  const [histLoading, setHistLoading] = useState<boolean>(false);

  useEffect(() => {
    if (f1Param && f2Param) {
      setLoading(true);
      getPairwiseComparison(f1Param, f2Param, comparePeriod)
        .then((res) => {
          setData(res);
          setError(null);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [f1Param, f2Param]);

  const handleSelectFund1 = (newIsin: string) => {
    if (newIsin === f2Param) return;
    router.push(`/compare?f1=${encodeURIComponent(newIsin)}&f2=${encodeURIComponent(f2Param)}`);
  };

  const handleSelectFund2 = (newIsin: string) => {
    if (newIsin === f1Param) return;
    router.push(`/compare?f1=${encodeURIComponent(f1Param)}&f2=${encodeURIComponent(newIsin)}`);
  };

  const handleSwapFunds = () => {
    router.push(`/compare?f1=${encodeURIComponent(f2Param)}&f2=${encodeURIComponent(f1Param)}`);
  };

  const handleSelectPreset = (p1: string, p2: string) => {
    router.push(`/compare?f1=${encodeURIComponent(p1)}&f2=${encodeURIComponent(p2)}`);
  };

  const handlePeriodChange = async (newPeriod: string) => {
    setComparePeriod(newPeriod);
    if (!f1Param || !f2Param) return;
    setHistLoading(true);
    try {
      const res = await getPairwiseComparison(f1Param, f2Param, newPeriod);
      setData(res);
    } catch (err) {
      console.warn("Error updating comparison period:", err);
    } finally {
      setHistLoading(false);
    }
  };

  // Gràfic comparatiu Base 100 / Drawdown / Spread
  const chartOptions = useMemo(() => {
    if (!data) return {};

    const hc = data.historical_comparison;
    if (hc && hc.timeline && hc.timeline.length > 0) {
      if (compareView === "drawdown") {
        return {
          backgroundColor: "transparent",
          tooltip: {
            trigger: "axis",
            backgroundColor: "#0F172A",
            borderColor: "#334155",
            textStyle: { color: "#F8FAFC", fontSize: 11 },
            valueFormatter: (value: any) => `${value}%`,
          },
          legend: {
            bottom: 0,
            textStyle: { color: "#64748B", fontSize: 11 },
          },
          grid: { top: "8%", right: "3%", bottom: "14%", left: "4%", containLabel: true },
          xAxis: {
            type: "category",
            boundaryGap: false,
            data: hc.timeline,
            axisLine: { lineStyle: { color: "#CBD5E1" } },
            axisLabel: { color: "#64748B", fontSize: 10 },
          },
          yAxis: {
            type: "value",
            max: 0,
            axisLabel: { color: "#64748B", fontSize: 10, formatter: "{value}%" },
            splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
          },
          series: [
            {
              name: `${hc.fund1.name.slice(0, 24)} (Max DD: ${hc.fund1.metrics.max_drawdown_pct}%)`,
              type: "line",
              smooth: 0.15,
              data: hc.fund1_drawdown,
              lineStyle: { width: 2, color: "#2563EB" },
              itemStyle: { color: "#2563EB" },
            },
            {
              name: `${hc.fund2.name.slice(0, 24)} (Max DD: ${hc.fund2.metrics.max_drawdown_pct}%)`,
              type: "line",
              smooth: 0.15,
              data: hc.fund2_drawdown,
              lineStyle: { width: 2, color: "#00B050" },
              itemStyle: { color: "#00B050" },
            },
          ],
        };
      }

      if (compareView === "spread") {
        return {
          backgroundColor: "transparent",
          tooltip: {
            trigger: "axis",
            backgroundColor: "#0F172A",
            borderColor: "#334155",
            textStyle: { color: "#F8FAFC", fontSize: 11 },
            valueFormatter: (value: any) => `${Number(value) > 0 ? "+" : ""}${value} pts`,
          },
          grid: { top: "8%", right: "3%", bottom: "14%", left: "4%", containLabel: true },
          xAxis: {
            type: "category",
            boundaryGap: false,
            data: hc.timeline,
            axisLine: { lineStyle: { color: "#CBD5E1" } },
            axisLabel: { color: "#64748B", fontSize: 10 },
          },
          yAxis: {
            type: "value",
            scale: true,
            axisLabel: { color: "#64748B", fontSize: 10, formatter: "{value} pts" },
            splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
          },
          series: [
            {
              name: `Diferencial Acumulat (Fons B - Fons A)`,
              type: "line",
              smooth: 0.15,
              data: hc.spread_series,
              lineStyle: { width: 2.5, color: "#8B5CF6" },
              itemStyle: { color: "#8B5CF6" },
              areaStyle: {
                color: {
                  type: "linear",
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: "rgba(139, 92, 246, 0.25)" },
                    { offset: 1, color: "rgba(139, 92, 246, 0.0)" }
                  ]
                }
              }
            },
          ],
        };
      }

      // Default: Base 100
      return {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          backgroundColor: "#0F172A",
          borderColor: "#334155",
          textStyle: { color: "#F8FAFC", fontSize: 11 },
          valueFormatter: (value: any) => `${value} pts (Base 100)`,
        },
        legend: {
          bottom: 0,
          textStyle: { color: "#64748B", fontSize: 11 },
        },
        grid: { top: "8%", right: "3%", bottom: "14%", left: "4%", containLabel: true },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: hc.timeline,
          axisLine: { lineStyle: { color: "#CBD5E1" } },
          axisLabel: { color: "#64748B", fontSize: 10 },
        },
        yAxis: {
          type: "value",
          scale: true,
          axisLabel: { color: "#64748B", fontSize: 10 },
          splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
        },
        series: [
          {
            name: `${hc.fund1.name.slice(0, 24)} (${hc.fund1.metrics.total_return_pct >= 0 ? "+" : ""}${hc.fund1.metrics.total_return_pct}%)`,
            type: "line",
            smooth: 0.2,
            data: hc.fund1_base100,
            lineStyle: { width: 3, color: "#2563EB" },
            itemStyle: { color: "#2563EB" },
          },
          {
            name: `${hc.fund2.name.slice(0, 24)} (${hc.fund2.metrics.total_return_pct >= 0 ? "+" : ""}${hc.fund2.metrics.total_return_pct}%)`,
            type: "line",
            smooth: 0.2,
            data: hc.fund2_base100,
            lineStyle: { width: 3.5, color: "#00B050" },
            itemStyle: { color: "#00B050" },
            areaStyle: {
              color: {
                type: "linear",
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(0, 176, 80, 0.20)" },
                  { offset: 1, color: "rgba(0, 176, 80, 0.0)" }
                ]
              }
            }
          },
        ],
      };
    }

    // Fallback aproximat
    if (!data?.fund1 || !data?.fund2) return {};
    const months = ["Mes -12", "Mes -10", "Mes -8", "Mes -6", "Mes -4", "Mes -2", "Avui"];
    const r1 = (data.fund1?.return_1y ?? 8.0) / 100;
    const r2 = (data.fund2?.return_1y ?? 11.5) / 100;
    const vol1 = (data.fund1?.volatility ?? 12.0) / 100;
    const vol2 = (data.fund2?.volatility ?? 12.0) / 100;

    const buildSeries = (r: number, v: number, shift: number) => [
      100,
      Number((100 * (1 + r * 0.15 + Math.sin(shift) * v * 0.1)).toFixed(2)),
      Number((100 * (1 + r * 0.35 - Math.cos(shift) * v * 0.15)).toFixed(2)),
      Number((100 * (1 + r * 0.55 + Math.sin(shift * 1.5) * v * 0.12)).toFixed(2)),
      Number((100 * (1 + r * 0.75 - Math.cos(shift * 1.2) * v * 0.08)).toFixed(2)),
      Number((100 * (1 + r * 0.90 + Math.sin(shift * 2) * v * 0.05)).toFixed(2)),
      Number((100 * (1 + r)).toFixed(2)),
    ];

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "#0F172A",
        borderColor: "#334155",
        textStyle: { color: "#F8FAFC", fontSize: 11 },
        valueFormatter: (value: any) => `${value} pts (Base 100)`,
      },
      legend: {
        bottom: 0,
        textStyle: { color: "#64748B", fontSize: 11 },
      },
      grid: { top: "8%", right: "3%", bottom: "14%", left: "4%", containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: months,
        axisLine: { lineStyle: { color: "#CBD5E1" } },
        axisLabel: { color: "#64748B", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { color: "#64748B", fontSize: 10 },
        splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
      },
      series: [
        {
          name: `${data.fund1.fund_name.slice(0, 24)}... (${(data.fund1.return_1y ?? 0) > 0 ? "+" : ""}${data.fund1.return_1y ?? 0}%)`,
          type: "line",
          smooth: 0.35,
          data: buildSeries(r1, vol1, 0.4),
          lineStyle: { width: 3, color: "#2563EB" },
          itemStyle: { color: "#2563EB" },
        },
        {
          name: `${data.fund2.fund_name.slice(0, 24)}... (${(data.fund2.return_1y ?? 0) > 0 ? "+" : ""}${data.fund2.return_1y ?? 0}%)`,
          type: "line",
          smooth: 0.35,
          data: buildSeries(r2, vol2, 0.2),
          lineStyle: { width: 3, color: "#059669" },
          itemStyle: { color: "#059669" },
        },
      ],
    };
  }, [data, compareView]);

  // Simulació d'interès compost (10.000 € base)
  const feeSimulation = useMemo(() => {
    if (!data) return null;
    const initial = 10000;
    const rGross = 0.07;
    if (!data?.fund1 || !data?.fund2) return null;
    const t1 = (data.fund1?.ter ?? 1.5) / 100;
    const t2 = (data.fund2?.ter ?? 0.2) / 100;

    const calc = (years: number) => {
      const v1 = Math.round(initial * Math.pow(1 + (rGross - t1), years));
      const v2 = Math.round(initial * Math.pow(1 + (rGross - t2), years));
      return { v1, v2, diff: v2 - v1 };
    };

    return {
      terDiff: Math.abs((data.fund1.ter ?? 0) - (data.fund2.ter ?? 0)).toFixed(2),
      y10: calc(10),
      y20: calc(20),
    };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="p-16 text-center text-xs font-mono text-slate-500 max-w-5xl mx-auto">
        Executant creuament de carteres i mètriques a DuckDB...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-12 max-w-3xl mx-auto space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Tornar
        </button>
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          {error || "No s'ha pogut establir la comparativa entre els dos fons."}
        </div>
      </div>
    );
  }

  const { fund1, fund2, total_overlap, active_share, shared_holdings } = data;

  const fmtPct = (val: number | null | undefined, showSign = false) => {
    if (val === null || val === undefined || isNaN(val)) return "N/D";
    const sign = showSign && val > 0 ? "+" : "";
    return `${sign}${Number(val).toFixed(2)}%`;
  };

  const fmtNum = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return "N/D";
    return Number(val).toFixed(2);
  };


  return (
    <div className="bg-white flex flex-col font-sans">
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-14 py-8 space-y-8">
        
        {/* TITULAR EDITORIAL I RETORN */}
        <div className="space-y-4 border-b border-slate-100 pb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Tornar a la Fitxa del Fons
          </button>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-[#00B050] border border-emerald-100 uppercase tracking-wider">
                Diagnòstic Comparatiu 1:1
              </span>
              <span className="text-xs text-slate-400 font-mono">LOOK-THROUGH AUDIT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight leading-snug">
              Cara a Cara: <span className="text-[#00B050]">Look-Through & Solapament</span>
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Radiografia microscòpica comparada de dos vehicles d'inversió: avalua acció per acció si pagues gestió activa autèntica o una simple duplicitat de cartera.
            </p>
          </div>
        </div>

        {/* BARRA DE COMPARATIVES RÀPIDES POPULARS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1.5 uppercase text-[10px] tracking-wider font-mono">
            <Sparkles className="w-3.5 h-3.5 text-[#00B050]" />
            Comparatives Clau:
          </span>
          {POPULAR_COMPARISON_PRESETS.map((p) => {
            const isActive =
              (f1Param === p.f1 && f2Param === p.f2) || (f1Param === p.f2 && f2Param === p.f1);
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => handleSelectPreset(p.f1, p.f2)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white font-semibold shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/90"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Targetes dels dos fons cara a cara amb selectors dinàmics */}
        <div className="relative">
          {/* Botó flotant central d'intercanvi en escriptori */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <button
              type="button"
              onClick={handleSwapFunds}
              title="Intercanviar Fons (Fons A ⇄ Fons B)"
              className="p-3 rounded-full bg-white border-2 border-slate-200 text-slate-600 hover:text-[#00B050] hover:border-[#00B050] shadow-md transition-all hover:scale-110 active:scale-95 cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {/* Overlay suau si s'està recarregant un canvi de fons */}
            {loading && data && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs z-30 flex items-center justify-center rounded-2xl">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-white px-4 py-2 rounded-xl shadow-md border border-slate-200">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00B050]" />
                  <span>Actualitzant comparativa...</span>
                </div>
              </div>
            )}

            {/* Fons 1 */}
            <div className="bg-white border-2 border-blue-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 relative">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <FundSearchSelect
                    label="Fons A"
                    badgeText="Fons A (Original / Bancari)"
                    currentIsin={fund1.isin}
                    currentName={fund1.fund_name}
                    currentTer={fund1.ter}
                    accentColor="blue"
                    onSelect={handleSelectFund1}
                    disabledIsin={fund2.isin}
                  />
                </div>
                <Link
                  href={`/optimize?fund=${encodeURIComponent(fund1.isin)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 mt-6"
                  title="Trobar alternatives indexades a l'Smart Switch"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Smart Switch</span>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Comissió TER:</span>
                  <span className="font-mono font-bold text-slate-900 text-base">{fmtPct(fund1.ter)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Retorn 1 Any:</span>
                  <span className={`font-mono font-bold text-base ${(fund1.return_1y ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmtPct(fund1.return_1y, true)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Volatilitat (3Y):</span>
                  <span className="font-mono font-semibold text-slate-800">{fmtPct(fund1.volatility)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Sharpe Ratio:</span>
                  <span className="font-mono font-semibold text-slate-800">{fmtNum(fund1.sharpe)}</span>
                </div>
              </div>
            </div>

            {/* Fons 2 */}
            <div className="bg-white border-2 border-emerald-300 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 relative">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <FundSearchSelect
                    label="Fons B"
                    badgeText="Fons B (Alternativa / Indexat)"
                    currentIsin={fund2.isin}
                    currentName={fund2.fund_name}
                    currentTer={fund2.ter}
                    accentColor="emerald"
                    onSelect={handleSelectFund2}
                    disabledIsin={fund1.isin}
                  />
                </div>
                <Link
                  href={`/funds/${fund2.isin}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors shrink-0 mt-6"
                  title="Veure fitxa detallada del vehicle"
                >
                  <span className="hidden sm:inline">Fitxa Fons</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Comissió TER:</span>
                  <span className="font-mono font-bold text-emerald-700 text-base">{fmtPct(fund2.ter)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Retorn 1 Any:</span>
                  <span className={`font-mono font-bold text-base ${(fund2.return_1y ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmtPct(fund2.return_1y, true)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Volatilitat (3Y):</span>
                  <span className="font-mono font-semibold text-slate-800">{fmtPct(fund2.volatility)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Sharpe Ratio:</span>
                  <span className="font-mono font-semibold text-emerald-700">{fmtNum(fund2.sharpe)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botó d'intercanvi en mòbil */}
          <div className="flex md:hidden justify-center mt-3">
            <button
              type="button"
              onClick={handleSwapFunds}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#00B050]" />
              <span>Intercanviar Fons (A ⇄ B)</span>
            </button>
          </div>
        </div>

        {/* VERDICTE EXECUTIU FIDUCIARI & DIAGNÒSTIC INTEL·LIGENT */}
        {data.historical_comparison?.verdict && (
          <div className={`rounded-2xl border-2 p-6 sm:p-7 shadow-xs space-y-5 transition-all ${
            data.historical_comparison.verdict.is_closet
              ? "bg-gradient-to-br from-amber-50/60 via-white to-rose-50/40 border-amber-300/90"
              : data.historical_comparison.verdict.type === "fee_inefficiency"
              ? "bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 border-amber-300/80"
              : data.historical_comparison.verdict.type === "true_active"
              ? "bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 border-blue-200"
              : "bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 border-emerald-200"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded uppercase tracking-wider bg-slate-900 text-white">
                    Auditoria Fiduciària 1:1
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    DIAGNÒSTIC AUTOMATITZAT INDEPENDENT
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2.5">
                  {data.historical_comparison.verdict.is_closet ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                  ) : data.historical_comparison.verdict.type === "true_active" ? (
                    <Award className="w-6 h-6 text-blue-600 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  )}
                  <span>{data.historical_comparison.verdict.title}</span>
                </h2>
              </div>
              <div className="shrink-0">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border uppercase tracking-wider ${
                  data.historical_comparison.verdict.is_closet
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : data.historical_comparison.verdict.type === "fee_inefficiency"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : data.historical_comparison.verdict.type === "true_active"
                    ? "bg-blue-100 text-blue-800 border-blue-300"
                    : "bg-emerald-100 text-emerald-800 border-emerald-300"
                }`}>
                  {data.historical_comparison.verdict.badge}
                </span>
              </div>
            </div>

            {/* Resum Executiu */}
            <p className="text-sm text-slate-700 leading-relaxed">
              {data.historical_comparison.verdict.summary}
            </p>

            {/* Tres Pilars Analítics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              {data.historical_comparison.verdict.bullets.map((bullet, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/95 border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-[#00B050] shrink-0" />
                    <span>Pilar Analític #{idx + 1}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-6">{bullet}</p>
                </div>
              ))}
            </div>

            {/* Dictamen i Recomanació Fiduciària */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1 flex-1">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                  Recomanació Estratègica per a l'Inversor
                </span>
                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                  {data.historical_comparison.verdict.recommendation}
                </p>
              </div>
              <Link
                href={`/optimize?fund=${encodeURIComponent(fund1.isin)}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00B050] hover:bg-[#009040] text-white text-xs font-bold transition shrink-0 whitespace-nowrap shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Optimitzar amb Smart Switch</span>
              </Link>
            </div>
          </div>
        )}

      {/* Targeta de Similitud i Solapament */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" /> Grau de Solapament i Similitud de Cartera
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Percentatge de cartera que replica exactament les mateixes empreses i accions
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {Number(total_overlap).toFixed(1)}% Solapament
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-mono uppercase text-slate-400">Solapament Directe</span>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{Number(total_overlap).toFixed(1)}%</p>
            <p className="text-[11px] text-slate-500 mt-1">Accions idèntiques en ambdós vehicles.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-mono uppercase text-slate-400">Active Share Relatiu</span>
            <p className="text-2xl font-bold font-mono text-blue-600 mt-1">{Number(active_share).toFixed(1)}%</p>
            <p className="text-[11px] text-slate-500 mt-1">Diferència de selecció o pesos de valors.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-mono uppercase text-slate-400">Estalvi Anual de Comissió</span>
            <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              {feeSimulation ? `-${feeSimulation.terDiff}%` : "N/D"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Diferència de TER a favor de l'alternativa.</p>
          </div>
        </div>

        {total_overlap >= 60 ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Redundància de Cartera Elevada ({Number(total_overlap).toFixed(1)}%)</span>
              <p className="mt-0.5 leading-relaxed text-[11px] opacity-90">
                Aquests dos fons inverteixen pràcticament en les mateixes companyies. Mantenir el fons car en lloc de l'alternativa indexada suposa pagar una comissió de gestió elevada sense obtenir cap diferenciació real de mercat.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-900">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Complementarietat / Descorrelació</span>
              <p className="mt-0.5 leading-relaxed text-[11px] opacity-90">
                La taxa de solapament és moderada ({Number(total_overlap).toFixed(1)}%). Ambdós vehicles aporten un grau raonable de diversificació mútua.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CTA Banner cap a Smart Switch */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-emerald-50/80 border border-slate-200 flex items-center justify-between gap-4 flex-wrap shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-blue-600 text-white">
              Smart Switch Engine
            </span>
            <span className="text-sm font-bold text-slate-900">
              Vols explorar més alternatives indexades per a {fund1.fund_name}?
            </span>
          </div>
          <p className="text-xs text-slate-600">
            El motor de rèplica passiva d'OptiFunds analitza carteres completes i troba els millors fons indexats amb mínim cost i màxim solapament.
          </p>
        </div>
        <Link
          href={`/optimize?fund=${encodeURIComponent(fund1.isin)}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-[#00B050] text-white text-xs font-semibold shadow-sm transition-all shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Obrir a l'Smart Switch</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Gràfic comparatiu Base 100 / Drawdown / Spread */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#00B050] border border-emerald-100 uppercase tracking-wider">
                {data.historical_comparison ? "Sèrie Diària Oficial CNMV" : "Aproximació Lipper"}
              </span>
              {data.historical_comparison && (
                <span className="text-xs text-slate-400 font-mono">
                  {data.historical_comparison.date_range.total_days.toLocaleString()} sessions diàries auditades
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" /> Rendibilitat Històrica Comparada Cara a Cara
            </h3>
            <p className="text-xs text-slate-500">
              Trajectòria oficial de preus liquidatius i comportament davant de crisis de mercat
            </p>
          </div>

          {/* SELECTORS D'HORITZÓ I VISTA */}
          <div className="flex flex-wrap items-center gap-2">
            {/* HORITZÓ */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              {[
                { id: "1y", label: "1A" },
                { id: "3y", label: "3A" },
                { id: "5y", label: "5A" },
                { id: "10y", label: "10A" },
                { id: "max", label: "Màx" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePeriodChange(p.id)}
                  disabled={histLoading}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    comparePeriod === p.id
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* VISTA */}
            <div className="flex rounded-xl border border-slate-200 p-0.5 text-xs">
              <button
                onClick={() => setCompareView("base100")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  compareView === "base100" ? "bg-slate-900 text-white font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Base 100
              </button>
              <button
                onClick={() => setCompareView("drawdown")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  compareView === "drawdown" ? "bg-rose-600 text-white font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Drawdown %
              </button>
              <button
                onClick={() => setCompareView("spread")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  compareView === "spread" ? "bg-purple-600 text-white font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Diferencial
              </button>
            </div>
          </div>
        </div>

        {/* GRÀFIC */}
        <div className="relative">
          {histLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs z-20 flex items-center justify-center">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white px-4 py-2 rounded-xl shadow border border-slate-100">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00B050]" />
                <span>Carregant dades històriques oficials CNMV...</span>
              </div>
            </div>
          )}
          <Chart option={chartOptions} height="360px" />
        </div>

        {/* BENTO KPIS HISTÒRICS REALS */}
        {data.historical_comparison && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-2">
            {/* CORRELACIÓ OFICIAL */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Correlació Real</span>
              <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
                {(data.historical_comparison.comparison.correlation * 100).toFixed(1)}%
              </span>
              <span className={`text-[10px] font-semibold mt-0.5 block ${
                data.historical_comparison.comparison.is_closet_clone ? "text-amber-700 font-bold" : "text-slate-500"
              }`}>
                {data.historical_comparison.comparison.is_closet_clone ? "⚠️ Clon car detectat" : "Comportament independent"}
              </span>
            </div>

            {/* RETORN FONS A */}
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="text-[10px] font-mono uppercase text-blue-700 block truncate">Retorn Fons A</span>
              <span className={`text-xl font-extrabold font-mono mt-1 block ${
                data.historical_comparison.fund1.metrics.total_return_pct >= 0 ? "text-blue-700" : "text-rose-600"
              }`}>
                {data.historical_comparison.fund1.metrics.total_return_pct >= 0 ? "+" : ""}
                {data.historical_comparison.fund1.metrics.total_return_pct}%
              </span>
              <span className="text-[10px] text-blue-600 mt-0.5 block">
                CAGR: {data.historical_comparison.fund1.metrics.cagr_pct}% / any
              </span>
            </div>

            {/* RETORN FONS B */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
              <span className="text-[10px] font-mono uppercase text-emerald-800 block truncate">Retorn Fons B</span>
              <span className={`text-xl font-extrabold font-mono mt-1 block ${
                data.historical_comparison.fund2.metrics.total_return_pct >= 0 ? "text-[#00B050]" : "text-rose-600"
              }`}>
                {data.historical_comparison.fund2.metrics.total_return_pct >= 0 ? "+" : ""}
                {data.historical_comparison.fund2.metrics.total_return_pct}%
              </span>
              <span className="text-[10px] text-emerald-700 mt-0.5 block">
                CAGR: {data.historical_comparison.fund2.metrics.cagr_pct}% / any
              </span>
            </div>

            {/* DIFERÈNCIA EN 10.000 € */}
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
              <span className="text-[10px] font-mono uppercase text-purple-700 block">Diferència (10k €)</span>
              <span className={`text-xl font-extrabold font-mono mt-1 block ${
                data.historical_comparison.comparison.difference_10k_euros >= 0 ? "text-purple-700" : "text-rose-600"
              }`}>
                {data.historical_comparison.comparison.difference_10k_euros >= 0 ? "+" : ""}
                {data.historical_comparison.comparison.difference_10k_euros.toLocaleString()} €
              </span>
              <span className="text-[10px] text-purple-600 mt-0.5 block truncate">
                {data.historical_comparison.comparison.difference_10k_euros >= 0 ? "A favor de Fons B" : "A favor de Fons A"}
              </span>
            </div>

            {/* MÀXIM DRAWDOWN COMPARAT */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Max DD (A vs B)</span>
              <span className="text-sm font-extrabold text-slate-900 font-mono mt-1 block">
                {data.historical_comparison.fund1.metrics.max_drawdown_pct}% / {data.historical_comparison.fund2.metrics.max_drawdown_pct}%
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Caiguda màxima històrica</span>
            </div>

            {/* ESTALVI COMISSIÓ ANUAL */}
            <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-emerald-100">
              <span className="text-[10px] font-mono uppercase text-emerald-800 block">Estalvi Comissió</span>
              <span className="text-xl font-extrabold text-[#00B050] font-mono mt-1 block">
                {data.historical_comparison.comparison.ter_differential_annual_10k.toLocaleString()} €
              </span>
              <span className="text-[10px] text-emerald-700 mt-0.5 block">cada any per cada 10k €</span>
            </div>
          </div>
        )}

        {/* MATRIU AVANÇADA DE RISC I EFICIÈNCIA (ALPHA, BETA, SORTINO, CALMAR) */}
        {data.historical_comparison && (
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00B050]" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Matriu Avançada de Risc i Eficiència Institucional
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Mètriques economètriques d'auditoria (CAPM Alpha, Beta, Tracking Error, Sortino & Calmar)
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Sèrie Oficial CNMV ({data.historical_comparison.period.toUpperCase()})
              </span>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
                    <th className="py-2.5 px-4 font-semibold">Mètrica Institucional</th>
                    <th className="py-2.5 px-4 text-right text-blue-700 font-semibold">Fons A ({fund1.fund_name.slice(0, 16)}...)</th>
                    <th className="py-2.5 px-4 text-right text-emerald-700 font-semibold">Fons B ({fund2.fund_name.slice(0, 16)}...)</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Diferencial / Ràtio</th>
                    <th className="py-2.5 px-4 font-semibold">Diagnòstic i Interpretació Fiduciària</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* BETA */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      Beta (&beta;) vs Fons B
                      <span className="block text-[10px] font-normal text-slate-400 font-sans">Sensibilitat sistemàtica de mercat</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {data.historical_comparison.comparison.beta != null ? fmtNum(data.historical_comparison.comparison.beta) : "N/D"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-500">
                      1.00 <span className="text-[10px] font-normal text-slate-400">(Ref)</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">
                      {data.historical_comparison.comparison.beta != null ? `${fmtNum(data.historical_comparison.comparison.beta)}x` : "N/D"}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-[11px] leading-relaxed">
                      {data.historical_comparison.comparison.beta != null ? (
                        data.historical_comparison.comparison.beta >= 0.85 && data.historical_comparison.comparison.beta <= 1.15 ? (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                            &beta; &approx; 1.0: Exposició al risc sistemàtic idèntica al benchmark (clon de mercat).
                          </span>
                        ) : data.historical_comparison.comparison.beta < 0.85 ? (
                          <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded font-medium border border-blue-200">
                            &beta; defensiva: Menor sensibilitat a les oscil·lacions del mercat.
                          </span>
                        ) : (
                          <span className="text-purple-800 bg-purple-50 px-2 py-0.5 rounded font-medium border border-purple-200">
                            &beta; amplificada: Major risc i volatilitat que el benchmark de referència.
                          </span>
                        )
                      ) : "N/D"}
                    </td>
                  </tr>

                  {/* ALPHA */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      Alfa Anualitzada (&alpha; Jensen)
                      <span className="block text-[10px] font-normal text-slate-400 font-sans">Retorn excedent ajustat per risc</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {data.historical_comparison.comparison.alpha_annual_pct != null ? fmtPct(data.historical_comparison.comparison.alpha_annual_pct, true) : "N/D"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-500">
                      0.00% <span className="text-[10px] font-normal text-slate-400">(Base)</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={
                        (data.historical_comparison.comparison.alpha_annual_pct ?? 0) >= 0 ? "text-[#00B050]" : "text-rose-600"
                      }>
                        {data.historical_comparison.comparison.alpha_annual_pct != null ? fmtPct(data.historical_comparison.comparison.alpha_annual_pct, true) : "N/D"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-[11px] leading-relaxed">
                      {data.historical_comparison.comparison.alpha_annual_pct != null ? (
                        data.historical_comparison.comparison.alpha_annual_pct > 0.5 ? (
                          <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                            &alpha; Positiu: El gestor aporta valor afegit net superior al risc assumit.
                          </span>
                        ) : data.historical_comparison.comparison.alpha_annual_pct >= -0.5 ? (
                          <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-medium">
                            &alpha; Neutre: El retorn s'explica pel mercat; no hi ha creació de valor diferencial.
                          </span>
                        ) : (
                          <span className="text-rose-800 bg-rose-50 px-2 py-0.5 rounded font-medium border border-rose-200">
                            &alpha; Negatiu: Destrucció neta de valor després de deduir comissions de gestió.
                          </span>
                        )
                      ) : "N/D"}
                    </td>
                  </tr>

                  {/* TRACKING ERROR */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      Tracking Error (TE)
                      <span className="block text-[10px] font-normal text-slate-400 font-sans">Volatilitat del diferencial de retorns</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {data.historical_comparison.comparison.tracking_error_pct != null ? `${fmtNum(data.historical_comparison.comparison.tracking_error_pct)}%` : "N/D"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-500">
                      0.00% <span className="text-[10px] font-normal text-slate-400">(Base)</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">
                      {data.historical_comparison.comparison.tracking_error_pct != null ? `${fmtNum(data.historical_comparison.comparison.tracking_error_pct)}%` : "N/D"}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-[11px] leading-relaxed">
                      {data.historical_comparison.comparison.tracking_error_pct != null ? (
                        data.historical_comparison.comparison.tracking_error_pct < 3.0 ? (
                          <span className="text-rose-800 bg-rose-50 px-2 py-0.5 rounded font-medium border border-rose-200">
                            TE &lt; 3.0%: Rèplica quasi idèntica. Fort indici de Closet Indexing si cobra TER actiu.
                          </span>
                        ) : data.historical_comparison.comparison.tracking_error_pct <= 6.0 ? (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                            TE 3-6%: Gestió semicoactiva amb desviacions moderades respecte a l'índex.
                          </span>
                        ) : (
                          <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded font-medium border border-blue-200">
                            TE &gt; 6%: Gestió activa autèntica d'alta convicció amb posicions diferenciades.
                          </span>
                        )
                      ) : "N/D"}
                    </td>
                  </tr>

                  {/* INFORMATION RATIO */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      Information Ratio (IR)
                      <span className="block text-[10px] font-normal text-slate-400 font-sans">Retorn actiu / Tracking Error</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {data.historical_comparison.comparison.information_ratio != null ? fmtNum(data.historical_comparison.comparison.information_ratio) : "N/D"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-400">-</td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={
                        (data.historical_comparison.comparison.information_ratio ?? 0) >= 0 ? "text-[#00B050]" : "text-rose-600"
                      }>
                        {data.historical_comparison.comparison.information_ratio != null ? fmtNum(data.historical_comparison.comparison.information_ratio) : "N/D"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-[11px] leading-relaxed">
                      {data.historical_comparison.comparison.information_ratio != null ? (
                        data.historical_comparison.comparison.information_ratio > 0.5 ? (
                          <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                            IR &gt; 0.5: Excel·lent consistència del gestor en generar retorn per unitat de risc actiu.
                          </span>
                        ) : data.historical_comparison.comparison.information_ratio >= 0 ? (
                          <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-medium">
                            IR 0-0.5: Eficiència moderada o marginal del risc diferencial assumit.
                          </span>
                        ) : (
                          <span className="text-rose-800 bg-rose-50 px-2 py-0.5 rounded font-medium border border-rose-200">
                            IR &lt; 0: Risc actiu destructor. Desviar-se de l'índex ha perjudicat l'inversor.
                          </span>
                        )
                      ) : "N/D"}
                    </td>
                  </tr>

                  {/* SORTINO RATIO */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      Ràtio de Sortino
                      <span className="block text-[10px] font-normal text-slate-400 font-sans">Eficiència penalitzant només pèrdues (downside risk)</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-700">
                      {fmtNum(data.historical_comparison.fund1.metrics.sortino_ratio)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {fmtNum(data.historical_comparison.fund2.metrics.sortino_ratio)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      {data.historical_comparison.fund1.metrics.sortino_ratio != null && data.historical_comparison.fund2.metrics.sortino_ratio != null ? (
                        <span className={
                          (data.historical_comparison.fund2.metrics.sortino_ratio - data.historical_comparison.fund1.metrics.sortino_ratio) >= 0
                            ? "text-[#00B050]"
                            : "text-blue-700"
                        }>
                          {(data.historical_comparison.fund2.metrics.sortino_ratio - data.historical_comparison.fund1.metrics.sortino_ratio) >= 0 ? "+" : ""}
                          {fmtNum(data.historical_comparison.fund2.metrics.sortino_ratio - data.historical_comparison.fund1.metrics.sortino_ratio)} (B vs A)
                        </span>
                      ) : "N/D"}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-[11px] leading-relaxed">
                      Mesura el retorn net penalitzant exclusivament la volatilitat negativa. Ignora la pujada benigna del mercat.
                    </td>
                  </tr>

                  {/* CALMAR RATIO */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      Ràtio de Calmar (CAGR / |MaxDD|)
                      <span className="block text-[10px] font-normal text-slate-400 font-sans">Capacitat de recuperació davant caigudes màximes</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-700">
                      {fmtNum(data.historical_comparison.fund1.metrics.calmar_ratio)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {fmtNum(data.historical_comparison.fund2.metrics.calmar_ratio)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      {data.historical_comparison.fund1.metrics.calmar_ratio != null && data.historical_comparison.fund2.metrics.calmar_ratio != null ? (
                        <span className={
                          (data.historical_comparison.fund2.metrics.calmar_ratio - data.historical_comparison.fund1.metrics.calmar_ratio) >= 0
                            ? "text-[#00B050]"
                            : "text-blue-700"
                        }>
                          {(data.historical_comparison.fund2.metrics.calmar_ratio - data.historical_comparison.fund1.metrics.calmar_ratio) >= 0 ? "+" : ""}
                          {fmtNum(data.historical_comparison.fund2.metrics.calmar_ratio - data.historical_comparison.fund1.metrics.calmar_ratio)} (B vs A)
                        </span>
                      ) : "N/D"}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-[11px] leading-relaxed">
                      Indica quants punts de retorn anual genera el vehicle per cada punt de caiguda màxima històrica patida.
                    </td>
                  </tr>

                  {/* SHARPE RATIO */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      Ràtio de Sharpe
                      <span className="block text-[10px] font-normal text-slate-400 font-sans">Retorn ajustat per volatilitat total anualitzada</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-700">
                      {fmtNum(data.historical_comparison.fund1.metrics.sharpe_ratio)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {fmtNum(data.historical_comparison.fund2.metrics.sharpe_ratio)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={
                        (data.historical_comparison.fund2.metrics.sharpe_ratio - data.historical_comparison.fund1.metrics.sharpe_ratio) >= 0
                          ? "text-[#00B050]"
                          : "text-blue-700"
                      }>
                        {(data.historical_comparison.fund2.metrics.sharpe_ratio - data.historical_comparison.fund1.metrics.sharpe_ratio) >= 0 ? "+" : ""}
                        {fmtNum(data.historical_comparison.fund2.metrics.sharpe_ratio - data.historical_comparison.fund1.metrics.sharpe_ratio)} (B vs A)
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-[11px] leading-relaxed">
                      Retorn excedent anualitzat per unitat de desviació estàndard total (taxa lliure de risc = 2.5%).
                    </td>
                  </tr>

                  {/* VOLATILITAT */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      Volatilitat Anualitzada (&sigma;)
                      <span className="block text-[10px] font-normal text-slate-400 font-sans">Desviació estàndard anualitzada dels retorns</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-700">
                      {fmtPct(data.historical_comparison.fund1.metrics.volatility_pct)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {fmtPct(data.historical_comparison.fund2.metrics.volatility_pct)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">
                      {fmtPct((data.historical_comparison.fund2.metrics.volatility_pct ?? 0) - (data.historical_comparison.fund1.metrics.volatility_pct ?? 0), true)}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-[11px] leading-relaxed">
                      Nivell de variabilitat i sacsejada de la cartera. Menor volatilitat ofereix un trajecte més còmode per a l'inversor.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAULA ANY PER ANY DEL CARA A CARA */}
        {data.historical_comparison && data.historical_comparison.yearly_performance.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Balanç Any per Any: Quin Fons Ha Guanyat Cada Any?
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Sèries oficials tancament 31 de desembre (CNMV)
              </span>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400">
                    <th className="py-2 px-3">Any</th>
                    <th className="py-2 px-3 text-right text-blue-600">Fons A ({fund1.fund_name.slice(0, 16)}...)</th>
                    <th className="py-2 px-3 text-right text-emerald-700">Fons B ({fund2.fund_name.slice(0, 16)}...)</th>
                    <th className="py-2 px-3 text-right">Diferencial (B - A)</th>
                    <th className="py-2 px-3 text-right">Guanyador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.historical_comparison.yearly_performance.map((yr) => {
                    const bWins = yr.spread_return_pct > 0;
                    return (
                      <tr key={yr.year} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{yr.year}</td>
                        <td className={`py-2.5 px-3 text-right font-semibold ${
                          yr.fund1_return_pct >= 0 ? "text-slate-800" : "text-rose-600"
                        }`}>
                          {yr.fund1_return_pct >= 0 ? "+" : ""}{yr.fund1_return_pct}%
                        </td>
                        <td className={`py-2.5 px-3 text-right font-semibold ${
                          yr.fund2_return_pct >= 0 ? "text-slate-800" : "text-rose-600"
                        }`}>
                          {yr.fund2_return_pct >= 0 ? "+" : ""}{yr.fund2_return_pct}%
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold ${
                          yr.spread_return_pct >= 0 ? "text-[#00B050]" : "text-rose-600"
                        }`}>
                          {yr.spread_return_pct >= 0 ? "+" : ""}{yr.spread_return_pct}%
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            bWins ? "bg-emerald-50 text-[#00B050]" : "bg-blue-50 text-blue-700"
                          }`}>
                            {bWins ? "Fons B" : "Fons A"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Simulador de Pèrdua per Comissions (TER Drag) */}
      {feeSimulation && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-500" /> Impacte Econòmic Acumulat de la Comissió (Capital Base: 10.000 €)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Erosió monetària real causada per la diferència de costos ({feeSimulation.terDiff}% anual) assumint un 7% de mercat
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-mono font-bold text-slate-700">Horitzó 10 Anys</span>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Amb Fons Tradicional ({fmtPct(fund1.ter)} TER):</span>
                <span className="font-mono font-semibold">{feeSimulation.y10.v1.toLocaleString()} €</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-700">
                <span>Amb Alternativa ({fmtPct(fund2.ter)} TER):</span>
                <span className="font-mono font-semibold">{feeSimulation.y10.v2.toLocaleString()} €</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                <span className="text-xs font-bold text-rose-700">Diners perduts en comissions:</span>
                <span className="text-base font-bold font-mono text-rose-600">-{feeSimulation.y10.diff.toLocaleString()} €</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-mono font-bold text-slate-700">Horitzó 20 Anys</span>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Amb Fons Tradicional ({fmtPct(fund1.ter)} TER):</span>
                <span className="font-mono font-semibold">{feeSimulation.y20.v1.toLocaleString()} €</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-700">
                <span>Amb Alternativa ({fmtPct(fund2.ter)} TER):</span>
                <span className="font-mono font-semibold">{feeSimulation.y20.v2.toLocaleString()} €</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                <span className="text-xs font-bold text-rose-700">Diners perduts en comissions:</span>
                <span className="text-base font-bold font-mono text-rose-600">-{feeSimulation.y20.diff.toLocaleString()} €</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Taula de Holdings Compartits */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Valors Coincidents en Cartera (Look-Through)
            </h3>
            <p className="text-[11px] text-slate-400">
              Títols subjacents que ambdós gestors tenen comprats simultàniament
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{shared_holdings.length} títols</span>
        </div>

        {shared_holdings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Títol Subjacent</th>
                  <th className="py-2.5 px-4 font-mono">RIC</th>
                  <th className="py-2.5 px-4 text-right">Pes a Fons A</th>
                  <th className="py-2.5 px-4 text-right">Pes a Fons B</th>
                  <th className="py-2.5 px-4 text-right">Solapament Efectiu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shared_holdings.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-900">{h.holding_name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">{h.holding_ric}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">{h.weight_fund1}%</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">{h.weight_fund2}%</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">{h.overlap_weight}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            No s'han trobat posicions coincidents entre aquests dos fons a la base de dades.
          </div>
        )}
      </div>

      </main>
    </div>
  );
}

export default function CompareFundsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-xs font-mono text-slate-500 max-w-5xl mx-auto">
          Carregant comparativa de vehicles...
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
