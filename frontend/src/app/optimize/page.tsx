"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { optimizeFund, searchFunds, OptimizeResult, FundSummary } from "@/lib/api";
import { Search, Sparkles, ShieldCheck, AlertCircle, Info, CheckCircle2 } from "lucide-react";

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

  // Cerca automàtica inicial en carregar la pàgina
  useEffect(() => {
    if (initialFund) {
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
    }, 300);

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
    <div className="p-10 max-w-6xl space-y-8">
      {/* Capçalera */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Optimitza el teu Fons d'Inversió
          </h1>
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            Smart Switch
          </span>
        </div>
        <p className="text-xs text-slate-500 max-w-xl">
          Introdueix l'ISIN o nom d'un vehicle de gestió activa per localitzar automàticament indexats o ETFs equivalents amb menors comissions basats en el solapament real de cartera.
        </p>
      </div>

      {/* Formulari de Cerca amb Autocompletat */}
      <form onSubmit={(e) => handleSearch(query, minOverlap, e)} className="grid grid-cols-1 md:grid-cols-[1fr,200px,auto] gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm items-end">
        <div className="relative" ref={searchRef}>
          <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2">
            ISIN o Nom del Fons Comercial
          </label>
          <div className="relative">
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
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 pl-9 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Llista desplegable de suggeriments d'autocompletat */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto text-xs divide-y divide-slate-100">
              {suggestions.map((item) => (
                <li
                  key={item.isin}
                  onClick={() => {
                    setQuery(item.isin);
                    setShowSuggestions(false);
                    handleSearch(item.isin, minOverlap);
                  }}
                  className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer transition-colors flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.fund_name}</p>
                    <span className="font-mono text-[10px] text-slate-400">{item.isin}</span>
                  </div>
                  <span className="font-mono text-xs text-emerald-600 font-semibold">
                    {Number(item.ter ?? 1.25).toFixed(2)}% TER
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2">
            Solapament Mínim: {minOverlap}%
          </label>
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
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {loading ? "Analitzant..." : "Optimitzar"}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Fitxa del fons d'origen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400">Vehicle Analitzat</span>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{result.source_name}</p>
              <p className="text-[11px] font-mono text-slate-500">{result.source_isin}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400">TER Actual</span>
              <p className="text-xl font-mono text-rose-600 font-semibold mt-0.5">{result.source_ter.toFixed(2)}%</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400">Retorn 3 Anys</span>
              <p className="text-xl font-mono text-slate-700 mt-0.5">
                {result.source_ret3y != null ? `${result.source_ret3y.toFixed(2)}%` : "N/D"}
              </p>
            </div>
          </div>

          {/* Missatge informatiu o Fallback */}
          {result.message && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>{result.message}</p>
            </div>
          )}

          {result.status === "already_optimal" && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>Vehicle ja optimitzat. Aquest fons té una de les comissions més baixes del mercat per a la seva categoria.</p>
            </div>
          )}

          {bestAlt && (
            <>
              {/* Sentència d'impacte */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-semibold text-emerald-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Alternativa Òptima Detectada
                </p>
                <p>
                  El vehicle <strong>{bestAlt.cand_name}</strong> ({bestAlt.cand_isin}) {bestAlt.overlap > 0 ? (
                    <>és un <strong>{bestAlt.overlap.toFixed(1)}% idèntic</strong> en composició de cartera</>
                  ) : (
                    <>pertany a la mateixa categoria i perfil d&apos;actius</>
                  )} i t&apos;estalvia un <strong>{bestAlt.ter_savings.toFixed(2)}% anual</strong> en comissions de gestió.
                </p>
              </div>

              {/* Projecció d'estalvi */}
              <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl space-y-4">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                      Simulació de Traspàs Patrimonial (Horitzó 20 Anys)
                    </h3>
                    <p className="text-[11px] text-slate-500">Càlcul basat en diferència composta de comissions</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-mono text-slate-500">Capital (€):</label>
                    <input
                      type="number"
                      step="5000"
                      value={capital}
                      onChange={(e) => setCapital(Number(e.target.value) || 0)}
                      className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-900 font-mono w-28 text-right focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">Capital amb Fons Actual</span>
                    <p className="text-xl font-mono text-slate-700 mt-1">{Math.round(capSrc).toLocaleString()} €</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">Capital amb l&apos;Alternativa</span>
                    <p className="text-xl font-mono text-emerald-600 font-semibold mt-1">{Math.round(capAlt).toLocaleString()} €</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">Estalvi Net Generat</span>
                    <p className="text-xl font-mono text-emerald-700 font-semibold mt-1">+{Math.round(estalviTotal).toLocaleString()} €</p>
                  </div>
                </div>
              </div>

              {/* Taula d'alternatives */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                    Totes les Alternatives Identificades ({result.alternatives.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Alternativa Indexada / ETF</th>
                        <th className="py-2.5 px-4 text-right">Solapament</th>
                        <th className="py-2.5 px-4 text-right">TER</th>
                        <th className="py-2.5 px-4 text-right">Estalvi TER</th>
                        <th className="py-2.5 px-4 text-right">Gap Retorn (3Y)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.alternatives.map((alt, idx) => (
                        <tr key={alt.cand_isin + idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{alt.cand_name}</p>
                            <span className="text-[10px] font-mono text-slate-400">{alt.cand_isin}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                            {alt.overlap > 0 ? `${alt.overlap.toFixed(1)}%` : "0.0% (Cat)"}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700">{alt.cand_ter.toFixed(2)}%</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600 font-medium">-{alt.ter_savings.toFixed(2)}%</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {alt.ret_gap_3y != null ? `${alt.ret_gap_3y > 0 ? "+" : ""}${alt.ret_gap_3y.toFixed(2)}%` : "N/D"}
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
    </div>
  );
}

export default function OptimizePage() {
  return (
    <Suspense fallback={<div className="p-10 text-xs text-slate-400">Carregant Smart Switch...</div>}>
      <OptimizeContent />
    </Suspense>
  );
}