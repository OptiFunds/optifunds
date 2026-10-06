"use client";

import { useState, useRef, useEffect } from "react";
import { FundSummary } from "@/lib/api";
import { Search, ChevronDown, Check } from "lucide-react";

interface FundComboboxProps {
  label: string;
  funds: FundSummary[];
  selectedIsin: string;
  onSelect: (isin: string) => void;
}

export function FundCombobox({ label, funds, selectedIsin, onSelect }: FundComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedFund = funds.find((f) => f.isin === selectedIsin);

  const filtered = funds.filter(
    (f) =>
      f.fund_name.toLowerCase().includes(search.toLowerCase()) ||
      f.isin.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
        {label}
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full surface-elevated rounded px-3 py-2 text-left flex items-center justify-between text-xs focus:outline-none focus:border-teal-500 transition-colors"
        >
          <div className="truncate pr-2">
            <span className="font-medium text-slate-100">
              {selectedFund ? selectedFund.fund_name : "Seleccionar vehicle..."}
            </span>
            {selectedFund && (
              <span className="ml-2 font-mono text-[11px] text-slate-400">
                {selectedFund.isin}
              </span>
            )}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full surface-base rounded shadow-2xl overflow-hidden border border-[#202838]">
            <div className="p-2 border-b border-[#1A202C] flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Cercar per nom o ISIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
              />
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-[#161C26]">
              {filtered.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 font-mono">
                  Sense coincidències
                </div>
              ) : (
                filtered.map((f) => (
                  <button
                    key={f.isin}
                    type="button"
                    onClick={() => {
                      onSelect(f.isin);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-[#151C28] flex items-center justify-between transition-colors group"
                  >
                    <div className="truncate pr-2">
                      <p className="font-medium text-slate-200 group-hover:text-teal-400 truncate">
                        {f.fund_name}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">{f.isin}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-mono text-[10px] text-slate-400 bg-[#0B0E14] px-1.5 py-0.5 rounded border border-[#1A202C]">
                        TER {f.ter}%
                      </span>
                      {f.isin === selectedIsin && (
                        <Check className="w-3.5 h-3.5 text-teal-400" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
