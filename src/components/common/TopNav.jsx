import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home, Wallet, Target, BookOpen,
  BarChart3, Trophy, Settings, LogOut, ChevronDown
} from 'lucide-react';
import logoImg from '../../../logo/logo.jpeg';

const navItems = [
  { icon: Home,     label: 'Início',     page: 'Dashboard' },
  { icon: Wallet,   label: 'Transações', page: 'Transactions' },
  { icon: Target,   label: 'Metas',      page: 'Goals' },
  { icon: BookOpen, label: 'Cursos',     page: 'Courses' },
];

export default function TopNav() {
  const location  = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const activePage = location.pathname.replace('/', '') || 'Dashboard';
  const initials   = user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  const firstName  = user?.full_name?.split(' ')[0] || 'Utilizador';

  return (
    <header className="sticky top-0 z-40 bg-blue-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 gap-6">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={logoImg} alt="WiseMoney" className="h-8 w-8 rounded-lg object-cover" />
            <div className="leading-none">
              <span className="text-white font-bold text-base tracking-tight block">WiseMoney</span>
              <span className="text-blue-300 text-[10px] font-medium tracking-wide hidden sm:block">A Tua Jornada Financeira</span>
            </div>
          </Link>

          {/* Desktop nav links — center */}
          <nav className="hidden min-[800px]:flex items-center gap-0.5 flex-1">
            {navItems.map(({ icon: Icon, label, page }) => {
              const active = activePage === page;
              return (
                <Link key={page} to={createPageUrl(page)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    active ? 'bg-white/20 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'
                  }`}>
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right side: Statistics, Achievements, User */}
          <div className="flex items-center gap-1 ml-auto">

            {/* Statistics icon */}
            <Link to={createPageUrl('Statistics')} title="Estatísticas"
              className={`p-2 rounded-lg transition ${activePage === 'Statistics' ? 'bg-white/20 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}>
              <BarChart3 className="w-5 h-5" />
            </Link>

            {/* Achievements icon */}
            <Link to={createPageUrl('Achievements')} title="Conquistas"
              className={`p-2 rounded-lg transition ${activePage === 'Achievements' ? 'bg-white/20 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}>
              <Trophy className="w-5 h-5" />
            </Link>

            {/* User dropdown */}
            <div className="relative">
              <button onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition ml-1">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {initials}
                </div>
                <span className="hidden sm:block max-w-[90px] truncate">{firstName}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-800 truncate">{user?.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>
                      <Link to={createPageUrl('Settings')} onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition">
                        <Settings className="w-4 h-4 text-slate-400" />
                        Definições
                      </Link>
                      <button onClick={() => { logout(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition">
                        <LogOut className="w-4 h-4" />
                        Terminar sessão
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
