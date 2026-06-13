import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";

const priorityColors = {
  high:   'from-rose-500 to-pink-500',
  medium: 'from-amber-500 to-orange-500',
  low:    'from-blue-500 to-cyan-500'
};

export default function GoalCard({ goal, onAddFunds, onDelete, index = 0 }) {
  const progress  = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
  const remaining = goal.target_amount - goal.current_amount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg sm:text-xl shrink-0">{goal.icon || '🎯'}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-xs sm:text-sm leading-tight truncate">{goal.title}</h3>
            {goal.deadline && (
              <div className="flex items-center gap-0.5 text-[10px] text-slate-400 mt-0.5">
                <Calendar className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{format(new Date(goal.deadline), 'dd/MM/yy')}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className={`rounded-full px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold bg-gradient-to-r ${priorityColors[goal.priority || 'medium']} text-white hidden sm:block`}>
            {goal.priority || 'med'}
          </div>
          <button
            onClick={() => onDelete && onDelete(goal.id)}
            className="p-1 rounded-lg hover:bg-rose-100 text-slate-300 hover:text-rose-500 transition-colors"
          >
            <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </button>
        </div>
      </div>

      {/* Amounts */}
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm sm:text-base font-bold text-slate-900">
          €{(goal.current_amount || 0).toLocaleString('pt-PT')}
        </span>
        <span className="text-[10px] sm:text-xs text-slate-400">
          / €{(goal.target_amount || 0).toLocaleString('pt-PT')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 mb-1">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-700"
        />
      </div>

      {/* % + remaining */}
      <div className="flex justify-between text-[10px] sm:text-xs mb-2">
        <span className="text-emerald-600 font-semibold">{progress.toFixed(0)}%</span>
        <span className="text-slate-400">€{remaining.toLocaleString('pt-PT')} rest.</span>
      </div>

      {/* Action */}
      {progress < 100 ? (
        <button
          onClick={() => onAddFunds(goal)}
          className="w-full h-7 sm:h-8 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-[10px] sm:text-xs font-semibold transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Adicionar
        </button>
      ) : (
        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-1.5">
          <span className="text-base">🎉</span>
          <span className="text-xs font-bold text-emerald-700">Meta Alcançada!</span>
        </div>
      )}
    </motion.div>
  );
}
