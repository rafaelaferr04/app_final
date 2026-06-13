import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import GoalCard from '../components/goals/GoalCard';
import AddGoalSheet from '../components/goals/AddGoalSheet';

export default function Goals() {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [addFundsGoal, setAddFundsGoal] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', user?.email],
    queryFn: () => user ? base44.entities.SavingsGoal.filter({ created_by: user.email }, '-created_date', 20) : [],
    enabled: !!user
  });

  const createGoal = useMutation({
    mutationFn: (data) => base44.entities.SavingsGoal.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
    onError: (err) => alert(`Erro ao criar meta: ${err?.message || 'Verifica a ligação à base de dados.'}`),
  });

  const updateGoal = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SavingsGoal.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] })
  });

  const deleteGoal = useMutation({
    mutationFn: (id) => base44.entities.SavingsGoal.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] })
  });

  const handleAddFunds = () => {
    if (!fundAmount || !addFundsGoal) return;
    const amount = parseFloat(fundAmount);
    const newAmount = (addFundsGoal.current_amount || 0) + amount;
    const newContribution = { amount, date: new Date().toISOString().split('T')[0] };
    const updatedHistory = [...(addFundsGoal.contribution_history || []), newContribution];
    updateGoal.mutate({
      id: addFundsGoal.id,
      data: {
        current_amount: newAmount,
        contribution_history: updatedHistory,
        ...(newAmount >= addFundsGoal.target_amount && !addFundsGoal.completed_date
          ? { completed_date: new Date().toISOString().split('T')[0] }
          : {})
      }
    });
    setAddFundsGoal(null);
    setFundAmount('');
  };

  const totalSaved    = goals.reduce((s, g) => s + (g.current_amount || 0), 0);
  const totalTarget   = goals.reduce((s, g) => s + (g.target_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const fmt = (n) =>
    (n || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden shadow-lg"
      >
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-5 py-5 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-widest">Poupança</p>
                <h1 className="text-white text-lg sm:text-xl font-bold leading-tight">Metas de Poupança</h1>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <p className="text-blue-200 text-[10px] mb-0.5">Poupado</p>
                <p className="text-white text-sm font-bold tabular-nums">€{fmt(totalSaved)}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <p className="text-blue-200 text-[10px] mb-0.5">Objetivo</p>
                <p className="text-white text-sm font-bold tabular-nums">€{fmt(totalTarget)}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <p className="text-blue-200 text-[10px] mb-0.5">Metas</p>
                <p className="text-white text-sm font-bold">{goals.length} {goals.length === 1 ? 'ativa' : 'ativas'}</p>
              </div>
            </div>
            {totalTarget > 0 && (
              <div>
                <div className="flex justify-between text-[11px] text-blue-200 mb-1.5">
                  <span>Progresso total</span>
                  <span className="font-bold text-white">{overallProgress.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(overallProgress, 100)}%` }}
                    transition={{ duration: 1 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-teal-300"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Goals grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-800">As Tuas Metas</h2>
          <button
            onClick={() => setShowAddGoal(true)}
            className="bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-36 rounded-2xl bg-white shadow-sm animate-pulse" />)}
          </div>
        ) : goals.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl bg-white border border-blue-100 p-8 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <Target className="h-6 w-6 text-blue-700" />
            </div>
            <h3 className="font-bold text-slate-800">Ainda Sem Metas</h3>
            <p className="text-sm text-slate-500 mt-1">Cria a tua primeira meta de poupança!</p>
            <Button onClick={() => setShowAddGoal(true)} className="mt-4 bg-blue-700 hover:bg-blue-800">
              <Plus className="mr-2 h-4 w-4" />
              Criar Meta
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
            <AnimatePresence>
              {goals.map((goal, index) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  index={index}
                  onAddFunds={setAddFundsGoal}
                  onDelete={(id) => deleteGoal.mutate(id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AddGoalSheet isOpen={showAddGoal} onClose={() => setShowAddGoal(false)} onSave={(data) => createGoal.mutateAsync(data)} />

      <Dialog open={!!addFundsGoal} onOpenChange={() => setAddFundsGoal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar a "{addFundsGoal?.title}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-slate-500">
              Atual: €{addFundsGoal?.current_amount?.toLocaleString('pt-PT')} / €{addFundsGoal?.target_amount?.toLocaleString('pt-PT')}
            </p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">€</span>
              <Input
                type="number" step="0.01" min="0"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="Valor a adicionar"
                className="h-12 pl-8 rounded-xl"
              />
            </div>
            <Button
              onClick={handleAddFunds}
              disabled={!fundAmount || updateGoal.isPending}
              className="w-full h-12 bg-blue-700 hover:bg-blue-800"
            >
              {updateGoal.isPending ? 'A adicionar...' : 'Adicionar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
