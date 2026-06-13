import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';

export default function QuickStats({ income, expenses, savings, balance }) {
  const stats = [
    { 
      label: 'Receitas', 
      value: income, 
      icon: TrendingUp, 
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100'
    },
    { 
      label: 'Despesas', 
      value: expenses, 
      icon: TrendingDown, 
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      iconBg: 'bg-rose-100'
    },
    { 
      label: 'Poupança', 
      value: savings, 
      icon: PiggyBank, 
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100'
    },
    { 
      label: 'Saldo', 
      value: balance, 
      icon: Wallet, 
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100'
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`rounded-2xl ${stat.bg} p-4`}
        >
          <div className={`inline-flex rounded-xl ${stat.iconBg} p-2`}>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <p className="mt-3 text-xs font-medium text-slate-500">{stat.label}</p>
          <p className={`mt-1 text-lg font-bold ${stat.color}`}>
            €{stat.value?.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
          </p>
        </motion.div>
      ))}
    </div>
  );
}