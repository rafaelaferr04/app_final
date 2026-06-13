import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, PiggyBank } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const fmt = (n) => n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardHero({
  userName, streak,
  totalBalance,
  monthlyIncome, monthlyExpenses, monthlySavings,
  monthlyBudget
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 19 ? 'Boa tarde' : 'Boa noite';
  const firstName = userName?.split(' ')[0] || '';
  const today = format(new Date(), "EEE, d MMM", { locale: pt });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  const budgetRemaining = monthlyBudget > 0 ? monthlyBudget - monthlyExpenses : null;
  const budgetPct = monthlyBudget > 0 ? Math.min((monthlyExpenses / monthlyBudget) * 100, 100) : 0;

  const stats = [
    { label: 'Receitas', value: monthlyIncome,       icon: TrendingUp,   iconColor: 'text-emerald-300' },
    { label: 'Despesas', value: monthlyExpenses,      icon: TrendingDown, iconColor: 'text-rose-300' },
    { label: 'Poupado',  value: monthlySavings || 0,  icon: PiggyBank,    iconColor: 'text-sky-300' },
    monthlyBudget > 0
      ? { label: 'Orçamento', value: Math.abs(budgetRemaining), icon: Target,
          iconColor: budgetRemaining < 0 ? 'text-rose-300' : 'text-white/70',
          prefix: budgetRemaining < 0 ? '−' : '', suffix: budgetRemaining >= 0 ? ' rest.' : ' exc.' }
      : { label: 'Orçamento', value: null, icon: Target, iconColor: 'text-white/30', noValue: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden shadow-lg"
    >
      <div className="bg-gradient-to-br from-blue-600 via-violet-700 to-indigo-800 px-4 py-4 relative overflow-hidden">
        {/* 1 círculo decorativo subtil */}
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/5 rounded-full pointer-events-none" />

        <div className="relative">
          {/* Greeting + streak */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <p className="text-xs text-blue-200 truncate">
              {greeting}{firstName ? `, ${firstName}` : ''}! &nbsp;·&nbsp; {todayCapitalized}
            </p>
            {streak > 0 && (
              <div className="flex items-center gap-1 bg-white/15 rounded-full px-2 py-0.5 shrink-0">
                <span className="text-sm">🔥</span>
                <span className="text-xs font-bold text-white">{streak}d</span>
              </div>
            )}
          </div>

          {/* Balance — centrado */}
          <div className="text-center mb-3">
            <p className={`text-3xl sm:text-4xl font-bold tracking-tight leading-none ${totalBalance < 0 ? 'text-rose-200' : 'text-white'}`}>
              {totalBalance < 0 ? '−' : ''}€{fmt(Math.abs(totalBalance))}
            </p>
            <p className="text-xs text-blue-200 mt-1">Saldo Total</p>
          </div>

          {/* Stats — 4 frosted blocks */}
          <div className="grid grid-cols-4 gap-1.5 mb-2.5">
            {stats.map(({ label, value, icon: Icon, iconColor, prefix = '', suffix = '', noValue = false }) => (
              <div key={label} className="bg-white/10 rounded-xl px-1.5 py-2 text-center backdrop-blur-sm">
                <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${iconColor}`} />
                {noValue ? (
                  <p className="text-sm font-bold text-white/40 leading-tight">—</p>
                ) : (
                  <p className="text-sm font-bold text-white truncate leading-tight">
                    {prefix}€{value.toLocaleString('pt-PT')}{suffix}
                  </p>
                )}
                <p className="text-[11px] text-blue-200 mt-0.5 leading-none">{label}</p>
              </div>
            ))}
          </div>

          {/* Budget bar */}
          {monthlyBudget > 0 && (
            <div className="pt-2.5 border-t border-white/15">
              <div className="flex justify-between text-xs text-blue-200 mb-1">
                <span>Orçamento: €{monthlyBudget.toLocaleString('pt-PT')}</span>
                <span className={budgetPct >= 100 ? 'text-rose-200 font-semibold' : budgetPct >= 75 ? 'text-amber-200' : 'text-emerald-200'}>
                  {budgetPct.toFixed(0)}% utilizado
                </span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${budgetPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${budgetPct >= 100 ? 'bg-rose-300' : budgetPct >= 75 ? 'bg-amber-300' : 'bg-emerald-300'}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
