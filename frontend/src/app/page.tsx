"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  ArrowUpRight, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Calculator, 
  ArrowLeftRight,
  BarChart3,
  TrendingUp,
  Percent,
  Database,
  Search,
  Activity,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";

interface TopFundItem {
  name: string;
  isin: string;
  manager: string;
  category: string;
  ter: number;
  ret1Y: number;
  ret3Y: number;
  ret5Y: number;
  sharpe: number;
}

const MARKET_TICKERS = [
  { name: "IBEX 35 Net TR", value: "11.840 pts", change: "+14.2% 1A", isPositive: true },
  { name: "S&P 500 Index", value: "5.850 pts", change: "+21.8% 1A", isPositive: true },
  { name: "MSCI World Net TR", value: "3.710 pts", change: "+19.4% 1A", isPositive: true },
  { name: "Euro Stoxx 50", value: "4.980 pts", change: "+12.6% 1A", isPositive: true },
  { name: "Euríbor 12M", value: "2.68%", change: "-1.48% 1A", isPositive: false },
];

const MONITORED_FUNDS: TopFundItem[] = [
  {
    name: "CaixaBank Comunicació Mundial FI",
    isin: "ES0138045002",
    manager: "CaixaBank Asset Management",
    category: "Renda Variable Global",
    ter: 1.85,
    ret1Y: 18.42,
    ret3Y: 12.15,
    ret5Y: 14.30,
    sharpe: 0.82
  },
  {
    name: "Santander Acciones Españolas FI",
    isin: "ES0175224031",
    manager: "Santander Asset Management",
    category: "Renda Variable Espanya",
    ter: 1.70,
    ret1Y: 16.85,
    ret3Y: 11.20,
    ret5Y: 9.45,
    sharpe: 0.74
  },
  {
    name: "BBVA Bolsa FI",
    isin: "ES0114638036",
    manager: "BBVA Asset Management",
    category: "Renda Variable Espanya",
    ter: 1.65,
    ret1Y: 15.30,
    ret3Y: 9.80,
    ret5Y: 8.90,
    sharpe: 0.69
  },
  {
    name: "Magallanes European Equity M FI",
    isin: "ES0159259011",
    manager: "Magallanes Value Investors",
    category: "Renda Variable Europa",
    ter: 1.85,
    ret1Y: 22.58,
    ret3Y: 14.10,
    ret5Y: 11.85,
    sharpe: 0.94
  },
  {
    name: "Azvalor Internacional FI",
    isin: "ES0165144004",
    manager: "Azvalor Asset Management",
    category: "Renda Variable Global",
    ter: 1.80,
    ret1Y: 10.74,
    ret3Y: 18.60,
    ret5Y: 16.20,
    sharpe: 1.05
  },
  {
    name: "Kutxabank Bolsa Estandar FI",
    isin: "ES0114388038",
    manager: "Kutxabank Gestión",
    category: "Renda Variable Espanya",
    ter: 1.85,
    ret1Y: 14.90,
    ret3Y: 9.15,
    ret5Y: 7.80,
    sharpe: 0.62
  }
];

export default function HomePage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/funds?q=${encodeURIComponent(searchInput.trim())}`);
    } else {
      router.push("/funds");
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen flex flex-col font-sans pb-16">

      {/* 1. TICKER DE MERCAT SUPERIOR INSTITUCIONAL */}
      <div className="w-full bg-white border-b border-slate-200/80 overflow-x-auto scrollbar-none py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6 text-xs font-mono">
          <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Índexs de Mercat:
            </span>
            {MARKET_TICKERS.map((t) => (
              <div key={t.name} className="flex items-center gap-2">
                <span className="text-slate-700 font-medium">{t.name}</span>
                <span className="text-slate-900 font-bold">{t.value}</span>
                <span className={t.isPositive ? "text-emerald-700 font-semibold" : "text-rose-600 font-semibold"}>
                  {t.change}
                </span>
              </div>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-2 text-slate-500 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>Registre Oficial CNMV & Lipper</span>
          </div>
        </div>
      </div>

      {/* 2. CAPÇALERA PORTAL I BUSCADOR CENTRAL */}
      <section className="w-full bg-white border-b border-slate-200/80 py-10 sm:py-14">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-medium">
              <span>Auditoria Fiduciària</span>
              <span className="text-slate-300">•</span>
              <span>Transparència MiFID II</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-950">
              OptiFunds Analytics
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
              Plataforma professional d&apos;auditoria quantitativa de fons d&apos;inversió, anàlisi de comissions (TER), detecció de desviació indexada i construcció de carteres fiduciàries.
            </p>
          </div>

          {/* BUSCADOR INSTITUCIONAL ESTIL KOYFIN / MORNINGSTAR */}
          <div className="max-w-2xl pt-2">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Cerca un fons per nom, ISIN o gestora (ex: Santander, Magallanes, ES0114388...)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-28 py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-[#00B050] focus:ring-2 focus:ring-[#00B050]/15 focus:outline-hidden transition-all shadow-2xs"
              />
              <button
                type="submit"
                className="absolute right-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold transition cursor-pointer"
              >
                Cercar
              </button>
            </form>

            <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500 overflow-x-auto whitespace-nowrap">
              <span className="text-slate-400">Exemples:</span>
              <button
                type="button"
                onClick={() => router.push("/funds/ES0114388038")}
                className="hover:text-slate-900 underline underline-offset-2 decoration-slate-300 cursor-pointer"
              >
                Kutxabank Bolsa
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => router.push("/funds/ES0175224031")}
                className="hover:text-slate-900 underline underline-offset-2 decoration-slate-300 cursor-pointer"
              >
                Santander Acciones
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => router.push("/funds/FR0000447823")}
                className="hover:text-slate-900 underline underline-offset-2 decoration-slate-300 cursor-pointer"
              >
                AXA Trésor (Monetari)
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => router.push("/funds/IE00B03HD191")}
                className="hover:text-slate-900 underline underline-offset-2 decoration-slate-300 cursor-pointer"
              >
                Vanguard Global Stock
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 3. COBERTURA DEL SISTEMA (MÈTRIQUES INSTITUCIONALS) */}
      <section className="w-full py-8 border-b border-slate-200/80 bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                Data Points
              </div>
              <div className="text-2xl font-bold font-mono text-slate-950 tracking-tight">11.006.232</div>
              <div className="text-[11px] text-slate-500">Sèries de NAV diari 2015–2026</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                Univers de Fons
              </div>
              <div className="text-2xl font-bold font-mono text-slate-950 tracking-tight">5.792</div>
              <div className="text-[11px] text-slate-500">Vehicles auditats a Espanya</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Posicions en Cartera
              </div>
              <div className="text-2xl font-bold font-mono text-slate-950 tracking-tight">111.172</div>
              <div className="text-[11px] text-slate-500">Accions i títols look-through</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Dades Regulades
              </div>
              <div className="text-2xl font-bold font-mono text-slate-950 tracking-tight">100%</div>
              <div className="text-[11px] text-slate-500">Registres oficials de la CNMV</div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. SUITE D'EINES QUANTITATIVES (MÒDULS ANALÍTICS) */}
      <section className="w-full py-10 sm:py-12">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/80 pb-3">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Suite d&apos;Eines
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
                Mòduls d&apos;Anàlisi Quantitativa
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              Eines estructurades per a l&apos;auditoria de costos, avaluació de risc i selecció de carteres d&apos;alta eficiència.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* MÒDUL 1: SCREENER */}
            <Link
              href="/funds"
              className="bg-white rounded-xl p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Catàleg Oficial</span>
                </div>
                <h3 className="text-sm font-bold text-slate-950 group-hover:text-emerald-800 transition-colors">
                  Catàleg & Screener de Fons
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Exploració i filtratge d&apos;univers de fons per rendibilitat històrica (1A, 3A, 5A, 10A), ràtio de Sharpe, volatilitat anualitzada, caiguda màxima i costos oficials (TER).
                </p>
              </div>
              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>5.792 fons indexats</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* MÒDUL 2: COMPARADOR 1:1 */}
            <Link
              href="/compare"
              className="bg-white rounded-xl p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Look-Through 1:1</span>
                </div>
                <h3 className="text-sm font-bold text-slate-950 group-hover:text-emerald-800 transition-colors">
                  Comparador Cara a Cara
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enfrontament de dos fons d&apos;inversió: càlcul del solapament microscòpic de títols compartits en cartera, correlació estadística i comparativa de trajectòria de preus.
                </p>
              </div>
              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Diagnòstic de Duplicitat</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* MÒDUL 3: CLOSET INDEXING */}
            <Link
              href="/closet-indexing"
              className="bg-white rounded-xl p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Cremers & Petajisto</span>
                </div>
                <h3 className="text-sm font-bold text-slate-950 group-hover:text-emerald-800 transition-colors">
                  Auditor d&apos;Active Share (Closet Indexing)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Avaluació de la convicció de gestió activa respecte al benchmark de mercat. Quantificació del TER efectiu aplicat sobre la fracció que realment es gestiona de manera independent.
                </p>
              </div>
              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Informe MiFID II en PDF</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* MÒDUL 4: SMART SWITCH */}
            <Link
              href="/optimize"
              className="bg-white rounded-xl p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Eficiència de Costos</span>
                </div>
                <h3 className="text-sm font-bold text-slate-950 group-hover:text-emerald-800 transition-colors">
                  Optimitzador d&apos;Alternatives (Smart Switch)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Localització de vehicles indexats i d&apos;alta eficiència de costos amb màxim solapament de cartera respecte al fons analitzat, per reduir despeses mantenint l&apos;exposició d&apos;actius.
                </p>
              </div>
              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Rèplica Passiva de Baix Cost</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* MÒDUL 5: PORTFOLIO BUILDER */}
            <Link
              href="/portfolio"
              className="bg-white rounded-xl p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Markowitz MPT</span>
                </div>
                <h3 className="text-sm font-bold text-slate-950 group-hover:text-emerald-800 transition-colors">
                  Constructor i Anàlisi de Carteres
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Optimització de frontera eficient mitjançant teoria moderna de carteres, matriu de correlacions creuades, desglossament sectorial i geogràfic, i backtest històric oficial.
                </p>
              </div>
              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Assignació d&apos;Actius & MPT</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* MÒDUL 6: SIMULADOR TER */}
            <Link
              href="/simulator"
              className="bg-white rounded-xl p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Capitalització Composta</span>
                </div>
                <h3 className="text-sm font-bold text-slate-950 group-hover:text-emerald-800 transition-colors">
                  Simulador de Despeses i Capitalització
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Modelització matemàtica de l&apos;impacte temporal de les comissions de gestió (TER) sobre el capital net acumulat a 10, 20 i 30 anys vista.
                </p>
              </div>
              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Erosió Patrimonial per Comissions</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* 5. MONITOR DE FONS DE MERCAT (TAULA INSTITUCIONAL) */}
      <section className="w-full">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-950 flex items-center gap-2">
                  <span>Monitor de Fons Representatius</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-normal text-slate-500">Mètriques Històriques Reals CNMV</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Fons comercials nacionals d&apos;elevat volum patrimonial
                </p>
              </div>
              <Link
                href="/funds"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-950 self-start sm:self-center"
              >
                <span>Veure univers complet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80 bg-slate-50/60 font-mono">
                    <th scope="col" className="py-2.5 px-4 font-medium">Vehicle & ISIN</th>
                    <th scope="col" className="py-2.5 px-3 font-medium">Gestora</th>
                    <th scope="col" className="py-2.5 px-3 font-medium">Categoria</th>
                    <th scope="col" className="py-2.5 px-3 text-right font-medium">TER</th>
                    <th scope="col" className="py-2.5 px-3 text-right font-medium">1 Any</th>
                    <th scope="col" className="py-2.5 px-3 text-right font-medium">3 Anys</th>
                    <th scope="col" className="py-2.5 px-3 text-right font-medium">5 Anys</th>
                    <th scope="col" className="py-2.5 px-4 text-right font-medium">Sharpe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MONITORED_FUNDS.map((f) => (
                    <tr 
                      key={f.isin} 
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/funds/${f.isin}`)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors flex items-center gap-1.5">
                          <span>{f.name}</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-emerald-700 shrink-0" />
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{f.isin}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-[180px]">
                        {f.manager}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {f.category}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                        {f.ter.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-emerald-700">
                        +{f.ret1Y.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-emerald-700">
                        +{f.ret3Y.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-emerald-700">
                        +{f.ret5Y.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {f.sharpe.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Univers total: 5.792 fons auditats</span>
              <span>Dades oficials diàries de preus liquidatius CNMV</span>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
