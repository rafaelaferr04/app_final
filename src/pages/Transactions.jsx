import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, TrendingUp, TrendingDown, SlidersHorizontal, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

import TransactionItem from '../components/transactions/TransactionItem';
import AddTransactionSheet from '../components/transactions/AddTransactionSheet';

const fmt = (n) =>
  (n || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ALL_CATEGORIES = [
  { id: 'food',          label: 'Alimentação' },
  { id: 'transport',     label: 'Transporte' },
  { id: 'housing',       label: 'Habitação' },
  { id: 'utilities',     label: 'Contas' },
  { id: 'entertainment', label: 'Lazer' },
  { id: 'shopping',      label: 'Compras' },
  { id: 'health',        label: 'Saúde' },
  { id: 'education',     label: 'Educação' },
  { id: 'savings',       label: 'Poupança' },
  { id: 'salary',        label: 'Salário' },
  { id: 'freelance',     label: 'Freelance' },
  { id: 'investment',    label: 'Investimento' },
  { id: 'gift',          label: 'Presente' },
  { id: 'other',         label: 'Outros' },
];

export default function Transactions() {
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showFilters, setShowFilters]               = useState(false);
  const [searchQuery, setSearchQuery]               = useState('');
  const [filterType, setFilterType]                 = useState('all');
  const [minAmount, setMinAmount]                   = useState('');
  const [maxAmount, setMaxAmount]                   = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => user ? base44.entities.Transaction.filter({ created_by: user.email }, '-date', 500) : [],
    enabled: !!user
  });

  const createTransaction = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] })
  });

  const deleteTransaction = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] })
  });

  const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const activeFiltersCount = [
    minAmount !== '',
    maxAmount !== '',
    selectedCategories.length > 0,
  ].filter(Boolean).length;

  const toggleCategory = (id) =>
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const clearFilters = () => {
    setMinAmount('');
    setMaxAmount('');
    setSelectedCategories([]);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType   = filterType === 'all' || t.type === filterType;
    const matchesMin    = !minAmount || t.amount >= parseFloat(minAmount);
    const matchesMax    = !maxAmount || t.amount <= parseFloat(maxAmount);
    const matchesCat    = selectedCategories.length === 0 || selectedCategories.includes(t.category);
    return matchesSearch && matchesType && matchesMin && matchesMax && matchesCat;
  });

  // Group by month
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    if (!transaction.date) return groups;
    try {
      const monthKey = format(new Date(transaction.date), 'MMMM yyyy', { locale: pt });
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(transaction);
    } catch { /* skip */ }
    return groups;
  }, {});

  return (
    <div className="space-y-4">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden shadow-lg"
      >
        <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 px-5 py-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute top-3 right-20 w-20 h-20 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute -bottom-8 -left-6 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />
          <div className="relative">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mb-1">Histórico</p>
            <h1 className="text-white text-xl sm:text-2xl font-bold tracking-tight mb-4">Transações</h1>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                  <p className="text-[10px] text-slate-300">Entradas</p>
                </div>
                <p className="text-sm font-bold text-white tabular-nums">€{fmt(totalIncome)}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-300 shrink-0" />
                  <p className="text-[10px] text-slate-300">Saídas</p>
                </div>
                <p className="text-sm font-bold text-white tabular-nums">€{fmt(totalExpenses)}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] text-slate-300">Balanço</span>
                </div>
                <p className={`text-sm font-bold tabular-nums ${totalIncome - totalExpenses >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {totalIncome - totalExpenses >= 0 ? '+' : '−'}€{fmt(Math.abs(totalIncome - totalExpenses))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search + type filters + advanced filter button */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 sm:p-4 space-y-2.5 sm:space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar transações..."
            className="h-10 pl-10 rounded-lg border-slate-200 bg-slate-50 focus:bg-white text-sm"
          />
        </div>
        <div className="flex gap-1.5 sm:gap-2 items-center overflow-x-auto scrollbar-hide pb-0.5">
          {[
            { id: 'all',     label: 'Todas' },
            { id: 'income',  label: 'Receitas' },
            { id: 'expense', label: 'Despesas' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`flex-shrink-0 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                filterType === f.id
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* Advanced filter button */}
          <button
            onClick={() => setShowFilters(true)}
            className={`ml-auto flex-shrink-0 flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
              activeFiltersCount > 0
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <SlidersHorizontal className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {activeFiltersCount > 0 ? `Filtros (${activeFiltersCount})` : 'Filtros'}
          </button>
        </div>

        {/* Active filter chips */}
        {(minAmount || maxAmount || selectedCategories.length > 0) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {minAmount && (
              <span className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                Min €{minAmount}
                <button onClick={() => setMinAmount('')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {maxAmount && (
              <span className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                Max €{maxAmount}
                <button onClick={() => setMaxAmount('')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedCategories.map(id => {
              const cat = ALL_CATEGORIES.find(c => c.id === id);
              return (
                <span key={id} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  {cat?.label}
                  <button onClick={() => toggleCategory(id)}><X className="h-3 w-3" /></button>
                </span>
              );
            })}
            <button onClick={clearFilters} className="text-xs text-rose-500 font-medium px-1">
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* Transactions list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : Object.keys(groupedTransactions).length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center"
        >
          <p className="text-slate-500 font-medium">Sem transações</p>
          <p className="text-slate-400 text-sm mt-1">
            {searchQuery || activeFiltersCount > 0 ? 'Tenta ajustar os filtros.' : 'Usa o botão + para adicionar.'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTransactions).map(([month, monthTx]) => (
            <div key={month}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 px-0.5">
                {month.charAt(0).toUpperCase() + month.slice(1)}
              </p>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="divide-y divide-slate-50">
                  <AnimatePresence>
                    {monthTx.map((transaction, index) => (
                      <TransactionItem
                        key={transaction.id}
                        transaction={transaction}
                        index={index}
                        showDelete={true}
                        onDelete={(id) => deleteTransaction.mutate(id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setShowAddTransaction(true)}
        className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-50 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-blue-900 text-white shadow-lg shadow-blue-900/40 hover:bg-blue-950 transition-colors"
        title="Nova transação"
      >
        <Plus className="h-5 w-5 md:h-6 md:w-6" />
      </motion.button>

      <AddTransactionSheet
        isOpen={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
        onSave={(data) => createTransaction.mutateAsync(data)}
      />

      {/* Advanced filter sheet */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-5 pt-5 pb-8 max-h-[85vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-800 text-lg">Filtros avançados</h3>
                <div className="flex items-center gap-3">
                  {activeFiltersCount > 0 && (
                    <button onClick={clearFilters} className="text-sm text-rose-500 font-medium">
                      Limpar tudo
                    </button>
                  )}
                  <button onClick={() => setShowFilters(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Price range */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-slate-700 mb-3">Valor (€)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">€</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="Mínimo"
                      className="pl-7 h-11 rounded-xl text-sm"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">€</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      placeholder="Máximo"
                      className="pl-7 h-11 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-slate-700 mb-3">Categorias</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedCategories.includes(cat.id)
                          ? 'bg-blue-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowFilters(false)}
                className="w-full h-12 bg-blue-700 text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors"
              >
                {activeFiltersCount > 0
                  ? `Aplicar ${activeFiltersCount} filtro${activeFiltersCount !== 1 ? 's' : ''}`
                  : 'Aplicar'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
