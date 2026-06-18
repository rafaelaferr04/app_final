import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { TrendingUp, TrendingDown, BarChart3, Building2, Calculator, Users, Star } from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────
function getSalaryAtMonth(emp, monthKey, histories) {
  const relevant = histories
    .filter(h => h.employee_id === emp.id && h.effective_date?.slice(0, 7) <= monthKey)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  return relevant.length > 0 ? (relevant[0].salary || 0) : (emp.salary || 0);
}

function fmtMoney(v, decimals = 0) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `€${(v / 1_000).toFixed(1)}k`;
  return `€${Number(v).toFixed(decimals)}`;
}
function fmtPct(v) { return `${Number(v).toFixed(1)}%`; }

const COLORS = ['#d97706', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4'];

const TABS = [
  { key: 'pl',          label: 'P&L',        icon: TrendingUp  },
  { key: 'cashflow',    label: 'Cash Flow',   icon: BarChart3   },
  { key: 'team',        label: 'Equipa',      icon: Users       },
  { key: 'ratios',      label: 'Rácios',      icon: Calculator  },
];

function buildMonths(count) {
  return Array.from({ length: count }, (_, i) => {
    const d = subMonths(new Date(), count - 1 - i);
    return { label: format(d, 'MMM', { locale: pt }), key: format(d, 'yyyy-MM') };
  });
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? fmtMoney(p.value, 0) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Main ────────────────────────────────────────────────────────────────────
export default function BusinessStats() {
  const [tab, setTab]       = useState('pl');
  const [period, setPeriod] = useState('6m');

  const { data: transactions = [] } = useQuery({
    queryKey: ['business_transactions'],
    queryFn: () => base44.entities.BusinessTransaction.filter({}, '-created_date', 1000),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.filter(),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['employees_all'],
    queryFn: () => base44.entities.Employee.filter(),
  });
  const { data: kpis = [] } = useQuery({
    queryKey: ['business_kpis'],
    queryFn: () => base44.entities.BusinessKPI.filter({ is_active: true }),
  });
  const { data: salaryHistories = [] } = useQuery({
    queryKey: ['salary_history'],
    queryFn: () => base44.entities.SalaryHistory.filter({}, '-effective_date'),
  });

  const globalMonthCount = useMemo(() => {
    const allDates = transactions.map(t => t.date).filter(Boolean);
    if (allDates.length === 0) return 12;
    const earliest = allDates.sort()[0];
    const [y, m] = earliest.split('-').map(Number);
    const now = new Date();
    const diff = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m) + 1;
    return Math.max(1, diff);
  }, [transactions]);

  const monthCount = period === '1m' ? 1 : period === '3m' ? 3 : period === '6m' ? 6 : period === '12m' ? 12 : globalMonthCount;
  const months     = buildMonths(monthCount);

  // ── P&L per month ─────────────────────────────────────────────────────────
  const plMonths = useMemo(() => months.map(m => {
    const rev     = transactions.filter(t => t.type === 'revenue'   && t.date?.startsWith(m.key)).reduce((s, t) => s + (t.amount || 0), 0);
    // Salaries: only employees hired on or before end of this month, using effective salary at that month
    const salaries = employees
      .filter(e => e.status === 'active' && (!e.hire_date || e.hire_date.slice(0, 7) <= m.key))
      .reduce((s, e) => s + getSalaryAtMonth(e, m.key, salaryHistories), 0);
    // OpCosts = ALL cost transactions (excluding 'salaries' category to avoid double-counting)
    const opCosts  = transactions.filter(t => t.type === 'cost' && t.category !== 'salaries' && t.date?.startsWith(m.key)).reduce((s, t) => s + (t.amount || 0), 0);
    const invest   = transactions.filter(t => t.type === 'investment' && t.date?.startsWith(m.key)).reduce((s, t) => s + (t.amount || 0), 0);
    const taxes    = transactions.filter(t => t.type === 'tax'        && t.date?.startsWith(m.key)).reduce((s, t) => s + (t.amount || 0), 0);
    const costs    = salaries + opCosts;
    const gross    = rev - costs;
    const ebitda   = gross - invest;
    const net      = ebitda - taxes;
    const margin   = rev > 0 ? Math.round((gross / rev) * 10) / 10 : 0;
    return { month: m.label, rev, salaries, opCosts, invest, taxes, costs, gross, ebitda, net, margin };
  }), [transactions, months, employees, salaryHistories]);

  const totPL = useMemo(() => plMonths.reduce((acc, m) => ({
    rev: acc.rev + m.rev, salaries: acc.salaries + m.salaries, opCosts: acc.opCosts + m.opCosts,
    invest: acc.invest + m.invest, taxes: acc.taxes + m.taxes, costs: acc.costs + m.costs,
    gross: acc.gross + m.gross, ebitda: acc.ebitda + m.ebitda, net: acc.net + m.net,
  }), { rev: 0, salaries: 0, opCosts: 0, invest: 0, taxes: 0, costs: 0, gross: 0, ebitda: 0, net: 0 }), [plMonths]);

  const grossMarginPct = totPL.rev > 0 ? (totPL.gross / totPL.rev) * 100 : 0;
  const netMarginPct   = totPL.rev > 0 ? (totPL.net  / totPL.rev) * 100 : 0;

  // ── Revenue by category ───────────────────────────────────────────────────
  const revByCat = useMemo(() => {
    const acc = {};
    transactions.filter(t => t.type === 'revenue' && months.some(m => t.date?.startsWith(m.key)))
      .forEach(t => { acc[t.category || 'other'] = (acc[t.category || 'other'] || 0) + (t.amount || 0); });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [transactions, months]);

  // ── Cost breakdown ────────────────────────────────────────────────────────
  const costByCat = useMemo(() => {
    const acc = {};
    transactions.filter(t => ['cost', 'investment', 'tax'].includes(t.type) && months.some(m => t.date?.startsWith(m.key)))
      .forEach(t => { acc[t.category || 'other'] = (acc[t.category || 'other'] || 0) + (t.amount || 0); });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [transactions, months]);

  // ── Cash flow ─────────────────────────────────────────────────────────────
  const cfData = useMemo(() => months.map(m => {
    const inflow  = transactions.filter(t => t.type === 'revenue' && t.date?.startsWith(m.key)).reduce((s, t) => s + (t.amount || 0), 0);
    const outflow = transactions.filter(t => ['cost', 'investment', 'tax'].includes(t.type) && t.date?.startsWith(m.key)).reduce((s, t) => s + (t.amount || 0), 0);
    return { month: m.label, inflow, outflow, net: inflow - outflow };
  }), [transactions, months]);

  // cumulative cash position
  const cfCumulative = useMemo(() => {
    let cum = 0;
    return cfData.map(m => { cum += m.net; return { month: m.month, saldo: cum }; });
  }, [cfData]);

  // top transactions
  const periodKeys = new Set(months.map(m => m.key));
  const inPeriod   = transactions.filter(t => t.date && [...periodKeys].some(k => t.date.startsWith(k)));
  const topRevs    = [...inPeriod].filter(t => t.type === 'revenue').sort((a, b) => b.amount - a.amount).slice(0, 5);
  const topCosts   = [...inPeriod].filter(t => t.type !== 'revenue').sort((a, b) => b.amount - a.amount).slice(0, 5);

  // ── Team metrics ──────────────────────────────────────────────────────────
  const activeEmps     = employees.filter(e => e.status === 'active');
  const avgSatisfaction = activeEmps.filter(e => e.satisfaction_score != null).reduce((s, e) => s + e.satisfaction_score, 0) / Math.max(1, activeEmps.filter(e => e.satisfaction_score != null).length);
  const totalSalary    = activeEmps.reduce((s, e) => s + (e.salary || 0), 0) * monthCount;

  const statusDist = useMemo(() => {
    const s = { active: 0, inactive: 0, leave: 0 };
    employees.forEach(e => { s[e.status] = (s[e.status] || 0) + 1; });
    return [
      { name: 'Ativos', value: s.active, fill: '#10b981' },
      { name: 'Inativos', value: s.inactive, fill: '#94a3b8' },
      { name: 'Licença', value: s.leave, fill: '#f59e0b' },
    ].filter(d => d.value > 0);
  }, [employees]);

  const deptData = useMemo(() => departments.map(d => {
    // Transaction costs tagged to this department (non-revenue)
    const txCosts = months.reduce((tot, m) =>
      tot + transactions.filter(t => t.department === d.name && t.date?.startsWith(m.key) && t.type !== 'revenue')
        .reduce((s, t) => s + (t.amount || 0), 0), 0);
    // Salary costs: sum per month, only employees hired by that month, using effective salary
    const empSalaries = months.reduce((tot, m) =>
      tot + employees
        .filter(e => e.department === d.name && e.status === 'active' && (!e.hire_date || e.hire_date.slice(0, 7) <= m.key))
        .reduce((s, e) => s + getSalaryAtMonth(e, m.key, salaryHistories), 0), 0);
    const spent    = txCosts + empSalaries;
    const budget   = (d.budget_monthly || 0) * monthCount;
    const empCount = employees.filter(e => e.department === d.name && e.status === 'active').length;
    return { name: d.name, budget, spent, txCosts, empSalaries, pct: budget > 0 ? Math.round((spent / budget) * 100) : 0, empCount };
  }), [departments, transactions, months, employees, monthCount, salaryHistories]);

  // ── Financial ratios ──────────────────────────────────────────────────────
  const ratios = useMemo(() => {
    const rev = totPL.rev, costs = totPL.costs;
    const empCount = activeEmps.length;
    return {
      grossMargin: grossMarginPct,
      netMargin:   netMarginPct,
      costToRev:   rev > 0 ? (costs / rev) * 100 : 0,
      revPerEmp:   empCount > 0 ? rev / empCount : 0,
      costPerEmp:  empCount > 0 ? costs / empCount : 0,
      salaryRatio: rev > 0 ? (totPL.salaries / rev) * 100 : 0,
      ebitdaMargin: rev > 0 ? (totPL.ebitda / rev) * 100 : 0,
      burnRate:    costs > rev ? (costs - rev) / monthCount : 0,
    };
  }, [totPL, activeEmps, grossMarginPct, netMarginPct, monthCount]);

  return (
    <div className="space-y-4">

      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-gradient-to-br from-amber-700 via-amber-800 to-orange-900 px-5 py-5 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-amber-200 text-[10px] font-semibold uppercase tracking-widest">Business</p>
                <h1 className="text-white text-lg sm:text-xl font-bold leading-tight">Análise Financeira</h1>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Receitas',      value: fmtMoney(totPL.rev),   color: 'text-emerald-300' },
                { label: 'Resultado Líq.', value: fmtMoney(totPL.net),  color: totPL.net >= 0 ? 'text-sky-200' : 'text-rose-300' },
                { label: 'Margem Bruta',  value: fmtPct(grossMarginPct), color: grossMarginPct >= 30 ? 'text-amber-200' : 'text-rose-300' },
                { label: 'Colaboradores', value: activeEmps.length,     color: 'text-white' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                  <p className="text-amber-200 text-[10px] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Period + Tab selectors ─────────────────────────────────────────── */}
      <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-1 p-1 bg-white rounded-xl border border-slate-100 shadow-sm shrink-0">
          {[{ v: '1m', l: '1M' }, { v: '3m', l: '3M' }, { v: '6m', l: '6M' }, { v: '12m', l: '12M' }, { v: 'global', l: 'Tudo' }].map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)}
              className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all ${period === p.v ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              {p.l}
            </button>
          ))}
        </div>
        <div className="flex-1 w-full sm:w-auto flex gap-1 bg-white rounded-xl border border-slate-100 shadow-sm p-1 overflow-x-auto no-scrollbar">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${tab === t.key ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          P&L Tab
      ──────────────────────────────────────────────────────────────────── */}
      {tab === 'pl' && (
        <div className="space-y-4">
          {/* Charts row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Revenue + Net evolution */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded-full bg-emerald-500" />
                <h3 className="font-semibold text-slate-700 text-sm">Evolução do Resultado</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={plMonths} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => fmtMoney(v)} width={52} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="rev" name="Receita" stroke="#10b981" strokeWidth={2} fill="url(#gRev)" />
                  <Area type="monotone" dataKey="net" name="Resultado" stroke="#3b82f6" strokeWidth={2} fill="url(#gNet)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue vs Costs bar */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded-full bg-amber-500" />
                <h3 className="font-semibold text-slate-700 text-sm">Receitas vs Custos</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={plMonths} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => fmtMoney(v)} width={52} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="rev"   name="Receita"  fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="costs" name="Custos"   fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue + Cost pies */}
          {(revByCat.length > 0 || costByCat.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {revByCat.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 rounded-full bg-emerald-500" />
                    <h3 className="font-semibold text-slate-700 text-sm">Receitas por Categoria</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-28 h-28 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={revByCat} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={2} dataKey="value">
                            {revByCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      {revByCat.slice(0, 5).map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-xs text-slate-600 truncate capitalize">{item.name}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-800 shrink-0">{fmtMoney(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {costByCat.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 rounded-full bg-red-500" />
                    <h3 className="font-semibold text-slate-700 text-sm">Custos por Categoria</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-28 h-28 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={costByCat} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={2} dataKey="value">
                            {costByCat.map((_, i) => <Cell key={i} fill={['#ef4444','#f97316','#f59e0b','#8b5cf6','#ec4899','#06b6d4'][i % 6]} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      {costByCat.slice(0, 5).map((item, i) => {
                        const colors = ['#ef4444','#f97316','#f59e0b','#8b5cf6','#ec4899','#06b6d4'];
                        return (
                          <div key={item.name} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                              <span className="text-xs text-slate-600 truncate capitalize">{item.name}</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-800 shrink-0">{fmtMoney(item.value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Margin + P&L Statement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Margin evolution */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded-full bg-violet-500" />
                <h3 className="font-semibold text-slate-700 text-sm">Evolução da Margem Bruta</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={plMonths} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={40} />
                  <Tooltip formatter={v => [`${v.toFixed(1)}%`, 'Margem Bruta']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Line type="monotone" dataKey="margin" name="Margem Bruta" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* P&L Statement */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50">
              <h3 className="font-semibold text-slate-700 text-sm">Demonstração de Resultados — {monthCount} meses</h3>
            </div>
            {[
              { label: 'Receitas totais',              value: totPL.rev,        sign: 1,  bold: true,  highlight: false, border: false },
              { label: 'Custo de pessoal (salários)',  value: totPL.salaries,   sign: -1, bold: false, highlight: false, border: false },
              { label: 'Custos operacionais',          value: totPL.opCosts,    sign: -1, bold: false, highlight: false, border: false },
              { label: 'Resultado bruto',              value: totPL.gross,      sign: 0,  bold: true,  highlight: false, border: true },
              { label: 'Investimentos / CAPEX',        value: totPL.invest,     sign: -1, bold: false, highlight: false, border: false },
              { label: 'EBITDA',                       value: totPL.ebitda,     sign: 0,  bold: true,  highlight: false, border: true },
              { label: 'Impostos',                     value: totPL.taxes,      sign: -1, bold: false, highlight: false, border: false },
              { label: 'Resultado líquido estimado',   value: totPL.net,        sign: 0,  bold: true,  highlight: true,  border: true },
            ].map(row => {
              const displayed = row.sign === -1 ? -row.value : row.value;
              const isPositive = row.sign === 1 || (row.sign === 0 && row.value >= 0);
              return (
                <div key={row.label} className={`flex justify-between items-center px-5 py-3 ${row.border ? 'border-t border-slate-100' : ''} ${row.highlight ? 'bg-amber-50' : ''}`}>
                  <span className={`text-sm ${row.bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{row.label}</span>
                  <span className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>{fmtMoney(displayed, 2)}</span>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────
          Cash Flow Tab
      ──────────────────────────────────────────────────────────────────── */}
      {tab === 'cashflow' && (
        <div className="space-y-4">
          {/* Cash flow charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cash flow bar chart */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded-full bg-blue-500" />
                <h3 className="font-semibold text-slate-700 text-sm">Entradas e Saídas de Caixa</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cfData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => fmtMoney(v)} width={52} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="inflow"  name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" name="Saídas"   fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Cumulative cash position */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded-full bg-emerald-500" />
                <h3 className="font-semibold text-slate-700 text-sm">Posição de Caixa Acumulada</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={cfCumulative} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => fmtMoney(v)} width={52} />
                  <Tooltip formatter={v => [fmtMoney(v, 2), 'Saldo acumulado']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="saldo" stroke="#10b981" strokeWidth={2.5} fill="url(#gCash)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: 'Total Entradas', v: cfData.reduce((s, m) => s + m.inflow, 0),  color: 'text-emerald-600' },
              { l: 'Total Saídas',   v: cfData.reduce((s, m) => s + m.outflow, 0), color: 'text-red-600' },
              { l: 'Saldo Período',  v: cfData.reduce((s, m) => s + m.net, 0),     color: cfData.reduce((s, m) => s + m.net, 0) >= 0 ? 'text-blue-600' : 'text-rose-600' },
            ].map(c => (
              <div key={c.l} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
                <p className="text-xs text-slate-500 mb-1">{c.l}</p>
                <p className={`text-lg font-bold ${c.color}`}>{fmtMoney(c.v)}</p>
              </div>
            ))}
          </div>

          {/* Top revenues + top costs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded-full bg-emerald-500" />
                <h3 className="font-semibold text-slate-700 text-sm">Maiores Receitas</h3>
              </div>
              {topRevs.length > 0 ? (
                <div className="space-y-3">
                  {topRevs.map((t, i) => (
                    <div key={t.id || i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{t.description || t.category || '—'}</p>
                        <p className="text-xs text-slate-400">{t.date}</p>
                      </div>
                      <p className="text-sm font-bold text-emerald-600 shrink-0">{fmtMoney(t.amount)}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-400 text-sm text-center py-6">Sem receitas</p>}
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded-full bg-red-500" />
                <h3 className="font-semibold text-slate-700 text-sm">Maiores Custos</h3>
              </div>
              {topCosts.length > 0 ? (
                <div className="space-y-3">
                  {topCosts.map((t, i) => (
                    <div key={t.id || i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold shrink-0">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{t.description || t.category || '—'}</p>
                        <p className="text-xs text-slate-400">{t.date}</p>
                      </div>
                      <p className="text-sm font-bold text-red-600 shrink-0">{fmtMoney(t.amount)}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-400 text-sm text-center py-6">Sem custos</p>}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────
          Team Tab
      ──────────────────────────────────────────────────────────────────── */}
      {tab === 'team' && (
        <div className="space-y-4">
          {/* Team summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Ativos',        value: activeEmps.length,                                icon: '👥', color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Satisfação',    value: `${avgSatisfaction.toFixed(1)}/5`,                icon: '⭐', color: 'bg-amber-50 text-amber-700' },
              { label: 'Custo Salarial',value: fmtMoney(totalSalary),                           icon: '💼', color: 'bg-blue-50 text-blue-700' },
              { label: 'Departamentos', value: departments.length,                               icon: '🏢', color: 'bg-violet-50 text-violet-700' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl p-4 ${s.color.split(' ')[0]} border border-slate-100 shadow-sm text-center`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <p className={`text-xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Employee status pie + department breakdown side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status distribution */}
            {statusDist.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-emerald-500" />
                  <h3 className="font-semibold text-slate-700 text-sm">Estado dos Colaboradores</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusDist} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                          {statusDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1">
                    {statusDist.map(d => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }} />
                          <span className="text-sm text-slate-600">{d.name}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Satisfaction per department */}
            {deptData.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-amber-500" />
                  <h3 className="font-semibold text-slate-700 text-sm">Colaboradores por Departamento</h3>
                </div>
                <div className="space-y-3">
                  {deptData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700 truncate">{d.name}</span>
                          <span className="text-slate-500 shrink-0 ml-1">{d.empCount} pessoas</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (d.empCount / Math.max(1, activeEmps.length)) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Department budget vs actual chart */}
          {deptData.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-blue-500" />
                  <h3 className="font-semibold text-slate-700 text-sm">Orçamento vs Real por Departamento</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deptData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => fmtMoney(v)} width={52} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="budget" name="Orçamento" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent"  name="Gasto"     radius={[4, 4, 0, 0]}>
                      {deptData.map((d, i) => <Cell key={i} fill={d.pct > 100 ? '#ef4444' : d.pct > 80 ? '#f59e0b' : '#10b981'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Department detail table */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                  <h3 className="font-semibold text-slate-700 text-sm">Detalhe por Departamento — {monthCount} meses</h3>
                </div>
                {deptData.map(d => (
                  <div key={d.name} className="px-5 py-3 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800">{d.name}</p>
                          <span className={`text-xs font-bold ${d.pct > 100 ? 'text-red-600' : d.pct > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>{d.pct}% do orçamento</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${d.pct > 100 ? 'bg-red-500' : d.pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(d.pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 shrink-0">{fmtMoney(d.spent)} / {fmtMoney(d.budget)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Breakdown: salaries vs transaction costs */}
                    <div className="ml-11 flex gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                        <span className="text-[10px] text-slate-500">Salários: <span className="font-semibold text-slate-700">{fmtMoney(d.empSalaries)}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                        <span className="text-[10px] text-slate-500">Transações: <span className="font-semibold text-slate-700">{fmtMoney(d.txCosts)}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[10px] text-slate-400">{d.empCount} colaboradores</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────
          Ratios Tab
      ──────────────────────────────────────────────────────────────────── */}
      {tab === 'ratios' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Margem Bruta',         value: fmtPct(ratios.grossMargin),  sub: 'Receitas − custos op.',        good: ratios.grossMargin >= 40, icon: '📊' },
              { label: 'Margem Líquida',        value: fmtPct(ratios.netMargin),    sub: 'Resultado após impostos',      good: ratios.netMargin >= 10,   icon: '💰' },
              { label: 'Margem EBITDA',         value: fmtPct(ratios.ebitdaMargin), sub: 'EBITDA / Receitas',            good: ratios.ebitdaMargin >= 20, icon: '📈' },
              { label: 'Rácio Custos/Receita',  value: fmtPct(ratios.costToRev),    sub: 'Custos vs receitas',           good: ratios.costToRev <= 60,   icon: '⚖️' },
              { label: 'Receita por Colaborador', value: fmtMoney(ratios.revPerEmp), sub: `${activeEmps.length} ativos`, good: ratios.revPerEmp > 0,     icon: '👤' },
              { label: 'Custo por Colaborador', value: fmtMoney(ratios.costPerEmp), sub: 'Custo médio por pessoa',       good: true,                     icon: '💼' },
              { label: 'Rácio Pessoal/Receita', value: fmtPct(ratios.salaryRatio),  sub: 'Salários como % das receitas', good: ratios.salaryRatio <= 40, icon: '👥' },
              { label: 'Burn Rate Mensal',      value: ratios.burnRate > 0 ? fmtMoney(ratios.burnRate) : '—', sub: ratios.burnRate > 0 ? 'Défice médio mensal' : 'Positivo', good: ratios.burnRate === 0, icon: '🔥' },
            ].map((r, i) => (
              <motion.div key={r.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{r.icon}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.good ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {r.good ? '✓ Bom' : '↑ Atenção'}
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mb-1">{r.value}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{r.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{r.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Revenue evolution in ratios context */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full bg-amber-500" />
              <h3 className="font-semibold text-slate-700 text-sm">Margens ao Longo do Tempo</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={plMonths} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={40} />
                <Tooltip formatter={v => [`${Number(v).toFixed(1)}%`, '']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="margin" name="Margem Bruta" stroke="#d97706" strokeWidth={2.5} dot={{ fill: '#d97706', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
