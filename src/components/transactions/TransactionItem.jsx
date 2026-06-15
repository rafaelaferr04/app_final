import React from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag, Utensils, Car, Home, Zap, Gamepad2, Heart,
  GraduationCap, PiggyBank, Briefcase, Gift, TrendingUp, MoreHorizontal, Trash2
} from 'lucide-react';
import { format } from 'date-fns';

const categoryConfig = {
  salary: { icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Salário' },
  freelance: { icon: Briefcase, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Freelance' },
  investment: { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Investimento' },
  gift: { icon: Gift, color: 'text-pink-600', bg: 'bg-pink-50', label: 'Presente' },
  food: { icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Alimentação' },
  transport: { icon: Car, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Transporte' },
  housing: { icon: Home, color: 'text-violet-600', bg: 'bg-violet-50', label: 'Habitação' },
  utilities: { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Contas' },
  entertainment: { icon: Gamepad2, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Lazer' },
  shopping: { icon: ShoppingBag, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Compras' },
  health: { icon: Heart, color: 'text-red-600', bg: 'bg-red-50', label: 'Saúde' },
  education: { icon: GraduationCap, color: 'text-cyan-600', bg: 'bg-cyan-50', label: 'Educação' },
  savings: { icon: PiggyBank, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Poupança' },
  other: { icon: MoreHorizontal, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Outros' },
};

export default function TransactionItem({ transaction, index = 0, onDelete, showDelete = false }) {
  const config = categoryConfig[transaction.category] || categoryConfig.other;
  const Icon = config.icon;
  const isIncome = transaction.type === 'income';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 px-4 py-3"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{transaction.title}</p>
        <p className="text-xs text-slate-400">
          {config.label} · {format(new Date(transaction.date + 'T12:00:00'), 'dd MMM')}
        </p>
      </div>

      <p className={`text-sm font-semibold shrink-0 ${isIncome ? 'text-emerald-600' : 'text-slate-900'}`}>
        {isIncome ? '+' : '−'}€{Math.abs(transaction.amount).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
      </p>

      {showDelete && onDelete && (
        <button
          onClick={() => onDelete(transaction.id)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-400 transition-colors shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}
