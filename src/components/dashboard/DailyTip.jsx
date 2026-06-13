import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const todayKey = () => new Date().toISOString().split('T')[0];

export default function DailyTip() {
  const [tip, setTip] = useState('');

  useEffect(() => {
    const cached = localStorage.getItem('daily_tip_v2');
    if (cached) {
      const { date, text } = JSON.parse(cached);
      if (date === todayKey() && text) { setTip(text); return; }
    }
    base44.integrations.Core.InvokeLLM({
      prompt: 'Dá-me UMA única frase (não duas, não três — apenas uma) com uma dica prática sobre finanças pessoais ou poupança. Responde APENAS com essa frase, sem mais nada.',
      system: 'Responde em português de Portugal. Responde com exactamente 1 frase curta e directa.'
    }).then(text => {
      const clean = typeof text === 'string' ? text.trim() : '';
      if (clean) {
        setTip(clean);
        localStorage.setItem('daily_tip_v2', JSON.stringify({ date: todayKey(), text: clean }));
      }
    }).catch(() => {});
  }, []);

  if (!tip) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-blue-50 p-5 border border-blue-100"
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
          <Lightbulb className="h-5 w-5 text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-blue-800 text-sm sm:text-base">Dica do Dia</h4>
          <p className="mt-1 text-xs sm:text-sm text-blue-700 leading-relaxed">{tip}</p>
        </div>
      </div>
    </motion.div>
  );
}