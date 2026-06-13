import React from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SavingsProgress({ goals }) {
  const totalSaved = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + (g.target_amount || 0), 0);
  const progress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Meta de Poupança</h3>
        <span className="text-sm font-medium text-blue-700">{progress.toFixed(0)}%</span>
      </div>
      
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-blue-600 to-blue-800 rounded-full"
        />
      </div>
      
      <div className="mt-3 flex justify-between text-sm">
        <span className="text-slate-600">€{totalSaved.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
        <span className="text-slate-400">€{totalTarget.toLocaleString('pt-PT')}</span>
      </div>
      
      {goals.length === 0 && (
        <Link 
          to={createPageUrl('Goals')}
          className="mt-3 inline-flex text-sm font-medium text-blue-700"
        >
          Criar primeira meta →
        </Link>
      )}
    </motion.div>
  );
}