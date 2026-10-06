"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { 
  PieChart, 
  TrendingUp, 
  ShieldAlert, 
  Sparkles, 
  Trash2, 
  Activity, 
  RefreshCw, 
  Globe2
} from "lucide-react";
import { fetchPortfolioMPT, fetchPortfolioLookthrough, MPTResponse } from "@/lib/api";

const Chart = dynamic(() => import("@/components/Chart"), { ssr: false });

interface PortfolioItem {
  id: string;
  name: string;
  weight: number;
}

const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  { id: "LP60078536", name: "Vanguard Global Stock Index", weight: 50 },
  { id: "LP68227672", name: "Fundsmith Equity Fund", weight: 30 },
  { id: "LP68294156", name: "Magallanes European Equity", weight: 20 },
];

// Matriu densa de punts cartogràfics del món [x, y, regió]
const WORLD_DOTS: [number, number, string][] = [
  // Amèrica del Nord (Canadà & EUA)
  [120, 70, "na"], [140, 65, "na"], [160, 60, "na"], [180, 55, "na"], [200, 55, "na"], [220, 60, "na"],
  [100, 90, "na"], [120, 85, "na"], [140, 80, "na"], [160, 75, "na"], [180, 70, "na"], [200, 70, "na"], [220, 75, "na"], [240, 80, "na"], [260, 85, "na"],
  [110, 110, "na"], [130, 105, "na"], [150, 100, "na"], [170, 95, "na"], [190, 90, "na"], [210, 90, "na"], [230, 95, "na"], [250, 100, "na"], [270, 105, "na"], [290, 110, "na"],
  [120, 130, "na"], [140, 125, "na"], [160, 120, "na"], [180, 115, "na"], [200, 110, "na"], [220, 110, "na"], [240, 115, "na"], [260, 120, "na"], [280, 125, "na"],
  [140, 150, "na"], [160, 145, "na"], [180, 140, "na"], [200, 135, "na"], [220, 130, "na"], [240, 130, "na"], [260, 135, "na"], [280, 140, "na"],
  [160, 170, "na"], [180, 165, "na"], [200, 160, "na"], [220, 155, "na"], [240, 150, "na"], [260, 150, "na"],
  [180, 190, "na"], [200, 185, "na"], [220, 180, "na"], [240, 175, "na"],
  [190, 210, "na"], [210, 205, "na"], [230, 200, "na"],
  [200, 230, "na"], [215, 240, "na"],

  // Amèrica Central & Llatina
  [230, 255, "latam"], [245, 270, "latam"], [260, 285, "latam"],
  [270, 300, "latam"], [285, 305, "latam"], [300, 310, "latam"], [315, 315, "latam"], [330, 320, "latam"],
  [260, 320, "latam"], [280, 325, "latam"], [300, 330, "latam"], [320, 335, "latam"], [340, 340, "latam"],
  [260, 345, "latam"], [280, 350, "latam"], [300, 355, "latam"], [320, 360, "latam"], [335, 365, "latam"],
  [265, 370, "latam"], [280, 375, "latam"], [300, 380, "latam"], [315, 385, "latam"],
  [270, 395, "latam"], [285, 400, "latam"], [300, 405, "latam"],
  [275, 420, "latam"], [285, 430, "latam"], [290, 445, "latam"],

  // Regne Unit & Irlanda
  [445, 120, "uk"], [455, 115, "uk"], [445, 135, "uk"], [455, 130, "uk"],

  // Europa Continental & Nòrdics
  [470, 80, "eu"], [490, 75, "eu"], [510, 80, "eu"],
  [470, 100, "eu"], [485, 95, "eu"], [500, 95, "eu"], [520, 100, "eu"],
  [465, 120, "eu"], [480, 115, "eu"], [495, 115, "eu"], [510, 120, "eu"], [525, 125, "eu"], [540, 125, "eu"],
  [460, 140, "eu"], [475, 135, "eu"], [490, 135, "eu"], [505, 140, "eu"], [520, 145, "eu"], [535, 145, "eu"], [550, 140, "eu"],
  [450, 160, "eu"], [465, 155, "eu"], [480, 155, "eu"], [495, 160, "eu"], [510, 165, "eu"], [525, 165, "eu"], [540, 160, "eu"],
  [455, 175, "eu"], [470, 175, "eu"], [485, 180, "eu"], [500, 180, "eu"], [515, 185, "eu"], [530, 180, "eu"],

  // Àfrica
  [475, 205, "other"], [495, 205, "other"], [515, 210, "other"], [535, 210, "other"], [555, 215, "other"],
  [465, 225, "other"], [485, 225, "other"], [505, 230, "other"], [525, 230, "other"], [545, 235, "other"], [565, 235, "other"],
  [460, 245, "other"], [480, 245, "other"], [500, 250, "other"], [520, 250, "other"], [540, 255, "other"], [560, 255, "other"],
  [475, 270, "other"], [495, 270, "other"], [515, 275, "other"], [535, 275, "other"], [555, 280, "other"],
  [490, 295, "other"], [510, 295, "other"], [530, 300, "other"], [550, 300, "other"],
  [500, 320, "other"], [520, 320, "other"], [540, 325, "other"],
  [510, 345, "other"], [530, 345, "other"],
  [520, 370, "other"],

  // Orient Mitjà & Àsia Continental
  [575, 140, "asia"], [595, 135, "asia"], [615, 130, "asia"], [635, 130, "asia"], [655, 135, "asia"], [675, 135, "asia"], [695, 130, "asia"], [715, 125, "asia"], [735, 120, "asia"],
  [565, 160, "asia"], [585, 155, "asia"], [605, 150, "asia"], [625, 150, "asia"], [645, 155, "asia"], [665, 155, "asia"], [685, 150, "asia"], [705, 145, "asia"], [725, 140, "asia"], [745, 145, "asia"], [765, 150, "asia"],
  [580, 180, "asia"], [600, 175, "asia"], [620, 175, "asia"], [640, 180, "asia"], [660, 180, "asia"], [680, 175, "asia"], [700, 170, "asia"], [720, 165, "asia"], [740, 165, "asia"], [760, 170, "asia"], [780, 175, "asia"],
  [610, 200, "asia"], [630, 195, "asia"], [650, 195, "asia"], [670, 200, "asia"], [690, 200, "asia"], [710, 195, "asia"], [730, 190, "asia"], [750, 190, "asia"], [770, 195, "asia"],
  [640, 220, "asia"], [660, 215, "asia"], [680, 215, "asia"], [700, 220, "asia"], [720, 220, "asia"], [740, 215, "asia"], [760, 215, "asia"],
  [660, 240, "asia"], [680, 240, "asia"], [700, 245, "asia"], [720, 245, "asia"], [740, 240, "asia"],
  [680, 265, "asia"], [700, 270, "asia"], [730, 265, "asia"], [750, 270, "asia"],

  // Japó & Corea
  [805, 160, "asia"], [815, 155, "asia"], [825, 150, "asia"], [815, 175, "asia"], [825, 170, "asia"], [835, 165, "asia"],

  // Sud-est Asiàtic
  [750, 295, "asia"], [770, 305, "asia"], [790, 315, "asia"], [810, 325, "asia"],

  // Oceania & Austràlia
  [780, 355, "other"], [800, 350, "other"], [820, 350, "other"], [840, 355, "other"],
  [770, 375, "other"], [790, 370, "other"], [810, 370, "other"], [830, 375, "other"], [850, 380, "other"],
  [780, 395, "other"], [800, 395, "other"], [820, 395, "other"], [840, 400, "other"],
  [795, 415, "other"], [815, 415, "other"], [835, 420, "other"],
  [870, 425, "other"]
];

export default function PortfolioBuilderPage() {
  const [items, setItems] = useState<PortfolioItem[]>(DEFAULT_PORTFOLIO);
  const [mptData, setMptData] = useState<MPTResponse | null>(null);
  const [lookthroughData, setLookthroughData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMatrixTab, setActiveMatrixTab] = useState<"corr" | "cov">("corr");

  const totalWeight = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.weight) || 0), 0);
  }, [items]);

  const calculateAll = async () => {
    if (items.length < 2) {
      setError("Cal seleccionar un mínim de 2 fons per calcular la teoria de carteres.");
      return;
    }
    if (Math.abs(totalWeight - 100) > 0.5) {
      setError(`La suma de pesos ha de ser del 100% (actualment ${totalWeight}%).`);
      return;
    }

    setLoading(true);
    setError(null);

    const allocations: Record<string, number> = {};
    items.forEach((it) => { allocations[it.id] = Number(it.weight); });

    try {
      const [mptRes, ltRes] = await Promise.all([
        fetchPortfolioMPT(allocations),
        fetchPortfolioLookthrough(allocations)
      ]);
      setMptData(mptRes);
      setLookthroughData(ltRes);
    } catch (err: any) {
      setError(err.message || "Error al connectar amb el motor quantitatiu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateAll();
  }, []);

  const updateWeight = (index: number, newWeight: number) => {
    const next = [...items];
    next[index].weight = newWeight;
    setItems(next);
  };

  const removeFund = (index: number) => {
    if (items.length <= 2) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const regionsList = useMemo<{ name: string; value: number }[]>(() => {
    if (!lookthroughData) return [];
    const raw = lookthroughData.regions || lookthroughData.geographic_distribution || [];
    return raw.map((r: any) => ({
      name: String(r.name || r.region || "Altres"),
      value: Number(r.value ?? r.weight_pct ?? 0)
    }));
  }, [lookthroughData]);

  const sectorsList = useMemo<{ name: string; value: number }[]>(() => {
    if (!lookthroughData) return [];
    const raw = lookthroughData.sectors || lookthroughData.sector_distribution || [];
    return raw.map((s: any) => ({
      name: String(s.name || s.sector || "Altres"),
      value: Number(s.value ?? s.weight_pct ?? 0)
    }));
  }, [lookthroughData]);

  const topHoldingsList = useMemo(() => {
    if (!lookthroughData) return [];
    return lookthroughData.top_holdings || lookthroughData.top_consolidated_holdings || [];
  }, [lookthroughData]);

  const getRegionWeight = (nameKeyword: string) => {
    const found = regionsList.find((r) => r.name.toLowerCase().includes(nameKeyword.toLowerCase()));
    return found ? found.value : 0;
  };

  const northAmericaPct = getRegionWeight("Amèrica") || getRegionWeight("Estats Units");
  const europePct = getRegionWeight("Europa") || getRegionWeight("Euro");
  const ukPct = getRegionWeight("Regne Unit");
  const asiaPct = getRegionWeight("Àsia") || getRegionWeight("Japó");
  const latamPct = getRegionWeight("Llatina");

  // Funció per determinar el color dels punts del mapa
  const getDotStyle = (regionKey: string) => {
    let pct = 0;
    if (regionKey === "na") pct = northAmericaPct;
    else if (regionKey === "eu") pct = europePct;
    else if (regionKey === "uk") pct = ukPct || (europePct * 0.25);
    else if (regionKey === "asia") pct = asiaPct;
    else if (regionKey === "latam") pct = latamPct;

    if (pct <= 0) {
      return { fill: "#E2E8F0", radius: 2.2, opacity: 0.6 }; // Gris de fons suau
    }
    if (pct >= 50) {
      return { fill: "#00B050", radius: 4.2, opacity: 1.0 }; // Verd corporatiu vibrant
    }
    if (pct >= 20) {
      return { fill: "#059669", radius: 3.5, opacity: 0.9 }; // Verd maragda
    }
    return { fill: "#10B981", radius: 3.0, opacity: 0.8 };   // Verd clar
  };

  // Gràfic Sectorial AMB BARRES ENCARA MÉS AMPLES (32px de gruix)
  const sectorChartOptions = useMemo(() => {
    if (sectorsList.length === 0) return {};
    const reversed = [...sectorsList].reverse();
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#0F172A",
        borderColor: "#1E293B",
        textStyle: { color: "#F8FAFC", fontSize: 12, fontFamily: "monospace" },
        formatter: (params: any) => `<b>${params[0].name}</b>: ${params[0].value}% de la cartera`,
      },
      grid: { top: "4%", right: "16%", bottom: "4%", left: "32%", containLabel: false },
      xAxis: {
        type: "value",
        axisLabel: { color: "#64748B", fontSize: 11, fontFamily: "monospace" },
        splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: reversed.map((s) => s.name),
        axisLabel: { color: "#0F172A", fontSize: 13, fontWeight: 700 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: reversed.map((s) => s.value),
          itemStyle: { 
            color: "#00B050", // Verd corporatiu pur OptiFunds
            borderRadius: [0, 8, 8, 0] 
          },
          barWidth: 32, // BARRES EXTRA AMPLES (MÀXIM IMPACTE)
          label: {
            show: true,
            position: "right",
            valueAnimation: true,
            formatter: "{c}%",
            color: "#0F172A",
            fontSize: 13,
            fontWeight: 800,
            fontFamily: "monospace",
            distance: 8
          }
        },
      ],
    };
  }, [sectorsList]);

  // Gràfic Frontera Eficient
  const frontierChartOptions = useMemo(() => {
    if (!mptData || !Array.isArray(mptData.monte_carlo_frontier)) return {};
    const frontierPoints = mptData.monte_carlo_frontier.map((p) => [p.volatility, p.return, p.sharpe]);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: "#0F172A",
        borderColor: "#1E293B",
        textStyle: { color: "#F8FAFC", fontSize: 11, fontFamily: "monospace" },
        formatter: (params: any) => `
          <div style="font-weight:700; color:#38BDF8; margin-bottom:4px;">${params.seriesName}</div>
          <div>Volatilitat: <b>${params.data[0]}%</b></div>
          <div>Retorn Esperat: <b>${params.data[1]}%</b></div>
          <div>Sharpe: <b style="color:#34D399;">${params.data[2]}</b></div>
        `,
      },
      legend: {
        bottom: 0,
        textStyle: { color: "#64748B", fontSize: 11 },
        data: ["Monte Carlo", "La Teva Cartera", "Màxim Sharpe", "Mínima Volatilitat"],
      },
      grid: { top: "8%", right: "4%", bottom: "14%", left: "4%", containLabel: true },
      xAxis: {
        type: "value",
        name: "Volatilitat Anual (%)",
        nameLocation: "middle",
        nameGap: 28,
        axisLine: { lineStyle: { color: "#E2E8F0" } },
        splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
        axisLabel: { color: "#64748B", fontSize: 10, fontFamily: "monospace" },
      },
      yAxis: {
        type: "value",
        name: "Retorn CAGR (%)",
        nameLocation: "middle",
        nameGap: 30,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
        axisLabel: { color: "#64748B", fontSize: 10, fontFamily: "monospace" },
      },
      series: [
        {
          name: "Monte Carlo",
          type: "scatter",
          symbolSize: 5,
          itemStyle: { color: "#CBD5E1", opacity: 0.6 },
          data: frontierPoints,
        },
        {
          name: "La Teva Cartera",
          type: "scatter",
          symbolSize: 14,
          itemStyle: { color: "#2563EB", borderColor: "#FFFFFF", borderWidth: 2 },
          data: [[
            mptData.user_portfolio.volatility_annual_pct,
            mptData.user_portfolio.return_annual_pct,
            mptData.user_portfolio.sharpe_ratio
          ]],
          z: 10,
        },
        {
          name: "Màxim Sharpe",
          type: "scatter",
          symbol: "diamond",
          symbolSize: 16,
          itemStyle: { color: "#00B050", borderColor: "#FFFFFF", borderWidth: 2 },
          data: [[
            mptData.max_sharpe_portfolio.volatility_annual_pct,
            mptData.max_sharpe_portfolio.return_annual_pct,
            mptData.max_sharpe_portfolio.sharpe_ratio
          ]],
          z: 10,
        },
        {
          name: "Mínima Volatilitat",
          type: "scatter",
          symbol: "triangle",
          symbolSize: 15,
          itemStyle: { color: "#D97706", borderColor: "#FFFFFF", borderWidth: 2 },
          data: [[
            mptData.min_volatility_portfolio.volatility_annual_pct,
            mptData.min_volatility_portfolio.return_annual_pct,
            mptData.min_volatility_portfolio.sharpe_ratio
          ]],
          z: 10,
        },
      ],
    };
  }, [mptData]);

  // Gràfic Matriu Correlació / Covariància
  const matrixChartOptions = useMemo(() => {
    if (!mptData) return {};
    const isCorr = activeMatrixTab === "corr";
    const sourceMatrix = isCorr ? mptData.correlations : mptData.covariances_annual;
    if (!sourceMatrix) return {};

    const tickers = Object.keys(sourceMatrix);
    const dataPoints: [number, number, number][] = [];

    tickers.forEach((t1, i) => {
      tickers.forEach((t2, j) => {
        dataPoints.push([i, j, sourceMatrix[t1]?.[t2] ?? 0]);
      });
    });

    return {
      tooltip: {
        position: "top",
        backgroundColor: "#0F172A",
        borderColor: "#1E293B",
        textStyle: { color: "#F8FAFC", fontSize: 11, fontFamily: "monospace" },
        formatter: (params: any) => {
          const t1 = tickers[params.data[0]];
          const t2 = tickers[params.data[1]];
          const val = params.data[2];
          return `<b>${t1} ↔ ${t2}</b><br/>${isCorr ? "Correlació: " : "Covariància (x10k): "}<b>${val}</b>`;
        },
      },
      grid: { top: "10%", right: "12%", bottom: "15%", left: "15%" },
      xAxis: {
        type: "category",
        data: tickers,
        splitArea: { show: true },
        axisLabel: { color: "#64748B", fontSize: 10, fontFamily: "monospace" },
      },
      yAxis: {
        type: "category",
        data: tickers,
        splitArea: { show: true },
        axisLabel: { color: "#64748B", fontSize: 10, fontFamily: "monospace" },
      },
      visualMap: {
        min: 0.0,
        max: isCorr ? 1.0 : 40.0,
        calculable: true,
        orient: "vertical",
        right: "0%",
        top: "center",
        inRange: { color: ["#00B050", "#FEF08A", "#EF4444"] },
        textStyle: { color: "#64748B", fontSize: 10 },
      },
      series: [
        {
          type: "heatmap",
          data: dataPoints,
          label: { show: true, color: "#0F172A", fontFamily: "monospace", fontSize: 10 },
        },
      ],
    };
  }, [mptData, activeMatrixTab]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Capçalera */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Modern Portfolio Theory // MPT 360°
            </span>
            <span className="text-[11px] font-mono text-slate-400">Global Look-Through & Risk Allocation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Portfolio Builder: Eficiència & Distribució Mundial
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analítica matricial de Markowitz, radiografia d'accions subjacents i exposició macroeconòmica agregada.
          </p>
        </div>

        <Link
          href="/"
          className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm transition-colors"
        >
          ← Tornar al Mercat
        </Link>
      </div>

      {/* Selector de Cartera */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#00B050]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Pesos de la Cartera Actual
            </h2>
          </div>
          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
            Math.abs(totalWeight - 100) < 0.1 
              ? "bg-emerald-50 text-[#00B050] border border-emerald-200" 
              : "bg-rose-50 text-rose-600 border border-rose-200"
          }`}>
            Suma: {totalWeight}% / 100%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <div key={item.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.name}</p>
                  <p className="text-[10px] font-mono text-slate-400">{item.id}</p>
                </div>
                {items.length > 2 && (
                  <button 
                    onClick={() => removeFund(idx)}
                    className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="5"
                  value={item.weight}
                  onChange={(e) => updateWeight(idx, Number(e.target.value))}
                  className="w-full accent-[#00B050]"
                />
                <span className="text-xs font-mono font-bold w-12 text-right text-slate-800">
                  {item.weight}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2">
          {error && <span className="text-xs text-rose-500 font-mono">{error}</span>}
          <div className="ml-auto">
            <button
              onClick={calculateAll}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-[#00B050] transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Calculant dades..." : "Recalcular Cartera 360°"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MÒDUL 1: MAPAMUNDI DE MICRO-PUNTS + BARRES SECTORIALS EXTRA AMPLES */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-[#00B050]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
            1. Desglossament Geogràfic Mundial & Exposició Sectorial
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* MAPAMUNDI A BASE DE MICRO-PUNTS (DOT MATRIX ENGINE) */}
          <div className="lg:col-span-6 bg-white border border-slate-200 shadow-sm rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Mapamundi de Matriu Cartogràfica (Look-Through)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Projecció de micro-punts: gris per defecte i verd #00B050 per a mercats actius
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-200 inline-block"></span> 0%
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block"></span> 20%
                  <span className="w-3 h-3 rounded-full bg-[#00B050] inline-block"></span> &gt;50%
                </div>
              </div>

              {/* Llenç SVG amb micro-punts cartogràfics */}
              <div className="w-full h-72 bg-slate-50/70 rounded-xl border border-slate-100 p-3 flex items-center justify-center relative overflow-hidden">
                <svg viewBox="0 0 960 480" className="w-full h-full">
                  {/* Quadrícula suau de coordenades */}
                  <line x1="40" y1="240" x2="920" y2="240" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="480" y1="40" x2="480" y2="440" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Renderitzat de cada micro-punt del planeta */}
                  {WORLD_DOTS.map(([cx, cy, regionKey], idx) => {
                    const style = getDotStyle(regionKey);
                    return (
                      <circle
                        key={idx}
                        cx={cx}
                        cy={cy}
                        r={style.radius}
                        fill={style.fill}
                        opacity={style.opacity}
                        className="transition-all duration-300 hover:scale-125"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Pastilles de resum regional inferior */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
              {regionsList.slice(0, 3).map((reg, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-sans truncate">{reg.name}</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{reg.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* BARRES SECTORIALS DE GRAN FORMAT (GRUIX EXTRA DE 32PX) */}
          <div className="lg:col-span-6 bg-white border border-slate-200 shadow-sm rounded-xl p-6 flex flex-col justify-between">
            <div className="mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Exposició per Sectors Econòmics (GICS Breakdown)
              </h3>
              <p className="text-[11px] text-slate-400">
                Ponderació directa de negoci de cada companyia subjacent
              </p>
            </div>
            
            {/* Contenidor de 440px per allotjar barres amples sense compressió */}
            <div className="w-full">
              <Chart option={sectorChartOptions} height="440px" />
            </div>
          </div>
        </div>

        {/* TOP 10 ACCIONS CONSOLIDADES */}
        {topHoldingsList.length > 0 && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Top 10 Títols Finals Consolidats (Agregació Multi-Fons)
              </h3>
              <p className="text-[11px] text-slate-400">
                Accions amb més pes efectiu sumant les posicions de tots els teus fons
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-mono uppercase text-slate-400">
                    <th className="py-2.5">Companyia Subjacent</th>
                    <th className="py-2.5">Sector</th>
                    <th className="py-2.5">Regió</th>
                    <th className="py-2.5 text-right">Pes Net a Cartera</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-mono">
                  {topHoldingsList.map((h: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-semibold text-slate-800">
                        {h.holding_name || h.name} {(h.holding_ric || h.ric) && <span className="text-[10px] font-normal text-slate-400">({h.holding_ric || h.ric})</span>}
                      </td>
                      <td className="py-2.5 text-slate-600 font-sans text-[11px]">{h.sector || "Altres"}</td>
                      <td className="py-2.5 text-slate-600 font-sans text-[11px]">{h.region || h.country || "Global"}</td>
                      <td className="py-2.5 text-right font-bold text-[#00B050]">
                        {h.portfolio_exposure ?? h.weight ?? 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MÒDUL 2: MÈTRIQUES DE RISC */}
      {mptData && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00B050]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              2. Eficiència de Markowitz & Diagnòstic de Risc
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
                <span>Retorn Esperat</span>
                <TrendingUp className="w-4 h-4 text-[#00B050]" />
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
                +{mptData.user_portfolio.return_annual_pct}%
              </p>
              <span className="text-[11px] text-slate-400">CAGR anualitzat ponderat</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
                <span>Volatilitat Real (σ)</span>
                <Activity className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {mptData.user_portfolio.volatility_annual_pct}%
              </p>
              <span className="text-[11px] text-slate-400">Risc anualitzat (252 dies)</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
                <span>Ràtio de Sharpe</span>
                <Sparkles className="w-4 h-4 text-[#00B050]" />
              </div>
              <p className="text-2xl font-bold font-mono text-[#00B050] mt-1">
                {mptData.user_portfolio.sharpe_ratio}
              </p>
              <span className="text-[11px] text-slate-400">Retorn per unitat de risc total</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
                <span>Bonus Diversificació</span>
                <ShieldAlert className="w-4 h-4 text-[#00B050]" />
              </div>
              <p className="text-2xl font-bold font-mono text-[#00B050] mt-1">
                -{mptData.user_portfolio.diversification_benefit_pct}%
              </p>
              <span className="text-[11px] text-slate-400">Risc estalviat per descorrelació</span>
            </div>
          </div>
        </div>
      )}

      {/* MÒDUL 3: FRONTERA EFICIENT + MATRIU */}
      {mptData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Frontera Eficient de Markowitz
                </h3>
                <p className="text-[11px] text-slate-400">
                  500 carteres simulades (Monte Carlo) vs. Cartera Actual i Òptimes
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                SLSQP Solved
              </span>
            </div>
            <Chart option={frontierChartOptions} height="340px" />
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Matriu d'Interacció Creuada
                </h3>
                <p className="text-[11px] text-slate-400">
                  {activeMatrixTab === "corr" ? "Mesura la sincronització (0=descorrelacionat)" : "Magnitud de covariància anualitzada"}
                </p>
              </div>
              <div className="flex rounded-lg border border-slate-200 p-0.5 text-[10px] font-mono">
                <button
                  onClick={() => setActiveMatrixTab("corr")}
                  className={`px-2 py-1 rounded ${activeMatrixTab === "corr" ? "bg-slate-900 text-white" : "text-slate-500"}`}
                >
                  Correlació
                </button>
                <button
                  onClick={() => setActiveMatrixTab("cov")}
                  className={`px-2 py-1 rounded ${activeMatrixTab === "cov" ? "bg-slate-900 text-white" : "text-slate-500"}`}
                >
                  Covariància
                </button>
              </div>
            </div>
            <Chart option={matrixChartOptions} height="340px" />
          </div>
        </div>
      )}

      {/* MÒDUL 4: REBALANCEIG SUGGERIT */}
      {mptData && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              3. Proposta de Rebalanceig Òptim segons Markowitz
            </h3>
            <p className="text-[11px] text-slate-400">
              Reassignació de pesos necessària per assolir la ràtio de Sharpe màxima possible
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-mono uppercase text-slate-400">
                  <th className="py-2.5">Instrument</th>
                  <th className="py-2.5 text-right">Pes Actual</th>
                  <th className="py-2.5 text-right">Òptim Màxim Sharpe</th>
                  <th className="py-2.5 text-right">Ajust Suggerit (Δ)</th>
                  <th className="py-2.5 text-right">Òptim Mínima Volatilitat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-mono">
                {items.map((it) => {
                  const actual = it.weight;
                  const optSharpe = mptData.max_sharpe_portfolio.weights_pct[it.id] ?? 0;
                  const optMinVol = mptData.min_volatility_portfolio.weights_pct[it.id] ?? 0;
                  const delta = Number((optSharpe - actual).toFixed(1));

                  return (
                    <tr key={it.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-semibold text-slate-800">
                        {it.name} <span className="text-[10px] font-normal text-slate-400">({it.id})</span>
                      </td>
                      <td className="py-3 text-right text-slate-700">{actual}%</td>
                      <td className="py-3 text-right text-[#00B050] font-bold">{optSharpe}%</td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          delta > 0 
                            ? "bg-emerald-50 text-[#00B050]" 
                            : delta < 0 
                            ? "bg-rose-50 text-rose-600" 
                            : "text-slate-400"
                        }`}>
                          {delta > 0 ? `+${delta}%` : `${delta}%`}
                        </span>
                      </td>
                      <td className="py-3 text-right text-amber-700">{optMinVol}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
