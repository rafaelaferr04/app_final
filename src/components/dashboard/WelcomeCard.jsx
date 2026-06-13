import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Heart, Star, Zap, Target, TrendingUp, Award } from 'lucide-react';

const motivationalMessages = [
  { text: "Cada dia é uma nova oportunidade para cuidar das tuas finanças!", icon: Sparkles },
  { text: "Pequenos passos hoje, grandes conquistas amanhã! 💪", icon: Target },
  { text: "O teu futuro financeiro começa com as escolhas de hoje!", icon: TrendingUp },
  { text: "Continua assim! Estás no caminho certo para a liberdade financeira!", icon: Star },
  { text: "Poupar não é sacrifício, é investir em ti mesmo!", icon: Heart },
  { text: "Cada euro poupado é um passo para os teus sonhos!", icon: Award },
  { text: "A consistência é a chave do sucesso financeiro!", icon: Zap },
  { text: "Acredita no teu potencial de alcançar a independência financeira!", icon: Sparkles },
  { text: "Hoje é um ótimo dia para fazer boas escolhas financeiras!", icon: Star },
  { text: "O sucesso financeiro é construído um dia de cada vez!", icon: Target }
];

export default function WelcomeCard({ userName, streak }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // Use date to get consistent daily message
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    setMessageIndex(dayOfYear % motivationalMessages.length);
  }, []);

  const message = motivationalMessages[messageIndex];
  const Icon = message.icon;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 19) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 p-5 text-white shadow-lg"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-blue-200">{getGreeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}!</p>
          <p className="font-medium text-white mt-1 leading-relaxed">{message.text}</p>
          {streak > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-blue-200">
              <span>🔥</span>
              <span>{streak} dias consecutivos</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}