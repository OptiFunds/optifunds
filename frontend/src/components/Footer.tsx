import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Cpu, Database, Compass, ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-slate-950 text-slate-400 border-t border-slate-900 mt-auto">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-14 pt-14 pb-10">
        
        {/* FILA SUPERIOR: LOGO, DESCRIPCIÓ I BLOCS D'ENLLAÇOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-900">
          
          {/* COLUMNA 1: MARCA I VALOR INSTITUCIONAL */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative h-9 w-44">
              <Image
                src="/logo-optifunds.jpg"
                alt="OptiFunds"
                fill
                className="object-contain object-left invert contrast-200"
                unoptimized
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Plataforma fiduciària d&apos;intel·ligència quantitativa per desemmascarar comissions abusives, identificar closet indexers i optimitzar carteres d&apos;inversió cap a solucions indexades de baix cost.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono text-slate-300">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
                <Database className="w-3 h-3 text-[#00B050]" />
                DuckDB Columnar Engine
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Dades Lipper & CNMV
              </span>
            </div>
          </div>

          {/* COLUMNA 2: EINES ANALÍTIQUES */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
              Eines d&apos;Anàlisi
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/funds" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>Catàleg & Screener de Fons</span>
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>Comparador Cara a Cara 1:1</span>
                </Link>
              </li>
              <li>
                <Link href="/closet-indexing" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>Closet Indexing Auditor</span>
                </Link>
              </li>
              <li>
                <Link href="/optimize" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>Smart Switch</span>
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>Portfolio Builder</span>
                </Link>
              </li>
              <li>
                <Link href="/simulator" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>Simulador de TER</span>
                </Link>
              </li>
              <li>
                <Link href="/risk" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>Frontera Eficient de Risc</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMNA 3: METODOLOGIA */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
              Metodologia Fiduciària
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-slate-400">Cremers & Petajisto (Active Share)</span>
              </li>
              <li>
                <span className="text-slate-400">Teoria de Markowitz (MPT 360°)</span>
              </li>
              <li>
                <span className="text-slate-400">Auditoria Look-Through d&apos;Accions</span>
              </li>
              <li>
                <span className="text-slate-400">Transparència de Costos MiFID II</span>
              </li>
              <li>
                <span className="text-slate-400">Homologació de Vehicles UCITS</span>
              </li>
            </ul>
          </div>

          {/* COLUMNA 4: COBERTURA DE MERCAT */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
              Cobertura de Mercat
            </h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span>Fons registrats:</span>
                <span className="font-mono font-semibold text-slate-200">5.792</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span>Holdings analitzats:</span>
                <span className="font-mono font-semibold text-slate-200">111.172</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span>Actualització dades:</span>
                <span className="font-mono text-[#00B050]">En línia</span>
              </div>
            </div>
          </div>

        </div>

        {/* FILA INFERIOR: DISCLAIMER REGULATORI I COPYRIGHT */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-slate-400">
          <p className="max-w-2xl leading-relaxed text-slate-400">
            <strong>Avís Fiduciari:</strong> OptiFunds és una plataforma tecnològica d&apos;anàlisi quantitativa de carteres. Les dades mostrades provenen de fonts públiques de la CNMV i Lipper. Les simulacions financeres tenen caràcter estrictament educatiu i informatiu i no representen una recomanació d&apos;assessorament financer regulat.
          </p>
          <div className="font-mono text-slate-400 shrink-0">
            © 2026 OptiFunds. Tots els drets reservats.
          </div>
        </div>

      </div>
    </footer>
  );
}
