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
  ArrowLeftRight
} from "lucide-react";
import { searchFunds, FundSummary } from "@/lib/api";

const NAV_LINKS = [
  { href: "/", label: "Inici", icon: Compass },
  { href: "/funds", label: "Screener de Fons", icon: BarChart3 },
  { href: "/compare", label: "Comparador", icon: ArrowLeftRight },
  { href: "/closet-indexing", label: "Closet Indexing", icon: ShieldAlert },
  { href: "/optimize", label: "Smart Switch", icon: Sparkles },
  { href: "/portfolio", label: "Portfolio Builder", icon: Layers },
  { href: "/simulator", label: "Simulador TER", icon: Calculator },
  { href: "/risk", label: "Frontera de Risc", icon: Activity },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FundSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cmd+K shortcut per enfocar la cerca ràpidament
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsOpen(true);
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

  // Tancar desplegable en fer clic fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tancar menú mòbil en canviar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className="w-full border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 transition-all">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between gap-4">
        
        {/* LOGO */}
        <div className="flex items-center gap-6">
          <Link href="/" className="relative h-9 sm:h-10 w-40 sm:w-48 shrink-0 flex items-center">
            <Image
              src="/logo-optifunds.jpg"
              alt="OptiFunds"
              fill
              className="object-contain object-left cursor-pointer"
              priority
              unoptimized
            />
          </Link>

          {/* ENLLAÇOS DE NAVEGACIÓ (DESKTOP) */}
          <nav className="hidden xl:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-emerald-50 text-[#00B050] border border-emerald-200/80 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                  }`}
                >
                  <link.icon className={`w-3.5 h-3.5 ${isActive ? "text-[#00B050]" : "text-slate-400"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ZONA DE CERCA GLOBAL + STATUS ENGINE */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-md justify-end">
          
          {/* CERCADOR INSTANTANI AMB CMD+K */}
          <div ref={searchRef} className="relative w-full max-w-xs sm:max-w-sm">
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
                className="w-full pl-9 pr-12 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 rounded-full border border-slate-200/80 focus:border-[#00B050] focus:ring-1 focus:ring-[#00B050] focus:outline-none transition-all shadow-2xs"
              />
              <kbd className="absolute right-2.5 text-[9px] font-mono text-slate-400 pointer-events-none border border-slate-200 rounded px-1.5 py-0.5 bg-white shadow-2xs hidden sm:inline-block">
                ⌘K
              </kbd>
            </div>

            {/* DESPLEGABLE DE RESULTATS */}
            {isOpen && results.length > 0 && (
              <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 max-h-80 overflow-y-auto divide-y divide-slate-100">
                <div className="px-3.5 py-1 text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                  Resultats de mercat Lipper / CNMV
                </div>
                {results.map((f) => (
                  <button
                    key={f.isin}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                      router.push(`/funds/${f.isin}`);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/50 flex items-center justify-between text-xs transition-colors group cursor-pointer"
                  >
                    <div className="pr-2 truncate">
                      <div className="font-semibold text-slate-900 group-hover:text-[#00B050] transition-colors truncate">
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

          {/* INDICADOR EN DIRECTE DUCKDB */}
          <div className="hidden md:flex items-center gap-2 pl-1 text-[11px] font-mono text-slate-500 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00B050]"></span>
            </span>
            <span className="hidden lg:inline font-medium text-slate-600">DuckDB</span>
          </div>

          {/* BOTÓ MENÚ MÒBIL / TABLET */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors"
            aria-label="Menú de navegació"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* MENÚ DESPLEGABLE MÒBIL */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-200">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-emerald-50 text-[#00B050] font-bold border border-emerald-200/60"
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
      )}
    </header>
  );
}
