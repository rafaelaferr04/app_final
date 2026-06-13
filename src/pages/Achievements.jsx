import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ALL_COURSES } from '../data/coursesData';
import { calculateTotalXP } from '../lib/xpUtils';

export const ALL_ACHIEVEMENTS = [
  { id: 'first_transaction', title: 'Primeiros Passos',       description: 'Regista a tua primeira transação',       icon: '👣', xp: 25,  category: 'basics' },
  { id: 'budget_master',     title: 'Mestre do Orçamento',    description: 'Regista 50 transações',                   icon: '📊', xp: 100, category: 'transactions' },
  { id: 'saving_starter',    title: 'Poupador Iniciante',     description: 'Cria a tua primeira meta de poupança',    icon: '🎯', xp: 25,  category: 'goals' },
  { id: 'goal_crusher',      title: 'Destruidor de Metas',    description: 'Completa uma meta de poupança',           icon: '🏆', xp: 150, category: 'goals' },
  { id: 'course_beginner',   title: 'Aprendiz Entusiasta',    description: 'Completa o teu primeiro curso',           icon: '📚', xp: 100, category: 'learning' },
  { id: 'course_master',     title: 'Estudioso de Finanças',  description: 'Completa todos os cursos',                icon: '🎓', xp: 500, category: 'learning' },
  { id: 'week_streak',       title: 'Rei da Consistência',    description: 'Mantém uma sequência de 7 dias',          icon: '🔥', xp: 75,  category: 'streaks' },
  { id: 'month_streak',      title: 'Mestre da Dedicação',    description: 'Mantém uma sequência de 30 dias',         icon: '⚡', xp: 250, category: 'streaks' },
  { id: 'chatbot_friend',    title: 'Amigo Financeiro',       description: 'Tem 10 conversas com o Finny',            icon: '🤖', xp: 50,  category: 'chat' },
  { id: 'saver_bronze',      title: 'Poupador Bronze',        description: 'Poupa €500 no total',                     icon: '🥉', xp: 100, category: 'savings' },
  { id: 'saver_silver',      title: 'Poupador Prata',         description: 'Poupa €2.500 no total',                   icon: '🥈', xp: 250, category: 'savings' },
  { id: 'saver_gold',        title: 'Poupador Ouro',          description: 'Poupa €10.000 no total',                  icon: '🥇', xp: 500, category: 'savings' },
];

const CATEGORIES = [
  { id: 'all',       label: 'Todas' },
  { id: 'basics',    label: 'Básico' },
  { id: 'goals',     label: 'Metas' },
  { id: 'learning',  label: 'Aprendizagem' },
  { id: 'savings',   label: 'Poupança' },
  { id: 'streaks',   label: 'Sequências' },
];

const levelNames = ['Iniciante', 'Novato', 'Aprendiz', 'Intermédio', 'Habilidoso', 'Avançado', 'Especialista', 'Mestre', 'Grão-Mestre', 'Lenda'];

export default function Achievements() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', user?.email],
    queryFn: () => user ? base44.entities.Achievement.filter({ created_by: user.email }) : [],
    enabled: !!user
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
    enabled: !!user
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => user ? base44.entities.Transaction.filter({ created_by: user.email }) : [],
    enabled: !!user
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', user?.email],
    queryFn: () => user ? base44.entities.SavingsGoal.filter({ created_by: user.email }) : [],
    enabled: !!user
  });

  const { data: courseProgress = [] } = useQuery({
    queryKey: ['courseProgress', user?.email],
    queryFn: () => user ? base44.entities.CourseProgress.filter({ created_by: user.email }) : [],
    enabled: !!user
  });

  const updateUserProfile = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserProfile.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
  });

  const userProfile = userProfiles[0] || { total_xp: 0, current_level: 1, streak_days: 0 };
  const unlockedIds = achievements.map(a => a.achievement_id);

  const calculateUnlocked = () => {
    const unlocked = [...unlockedIds];
    if (transactions.length >= 1 && !unlocked.includes('first_transaction')) unlocked.push('first_transaction');
    if (transactions.length >= 50 && !unlocked.includes('budget_master')) unlocked.push('budget_master');
    if (goals.length >= 1 && !unlocked.includes('saving_starter')) unlocked.push('saving_starter');
    if (goals.some(g => g.current_amount >= g.target_amount) && !unlocked.includes('goal_crusher')) unlocked.push('goal_crusher');
    if (courseProgress.some(p => p.completed) && !unlocked.includes('course_beginner')) unlocked.push('course_beginner');
    if (courseProgress.filter(p => p.completed).length >= 6 && !unlocked.includes('course_master')) unlocked.push('course_master');
    if (userProfile.streak_days >= 7 && !unlocked.includes('week_streak')) unlocked.push('week_streak');
    if (userProfile.streak_days >= 30 && !unlocked.includes('month_streak')) unlocked.push('month_streak');
    const totalSaved = goals.reduce((s, g) => s + (g.current_amount || 0), 0);
    if (totalSaved >= 500 && !unlocked.includes('saver_bronze')) unlocked.push('saver_bronze');
    if (totalSaved >= 2500 && !unlocked.includes('saver_silver')) unlocked.push('saver_silver');
    if (totalSaved >= 10000 && !unlocked.includes('saver_gold')) unlocked.push('saver_gold');
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

  const filteredAchievements = selectedCategory === 'all'
    ? ALL_ACHIEVEMENTS
    : ALL_ACHIEVEMENTS.filter(a => a.category === selectedCategory);

  const level = Math.floor(totalXP / 500) + 1;
  const levelName = levelNames[Math.min(level - 1, levelNames.length - 1)];
  const xpPerLevel = 500;
  const currentLevelXp = totalXP % xpPerLevel;

  return (
    <div className="space-y-6">
      {/* Level card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <Trophy className="h-8 w-8" />
              </div>
              <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-amber-600 font-bold text-sm">{level}</div>
            </div>
            <div>
              <p className="text-sm text-amber-100">Nível Atual</p>
              <p className="text-2xl font-bold">{levelName}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Zap className="h-5 w-5 text-yellow-300" />
              <span className="text-2xl font-bold">{totalXP}</span>
            </div>
            <p className="text-sm text-amber-100">XP Total</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-amber-100">Progresso para Nível {level + 1}</span>
            <span>{currentLevelXp}/{xpPerLevel} XP</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/20">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(currentLevelXp / xpPerLevel) * 100}%` }} transition={{ duration: 1 }}
              className="h-full rounded-full bg-white" />
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-6 pt-4 border-t border-white/20">
          <div className="text-center"><p className="text-2xl font-bold">{currentUnlocked.length}</p><p className="text-xs text-amber-100">Desbloqueadas</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{ALL_ACHIEVEMENTS.length - currentUnlocked.length}</p><p className="text-xs text-amber-100">Restantes</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{userProfile.streak_days || 0}</p><p className="text-xs text-amber-100">Dias Seguidos</p></div>
        </div>
      </motion.div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Achievements grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAchievements.map((achievement, index) => {
          const isUnlocked = currentUnlocked.includes(achievement.id);
          return (
            <motion.div key={achievement.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}
              className={`relative rounded-2xl p-4 ${isUnlocked ? 'bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm' : 'bg-white shadow-sm'}`}>
              {!isUnlocked && <div className="absolute top-2 right-2"><Lock className="h-4 w-4 text-slate-400" /></div>}
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-3 ${isUnlocked ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg' : 'bg-slate-200 grayscale opacity-50'}`}>
                {achievement.icon}
              </div>
              <h3 className={`font-bold text-sm ${isUnlocked ? 'text-slate-800' : 'text-slate-400'}`}>{achievement.title}</h3>
              <p className={`text-xs mt-1 ${isUnlocked ? 'text-slate-500' : 'text-slate-400'}`}>{achievement.description}</p>
              <div className={`mt-3 flex items-center gap-1 ${isUnlocked ? 'text-amber-600' : 'text-slate-400'}`}>
                <Star className={`h-3.5 w-3.5 ${isUnlocked ? 'fill-amber-400' : ''}`} />
                <span className="text-xs font-medium">{achievement.xp} XP</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
