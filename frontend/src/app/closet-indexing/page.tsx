"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  Percent,
  Layers,
  Download
} from "lucide-react";
import { searchFunds, auditClosetIndexing, getFundAuditPdfUrl, FundSummary, ClosetIndexResponse } from "@/lib/api";

const DEFAULT_BENCHMARKS = [
  { isin: "IE00B03HD191", name: "Vanguard Global Stock Index EUR Acc (TER 0.18%)" },
  { isin: "IE00B5BMR087", name: "iShares Core S&P 500 UCITS ETF (TER 0.07%)" },
  { isin: "LU0389811885", name: "Amundi Core MSCI Europe AE Acc (TER 0.12%)" },
  { isin: "LU0996182563", name: "Amundi Index MSCI World UCITS ETF (TER 0.18%)" },
];

export default function ClosetIndexingPage() {
  const router = useRouter();
  const [funds, setFunds] = useState<FundSummary[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>("ES0159259011");
  const [selectedBmk, setSelectedBmk] = useState<string>("IE00B03HD191");
  const [audit, setAudit] = useState<ClosetIndexResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Cerca ràpida de la capçalera
  const [headerQuery, setHeaderQuery] = useState("");
  const [headerResults, setHeaderResults] = useState<FundSummary[]>([]);
  const [isHeaderOpen, setIsHeaderOpen] = useState(false);
  const headerSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    searchFunds().then((data) => {
      setFunds(data);
      if (data.length > 0 && !selectedFund) {
        setSelectedFund(data[0].isin);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedFund && selectedBmk) {
      setLoading(true);
      auditClosetIndexing(selectedFund, selectedBmk)
        .then((res) => {
          setAudit(res);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [selectedFund, selectedBmk]);

  // Debounce cerca capçalera
  useEffect(() => {
    if (!headerQuery.trim()) {
      setHeaderResults([]);
      setIsHeaderOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await searchFunds(headerQuery);
        setHeaderResults(res.slice(0, 6));
        setIsHeaderOpen(true);
      } catch (err) {
        console.error(err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [headerQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerSearchRef.current && !headerSearchRef.current.contains(e.target as Node)) {
        setIsHeaderOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      
      {/* 1. BARRA SUPERIOR IDENTICA A PORTADA */}
      <header className="w-full border-b border-slate-100 py-3 px-6 sm:px-10 lg:px-14 flex items-center justify-between bg-white sticky top-0 z-50">
        <div className="relative h-9 sm:h-10 w-44 sm:w-50 shrink-0">
          <Link href="/">
            <Image
              src="/logo-optifunds.jpg"
              alt="OptiFunds"
              fill
              className="object-contain object-left cursor-pointer"
              priority
              unoptimized
            />
          </Link>
        </div>

        {/* Cerca subtil al centre */}
        <div ref={headerSearchRef} className="relative w-full max-w-sm sm:max-w-md mx-4">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Cerca un altre fons per auditar..."
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value)}
              onFocus={() => {
                if (headerResults.length > 0) setIsHeaderOpen(true);
              }}
              className="w-full pl-9 pr-12 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 rounded-full border border-slate-200/80 focus:border-[#00B050] focus:ring-1 focus:ring-[#00B050] focus:outline-none transition-all"
            />
            <kbd className="absolute right-3 text-[10px] font-mono text-slate-400 pointer-events-none border border-slate-200 rounded px-1.5 py-0.5 bg-white">
              ⌘K
            </kbd>
          </div>

          {isHeaderOpen && headerResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 max-h-72 overflow-y-auto">
              {headerResults.map((f) => (
                <button
                  key={f.isin}
                  onClick={() => {
                    setIsHeaderOpen(false);
                    setHeaderQuery("");
                    router.push(`/funds/${f.isin}`);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="pr-2 truncate">
                    <div className="font-semibold text-slate-900 truncate">{f.fund_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{f.isin}</div>
                  </div>
                  {f.ter !== undefined && (
                    <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                      TER: {f.ter}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Inici</span>
        </Link>
      </header>

      {/* 2. COS DE LA PÀGINA */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-14 py-8 space-y-8">
        
        {/* TITULAR EDITORIAL */}
        <div className="space-y-2 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-[#00B050] border border-emerald-100">
              Metodologia Cremers & Petajisto
            </span>
            <span className="text-xs text-slate-400 font-mono">UCITS COMPLIANT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight leading-snug">
            Auditor de <span className="text-[#00B050]">Closet Indexing</span> & Active Share
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            Desemmascara si un vehicle de gestió activa es limita a replicar l'índex i quantifica el TER efectiu que pagues pel risc autèntic.
          </p>
        </div>

        {/* SELECTORS DINÀMICS BENTO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Vehicle d'Inversió a Auditar
            </label>
            <select
              value={selectedFund}
              onChange={(e) => setSelectedFund(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#00B050] focus:ring-1 focus:ring-[#00B050] transition-colors"
            >
              {funds.map((f) => (
                <option key={f.isin} value={f.isin}>
                  {f.fund_name} ({f.isin})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Benchmark de Baix Cost (Referència)
            </label>
            <select
              value={selectedBmk}
              onChange={(e) => setSelectedBmk(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#00B050] focus:ring-1 focus:ring-[#00B050] transition-colors"
            >
              {DEFAULT_BENCHMARKS.map((b) => (
                <option key={b.isin} value={b.isin}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* RESULTATS DE L'AUDITORIA */}
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400 bg-white rounded-3xl border border-slate-100 animate-pulse">
            Encreuant carteres a DuckDB i calculant l'Active Share pur...
          </div>
        ) : audit ? (
          <div className="space-y-6">
            
            {/* BANNER DE DIAGNÒSTIC FIDUCIARI */}
            <div
              className={`p-5 rounded-3xl border flex items-start justify-between gap-4 transition-all ${
                audit.is_closet_indexer
                  ? "bg-amber-50/80 border-amber-200 text-amber-900"
                  : "bg-[#D1F7E2]/50 border-[#00B050]/30 text-[#075426]"
              }`}
            >
              <div className="flex items-start gap-3.5">
                {audit.is_closet_indexer ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-[#00B050] shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h3 className="text-sm font-bold tracking-tight">
                    {audit.is_closet_indexer
                      ? "Alerta de Closet Indexing Confirmada"
                      : "Gestió Activa Autèntica Verificada"}
                  </h3>
                  <p className="text-xs leading-relaxed opacity-90 max-w-3xl">
                    {audit.is_closet_indexer
                      ? `Aquest vehicle comparteix un ${audit.overlap_pct}% de la seva composició amb l'índex. Estàs assumint un sobrecost ocult: el TER efectiu aplicat sobre la fracció que realment es gestiona és del ${audit.active_ter}%.`
                      : `El fons presenta una elevada diferenciació (Active Share del ${audit.active_share_pct}%), oferint convicció independent que justifica la comissió de gestió d'autor.`}
                  </p>
                </div>
              </div>

              <div className="shrink-0 hidden sm:block">
                <Link
                  href={`/funds/${selectedFund}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 hover:border-[#00B050] hover:text-[#00B050] transition-colors shadow-2xs"
                >
                  <span>Veure Fitxa 360°</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* BENTO GRID DE 4 KPIS NUMÈRICS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Active Share */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Active Share
                </span>
                <span className="text-3xl font-extrabold text-slate-950 font-mono mt-1.5 block">
                  {audit.active_share_pct}%
                </span>
                <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${audit.active_share_pct > 60 ? "bg-[#00B050]" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(audit.active_share_pct, 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-2 block">Diferenciació d'índex</span>
              </div>

              {/* Solapament */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Solapament Índex
                </span>
                <span className="text-3xl font-extrabold text-slate-950 font-mono mt-1.5 block">
                  {audit.overlap_pct}%
                </span>
                <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400"
                    style={{ width: `${Math.min(audit.overlap_pct, 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-2 block">Títols coincidents</span>
              </div>

              {/* TER Oficial */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Comissió Oficial (TER)
                </span>
                <span className="text-3xl font-extrabold text-slate-950 font-mono mt-1.5 block">
                  {audit.official_ter}%
                </span>
                <span className="text-[11px] text-slate-500 mt-4 block">Cost anual al fullet</span>
              </div>

              {/* TER Efectiu Actiu */}
              <div className="p-5 rounded-2xl bg-[#ECFDF5] border border-emerald-100 shadow-2xs">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  TER Efectiu Part Activa
                </span>
                <span className="text-3xl font-extrabold text-[#00B050] font-mono mt-1.5 block">
                  {audit.active_ter}%
                </span>
                <span className="text-[11px] text-emerald-700 font-medium mt-4 block">
                  Cost real sobre el risc lliure
                </span>
              </div>

            </div>

            {/* DESGLOSSAMENT VISUAL DE CAPITAL */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Desglossament del Capital Invertit: Índex vs. Gestió d'Autor
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Proporció matemàtica dels diners exposats a la convicció del gestor davant de la còpia d'actius
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2.5 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="font-semibold text-slate-700">Part de Gestió Autèntica</span>
                    <span className="text-[#00B050] font-bold text-sm">{audit.active_share_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#00B050] h-full rounded-full transition-all duration-500"
                      style={{ width: `${audit.active_share_pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed pt-1">
                    Fracció subjecta a selecció diferenciada de companyies que justifica la remuneració per gestió d'autor.
                  </p>
                </div>

                <div className="space-y-2.5 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="font-semibold text-slate-700">Part Replicada de l'Índex</span>
                    <span className="text-slate-800 font-bold text-sm">{audit.overlap_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${audit.overlap_pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed pt-1">
                    Exposició simètrica que es podria contractar directament mitjançant un índex passiu o ETF (0,07% - 0,18%).
                  </p>
                </div>
              </div>

              {/* ACCIÓ: DESCARREGAR INFORME PDF */}
              <div className="flex justify-end pt-2">
                <a
                  href={getFundAuditPdfUrl(selectedFund)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4 text-[#00B050]" />
                  <span>Descarregar Informe d'Auditoria MiFID II (PDF)</span>
                </a>
              </div>
            </div>

          </div>
        ) : null}

      </main>
    </div>
  );
}
