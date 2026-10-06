import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
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

function getBadgeStyle(value: number) {
  const minAlpha = 0.25;
  const maxAlpha = 1.0;
  const clamped = Math.max(8, Math.min(23, value));
  const alpha = minAlpha + ((clamped - 8) / (23 - 8)) * (maxAlpha - minAlpha);

  return {
    backgroundColor: `rgba(0, 176, 80, ${alpha.toFixed(2)})`,
    color: "#FFFFFF",
  };
}

export default function HomePage() {
  return (
    <div className="bg-white flex flex-col font-sans">

      {/* 2. ZONA HERO PRINCIPAL */}
      <main className="w-full max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-14 pt-6 lg:pt-8 pb-8 lg:pb-10 flex flex-col lg:flex-row justify-between items-center gap-8 lg:gap-14">
        
        {/* COLUMNA ESQUERRA */}
        <div className="w-full lg:max-w-xl xl:max-w-2xl space-y-2.5">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.08]">
            Eines per a <br />
            <span className="text-[#00B050]">Inversors Intel·ligents</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-lg pt-0.5">
            Les teves <strong className="font-semibold text-slate-900">inversions</strong>, explicades amb <strong className="font-semibold text-slate-900">total transparència</strong>.
          </p>
        </div>

        {/* COLUMNA DRETA: MARKET MONITOR AMB FILES CLICABLES */}
        <div className="w-full lg:w-[560px] xl:w-[600px] shrink-0 bg-white rounded-2xl p-5 sm:p-5.5 border border-slate-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                Market Monitor – Top 5 Fons
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clica sobre qualsevol fons per obrir l&apos;auditoria
              </p>
            </div>
            <span className="text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
              CNMV Oficial
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th scope="col" className="pb-2 pr-3 font-medium">Fons</th>
                  <th scope="col" className="pb-2 px-2 text-center font-medium">1Y</th>
                  <th scope="col" className="pb-2 px-2 text-center font-medium">3Y</th>
                  <th scope="col" className="pb-2 pl-2 text-center font-medium">5Y</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topSpanishFunds.map((fund) => (
                  <tr 
                    key={fund.isin} 
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="py-2.5 pr-3">
                      <Link href={`/funds/${fund.isin}`} className="block">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 text-xs sm:text-[13px] leading-snug line-clamp-1 group-hover:text-[#00B050] transition-colors">
                            {fund.name}
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-[#00B050] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {fund.isin}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {fund.category}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="py-2.5 px-2 text-center align-middle">
                      <Link href={`/funds/${fund.isin}`}>
                        <span
                          style={getBadgeStyle(fund.ret1Y)}
                          className="inline-block min-w-[62px] px-2 py-1 rounded-md text-xs font-bold text-white shadow-xs"
                        >
                          +{fund.ret1Y.toFixed(2)}%
                        </span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-2 text-center align-middle">
                      <Link href={`/funds/${fund.isin}`}>
                        <span
                          style={getBadgeStyle(fund.ret3Y)}
                          className="inline-block min-w-[62px] px-2 py-1 rounded-md text-xs font-bold text-white shadow-xs"
                        >
                          +{fund.ret3Y.toFixed(2)}%
                        </span>
                      </Link>
                    </td>
                    <td className="py-2.5 pl-2 text-center align-middle">
                      <Link href={`/funds/${fund.isin}`}>
                        <span
                          style={getBadgeStyle(fund.ret5Y)}
                          className="inline-block min-w-[62px] px-2 py-1 rounded-md text-xs font-bold text-white shadow-xs"
                        >
                          +{fund.ret5Y.toFixed(2)}%
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 3. SECCIÓ 2: SALVAPANTALLES I MÈTRIQUES */}
      <section className="w-full py-8 sm:py-12 bg-white">
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-14 flex flex-col lg:flex-row justify-between items-center gap-8 lg:gap-14">
          
          <div className="w-full lg:max-w-xl xl:max-w-2xl relative flex items-center min-h-[340px] sm:min-h-[400px] overflow-visible">
            <FlowingWave />
            <div className="relative z-10 select-none space-y-2 sm:space-y-3 w-full">
              <h2 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-950 flex items-baseline gap-1">
                Audita<span className="text-[#00B050]">.</span>
              </h2>
              <h2 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-950 flex items-baseline gap-1">
                Compara<span className="text-[#00B050]">.</span>
              </h2>
              <h2 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-950 flex items-baseline gap-1">
                Estalvia<span className="text-[#00B050]">.</span>
              </h2>
            </div>
          </div>

          <div className="w-full lg:w-[560px] xl:w-[600px] shrink-0 flex flex-col justify-center space-y-8">
            <div className="relative pt-4">
              <div className="absolute -top-3 left-32 sm:left-40 flex items-center gap-2 pointer-events-none">
                <span className="text-xs text-slate-400 font-medium">El secret més mal guardat</span>
                <svg width="46" height="34" viewBox="0 0 46 34" fill="none" className="text-[#00B050] rotate-12">
                  <path d="M4 4C14 2 34 8 40 26M40 26L34 22M40 26L42 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-[1.1]">
                Suma&apos;t al <br />
                <span className="text-[#00B050]">Rendiment Real</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-7">
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">5.792</div>
                <div className="text-sm sm:text-base text-slate-600 mt-1 font-medium">Fons Auditats</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">100%</div>
                <div className="text-sm sm:text-base text-slate-600 mt-1 font-medium">Dades Oficials CNMV</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">111.172</div>
                <div className="text-sm sm:text-base text-slate-600 mt-1 font-medium">Accions Subjacents</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">fins a 1,7%</div>
                <div className="text-sm sm:text-base text-slate-600 mt-1 font-medium">Estalvi Mitjà en Comissions</div>
              </div>
            </div>

            <div>
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-xl border border-slate-900 text-slate-950 hover:bg-slate-950 hover:text-white font-semibold text-sm transition-all duration-200 group"
              >
                <span>Comença a auditar</span>
                <ArrowRight className="w-4 h-4 text-[#00B050] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECCIÓ BENTO GRID */}
      <section className="w-full pt-4 pb-14 sm:pb-20 bg-white">
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-14">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <h2 className="text-4xl sm:text-5xl font-medium text-slate-900 tracking-tight">
              Les nostres <span className="text-[#00B050] font-semibold">Eines d'Anàlisi</span>
            </h2>
            <Link
              href="/closet-indexing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1F1F1F] hover:bg-black text-white text-sm font-medium rounded-lg transition-colors"
            >
              Veure totes les eines
              <ArrowRight className="w-4 h-4 text-[#00B050]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-[200px]">
            
            {/* Targeta 1 (Gran Esquerra) */}
            <Link 
              href="/closet-indexing"
              className="lg:col-span-2 lg:row-span-2 bg-[#0A0A0A] rounded-2xl p-7 sm:p-10 relative overflow-hidden flex flex-col text-white group block cursor-pointer"
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                <span className="absolute top-10 left-[45%] text-slate-500 font-light text-5xl">+</span>
                <span className="absolute top-32 right-12 text-slate-400 font-light text-6xl">+</span>
                <span className="absolute bottom-24 right-[30%] text-slate-500 font-light text-7xl">+</span>
                <span className="absolute top-[60%] right-8 text-slate-500 font-light text-4xl">+</span>
                <span className="absolute bottom-12 left-[20%] text-slate-600 font-light text-8xl">+</span>
                <span className="absolute top-[25%] left-10 text-slate-500 font-light text-3xl">+</span>
                <span className="absolute top-[5%] right-[20%] text-slate-600 font-light text-5xl">+</span>
              </div>
              
              <div className="relative z-10 flex-1">
                <h3 className="text-2xl sm:text-3xl font-semibold mb-3 leading-tight group-hover:text-emerald-400 transition-colors">
                  Auditor de<br />Closet Indexing
                </h3>
              </div>
              <div className="relative z-10 max-w-[420px]">
                <p className="text-slate-300 text-sm leading-relaxed">
                  Analitzar l&apos;Active Share és el procés d&apos;avaluar si un fons de gestió activa es limita a clonar l&apos;índex. T&apos;ajuda a auditar el cost real de la teva inversió, desemmascarar comissions abusives i optimitzar la rendibilitat futura.
                </p>
              </div>
            </Link>

            {/* Targeta 2 (Mitjana Dalt) */}
            <Link
              href="/optimize"
              className="col-span-1 row-span-1 bg-[#00B050] rounded-2xl p-6 flex flex-col justify-between group cursor-pointer hover:bg-[#009945] transition-colors block"
            >
              <p className="text-emerald-50 text-[13px] leading-relaxed pr-4 font-medium">
                Troba i compara alternatives indexades de baix cost per optimitzar la teva cartera instantàniament.
              </p>
              <h3 className="text-xl font-semibold text-white mt-4 flex items-center justify-between">
                <span>Smart<br />Switch</span>
                <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
            </Link>

            {/* Targeta 3 (Alta Dreta) */}
            <Link
              href="/portfolio"
              className="col-span-1 row-span-2 bg-[#ECFDF5] border border-emerald-100/80 rounded-2xl p-6 flex flex-col justify-start group hover:border-emerald-300 transition-colors block"
            >
              <h3 className="text-xl font-semibold text-slate-950 mb-4 group-hover:text-[#00B050] transition-colors">
                Portfolio<br />Builder
              </h3>
              <p className="text-slate-600 text-[13px] leading-relaxed">
                Eines d&apos;assignació de carteres basades en el solapament real d&apos;actius. Construeix el teu portfolio consolidant les primeres posicions, identificant la concentració de riscos i evitant duplicitats innecessàries per a una millor diversificació.
              </p>
            </Link>

            {/* Targeta 4 (Mitjana Baix) */}
            <Link
              href="/simulator"
              className="col-span-1 row-span-1 bg-[#F1F4F9] rounded-2xl p-6 flex flex-col justify-between group hover:bg-slate-100 transition-colors block"
            >
              <p className="text-slate-600 text-[13px] leading-relaxed pr-2">
                Modela l&apos;impacte de les comissions a llarg termini i entén clarament l&apos;erosió patrimonial del teu capital.
              </p>
              <h3 className="text-xl font-semibold text-slate-950 mt-4 flex items-center justify-between">
                <span>Simulador<br />de TER</span>
                <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-slate-700" />
              </h3>
            </Link>

          </div>
        </div>
      </section>
      
    </div>
  );
}
