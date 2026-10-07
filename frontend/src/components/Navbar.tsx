"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Search, 
  Menu, 
  X, 
  Layers, 
  Sparkles, 
  ShieldAlert, 
  Calculator, 
  Activity, 
  ArrowRight,
  Compass,
  BarChart3,
  ArrowLeftRight,
  ChevronDown
} from "lucide-react";
import { searchFunds, FundSummary } from "@/lib/api";

const PRIMARY_NAV_LINKS = [
  { href: "/", label: "Inici", icon: Compass },
  { href: "/funds", label: "Screener", icon: BarChart3 },
  { href: "/compare", label: "Comparador", icon: ArrowLeftRight },
  { href: "/closet-indexing", label: "Closet Indexing", icon: ShieldAlert },
  { href: "/optimize", label: "Smart Switch", icon: Sparkles },
  { href: "/portfolio", label: "Carteres", icon: Layers },
];

const MORE_NAV_LINKS = [
  { 
    href: "/simulator", 
    label: "Simulador de TER", 
    desc: "Impacte acumulatiu de comissions", 
    icon: Calculator 
  },
  { 
    href: "/risk", 
    label: "Frontera de Risc", 
    desc: "Univers Markowitz risc-rendibilitat", 
    icon: Activity 
  },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FundSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cmd+K shortcut per enfocar la cerca ràpidament
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setMoreMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search amb DuckDB API
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchFunds(query.trim());
        setResults(res.slice(0, 6));
        setIsOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Tancar desplegables en fer clic fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tancar menús en canviar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
    setIsOpen(false);
    setMoreMenuOpen(false);
  }, [pathname]);

  const isMoreActive = MORE_NAV_LINKS.some(link => pathname.startsWith(link.href));

  return (
    <header className="w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* LOGO & PRIMARY NAV */}
        <div className="flex items-center gap-6 xl:gap-8">
          <Link href="/" className="relative h-9 w-36 sm:w-44 shrink-0 flex items-center">
            <Image
              src="/logo-optifunds.jpg"
              alt="OptiFunds"
              fill
              className="object-contain object-left cursor-pointer"
              priority
              unoptimized
            />
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden lg:flex items-center gap-1">
            {PRIMARY_NAV_LINKS.map((link) => {
              const isActive = link.href === "/" 
                ? pathname === "/" 
                : pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200/70 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/70"
                  }`}
                >
                  <link.icon className={`w-3.5 h-3.5 ${isActive ? "text-[#00B050]" : "text-slate-400"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* DESPLEGABLE MÉS EINES */}
            <div ref={moreMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  isMoreActive
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/70 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/70"
                }`}
              >
                <span>Eines</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${moreMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {moreMenuOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Eines Quantitatives
                  </div>
                  {MORE_NAV_LINKS.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreMenuOpen(false)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg transition-colors ${
                          isActive ? "bg-emerald-50 text-emerald-900" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <item.icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? "text-[#00B050]" : "text-slate-400"}`} />
                        <div>
                          <div className="text-xs font-semibold">{item.label}</div>
                          <div className="text-[11px] text-slate-400 leading-tight">{item.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* ZONA DE CERCA GLOBAL + STATUS DUCKDB */}
        <div className="flex items-center gap-3 flex-1 max-w-sm justify-end">
          
          {/* CERCADOR INSTANTANI AMB CMD+K */}
          <div ref={searchRef} className="relative w-full">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cerca fons o ISIN..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                  if (results.length > 0) setIsOpen(true);
                }}
                className="w-full pl-9 pr-12 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 rounded-lg border border-slate-200 focus:border-[#00B050] focus:ring-2 focus:ring-[#00B050]/15 focus:outline-hidden transition-all shadow-2xs"
              />
              <kbd className="absolute right-2 text-[9px] font-mono text-slate-400 pointer-events-none border border-slate-200 rounded px-1.5 py-0.5 bg-white shadow-2xs hidden sm:inline-block">
                ⌘K
              </kbd>
            </div>

            {/* DESPLEGABLE DE RESULTATS */}
            {isOpen && results.length > 0 && (
              <div className="absolute top-full right-0 left-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 max-h-80 overflow-y-auto divide-y divide-slate-100">
                <div className="px-3.5 py-1 text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                  Resultats de Fons
                </div>
                {results.map((f) => (
                  <button
                    key={f.isin}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                      router.push(`/funds/${f.isin}`);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50/60 flex items-center justify-between text-xs transition-colors group cursor-pointer"
                  >
                    <div className="pr-2 truncate">
                      <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {f.fund_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{f.isin}</span>
                        {f.category && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500 truncate">{f.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {f.ter !== undefined && (
                      <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                        TER: {f.ter}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INDICADOR DADES OFICIALS */}
          <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-200 text-[11px] font-mono text-slate-500 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>Dades Oficials CNMV</span>
          </div>

          {/* BOTÓ MENÚ MÒBIL */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors"
            aria-label="Menú de navegació"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* MENÚ MÒBIL / TABLET */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-2 mb-1">
              Plataforma Principal
            </div>
            <div className="space-y-0.5">
              {PRIMARY_NAV_LINKS.map((link) => {
                const isActive = link.href === "/" 
                  ? pathname === "/" 
                  : pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <link.icon className={`w-4 h-4 ${isActive ? "text-[#00B050]" : "text-slate-400"}`} />
                      <span>{link.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-2 mb-1">
              Eines Quantitatives
            </div>
            <div className="space-y-0.5">
              {MORE_NAV_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <link.icon className={`w-4 h-4 ${isActive ? "text-[#00B050]" : "text-slate-400"}`} />
                      <span>{link.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
