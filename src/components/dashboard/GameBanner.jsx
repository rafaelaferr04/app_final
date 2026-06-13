import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Trophy, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function GameBanner({ totalXp = 0, completedCourses = 0, compact = false }) {
  if (compact) {
    return (
      <Link to={createPageUrl('Courses')}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 p-4 text-white text-center shadow-lg h-full flex flex-col items-center justify-center gap-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 mx-auto">
            <Gamepad2 className="h-5 w-5 text-white" />
          </div>
          <p className="text-xs font-bold leading-tight">Aprender</p>
          <div className="flex items-center justify-center gap-1">
            <Trophy className="h-3 w-3 text-yellow-300" />
            <span className="text-xs font-bold">{totalXp} XP</span>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link to={createPageUrl('Courses')}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="rounded-2xl bg-gradient-to-r from-blue-700 to-blue-900 p-4 text-white shadow-lg"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Gamepad2 className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Aprende a Jogar!</p>
            <p className="text-sm text-white/80">Ganha pontos com mini-cursos de finanças</p>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="h-5 w-5 text-yellow-300" />
            <span className="font-bold">{totalXp} XP</span>
          </div>
          <ChevronRight className="h-5 w-5 text-white/60" />
        </div>
      </motion.div>
    </Link>
  );
}
