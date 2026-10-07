"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { optimizeFund, searchFunds, OptimizeResult, FundSummary } from "@/lib/api";
import { 
  Search, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeftRight,
  TrendingDown,
  Percent,
  Layers,
  ArrowUpRight,
  Plus
} from "lucide-react";

const PRESET_FUNDS = [
  { name: "Kutxabank Bolsa", isin: "ES0114388038" },
  { name: "Santander Acciones", isin: "ES0175224031" },
  { name: "BBVA Bolsa", isin: "ES0114638036" },
  { name: "CaixaBank Comunicació", isin: "ES0138045002" },
];

function OptimizeContent() {
  const searchParams = useSearchParams();
  const initialFund = searchParams.get("fund") || "ES0114388038"; // Default: Kutxabank Bolsa Estandar

  const [query, setQuery] = useState(initialFund);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<FundSummary[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [minOverlap, setMinOverlap] = useState(35);
  const [capital, setCapital] = useState(25000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const searchRef = useRef<HTMLDivElement>(null);

  // Cerca automàtica inicial en carregar la pàgina o si canvia el paràmetre URL
  useEffect(() => {
    if (initialFund) {
      setQuery(initialFund);
      handleSearch(initialFund, minOverlap);
    }
  }, [initialFund]);

  // Autocompletat: cercar fons mentre l'usuari escriu
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchFunds(searchTerm.trim())
          .then((res) => {
            setSuggestions(res);
            setShowSuggestions(true);
          })
          .catch(() => setSuggestions([]));
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Tancar suggeriments en clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (targetQuery?: string, targetOverlap?: number, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = targetQuery || query;
    const ov = targetOverlap !== undefined ? targetOverlap : minOverlap;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    try {
      const data = await optimizeFund(q.trim(), ov);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Error en cercar alternatives");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const bestAlt = result?.alternatives?.[0];

  // Projecció a 20 anys amb capitalització composta
  const rGross = 0.07;
  const months = 20 * 12;
  const rNetSrc = result ? Math.pow(1 + (rGross - result.source_ter / 100), 1 / 12) - 1 : 0;
  const capSrc = result ? capital * Math.pow(1 + rNetSrc, months) : 0;

  const rNetAlt = bestAlt ? Math.pow(1 + (rGross - bestAlt.cand_ter / 100), 1 / 12) - 1 : 0;
  const capAlt = bestAlt ? capital * Math.pow(1 + rNetAlt, months) : 0;
  const estalviTotal = capAlt - capSrc;

  return (
    <div className="bg-[#F8FAFC] min-h-screen flex flex-col font-sans pb-16">
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* TITULAR EDITORIAL */}
        <div className="space-y-2 border-b border-slate-200/80 pb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/70 uppercase tracking-wider">
              Rèplica Passiva & Reducció de Comissions
            </span>
            <span className="text-xs text-slate-400 font-mono">UCITS / Lipper Database</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight leading-snug">
            Smart Switch: <span className="text-[#00B050]">Substitució Indexada</span>
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            Troba rèpliques fidels de baix cost basades en el solapament real de valors en cartera (look-through), reduint costos de gestió sense alterar la teva estratègia d&apos;inversió.
          </p>
        </div>

        {/* SELECTOR I FORMULARI D'ANÀLISI BENTO */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-5">
          <form onSubmit={(e) => handleSearch(query, minOverlap, e)} className="grid grid-cols-1 lg:grid-cols-[1fr,240px,auto] gap-4 items-end">
            
            {/* Input amb autocompletat */}
            <div className="relative" ref={searchRef}>
              <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                ISIN o Nom del Fons a Optimitzar
              </label>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchTerm(e.target.value);
                  }}
                  onFocus={() => {
                    if (searchTerm.length >= 2) setShowSuggestions(true);
                  }}
                  placeholder="Ex: Kutxabank Bolsa, Santander, BBVA..."
                  className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#00B050] focus:ring-1 focus:ring-[#00B050] transition-colors shadow-2xs"
                />
              </div>

              {/* Llista desplegable de suggeriments */}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto text-xs divide-y divide-slate-100 py-1">
                  {suggestions.map((item) => (
                    <li
                      key={item.isin}
                      onClick={() => {
                        setQuery(item.isin);
                        setShowSuggestions(false);
                        handleSearch(item.isin, minOverlap);
                      }}
                      className="px-4 py-2.5 hover:bg-emerald-50/50 cursor-pointer transition-colors flex justify-between items-center group"
                    >
                      <div className="pr-2 truncate">
                        <p className="font-semibold text-slate-900 group-hover:text-[#00B050] transition-colors truncate">
                          {item.fund_name}
                        </p>
                        <span className="font-mono text-[10px] text-slate-400">{item.isin}</span>
                      </div>
                      <span className="font-mono text-xs text-slate-700 bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-800 px-2 py-0.5 rounded font-semibold shrink-0">
                        {Number(item.ter ?? 1.25).toFixed(2)}% TER
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Slider de solapament mínim */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-900 uppercase tracking-wider">
                <span>Solapament Mínim</span>
                <span className="text-[#00B050] font-mono font-bold">{minOverlap}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                step="5"
                value={minOverlap}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMinOverlap(val);
                  handleSearch(query, val);
                }}
                className="w-full accent-[#00B050] cursor-pointer"
              />
            </div>

            {/* Botó d'acció */}
            <button
              type="submit"
              disabled={loading}
              className="h-[46px] px-6 rounded-2xl bg-[#00B050] hover:bg-[#009945] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-100" />
              <span>{loading ? "Analitzant..." : "Optimitzar"}</span>
            </button>
          </form>

          {/* Presets ràpids d'un clic */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap text-xs">
            <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold mr-1">Exemples populars:</span>
            {PRESET_FUNDS.map((p) => (
              <button
                key={p.isin}
                type="button"
                onClick={() => {
                  setQuery(p.isin);
                  handleSearch(p.isin, minOverlap);
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-200/80 text-[11px] font-medium transition-colors"
              >
                <span>{p.name}</span>
                <ArrowUpRight className="w-2.5 h-2.5 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* RESULTATS DE L'OPTIMITZACIÓ */}
        {result && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* TARGETES CARA A CARA: ORIGINAL VS MILLOR ALTERNATIVA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Fons Original */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                      Fons Comercial Actual
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2 leading-snug">
                      {result.source_name}
                    </h3>
                    <span className="text-xs font-mono text-slate-400">ISIN: {result.source_isin}</span>
                  </div>
                  <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    TER: {result.source_ter.toFixed(2)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Comissió de Gestió</span>
                    <span className="text-lg font-bold font-mono text-rose-600 mt-0.5 block">{result.source_ter.toFixed(2)}% anual</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Retorn a 3 Anys</span>
                    <span className="text-lg font-bold font-mono text-slate-800 mt-0.5 block">
                      {result.source_ret3y != null ? `${result.source_ret3y.toFixed(2)}%` : "N/D"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Millor Alternativa */}
              {bestAlt ? (
                <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-[#00B050]/80 shadow-xs space-y-4 relative">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1 w-fit">
                        <Sparkles className="w-3 h-3 text-[#00B050]" /> Millor Rèplica Recomanada
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2 leading-snug">
                        {bestAlt.cand_name}
                      </h3>
                      <span className="text-xs font-mono text-slate-400">ISIN: {bestAlt.cand_isin}</span>
                    </div>
                    <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-50 text-[#00B050] border border-emerald-200">
                      TER: {bestAlt.cand_ter.toFixed(2)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Solapament Efectiu</span>
                      <span className="text-lg font-bold font-mono text-[#00B050] mt-0.5 block">
                        {bestAlt.overlap > 0 ? `${bestAlt.overlap.toFixed(1)}%` : "Perfil Homologat"}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Estalvi Anual de TER</span>
                      <span className="text-lg font-bold font-mono text-emerald-700 mt-0.5 block">
                        -{bestAlt.ter_savings.toFixed(2)}% anual
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                    <Link
                      href={`/portfolio?add=${bestAlt.cand_isin}&name=${encodeURIComponent(bestAlt.cand_name)}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>+ Cartera</span>
                    </Link>
                    <Link
                      href={`/compare?f1=${result.source_isin}&f2=${bestAlt.cand_isin}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
                      <span>Comparar Cara a Cara</span>
                    </Link>
                    <Link
                      href={`/funds/${bestAlt.cand_isin}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#00B050] text-xs font-semibold transition-colors ml-auto"
                    >
                      <span>Fitxa</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : null}

            </div>

            {/* AVISOS I FALLBACKS */}
            {result.message && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{result.message}</p>
              </div>
            )}

            {result.status === "already_optimal" && (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#00B050] shrink-0 mt-0.5" />
                <p className="leading-relaxed">Vehicle ja optimitzat. Aquest fons disposa d&apos;una de les ràtios de cost més eficients del mercat per a la seva categoria.</p>
              </div>
            )}

            {bestAlt && (
              <>
                {/* SIMULACIÓ PATRIMONIAL A 20 ANYS */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-[#00B050] border border-emerald-200">
                          Horitzó Temporal: 20 Anys
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Simulació d&apos;Estalvi Patrimonial Acumulat
                      </h3>
                      <p className="text-xs text-slate-500">
                        Impacte de l&apos;estalvi anual de comissions reinvertit amb interès compost (7% brut anual)
                      </p>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
                      <label className="text-xs font-mono font-medium text-slate-600">Capital Inicial:</label>
                      <input
                        type="number"
                        step="5000"
                        min="1000"
                        value={capital}
                        onChange={(e) => setCapital(Number(e.target.value) || 0)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono font-bold w-32 text-right focus:outline-none focus:border-[#00B050]"
                      />
                      <span className="text-xs font-mono font-bold text-slate-500">€</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold block">Capital amb Fons Actual</span>
                      <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-800 mt-2">
                        {Math.round(capSrc).toLocaleString("ca-ES")} €
                      </p>
                      <span className="text-[11px] text-slate-500 mt-1 block">Rendiment net: {(7 - result.source_ter).toFixed(2)}%/any</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80">
                      <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold block">Capital amb Rèplica Indexada</span>
                      <p className="text-2xl sm:text-3xl font-extrabold font-mono text-[#00B050] mt-2">
                        {Math.round(capAlt).toLocaleString("ca-ES")} €
                      </p>
                      <span className="text-[11px] text-slate-500 mt-1 block">Rendiment net: {(7 - bestAlt.cand_ter).toFixed(2)}%/any</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#0A0A0A] text-white">
                      <span className="text-[11px] font-mono uppercase text-emerald-400 font-semibold block">Estalvi Net Extra Generat</span>
                      <p className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 mt-2">
                        +{Math.round(estalviTotal).toLocaleString("ca-ES")} €
                      </p>
                      <span className="text-[11px] text-slate-400 mt-1 block">Diferencial monetari exclusiu de costos</span>
                    </div>
                  </div>
                </div>

                {/* TAULA DE TOTES LES ALTERNATIVES */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Catàleg d&apos;Alternatives Homologades ({result.alternatives.length})
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ordenades per màxim solapament de cartera i major estalvi de comissions
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-5">Alternativa Indexada / ETF</th>
                          <th className="py-3 px-5 text-right">Solapament</th>
                          <th className="py-3 px-5 text-right">Comissió TER</th>
                          <th className="py-3 px-5 text-right">Estalvi TER</th>
                          <th className="py-3 px-5 text-right">Gap Retorn (3Y)</th>
                          <th className="py-3 px-5 text-right">Accions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.alternatives.map((alt, idx) => (
                          <tr key={alt.cand_isin + idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-5">
                              <p className="font-semibold text-slate-900">{alt.cand_name}</p>
                              <span className="text-[10px] font-mono text-slate-400">{alt.cand_isin}</span>
                            </td>
                            <td className="py-3.5 px-5 text-right font-mono font-bold text-[#00B050]">
                              {alt.overlap > 0 ? `${alt.overlap.toFixed(1)}%` : "Perfil Idèntic"}
                            </td>
                            <td className="py-3.5 px-5 text-right font-mono text-slate-700 font-semibold">
                              {alt.cand_ter.toFixed(2)}%
                            </td>
                            <td className="py-3.5 px-5 text-right font-mono text-emerald-700 font-bold">
                              -{alt.ter_savings.toFixed(2)}%
                            </td>
                            <td className="py-3.5 px-5 text-right font-mono text-slate-600">
                              {alt.ret_gap_3y != null ? `${alt.ret_gap_3y > 0 ? "+" : ""}${alt.ret_gap_3y.toFixed(2)}%` : "N/D"}
                            </td>
                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link
                                  href={`/portfolio?add=${alt.cand_isin}&name=${encodeURIComponent(alt.cand_name)}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                                  title="Afegir fons a la cartera"
                                >
                                  <Plus className="w-3.5 h-3.5 text-[#00B050]" />
                                  <span>+ Cartera</span>
                                </Link>
                                <Link
                                  href={`/compare?f1=${result.source_isin}&f2=${alt.cand_isin}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                                  title="Comparar cara a cara"
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Comparar</span>
                                </Link>
                                <Link
                                  href={`/funds/${alt.cand_isin}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#00B050] text-xs font-semibold transition-colors"
                                  title="Veure fitxa completa"
                                >
                                  <span>Fitxa</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

          </div>
        )}

      </main>
    </div>
  );
}

export default function OptimizePage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-xs font-mono text-slate-400">Carregant Smart Switch...</div>}>
      <OptimizeContent />
    </Suspense>
  );
}