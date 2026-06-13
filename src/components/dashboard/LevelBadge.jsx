import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const levelNames = [
  'Iniciante', 'Novato', 'Aprendiz', 'Intermédio', 'Habilidoso',
  'Avançado', 'Especialista', 'Mestre', 'Grão-Mestre', 'Lenda'
];

const xpPerLevel = 500;

export default function LevelBadge({ totalXp = 0, level = 1, compact = false }) {
  const currentLevelXp = totalXp % xpPerLevel;
  const progress = (currentLevelXp / xpPerLevel) * 100;
  const levelName = levelNames[Math.min(level - 1, levelNames.length - 1)];

  if (compact) {
    return (
      <Link to={createPageUrl('Achievements')}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 p-4 border border-blue-100 text-center h-full flex flex-col items-center justify-center gap-2"
        >
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 shadow-lg shadow-blue-900/20">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -right-1 -top-1"
            >
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            </motion.div>
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-700">Nível {level}</p>
            <p className="text-xs font-bold text-slate-800 truncate">{levelName}</p>
          </div>
          <div className="flex items-center gap-0.5 text-blue-700">
            <Zap className="h-3 w-3" />
            <span className="text-xs font-bold">{totalXp} XP</span>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link to={createPageUrl('Achievements')}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 p-5 border border-blue-100"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 shadow-lg shadow-blue-900/20">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -right-1 -top-1"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              </motion.div>
            </div>
            <div>
              <p className="text-xs font-medium text-blue-700">Nível {level}</p>
              <p className="font-bold text-slate-800">{levelName}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-blue-700">
              <Zap className="h-4 w-4" />
              <span className="font-bold">{totalXp}</span>
            </div>
            <p className="text-xs text-slate-500">XP Total</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Próximo nível</span>
            <span>{currentLevelXp}/{xpPerLevel} XP</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-blue-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-800"
            />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
