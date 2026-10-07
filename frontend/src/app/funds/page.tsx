"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  BarChart3,
  Percent,
  Activity,
  Award,
  Info
} from "lucide-react";
import {
  fetchFundsScreener,
  ScreenerFund,
  ScreenerResponse,
  ScreenerFilterOptions
} from "@/lib/api";

const CATEGORY_PILLS = [
  { id: "Totes", label: "Totes" },
  { id: "Renda Variable", label: "Renda Variable" },
  { id: "Renda Fixa", label: "Renda Fixa" },
  { id: "Mixts", label: "Mixts" },
  { id: "Monetaris", label: "Monetaris" },
  { id: "Alternatius", label: "Alternatius" },
];

export default function FundsScreenerPage() {
  const router = useRouter();

  // Filtres d'estat
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Totes");
  const [selectedManager, setSelectedManager] = useState("Totes");
  const [onlyCnmv, setOnlyCnmv] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filtres numèrics avançats
  const [maxTer, setMaxTer] = useState<string>("");
  const [minRet1y, setMinRet1y] = useState<string>("");
  const [minRet3y, setMinRet3y] = useState<string>("");
  const [minRet5y, setMinRet5y] = useState<string>("");
  const [minRet10y, setMinRet10y] = useState<string>("");
  const [minSharpe, setMinSharpe] = useState<string>("");
  const [maxVol, setMaxVol] = useState<string>("");

  // Ordenació i Paginació
  const [sortBy, setSortBy] = useState<string>("cagr_10y");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Resultats i càrrega
  const [data, setData] = useState<ScreenerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedIsin, setCopiedIsin] = useState<string | null>(null);

  // Càrrega de dades amb debounce a la cerca
  useEffect(() => {
    let active = true;
    setLoading(true);

    const timer = setTimeout(() => {
      fetchFundsScreener({
        q: query.trim() || undefined,
        category: selectedCategory !== "Totes" ? selectedCategory : undefined,
        manager: selectedManager !== "Totes" ? selectedManager : undefined,
        only_cnmv: onlyCnmv ? true : undefined,
        max_ter: maxTer ? parseFloat(maxTer) : undefined,
        min_ret_1y: minRet1y ? parseFloat(minRet1y) : undefined,
        min_ret_3y: minRet3y ? parseFloat(minRet3y) : undefined,
        min_ret_5y: minRet5y ? parseFloat(minRet5y) : undefined,
        min_ret_10y: minRet10y ? parseFloat(minRet10y) : undefined,
        min_sharpe: minSharpe ? parseFloat(minSharpe) : undefined,
        max_volatility: maxVol ? parseFloat(maxVol) : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
      })
        .then((res) => {
          if (active) {
            setData(res);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Error carregant screener:", err);
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    query,
    selectedCategory,
    selectedManager,
    onlyCnmv,
    maxTer,
    minRet1y,
    minRet3y,
    minRet5y,
    minRet10y,
    minSharpe,
    maxVol,
    sortBy,
    sortOrder,
    page,
    pageSize,
  ]);

  const handleSort = (colKey: string) => {
    if (sortBy === colKey) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(colKey);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const resetFilters = () => {
    setQuery("");
    setSelectedCategory("Totes");
    setSelectedManager("Totes");
    setOnlyCnmv(false);
    setMaxTer("");
    setMinRet1y("");
    setMinRet3y("");
    setMinRet5y("");
    setMinRet10y("");
    setMinSharpe("");
    setMaxVol("");
    setSortBy("cagr_10y");
    setSortOrder("desc");
    setPage(1);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIsin(text);
    setTimeout(() => setCopiedIsin(null), 2000);
  };

  const getSortIcon = (colKey: string) => {
    if (sortBy !== colKey) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#00B050]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#00B050]" />
    );
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "Renda Variable":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
      case "Renda Fixa":
        return "bg-blue-50 text-blue-700 border-blue-200/60";
      case "Mixts":
        return "bg-amber-50 text-amber-700 border-amber-200/60";
      case "Monetaris":
        return "bg-cyan-50 text-cyan-700 border-cyan-200/60";
      case "Alternatius":
        return "bg-purple-50 text-purple-700 border-purple-200/60";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200/60";
    }
  };

  const formatPct = (val: number | null | undefined, suffix = "%") => {
    if (val === null || val === undefined || isNaN(val)) return <span className="text-slate-300 font-mono">-</span>;
    const isPositive = val > 0;
    const isZero = Math.abs(val) < 0.001;
    return (
      <span
        className={`font-mono font-medium ${
          isZero ? "text-slate-500" : isPositive ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {isPositive ? "+" : ""}
        {val.toFixed(2)}
        {suffix}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20">
      {/* 1. HERO CAPÇALERA */}
      <section className="bg-white border-b border-slate-200/80 pt-8 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Històric Oficial CNMV 2015–2024
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                Catàleg & Screener de Fons
              </h1>
              <p className="text-slate-600 text-sm sm:text-base max-w-2xl mt-1.5 leading-relaxed">
                Explora i filtra més de 5.700 fons d&apos;inversió comercialitzats a Espanya amb mètriques
                històriques reals auditades: CAGR 10A, volatilitat, màximes caigudes i costos oficials (TER).
              </p>
            </div>

            {/* BENTO STATS METRICS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 min-w-[130px]">
                <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-slate-400" />
                  Univers Fons
                </div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {data?.universe_stats?.total_universe?.toLocaleString() || "5.792"}
                </div>
              </div>

              <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-200/60 min-w-[130px]">
                <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Històric CNMV
                </div>
                <div className="text-lg font-bold text-emerald-800 mt-0.5">
                  {data?.universe_stats?.total_cnmv_funds?.toLocaleString() || "1.482"}
                </div>
              </div>

              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 min-w-[130px]">
                <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <Percent className="w-3 h-3 text-slate-400" />
                  TER Mitjà
                </div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {data?.universe_stats?.avg_ter ? `${data.universe_stats.avg_ter}%` : "1.24%"}
                </div>
              </div>

              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 min-w-[130px]">
                <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-slate-400" />
                  CAGR 10A Mitjà
                </div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {data?.universe_stats?.avg_cagr_10y ? `+${data.universe_stats.avg_cagr_10y}%` : "+2.49%"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BARRA DE CERCA I FILTRES */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
          {/* Línia superior: Cerca, Gestora, Toggle CNMV, Filtres Avançats */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Input de Cerca */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Cerca per nom de fons, ISIN o gestora (ex: Santander, Mutuafondo, ES0114388...)"
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00B050] focus:ring-2 focus:ring-[#00B050]/15 transition bg-slate-50/50"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selector de Gestora */}
            <div className="w-full md:w-56">
              <select
                value={selectedManager}
                onChange={(e) => {
                  setSelectedManager(e.target.value);
                  setPage(1);
                }}
                className="w-full py-2.5 px-3 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00B050] focus:ring-2 focus:ring-[#00B050]/15 bg-slate-50/50 text-slate-800"
              >
                <option value="Totes">Totes les Gestores</option>
                {data?.managers?.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({m.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Només CNMV */}
            <label className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer select-none hover:bg-slate-100/60 transition">
              <input
                type="checkbox"
                checked={onlyCnmv}
                onChange={(e) => {
                  setOnlyCnmv(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-slate-300 text-[#00B050] focus:ring-[#00B050]"
              />
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Només Històric CNMV
              </span>
            </label>

            {/* Botó Filtres Avançats */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition ${
                showAdvanced || maxTer || minRet1y || minRet3y || minRet5y || minRet10y || minSharpe || maxVol
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtres Quantitatius
              {(maxTer || minRet1y || minRet3y || minRet5y || minRet10y || minSharpe || maxVol) && (
                <span className="w-2 h-2 rounded-full bg-[#00B050]" />
              )}
            </button>

            {/* Botó Reiniciar Filtres */}
            {(query ||
              selectedCategory !== "Totes" ||
              selectedManager !== "Totes" ||
              onlyCnmv ||
              maxTer ||
              minRet1y ||
              minRet3y ||
              minRet5y ||
              minRet10y ||
              minSharpe ||
              maxVol) && (
              <button
                onClick={resetFilters}
                title="Reiniciar tots els filtres"
                className="inline-flex items-center justify-center p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Línia de Pills per Categoria */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
            <span className="text-xs font-medium text-slate-400 mr-1.5 shrink-0">Categoria:</span>
            {CATEGORY_PILLS.map((pill) => {
              const active = selectedCategory === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => {
                    setSelectedCategory(pill.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    active
                      ? "bg-[#00B050] text-white shadow-xs font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Panell de Filtres Avançats (Expandible) */}
          {showAdvanced && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  TER Màxim (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ex: 1.0"
                  value={maxTer}
                  onChange={(e) => {
                    setMaxTer(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  Min Retorn 1A (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="ex: 10.0"
                  value={minRet1y}
                  onChange={(e) => {
                    setMinRet1y(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  Min CAGR 3A (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="ex: 8.0"
                  value={minRet3y}
                  onChange={(e) => {
                    setMinRet3y(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  Min CAGR 5A (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="ex: 10.0"
                  value={minRet5y}
                  onChange={(e) => {
                    setMinRet5y(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  Min CAGR 10A (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="ex: 10.0"
                  value={minRet10y}
                  onChange={(e) => {
                    setMinRet10y(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  Min Sharpe
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ex: 0.5"
                  value={minSharpe}
                  onChange={(e) => {
                    setMinSharpe(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  Volatilitat Màx (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="ex: 18.0"
                  value={maxVol}
                  onChange={(e) => {
                    setMaxVol(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. TAULA PRINCIPAL DE FONS */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Capçalera informativa de la taula */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="text-xs text-slate-500">
              {loading ? (
                <span>Filtrant univers de fons...</span>
              ) : (
                <span>
                  S&apos;han trobat <strong className="font-semibold text-slate-900">{data?.total.toLocaleString()}</strong>{" "}
                  fons de {data?.universe_stats?.total_universe?.toLocaleString() || "5.792"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400">Files per pàgina:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="py-1 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Taula amb Scroll Horitzontal Suau */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-100/70 text-slate-600 font-semibold tracking-wider select-none">
                  <th
                    onClick={() => handleSort("fund_name")}
                    className="py-3 px-4 cursor-pointer group hover:bg-slate-200/60 transition min-w-[280px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Fons & Gestora</span>
                      {getSortIcon("fund_name")}
                    </div>
                  </th>
                  <th className="py-3 px-3 min-w-[130px]">Categoria</th>
                  <th
                    onClick={() => handleSort("ter")}
                    className="py-3 px-3 text-right cursor-pointer group hover:bg-slate-200/60 transition min-w-[80px]"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>TER</span>
                      {getSortIcon("ter")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("ret_1y")}
                    className="py-3 px-3 text-right cursor-pointer group hover:bg-slate-200/60 transition min-w-[85px]"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>1A</span>
                      {getSortIcon("ret_1y")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("cagr_3y")}
                    className="py-3 px-3 text-right cursor-pointer group hover:bg-slate-200/60 transition min-w-[95px]"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>3A (CAGR)</span>
                      {getSortIcon("cagr_3y")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("cagr_5y")}
                    className="py-3 px-3 text-right cursor-pointer group hover:bg-slate-200/60 transition min-w-[95px]"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>5A (CAGR)</span>
                      {getSortIcon("cagr_5y")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("cagr_10y")}
                    className="py-3 px-3 text-right cursor-pointer group hover:bg-slate-200/60 transition min-w-[105px] bg-emerald-50/60"
                  >
                    <div className="flex items-center justify-end gap-1.5 text-emerald-900 font-bold">
                      <span>10A (CAGR)</span>
                      {getSortIcon("cagr_10y")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("volatility")}
                    className="py-3 px-3 text-right cursor-pointer group hover:bg-slate-200/60 transition min-w-[90px]"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Volatilitat</span>
                      {getSortIcon("volatility")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("max_drawdown")}
                    className="py-3 px-3 text-right cursor-pointer group hover:bg-slate-200/60 transition min-w-[90px]"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Max DD</span>
                      {getSortIcon("max_drawdown")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("sharpe_ratio")}
                    className="py-3 px-3 text-right cursor-pointer group hover:bg-slate-200/60 transition min-w-[80px]"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Sharpe</span>
                      {getSortIcon("sharpe_ratio")}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center min-w-[130px]">Accions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  // Skeleton loader
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-4">
                        <div className="h-4 bg-slate-200 rounded-sm w-3/4 mb-1.5" />
                        <div className="h-3 bg-slate-100 rounded-sm w-1/2" />
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="h-4 bg-slate-200 rounded-sm w-20" />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="h-4 bg-slate-200 rounded-sm w-10 ml-auto" />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="h-4 bg-slate-200 rounded-sm w-12 ml-auto" />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="h-4 bg-slate-200 rounded-sm w-12 ml-auto" />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="h-4 bg-slate-200 rounded-sm w-12 ml-auto" />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="h-4 bg-slate-200 rounded-sm w-12 ml-auto" />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="h-4 bg-slate-200 rounded-sm w-10 ml-auto" />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="h-4 bg-slate-200 rounded-sm w-10 ml-auto" />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="h-4 bg-slate-200 rounded-sm w-8 ml-auto" />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="h-6 bg-slate-200 rounded-sm w-20 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : data?.funds && data.funds.length > 0 ? (
                  data.funds.map((fund) => {
                    const isCopied = copiedIsin === fund.isin;
                    const terColor =
                      fund.ter < 0.8
                        ? "text-emerald-700 font-semibold"
                        : fund.ter > 1.8
                        ? "text-rose-700 font-semibold"
                        : "text-slate-800";

                    return (
                      <tr
                        key={fund.isin}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Fons & ISIN & Gestora */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Link
                                href={`/funds/${fund.isin}`}
                                className="font-semibold text-slate-900 hover:text-[#00B050] transition block leading-tight group-hover:underline"
                              >
                                {fund.fund_name}
                              </Link>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                <span>{fund.management_company}</span>
                                <span>•</span>
                                <button
                                  onClick={() => copyToClipboard(fund.isin)}
                                  className="inline-flex items-center gap-1 font-mono text-slate-400 hover:text-slate-700 transition"
                                  title="Copiar ISIN"
                                >
                                  {fund.isin}
                                  {isCopied ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Categoria */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${getCategoryBadgeClass(
                                fund.asset_class_group
                              )}`}
                            >
                              {fund.asset_class_group}
                            </span>
                            {fund.has_cnmv_history && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/50">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                CNMV {fund.history_years ? `${fund.history_years}A` : "10A"}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* TER */}
                        <td className="py-3.5 px-3 text-right">
                          <span className={`font-mono text-xs ${terColor}`}>
                            {fund.ter ? `${fund.ter.toFixed(2)}%` : "-"}
                          </span>
                        </td>

                        {/* 1A */}
                        <td className="py-3.5 px-3 text-right">
                          {formatPct(fund.ret_1y)}
                        </td>

                        {/* 3A CAGR */}
                        <td className="py-3.5 px-3 text-right">
                          {formatPct(fund.cagr_3y)}
                        </td>

                        {/* 5A CAGR */}
                        <td className="py-3.5 px-3 text-right">
                          {formatPct(fund.cagr_5y)}
                        </td>

                        {/* 10A CAGR (Destacat) */}
                        <td className="py-3.5 px-3 text-right bg-emerald-50/40 font-semibold">
                          {formatPct(fund.cagr_10y)}
                        </td>

                        {/* Volatilitat */}
                        <td className="py-3.5 px-3 text-right">
                          {fund.volatility !== null && fund.volatility !== undefined ? (
                            <span className="font-mono text-slate-700">
                              {fund.volatility.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">-</span>
                          )}
                        </td>

                        {/* Max Drawdown */}
                        <td className="py-3.5 px-3 text-right">
                          {fund.max_drawdown !== null && fund.max_drawdown !== undefined ? (
                            <span className="font-mono text-rose-600 font-medium">
                              {fund.max_drawdown.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">-</span>
                          )}
                        </td>

                        {/* Sharpe */}
                        <td className="py-3.5 px-3 text-right">
                          {fund.sharpe_ratio !== null && fund.sharpe_ratio !== undefined ? (
                            <span
                              className={`font-mono font-medium ${
                                fund.sharpe_ratio > 0.8
                                  ? "text-emerald-700 font-bold"
                                  : fund.sharpe_ratio > 0
                                  ? "text-slate-700"
                                  : "text-rose-600"
                              }`}
                            >
                              {fund.sharpe_ratio.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">-</span>
                          )}
                        </td>

                        {/* Accions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/funds/${fund.isin}`}
                              title="Auditoria i deep dive"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <Link
                              href={`/compare?f1=${fund.isin}`}
                              title="Comparar cara a cara"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#00B050] hover:bg-emerald-50 transition"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </Link>

                            <Link
                              href={`/optimize?query=${fund.isin}`}
                              title="Cercar alternativa de baix cost"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  // Buit
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500">
                      <div className="max-w-md mx-auto space-y-3">
                        <Info className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700">
                          No s&apos;han trobat fons que coincideixin amb els filtres.
                        </p>
                        <p className="text-xs text-slate-400">
                          Prova d&apos;ampliar els criteris de cerca o reiniciar els filtres de rendibilitat i comissions.
                        </p>
                        <button
                          onClick={resetFilters}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reiniciar filtres
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 4. PAGINACIÓ */}
          {data && data.total_pages > 1 && (
            <div className="px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
              <div className="text-xs text-slate-500">
                Mostrant pàgina <strong className="font-semibold text-slate-900">{data.page}</strong> de{" "}
                <strong className="font-semibold text-slate-900">{data.total_pages}</strong> (
                {data.total.toLocaleString()} fons totals)
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {/* Pàgines dinàmiques */}
                  {Array.from({ length: Math.min(5, data.total_pages) }, (_, idx) => {
                    let pageNum = page - 2 + idx;
                    if (page <= 2) pageNum = idx + 1;
                    if (page >= data.total_pages - 2) pageNum = data.total_pages - 4 + idx;
                    if (pageNum < 1 || pageNum > data.total_pages) return null;

                    const isActive = pageNum === page;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                          isActive
                            ? "bg-[#00B050] text-white shadow-xs"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(Math.min(data.total_pages, page + 1))}
                  disabled={page >= data.total_pages}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
