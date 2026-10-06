"use client";

import { Search, Calendar, Bell, User } from "lucide-react";

export function TopHeader() {
  const handleOpenSearch = () => {
    window.dispatchEvent(new Event("open-command-menu"));
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0">
      {/* Input que fa saltar la cerca global */}
      <button
        type="button"
        onClick={handleOpenSearch}
        className="flex items-center gap-3 w-80 px-3 py-2 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-100/60 transition-all text-left group shadow-2xs"
      >
        <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
        <span className="flex-1">Cmd+K search...</span>
        <kbd className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500 shadow-2xs">
          ⌘K
        </kbd>
      </button>

      {/* Controls dreta */}
      <div className="flex items-center gap-4 text-slate-500">
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
          <Calendar className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 relative">
          <Bell className="w-4 h-4" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1.5 right-1.5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
          <User className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    </header>
  );
}
