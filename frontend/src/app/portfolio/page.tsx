"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  PieChart, 
  TrendingUp, 
  ShieldAlert, 
  Sparkles, 
  Trash2, 
  Activity, 
  RefreshCw, 
  Globe2,
  ArrowRight,
  Plus,
  Search,
  Scale,
  RotateCcw,
  CheckCircle2,
  Percent,
  AlertCircle,
  Calendar,
  History,
  TrendingDown,
  LineChart
} from "lucide-react";
import { 
  fetchPortfolioMPT, 
  fetchPortfolioLookthrough, 
  fetchPortfolioBacktest,
  searchFunds, 
  MPTResponse, 
  FundSummary,
  PortfolioBacktestResponse
} from "@/lib/api";

const Chart = dynamic(() => import("@/components/Chart"), { ssr: false });

export interface PortfolioItem {
  id: string;
  name: string;
  weight: number;
  ter?: number;
}

interface PortfolioPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  items: PortfolioItem[];
}

const PRESET_PORTFOLIOS: PortfolioPreset[] = [
  {
    id: "indexada",
    name: "100% Indexada (Baix Cost)",
    badge: "TER ~0.32%",
    description: "Rèplica passiva de màxima diversificació internacional (EUA, Europa, Espanya).",
    items: [
      { id: "ES0114763032", name: "Bankinter Índice América R (S&P 500)", weight: 40, ter: 0.35 },
      { id: "ES0110098037", name: "BBVA Bolsa Índice Euro (EuroStoxx)", weight: 30, ter: 0.30 },
      { id: "ES0114794037", name: "Bankinter Índice Ibex R (IBEX 35)", weight: 30, ter: 0.30 },
    ],
  },
  {
    id: "equilibrada",
    name: "Equilibrada Institucional",
    badge: "TER ~1.35%",
    description: "Combinació de creixement global indexat amb gestió activa de convicció.",
    items: [
      { id: "ES0114763032", name: "Bankinter Índice América R (S&P 500)", weight: 40, ter: 0.35 },
      { id: "ES0159259011", name: "Magallanes European Equity M FI", weight: 30, ter: 1.85 },
      { id: "ES0114388038", name: "Kutxabank Bolsa Estandar FI", weight: 30, ter: 1.85 },
    ],
  },
  {
    id: "bancaria",
    name: "Bancària Comercial Espanyola",
    badge: "TER ~1.73%",
    description: "Cartera típica comercial distribuïda per oficines de banca comercial.",
    items: [
      { id: "ES0114388038", name: "Kutxabank Bolsa Estandar FI", weight: 40, ter: 1.85 },
      { id: "ES0175224031", name: "Santander Acciones Españolas FI", weight: 35, ter: 1.70 },
      { id: "ES0114638036", name: "BBVA Bolsa FI", weight: 25, ter: 1.65 },
    ],
  },
  {
    id: "value",
    name: "Value & Qualitat d'Autor",
    badge: "TER ~1.82%",
    description: "Gestió activa pura d'alta convicció i màxim Active Share.",
    items: [
      { id: "ES0159259011", name: "Magallanes European Equity M FI", weight: 50, ter: 1.85 },
      { id: "ES0112611001", name: "Azvalor Internacional FI", weight: 50, ter: 1.80 },
    ],
  },
];

const DEFAULT_PORTFOLIO: PortfolioItem[] = PRESET_PORTFOLIOS[2].items;

// Matriu densa de punts cartogràfics del món [x, y, regió]
const WORLD_DOTS: [number, number, string][] = [
  // Amèrica del Nord (Canadà & EUA)
  [120, 70, "na"], [140, 65, "na"], [160, 60, "na"], [180, 55, "na"], [200, 55, "na"], [220, 60, "na"],
  [100, 90, "na"], [120, 85, "na"], [140, 80, "na"], [160, 75, "na"], [180, 70, "na"], [200, 70, "na"], [220, 75, "na"], [240, 80, "na"], [260, 85, "na"],
  [110, 110, "na"], [130, 105, "na"], [150, 100, "na"], [170, 95, "na"], [190, 90, "na"], [210, 90, "na"], [230, 95, "na"], [250, 100, "na"], [270, 105, "na"], [290, 110, "na"],
  [120, 130, "na"], [140, 125, "na"], [160, 120, "na"], [180, 115, "na"], [200, 110, "na"], [220, 110, "na"], [240, 115, "na"], [260, 120, "na"], [280, 125, "na"],
  [140, 150, "na"], [160, 145, "na"], [180, 140, "na"], [200, 135, "na"], [220, 130, "na"], [240, 130, "na"], [260, 135, "na"], [280, 140, "na"],
  [160, 170, "na"], [180, 165, "na"], [200, 160, "na"], [220, 155, "na"], [240, 150, "na"], [260, 150, "na"],
  [170, 190, "na"], [190, 185, "na"], [210, 180, "na"], [230, 175, "na"], [250, 170, "na"],
  [180, 210, "na"], [200, 205, "na"], [220, 200, "na"], [240, 195, "na"],
  [190, 230, "na"], [210, 225, "na"], [230, 220, "na"],

  // Amèrica del Sud
  [260, 260, "latam"], [280, 265, "latam"],
  [270, 285, "latam"], [290, 280, "latam"], [310, 285, "latam"],
  [280, 310, "latam"], [300, 305, "latam"], [320, 300, "latam"], [340, 310, "latam"],
  [290, 335, "latam"], [310, 330, "latam"], [330, 325, "latam"], [350, 335, "latam"],
  [295, 360, "latam"], [315, 355, "latam"], [335, 350, "latam"],
  [300, 385, "latam"], [320, 380, "latam"], [330, 380, "latam"],
  [305, 410, "latam"], [315, 410, "latam"],
  [310, 435, "latam"],

  // Regne Unit & Irlanda
  [430, 95, "uk"], [435, 105, "uk"], [440, 115, "uk"],

  // Europa (Zona Euro & Nòrdics)
  [460, 75, "eu"], [480, 70, "eu"], [500, 65, "eu"],
  [455, 95, "eu"], [475, 90, "eu"], [495, 85, "eu"], [515, 80, "eu"],
  [450, 120, "eu"], [470, 115, "eu"], [490, 110, "eu"], [510, 105, "eu"], [530, 100, "eu"],
  [440, 140, "eu"], [460, 135, "eu"], [480, 130, "eu"], [500, 125, "eu"], [520, 120, "eu"], [540, 125, "eu"],
  [430, 160, "eu"], [450, 155, "eu"], [470, 150, "eu"], [490, 145, "eu"], [510, 145, "eu"],

  // Àfrica
  [445, 190, "other"], [465, 185, "other"], [485, 180, "other"], [515, 180, "other"], [535, 185, "other"],
  [440, 215, "other"], [460, 210, "other"], [480, 205, "other"], [500, 205, "other"], [525, 210, "other"], [545, 215, "other"],
  [455, 240, "other"], [475, 235, "other"], [495, 235, "other"], [515, 240, "other"], [535, 245, "other"],
  [470, 265, "other"], [490, 265, "other"], [510, 270, "other"], [530, 275, "other"],
  [480, 295, "other"], [500, 295, "other"], [520, 300, "other"],
  [490, 325, "other"], [510, 325, "other"],
  [500, 355, "other"],

  // Àsia & Japó
  [570, 85, "asia"], [590, 80, "asia"], [610, 75, "asia"], [630, 70, "asia"], [660, 70, "asia"], [690, 75, "asia"],
  [560, 110, "asia"], [580, 105, "asia"], [600, 100, "asia"], [620, 95, "asia"], [650, 95, "asia"], [680, 100, "asia"], [710, 105, "asia"],
  [565, 135, "asia"], [585, 130, "asia"], [605, 125, "asia"], [630, 120, "asia"], [660, 120, "asia"], [690, 125, "asia"], [720, 130, "asia"], [740, 125, "asia"],
  [590, 160, "asia"], [615, 155, "asia"], [640, 150, "asia"], [670, 145, "asia"], [700, 150, "asia"], [730, 155, "asia"], [750, 150, "asia"],
  [600, 185, "asia"], [625, 180, "asia"], [655, 175, "asia"], [685, 175, "asia"], [715, 180, "asia"], [735, 180, "asia"],
  [610, 210, "asia"], [635, 205, "asia"], [665, 205, "asia"], [695, 210, "asia"], [720, 215, "asia"],
  [630, 240, "asia"], [680, 240, "asia"], [705, 245, "asia"], [730, 245, "asia"],

  // Oceania & Austràlia
  [780, 355, "other"], [800, 350, "other"], [820, 350, "other"], [840, 355, "other"],
  [770, 375, "other"], [790, 370, "other"], [810, 370, "other"], [830, 375, "other"], [850, 380, "other"],
  [780, 395, "other"], [800, 395, "other"], [820, 395, "other"], [840, 400, "other"],
  [795, 415, "other"], [815, 415, "other"], [835, 420, "other"],
  [870, 425, "other"]
];

function PortfolioContent() {
  const searchParams = useSearchParams();

  const [items, setItems] = useState<PortfolioItem[]>(DEFAULT_PORTFOLIO);
  const [activePresetId, setActivePresetId] = useState<string>("bancaria");
  const [mptData, setMptData] = useState<MPTResponse | null>(null);
  const [lookthroughData, setLookthroughData] = useState<any | null>(null);
  const [backtestData, setBacktestData] = useState<PortfolioBacktestResponse | null>(null);
  const [backtestPeriod, setBacktestPeriod] = useState<string>("10y");
  const [backtestBenchmark, setBacktestBenchmark] = useState<string>("IBEX35");
  const [showDrawdownChart, setShowDrawdownChart] = useState<boolean>(false);
  const [backtestLoading, setBacktestLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMatrixTab, setActiveMatrixTab] = useState<"corr" | "cov">("corr");

  // Cercador per afegir nous fons a la cartera
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FundSummary[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addNotice, setAddNotice] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Comprovar si s'ha passat un fons via URL (?add=ISIN&name=Nom)
  useEffect(() => {
    const addIsin = searchParams.get("add");
    const addName = searchParams.get("name");
    if (addIsin) {
      addFundToPortfolio({
        isin: addIsin,
        fund_name: addName || addIsin,
        ter: 1.25
      });
    }
  }, [searchParams]);

  // Autocompletat de cerca de fons
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchFunds(searchQuery.trim())
          .then((res) => {
            setSuggestions(res.slice(0, 6));
            setShowSuggestions(true);
          })
          .catch(() => setSuggestions([]));
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Tancar suggeriments en clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalWeight = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.weight) || 0), 0);
  }, [items]);

  // Càlcul del TER mitjà ponderat de la cartera
  const weightedTer = useMemo(() => {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, it) => acc + (it.weight * (it.ter ?? 1.25)), 0);
    return totalWeight > 0 ? sum / totalWeight : 0;
  }, [items, totalWeight]);

  const calculateAll = async (targetItems?: PortfolioItem[]) => {
    const listToCalc = targetItems || items;
    if (listToCalc.length < 2) {
      setError("Cal tenir com a mínim 2 fons per calcular la teoria de carteres.");
      return;
    }
    const sum = listToCalc.reduce((acc, it) => acc + (Number(it.weight) || 0), 0);
    if (Math.abs(sum - 100) > 0.5) {
      setError(`La suma de pesos ha de ser del 100% (actualment ${sum}%). Prem 'Equiponderar' per ajustar-ho.`);
      return;
    }

    setLoading(true);
    setBacktestLoading(true);
    setError(null);

    const allocations: Record<string, number> = {};
    listToCalc.forEach((it) => { allocations[it.id] = Number(it.weight); });

    try {
      // Execució paral·lela de MPT, Lookthrough i Backtest Històric Real CNMV
      const [mptRes, ltRes, btRes] = await Promise.allSettled([
        fetchPortfolioMPT(allocations),
        fetchPortfolioLookthrough(allocations),
        fetchPortfolioBacktest(allocations, backtestPeriod, backtestBenchmark)
      ]);

      if (mptRes.status === "fulfilled") {
        setMptData(mptRes.value);
      } else {
        console.warn("MPT error:", mptRes.reason);
      }

      if (ltRes.status === "fulfilled") {
        setLookthroughData(ltRes.value);
      } else {
        console.warn("Lookthrough error:", ltRes.reason);
      }

      if (btRes.status === "fulfilled") {
        setBacktestData(btRes.value);
      } else {
        console.warn("Backtest error:", btRes.reason);
      }

      if (mptRes.status === "rejected" && ltRes.status === "rejected" && btRes.status === "rejected") {
        setError("No s'han pogut calcular les mètriques d'aquests vehicles a la base de dades.");
      }
    } catch (err: any) {
      setError(err.message || "Error al connectar amb el motor quantitatiu.");
    } finally {
      setLoading(false);
      setBacktestLoading(false);
    }
  };

  const handlePeriodChange = async (newPeriod: string) => {
    setBacktestPeriod(newPeriod);
    const allocations: Record<string, number> = {};
    items.forEach((it) => { allocations[it.id] = Number(it.weight); });
    setBacktestLoading(true);
    try {
      const res = await fetchPortfolioBacktest(allocations, newPeriod, backtestBenchmark);
      setBacktestData(res);
    } catch (err) {
      console.warn("Error canviant període de backtest:", err);
    } finally {
      setBacktestLoading(false);
    }
  };

  const handleBenchmarkChange = async (newBmk: string) => {
    setBacktestBenchmark(newBmk);
    const allocations: Record<string, number> = {};
    items.forEach((it) => { allocations[it.id] = Number(it.weight); });
    setBacktestLoading(true);
    try {
      const res = await fetchPortfolioBacktest(allocations, backtestPeriod, newBmk);
      setBacktestData(res);
    } catch (err) {
      console.warn("Error canviant benchmark de backtest:", err);
    } finally {
      setBacktestLoading(false);
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
    if (items.length <= 2) {
      setAddNotice("La cartera requereix un mínim de 2 instruments per calcular l'eficiència de Markowitz.");
      setTimeout(() => setAddNotice(null), 3000);
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    setActivePresetId("personalitzada");
  };

  // Funció per afegir un nou fons
  const addFundToPortfolio = (fund: FundSummary) => {
    if (items.some((it) => it.id === fund.isin)) {
      setAddNotice(`El fons ${fund.fund_name} (${fund.isin}) ja forma part de la cartera.`);
      setTimeout(() => setAddNotice(null), 3500);
      return;
    }

    const newWeight = Math.max(5, Math.min(25, 100 - totalWeight));
    const newItem: PortfolioItem = {
      id: fund.isin,
      name: fund.fund_name,
      weight: newWeight,
      ter: fund.ter ?? 1.25,
    };

    const nextItems = [...items, newItem];
    setItems(nextItems);
    setSearchQuery("");
    setShowSuggestions(false);
    setActivePresetId("personalitzada");

    setAddNotice(`Afegit a la cartera: ${fund.fund_name}`);
    setTimeout(() => setAddNotice(null), 3500);
  };

  // Funció per equiponderar a parts iguals (100% / N)
  const equiponderate = () => {
    if (items.length === 0) return;
    const base = Math.floor(100 / items.length);
    const remainder = 100 - base * items.length;
    const updated = items.map((it, idx) => ({
      ...it,
      weight: idx === 0 ? base + remainder : base,
    }));
    setItems(updated);
    setError(null);
    calculateAll(updated);
  };

  // Carregar plantilla de cartera
  const applyPreset = (preset: PortfolioPreset) => {
    setItems(preset.items);
    setActivePresetId(preset.id);
    setError(null);
    calculateAll(preset.items);
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
      return { fill: "#E2E8F0", radius: 2.2, opacity: 0.6 };
    }
    if (pct >= 50) {
      return { fill: "#00B050", radius: 4.2, opacity: 1.0 };
    }
    if (pct >= 20) {
      return { fill: "#059669", radius: 3.5, opacity: 0.9 };
    }
    return { fill: "#10B981", radius: 3.0, opacity: 0.8 };
  };

  // Gràfic Sectorial
  const sectorChartOptions = useMemo(() => {
    if (sectorsList.length === 0) return {};
    const reversed = [...sectorsList].reverse();
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#0F172A",
        borderColor: "#1E293B",
        textStyle: { color: "#F8FAFC", fontSize: 11, fontFamily: "monospace" },
        formatter: (params: any) => `${params[0]?.name}: <b>${params[0]?.value}%</b>`,
      },
      grid: { top: "4%", right: "12%", bottom: "4%", left: "30%", containLabel: true },
      xAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
        axisLabel: { color: "#64748B", fontSize: 10, fontFamily: "monospace" },
      },
      yAxis: {
        type: "category",
        data: reversed.map((s) => s.name),
        axisLine: { lineStyle: { color: "#E2E8F0" } },
        axisTick: { show: false },
        axisLabel: { color: "#1E293B", fontSize: 11, fontWeight: 700 },
      },
      series: [
        {
          type: "bar",
          data: reversed.map((s) => s.value),
          itemStyle: { 
            color: "#00B050",
            borderRadius: [0, 8, 8, 0] 
          },
          barWidth: 32,
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
            mptData.user_portfolio.sharpe_ratio,
          ]],
        },
        {
          name: "Màxim Sharpe",
          type: "scatter",
          symbolSize: 16,
          itemStyle: { color: "#00B050", borderColor: "#FFFFFF", borderWidth: 2 },
          data: [[
            mptData.max_sharpe_portfolio.volatility_annual_pct,
            mptData.max_sharpe_portfolio.return_annual_pct,
            mptData.max_sharpe_portfolio.sharpe_ratio,
          ]],
        },
        {
          name: "Mínima Volatilitat",
          type: "scatter",
          symbolSize: 14,
          itemStyle: { color: "#D97706", borderColor: "#FFFFFF", borderWidth: 2 },
          data: [[
            mptData.min_volatility_portfolio.volatility_annual_pct,
            mptData.min_volatility_portfolio.return_annual_pct,
            mptData.min_volatility_portfolio.sharpe_ratio,
          ]],
        },
      ],
    };
  }, [mptData]);

  // Matriu de Correlació / Covariància
  const matrixChartOptions = useMemo(() => {
    if (!mptData) return {};
    const isCorr = activeMatrixTab === "corr";
    const matrix = isCorr ? mptData.correlations : mptData.covariances_annual;
    if (!matrix) return {};

    const tickers = Object.keys(matrix);
    const dataPoints: [number, number, number][] = [];
    tickers.forEach((t1: string, i: number) => {
      tickers.forEach((t2: string, j: number) => {
        let val = matrix[t1]?.[t2] ?? 0;
        if (!isCorr) val = Number((val * 10000).toFixed(1));
        else val = Number(val.toFixed(2));
        dataPoints.push([j, i, val]);
      });
    });

    return {
      tooltip: {
        position: "top",
        backgroundColor: "#0F172A",
        borderColor: "#1E293B",
        textStyle: { color: "#F8FAFC", fontSize: 11, fontFamily: "monospace" },
        formatter: (params: any) => {
          const t1 = tickers[params.data[1]];
          const t2 = tickers[params.data[0]];
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

  const backtestChartOptions = useMemo(() => {
    if (!backtestData || !backtestData.timeline || backtestData.timeline.length === 0) return {};

    if (showDrawdownChart) {
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
          data: backtestData.timeline,
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
            name: "Drawdown Cartera",
            type: "line",
            smooth: 0.15,
            data: backtestData.portfolio_drawdown_series,
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

    const palette = ["#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#6366F1"];
    const constituentSeries = Object.entries(backtestData.funds || {}).map(([isin, f], idx) => ({
      name: `${f.name.slice(0, 24)} (${f.weight_pct}%)`,
      type: "line",
      smooth: 0.2,
      data: f.base100_series,
      lineStyle: { width: 1.5, color: palette[idx % palette.length], opacity: 0.65 },
      itemStyle: { color: palette[idx % palette.length] },
    }));

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
        textStyle: { color: "#64748B", fontSize: 10 },
        type: "scroll",
      },
      grid: { top: "8%", right: "3%", bottom: "16%", left: "4%", containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: backtestData.timeline,
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
          name: `Cartera Ponderada (${backtestData.metrics.total_return_pct >= 0 ? "+" : ""}${backtestData.metrics.total_return_pct}%)`,
          type: "line",
          smooth: 0.2,
          data: backtestData.portfolio_base100_series,
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
        ...(backtestData.benchmark_base100_series && backtestData.benchmark_base100_series.length > 0 ? [{
          name: `${backtestData.benchmark?.name || "Benchmark"} (${backtestData.benchmark?.total_return_pct >= 0 ? "+" : ""}${backtestData.benchmark?.total_return_pct ?? 0}%)`,
          type: "line",
          smooth: 0.2,
          data: backtestData.benchmark_base100_series,
          lineStyle: { width: 2, color: "#64748B", type: "dashed" },
          itemStyle: { color: "#64748B" },
          z: 5
        }] : []),
        ...constituentSeries
      ]
    };
  }, [backtestData, showDrawdownChart]);

  return (
    <div className="bg-[#F8FAFC] min-h-screen flex flex-col font-sans pb-16">
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* TITULAR EDITORIAL */}
        <div className="space-y-2 border-b border-slate-200/80 pb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
              Teoria Moderna de Carteres (Markowitz)
            </span>
            <span className="text-xs text-slate-400 font-mono">DESGLOSSAMENT D&apos;ACTIUS & BACKTEST</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight leading-snug">
            Constructor i Anàlisi de Carteres
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            Optimització de frontera eficient (MPT), matriu de correlacions, desglossament sectorial i geogràfic look-through, i simulació de backtest històric real amb dades oficials.
          </p>
        </div>

        {/* BARRA DE PLANTILLES PRECONFIGURADES */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#00B050]" />
              Plantilles de Cartera Recomanades
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Carrega estratègies reals en 1 clic</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESET_PORTFOLIOS.map((p) => {
              const isActive = activePresetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? "bg-white border-[#00B050] shadow-sm ring-1 ring-[#00B050]"
                      : "bg-white/80 border-slate-200/80 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 truncate">{p.name}</span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[#00B050] border border-emerald-100">
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* NOTIFICACIÓ D'AFEGIT O ALERTA */}
        {addNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-[#00B050] shrink-0" />
            <span className="font-medium">{addNotice}</span>
          </div>
        )}

        {/* SELECTOR I GESTOR DE CARTERA DINÀMIC BENTO */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-8 space-y-6">
          
          {/* HEADER AMB MÈTRIQUES DE CARTERA */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#00B050]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Composició i Pesos de la Cartera Actual ({items.length} Fons)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ajusta els percentatges, afegeix fons de mercat o rebalanceja a parts iguals
              </p>
            </div>

            {/* MÈTRIQUES TOTALS: SUMA I TER PONDERAT */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* TER Ponderat */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
                <span className="text-slate-400">TER Ponderat:</span>
                <span className={`font-bold ${weightedTer < 0.75 ? "text-[#00B050]" : weightedTer < 1.5 ? "text-amber-600" : "text-rose-600"}`}>
                  {weightedTer.toFixed(2)}%/any
                </span>
                <span className="text-slate-400 text-[10px]">({Math.round(weightedTer * 1000)}€/100k€)</span>
              </div>

              {/* Suma de Pesos */}
              <span className={`font-mono text-xs font-bold px-3 py-1.5 rounded-xl border ${
                Math.abs(totalWeight - 100) < 0.1 
                  ? "bg-emerald-50 text-[#00B050] border-emerald-200" 
                  : "bg-rose-50 text-rose-600 border-rose-200"
              }`}>
                Suma: {totalWeight}% / 100%
              </span>
            </div>
          </div>

          {/* BUSCADOR PER AFEGIR FONS A LA CARTERA */}
          <div className="relative" ref={searchRef}>
            <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
              Afegir Fons de la Base de Dades a la Cartera
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Cerca fons o ISIN per afegir (Ex: Vanguard, CaixaBank, Santander, Amundi...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#00B050] focus:ring-1 focus:ring-[#00B050] transition-colors shadow-2xs"
              />
            </div>

            {/* Desplegable de cerca */}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto text-xs divide-y divide-slate-100 py-1">
                {suggestions.map((f) => (
                  <li
                    key={f.isin}
                    onClick={() => addFundToPortfolio(f)}
                    className="px-4 py-2.5 hover:bg-emerald-50/50 cursor-pointer transition-colors flex justify-between items-center group"
                  >
                    <div className="pr-2 truncate">
                      <p className="font-semibold text-slate-900 group-hover:text-[#00B050] transition-colors truncate">
                        {f.fund_name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{f.isin}</span>
                        {f.category && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">{f.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {f.ter !== undefined && (
                        <span className="font-mono text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-semibold">
                          TER: {f.ter}%
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00B050] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 group-hover:bg-[#00B050] group-hover:text-white transition-colors">
                        <Plus className="w-3 h-3" />
                        <span>Afegir</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* TARGETES DELS FONS A LA CARTERA */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, idx) => (
              <div key={item.id} className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-3 group hover:border-[#00B050]/50 transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate" title={item.name}>{item.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-400">{item.id}</span>
                      {item.ter !== undefined && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          TER: {item.ter}%
                        </span>
                      )}
                      <Link
                        href={`/optimize?fund=${encodeURIComponent(item.id)}`}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors"
                        title={`Trobar alternatives indexades per a ${item.name}`}
                      >
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Smart Switch</span>
                      </Link>
                    </div>
                  </div>
                  {items.length > 2 && (
                    <button 
                      onClick={() => removeFund(idx)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50"
                      title="Eliminar de la cartera"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="5"
                    value={item.weight}
                    onChange={(e) => updateWeight(idx, Number(e.target.value))}
                    className="w-full accent-[#00B050] cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold w-12 text-right text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    {item.weight}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* BOTONS D'ACCIÓ RÀPIDA (EQUIPONDERAR + RECALCULAR) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={equiponderate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                title="Repartir el 100% a parts iguals entre tots els fons"
              >
                <Scale className="w-3.5 h-3.5 text-slate-500" />
                <span>Equiponderar Pesos ({Math.round(100 / items.length)}%)</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(PRESET_PORTFOLIOS[1])}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium hover:bg-slate-50 transition-colors"
                title="Restablir cartera inicial"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablir per defecte</span>
              </button>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {error && <span className="text-xs text-rose-600 font-mono font-medium">{error}</span>}
              <button
                onClick={() => calculateAll()}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-[#00B050] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? "Calculant dades..." : "Recalcular Cartera 360°"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* BANNER DE REDUCCIÓ DE COMISSIONS AMB SMART SWITCH */}
        <div className="bg-gradient-to-r from-emerald-50/70 via-slate-50 to-blue-50/70 border border-emerald-200/80 rounded-3xl p-5 sm:p-6 flex items-center justify-between gap-4 flex-wrap shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#00B050] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block">
                Optimitza les comissions abans de rebalancejar
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Reemplaça fons comercials d&apos;alt cost per rèpliques indexades equivalents de màxim solapament a través de l&apos;Smart Switch.
              </p>
            </div>
          </div>
          <Link
            href="/optimize"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold shadow-xs transition-colors shrink-0"
          >
            <span>Explorar Smart Switch</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
          </Link>
        </div>

        {/* MÒDUL 1: MAPAMUNDI DE MICRO-PUNTS + BARRES SECTORIALS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-[#00B050]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              1. Desglossament Geogràfic Mundial & Exposició Sectorial
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* MAPAMUNDI A BASE DE MICRO-PUNTS */}
            <div className="lg:col-span-6 bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
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
                <div className="w-full h-72 bg-slate-50/70 rounded-2xl border border-slate-100 p-3 flex items-center justify-center relative overflow-hidden">
                  <svg viewBox="0 0 900 480" className="w-full h-full max-h-72 object-contain">
                    {WORLD_DOTS.map(([cx, cy, reg], idx) => {
                      const style = getDotStyle(reg);
                      return (
                        <circle
                          key={idx}
                          cx={cx}
                          cy={cy}
                          r={style.radius}
                          fill={style.fill}
                          opacity={style.opacity}
                          className="transition-all duration-300"
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Distribució geogràfica resumida */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-slate-100 mt-4 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Amèrica Nord</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{northAmericaPct.toFixed(1)}%</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Europa Euro</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{europePct.toFixed(1)}%</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Regne Unit</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{ukPct.toFixed(1)}%</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Àsia / Altres</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{asiaPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* BARRES SECTORIALS */}
            <div className="lg:col-span-6 bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                  Exposició Sectorial Consolidada
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Pes percentual agregat per indústria econòmica real
                </p>
                <div className="w-full h-80">
                  <Chart option={sectorChartOptions} height="320px" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MÒDUL 2: PRINCIPALS VALORS CONSOLIDATS */}
        {topHoldingsList.length > 0 && (
          <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Top Valors Consolidats en Cartera (Look-Through)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Pes efectiu agregat de les primeres companyies a través de tots els fons
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">{topHoldingsList.length} valors</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Companyia Subjacent</th>
                    <th className="py-2.5 px-4 font-mono">RIC</th>
                    <th className="py-2.5 px-4">Regió</th>
                    <th className="py-2.5 px-4">Sector</th>
                    <th className="py-2.5 px-4 text-right">Pes Cartera</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topHoldingsList.slice(0, 10).map((h: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{h.holding_name || h.name}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-400">{h.holding_ric || h.ric || "—"}</td>
                      <td className="py-2.5 px-4 text-slate-600">{h.region || "Global"}</td>
                      <td className="py-2.5 px-4 text-slate-600">{h.sector || "Altres"}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[#00B050]">
                        {Number(h.portfolio_exposure ?? h.weight ?? 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MÒDUL 3: TEORIA MODERNA DE CARTERES DE MARKOWITZ */}
        {mptData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* FRONTERA EFICIENT */}
            <div className="lg:col-span-6 bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Frontera Eficient & Simulació Monte Carlo
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Maximitza el Sharpe Ratio i redueix la volatilitat agregada
                  </p>
                </div>
              </div>
              <Chart option={frontierChartOptions} height="340px" />
            </div>

            {/* MATRIU DE CORRELACIÓ / COVARIÀNCIA */}
            <div className="lg:col-span-6 bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Matriu d&apos;Interacció Creuada
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeMatrixTab === "corr" ? "Mesura la sincronització (0=descorrelacionat)" : "Magnitud de covariància anualitzada"}
                  </p>
                </div>
                <div className="flex rounded-lg border border-slate-200 p-0.5 text-[10px] font-mono">
                  <button
                    onClick={() => setActiveMatrixTab("corr")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${activeMatrixTab === "corr" ? "bg-slate-900 text-white font-bold" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    Correlació
                  </button>
                  <button
                    onClick={() => setActiveMatrixTab("cov")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${activeMatrixTab === "cov" ? "bg-slate-900 text-white font-bold" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    Covariància
                  </button>
                </div>
              </div>
              <Chart option={matrixChartOptions} height="340px" />
            </div>
          </div>
        )}

        {/* MÒDUL 4: REBALANCEIG SUGGERIT SEGONS MARKOWITZ */}
        {mptData && (
          <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-8 space-y-4">
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

        {/* MÒDUL 4: EVOLUCIÓ HISTÒRICA OFICIAL CNMV & BACKTEST REBALANÇAT (2015 - 2024) */}
        {backtestData && (
          <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-8 space-y-6">
            
            {/* ENCAPÇALAMENT I SELECTORS */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-[#00B050] border border-emerald-100 uppercase tracking-wider">
                    Sèrie Històrica Oficial CNMV // 2015 - 2024
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {backtestData.date_range.total_days.toLocaleString()} sessions diàries auditades
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  4. Evolució Històrica Real de la Cartera & Backtest
                </h3>
                <p className="text-xs text-slate-500">
                  Rendibilitat acumulada rebalançada diàriament dels fons que componen la teva cartera enfront del mercat
                </p>
              </div>

              {/* CONTROLS: HORITZÓ TEMPORAL, BENCHMARK I TIPUS DE GRÀFIC */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* SELECTOR D'HORITZÓ */}
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
                      disabled={backtestLoading}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        backtestPeriod === p.id
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* SELECTOR DE BENCHMARK */}
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                  {[
                    { id: "IBEX35", label: "IBEX 35" },
                    { id: "EUROSTOXX50", label: "EuroStoxx 50" },
                    { id: "SP500", label: "S&P 500" },
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleBenchmarkChange(b.id)}
                      disabled={backtestLoading}
                      className={`px-2.5 py-1.5 rounded-lg transition-all ${
                        backtestBenchmark === b.id
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                {/* TOGGLE TRAJECTÒRIA / DRAWDOWN */}
                <div className="flex rounded-xl border border-slate-200 p-0.5 text-xs">
                  <button
                    onClick={() => setShowDrawdownChart(false)}
                    className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                      !showDrawdownChart
                        ? "bg-slate-900 text-white font-bold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Base 100
                  </button>
                  <button
                    onClick={() => setShowDrawdownChart(true)}
                    className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                      showDrawdownChart
                        ? "bg-rose-600 text-white font-bold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Drawdown %
                  </button>
                </div>
              </div>
            </div>

            {/* GRÀFIC PRINCIPAL */}
            <div className="relative">
              {backtestLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs z-20 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white px-4 py-2 rounded-xl shadow-md border border-slate-100">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00B050]" />
                    <span>Recalculant sèrie històrica de 10 anys...</span>
                  </div>
                </div>
              )}
              <Chart option={backtestChartOptions} height="380px" />
            </div>

            {/* BENTO GRID DE MÈTRIQUES DEL BACKTEST REAL */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-2">
              {/* RETORN TOTAL */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Retorn Acumulat</span>
                <span className={`text-xl font-extrabold font-mono mt-1 block ${
                  backtestData.metrics.total_return_pct >= 0 ? "text-[#00B050]" : "text-rose-600"
                }`}>
                  {backtestData.metrics.total_return_pct >= 0 ? "+" : ""}{backtestData.metrics.total_return_pct}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                  vs {backtestData.benchmark?.total_return_pct ?? 0}% ({backtestData.benchmark?.name?.slice(0, 10)})
                </span>
              </div>

              {/* CAGR ANUALITZAT */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">CAGR Anualitzat</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
                  {backtestData.metrics.cagr_pct >= 0 ? "+" : ""}{backtestData.metrics.cagr_pct}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Taxa anual composta</span>
              </div>

              {/* VOLATILITAT REAL */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Volatilitat Anual</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
                  {backtestData.metrics.volatility_pct}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  vs {backtestData.benchmark?.volatility_pct ?? 0}% mercat
                </span>
              </div>

              {/* MÀXIM DRAWDOWN */}
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100">
                <span className="text-[10px] font-mono uppercase text-rose-700 block">Màxim Drawdown</span>
                <span className="text-xl font-extrabold text-rose-600 font-mono mt-1 block">
                  {backtestData.metrics.max_drawdown_pct}%
                </span>
                <span className="text-[10px] text-rose-500 font-mono mt-0.5 block">
                  Mínim: {backtestData.metrics.max_drawdown_date}
                </span>
              </div>

              {/* SHARPE HISTÒRIC */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Ràtio de Sharpe</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
                  {backtestData.metrics.sharpe_ratio}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Sortino: {backtestData.metrics.sortino_ratio}
                </span>
              </div>

              {/* ALFA VS BENCHMARK */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[10px] font-mono uppercase text-emerald-800 block">Alfa vs Benchmark</span>
                <span className={`text-xl font-extrabold font-mono mt-1 block ${
                  (backtestData.benchmark?.alpha_annual_pct ?? 0) >= 0 ? "text-[#00B050]" : "text-rose-600"
                }`}>
                  {(backtestData.benchmark?.alpha_annual_pct ?? 0) >= 0 ? "+" : ""}
                  {backtestData.benchmark?.alpha_annual_pct ?? 0}%
                </span>
                <span className="text-[10px] text-emerald-700 mt-0.5 block">
                  Beta: {backtestData.benchmark?.beta ?? 1.0}
                </span>
              </div>
            </div>

            {/* TAULA DE RENDIMENT ANY PER ANY (2015-2024) */}
            {backtestData.yearly_performance && backtestData.yearly_performance.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Desglossament per Anys Naturals (2015 – 2024)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Retorns oficials tancament 31 de desembre
                  </span>
                </div>

                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400">
                        <th className="py-2 px-3">Any</th>
                        <th className="py-2 px-3 text-right">Rendibilitat Cartera</th>
                        <th className="py-2 px-3 text-right">Rendibilitat Benchmark</th>
                        <th className="py-2 px-3 text-right">Diferencial (Alfa)</th>
                        <th className="py-2 px-3 text-right">Estat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {backtestData.yearly_performance.map((yr) => {
                        const beat = yr.excess_return_pct !== null && yr.excess_return_pct > 0;
                        return (
                          <tr key={yr.year} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{yr.year}</td>
                            <td className={`py-2.5 px-3 text-right font-bold ${
                              yr.portfolio_return_pct >= 0 ? "text-emerald-700" : "text-rose-600"
                            }`}>
                              {yr.portfolio_return_pct >= 0 ? "+" : ""}{yr.portfolio_return_pct}%
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500">
                              {yr.benchmark_return_pct !== null ? `${yr.benchmark_return_pct >= 0 ? "+" : ""}${yr.benchmark_return_pct}%` : "—"}
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold ${
                              yr.excess_return_pct !== null
                                ? yr.excess_return_pct >= 0 ? "text-[#00B050]" : "text-rose-600"
                                : "text-slate-400"
                            }`}>
                              {yr.excess_return_pct !== null ? `${yr.excess_return_pct >= 0 ? "+" : ""}${yr.excess_return_pct}%` : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {yr.excess_return_pct !== null ? (
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  beat ? "bg-emerald-50 text-[#00B050]" : "bg-slate-100 text-slate-500"
                                }`}>
                                  {beat ? "Supera mercat" : "Per sota"}
                                </span>
                              ) : "—"}
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
        )}

      </main>
    </div>
  );
}

export default function PortfolioBuilderPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-xs font-mono text-slate-400">Carregant Portfolio Builder...</div>}>
      <PortfolioContent />
    </Suspense>
  );
}
