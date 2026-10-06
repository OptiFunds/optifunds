"use client";

import { useEffect, useState, useMemo } from "react";
import { getRiskReturnUniverse, RiskReturnPoint } from "@/lib/api";
import Chart from "@/components/Chart";

const BASE_UNIVERSE: RiskReturnPoint[] = [
  { isin: "IE00B03HD191", fund_name: "Vanguard Global Stock Index", ter: 0.18, volatility: 14.8, return_annual: 9.4, sharpe_ratio: 0.58 },
  { isin: "LU0996182563", fund_name: "Amundi Index MSCI World", ter: 0.30, volatility: 14.9, return_annual: 9.2, sharpe_ratio: 0.56 },
  { isin: "LU0690375182", fund_name: "Fundsmith Equity Fund", ter: 1.05, volatility: 13.5, return_annual: 11.2, sharpe_ratio: 0.72 },
  { isin: "ES0152745003", fund_name: "Magallanes European Equity", ter: 1.85, volatility: 18.2, return_annual: 8.5, sharpe_ratio: 0.38 },
  { isin: "IE00B5BMR087", fund_name: "iShares Core S&P 500 UCITS ETF", ter: 0.07, volatility: 16.1, return_annual: 12.3, sharpe_ratio: 0.69 },
  { isin: "ES0174115012", fund_name: "Cobas Selección FI", ter: 1.75, volatility: 19.4, return_annual: 7.8, sharpe_ratio: 0.31 }
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
        symbolSize: 8,
        data: data.map((d) => [d.volatility, d.return_annual, d.sharpe_ratio, d]),
        itemStyle: { opacity: 0.85 },
      },
    ],
  }), [data]);

  return (
    <div className="p-10 max-w-6xl space-y-8">
      {/* Capçalera */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Frontera de Risc vs Rendibilitat
          </h1>
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            Univers UCITS
          </span>
        </div>
        <div className="text-right font-mono text-xs text-slate-500">
          <span>Mostra: </span>
          <span className="font-semibold text-slate-800">{data.length} Vehicles</span>
        </div>
      </div>

      {/* Contingenedor del Gràfic */}
      <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-900">
            Dispersió Volatilitat / CAGR (Gradient de Sharpe)
          </span>
          <span className="text-[10px] font-mono text-slate-400">HISTORICAL NAV ENGINE</span>
        </div>
        <Chart option={chartOptions} height="500px" />
      </div>
    </div>
  );
}