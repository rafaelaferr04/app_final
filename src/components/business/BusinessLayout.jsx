import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, Settings, BarChart3, Users, Wallet, Target, LayoutDashboard, Trophy, Flag } from 'lucide-react';
import BusinessBottomTabBar from './BusinessBottomTabBar';
import BusinessChatbot from './BusinessChatbot';
import BusinessSetupModal from './BusinessSetupModal';
import { usePlan } from '@/lib/PlanContext';

const NAV_LINKS = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/BusinessDashboard' },
  { icon: Wallet,          label: 'Transações', path: '/BusinessTransactions' },
  { icon: Target,          label: 'KPIs',       path: '/BusinessKPIs' },
  { icon: Users,           label: 'Equipa',     path: '/BusinessEmployees' },
  { icon: BarChart3,       label: 'Análise',    path: '/BusinessStats' },
  { icon: Trophy,          label: 'Conquistas', path: '/BusinessAchievements' },
  { icon: Flag,            label: 'Metas',      path: '/BusinessGoals' },
];

export default function BusinessLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { needsBusinessSetup, reloadProfile } = usePlan();

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top nav */}
      <header className="shrink-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-14 min-w-0 gap-2">
          <Link to="/BusinessDashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-sm truncate">WiseMoney <span className="text-amber-600">Business</span></span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden min-[800px]:flex items-center gap-0.5">
            {NAV_LINKS.map(({ icon: Icon, label, path }) => {
              const active = location.pathname === path;
              return (
                <Link key={path} to={path}
                  className={`flex items-center gap-1 px-2 min-[1100px]:px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    active ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden min-[1100px]:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            {/* Conquistas + Metas icons — only on small screens */}
            <Link to="/BusinessAchievements"
              className={`min-[800px]:hidden p-2 rounded-xl transition-colors ${
                location.pathname === '/BusinessAchievements'
                  ? 'bg-amber-50 text-amber-600'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }`}>
              <Trophy className="w-5 h-5" />
            </Link>
            <Link to="/BusinessGoals"
              className={`min-[800px]:hidden p-2 rounded-xl transition-colors ${
                location.pathname === '/BusinessGoals'
                  ? 'bg-amber-50 text-amber-600'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }`}>
              <Flag className="w-5 h-5" />
            </Link>

            <button onClick={() => navigate('/Settings')}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 min-[800px]:pb-8 min-w-0">
          {children}
        </div>
      </main>

      <BusinessBottomTabBar />
      <BusinessChatbot />

      {/* Show setup modal if business plan is active but no workspace linked */}
      <BusinessSetupModal
        isOpen={needsBusinessSetup}
        onClose={() => {}}
        onComplete={() => reloadProfile()}
      />
    </div>
  );
}
