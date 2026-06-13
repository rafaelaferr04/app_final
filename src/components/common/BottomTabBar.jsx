import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Wallet, Target, BookOpen } from 'lucide-react';

const tabs = [
  { icon: Home,     label: 'Início',     page: 'Dashboard' },
  { icon: Wallet,   label: 'Transações', page: 'Transactions' },
  { icon: Target,   label: 'Metas',      page: 'Goals' },
  { icon: BookOpen, label: 'Cursos',     page: 'Courses' },
];

export default function BottomTabBar() {
  const location  = useLocation();
  const activePage = location.pathname.replace('/', '') || 'Dashboard';

  return (
    <nav className="wm-bottom-nav min-[800px]:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-100 safe-area-bottom">
      <div className="flex">
        {tabs.map(({ icon: Icon, label, page }) => {
          const active = activePage === page;
          return (
            <Link key={page} to={createPageUrl(page)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-all relative ${
                active ? 'text-blue-700' : 'text-slate-400 hover:text-slate-600'
              }`}>
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-50' : ''}`}>
                <Icon className={`w-5 h-5 transition-all ${active ? 'stroke-[2.5]' : ''}`} />
              </div>
              <span className="leading-none">{label}</span>
              {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-blue-600" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
