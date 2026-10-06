"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchFunds, FundSummary } from "@/lib/api";
import { Search, X, ArrowRight, Building2 } from "lucide-react";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FundSummary[]>([]);
  const [initialFunds, setInitialFunds] = useState<FundSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Carrega fons reals de la base de dades en iniciar
  useEffect(() => {
    searchFunds("")
      .then((data) => setInitialFunds(data.slice(0, 6)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };

    const handleCustomOpen = () => setOpen(true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-menu", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-menu", handleCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      searchFunds(query.trim())
        .then((res) => setResults(res))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (isin: string) => {
    setOpen(false);
    router.push(`/funds/${isin}`);
  };

  if (!open) return null;

  const displayList = query.trim() ? results : initialFunds;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div 
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
        onClick={() => setOpen(false)}
      />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[560px]">
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per nom, gestora o ISIN (ex: Vanguard, Magallanes, Cobas...)"
            className="w-full text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
          />
          {loading && (
            <span className="text-[11px] font-mono text-slate-400 animate-pulse">Cercant...</span>
          )}
          <button 
            onClick={() => setOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-2 divide-y divide-slate-100/60">
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">
            {query.trim() ? `Resultats (${results.length})` : "Fons Disponibles a la Base de Dades"}
          </div>

          {displayList.length === 0 && !loading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              No s'ha trobat cap vehicle per a "{query}".
            </div>
          ) : (
            displayList.map((fund) => (
              <div
                key={fund.isin}
                onClick={() => handleSelect(fund.isin)}
                className="group flex items-center justify-between p-3 rounded-xl hover:bg-emerald-50/70 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center text-slate-500 group-hover:text-emerald-700 transition-colors shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 group-hover:text-emerald-950 transition-colors">
                      {fund.fund_name}
                    </p>
                    <span className="text-[11px] font-mono text-slate-400 group-hover:text-emerald-800/80">
                      {fund.isin}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80 group-hover:bg-white group-hover:text-emerald-800 group-hover:border-emerald-200">
                    {Number(fund.ter ?? 1.25).toFixed(2)}% TER
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Prem qualsevol fons per obrir la Fitxa 360°</span>
          <div className="flex items-center gap-2">
            <span>Tancar:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 text-[10px]">
              ESC
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}