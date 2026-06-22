import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ALL_COURSES } from '../data/coursesData';
import { calculateTotalXP } from '../lib/xpUtils';

export const ALL_ACHIEVEMENTS = [
  { id: 'first_transaction', title: 'Primeiros Passos',      description: 'Regista a tua primeira transação',      icon: '👣', xp: 25,  category: 'basics',       rarity: 'common' },
  { id: 'budget_master',     title: 'Mestre do Orçamento',   description: 'Regista 50 transações',                  icon: '📊', xp: 100, category: 'transactions', rarity: 'rare' },
  { id: 'saving_starter',    title: 'Poupador Iniciante',    description: 'Cria a tua primeira meta de poupança',   icon: '🎯', xp: 25,  category: 'goals',        rarity: 'common' },
  { id: 'goal_crusher',      title: 'Destruidor de Metas',   description: 'Completa uma meta de poupança',          icon: '🏆', xp: 150, category: 'goals',        rarity: 'rare' },
  { id: 'course_beginner',   title: 'Aprendiz Entusiasta',   description: 'Completa o teu primeiro curso',          icon: '📚', xp: 100, category: 'learning',     rarity: 'rare' },
  { id: 'course_master',     title: 'Estudioso de Finanças', description: 'Completa todos os cursos',               icon: '🎓', xp: 500, category: 'learning',     rarity: 'legendary' },
  { id: 'week_streak',       title: 'Rei da Consistência',   description: 'Mantém uma sequência de 7 dias',         icon: '🔥', xp: 75,  category: 'streaks',      rarity: 'common' },
  { id: 'month_streak',      title: 'Mestre da Dedicação',   description: 'Mantém uma sequência de 30 dias',        icon: '⚡', xp: 250, category: 'streaks',      rarity: 'epic' },
  { id: 'chatbot_friend',    title: 'Amigo Financeiro',      description: 'Tem 10 conversas com o Finny',           icon: '🤖', xp: 50,  category: 'chat',         rarity: 'common' },
  { id: 'saver_bronze',      title: 'Poupador Bronze',       description: 'Poupa €500 no total',                    icon: '🥉', xp: 100, category: 'savings',      rarity: 'rare' },
  { id: 'saver_silver',      title: 'Poupador Prata',        description: 'Poupa €2.500 no total',                  icon: '🥈', xp: 250, category: 'savings',      rarity: 'epic' },
  { id: 'saver_gold',        title: 'Poupador Ouro',         description: 'Poupa €10.000 no total',                 icon: '🥇', xp: 500, category: 'savings',      rarity: 'legendary' },
];

const RARITY = {
  common:    { label: 'Comum',    bg: 'bg-slate-50',   border: 'border-slate-200',  badge: 'bg-slate-200 text-slate-600',    icon: '⚪' },
  rare:      { label: 'Raro',     bg: 'bg-blue-50',    border: 'border-blue-200',   badge: 'bg-blue-200 text-blue-700',      icon: '🔵' },
  epic:      { label: 'Épico',    bg: 'bg-violet-50',  border: 'border-violet-200', badge: 'bg-violet-200 text-violet-700',  icon: '🟣' },
  legendary: { label: 'Lendário', bg: 'bg-amber-50',   border: 'border-amber-300',  badge: 'bg-amber-200 text-amber-800',    icon: '🟡' },
};

const CAT_LABELS = {
  basics:       '👣 Primeiros Passos',
  transactions: '📊 Transações',
  goals:        '🎯 Metas',
  learning:     '📚 Aprendizagem',
  savings:      '💰 Poupança',
  streaks:      '🔥 Sequências',
  chat:         '🤖 Chatbot',
};

export default function Achievements() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', user?.email],
    queryFn: () => user ? base44.entities.Achievement.filter({ created_by: user.email }) : [],
    enabled: !!user,
  });

  const { data: userProfiles = [] } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      if (profiles.length === 0) {
        const p = await base44.entities.UserProfile.create({ total_xp: 0, current_level: 1, streak_days: 0, notifications_enabled: true });
        return [p];
      }
      return profiles;
    },
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => user ? base44.entities.Transaction.filter({ created_by: user.email }) : [],
    enabled: !!user,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', user?.email],
    queryFn: () => user ? base44.entities.SavingsGoal.filter({ created_by: user.email }) : [],
    enabled: !!user,
  });

  const { data: courseProgress = [] } = useQuery({
    queryKey: ['courseProgress', user?.email],
    queryFn: () => user ? base44.entities.CourseProgress.filter({ created_by: user.email }) : [],
    enabled: !!user,
  });

  const updateUserProfile = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserProfile.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
  });

  const userProfile = userProfiles[0] || { total_xp: 0, current_level: 1, streak_days: 0 };
  const unlockedIds = achievements.map(a => a.achievement_id);

  const calculateUnlocked = () => {
    const unlocked = [...unlockedIds];
    if (transactions.length >= 1  && !unlocked.includes('first_transaction')) unlocked.push('first_transaction');
    if (transactions.length >= 50 && !unlocked.includes('budget_master'))     unlocked.push('budget_master');
    if (goals.length >= 1         && !unlocked.includes('saving_starter'))    unlocked.push('saving_starter');
    if (goals.some(g => g.current_amount >= g.target_amount) && !unlocked.includes('goal_crusher')) unlocked.push('goal_crusher');
    if (courseProgress.some(p => p.completed)                && !unlocked.includes('course_beginner')) unlocked.push('course_beginner');
    if (courseProgress.filter(p => p.completed).length >= 6  && !unlocked.includes('course_master'))   unlocked.push('course_master');
    if (userProfile.streak_days >= 7  && !unlocked.includes('week_streak'))  unlocked.push('week_streak');
    if (userProfile.streak_days >= 30 && !unlocked.includes('month_streak')) unlocked.push('month_streak');
    const totalSaved = goals.reduce((s, g) => s + (g.current_amount || 0), 0);
    if (totalSaved >= 500   && !unlocked.includes('saver_bronze')) unlocked.push('saver_bronze');
    if (totalSaved >= 2500  && !unlocked.includes('saver_silver')) unlocked.push('saver_silver');
    if (totalSaved >= 10000 && !unlocked.includes('saver_gold'))   unlocked.push('saver_gold');
    return unlocked;
  };

  const currentUnlocked = calculateUnlocked();

  const totalXP = calculateTotalXP({
    unlockedAchievementIds: currentUnlocked,
    allAchievements: ALL_ACHIEVEMENTS,
    courseProgressList: courseProgress,
    allCourses: ALL_COURSES,
    financialGoal: userProfile.financial_goal || null,
  });

  useEffect(() => {
    if (!userProfile?.id) return;
    if (Math.abs(totalXP - (userProfile.total_xp || 0)) > 0) {
      const newLevel = Math.floor(totalXP / 500) + 1;
      updateUserProfile.mutate({ id: userProfile.id, data: { total_xp: totalXP, current_level: newLevel } });
    }
  }, [totalXP, userProfile?.id]);

  const byCategory = {};
  ALL_ACHIEVEMENTS.forEach(a => {
    if (!byCategory[a.category]) byCategory[a.category] = [];
    byCategory[a.category].push(a);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Conquistas</h1>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-full">
          <Trophy className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-bold text-amber-700">{currentUnlocked.length} / {ALL_ACHIEVEMENTS.length}</span>
        </div>
      </div>

      {/* Progress card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-slate-700">Progresso geral</span>
          <span className="font-bold text-amber-600">{Math.round((currentUnlocked.length / ALL_ACHIEVEMENTS.length) * 100)}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
            style={{ width: `${(currentUnlocked.length / ALL_ACHIEVEMENTS.length) * 100}%` }}
          />
        </div>
        <div className="flex gap-4 mt-4 text-center">
          {Object.entries(RARITY).map(([k, r]) => {
            const count = ALL_ACHIEVEMENTS.filter(a => a.rarity === k && currentUnlocked.includes(a.id)).length;
            const total = ALL_ACHIEVEMENTS.filter(a => a.rarity === k).length;
            return (
              <div key={k} className="flex-1">
                <span className="text-lg">{r.icon}</span>
                <p className="text-xs font-bold text-slate-700 mt-0.5">{count}/{total}</p>
                <p className="text-[10px] text-slate-400">{r.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* By category */}
      {Object.entries(byCategory).map(([cat, achs]) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-slate-500 mb-3">{CAT_LABELS[cat] || cat}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {achs.map((ach, i) => {
              const isUnlocked = currentUnlocked.includes(ach.id);
              const r = RARITY[ach.rarity];
              return (
                <motion.div key={ach.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={`p-4 rounded-2xl border-2 transition-all ${isUnlocked ? `${r.bg} ${r.border}` : 'bg-white border-slate-100 opacity-50 grayscale'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${isUnlocked ? '' : 'opacity-30'}`}>
                      {ach.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h4 className={`text-sm font-bold ${isUnlocked ? 'text-slate-800' : 'text-slate-400'}`}>{ach.title}</h4>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${r.badge}`}>{r.label}</span>
                      </div>
                      <p className={`text-xs ${isUnlocked ? 'text-slate-600' : 'text-slate-400'}`}>{ach.description}</p>
                      {!isUnlocked && <p className="text-[10px] text-slate-400 mt-1 italic">Ainda não desbloqueado</p>}
                      {isUnlocked  && <p className="text-[10px] text-emerald-600 font-semibold mt-1">✓ Conquistado · +{ach.xp} XP</p>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
