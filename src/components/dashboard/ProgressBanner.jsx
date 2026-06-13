import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const levelNames = [
  'Iniciante', 'Novato', 'Aprendiz', 'Intermédio', 'Habilidoso',
  'Avançado', 'Especialista', 'Mestre', 'Grão-Mestre', 'Lenda'
];

const motivationalMessages = [
  "Cada pequeno passo conta. Parabéns pelo teu progresso! 👍",
  "Estás a construir o teu futuro financeiro! 🌟",
  "Continua assim! O sucesso vem com consistência! 💪",
  "A tua jornada financeira está no bom caminho! 🚀",
  "Pequenas ações, grandes resultados! ✨"
];

export default function ProgressBanner({ totalXp = 0, level = 1 }) {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const messageIndex = dayOfYear % motivationalMessages.length;
  const message = motivationalMessages[messageIndex];
  const levelName = levelNames[Math.min(level - 1, levelNames.length - 1)];

  return (
    <Link to={createPageUrl('Achievements')}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        className="rounded-2xl bg-gradient-to-r from-blue-700 to-blue-900 p-4 text-white shadow-lg"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-yellow-800" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white/90">{message}</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-white/80">
              <Star className="h-4 w-4" />
              <span>Nível {level}</span>
              <span>•</span>
              <span>{totalXp} pontos</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}