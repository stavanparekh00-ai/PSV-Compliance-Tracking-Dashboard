import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Database, Gauge, ShieldCheck, Upload } from 'lucide-react';
import { ImportModal } from './forms/ImportModal';
import { SyncIndicator } from './SyncIndicator';

export function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-maroon-800 bg-maroon-900 text-white shadow-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-bold sm:text-lg">PSV Tracking Dashboard</h1>
              <p className="text-[11px] text-maroon-200 sm:text-xs">
                Texas A&amp;M University · Utilities &amp; Energy Services
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <SyncIndicator />
            {!isHome && (
              <Link to="/" className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-maroon-100 hover:bg-white/10 sm:inline-flex">
                <Gauge className="h-4 w-4" />
                Dashboard
              </Link>
            )}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-maroon-100 hover:bg-white/10"
                title="Manage data"
              >
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Data</span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
                  <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-xl">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setImportOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                    >
                      <Upload className="h-4 w-4 text-slate-400" />
                      Import data…
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
