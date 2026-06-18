import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Trash2, TrendingUp, TrendingDown, Wallet, Pencil, Upload, X, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import AddBusinessTransactionSheet from '@/components/business/AddBusinessTransactionSheet';
import ImportTransactionsModal from '@/components/business/ImportTransactionsModal';
import BankConnectionModal from '@/components/settings/BankConnectionModal';

const fmt = (n) => (n || 0).toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function TransactionPicker({ isOpen, onClose, onManual, onImport, onBank, bankConnected }) {
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
          {!bankConnected && (
            <button onClick={() => { onClose(); onBank(); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-colors text-left">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Conectar Banco</p>
                <p className="text-xs text-slate-400">Importa transações automaticamente</p>
              </div>
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const TYPE_LABELS = { revenue: 'Receita', cost: 'Custo', investment: 'Investimento', tax: 'Imposto', transfer: 'Transferência' };
const TYPE_COLORS = { revenue: 'text-emerald-600 bg-emerald-50', cost: 'text-red-600 bg-red-50', investment: 'text-blue-600 bg-blue-50', tax: 'text-amber-600 bg-amber-50', transfer: 'text-slate-600 bg-slate-100' };
const TYPE_EMOJI = { revenue: '💰', cost: '💸', investment: '📊', tax: '🧾', transfer: '↔️' };
const STATUS_COLORS = { draft: 'text-slate-500 bg-slate-100', pending: 'text-amber-700 bg-amber-50', approved: 'text-blue-700 bg-blue-50', paid: 'text-emerald-700 bg-emerald-50' };
const STATUS_LABELS = { draft: 'Rascunho', pending: 'Pendente', approved: 'Aprovado', paid: 'Pago' };

export default function BusinessTransactions() {
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));

  const businessId = localStorage.getItem('wm_business_id');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['business_transactions'],
    queryFn: () => base44.entities.BusinessTransaction.filter({}, '-created_date', 500),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.filter(),
  });
  const { data: bizAccounts = [] } = useQuery({
    queryKey: ['business_account_bank', businessId],
    queryFn: () => businessId ? base44.entities.BusinessAccount.filter({ id: businessId }) : [],
    enabled: !!businessId,
  });
  const bizAccount = bizAccounts[0];
  const bankConnected = bizAccount?.bank_connected ?? false;

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (monthFilter && !t.date?.startsWith(monthFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(t.title?.toLowerCase().includes(q) || t.entity_name?.toLowerCase().includes(q) || t.department?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, monthFilter, search]);

  const totals = useMemo(() => ({
    revenue: filtered.filter(t => t.type === 'revenue').reduce((s, t) => s + (t.amount || 0), 0),
    costs: filtered.filter(t => ['cost', 'investment', 'tax'].includes(t.type)).reduce((s, t) => s + (t.amount || 0), 0),
  }), [filtered]);

  const handleSave = async (data, id) => {
    if (id) {
      await base44.entities.BusinessTransaction.update(id, data);
      qc.invalidateQueries({ queryKey: ['business_transactions'] });
      toast.success('Transação atualizada');
    } else {
      const me = await base44.auth.me();
      await base44.entities.BusinessTransaction.create({ ...data, created_by: me.email });
      qc.invalidateQueries({ queryKey: ['business_transactions'] });
      toast.success('Transação registada');
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.BusinessTransaction.delete(id);
    qc.invalidateQueries({ queryKey: ['business_transactions'] });
    toast.success('Transação eliminada');
  };

  const handleConnectBank = async (provider) => {
    try {
      const data = { bank_connected: true, bank_provider: provider.id, bank_access_token: provider.access_token, bank_last_sync: new Date().toISOString() };
      await base44.entities.BusinessAccount.update(businessId, data);
      qc.invalidateQueries({ queryKey: ['business_account_bank'] });
      toast.success('Banco da empresa conectado');
    } catch {
      toast.error('Erro ao guardar conexão. Confirma que a migração SQL foi aplicada.');
    } finally {
      setBankOpen(false);
    }
  };

  const handleDisconnectBank = async () => {
    try {
      await base44.entities.BusinessAccount.update(businessId, { bank_connected: false, bank_provider: null, bank_access_token: null, bank_last_sync: null });
      qc.invalidateQueries({ queryKey: ['business_account_bank'] });
      toast.success('Banco desconectado');
    } catch {
      toast.error('Erro ao desconectar banco.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Hero banner */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-gradient-to-br from-amber-700 via-amber-800 to-orange-900 px-5 py-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute top-3 right-20 w-20 h-20 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute -bottom-8 -left-6 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />
          <div className="relative">
            <p className="text-[10px] text-amber-300 font-semibold uppercase tracking-widest mb-1">Histórico</p>
            <h1 className="text-white text-xl sm:text-2xl font-bold tracking-tight mb-4">Transações</h1>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                  <p className="text-[10px] text-amber-200">Receitas</p>
                </div>
                <p className="text-sm font-bold text-white tabular-nums">€{fmt(totals.revenue)}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-300 shrink-0" />
                  <p className="text-[10px] text-amber-200">Custos</p>
                </div>
                <p className="text-sm font-bold text-white tabular-nums">€{fmt(totals.costs)}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <p className="text-[10px] text-amber-200 mb-1">Resultado</p>
                <p className={`text-sm font-bold tabular-nums ${totals.revenue - totals.costs >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {totals.revenue - totals.costs >= 0 ? '+' : '−'}€{fmt(Math.abs(totals.revenue - totals.costs))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => { setEditTx(null); setPicker(true); }}
        className="fixed bottom-20 min-[800px]:bottom-6 left-4 min-[800px]:left-6 z-50 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-lg shadow-amber-600/40 hover:bg-amber-700 transition-colors"
        title="Nova transação"
      >
        <Plus className="h-5 w-5" />
      </motion.button>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar..." className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {['all', 'revenue', 'cost', 'investment', 'tax'].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${typeFilter === t ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {t === 'all' ? 'Todos' : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {bankConnected && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700 shrink-0">
              <Building2 className="w-3 h-3 shrink-0" />
              <span>Banco{bizAccount?.bank_provider ? ` · ${bizAccount.bank_provider}` : ''}</span>
              <button onClick={handleDisconnectBank} title="Desconectar banco" className="ml-0.5 p-0.5 rounded-full hover:bg-emerald-200 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-slate-200 border-t-amber-600 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Wallet className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium text-slate-500">Sem transações</p>
            <p className="text-sm mt-1">Usa o botão + para adicionar</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            <AnimatePresence>
              {filtered.map((tx) => (
                <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${TYPE_COLORS[tx.type]}`}>
                    {TYPE_EMOJI[tx.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{tx.title}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[tx.status]}`}>{STATUS_LABELS[tx.status]}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                      <span>{tx.date}</span>
                      {tx.department && <><span>·</span><span>{tx.department}</span></>}
                      {tx.entity_name && <><span>·</span><span>{tx.entity_name}</span></>}
                      {tx.invoice_number && <><span>·</span><span>{tx.invoice_number}</span></>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-base font-bold ${tx.type === 'revenue' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.type === 'revenue' ? '+' : '-'}€{Number(tx.amount).toLocaleString('pt-PT')}
                    </p>
                    <p className="text-xs text-slate-400">{TYPE_LABELS[tx.type]}</p>
                  </div>
                  <button onClick={() => { setEditTx(tx); setSheetOpen(true); }}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-amber-50 text-amber-600 transition-all">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(tx.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-red-50 text-red-500 transition-all ml-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <TransactionPicker
        isOpen={picker}
        onClose={() => setPicker(false)}
        onManual={() => setSheetOpen(true)}
        onImport={() => setImportOpen(true)}
        onBank={() => setBankOpen(true)}
        bankConnected={bankConnected}
      />
      <AddBusinessTransactionSheet isOpen={sheetOpen} onClose={() => { setSheetOpen(false); setEditTx(null); }} onSave={handleSave} departments={departments} editTransaction={editTx} />
      <ImportTransactionsModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
      <BankConnectionModal isOpen={bankOpen} onClose={() => setBankOpen(false)} onConnect={handleConnectBank} />
    </div>
  );
}
