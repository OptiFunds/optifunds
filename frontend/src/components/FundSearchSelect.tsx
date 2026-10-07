"use client";

import { useState, useRef, useEffect } from "react";
import { searchFunds, FundSummary } from "@/lib/api";
import { Search, X, Check, ChevronDown, Sparkles, Building2, RefreshCw } from "lucide-react";

interface FundSearchSelectProps {
  label: string;
  badgeText: string;
  currentIsin: string;
  currentName: string;
  currentTer?: number | null;
  accentColor: "blue" | "emerald";
  onSelect: (isin: string) => void;
  disabledIsin?: string; // Evita seleccionar el mateix fons que l'altre costat
}

const POPULAR_FUNDS_SUGGESTIONS: FundSummary[] = [
  { isin: "ES0114388038", fund_name: "Kutxabank Bolsa Estandar, FI", ter: 2.00 },
  { isin: "ES0105336038", fund_name: "Accion IBEX 35 ETF, FI Cotizado", ter: 0.82 },
  { isin: "ES0175224031", fund_name: "Santander Small Caps Espana A, FI", ter: 2.12 },
  { isin: "ES0114638036", fund_name: "Bestinver Internacional, FI", ter: 1.80 },
  { isin: "ES0114573001", fund_name: "Bindex Espana Indice, FI", ter: 0.59 },
  { isin: "ES0152769032", fund_name: "ING Direct Fondo Naranja S&P 500, FI", ter: 1.09 },
  { isin: "ES0138045002", fund_name: "Caixabank Monetario Rendimiento FI", ter: 1.00 },
];

export function FundSearchSelect({
  label,
  badgeText,
  currentIsin,
  currentName,
  currentTer,
  accentColor,
  onSelect,
  disabledIsin,
}: FundSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FundSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tancar en fer clic fora o prémer Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Enfocar l'input automàticament en obrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Cerca amb debounce de 180 ms connectada a l'API DuckDB
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      searchFunds(query.trim())
        .then((data) => {
          setResults(data);
        })
        .catch((err) => {
          console.error("Error cercant fons:", err);
          setResults([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  const isBlue = accentColor === "blue";
  const badgeClass = isBlue
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-emerald-50 text-emerald-800 border-emerald-200";

  const buttonBorderHover = isBlue ? "hover:border-blue-300" : "hover:border-emerald-300";
  const ringFocus = isBlue ? "focus:ring-blue-500/20 focus:border-blue-500" : "focus:ring-[#00B050]/20 focus:border-[#00B050]";
  const textHighlight = isBlue ? "text-blue-600" : "text-[#00B050]";

  const listToDisplay = query.trim()
    ? results
    : POPULAR_FUNDS_SUGGESTIONS.filter((f) => f.isin !== currentIsin);

  return (
    <div className="relative" ref={containerRef}>
      {/* Targeta Capçalera Clicable per seleccionar fons */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${badgeClass}`}
          >
            {!isBlue && <Sparkles className="w-3 h-3 text-emerald-600" />}
            {badgeText}
          </span>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`text-xs font-semibold ${textHighlight} hover:underline flex items-center gap-1`}
          >
            <span>{isOpen ? "Tancar cerca" : "Canviar fons"}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Fons Actualment Seleccionat */}
        <div
          onClick={() => setIsOpen(true)}
          className={`cursor-pointer rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50/80 transition-all shadow-2xs ${buttonBorderHover}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
                {currentName || "Selecciona un vehicle..."}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-xs">
                <span className="font-mono text-slate-400 text-[11px]">{currentIsin}</span>
                {currentTer !== undefined && currentTer !== null && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono font-medium text-slate-600 text-[11px]">
                      TER {currentTer.toFixed(2)}%
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className={`p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500`}>
              <Search className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Popover / Menú desplegable de cerca ràpida */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden transition-all animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Caixa de text de cerca */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escriu el nom o ISIN del fons (ex: BBVA, Kutxabank, ES01...)"
              className={`w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden py-1`}
            />
            {loading && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />}
            {query && !loading && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Llista de resultats / suggeriments */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
            {!query.trim() && (
              <div className="px-3.5 py-2 bg-slate-100/50 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                Fons Recomanats & Més Comparats
              </div>
            )}

            {listToDisplay.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-mono">
                {loading ? "Cercant al catàleg de 5.792 fons..." : "No s'ha trobat cap fons amb aquest nom o ISIN."}
              </div>
            ) : (
              listToDisplay.map((f) => {
                const isSelected = f.isin === currentIsin;
                const isDisabled = f.isin === disabledIsin;

                return (
                  <button
                    key={f.isin}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) {
                        onSelect(f.isin);
                        setIsOpen(false);
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? "bg-slate-50 font-semibold"
                        : isDisabled
                        ? "opacity-40 cursor-not-allowed bg-slate-50/30"
                        : "hover:bg-slate-50/80 cursor-pointer"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 truncate">
                          {f.fund_name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Actual
                          </span>
                        )}
                        {isDisabled && (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            Ja seleccionat a l&apos;altre costat
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                        <span>{f.isin}</span>
                        {f.category && (
                          <>
                            <span>•</span>
                            <span className="font-sans text-slate-500">{f.category}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80">
                        TER {f.ter ? `${f.ter.toFixed(2)}%` : "1.25%"}
                      </span>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
