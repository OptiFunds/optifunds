"use client";

import { useEffect, useState, useMemo } from "react";
import { getRiskReturnUniverse, RiskReturnPoint } from "@/lib/api";
import Chart from "@/components/Chart";
import { Activity, Sparkles, TrendingUp } from "lucide-react";

const BASE_UNIVERSE: RiskReturnPoint[] = [
  { isin: "IE00B03HD191", fund_name: "Vanguard Global Stock Index", ter: 0.18, volatility: 14.8, return_annual: 9.4, sharpe_ratio: 0.58 },
  { isin: "ES0112611001", fund_name: "Azvalor Internacional FI", ter: 1.89, volatility: 15.0, return_annual: 16.5, sharpe_ratio: 0.25 },
  { isin: "LU0690375182", fund_name: "Fundsmith Equity Fund", ter: 1.05, volatility: 13.5, return_annual: 11.2, sharpe_ratio: 0.72 },
  { isin: "ES0159259011", fund_name: "Magallanes European Equity M", ter: 1.80, volatility: 18.2, return_annual: 8.5, sharpe_ratio: 0.38 },
  { isin: "LU0496786574", fund_name: "Amundi Core S&P 500 Swap UCITS ETF", ter: 0.05, volatility: 13.1, return_annual: 20.6, sharpe_ratio: 0.31 },
  { isin: "ES0124037013", fund_name: "Cobas Selección FI", ter: 1.75, volatility: 19.4, return_annual: 7.8, sharpe_ratio: 0.31 }
];

export default function RiskReturnPage() {
  const [data, setData] = useState<RiskReturnPoint[]>(BASE_UNIVERSE);

  useEffect(() => {
    getRiskReturnUniverse()
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setData(res);
        }
      })
      .catch(() => {});
  }, []);

  const chartOptions = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "#0F172A",
      borderColor: "#1E293B",
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: "#F8FAFC", fontSize: 11, fontFamily: "monospace" },
      formatter: (params: any) => {
        const item = params.data?.[3];
        if (!item) return "";
        return `
          <div style="font-weight: 600; margin-bottom: 4px; color: #34D399;">${item.fund_name}</div>
          <div style="color: #94A3B8;">ISIN: <span style="color:#F8FAFC;">${item.isin}</span></div>
          <div style="margin-top: 4px;">Volatilitat: <b>${item.volatility}%</b></div>
          <div>Retorn: <b>${item.return_annual}%</b></div>
          <div>Sharpe Ratio: <b style="color: #059669;">${item.sharpe_ratio}</b></div>
          <div>TER: <b>${item.ter}%</b></div>
        `;
      },
    },
    grid: {
      top: "8%",
      right: "4%",
      bottom: "12%",
      left: "4%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      name: "Volatilitat Anualitzada (%)",
      nameLocation: "middle",
      nameGap: 28,
      nameTextStyle: { color: "#64748B", fontSize: 10, fontFamily: "monospace" },
      axisLine: { lineStyle: { color: "#E2E8F0" } },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
      axisLabel: { color: "#64748B", fontSize: 10, fontFamily: "monospace" },
    },
    yAxis: {
      type: "value",
      name: "Retorn CAGR (%)",
      nameLocation: "middle",
      nameGap: 32,
      nameTextStyle: { color: "#64748B", fontSize: 10, fontFamily: "monospace" },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
      axisLabel: { color: "#64748B", fontSize: 10, fontFamily: "monospace" },
    },
    visualMap: {
      min: 0.2,
      max: 0.9,
      dimension: 2,
      orient: "horizontal",
      right: "center",
      bottom: 0,
      text: ["Sharpe 0.90", "Sharpe 0.20"],
      textStyle: { color: "#64748B", fontSize: 10, fontFamily: "monospace" },
      inRange: {
        color: ["#EF4444", "#F59E0B", "#059669"],
      },
    },
    series: [
      {
        type: "scatter",
        symbolSize: 10,
        data: data.map((d) => [d.volatility, d.return_annual, d.sharpe_ratio, d]),
        itemStyle: { opacity: 0.85 },
      },
    ],
  }), [data]);

  return (
    <div className="bg-[#F8FAFC] min-h-screen flex flex-col font-sans pb-16">
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* TITULAR EDITORIAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/70 uppercase tracking-wider">
                Univers de Risc & Rendibilitat // UCITS
              </span>
              <span className="text-xs text-slate-400 font-mono">SHARPE GRADIENT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight leading-snug">
              Frontera de Risc: <span className="text-[#00B050]">Rendibilitat vs Volatilitat</span>
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Gràfic de dispersió quantitativa de mercat: visualitza quins fons compensen el risc assumit amb ràtios de Sharpe superiors i quins cobren comissions excessives.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono text-slate-700 shadow-2xs shrink-0 self-start sm:self-center">
            <span className="text-slate-400">Mostra:</span>
            <span className="font-bold text-[#00B050]">{data.length} Vehicles</span>
          </div>
        </div>

        {/* CONTENIDOR DEL GRÀFIC BENTO */}
        <div className="bg-white border border-slate-200/90 shadow-2xs p-6 sm:p-8 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Dispersió Volatilitat / CAGR (Gradient de Sharpe)
              </h3>
              <p className="text-xs text-slate-400">Comportament històric multianual del catàleg</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 px-2.5 py-1 rounded bg-slate-50 border border-slate-200">
              HISTORICAL NAV ENGINE
            </span>
          </div>
          <Chart option={chartOptions} height="520px" />
        </div>

      </main>
    </div>
  );
}