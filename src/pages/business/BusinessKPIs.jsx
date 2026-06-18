import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Target, CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw } from 'lucide-react';
import AddEditKPIModal from '@/components/business/AddEditKPIModal';
import { toast } from 'sonner';
import { format } from 'date-fns';

const currentMonth = format(new Date(), 'yyyy-MM');

function calcCurrentValue(kpi, transactions, employees) {
  switch (kpi.data_source) {
    case 'transactions_revenue':
      return transactions.filter(t => t.type === 'revenue' && t.date?.startsWith(currentMonth)).reduce((s, t) => s + (t.amount || 0), 0);
    case 'transactions_cost':
      return transactions.filter(t => ['cost', 'investment', 'tax'].includes(t.type) && t.date?.startsWith(currentMonth)).reduce((s, t) => s + (t.amount || 0), 0);
    case 'gross_margin_pct': {
      const rev = transactions.filter(t => t.type === 'revenue' && t.date?.startsWith(currentMonth)).reduce((s, t) => s + (t.amount || 0), 0);
      const cost = transactions.filter(t => t.type === 'cost' && t.date?.startsWith(currentMonth)).reduce((s, t) => s + (t.amount || 0), 0);
      return rev > 0 ? Math.round(((rev - cost) / rev) * 1000) / 10 : 0;
    }
    case 'satisfaction_avg': {
      const active = employees.filter(e => e.status === 'active' && e.satisfaction_score != null);
      return active.length > 0 ? Math.round(active.reduce((s, e) => s + e.satisfaction_score, 0) / active.length * 10) / 10 : 0;
    }
    case 'employee_count':
      return employees.filter(e => e.status === 'active').length;
    default:
      return kpi.current_value ?? 0;
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

function getStatus(kpi, current) {
  const t = kpi.target_value || 1;
  let status;
  if (kpi.direction === 'down') {
    if (current <= t) status = 'achieved';
    else if (current <= t * 1.2) status = 'on_track';
    else if (current <= t * 1.5) status = 'at_risk';
    else status = 'failed';
  } else {
    if (current >= t) status = 'achieved';
    else if (current >= t * 0.8) status = 'on_track';
    else if (current >= t * 0.5) status = 'at_risk';
    else status = 'failed';
  }
  if (['at_risk', 'failed'].includes(status) && !isNearPeriodEnd(kpi.period)) {
    return 'on_track';
  }
  return status;
}

const STATUS_CONFIG = {
  achieved: { label: 'Atingido', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  on_track: { label: 'No prazo', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  at_risk:  { label: 'Em risco', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  failed:   { label: 'Falhou', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

const CAT_LABELS = { financial: '💰 Financeiro', hr: '👥 RH', operational: '⚙️ Operacional', growth: '📈 Crescimento', customer: '🤝 Clientes', sustainability: '🌱 Sustentabilidade' };
const PERIOD_LABELS = { monthly: 'Mensal', quarterly: 'Trimestral', annual: 'Anual' };

function fmtValue(v, unit) {
  if (unit === '€') return `€${Number(v).toLocaleString('pt-PT', { maximumFractionDigits: 0 })}`;
  if (unit === '%') return `${Number(v).toFixed(1)}%`;
  if (unit === 'pts') return `${Number(v).toFixed(1)}/5`;
  return `${Number(v).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}${unit !== '#' ? ' ' + unit : ''}`;
}

function ProgressBar({ current, target, direction, status }) {
  const pct = direction === 'down'
    ? target > 0 ? Math.min(100, (target / Math.max(current, 0.01)) * 100) : 0
    : target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const barColor = { achieved: 'bg-emerald-500', on_track: 'bg-blue-500', at_risk: 'bg-amber-500', failed: 'bg-red-500' }[status];
  return (
    <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function BusinessKPIs() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editKPI, setEditKPI] = useState(null);
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ['business_kpis'],
    queryFn: () => base44.entities.BusinessKPI.filter({ is_active: true }),
  });
  const { data: transactions = [] } = useQuery({
    queryKey: ['business_transactions'],
    queryFn: () => base44.entities.BusinessTransaction.filter({}, '-created_date', 500),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.filter({ status: 'active' }),
  });

  const enrichedKPIs = useMemo(() =>
    kpis.map(k => {
      const current = calcCurrentValue(k, transactions, employees);
      const status = getStatus(k, current);
      return { ...k, _current: current, _status: status };
    }),
    [kpis, transactions, employees]);

  const filtered = useMemo(() =>
    enrichedKPIs.filter(k => {
      if (filterCat !== 'all' && k.category !== filterCat) return false;
      if (filterStatus !== 'all' && k._status !== filterStatus) return false;
      return true;
    }),
    [enrichedKPIs, filterCat, filterStatus]);

  // Summary counts
  const counts = useMemo(() => {
    const c = { achieved: 0, on_track: 0, at_risk: 0, failed: 0 };
    enrichedKPIs.forEach(k => c[k._status]++);
    return c;
  }, [enrichedKPIs]);

  const handleSave = async (data, id) => {
    const me = await base44.auth.me();
    if (id) {
      await base44.entities.BusinessKPI.update(id, data);
      toast.success('KPI atualizado');
    } else {
      await base44.entities.BusinessKPI.create({ ...data, created_by: me.email, is_active: true });
      toast.success('KPI criado');
    }
    qc.invalidateQueries({ queryKey: ['business_kpis'] });
    setEditKPI(null);
    setModalOpen(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.BusinessKPI.delete(id);
    qc.invalidateQueries({ queryKey: ['business_kpis'] });
    toast.success('KPI eliminado');
  };

  const handleUpdateCurrentValue = async (kpi) => {
    const val = prompt(`Atualizar valor atual de "${kpi.name}" (unidade: ${kpi.unit}):`, kpi.current_value ?? 0);
    if (val === null || isNaN(parseFloat(val))) return;
    setUpdatingId(kpi.id);
    await base44.entities.BusinessKPI.update(kpi.id, { current_value: parseFloat(val) });
    qc.invalidateQueries({ queryKey: ['business_kpis'] });
    setUpdatingId(null);
    toast.success('Valor atualizado');
  };

  const openEdit = (kpi) => { setEditKPI(kpi); setModalOpen(true); };
  const openNew = () => { setEditKPI(null); setModalOpen(true); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">KPIs & Objetivos</h1>
          <p className="text-slate-500 text-sm">Acompanha o desempenho da empresa em tempo real</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Novo KPI
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button key={key} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
              className={`p-3 rounded-2xl border-2 transition-all text-left ${filterStatus === key ? `${cfg.bg} ${cfg.border}` : 'bg-white border-slate-100 hover:border-slate-200'} shadow-sm`}>
              <Icon className={`w-4 h-4 mb-1 ${cfg.color}`} />
              <div className={`text-xl font-bold ${cfg.color}`}>{counts[key]}</div>
              <div className="text-xs text-slate-500 font-medium">{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Category filters — scrollable row */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${filterCat === 'all' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          Todos
        </button>
        {Object.entries(CAT_LABELS).map(([v, l]) => (
          <button key={v} onClick={() => setFilterCat(filterCat === v ? 'all' : v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${filterCat === v ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-slate-200 border-t-amber-600 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
          <Target className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-semibold text-slate-500 text-lg mb-1">Sem KPIs definidos</p>
          <p className="text-sm mb-4">Define os objetivos estratégicos da empresa</p>
          <button onClick={openNew} className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors">
            <Plus className="w-4 h-4" /> Criar primeiro KPI
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[450px]:grid-cols-2 md:grid-cols-3 gap-3">
          <AnimatePresence>
            {filtered.map((kpi, i) => {
              const cfg = STATUS_CONFIG[kpi._status];
              const StatusIcon = cfg.icon;
              const isAuto = kpi.data_source !== 'manual';
              const pct = kpi.target_value > 0
                ? kpi.direction === 'down'
                  ? Math.min(100, (kpi.target_value / Math.max(kpi._current, 0.01)) * 100)
                  : Math.min(100, (kpi._current / kpi.target_value) * 100)
                : 0;

              return (
                <motion.div key={kpi.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}
                  className={`bg-white rounded-2xl p-5 border-2 shadow-sm ${kpi._status === 'at_risk' ? 'border-amber-200' : kpi._status === 'failed' ? 'border-red-200' : 'border-slate-100'}`}>

                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{CAT_LABELS[kpi.category]} · {PERIOD_LABELS[kpi.period]}</span>
                      <h3 className="font-bold text-slate-800 text-base leading-tight mt-0.5">{kpi.name}</h3>
                      {kpi.responsible && <p className="text-xs text-slate-400 mt-0.5">👤 {kpi.responsible}</p>}
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-2 ${cfg.bg} ${cfg.color}`}>
                      <StatusIcon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </div>

                  {/* Values */}
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-2xl font-extrabold text-slate-900">{fmtValue(kpi._current, kpi.unit)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">atual {isAuto && <span className="text-amber-600">(auto)</span>}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-slate-500">{fmtValue(kpi.target_value, kpi.unit)}</p>
                      <p className="text-xs text-slate-400">objetivo {kpi.direction === 'up' ? '↑' : '↓'}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <ProgressBar current={kpi._current} target={kpi.target_value} direction={kpi.direction} status={kpi._status} />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400">0</span>
                    <span className={`text-xs font-semibold ${cfg.color}`}>{Math.round(pct)}%</span>
                  </div>

                  {kpi.description && <p className="text-xs text-slate-400 mt-3 leading-relaxed">{kpi.description}</p>}

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                    {!isAuto && (
                      <button onClick={() => handleUpdateCurrentValue(kpi)} disabled={updatingId === kpi.id}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">
                        {updatingId === kpi.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Atualizar valor
                      </button>
                    )}
                    <button onClick={() => openEdit(kpi)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                    <button onClick={() => handleDelete(kpi.id)}
                      className="flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AddEditKPIModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditKPI(null); }} onSave={handleSave} editKPI={editKPI} />
    </div>
  );
}
