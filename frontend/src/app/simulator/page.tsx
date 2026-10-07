"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { simulateCompoundInterest } from "@/lib/api";
import Chart from "@/components/Chart";
import { Calculator, TrendingDown, ShieldCheck, Percent, Layers, Sparkles, ArrowRight } from "lucide-react";

export default function SimulatorPage() {
  const [initialCap, setInitialCap] = useState<number>(10000);
  const [monthlyContrib, setMonthlyContrib] = useState<number>(300);
  const [horizonYears, setHorizonYears] = useState<number>(25);
  const [terActive, setTerActive] = useState<number>(1.75);
  const [terPassive, setTerPassive] = useState<number>(0.18);
  const [grossReturn, setGrossReturn] = useState<number>(7.0);

  // Projeccions financeres mensuals acumulades
  const activeSimulation = useMemo(() => {
    return simulateCompoundInterest(initialCap, monthlyContrib, terActive, grossReturn, horizonYears);
  }, [initialCap, monthlyContrib, terActive, grossReturn, horizonYears]);

  const passiveSimulation = useMemo(() => {
    return simulateCompoundInterest(initialCap, monthlyContrib, terPassive, grossReturn, horizonYears);
  }, [initialCap, monthlyContrib, terPassive, grossReturn, horizonYears]);

  const finalActive = activeSimulation[activeSimulation.length - 1] || { net_capital: 0, lost_to_fees: 0 };
  const finalPassive = passiveSimulation[passiveSimulation.length - 1] || { net_capital: 0, lost_to_fees: 0 };
  const deltaFeeLoss = finalPassive.net_capital - finalActive.net_capital;
  const pctFeeLoss = finalPassive.net_capital > 0 ? (deltaFeeLoss / finalPassive.net_capital) * 100 : 0;

  // Filtrar punts quinquennals per a la taula resum
  const quinquennialRows = useMemo(() => {
    return activeSimulation
      .filter((d) => d.year % 5 === 0 || d.year === horizonYears)
      .map((act) => {
        const pass = passiveSimulation.find((p) => p.year === act.year) || act;
        const diff = pass.net_capital - act.net_capital;
        const diffPct = pass.net_capital > 0 ? (diff / pass.net_capital) * 100 : 0;
        return {
          year: act.year,
          activeCap: act.net_capital,
          passiveCap: pass.net_capital,
          feeLoss: diff,
          feePct: diffPct,
        };
      });
  }, [activeSimulation, passiveSimulation, horizonYears]);

  // Configuració gràfica d'ECharts en Light Mode institucional
  const chartOptions = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "#0F172A",
      borderColor: "#1E293B",
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: "#F8FAFC", fontSize: 11, fontFamily: "monospace" },
      formatter: (params: any[]) => {
        const year = params[0]?.axisValue;
        return `
          <div style="font-weight: 600; margin-bottom: 6px; color: #34D399;">Any ${year}</div>
          ${params
            .map(
              (p) =>
                `<div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 2px;">
                  <span>${p.marker} ${p.seriesName}:</span>
                  <b>${Number(p.data).toLocaleString("ca-ES")} €</b>
                </div>`
            )
            .join("")}
        `;
      },
    },
    legend: {
      data: ["Solució Indexada (Baix Cost)", "Fons de Gestió Activa Comercial"],
      textStyle: { color: "#64748B", fontSize: 11, fontFamily: "monospace" },
      top: 0,
      right: 0,
    },
    grid: {
      top: "10%",
      right: "3%",
      bottom: "10%",
      left: "4%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: activeSimulation.map((d) => d.year),
      axisLine: { lineStyle: { color: "#E2E8F0" } },
      axisTick: { show: false },
      axisLabel: { color: "#64748B", fontSize: 10, fontFamily: "monospace" },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
      axisLabel: {
        color: "#64748B",
        fontSize: 10,
        fontFamily: "monospace",
        formatter: (val: number) => `${(val / 1000).toFixed(0)}k €`,
      },
    },
    series: [
      {
        name: "Solució Indexada (Baix Cost)",
        type: "line",
        data: passiveSimulation.map((d) => d.net_capital),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2.5, color: "#059669" },
        areaStyle: { color: "rgba(5, 150, 105, 0.08)" },
      },
      {
        name: "Fons de Gestió Activa Comercial",
        type: "line",
        data: activeSimulation.map((d) => d.net_capital),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: "#E11D48", type: "dashed" },
        areaStyle: { color: "rgba(225, 29, 72, 0.04)" },
      },
    ],
  }), [activeSimulation, passiveSimulation]);

  return (
    <div className="bg-[#F8FAFC] min-h-screen flex flex-col font-sans pb-16">
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* TITULAR EDITORIAL */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/80 pb-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-[#00B050] border border-emerald-100 uppercase tracking-wider">
                Model d'Interès Compost & MiFID II
              </span>
              <span className="text-xs text-slate-400 font-mono">COST TRANSPARENCY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight leading-snug">
              Simulador d'Erosió per <span className="text-[#00B050]">Comissions (TER)</span>
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Quantificació matemàtica de la pèrdua de capital a llarg termini per l'efecte continuat de costos de gestió bancària.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-xs font-mono text-slate-700 shadow-2xs shrink-0">
            <span className="text-slate-400">Horitzó seleccionat:</span>
            <span className="font-bold text-[#00B050] text-sm">{horizonYears} Anys</span>
          </div>
        </div>

        {/* TARGETES DE RESULTAT EXECUTIU BENTO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border-2 border-emerald-200/80 shadow-2xs p-6 rounded-3xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">Capital Solució Indexada</span>
              <span className="text-[10px] font-mono font-bold text-[#00B050] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                TER {terPassive.toFixed(2)}%
              </span>
            </div>
            <p className="text-3xl font-extrabold font-mono text-[#00B050] mt-1">
              {Math.round(finalPassive.net_capital).toLocaleString("ca-ES")} €
            </p>
            <span className="text-[11px] text-slate-500 block">Patrimoni net disponible final</span>
          </div>

          <div className="bg-white border border-slate-200/90 shadow-2xs p-6 rounded-3xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">Capital Gestió Activa</span>
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                TER {terActive.toFixed(2)}%
              </span>
            </div>
            <p className="text-3xl font-extrabold font-mono text-slate-800 mt-1">
              {Math.round(finalActive.net_capital).toLocaleString("ca-ES")} €
            </p>
            <span className="text-[11px] text-slate-500 block">Patrimoni net disponible final</span>
          </div>

          <div className="bg-rose-50/40 border-2 border-rose-200 shadow-2xs p-6 rounded-3xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-rose-700 font-semibold">
                Pèrdua Directa per Comissions
              </span>
              <span className="text-[10px] font-mono text-rose-800 font-bold bg-rose-100/70 px-2 py-0.5 rounded-full">
                -{pctFeeLoss.toFixed(1)}% del total
              </span>
            </div>
            <p className="text-3xl font-extrabold font-mono text-rose-600 mt-1">
              -{Math.round(deltaFeeLoss).toLocaleString("ca-ES")} €
            </p>
            <span className="text-[11px] text-rose-800/80 block">
              Erosió patrimonial retinguda per l'entitat
            </span>
          </div>
        </div>

        {/* CONTROLS D'ENTRADA I PARÀMETRES BENTO */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1.5">
              Capital Inicial (€)
            </label>
            <input
              type="number"
              step="1000"
              value={initialCap}
              onChange={(e) => setInitialCap(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1.5">
              Aportació Mensual Recorrent (€)
            </label>
            <input
              type="number"
              step="50"
              value={monthlyContrib}
              onChange={(e) => setMonthlyContrib(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1.5">
              TER Fons Bancari Actiu (%)
            </label>
            <input
              type="number"
              step="0.05"
              value={terActive}
              onChange={(e) => setTerActive(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-rose-600 font-mono font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1.5">
              TER Solució Indexada (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={terPassive}
              onChange={(e) => setTerPassive(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-emerald-600 font-mono font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1.5">
              Retorn Brut de Mercat Estimat (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={grossReturn}
              onChange={(e) => setGrossReturn(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-[11px] font-mono uppercase text-slate-500 mb-1.5">
              <span>Horitzó d'Inversió</span>
              <span className="text-slate-900 font-bold">{horizonYears} Anys</span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={horizonYears}
              onChange={(e) => setHorizonYears(parseInt(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer mt-1"
            />
          </div>
        </div>
      </div>

      {/* Gràfic d'Interès Compost */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Projecció d'Interès Compost Acumulat
            </h2>
            <p className="text-xs text-slate-400">
              Evolució temporal comparada del capital net disponible
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400 px-2.5 py-1 rounded bg-slate-50 border border-slate-200">
            LOOK-FORWARD CAPITAL MODEL
          </span>
        </div>

        <div className="w-full">
          <Chart option={chartOptions} height="380px" />
        </div>
      </div>

      {/* Taula d'Evolució Quinquennal */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Auditoria de Desviació Quinquennal
            </h3>
            <p className="text-xs text-slate-400">Detall de la pèrdua acumulada per fites temporals</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
              <tr>
                <th className="py-3 px-5">Horitzó</th>
                <th className="py-3 px-5 text-right">Capital Indexat</th>
                <th className="py-3 px-5 text-right">Capital Actiu</th>
                <th className="py-3 px-5 text-right">Comissions Extra Perdudes</th>
                <th className="py-3 px-5 text-right">% Pèrdua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {quinquennialRows.map((row) => (
                <tr key={row.year} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-5 font-bold text-slate-900">Any {row.year}</td>
                  <td className="py-3.5 px-5 text-right text-[#00B050] font-bold">
                    {Math.round(row.passiveCap).toLocaleString("ca-ES")} €
                  </td>
                  <td className="py-3.5 px-5 text-right text-slate-700 font-medium">
                    {Math.round(row.activeCap).toLocaleString("ca-ES")} €
                  </td>
                  <td className="py-3.5 px-5 text-right text-rose-600 font-bold">
                    -{Math.round(row.feeLoss).toLocaleString("ca-ES")} €
                  </td>
                  <td className="py-3.5 px-5 text-right text-slate-600">
                    -{row.feePct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BANNER CTA: DE LA SIMULACIÓ A L'ACCIÓ */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 sm:p-8 flex items-center justify-between gap-6 flex-wrap shadow-lg">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-mono font-medium tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span>ACCELERADOR D'ESTALVI REAL</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
            Vols passar de la simulació a l'estalvi efectiu en la teva cartera?
          </h3>
          <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed">
            Descobreix quins fons indexats homologats pel mercat espanyol repliquen el teu fons de gestió activa amb més d'un 70% de solapament i fins a un 1,7% menys de comissió anual.
          </p>
        </div>
        <Link
          href="/optimize"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs sm:text-sm shadow-md transition-all hover:shadow-lg shrink-0"
        >
          <span>Trobar Alternatives a l'Smart Switch</span>
          <ArrowRight className="w-4 h-4 text-emerald-700" />
        </Link>
      </div>

      </main>
    </div>
  );
}
