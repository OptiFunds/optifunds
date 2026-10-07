import Link from "next/link";
import { 
  ArrowRight, 
  ArrowUpRight, 
  ShieldAlert, 
  Sparkles, 
  Layers, 
  Calculator, 
  ArrowLeftRight,
  BarChart3,
  CheckCircle2,
  TrendingUp,
  Percent,
  Database
} from "lucide-react";
import { FlowingWave } from "@/components/FlowingWave";

interface TopSpanishFund {
  name: string;
  isin: string;
  category: string;
  ret1Y: number;
  ret3Y: number;
  ret5Y: number;
}

const topSpanishFunds: TopSpanishFund[] = [
  {
    name: "CaixaBank Comunicació Mundial FI",
    isin: "ES0138045002",
    category: "RV Global",
    ret1Y: 18.42,
    ret3Y: 12.15,
    ret5Y: 14.30,
  },
  {
    name: "Santander Acciones Españolas FI",
    isin: "ES0175224031",
    category: "RV Espanya",
    ret1Y: 16.85,
    ret3Y: 11.20,
    ret5Y: 9.45,
  },
  {
    name: "BBVA Bolsa FI",
    isin: "ES0114638036",
    category: "RV Espanya",
    ret1Y: 15.30,
    ret3Y: 9.80,
    ret5Y: 8.90,
  },
  {
    name: "Magallanes European Equity M FI",
    isin: "ES0159259011",
    category: "RV Europa",
    ret1Y: 22.58,
    ret3Y: 14.10,
    ret5Y: 11.85,
  },
  {
    name: "Azvalor Internacional FI",
    isin: "ES0165144004",
    category: "RV Global",
    ret1Y: 10.74,
    ret3Y: 18.60,
    ret5Y: 16.20,
  },
];

export default function HomePage() {
  return (
    <div className="bg-[#F8FAFC] flex flex-col font-sans">

      {/* 1. HERO PRINCIPAL */}
      <section className="w-full bg-white border-b border-slate-200/80 py-10 sm:py-14">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row justify-between items-center gap-10 lg:gap-14">
          
          {/* COLUMNA ESQUERRA: VALOR I ACCIONS */}
          <div className="w-full lg:max-w-xl xl:max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#00B050] animate-pulse"></span>
              Plataforma Fiduciària d&apos;Intel·ligència Quantitativa
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.08]">
                Eines per a <br />
                <span className="text-[#00B050]">Inversors Intel·ligents</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-lg">
                Audita carteres d&apos;inversió, desemmascara comissions bancàries abusives i optimitza cap a solucions indexades de baix cost amb dades oficials de la CNMV i Lipper.
              </p>
            </div>

            {/* BOTONS D'ACCIONS RÀPIDES */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/funds"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00B050] hover:bg-[#009945] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all hover:shadow-md cursor-pointer"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Explorar Screener</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>
              <Link
                href="/closet-indexing"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-semibold shadow-xs transition-all hover:shadow-md cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span>Auditar Closet Indexing</span>
              </Link>
              <Link
                href="/compare"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4 text-slate-400" />
                <span>Comparador 1:1</span>
              </Link>
            </div>
          </div>

          {/* COLUMNA DRETA: MARKET MONITOR */}
          <div className="w-full lg:w-[540px] xl:w-[580px] shrink-0 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <span>Market Monitor</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-normal text-slate-500">Top 5 Fons Espanyols</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Clica sobre qualsevol fons per obrir l&apos;auditoria completa
                </p>
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase tracking-wider">
                CNMV Oficial
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th scope="col" className="pb-2.5 pr-2 font-medium">Vehicle</th>
                    <th scope="col" className="pb-2.5 px-2 text-center font-medium">1 Any</th>
                    <th scope="col" className="pb-2.5 px-2 text-center font-medium">3 Anys</th>
                    <th scope="col" className="pb-2.5 pl-2 text-center font-medium">5 Anys</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topSpanishFunds.map((fund) => (
                    <tr 
                      key={fund.isin} 
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="py-2.5 pr-2">
                        <Link href={`/funds/${fund.isin}`} className="block">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors truncate max-w-[200px] sm:max-w-[240px]">
                              {fund.name}
                            </span>
                            <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {fund.isin} · <span className="text-slate-500">{fund.category}</span>
                          </div>
                        </Link>
                      </td>
                      <td className="py-2.5 px-2 text-center align-middle">
                        <Link href={`/funds/${fund.isin}`}>
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            +{fund.ret1Y.toFixed(1)}%
                          </span>
                        </Link>
                      </td>
                      <td className="py-2.5 px-2 text-center align-middle">
                        <Link href={`/funds/${fund.isin}`}>
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            +{fund.ret3Y.toFixed(1)}%
                          </span>
                        </Link>
                      </td>
                      <td className="py-2.5 pl-2 text-center align-middle">
                        <Link href={`/funds/${fund.isin}`}>
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            +{fund.ret5Y.toFixed(1)}%
                          </span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-mono">5.792 fons auditats</span>
              <Link
                href="/funds"
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 transition"
              >
                <span>Obrir Screener complet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 2. PILARS FIDUCIARIS & DADES OFICIALS */}
      <section className="w-full py-12 sm:py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row justify-between items-center gap-10 lg:gap-14">
          
          {/* GRÀFIC MÖBIUS 3D */}
          <div className="w-full lg:max-w-xl xl:max-w-2xl relative flex items-center min-h-[300px] sm:min-h-[360px] overflow-visible">
            <FlowingWave />
            <div className="relative z-10 select-none space-y-2 w-full">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 flex items-baseline gap-1">
                Audita<span className="text-[#00B050]">.</span>
              </h2>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 flex items-baseline gap-1">
                Compara<span className="text-[#00B050]">.</span>
              </h2>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 flex items-baseline gap-1">
                Estalvia<span className="text-[#00B050]">.</span>
              </h2>
            </div>
          </div>

          {/* 4 TARGETES DE MÈTRIQUES DE MERCAT */}
          <div className="w-full lg:w-[540px] xl:w-[580px] shrink-0 space-y-6">
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold text-[#00B050] uppercase tracking-wider">
                Auditoria de Mercat 360°
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                Transparència sense intermediaris
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Connectem directament amb el registre oficial de la CNMV i les carteres trimestrals de fons nacionals i internacionals.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  Univers de Fons
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">5.792</div>
                <div className="text-[11px] text-slate-500">Registrats a CNMV & Lipper</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  Holdings Look-Through
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">111.172</div>
                <div className="text-[11px] text-slate-500">Accions i títols desglossats</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#00B050]" />
                  Estalvi en Comissions
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">fins a 1,7%</div>
                <div className="text-[11px] text-slate-500">Reducció mitjana de costos TER</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Metodologia Fiduciària
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">100%</div>
                <div className="text-[11px] text-slate-500">Cremers-Petajisto & MiFID II</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. SUITE D'EINES (BENTO GRID UNIFICAT) */}
      <section className="w-full py-12 sm:py-16">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
            <div>
              <div className="text-xs font-mono font-semibold text-[#00B050] uppercase tracking-wider mb-1">
                Eines d&apos;Anàlisi
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                Suite Integral d&apos;Optimització
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md">
              Des de l&apos;auditoria individual d&apos;un fons comercial fins a la construcció de carteres multi-actiu completes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* TARGETA 1: CLOSET INDEXING AUDITOR (FLAGSHIP) */}
            <Link 
              href="/closet-indexing"
              className="lg:col-span-2 bg-slate-950 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden flex flex-col justify-between group hover:border-slate-800 border border-slate-900 transition-all shadow-sm"
            >
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    Auditoria Insígnia
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ACTIVE SHARE · CREMERS & PETAJISTO</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  Auditor de Closet Indexing
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Avalua acció per acció si un fons comercial de gestió activa es limita a copiar el seu índex de referència cobrant comissions desmesurades. Descobreix el teu Active Share real i el cost efectiu de la gestió.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                  <span>Solapament de Holdings</span>
                  <span>•</span>
                  <span>Tracking Error</span>
                  <span>•</span>
                  <span>Informe PDF MiFID II</span>
                </div>
                <div className="inline-flex items-center gap-1 font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>Auditar ara</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            {/* TARGETA 2: SMART SWITCH */}
            <Link
              href="/optimize"
              className="bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-emerald-300 flex flex-col justify-between group transition-all shadow-2xs hover:shadow-md cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#00B050]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-950 group-hover:text-emerald-700 transition-colors">
                  Smart Switch
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Troba alternatives indexades homologades de baix cost per a qualsevol fons comercial tradicional, preservant l&apos;exposició sectorial i retallant fins a un 80% les comissions.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Optimitzador TER</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#00B050] group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            {/* TARGETA 3: COMPARADOR CARA A CARA */}
            <Link
              href="/compare"
              className="bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-emerald-300 flex flex-col justify-between group transition-all shadow-2xs hover:shadow-md cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-950 group-hover:text-emerald-700 transition-colors">
                  Comparador Cara a Cara
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enfronta dos vehicles 1:1: compara la sèrie històrica diària oficial, calcula el solapament microscòpic de títols compartits i avalua si són duplicats o diversificadors reals.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Diagnòstic 1:1</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#00B050] group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            {/* TARGETA 4: PORTFOLIO BUILDER */}
            <Link
              href="/portfolio"
              className="bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-emerald-300 flex flex-col justify-between group transition-all shadow-2xs hover:shadow-md cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-950 group-hover:text-emerald-700 transition-colors">
                  Portfolio Builder
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Assignació multi-actiu d&apos;alta precisió. Construeix la teva cartera personalitzada amb optimització MPT Markowitz, look-through geogràfic i sectorial, i backtest històric real.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Markowitz & Look-Through</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#00B050] group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            {/* TARGETA 5: SIMULADOR DE TER */}
            <Link
              href="/simulator"
              className="bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-emerald-300 flex flex-col justify-between group transition-all shadow-2xs hover:shadow-md cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Calculator className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-950 group-hover:text-emerald-700 transition-colors">
                  Simulador de TER
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Modela l&apos;impacte de l&apos;interès compost i l&apos;erosió patrimonial causada per les comissions de gestió a 10, 20 i 30 anys vista. Entén quants milers d&apos;euros es perden en costos.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Model de Capitalització</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#00B050] group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

          </div>
        </div>
      </section>
      
    </div>
  );
}
