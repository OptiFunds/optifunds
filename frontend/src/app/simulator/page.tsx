"use client";

import { useState, useMemo } from "react";
import { simulateCompoundInterest } from "@/lib/api";
import Chart from "@/components/Chart";
import { Calculator, TrendingDown, ShieldCheck, Percent, Layers } from "lucide-react";

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
    <div className="p-10 max-w-6xl space-y-8 mx-auto">
      {/* Capçalera */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Model d'Interès Compost
            </span>
            <span className="text-xs font-mono text-slate-400">MIFID II COST TRANSPARENCY</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Simulador d'Erosió Patrimonial per Comissions (TER)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quantificació de la pèrdua acumulada de capital per l'efecte continuat de costos de gestió bancària.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-600 shadow-2xs">
          <span>Horitzó seleccionat:</span>
          <span className="font-bold text-slate-900">{horizonYears} Anys</span>
        </div>
      </div>

      {/* Targetes de Resultat Executiu */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Capital Solució Indexada</span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              TER {terPassive.toFixed(2)}%
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-2">
            {Math.round(finalPassive.net_capital).toLocaleString("ca-ES")} €
          </p>
          <span className="text-[10px] font-mono text-slate-500 mt-1 block">Patrimoni net acumulat</span>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Capital Gestió Activa</span>
            <span className="text-[10px] font-mono text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
              TER {terActive.toFixed(2)}%
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-800 mt-2">
            {Math.round(finalActive.net_capital).toLocaleString("ca-ES")} €
          </p>
          <span className="text-[10px] font-mono text-slate-500 mt-1 block">Patrimoni net acumulat</span>
        </div>

        <div className="bg-white border border-rose-200 shadow-sm p-5 rounded-xl bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-rose-700 font-semibold">
              Pèrdua Directa per Comissions
            </span>
            <span className="text-[10px] font-mono text-rose-800 font-bold">
              -{pctFeeLoss.toFixed(1)}% del potencial
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-600 mt-2">
            -{Math.round(deltaFeeLoss).toLocaleString("ca-ES")} €
          </p>
          <span className="text-[10px] font-mono text-slate-500 mt-1 block">
            Diners retinguts per comissions extra
          </span>
        </div>
      </div>

      {/* Controls d'Entrada i Paràmetres */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
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
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Projecció d'Interès Compost Acumulat
            </h2>
            <p className="text-[11px] text-slate-400">
              Evolució temporal comparada del capital net disponible
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">LOOK-FORWARD CAPITAL MODEL</span>
        </div>

        <div className="w-full">
          <Chart option={chartOptions} height="360px" />
        </div>
      </div>

      {/* Taula d'Evolució Quinquennal */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Auditoria de Desviació Quinquennal
            </h3>
            <p className="text-[11px] text-slate-400">Detall de la pèrdua acumulada per fites temporals</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Horitzó</th>
                <th className="py-2.5 px-4 text-right">Capital Indexat</th>
                <th className="py-2.5 px-4 text-right">Capital Actiu</th>
                <th className="py-2.5 px-4 text-right">Comissions Extra Perdudes</th>
                <th className="py-2.5 px-4 text-right">% Pèrdua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {quinquennialRows.map((row) => (
                <tr key={row.year} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-900">Any {row.year}</td>
                  <td className="py-2.5 px-4 text-right text-emerald-600 font-semibold">
                    {Math.round(row.passiveCap).toLocaleString("ca-ES")} €
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-700">
                    {Math.round(row.activeCap).toLocaleString("ca-ES")} €
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-600 font-semibold">
                    -{Math.round(row.feeLoss).toLocaleString("ca-ES")} €
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-600">
                    -{row.feePct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
