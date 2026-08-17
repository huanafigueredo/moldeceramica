import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flame, Grid, Layers, Compass, Calculator, Lightbulb } from 'lucide-react';

interface AppHeaderProps {
  globalShrinkage?: number;
}

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: Grid },
  { path: '/moldes', label: 'Moldes', icon: Layers },
  { path: '/biblioteca', label: 'Biblioteca', icon: Compass },
  { path: '/calculadoras', label: 'Calculadoras', icon: Calculator },
  { path: '/sugestoes', label: 'Sugestões', icon: Lightbulb },
];

export default function AppHeader({ globalShrinkage }: AppHeaderProps) {
  const location = useLocation();

  return (
    <>
      <header className="no-print sticky top-0 bg-white/70 backdrop-blur-md border-b border-terracotta-100/30 z-40 transition-colors">
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

      <div className="no-print max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex bg-white/50 p-1 rounded-2xl border border-terracotta-100/50 mb-8 gap-1 overflow-x-auto">
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
                    : 'text-clay-900/40 hover:text-clay-900/70'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
