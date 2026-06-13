import React from 'react';
import { motion } from 'framer-motion';
import { Target, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function GoalProgress({ goals }) {
  if (!goals || goals.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-50 p-6"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3">
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Define a Tua Primeira Meta</h3>
            <p className="text-sm text-slate-500">Começa a poupar para algo especial</p>
          </div>
        </div>
        <Link 
          to={createPageUrl('Goals')}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600"
        >
          Criar meta <ChevronRight className="h-4 w-4" />
        </Link>
      </motion.div>
    );
  }

  const topGoal = goals[0];
  const progress = (topGoal.current_amount / topGoal.target_amount) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Meta Principal</h3>
        <Link 
          to={createPageUrl('Goals')}
          className="text-sm font-medium text-emerald-600"
        >
          Ver todas
        </Link>
      </div>
      
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-2xl">
          {topGoal.icon || '🎯'}
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-800">{topGoal.title}</p>
          <p className="text-sm text-slate-500">
            €{topGoal.current_amount?.toLocaleString('pt-PT')} de €{topGoal.target_amount?.toLocaleString('pt-PT')}
          </p>
        </div>
      </div>
      
      <div className="mt-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Progresso</span>
          <span className="font-medium text-emerald-600">{progress.toFixed(0)}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
          />
        </div>
      </div>
    </motion.div>
  );
}