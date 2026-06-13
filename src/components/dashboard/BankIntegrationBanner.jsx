import React from 'react';
import { motion } from 'framer-motion';
import { Building2, ChevronRight } from 'lucide-react';

export default function BankIntegrationBanner({ onConnect, isConnected }) {
  if (isConnected) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onConnect}
      className="w-full flex items-center gap-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl px-4 py-3 transition-colors text-left"
    >
      <div className="flex-shrink-0 p-1.5 rounded-lg bg-blue-700">
        <Building2 className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 leading-tight">Conecta o teu banco</p>
        <p className="text-xs text-slate-500 truncate">Sincroniza transações automaticamente</p>
      </div>
      <ChevronRight className="h-4 w-4 text-blue-400 shrink-0" />
    </motion.button>
  );
}
