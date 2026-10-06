"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, LayoutGrid, Layers } from "lucide-react";

const navigation = [
  { name: "Mercat & Frontera de Risc", href: "/", icon: LayoutGrid },
  { name: "Portfolio & Overlap Builder", href: "/portfolio", icon: Layers },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col min-h-screen select-none shrink-0">
      {/* Logotip OptiFunds */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 flex items-center justify-center text-emerald-600">
          <Compass className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
            OptiFunds
          </span>
          <span className="text-[10px] font-mono text-emerald-700 font-medium">FIDUCIARY SUITE</span>
        </div>
      </div>

      {/* Menú de navegació */}
      <nav className="flex-1 px-3.5 py-6 space-y-1.5">
        <div className="px-3 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
          Mòduls Analítics
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium no-underline transition-all ${
                isActive
                  ? "bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200/80 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? "text-emerald-700" : "text-slate-400"
                }`}
                strokeWidth={1.8}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Estat de la base de dades DuckDB */}
      <div className="p-4 border-t border-slate-100 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          DuckDB Engine
        </span>
        <span className="text-slate-500 font-semibold">4.654 fons</span>
      </div>
    </aside>
  );
}
