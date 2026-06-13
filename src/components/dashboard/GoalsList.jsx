import React from 'react';
import { motion } from 'framer-motion';
import { Target, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function GoalsList({ goals }) {
  const activeGoals = goals.filter(g => {
    const progress = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
    return progress < 100;
  }).slice(0, 3);

  if (activeGoals.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-slate-50 p-6 text-center"
      >
        <Target className="h-10 w-10 mx-auto text-slate-300 mb-2" />
        <p className="text-slate-500">Ainda sem metas definidas</p>
        <Link 
          to={createPageUrl('Goals')}
          className="text-sm font-medium text-blue-700 mt-2 inline-block"
        >
          Criar primeira meta →
        </Link>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-800">Metas por Cumprir</h2>
        <Link 
          to={createPageUrl('Goals')}
          className="text-sm font-medium text-blue-700"
        >
          Ver todas
        </Link>
      </div>
      
      <div className="space-y-3">
        {activeGoals.map((goal, index) => {
          const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
          const remaining = goal.target_amount - goal.current_amount;
          
          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl bg-white p-4 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{goal.icon || '🎯'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{goal.title}</p>
                  <div className="mt-1.5 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-800 rounded-full"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Faltam €{remaining.toLocaleString('pt-PT')} ({progress.toFixed(0)}%)
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}