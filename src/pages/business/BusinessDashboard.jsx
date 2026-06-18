import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Target, AlertTriangle, ArrowRight,
  Plus, Wallet, Building2, CheckCircle, Pencil, Upload, X,
  Flame, Activity, Zap, ArrowUp, ArrowDown, Minus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import AddBusinessTransactionSheet from '@/components/business/AddBusinessTransactionSheet';
import ImportTransactionsModal from '@/components/business/ImportTransactionsModal';

// ─── helpers ────────────────────────────────────────────────────────────────
function getSalaryAtMonth(emp, monthKey, histories) {
  const relevant = histories
    .filter(h => h.employee_id === emp.id && h.effective_date?.slice(0, 7) <= monthKey)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  return relevant.length > 0 ? (relevant[0].salary || 0) : (emp.salary || 0);
}

function toM(v) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `€${(v / 1_000).toFixed(1)}k`;
  return `€${Number(v).toFixed(0)}`;
}
function pct(a, b) { return b > 0 ? ((a - b) / b * 100).toFixed(1) : null; }

function calcKPICurrentValue(kpi, transactions, employees, monthStr) {
  switch (kpi.data_source) {
    case 'transactions_revenue':
      return transactions.filter(t => t.type === 'revenue' && t.date?.startsWith(monthStr)).reduce((s, t) => s + (t.amount || 0), 0);
    case 'transactions_cost':
      return transactions.filter(t => ['cost','investment','tax'].includes(t.type) && t.date?.startsWith(monthStr)).reduce((s, t) => s + (t.amount || 0), 0);
    case 'gross_margin_pct': {
      const rev  = transactions.filter(t => t.type === 'revenue' && t.date?.startsWith(monthStr)).reduce((s, t) => s + (t.amount || 0), 0);
      const cost = transactions.filter(t => t.type === 'cost' && t.date?.startsWith(monthStr)).reduce((s, t) => s + (t.amount || 0), 0);
      return rev > 0 ? Math.round(((rev - cost) / rev) * 1000) / 10 : 0;
    }
    case 'satisfaction_avg': {
      const a = employees.filter(e => e.status === 'active' && e.satisfaction_score != null);
      return a.length > 0 ? Math.round(a.reduce((s, e) => s + e.satisfaction_score, 0) / a.length * 10) / 10 : 0;
    }
    case 'employee_count': return employees.filter(e => e.status === 'active').length;
    default: return kpi.current_value ?? 0;
  }
}
function isNearPeriodEnd(period) {
  const today = new Date();
  let periodEnd, threshold;
  if (period === 'quarterly') {
    const q = Math.floor(today.getMonth() / 3);
    periodEnd = new Date(today.getFullYear(), (q + 1) * 3, 0);
    threshold = 15;
  } else if (period === 'annual') {
    periodEnd = new Date(today.getFullYear(), 12, 0);
    threshold = 25;
  } else {
    periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    threshold = 7;
  }
  const daysLeft = Math.ceil((periodEnd.getTime() - today.getTime()) / 86400000);
  return daysLeft <= threshold;
}
function kpiStatus(kpi, cur) {
  const ratio = kpi.direction === 'down' ? kpi.target_value / (cur || 1) : (cur || 0) / (kpi.target_value || 1);
  if (kpi.direction === 'down' ? cur <= kpi.target_value : cur >= kpi.target_value) return 'achieved';
  if (ratio >= 0.8) return 'on_track';
  const status = ratio >= 0.5 ? 'at_risk' : 'failed';
  if (!isNearPeriodEnd(kpi.period)) return 'on_track';
  return status;
}
const STATUS_COLORS = { achieved: 'text-emerald-600 bg-emerald-50', on_track: 'text-blue-600 bg-blue-50', at_risk: 'text-amber-600 bg-amber-50', failed: 'text-red-600 bg-red-50' };
const STATUS_LABELS  = { achieved: 'Atingido', on_track: 'No prazo', at_risk: 'Em risco', failed: 'Falhou' };

const TX_EMOJI = { revenue: '💰', investment: '📊', tax: '🧾', cost: '💸', transfer: '↔️' };

// ─── Transaction Picker ──────────────────────────────────────────────────────
function TransactionPicker({ isOpen, onClose, onManual, onImport }) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
          className="relative bg-white rounded-2xl p-5 w-full max-w-sm z-10 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-slate-800">Nova Transação</p>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <button onClick={() => { onClose(); onManual(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-colors text-left">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Pencil className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Entrada Manual</p>
              <p className="text-xs text-slate-400">Preenche o formulário da transação</p>
            </div>
          </button>
          <button onClick={() => { onClose(); onImport(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-left">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Importar Ficheiro</p>
              <p className="text-xs text-slate-400">CSV, Excel ou PDF — a IA trata do resto</p>
            </div>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Trend indicator ─────────────────────────────────────────────────────────
function Trend({ val, invert = false }) {
  if (val === null) return null;
  const n = parseFloat(val);
  const positive = invert ? n < 0 : n > 0;
  const Icon = n === 0 ? Minus : positive ? ArrowUp : ArrowDown;
  const cls = n === 0 ? 'text-slate-400' : positive ? 'text-emerald-500' : 'text-red-500';
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-medium leading-none ${cls}`}>
      <Icon className="w-2.5 h-2.5" />{Math.abs(n)}%
    </span>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function BusinessDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const now = new Date();
  const currentMonth = format(now, 'yyyy-MM');
  const prevMonth    = format(subMonths(now, 1), 'yyyy-MM');

  const [picker, setPicker]       = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data: transactions = [] } = useQuery({ queryKey: ['business_transactions'], queryFn: () => base44.entities.BusinessTransaction.filter({}, '-created_date', 500) });
  const { data: kpis = [] }         = useQuery({ queryKey: ['business_kpis'],         queryFn: () => base44.entities.BusinessKPI.filter({ is_active: true }) });
  const { data: employees = [] }    = useQuery({ queryKey: ['employees'],              queryFn: () => base44.entities.Employee.filter({ status: 'active' }) });
  const { data: departments = [] }  = useQuery({ queryKey: ['departments'],            queryFn: () => base44.entities.Department.filter() });
  const { data: salaryHistories = [] } = useQuery({ queryKey: ['salary_history'],      queryFn: () => base44.entities.SalaryHistory.filter({}, '-effective_date') });

  // ── Aggregates ─────────────────────────────────────────────────────────────
  const monthRev  = useMemo(() => transactions.filter(t => t.type === 'revenue' && t.date?.startsWith(currentMonth)).reduce((s, t) => s + (t.amount || 0), 0), [transactions, currentMonth]);
  const monthCost = useMemo(() => transactions.filter(t => ['cost','investment','tax'].includes(t.type) && t.date?.startsWith(currentMonth)).reduce((s, t) => s + (t.amount || 0), 0), [transactions, currentMonth]);
  const prevRev   = useMemo(() => transactions.filter(t => t.type === 'revenue' && t.date?.startsWith(prevMonth)).reduce((s, t) => s + (t.amount || 0), 0), [transactions, prevMonth]);
  const prevCost  = useMemo(() => transactions.filter(t => ['cost','investment','tax'].includes(t.type) && t.date?.startsWith(prevMonth)).reduce((s, t) => s + (t.amount || 0), 0), [transactions, prevMonth]);

  const grossMargin   = monthRev > 0 ? ((monthRev - monthCost) / monthRev * 100) : 0;
  const revenueGrowth = pct(monthRev, prevRev);
  const costGrowth    = pct(monthCost, prevCost);
  const netGrowth     = pct(monthRev - monthCost, prevRev - prevCost);

  const avgSat = useMemo(() => {
    const a = employees.filter(e => e.satisfaction_score != null);
    return a.length > 0 ? (a.reduce((s, e) => s + e.satisfaction_score, 0) / a.length).toFixed(1) : '—';
  }, [employees]);

  const revPerEmp = employees.length > 0 ? monthRev / employees.length : 0;
  const burnRate  = monthCost > 0 && monthRev > 0 ? monthCost / monthRev * 100 : 0;

  const kpiCount = useMemo(() => {
    const c = { achieved: 0, on_track: 0, at_risk: 0, failed: 0 };
    kpis.forEach(k => c[kpiStatus(k, calcKPICurrentValue(k, transactions, employees, currentMonth))]++);
    return c;
  }, [kpis, transactions, employees, currentMonth]);

  const kpisAtRisk = useMemo(() =>
    kpis.filter(k =>
      ['at_risk','failed'].includes(kpiStatus(k, calcKPICurrentValue(k, transactions, employees, currentMonth)))
    ).slice(0, 4),
    [kpis, transactions, employees, currentMonth]);

  // ── 6-month chart ──────────────────────────────────────────────────────────
  const chartData = useMemo(() => Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, 5 - i);
    const m = format(d, 'yyyy-MM');
    const rev  = transactions.filter(t => t.type === 'revenue' && t.date?.startsWith(m)).reduce((s, t) => s + (t.amount || 0), 0);
    const cost = transactions.filter(t => ['cost','investment','tax'].includes(t.type) && t.date?.startsWith(m)).reduce((s, t) => s + (t.amount || 0), 0);
    return { month: format(d, 'MMM', { locale: pt }), revenue: rev, costs: cost, net: rev - cost };
  }), [transactions]);

  // ── Expense categories ─────────────────────────────────────────────────────
  const catData = useMemo(() => {
    const cats = {};
    transactions.filter(t => t.date?.startsWith(currentMonth) && t.type !== 'revenue')
      .forEach(t => { const c = t.category || 'outro'; cats[c] = (cats[c] || 0) + (t.amount || 0); });
    return Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [transactions, currentMonth]);

  // ── KPI progress data ──────────────────────────────────────────────────────
  const kpiChartData = useMemo(() =>
    kpis.slice(0, 8).map(k => {
      const cur = calcKPICurrentValue(k, transactions, employees, currentMonth);
      const progPct = k.target_value > 0 ? Math.min(Math.round((cur / k.target_value) * 100), 150) : 0;
      return { name: k.name.slice(0, 12), pct: progPct, status: kpiStatus(k, cur) };
    }),
    [kpis, transactions, employees, currentMonth]);

  // ── Dept budget ────────────────────────────────────────────────────────────
  const deptData = useMemo(() =>
    departments.map(dept => {
      // Transaction costs this month tagged to this department (non-revenue)
      const txCosts     = transactions.filter(t => t.department === dept.name && t.date?.startsWith(currentMonth) && t.type !== 'revenue').reduce((s, t) => s + (t.amount || 0), 0);
      // Monthly salary of active employees in this department using effective salary for current month
      const empSalaries = employees.filter(e => e.department === dept.name && e.status === 'active').reduce((s, e) => s + getSalaryAtMonth(e, currentMonth, salaryHistories), 0);
      const spent  = txCosts + empSalaries;
      const budget = dept.monthly_budget || dept.budget_monthly || 0;
      return { name: dept.name, budget, spent, txCosts, empSalaries, pct: budget > 0 ? Math.round((spent / budget) * 100) : 0 };
    }).filter(d => d.budget > 0).slice(0, 6),
    [departments, transactions, employees, currentMonth, salaryHistories]);

  const recentTx = useMemo(() => transactions.slice(0, 10), [transactions]);

  const handleSaveTx = async (data) => {
    const me = await base44.auth.me();
    await base44.entities.BusinessTransaction.create({ ...data, created_by: me.email });
    qc.invalidateQueries({ queryKey: ['business_transactions'] });
  };

  const ttStyle = { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 };
  const ttFmt   = v => `€${v.toLocaleString('pt-PT')}`;
  const ALERT   = kpisAtRisk.length > 0 || deptData.some(d => d.pct > 100);

  const cm = {
    emerald: 'bg-emerald-50 text-emerald-700',
    red:     'bg-red-50 text-red-700',
    blue:    'bg-blue-50 text-blue-700',
    rose:    'bg-rose-50 text-rose-700',
    amber:   'bg-amber-50 text-amber-700',
    violet:  'bg-violet-50 text-violet-700',
  };

  const kpiCards = [
    { label: 'Receita',   value: toM(monthRev),             trend: revenueGrowth, icon: TrendingUp,   color: 'emerald', sub: 'este mês' },
    { label: 'Custos',    value: toM(monthCost),            trend: costGrowth,    icon: TrendingDown,  color: 'red',     sub: 'este mês', inv: true },
    { label: 'Resultado', value: toM(monthRev - monthCost), trend: netGrowth,     icon: Wallet,        color: monthRev >= monthCost ? 'blue' : 'rose', sub: 'líquido' },
    { label: 'Margem',    value: `${grossMargin.toFixed(1)}%`,                    icon: Target,        color: grossMargin >= 40 ? 'emerald' : 'amber', sub: 'bruta' },
    { label: 'Satisfação',value: `${avgSat}/5`,                                   icon: Users,         color: 'violet',  sub: `${employees.length} col.` },
    { label: 'KPIs OK',   value: `${kpiCount.achieved + kpiCount.on_track}/${kpis.length}`,            icon: CheckCircle, color: kpisAtRisk.length === 0 ? 'emerald' : 'amber', sub: `${kpisAtRisk.length} risco` },
  ];

  return (
    <div className="space-y-4 min-w-0">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">Dashboard</h1>
        <p className="text-slate-400 text-xs sm:text-sm">{format(now, "MMMM 'de' yyyy", { locale: pt })}</p>
      </div>

      {/* Alert bar */}
      {ALERT && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span className="truncate">
            {kpisAtRisk.length > 0 && `${kpisAtRisk.length} KPI${kpisAtRisk.length > 1 ? 's' : ''} em risco`}
            {kpisAtRisk.length > 0 && deptData.some(d => d.pct > 100) && ' · '}
            {deptData.some(d => d.pct > 100) && 'orçamento excedido'}
          </span>
          <button onClick={() => navigate('/BusinessKPIs')} className="ml-auto text-amber-700 font-medium text-xs whitespace-nowrap">Ver KPIs →</button>
        </div>
      )}

      {/* KPI Banner — 3 em cima + 3 em baixo */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-amber-700 via-amber-800 to-orange-900 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-x-3 gap-y-0">
          {kpiCards.slice(0, 3).map((card, i) => {
            const Icon = card.icon;
            const t = card.trend !== undefined ? parseFloat(card.trend) : null;
            const tUp = t !== null && (card.inv ? t < 0 : t > 0);
            const tDown = t !== null && (card.inv ? t > 0 : t < 0);
            return (
              <div key={card.label} className="min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <Icon className="w-3 h-3 text-amber-300 shrink-0" />
                  {t !== null && t !== 0 && (
                    <span className={`text-[9px] font-medium ${tUp ? 'text-emerald-300' : 'text-red-300'}`}>
                      {tUp ? '↑' : '↓'}{Math.abs(t)}%
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-white leading-tight truncate">{card.value}</p>
                <p className="text-[10px] text-amber-200 truncate">{card.label}</p>
              </div>
            );
          })}
        </div>
        <div className="h-px bg-white/10 my-3" />
        <div className="grid grid-cols-3 gap-x-3 gap-y-0">
          {kpiCards.slice(3, 6).map((card, i) => {
            const Icon = card.icon;
            const t = card.trend !== undefined ? parseFloat(card.trend) : null;
            const tUp = t !== null && (card.inv ? t < 0 : t > 0);
            return (
              <div key={card.label} className="min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <Icon className="w-3 h-3 text-amber-300 shrink-0" />
                  {t !== null && t !== 0 && (
                    <span className={`text-[9px] font-medium ${tUp ? 'text-emerald-300' : 'text-red-300'}`}>
                      {tUp ? '↑' : '↓'}{Math.abs(t)}%
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-white leading-tight truncate">{card.value}</p>
                <p className="text-[10px] text-amber-200 truncate">{card.label}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Charts row 1 — side by side from sm (640px) */}
      <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-3 gap-3">
        {/* Revenue vs Costs — takes 2 cols on xl */}
        <div className="min-[520px]:col-span-1 xl:col-span-2 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm min-w-0">
          <h3 className="font-semibold text-slate-700 mb-3 text-xs sm:text-sm">Receitas vs Custos — 6 meses</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                <linearGradient id="cstG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={32} />
              <Tooltip formatter={(v, n) => [ttFmt(v), n === 'revenue' ? 'Receita' : 'Custos']} contentStyle={ttStyle} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revG)" />
              <Area type="monotone" dataKey="costs"   stroke="#ef4444" strokeWidth={2} fill="url(#cstG)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Net Profit */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm min-w-0">
          <h3 className="font-semibold text-slate-700 mb-3 text-xs sm:text-sm">Resultado Líquido — 6 meses</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={32} />
              <Tooltip formatter={(v) => [ttFmt(v), 'Resultado']} contentStyle={ttStyle} />
              <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.net >= 0 ? '#3b82f6' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 — side by side from sm */}
      <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-3 gap-3">
        {/* Expense categories */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 text-xs sm:text-sm">Gastos por Categoria</h3>
            <span className="text-[10px] text-slate-400">este mês</span>
          </div>
          {catData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 text-slate-400">
              <Activity className="w-7 h-7 mb-2 opacity-30" />
              <p className="text-xs">Sem dados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {catData.map((c, i) => {
                const max = catData[0].value;
                const w = Math.round((c.value / max) * 100);
                const colors = ['#f59e0b','#3b82f6','#8b5cf6','#ef4444','#10b981','#64748b'];
                return (
                  <div key={c.name}>
                    <div className="flex justify-between text-[10px] sm:text-xs mb-1">
                      <span className="font-medium text-slate-700 capitalize truncate max-w-[60%]">{c.name}</span>
                      <span className="text-slate-500 shrink-0">€{c.value.toLocaleString('pt-PT')}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, backgroundColor: colors[i % colors.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* KPI progress */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 text-xs sm:text-sm">Progresso dos KPIs</h3>
            <button onClick={() => navigate('/BusinessKPIs')} className="text-[10px] sm:text-xs text-amber-600 flex items-center gap-1">Ver todos <ArrowRight className="w-3 h-3" /></button>
          </div>
          {kpiChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 text-slate-400">
              <Target className="w-7 h-7 mb-2 opacity-30" />
              <p className="text-xs">Sem KPIs</p>
              <button onClick={() => navigate('/BusinessKPIs')} className="mt-1 text-xs text-amber-600">Adicionar →</button>
            </div>
          ) : (
            <div className="space-y-2">
              {kpiChartData.map(k => {
                const colors = { achieved: 'bg-emerald-500', on_track: 'bg-blue-500', at_risk: 'bg-amber-500', failed: 'bg-red-500' };
                return (
                  <div key={k.name}>
                    <div className="flex justify-between text-[10px] sm:text-xs mb-1">
                      <span className="font-medium text-slate-700 truncate max-w-[70%]">{k.name}</span>
                      <span className={`font-bold shrink-0 ${k.pct >= 100 ? 'text-emerald-600' : k.pct >= 80 ? 'text-blue-600' : k.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{k.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${colors[k.status]}`} style={{ width: `${Math.min(k.pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dept budget */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 text-xs sm:text-sm">Orçamento por Depto</h3>
            <button onClick={() => navigate('/BusinessEmployees')} className="text-[10px] sm:text-xs text-amber-600 flex items-center gap-1">Equipa <ArrowRight className="w-3 h-3" /></button>
          </div>
          {deptData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 text-slate-400">
              <Building2 className="w-7 h-7 mb-2 opacity-30" />
              <p className="text-xs">Sem departamentos</p>
              <button onClick={() => navigate('/BusinessEmployees')} className="mt-1 text-xs text-amber-600">Adicionar →</button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {deptData.map(d => (
                <div key={d.name}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] sm:text-xs font-medium text-slate-700 truncate max-w-[65%]">{d.name}</span>
                    <span className={`text-[10px] sm:text-xs font-bold shrink-0 ${d.pct > 100 ? 'text-red-600' : d.pct > 80 ? 'text-amber-600' : 'text-slate-500'}`}>{d.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${d.pct > 100 ? 'bg-red-500' : d.pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(d.pct, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transações Recentes — horizontal scroll like Dashboard */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Transações Recentes</p>
          <button onClick={() => navigate('/BusinessTransactions')} className="flex items-center gap-1 text-xs text-amber-600 font-medium hover:text-amber-700 transition-colors">
            Ver todas <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentTx.length === 0 ? (
          <div className="py-6 text-center px-4">
            <p className="text-slate-400 text-sm">Sem transações registadas.</p>
            <button onClick={() => setPicker(true)} className="text-xs font-medium text-amber-600 mt-1">Adicionar →</button>
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-4">
            {recentTx.map(tx => {
              const isRev = tx.type === 'revenue';
              return (
                <div key={tx.id} className="flex-shrink-0 w-28 sm:w-32 bg-slate-50 rounded-xl p-2.5 sm:p-3 border border-slate-100 hover:border-amber-100 transition-colors">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 text-sm ${isRev ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {TX_EMOJI[tx.type] || '💸'}
                  </div>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-800 truncate mb-1">{tx.title}</p>
                  <p className={`text-xs sm:text-sm font-bold ${isRev ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isRev ? '+' : '-'}€{Number(tx.amount).toLocaleString('pt-PT')}
                  </p>
                  {tx.date && <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{tx.date}</p>}
                </div>
              );
            })}
            <button onClick={() => navigate('/BusinessTransactions')}
              className="flex-shrink-0 w-24 sm:w-28 bg-amber-50 border border-amber-100 rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center gap-1.5 sm:gap-2 hover:bg-amber-100 transition-colors">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-600 flex items-center justify-center shadow-sm">
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-amber-700 text-center">Ver todas</p>
            </button>
          </div>
        )}
      </div>

      {/* Bottom row — KPIs at risk + Business insights */}
      <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-3">
        {/* KPIs at risk */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 text-xs sm:text-sm">KPIs em Risco</h3>
            <button onClick={() => navigate('/BusinessKPIs')} className="text-[10px] sm:text-xs text-amber-600 flex items-center gap-1">Ver todos <ArrowRight className="w-3 h-3" /></button>
          </div>
          {kpisAtRisk.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 text-slate-400">
              <CheckCircle className="w-7 h-7 mb-2 text-emerald-400" />
              <p className="text-xs text-emerald-600 font-medium">Todos os KPIs no prazo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {kpisAtRisk.map(k => {
                const cv = calcKPICurrentValue(k, transactions, employees, currentMonth);
                const st = kpiStatus(k, cv);
                return (
                  <div key={k.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50">
                    <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${st === 'failed' ? 'text-red-500' : 'text-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{k.name}</p>
                      <p className="text-[10px] text-slate-400">{cv}{k.unit} / {k.target_value}{k.unit}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[st]}`}>{STATUS_LABELS[st]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Business Insights */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm min-w-0">
          <h3 className="font-semibold text-slate-700 text-xs sm:text-sm mb-3">Métricas de Negócio</h3>
          <div className="space-y-2.5">
            {[
              { icon: Flame, label: 'Taxa de Queima', value: `${burnRate.toFixed(1)}%`, sub: 'custos vs receita', color: burnRate > 100 ? 'text-red-600 bg-red-50' : burnRate > 80 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50' },
              { icon: Zap, label: 'Receita / Colaborador', value: toM(revPerEmp), sub: 'este mês', color: 'text-blue-600 bg-blue-50' },
              { icon: TrendingUp, label: 'Crescimento', value: revenueGrowth !== null ? `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}%` : '—', sub: 'vs mês anterior', color: revenueGrowth !== null && parseFloat(revenueGrowth) >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50' },
              { icon: Activity, label: 'KPIs Atingidos', value: `${kpiCount.achieved}/${kpis.length}`, sub: `${kpiCount.on_track} no prazo`, color: 'text-violet-600 bg-violet-50' },
            ].map(m => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${m.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-500">{m.label}</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{m.value} <span className="font-normal text-[10px] text-slate-400">{m.sub}</span></p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      <TransactionPicker isOpen={picker} onClose={() => setPicker(false)} onManual={() => setSheetOpen(true)} onImport={() => setImportOpen(true)} />
      <AddBusinessTransactionSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} onSave={handleSaveTx} departments={departments} />
      <ImportTransactionsModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
