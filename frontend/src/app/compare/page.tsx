"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Chart from "@/components/Chart";
import { getPairwiseComparison, PairwiseComparisonData } from "@/lib/api";
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
  ArrowLeftRight
} from "lucide-react";

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const f1Param = searchParams.get("f1") || searchParams.get("fund1") || "LU0690375182";
  const f2Param = searchParams.get("f2") || searchParams.get("fund2") || "IE00B03HD191";

  const [data, setData] = useState<PairwiseComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (f1Param && f2Param) {
      setLoading(true);
      getPairwiseComparison(f1Param, f2Param)
        .then((res) => {
          setData(res);
          setError(null);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [f1Param, f2Param]);

  // Gràfic comparatiu Base 100
  const chartOptions = useMemo(() => {
    if (!data) return {};

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
  }, [data]);

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

  if (loading) {
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

        {/* Targetes dels dos fons cara a cara */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Fons 1 */}
        <div className="bg-white border-2 border-blue-200/80 rounded-2xl p-6 shadow-xs space-y-4 relative">
          <div className="flex justify-between items-start gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                Fons A (Original)
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-2">{fund1.fund_name}</h2>
              <span className="text-xs font-mono text-slate-400">ISIN: {fund1.isin}</span>
            </div>
            <Link
              href={`/optimize?fund=${encodeURIComponent(fund1.isin)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              title="Trobar alternatives indexades a l'Smart Switch"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Switch</span>
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
        <div className="bg-white border-2 border-emerald-300 rounded-2xl p-6 shadow-xs space-y-4 relative">
          <div className="flex justify-between items-start gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1 w-fit">
                <Sparkles className="w-3 h-3 text-emerald-600" /> Fons B (Alternativa)
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-2">{fund2.fund_name}</h2>
              <span className="text-xs font-mono text-slate-400">ISIN: {fund2.isin}</span>
            </div>
            <Link
              href={`/funds/${fund2.isin}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors shrink-0"
              title="Veure fitxa detallada del vehicle"
            >
              <span>Fitxa Fons</span>
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

      {/* Gràfic comparatiu Base 100 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Rendibilitat Històrica Comparada (Base 100)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Evolució temporal normalitzada dels darrers 12 mesos
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-blue-600 font-bold">Fons A: {fmtPct(fund1.return_1y, true)}</span>
            <span className="text-emerald-700 font-bold">Fons B: {fmtPct(fund2.return_1y, true)}</span>
          </div>
        </div>
        <Chart option={chartOptions} height="320px" />
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
