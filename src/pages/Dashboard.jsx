import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, ChevronRight, Target,
  ShoppingBag, Utensils, Car, Home, Zap, Gamepad2, Heart,
  GraduationCap, PiggyBank, Briefcase, Gift, TrendingUp, MoreHorizontal
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

import DashboardHero from '../components/dashboard/DashboardHero';
import GameBanner from '../components/dashboard/GameBanner';
import ExpensesPieChart from '../components/dashboard/ExpensesPieChart';
import WeeklyChart from '../components/dashboard/WeeklyChart';
import LevelBadge from '../components/dashboard/LevelBadge';
import DailyTip from '../components/dashboard/DailyTip';
import AddTransactionSheet from '../components/transactions/AddTransactionSheet';
import BankIntegrationBanner from '../components/dashboard/BankIntegrationBanner';
import BankConnectionModal from '../components/settings/BankConnectionModal';

const catConfig = {
  salary:        { icon: Briefcase,      color: 'text-emerald-600', bg: 'bg-emerald-50' },
  freelance:     { icon: Briefcase,      color: 'text-teal-600',    bg: 'bg-teal-50' },
  investment:    { icon: TrendingUp,     color: 'text-blue-600',    bg: 'bg-blue-50' },
  gift:          { icon: Gift,           color: 'text-pink-600',    bg: 'bg-pink-50' },
  food:          { icon: Utensils,       color: 'text-orange-600',  bg: 'bg-orange-50' },
  transport:     { icon: Car,            color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  housing:       { icon: Home,           color: 'text-violet-600',  bg: 'bg-violet-50' },
  utilities:     { icon: Zap,            color: 'text-yellow-600',  bg: 'bg-yellow-50' },
  entertainment: { icon: Gamepad2,       color: 'text-purple-600',  bg: 'bg-purple-50' },
  shopping:      { icon: ShoppingBag,    color: 'text-rose-600',    bg: 'bg-rose-50' },
  health:        { icon: Heart,          color: 'text-red-600',     bg: 'bg-red-50' },
  education:     { icon: GraduationCap,  color: 'text-cyan-600',    bg: 'bg-cyan-50' },
  savings:       { icon: PiggyBank,      color: 'text-emerald-600', bg: 'bg-emerald-50' },
  other:         { icon: MoreHorizontal, color: 'text-slate-600',   bg: 'bg-slate-50' },
};

export default function Dashboard() {
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [user, setUser] = useState(null);
  const [motivationMsgs, setMotivationMsgs] = useState([]);
  const [motivationIdx, setMotivationIdx] = useState(0);
  const [motivationVisible, setMotivationVisible] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem('motivation_cache_v2');
    if (cached) {
      const { msgs, timestamp } = JSON.parse(cached);
      if ((Date.now() - timestamp) < 6 * 60 * 60 * 1000 && msgs?.length > 0) {
        setMotivationMsgs(msgs);
        return;
      }
    }
    base44.integrations.Core.InvokeLLM({
      prompt: 'Gera 4 frases motivacionais curtas (máximo 12 palavras cada) sobre finanças ou poupança. Responde apenas com as 4 frases separadas pelo caractere |, sem numeração nem aspas.',
      system: 'Responde em português de Portugal. Máximo 12 palavras por frase. Sê positivo e encorajador.'
    }).then(result => {
      const clean = typeof result === 'string' ? result.trim() : '';
      if (clean) {
        const msgs = clean.split('|').map(m => m.trim()).filter(m => m.length > 0);
        if (msgs.length > 0) {
          setMotivationMsgs(msgs);
          localStorage.setItem('motivation_cache_v2', JSON.stringify({ msgs, timestamp: Date.now() }));
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (motivationMsgs.length <= 1) return;
    const interval = setInterval(() => {
      setMotivationVisible(false);
      setTimeout(() => {
        setMotivationIdx(idx => (idx + 1) % motivationMsgs.length);
        setMotivationVisible(true);
      }, 300);
    }, 45000);
    return () => clearInterval(interval);
  }, [motivationMsgs]);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => user ? base44.entities.Transaction.filter({ created_by: user.email }, '-date', 1000) : [],
    enabled: !!user, staleTime: 30000
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', user?.email],
    queryFn: () => user ? base44.entities.SavingsGoal.filter({ created_by: user.email }, '-created_date', 50) : [],
    enabled: !!user, staleTime: 30000
  });

  const { data: courseProgress = [] } = useQuery({
    queryKey: ['courseProgress', user?.email],
    queryFn: () => user ? base44.entities.CourseProgress.filter({ created_by: user.email }) : [],
    enabled: !!user, staleTime: 60000
  });

  const { data: userProfiles = [] } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      if (profiles.length === 0) {
        const p = await base44.entities.UserProfile.create({ total_xp: 0, current_level: 1, streak_days: 0, notifications_enabled: true });
        return [p];
      }
      return profiles;
    },
    enabled: !!user, staleTime: 30000
  });

  const userProfile = userProfiles[0] || { total_xp: 0, current_level: 1, streak_days: 0, monthly_budget: 0 };

  const createTransaction = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });

  const updateUserProfile = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserProfile.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] })
  });

  const handleConnectBank = (provider) => {
    if (userProfile?.id) {
      updateUserProfile.mutate({ id: userProfile.id, data: { bank_connected: true, bank_provider: provider.id, bank_access_token: provider.access_token, bank_last_sync: new Date().toISOString() } });
    }
    setShowBankModal(false);
  };

  const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalBalance  = totalIncome - totalExpenses;

  const now = new Date();
  const monthlyTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyIncome   = monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthlySavings  = goals.reduce((s, g) => s + (g.contribution_history || []).filter(c => {
    const d = new Date(c.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((a, c) => a + c.amount, 0), 0);
  const completedCourses = courseProgress.filter(p => p.completed).length;

  const totalSaved    = goals.reduce((s, g) => s + (g.current_amount || 0), 0);
  const totalTarget   = goals.reduce((s, g) => s + (g.target_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const recentTransactions = transactions.slice(0, 15);

  return (
    <div className="space-y-4">
      <DashboardHero
        userName={user?.full_name}
        streak={userProfile.streak_days}
        totalBalance={totalBalance}
        monthlyIncome={monthlyIncome}
        monthlyExpenses={monthlyExpenses}
        monthlySavings={monthlySavings}
        monthlyBudget={userProfile.monthly_budget || 0}
      />

      {motivationMsgs.length > 0 && (
        <div className={`flex items-center gap-2.5 px-4 py-3 bg-white rounded-xl shadow-sm border-l-2 border-blue-400 transition-opacity duration-300 ${motivationVisible ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-base shrink-0">✨</span>
          <p className="text-xs sm:text-sm text-slate-500 italic leading-snug">{motivationMsgs[motivationIdx]}</p>
        </div>
      )}

      <BankIntegrationBanner onConnect={() => setShowBankModal(true)} isConnected={userProfile?.bank_connected} />

      {/* Gráficos — sempre lado a lado */}
      <div className="grid grid-cols-2 gap-3">
        <ExpensesPieChart transactions={transactions} />
        <WeeklyChart transactions={transactions} />
      </div>

      {/* Últimas Transações — horizontal scroll */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="px-4 pt-4 pb-2">
          <Link to={createPageUrl('Transactions')} className="flex items-center justify-between group">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">Últimas Transações</p>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="py-6 text-center px-4">
            <p className="text-slate-400 text-sm">Ainda sem transações.</p>
            <p className="text-slate-400 text-xs mt-1">Usa o botão + para começar a registar.</p>
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-4">
            {recentTransactions.map((t) => {
              const cfg = catConfig[t.category] || catConfig.other;
              const Icon = cfg.icon;
              const isIncome = t.type === 'income';
              return (
                <div key={t.id} className="flex-shrink-0 w-28 sm:w-32 bg-slate-50 rounded-xl p-2.5 sm:p-3 border border-slate-100 hover:border-blue-100 transition-colors">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${cfg.bg} flex items-center justify-center mb-1.5 sm:mb-2`}>
                    <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${cfg.color}`} />
                  </div>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-800 truncate mb-1">{t.title}</p>
                  <p className={`text-xs sm:text-sm font-bold ${isIncome ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {isIncome ? '+' : '−'}€{Math.abs(t.amount).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                  </p>
                  {t.date && (
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                      {format(new Date(t.date + 'T12:00:00'), 'dd-MM-yyyy')}
                    </p>
                  )}
                </div>
              );
            })}
            <Link
              to={createPageUrl('Transactions')}
              className="flex-shrink-0 w-24 sm:w-28 bg-blue-50 border border-blue-100 rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center gap-1.5 sm:gap-2 hover:bg-blue-100 transition-colors"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-800 flex items-center justify-center shadow-sm">
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-blue-700 text-center">Ver todas</p>
            </Link>
          </div>
        )}
      </div>

      {/* Aprender + Nível + Metas — desktop: Metas ligeiramente maior; mobile: 2-col + baixo */}
      <div className="grid grid-cols-2 min-[700px]:grid-cols-[0.7fr_0.7fr_2fr] gap-3">
        <GameBanner totalXp={userProfile.total_xp} completedCourses={completedCourses} compact />
        <LevelBadge totalXp={userProfile.total_xp} level={userProfile.current_level} compact />

        {/* Metas de Poupança */}
        <div className="col-span-2 min-[700px]:col-span-1 min-w-0 bg-white rounded-2xl shadow-sm">
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-1">
              <Link to={createPageUrl('Goals')} className="flex items-center gap-1 group">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">Metas de Poupança</p>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
              </Link>
              {totalTarget > 0 && (
                <span className="text-sm font-bold text-blue-700">{overallProgress.toFixed(0)}%</span>
              )}
            </div>
            {totalTarget > 0 && (
              <motion.div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(overallProgress, 100)}%` }}
                  transition={{ duration: 1 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full"
                />
              </motion.div>
            )}
          </div>
          {goals.length === 0 ? (
            <div className="py-5 text-center px-4">
              <Target className="h-7 w-7 mx-auto text-slate-300 mb-1.5" />
              <p className="text-slate-400 text-xs">Sem metas definidas</p>
              <Link to={createPageUrl('Goals')} className="text-xs font-medium text-blue-600 mt-1 inline-block">
                Criar meta →
              </Link>
            </div>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-4">
              {goals.map((goal) => {
                const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                return (
                  <div key={goal.id} className="flex-shrink-0 w-36 sm:w-40 bg-slate-50 rounded-xl p-2.5 sm:p-3 border border-slate-100 hover:border-blue-100 transition-colors">
                    <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                      <span className="text-base sm:text-lg">{goal.icon || '🎯'}</span>
                      <p className="text-[11px] sm:text-xs font-semibold text-slate-800 truncate">{goal.title}</p>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500">
                      €{(goal.current_amount || 0).toLocaleString('pt-PT', { maximumFractionDigits: 0 })} / €{(goal.target_amount || 0).toLocaleString('pt-PT', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[11px] sm:text-xs font-bold text-blue-600 mt-0.5">{progress.toFixed(0)}%</p>
                  </div>
                );
              })}
              <Link
                to={createPageUrl('Goals')}
                className="flex-shrink-0 w-24 sm:w-28 bg-blue-50 border border-blue-100 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-800 flex items-center justify-center shadow-sm">
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <p className="text-[11px] sm:text-xs font-semibold text-blue-700 text-center">Ver todas</p>
              </Link>
            </div>
          )}
        </div>
      </div>

      <DailyTip />

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setShowAddTransaction(true)}
        className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-50 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-blue-900 text-white shadow-lg shadow-blue-900/40 hover:bg-blue-950 transition-colors"
        title="Nova transação"
      >
        <Plus className="h-5 w-5 md:h-6 md:w-6" />
      </motion.button>

      <AddTransactionSheet isOpen={showAddTransaction} onClose={() => setShowAddTransaction(false)} onSave={(data) => createTransaction.mutateAsync(data)} />
      <BankConnectionModal isOpen={showBankModal} onClose={() => setShowBankModal(false)} onConnect={handleConnectBank} />
    </div>
  );
}
