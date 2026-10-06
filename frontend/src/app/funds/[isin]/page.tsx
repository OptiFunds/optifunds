"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowLeft, 
  ArrowRight, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles
} from "lucide-react";
import { getFundDeepDive, searchFunds, FundDeepDive, FundSummary } from "@/lib/api";

export default function FundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isin = (params?.isin as string)?.toUpperCase();

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [capital, setCapital] = useState<number>(25000);

  const [compareQuery, setCompareQuery] = useState("");
  const [compareResults, setCompareResults] = useState<FundSummary[]>([]);

  useEffect(() => {
    if (!isin) return;
    setLoading(true);
    setError(null);

    getFundDeepDive(isin)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error(err);
        setError(err?.message || "No s'ha pogut carregar l'auditoria d'aquest fons.");
      })
      .finally(() => setLoading(false));
  }, [isin]);

  useEffect(() => {
    if (compareQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        searchFunds(compareQuery)
          .then((res) => setCompareResults(res.filter(f => f.isin !== isin).slice(0, 5)))
          .catch(() => setCompareResults([]));
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setCompareResults([]);
    }
  }, [compareQuery, isin]);

  // Càlcul de simulació blindat davant d'alternatives buides o valors nulls
  const simulation = useMemo(() => {
    if (!data?.profile) return null;
    const terActual = typeof data.profile.ter === "number" ? data.profile.ter : 1.0;
    const alts = Array.isArray(data.alternatives) ? data.alternatives : [];
    const bestAlt = alts.length > 0 ? alts[0] : null;
    
    // Si no té alternativa indexada directa (p.ex. monetari), usem un índex monetari de baix cost (0.10%)
    const terAlt = bestAlt?.cand_ter ?? (terActual > 0.20 ? 0.15 : terActual);
    const deltaTer = Math.max(0, terActual - terAlt);

    const costActualAnual = Math.round(capital * (terActual / 100));
    const estalviAnual = Math.round(capital * (deltaTer / 100));

    const rBrut = 0.05;
    const capAmbIndexat = capital * Math.pow(1 + (rBrut - terAlt / 100), 20);
    const capAmbBancari = capital * Math.pow(1 + (rBrut - terActual / 100), 20);
    const dinersPerduts20y = Math.round(capAmbIndexat - capAmbBancari);

    return {
      terActual,
      terAlt,
      deltaTer,
      costActualAnual,
      estalviAnual,
      dinersPerduts20y,
      bestAlt,
      hasAlternatives: alts.length > 0
    };
  }, [data, capital]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <header className="w-full border-b border-slate-100 py-3.5 px-6 sm:px-10 lg:px-14 flex items-center bg-white">
          <div className="relative h-9 w-44">
            <Image src="/logo-optifunds.jpg" alt="OptiFunds" fill className="object-contain object-left" priority unoptimized />
          </div>
        </header>
        <div className="max-w-[1400px] w-full mx-auto px-6 py-16 space-y-8 animate-pulse">
          <div className="h-8 w-64 bg-slate-100 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-50 rounded-2xl border border-slate-100" />)}
          </div>
          <div className="h-72 bg-slate-50 rounded-3xl border border-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !data || !data.profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <header className="w-full border-b border-slate-100 py-3.5 px-6 sm:px-10 lg:px-14 flex items-center bg-white">
          <Link href="/">
            <div className="relative h-9 w-44 cursor-pointer">
              <Image src="/logo-optifunds.jpg" alt="OptiFunds" fill className="object-contain object-left" priority unoptimized />
            </div>
          </Link>
        </header>
        <div className="max-w-2xl mx-auto px-6 py-20 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Vehicle no localitzat</h2>
          <p className="text-sm text-slate-500">
            {error || `No s'han trobat dades oficials per a l'identificador ${isin}.`}
          </p>
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#00B050] hover:underline pt-2">
            <ArrowLeft className="w-4 h-4" /> Tornar a l'inici
          </Link>
        </div>
      </div>
    );
  }

  const { profile, closet_audit, holdings, performance, alternatives } = data;
  const isCloset = closet_audit?.is_closet ?? false;
  const isHighFee = (profile?.ter ?? 0) >= 1.2;

  const normalizedHoldings = (holdings || []).map((h: any) => ({
    name: h.holding_name || h.name || "Títol en cartera",
    ticker: h.holding_ric || h.ric || h.ticker || "—",
    weight: typeof h.weight_pct === "number" ? h.weight_pct : (typeof h.weight === "number" ? h.weight : null)
  }));

  const alternativesList = Array.isArray(alternatives) ? alternatives : [];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      
      {/* 1. BARRA SUPERIOR INSTITUCIONAL */}
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

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Explorador de Fons</span>
        </Link>
      </header>

      {/* 2. COS PRINCIPAL DE LA FITXA */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-14 py-8 space-y-8">
        
        {/* ENCAPÇALAMENT: NOM DEL FONS EN NEGRETA A DALT I DADES A BAIX */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-3 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight leading-snug">
              {profile.name || profile.fund_name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-900 text-white shadow-2xs">
                ISIN: {profile.isin}
              </span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
                {profile.category || "Fons d'Inversió"}
              </span>
              {profile.ric && (
                <span className="text-xs font-mono text-slate-500 px-2 py-1 rounded bg-slate-50 border border-slate-200/60">
                  RIC: {profile.ric}
                </span>
              )}
              {profile.currency && (
                <span className="text-xs font-mono text-slate-500 px-2 py-1 rounded bg-slate-50 border border-slate-200/60">
                  {profile.currency}
                </span>
              )}
              <span className="text-xs text-slate-400 font-mono pl-1">
                • Dades Oficials Lipper
              </span>
            </div>
          </div>

          {/* VERDICT BADGE */}
          <div className="shrink-0">
            {isCloset ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 max-w-md">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold block">Alerta de Closet Indexing</span>
                  <span className="text-amber-800/90 leading-tight block mt-0.5">
                    Clona el benchmark cobrant comissions de gestió activa autèntica.
                  </span>
                </div>
              </div>
            ) : isHighFee ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 max-w-md">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold block">Cost Excessiu Detectat</span>
                  <span className="text-rose-800/90 leading-tight block mt-0.5">
                    Comissions per sobre del nivell òptim de la categoria.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#D1F7E2]/60 border border-[#00B050]/30 text-[#075426] max-w-md">
                <ShieldCheck className="w-5 h-5 text-[#00B050] shrink-0" />
                <div className="text-xs">
                  <span className="font-bold block">Estructura Competitiva</span>
                  <span className="text-[#075426]/90 leading-tight block mt-0.5">
                    Vehicle amb ràtio de costos contingut.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. KPIS BENTO */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Comissió Anual (TER)
            </span>
            <span className="text-3xl font-extrabold text-slate-950 font-mono mt-1.5 block">
              {profile.ter !== null && profile.ter !== undefined ? `${profile.ter}%` : "N/D"}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">Cost recurrent anual</span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active Share
            </span>
            <span className="text-3xl font-extrabold text-slate-950 font-mono mt-1.5 block">
              {closet_audit?.active_share !== undefined && closet_audit?.active_share !== null ? `${closet_audit.active_share}%` : "N/D"}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              vs {closet_audit?.benchmark_name || "Benchmark"}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Rendibilitat 1Y
            </span>
            <span className="text-3xl font-extrabold text-slate-950 font-mono mt-1.5 block">
              {performance?.ret_1y !== undefined && performance.ret_1y !== null 
                ? `${performance.ret_1y >= 0 ? "+" : ""}${Number(performance.ret_1y).toFixed(2)}%`
                : "N/D"}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Volatilitat: {performance?.volatility !== null && performance?.volatility !== undefined ? `${performance.volatility}%` : "N/D"}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[#ECFDF5] border border-emerald-100/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Estalvi Potencial
            </span>
            <span className="text-3xl font-extrabold text-[#00B050] font-mono mt-1.5 block">
              {simulation ? `-${simulation.deltaTer.toFixed(2)}%` : "0%"}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
              amb alternativa indexada
            </span>
          </div>
        </div>

        {/* 4. SECCIÓ CENTRAL: SIMULADOR EN EUROS + SMART SWITCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* SIMULADOR EN EUROS REALS */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Impacte de les Comissions en Diners Reals
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calcula exactament quant s&apos;emporta la gestora del teu capital
                </p>
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                {[10000, 25000, 50000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setCapital(val)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      capital === val
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {val.toLocaleString()} €
                  </button>
                ))}
              </div>
            </div>

            {simulation && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-500 block">Pagues actualment</span>
                  <span className="text-2xl font-bold text-slate-950 font-mono mt-1 block">
                    {simulation.costActualAnual.toLocaleString()} €
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">cada any en costos</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-emerald-100">
                  <span className="text-xs font-medium text-emerald-800 block">T&apos;estalviaries</span>
                  <span className="text-2xl font-bold text-[#00B050] font-mono mt-1 block">
                    +{simulation.estalviAnual.toLocaleString()} €
                  </span>
                  <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">a l&apos;any amb indexat</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                  <span className="text-xs font-medium text-rose-700 block">Pèrdua a 20 anys</span>
                  <span className="text-2xl font-bold text-rose-600 font-mono mt-1 block">
                    -{simulation.dinersPerduts20y.toLocaleString()} €
                  </span>
                  <span className="text-[11px] text-rose-500 mt-0.5 block">erosió per interès compost</span>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50/80 p-4 rounded-xl border border-slate-100">
              💡 <strong>Règim fiduciari a Espanya (Llei 35/2006):</strong> El canvi a un fons indexat equivalent es realitza mitjançant traspàs intern sense peatge fiscal ni tributació per guanys patrimonials.
            </p>
          </div>

          {/* SMART SWITCH */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#00B050] text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Smart Switch Recomanat
                </h3>
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-[#00B050] uppercase tracking-wider">
                Baix cost
              </span>
            </div>

            {alternativesList.length > 0 ? (
              <div className="space-y-3">
                {alternativesList.slice(0, 3).map((alt: any) => (
                  <div
                    key={alt.cand_isin}
                    className="p-4 rounded-2xl border border-slate-200/80 hover:border-[#00B050] bg-white transition-all space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-xs sm:text-sm group-hover:text-[#00B050] transition-colors leading-snug">
                          {alt.cand_name}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                          {alt.cand_isin}
                        </span>
                      </div>
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-[#00B050] shrink-0">
                        TER {alt.cand_ter}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                      <span className="text-slate-500 font-medium">
                        Solapament: <strong className="text-slate-800">{alt.overlap}%</strong>
                      </span>
                      <Link
                        href={`/funds/${alt.cand_isin}`}
                        className="text-[#00B050] font-semibold inline-flex items-center gap-1 hover:underline text-xs"
                      >
                        <span>Auditar</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-600 space-y-1">
                <span className="font-semibold block text-slate-800">Sense alternatives automàtiques</span>
                <span>Aquest vehicle de renda fixa o liquiditat no té un índex directe d'accions homologat al catàleg.</span>
              </div>
            )}

            {/* COMPARADOR DIRECTE */}
            <div className="pt-2">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Tens un altre fons? Compara&apos;l directament:
                </label>
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Introdueix nom o ISIN..."
                    value={compareQuery}
                    onChange={(e) => setCompareQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:bg-white focus:outline-none focus:border-[#00B050]"
                  />
                </div>

                {compareResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 divide-y divide-slate-100 overflow-hidden">
                    {compareResults.map((cand) => (
                      <button
                        key={cand.isin}
                        onClick={() => router.push(`/portfolio?add=${cand.isin}&base=${isin}`)}
                        className="w-full text-left p-3 hover:bg-slate-50 text-xs flex items-center justify-between transition-colors"
                      >
                        <span className="font-semibold text-slate-900 truncate pr-2">
                          {cand.fund_name}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                          Compara ara →
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* 5. TAULA DE POSICIONS PRINCIPALS (LOOK-THROUGH) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Posicions Principals de la Cartera (Look-Through)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Accions i títols subjacents oficials de l&apos;últim trimestre declarat a Lipper / CNMV
              </p>
            </div>
            <span className="text-[10px] font-mono font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
              {normalizedHoldings.length} Actius Auditats
            </span>
          </div>

          {normalizedHoldings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th scope="col" className="pb-3 pr-4 font-medium">Actiu / Companyia</th>
                    <th scope="col" className="pb-3 px-3 font-medium">Ticker / RIC</th>
                    <th scope="col" className="pb-3 pl-3 text-right font-medium">Pes en Cartera</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {normalizedHoldings.map((h: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pr-4">
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {h.name}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs font-mono text-slate-400">
                          {h.ticker}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right align-middle">
                        <div className="inline-flex items-center justify-end gap-2 w-full">
                          {h.weight !== null && (
                            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                              <div 
                                className="bg-[#00B050] h-full rounded-full" 
                                style={{ width: `${Math.min(100, h.weight * 10)}%` }}
                              />
                            </div>
                          )}
                          <span className="font-mono text-xs font-bold text-slate-900 min-w-[50px] text-right">
                            {h.weight !== null ? `${Number(h.weight).toFixed(2)}%` : "N/D"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
              Aquest vehicle no té registrades les accions detallades a la base de dades pública o no publica carteres trimestrals.
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
