"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { 
  ArrowLeft, 
  ArrowRight, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles,
  Download,
  Layers,
  Calendar,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { 
  getFundDeepDive, 
  searchFunds, 
  getFundAuditPdfUrl, 
  fetchFundHistory,
  FundDeepDive, 
  FundSummary,
  FundHistoryResponse
} from "@/lib/api";

const Chart = dynamic(() => import("@/components/Chart"), { ssr: false });

export default function FundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isin = (params?.isin as string)?.toUpperCase();

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [capital, setCapital] = useState<number>(25000);

  const [compareQuery, setCompareQuery] = useState("");
  const [compareResults, setCompareResults] = useState<FundSummary[]>([]);

  // Sèrie Històrica Oficial CNMV
  const [historyData, setHistoryData] = useState<FundHistoryResponse | null>(null);
  const [historyPeriod, setHistoryPeriod] = useState<string>("10y");
  const [historyView, setHistoryView] = useState<"base100" | "nav" | "drawdown">("base100");
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isin) return;
    setLoading(true);
    setError(null);

    getFundDeepDive(isin)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error(err);
        setError(err?.message || "No s'ha pogut carregar l'auditoria d'aquest fons.");
      })
      .finally(() => setLoading(false));
  }, [isin]);

  useEffect(() => {
    if (!isin) return;
    setHistoryLoading(true);
    fetchFundHistory(isin, historyPeriod)
      .then((res) => {
        setHistoryData(res);
      })
      .catch((err) => {
        console.warn("Històric no disponible:", err);
        setHistoryData(null);
      })
      .finally(() => setHistoryLoading(false));
  }, [isin, historyPeriod]);

  useEffect(() => {
    if (compareQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        searchFunds(compareQuery)
          .then((res) => setCompareResults(res.filter(f => f.isin !== isin).slice(0, 5)))
          .catch(() => setCompareResults([]));
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setCompareResults([]);
    }
  }, [compareQuery, isin]);

  // Càlcul de simulació blindat davant d'alternatives buides o valors nulls
  const simulation = useMemo(() => {
    if (!data?.profile) return null;
    const terActual = typeof data.profile.ter === "number" ? data.profile.ter : 1.0;
    const alts = Array.isArray(data.alternatives) ? data.alternatives : [];
    const bestAlt = alts.length > 0 ? alts[0] : null;
    
    // Si no té alternativa indexada directa (p.ex. monetari), usem un índex monetari de baix cost (0.10%)
    const terAlt = bestAlt?.cand_ter ?? (terActual > 0.20 ? 0.15 : terActual);
    const deltaTer = Math.max(0, terActual - terAlt);

    const costActualAnual = Math.round(capital * (terActual / 100));
    const estalviAnual = Math.round(capital * (deltaTer / 100));

    const rBrut = 0.05;
    const capAmbIndexat = capital * Math.pow(1 + (rBrut - terAlt / 100), 20);
    const capAmbBancari = capital * Math.pow(1 + (rBrut - terActual / 100), 20);
    const dinersPerduts20y = Math.round(capAmbIndexat - capAmbBancari);

    return {
      terActual,
      terAlt,
      deltaTer,
      costActualAnual,
      estalviAnual,
      dinersPerduts20y,
      bestAlt,
      hasAlternatives: alts.length > 0
    };
  }, [data, capital]);

  const historyChartOptions = useMemo(() => {
    if (!historyData || !historyData.timeline || historyData.timeline.length === 0) return {};

    if (historyView === "drawdown") {
      return {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          backgroundColor: "#0F172A",
          borderColor: "#334155",
          textStyle: { color: "#F8FAFC", fontSize: 11 },
          valueFormatter: (value: any) => `${value}%`,
        },
        grid: { top: "8%", right: "3%", bottom: "12%", left: "4%", containLabel: true },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: historyData.timeline,
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
            name: "Drawdown (%)",
            type: "line",
            smooth: 0.15,
            data: historyData.drawdown_series,
            lineStyle: { width: 2, color: "#EF4444" },
            itemStyle: { color: "#EF4444" },
            areaStyle: {
              color: {
                type: "linear",
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(239, 68, 68, 0.05)" },
                  { offset: 1, color: "rgba(239, 68, 68, 0.35)" }
                ]
              }
            }
          }
        ]
      };
    }

    if (historyView === "nav") {
      return {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          backgroundColor: "#0F172A",
          borderColor: "#334155",
          textStyle: { color: "#F8FAFC", fontSize: 11 },
          valueFormatter: (value: any) => `${value} €`,
        },
        grid: { top: "8%", right: "3%", bottom: "12%", left: "4%", containLabel: true },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: historyData.timeline,
          axisLine: { lineStyle: { color: "#CBD5E1" } },
          axisLabel: { color: "#64748B", fontSize: 10 },
        },
        yAxis: {
          type: "value",
          scale: true,
          axisLabel: { color: "#64748B", fontSize: 10, formatter: "{value} €" },
          splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
        },
        series: [
          {
            name: "Valor Liquidatiu (NAV)",
            type: "line",
            smooth: 0.2,
            data: historyData.nav_series,
            lineStyle: { width: 3, color: "#00B050" },
            itemStyle: { color: "#00B050" },
            areaStyle: {
              color: {
                type: "linear",
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(0, 176, 80, 0.25)" },
                  { offset: 1, color: "rgba(0, 176, 80, 0.0)" }
                ]
              }
            }
          }
        ]
      };
    }

    // Default: Base 100 vs Benchmark
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
        data: historyData.timeline,
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
          name: `${(historyData.fund.name || "Fons").slice(0, 24)} (${historyData.metrics.total_return_pct >= 0 ? "+" : ""}${historyData.metrics.total_return_pct}%)`,
          type: "line",
          smooth: 0.2,
          data: historyData.base100_series,
          lineStyle: { width: 3.5, color: "#00B050" },
          itemStyle: { color: "#00B050" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(0, 176, 80, 0.22)" },
                { offset: 1, color: "rgba(0, 176, 80, 0.0)" }
              ]
            }
          },
          z: 10
        },
        ...(historyData.benchmark_base100_series && historyData.benchmark_base100_series.length > 0 ? [{
          name: `${(historyData.benchmark?.name || "Benchmark").slice(0, 24)} (${historyData.benchmark?.total_return_pct >= 0 ? "+" : ""}${historyData.benchmark?.total_return_pct ?? 0}%)`,
          type: "line",
          smooth: 0.2,
          data: historyData.benchmark_base100_series,
          lineStyle: { width: 2, color: "#64748B", type: "dashed" },
          itemStyle: { color: "#64748B" },
          z: 5
        }] : [])
      ]
    };
  }, [historyData, historyView]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <header className="w-full border-b border-slate-100 py-3.5 px-6 sm:px-10 lg:px-14 flex items-center bg-white">
          <div className="relative h-9 w-44">
            <Image src="/logo-optifunds.jpg" alt="OptiFunds" fill className="object-contain object-left" priority unoptimized />
          </div>
        </header>
        <div className="max-w-[1400px] w-full mx-auto px-6 py-16 space-y-8 animate-pulse">
          <div className="h-8 w-64 bg-slate-100 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-50 rounded-2xl border border-slate-100" />)}
          </div>
          <div className="h-72 bg-slate-50 rounded-3xl border border-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !data || !data.profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <header className="w-full border-b border-slate-100 py-3.5 px-6 sm:px-10 lg:px-14 flex items-center bg-white">
          <Link href="/">
            <div className="relative h-9 w-44 cursor-pointer">
              <Image src="/logo-optifunds.jpg" alt="OptiFunds" fill className="object-contain object-left" priority unoptimized />
            </div>
          </Link>
        </header>
        <div className="max-w-2xl mx-auto px-6 py-20 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Vehicle no localitzat</h2>
          <p className="text-sm text-slate-500">
            {error || `No s'han trobat dades oficials per a l'identificador ${isin}.`}
          </p>
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#00B050] hover:underline pt-2">
            <ArrowLeft className="w-4 h-4" /> Tornar a l'inici
          </Link>
        </div>
      </div>
    );
  }

  const { profile, closet_audit, holdings, performance, alternatives } = data;
  const isCloset = closet_audit?.is_closet ?? false;
  const isHighFee = (profile?.ter ?? 0) >= 1.2;

  const normalizedHoldings = (holdings || []).map((h: any) => ({
    name: h.holding_name || h.name || "Títol en cartera",
    ticker: h.holding_ric || h.ric || h.ticker || "—",
    weight: typeof h.weight_pct === "number" ? h.weight_pct : (typeof h.weight === "number" ? h.weight : null)
  }));

  const alternativesList = Array.isArray(alternatives) ? alternatives : [];

  return (
    <div className="bg-[#F8FAFC] min-h-screen flex flex-col font-sans pb-16">
      {/* COS PRINCIPAL DE LA FITXA */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ENCAPÇALAMENT: NOM DEL FONS EN NEGRETA A DALT I DADES A BAIX */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200/80">
          <div className="space-y-3 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight leading-snug">
              {profile.name || profile.fund_name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-900 text-white shadow-2xs">
                ISIN: {profile.isin}
              </span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
                {profile.category || "Fons d'Inversió"}
              </span>
              {profile.ric && (
                <span className="text-xs font-mono text-slate-500 px-2 py-1 rounded bg-slate-50 border border-slate-200/60">
                  RIC: {profile.ric}
                </span>
              )}
              {profile.currency && (
                <span className="text-xs font-mono text-slate-500 px-2 py-1 rounded bg-slate-50 border border-slate-200/60">
                  {profile.currency}
                </span>
              )}
              <span className="text-xs text-slate-400 font-mono pl-1">
                • Dades Oficials Lipper
              </span>
            </div>
          </div>

          {/* VERDICT BADGE */}
          <div className="shrink-0">
            {isCloset ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 max-w-md">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold block">Alerta de Closet Indexing</span>
                  <span className="text-amber-800/90 leading-tight block mt-0.5">
                    Clona el benchmark cobrant comissions de gestió activa autèntica.
                  </span>
                </div>
              </div>
            ) : isHighFee ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 max-w-md">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold block">Cost Excessiu Detectat</span>
                  <span className="text-rose-800/90 leading-tight block mt-0.5">
                    Comissions per sobre del nivell òptim de la categoria.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#D1F7E2]/60 border border-[#00B050]/30 text-[#075426] max-w-md">
                <ShieldCheck className="w-5 h-5 text-[#00B050] shrink-0" />
                <div className="text-xs">
                  <span className="font-bold block">Estructura Competitiva</span>
                  <span className="text-[#075426]/90 leading-tight block mt-0.5">
                    Vehicle amb ràtio de costos contingut.
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 mt-3">
              <Link
                href={`/optimize?fund=${profile.isin}`}
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#00B050] hover:bg-[#009945] text-white text-xs font-semibold shadow-2xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-100" />
                <span>Optimitzar amb Smart Switch</span>
              </Link>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/portfolio?add=${encodeURIComponent(profile.isin)}&name=${encodeURIComponent(profile.name || profile.fund_name)}`}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                  title="Afegir aquest fons a la teva cartera del Portfolio Builder"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-600" />
                  <span>+ A Cartera</span>
                </Link>

                <a
                  href={getFundAuditPdfUrl(profile.isin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#00B050]" />
                  <span>Dictamen PDF</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 3. KPIS BENTO */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Comissió Anual (TER)
            </span>
            <span className="text-3xl font-extrabold text-slate-950 font-mono mt-1.5 block">
              {profile.ter !== null && profile.ter !== undefined ? `${profile.ter}%` : "N/D"}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">Cost recurrent anual</span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active Share
            </span>
            <span className="text-3xl font-extrabold text-slate-950 font-mono mt-1.5 block">
              {closet_audit?.active_share !== undefined && closet_audit?.active_share !== null ? `${closet_audit.active_share}%` : "N/D"}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              vs {closet_audit?.benchmark_name || "Benchmark"}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Rendibilitat 1Y
            </span>
            <span className="text-3xl font-extrabold text-slate-950 font-mono mt-1.5 block">
              {performance?.ret_1y !== undefined && performance.ret_1y !== null 
                ? `${performance.ret_1y >= 0 ? "+" : ""}${Number(performance.ret_1y).toFixed(2)}%`
                : "N/D"}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Volatilitat: {performance?.volatility !== null && performance?.volatility !== undefined ? `${performance.volatility}%` : "N/D"}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[#ECFDF5] border border-emerald-100/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Estalvi Potencial
            </span>
            <span className="text-3xl font-extrabold text-[#00B050] font-mono mt-1.5 block">
              {simulation ? `-${simulation.deltaTer.toFixed(2)}%` : "0%"}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
              amb alternativa indexada
            </span>
          </div>
        </div>

        {/* 4. SECCIÓ CENTRAL: SIMULADOR EN EUROS + SMART SWITCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* SIMULADOR EN EUROS REALS */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Impacte de les Comissions en Diners Reals
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calcula exactament quant s&apos;emporta la gestora del teu capital
                </p>
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                {[10000, 25000, 50000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setCapital(val)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      capital === val
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {val.toLocaleString()} €
                  </button>
                ))}
              </div>
            </div>

            {simulation && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-500 block">Pagues actualment</span>
                  <span className="text-2xl font-bold text-slate-950 font-mono mt-1 block">
                    {simulation.costActualAnual.toLocaleString()} €
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">cada any en costos</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-emerald-100">
                  <span className="text-xs font-medium text-emerald-800 block">T&apos;estalviaries</span>
                  <span className="text-2xl font-bold text-[#00B050] font-mono mt-1 block">
                    +{simulation.estalviAnual.toLocaleString()} €
                  </span>
                  <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">a l&apos;any amb indexat</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                  <span className="text-xs font-medium text-rose-700 block">Pèrdua a 20 anys</span>
                  <span className="text-2xl font-bold text-rose-600 font-mono mt-1 block">
                    -{simulation.dinersPerduts20y.toLocaleString()} €
                  </span>
                  <span className="text-[11px] text-rose-500 mt-0.5 block">erosió per interès compost</span>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50/80 p-4 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-700">Règim de Traspàs Fiscal (Llei 35/2006):</span> El canvi cap a un fons indexat equivalent es pot realitzar mitjançant traspàs intern sense peatge fiscal ni tributació per guanys patrimonials a Espanya.
            </p>
          </div>

          {/* SMART SWITCH */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#00B050] text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Smart Switch Recomanat
                </h3>
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-[#00B050] uppercase tracking-wider">
                Baix cost
              </span>
            </div>

            {alternativesList.length > 0 ? (
              <div className="space-y-3">
                {alternativesList.slice(0, 3).map((alt: any) => (
                  <div
                    key={alt.cand_isin}
                    className="p-4 rounded-2xl border border-slate-200/80 hover:border-[#00B050] bg-white transition-all space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-xs sm:text-sm group-hover:text-[#00B050] transition-colors leading-snug">
                          {alt.cand_name}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                          {alt.cand_isin}
                        </span>
                      </div>
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-[#00B050] shrink-0">
                        TER {alt.cand_ter}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-medium">
                        Solapament: <strong className="text-slate-800">{alt.overlap}%</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/compare?f1=${profile.isin}&f2=${alt.cand_isin}`}
                          className="text-slate-500 hover:text-slate-900 font-medium inline-flex items-center gap-0.5 hover:underline text-[11px]"
                          title="Comparar cara a cara"
                        >
                          <span>Comparar 1:1</span>
                        </Link>
                        <span className="text-slate-300">•</span>
                        <Link
                          href={`/funds/${alt.cand_isin}`}
                          className="text-[#00B050] font-semibold inline-flex items-center gap-1 hover:underline text-xs"
                        >
                          <span>Auditar</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Link
                  href={`/optimize?fund=${encodeURIComponent(profile.isin)}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#00B050] hover:text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors mt-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Veure totes les alternatives a l'Smart Switch →</span>
                </Link>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-600 space-y-1">
                <span className="font-semibold block text-slate-800">Sense alternatives automàtiques</span>
                <span>Aquest vehicle de renda fixa o liquiditat no té un índex directe d'accions homologat al catàleg.</span>
              </div>
            )}

            {/* COMPARADOR DIRECTE */}
            <div className="pt-2">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Tens un altre fons? Compara&apos;l directament:
                </label>
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Introdueix nom o ISIN..."
                    value={compareQuery}
                    onChange={(e) => setCompareQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:bg-white focus:outline-none focus:border-[#00B050]"
                  />
                </div>

                {compareResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 divide-y divide-slate-100 overflow-hidden">
                    {compareResults.map((cand) => (
                      <button
                        key={cand.isin}
                        onClick={() => router.push(`/portfolio?add=${cand.isin}&base=${isin}`)}
                        className="w-full text-left p-3 hover:bg-slate-50 text-xs flex items-center justify-between transition-colors"
                      >
                        <span className="font-semibold text-slate-900 truncate pr-2">
                          {cand.fund_name}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                          Compara ara →
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* SECCIÓ 4.5: EVOLUCIÓ HISTÒRICA OFICIAL CNMV (2015 – 2024) */}
        {historyData && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#00B050] border border-emerald-100 uppercase tracking-wider">
                    Sèrie Diària Oficial CNMV
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {historyData.date_range.total_days.toLocaleString()} sessions diàries registrades
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
                  Trajectòria Històrica Real & Benchmark
                </h3>
                <p className="text-xs text-slate-500">
                  Preus liquidatius diaris oficials auditats ({historyData.date_range.start} al {historyData.date_range.end})
                </p>
              </div>

              {/* SELECTORS */}
              <div className="flex flex-wrap items-center gap-2">
                {/* SELECTOR HORITZÓ */}
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
                      onClick={() => setHistoryPeriod(p.id)}
                      disabled={historyLoading}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        historyPeriod === p.id
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* SELECTOR VISTA */}
                <div className="flex rounded-xl border border-slate-200 p-0.5 text-xs">
                  <button
                    onClick={() => setHistoryView("base100")}
                    className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                      historyView === "base100" ? "bg-slate-900 text-white font-bold" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Base 100
                  </button>
                  <button
                    onClick={() => setHistoryView("nav")}
                    className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                      historyView === "nav" ? "bg-slate-900 text-white font-bold" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    NAV (€)
                  </button>
                  <button
                    onClick={() => setHistoryView("drawdown")}
                    className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                      historyView === "drawdown" ? "bg-rose-600 text-white font-bold" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Drawdown %
                  </button>
                </div>
              </div>
            </div>

            {/* GRÀFIC */}
            <div className="relative">
              {historyLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs z-20 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white px-4 py-2 rounded-xl shadow border border-slate-100">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00B050]" />
                    <span>Carregant dades històriques CNMV...</span>
                  </div>
                </div>
              )}
              <Chart option={historyChartOptions} height="350px" />
            </div>

            {/* BENTO KPIS HISTÒRICS REALS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Retorn Acumulat</span>
                <span className={`text-xl font-extrabold font-mono mt-1 block ${
                  historyData.metrics.total_return_pct >= 0 ? "text-[#00B050]" : "text-rose-600"
                }`}>
                  {historyData.metrics.total_return_pct >= 0 ? "+" : ""}{historyData.metrics.total_return_pct}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                  {historyPeriod.toUpperCase()} oficial
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">CAGR Anual</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
                  {historyData.metrics.cagr_pct >= 0 ? "+" : ""}{historyData.metrics.cagr_pct}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Creixement compost</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Volatilitat Anual</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
                  {historyData.metrics.volatility_pct}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Desviació típica 252d</span>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100">
                <span className="text-[10px] font-mono uppercase text-rose-700 block">Màxim Drawdown</span>
                <span className="text-xl font-extrabold text-rose-600 font-mono mt-1 block">
                  {historyData.metrics.max_drawdown_pct}%
                </span>
                <span className="text-[10px] text-rose-500 font-mono mt-0.5 block">
                  Mínim: {historyData.metrics.max_drawdown_date}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Sharpe Ratio</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
                  {historyData.metrics.sharpe_ratio}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Calmar: {historyData.metrics.calmar_ratio}</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[10px] font-mono uppercase text-emerald-800 block">Alfa vs Benchmark</span>
                <span className={`text-xl font-extrabold font-mono mt-1 block ${
                  (historyData.benchmark?.alpha_annual_pct ?? 0) >= 0 ? "text-[#00B050]" : "text-rose-600"
                }`}>
                  {(historyData.benchmark?.alpha_annual_pct ?? 0) >= 0 ? "+" : ""}
                  {historyData.benchmark?.alpha_annual_pct ?? 0}%
                </span>
                <span className="text-[10px] text-emerald-700 mt-0.5 block">
                  Beta: {historyData.benchmark?.beta ?? 1.0}
                </span>
              </div>
            </div>

            {/* TAULA ANUAL ANY PER ANY */}
            {historyData.yearly_performance && historyData.yearly_performance.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Històric per Anys Naturals (CNMV)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Tancaments anuals 31 de desembre
                  </span>
                </div>

                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400">
                        <th className="py-2 px-3">Any</th>
                        <th className="py-2 px-3 text-right">Rendibilitat Fons</th>
                        <th className="py-2 px-3 text-right">Rendibilitat Benchmark</th>
                        <th className="py-2 px-3 text-right">Diferencial (Alfa)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {historyData.yearly_performance.map((yr) => (
                        <tr key={yr.year} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-900">{yr.year}</td>
                          <td className={`py-2 px-3 text-right font-bold ${
                            yr.fund_return_pct >= 0 ? "text-emerald-700" : "text-rose-600"
                          }`}>
                            {yr.fund_return_pct >= 0 ? "+" : ""}{yr.fund_return_pct}%
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500">
                            {yr.benchmark_return_pct !== null ? `${yr.benchmark_return_pct >= 0 ? "+" : ""}${yr.benchmark_return_pct}%` : "—"}
                          </td>
                          <td className={`py-2 px-3 text-right font-bold ${
                            yr.excess_return_pct !== null
                              ? yr.excess_return_pct >= 0 ? "text-[#00B050]" : "text-rose-600"
                              : "text-slate-400"
                          }`}>
                            {yr.excess_return_pct !== null ? `${yr.excess_return_pct >= 0 ? "+" : ""}${yr.excess_return_pct}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. TAULA DE POSICIONS PRINCIPALS (LOOK-THROUGH) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Posicions Principals de la Cartera (Look-Through)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Accions i títols subjacents oficials de l&apos;últim trimestre declarat a Lipper / CNMV
              </p>
            </div>
            <span className="text-[10px] font-mono font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
              {normalizedHoldings.length} Actius Auditats
            </span>
          </div>

          {normalizedHoldings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th scope="col" className="pb-3 pr-4 font-medium">Actiu / Companyia</th>
                    <th scope="col" className="pb-3 px-3 font-medium">Ticker / RIC</th>
                    <th scope="col" className="pb-3 pl-3 text-right font-medium">Pes en Cartera</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {normalizedHoldings.map((h: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pr-4">
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {h.name}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs font-mono text-slate-400">
                          {h.ticker}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right align-middle">
                        <div className="inline-flex items-center justify-end gap-2 w-full">
                          {h.weight !== null && (
                            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                              <div 
                                className="bg-[#00B050] h-full rounded-full" 
                                style={{ width: `${Math.min(100, h.weight * 10)}%` }}
                              />
                            </div>
                          )}
                          <span className="font-mono text-xs font-bold text-slate-900 min-w-[50px] text-right">
                            {h.weight !== null ? `${Number(h.weight).toFixed(2)}%` : "N/D"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
              Aquest vehicle no té registrades les accions detallades a la base de dades pública o no publica carteres trimestrals.
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
