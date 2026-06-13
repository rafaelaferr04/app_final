import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, LineChart, Line } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, subDays, startOfDay, endOfDay, subWeeks, subYears } from 'date-fns';
import { pt } from 'date-fns/locale';

const COLORS = ['#1d4ed8', '#3b82f6', '#06b6d4', '#ec4899', '#10b981', '#f97316', '#8b5cf6', '#ef4444'];

const categoryLabels = {
  salary: 'Salário', freelance: 'Freelance', investment: 'Investimento', gift: 'Presente',
  food: 'Alimentação', transport: 'Transporte', housing: 'Habitação', utilities: 'Contas',
  entertainment: 'Lazer', shopping: 'Compras', health: 'Saúde', education: 'Educação',
  savings: 'Poupança', other: 'Outros'
};

export default function Statistics() {
  const [period, setPeriod] = useState('month');
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => user ? base44.entities.Transaction.filter({ created_by: user.email }, '-date', 1000) : [],
    enabled: !!user
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', user?.email],
    queryFn: () => user ? base44.entities.SavingsGoal.filter({ created_by: user.email }) : [],
    enabled: !!user
  });

  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (period) {
      case 'week':    return { start: subWeeks(now, 1),   end: now };
      case 'month':   return { start: startOfMonth(now),  end: now };
      case 'quarter': return { start: subMonths(now, 3),  end: now };
      case 'year':    return { start: subYears(now, 1),   end: now };
      case 'all':     return { start: new Date(2000, 0, 1), end: now };
      default:        return { start: startOfMonth(now),  end: now };
    }
  }, [period]);

  const getFilteredTransactions = useCallback(() => {
    if (!transactions.length) return [];
    const { start, end } = getDateRange();
    return transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
  }, [transactions, getDateRange]);

  const getFilteredGoals = useCallback(() => {
    if (!goals.length) return [];
    if (period === 'all') return goals;
    const { start, end } = getDateRange();
    return goals.filter(g => {
      if (!g.completed_date) return true;
      const d = new Date(g.completed_date);
      return d >= start && d <= end;
    });
  }, [goals, period, getDateRange]);

  const filteredTransactions = useMemo(() => getFilteredTransactions(), [getFilteredTransactions]);
  const filteredGoals = useMemo(() => getFilteredGoals(), [getFilteredGoals]);

  const expenses = filteredTransactions.filter(t => t.type === 'expense');
  const income   = filteredTransactions.filter(t => t.type === 'income');
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome   = income.reduce((s, t) => s + t.amount, 0);
  const balance    = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;

  const expensesByCategory = expenses.reduce((acc, t) => { const c = t.category || 'other'; acc[c] = (acc[c] || 0) + t.amount; return acc; }, {});
  const pieChartData = Object.entries(expensesByCategory).map(([category, amount]) => ({ name: categoryLabels[category] || category, value: amount, category })).sort((a, b) => b.value - a.value);

  const incomeByCategory = income.reduce((acc, t) => { const c = t.category || 'other'; acc[c] = (acc[c] || 0) + t.amount; return acc; }, {});
  const incomePieData = Object.entries(incomeByCategory).map(([category, amount]) => ({ name: categoryLabels[category] || category, value: amount, category })).sort((a, b) => b.value - a.value);

  const getTimeChartData = () => {
    const now = new Date();
    const data = [];
    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        const s = startOfDay(date), e = endOfDay(date);
        const tx = transactions.filter(t => t.date && isWithinInterval(new Date(t.date), { start: s, end: e }));
        data.push({ name: format(date, 'EEE', { locale: pt }), receitas: tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), despesas: tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) });
      }
    } else if (period === 'month') {
      const monthStart = startOfMonth(now), daysInMonth = now.getDate(), step = Math.max(1, Math.floor(daysInMonth / 6));
      for (let i = 0; i <= daysInMonth; i += step) {
        const date = new Date(monthStart); date.setDate(Math.min(i + 1, daysInMonth));
        const s = startOfDay(date), e = endOfDay(new Date(Math.min(date.getTime() + (step - 1) * 86400000, now.getTime())));
        const tx = transactions.filter(t => t.date && isWithinInterval(new Date(t.date), { start: s, end: e }));
        data.push({ name: format(date, 'dd/MM'), receitas: tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), despesas: tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) });
      }
    } else {
      const months = period === 'quarter' ? 3 : period === 'year' ? 12 : 24;
      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(now, i);
        const s = startOfMonth(date), e = endOfMonth(date);
        const tx = transactions.filter(t => t.date && isWithinInterval(new Date(t.date), { start: s, end: e }));
        data.push({ name: format(date, 'MMM', { locale: pt }), receitas: tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), despesas: tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) });
      }
    }
    return data;
  };

  const getSpendingTrend = () => {
    const now = new Date(); const data = [];
    if (period === 'week') {
      for (let i = 6; i >= 0; i--) { const date = subDays(now, i); const s = startOfDay(date), e = endOfDay(date); data.push({ name: format(date, 'EEE', { locale: pt }), value: transactions.filter(t => t.type === 'expense' && t.date && isWithinInterval(new Date(t.date), { start: s, end: e })).reduce((s, t) => s + t.amount, 0) }); }
    } else if (period === 'month') {
      const monthStart = startOfMonth(now), daysInMonth = now.getDate(), step = Math.max(1, Math.floor(daysInMonth / 10));
      for (let i = 0; i <= daysInMonth; i += step) { const date = new Date(monthStart); date.setDate(Math.min(i + 1, daysInMonth)); const s = startOfDay(date), e = endOfDay(date); data.push({ name: format(date, 'dd/MM'), value: transactions.filter(t => t.type === 'expense' && t.date && isWithinInterval(new Date(t.date), { start: s, end: e })).reduce((s, t) => s + t.amount, 0) }); }
    } else if (period === 'quarter') {
      for (let i = 11; i >= 0; i--) { const we = subWeeks(now, i); const ws = subDays(we, 6); data.push({ name: format(we, 'dd/MM'), value: transactions.filter(t => t.type === 'expense' && t.date && isWithinInterval(new Date(t.date), { start: startOfDay(ws), end: endOfDay(we) })).reduce((s, t) => s + t.amount, 0) }); }
    } else {
      const months = period === 'year' ? 12 : 24;
      for (let i = months - 1; i >= 0; i--) { const date = subMonths(now, i); const s = startOfMonth(date), e = endOfMonth(date); data.push({ name: format(date, 'MMM', { locale: pt }), value: transactions.filter(t => t.type === 'expense' && t.date && isWithinInterval(new Date(t.date), { start: s, end: e })).reduce((s, t) => s + t.amount, 0) }); }
    }
    return data;
  };

  const getBalanceEvolution = () => {
    const now = new Date(); const data = [];
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (period === 'week') {
      for (let i = 6; i >= 0; i--) { const date = subDays(now, i); const e = endOfDay(date); const bal = sortedTx.filter(t => new Date(t.date) <= e).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0); data.push({ name: format(date, 'EEE', { locale: pt }), saldo: bal }); }
    } else if (period === 'month') {
      const monthStart = startOfMonth(now), daysInMonth = now.getDate(), step = Math.max(1, Math.floor(daysInMonth / 6));
      for (let i = 0; i <= daysInMonth; i += step) { const date = new Date(monthStart); date.setDate(Math.min(i + 1, daysInMonth)); const e = endOfDay(date); const bal = sortedTx.filter(t => new Date(t.date) <= e).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0); data.push({ name: format(date, 'dd/MM'), saldo: bal }); }
    } else {
      const months = period === 'quarter' ? 3 : period === 'year' ? 12 : 24;
      for (let i = months - 1; i >= 0; i--) { const date = subMonths(now, i); const e = endOfMonth(date); const bal = sortedTx.filter(t => new Date(t.date) <= e).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0); data.push({ name: format(date, 'MMM', { locale: pt }), saldo: bal }); }
    }
    return data;
  };

  const avgDailySpending = expenses.length > 0 ? totalExpenses / Math.max(1, new Set(expenses.map(e => e.date)).size) : 0;
  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const timeChartData  = getTimeChartData();
  const spendingTrend  = getSpendingTrend();
  const balanceEvolution = getBalanceEvolution();
  const periodLabels = { week: 'Semana', month: 'Mês', quarter: 'Trimestre', year: 'Ano', all: 'Sempre' };

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden shadow-md border border-blue-100">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 text-white">
          <p className="text-xs font-medium text-blue-200 uppercase tracking-widest mb-0.5">Visão Financeira</p>
          <h1 className="text-2xl font-bold">Estatísticas</h1>
        </div>
        <div className="bg-white grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
          {[
            { label: 'Receitas',     value: `€${totalIncome.toLocaleString('pt-PT')}`,   color: 'text-emerald-600' },
            { label: 'Despesas',     value: `€${totalExpenses.toLocaleString('pt-PT')}`, color: 'text-rose-600' },
            { label: 'Saldo',        value: `€${balance.toLocaleString('pt-PT')}`,       color: balance >= 0 ? 'text-blue-600' : 'text-rose-600' },
            { label: 'Taxa Poupança',value: `${savingsRate.toFixed(0)}%`,                color: 'text-slate-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-4 py-3 text-center sm:text-left">
              <p className={`text-base font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Period filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {[{ id: 'week', label: 'Semana' }, { id: 'month', label: 'Mês' }, { id: 'quarter', label: 'Trimestre' }, { id: 'year', label: 'Ano' }, { id: 'all', label: 'Sempre' }].map((p) => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${period === p.id ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Avg daily spending */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white flex items-center justify-between shadow-md">
        <div>
          <p className="text-sm text-blue-100">Gasto Médio Diário</p>
          <p className="text-xs text-blue-200">{periodLabels[period]}</p>
        </div>
        <p className="text-3xl font-bold">€{avgDailySpending.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}</p>
      </motion.div>

      {/* Row 1: Spending Trend + Balance Evolution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2.5 mb-4"><div className="w-1 h-4 rounded-full bg-rose-500" /><h3 className="font-semibold text-slate-800 text-sm">Tendência de Gastos</h3></div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v}`} width={50} />
                <Tooltip formatter={(value) => [`€${value.toLocaleString('pt-PT')}`, 'Gastos']} />
                <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2.5 mb-4"><div className="w-1 h-4 rounded-full bg-blue-700" /><h3 className="font-semibold text-slate-800 text-sm">Evolução do Saldo</h3></div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={balanceEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v}`} width={50} />
                <Tooltip formatter={(value) => [`€${value.toLocaleString('pt-PT')}`, 'Saldo']} />
                <Line type="monotone" dataKey="saldo" stroke="#1d4ed8" strokeWidth={2.5} dot={{ fill: '#1d4ed8', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Row 2: Receitas vs Despesas + Expenses by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2.5 mb-4"><div className="w-1 h-4 rounded-full bg-blue-500" /><h3 className="font-semibold text-slate-800 text-sm">Receitas vs Despesas</h3></div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v}`} width={50} />
                <Tooltip formatter={(value) => [`€${value.toLocaleString('pt-PT')}`, '']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2.5 mb-4"><div className="w-1 h-4 rounded-full bg-indigo-500" /><h3 className="font-semibold text-slate-800 text-sm">Despesas por Categoria</h3></div>
          {pieChartData.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="w-32 h-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie><Pie data={pieChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={2} dataKey="value">{pieChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie></RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                {pieChartData.slice(0, 5).map((item, i) => (
                  <div key={item.category} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-xs text-slate-600 truncate">{item.name}</span></div>
                    <span className="text-xs font-medium text-slate-800 shrink-0">€{item.value.toLocaleString('pt-PT')}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-center text-slate-500 py-6 text-sm">Sem despesas</p>}
        </motion.div>
      </div>

      {/* Row 3: Income by Category + Maiores Despesas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {incomePieData.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2.5 mb-4"><div className="w-1 h-4 rounded-full bg-emerald-500" /><h3 className="font-semibold text-slate-800 text-sm">Receitas por Categoria</h3></div>
            <div className="flex items-center gap-3">
              <div className="w-32 h-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie><Pie data={incomePieData} cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={2} dataKey="value">{incomePieData.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}</Pie></RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                {incomePieData.slice(0, 4).map((item, i) => (
                  <div key={item.category} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[(i + 3) % COLORS.length] }} /><span className="text-xs text-slate-600 truncate">{item.name}</span></div>
                    <span className="text-xs font-medium text-slate-800 shrink-0">€{item.value.toLocaleString('pt-PT')}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : <div />}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2.5 mb-4"><div className="w-1 h-4 rounded-full bg-amber-500" /><h3 className="font-semibold text-slate-800 text-sm">Maiores Despesas</h3></div>
          {topExpenses.length > 0 ? (
            <div className="space-y-2.5">
              {topExpenses.map((expense, index) => (
                <div key={expense.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}>{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{expense.title}</p>
                    <p className="text-xs text-slate-400">{categoryLabels[expense.category] || expense.category}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800 shrink-0">€{expense.amount.toLocaleString('pt-PT')}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-center text-slate-500 py-4 text-sm">Sem despesas</p>}
        </motion.div>
      </div>

      {/* Goals progress — full width */}
      {filteredGoals.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2.5 mb-4"><div className="w-1 h-4 rounded-full bg-emerald-600" /><h3 className="font-semibold text-slate-800 text-sm">Progresso das Metas</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGoals.map((goal) => {
              const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
              return (
                <div key={goal.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 truncate">{goal.icon || '🎯'} {goal.title}</span>
                    <span className="text-slate-500 shrink-0 ml-2">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-blue-800 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>€{goal.current_amount?.toLocaleString('pt-PT')}</span>
                    <span>€{goal.target_amount?.toLocaleString('pt-PT')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
