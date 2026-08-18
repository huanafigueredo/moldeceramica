import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flame, Grid, Layers, Compass, Calculator, Lightbulb, Pencil, ChevronRight } from 'lucide-react';

interface AppHeaderProps {
  globalShrinkage?: number;
}

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: Grid },
  { path: '/moldes', label: 'Moldes', icon: Layers },
  { path: '/desenhar', label: 'Desenhar', icon: Pencil },
  { path: '/biblioteca', label: 'Biblioteca', icon: Compass },
  { path: '/calculadoras', label: 'Calculadoras', icon: Calculator },
  { path: '/sugestoes', label: 'Sugestões', icon: Lightbulb },
];

export default function AppHeader({ globalShrinkage }: AppHeaderProps) {
  const location = useLocation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // On narrow screens the nav overflows and scrolls sideways with no visual
  // hint that "Biblioteca"/"Calculadoras"/"Sugestões" exist off-screen —
  // this tracks whether there's more to scroll to so we can show a fade +
  // arrow, and hides it once the user has scrolled all the way.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const checkScroll = () => {
      setCanScrollRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 4);
    };
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scrollNavRight = () => {
    scrollerRef.current?.scrollBy({ left: 140, behavior: 'smooth' });
  };

  return (
    <>
      <header className="no-print sticky top-0 w-full min-w-0 bg-white/70 backdrop-blur-md border-b border-terracotta-100/30 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-terracotta-500 flex items-center justify-center text-white shadow-sm">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-clay-900">
                CeraMold <span className="text-[10px] font-sans font-medium px-2 py-0.5 bg-terracotta-50 text-terracotta-600 rounded-full border border-terracotta-100">v1.0</span>
              </span>
            </div>
          </Link>

          {globalShrinkage !== undefined && (
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-clay-50 border border-terracotta-100/50 rounded-full">
                <span className="text-[10px] text-clay-900/40 font-bold uppercase tracking-wider">Retração:</span>
                <span className="text-xs font-mono font-bold text-terracotta-600">
                  {globalShrinkage.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="no-print w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="relative mb-8">
          <div
            ref={scrollerRef}
            className="flex bg-white/50 p-1 rounded-2xl border border-terracotta-100/50 gap-1 overflow-x-auto min-w-0"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-terracotta-600 shadow-sm border border-terracotta-100'
                      : 'text-clay-900/55 hover:text-clay-900/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {canScrollRight && (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-8 top-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-clay-50/90 rounded-r-2xl"
              />
              <button
                onClick={scrollNavRight}
                aria-label="Ver mais opções de navegação"
                className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center rounded-r-2xl bg-clay-50/90 text-clay-900/50 hover:text-terracotta-600 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
