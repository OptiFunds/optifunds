"use client";

import { Search, Calendar, Bell, User } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 px-8 flex items-center justify-between border-b border-slate-200/80 bg-white sticky top-0 z-30">
      {/* Cercador Cmd+K */}
      <div className="relative w-72 sm:w-80">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          placeholder="Cmd+K search"
          readOnly
          className="w-full bg-slate-50/80 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Utilitats dreta */}
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
          <Calendar className="w-4 h-4" />
        </button>

        <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>

        <button className="w-8 h-8 ml-1 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:border-slate-300 transition-all">
          <User className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
