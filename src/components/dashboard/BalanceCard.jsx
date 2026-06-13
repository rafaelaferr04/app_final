import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Frown, Meh } from 'lucide-react';

export default function BalanceCard({ totalBalance, monthlyIncome, monthlyExpenses, monthlySavings, monthlyBudget }) {
  const remaining = monthlyBudget ? monthlyBudget - monthlyExpenses : null;
  const budgetPercentage = monthlyBudget ? (monthlyExpenses / monthlyBudget) * 100 : 0;

  const getBudgetWarning = () => {
    if (!monthlyBudget || monthlyBudget === 0) return null;
    if (budgetPercentage >= 100) {
      return { type: 'exceeded', icon: Frown, message: 'Ultrapassaste o orçamento! 😢', color: 'bg-rose-500' };
    }
    if (budgetPercentage >= 90) {
      return { type: 'critical', icon: Frown, message: 'Cuidado! Quase no limite! 😰', color: 'bg-orange-500' };
    }
    if (budgetPercentage >= 75) {
      return { type: 'warning', icon: Meh, message: 'Atenção: 75% do orçamento gasto', color: 'bg-amber-500' };
    }
    return null;
  };

  const warning = getBudgetWarning();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100/80"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Resumo do Mês</h3>
        <div className="p-2 rounded-xl bg-blue-100">
          <Wallet className="h-5 w-5 text-blue-700" />
        </div>
      </div>
      
      <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-blue-700' : 'text-rose-500'}`}>
        €{totalBalance.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
      </p>
      <p className="text-sm text-slate-500 mt-0.5">Saldo Total</p>
      
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Receitas</p>
            <p className="text-lg font-bold text-emerald-600">€{monthlyIncome.toLocaleString('pt-PT')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100">
            <TrendingDown className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Despesas</p>
            <p className="text-lg font-bold text-rose-500">€{monthlyExpenses.toLocaleString('pt-PT')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100">
            <PiggyBank className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Poupado</p>
            <p className="text-lg font-bold text-blue-600">€{(monthlySavings || 0).toLocaleString('pt-PT')}</p>
          </div>
        </div>
        
        {monthlyBudget > 0 && (
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${remaining >= 0 ? 'bg-blue-100' : 'bg-rose-100'}`}>
              <Wallet className={`h-5 w-5 ${remaining >= 0 ? 'text-blue-700' : 'text-rose-500'}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Resta</p>
              <p className={`text-lg font-bold ${remaining >= 0 ? 'text-blue-700' : 'text-rose-500'}`}>
                {remaining >= 0 ? '' : '-'}€{Math.abs(remaining).toLocaleString('pt-PT')}
              </p>
            </div>
          </div>
        )}
      </div>

      {warning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`mt-4 flex items-center gap-3 p-3 rounded-xl ${warning.color} text-white`}
        >
          <warning.icon className="h-6 w-6 flex-shrink-0" />
          <p className="text-sm font-medium">{warning.message}</p>
        </motion.div>
      )}
    </motion.div>
  );
}