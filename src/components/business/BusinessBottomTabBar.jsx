import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, Target, Users, BarChart3 } from 'lucide-react';

const tabs = [
  { icon: LayoutDashboard, label: 'Dashboard',   path: '/BusinessDashboard' },
  { icon: Wallet,          label: 'Transações',  path: '/BusinessTransactions' },
  { icon: Target,          label: 'KPIs',        path: '/BusinessKPIs' },
  { icon: Users,           label: 'Equipa',      path: '/BusinessEmployees' },
  { icon: BarChart3,       label: 'Análise',     path: '/BusinessStats' },
];

export default function BusinessBottomTabBar() {
  const location = useLocation();

  return (
    <nav className="wm-bottom-nav min-[800px]:hidden shrink-0 bg-white/95 border-t border-amber-100 safe-area-bottom">
      <div className="flex">
        {tabs.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path || (path === '/BusinessDashboard' && location.pathname === '/');
          return (
            <Link key={path} to={path}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-all relative ${
                active ? 'text-amber-700' : 'text-slate-400 hover:text-slate-600'
              }`}>
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-amber-50' : ''}`}>
                <Icon className={`w-5 h-5 transition-all ${active ? 'stroke-[2.5]' : ''}`} />
              </div>
              <span className="leading-none">{label}</span>
              {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-amber-600" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
