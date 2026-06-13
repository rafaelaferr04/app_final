import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Trophy, Gamepad2, Sparkles, Settings2, Lock, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ALL_COURSES, getCoursesForGoal, GOAL_LABELS, GOAL_ICONS } from '../data/coursesData';

const LEVEL_META = {
  1: { label: 'Principiante', color: 'text-green-700',  bg: 'bg-green-100',  dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700' },
  2: { label: 'Intermédio',   color: 'text-blue-700',   bg: 'bg-blue-100',   dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700' },
  3: { label: 'Avançado',     color: 'text-purple-700', bg: 'bg-purple-100', dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
};

function CourseCard({ course, unlocked, progress }) {
  const meta = LEVEL_META[course.level];
  const lessonsCompleted = progress?.lessons_completed?.length || 0;
  const progressPct = course.lessons.length > 0 ? (lessonsCompleted / course.lessons.length) * 100 : 0;
  const completed = !!progress?.completed;

  return (
    <div className={`relative rounded-2xl bg-white p-3 sm:p-4 shadow-sm border border-slate-100 flex flex-col gap-2 ${!unlocked ? 'opacity-60' : ''}`}>

      {/* Lock overlay */}
      {!unlocked && (
        <div className="absolute inset-0 rounded-2xl bg-white/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-1 p-3 text-center">
          <Lock className="h-5 w-5 text-slate-400" />
          <p className="text-sm text-slate-500">Completa o nível {course.level - 1}</p>
        </div>
      )}

      {/* Icon + title */}
      <div className="flex items-start gap-2.5">
        <div className="text-2xl sm:text-3xl shrink-0 mt-0.5">{course.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">{course.title}</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 line-clamp-2">{course.description}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500">
        <span className="flex items-center gap-0.5">
          <BookOpen className="h-3 w-3 shrink-0" />
          {course.lessons.length}
        </span>
        <span className="flex items-center gap-0.5">
          <Gamepad2 className="h-3 w-3 shrink-0" />
          {course.quizQuestions}
        </span>
        <span className="flex items-center gap-0.5 text-amber-600 font-medium ml-auto">
          <Trophy className="h-3 w-3 shrink-0" />
          {course.xp_reward} XP
        </span>
      </div>

      {/* Progress bar (in progress) */}
      {progress && !completed && (
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-0.5">
            <span>{lessonsCompleted}/{course.lessons.length} lições</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-800 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed badge */}
      {completed && (
        <div className="flex items-center gap-1.5 text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span className="text-sm font-medium">Completo · +{course.xp_reward} XP</span>
        </div>
      )}

      {/* Action buttons */}
      {unlocked && (
        <div className="flex gap-1.5 mt-auto pt-1">
          <Link
            to={createPageUrl(`CourseDetail?id=${course.id}&mode=learn`)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-medium text-slate-700 transition-colors text-xs sm:text-sm"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            Aprender
          </Link>
          <Link
            to={createPageUrl(`CourseDetail?id=${course.id}&mode=quiz`)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 font-medium text-white transition-colors text-xs sm:text-sm"
          >
            <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
            Jogar (+XP)
          </Link>
        </div>
      )}
    </div>
  );
}

export default function Courses() {
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: progressList = [] } = useQuery({
    queryKey: ['courseProgress', user?.email],
    queryFn: () => user ? base44.entities.CourseProgress.filter({ created_by: user.email }) : [],
    enabled: !!user,
  });

  const { data: userProfiles = [] } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: () => user ? base44.entities.UserProfile.filter({ created_by: user.email }) : [],
    enabled: !!user,
  });

  const userGoal     = userProfiles[0]?.financial_goal || null;
  const courses      = userGoal ? getCoursesForGoal(userGoal) : ALL_COURSES;
  const progressMap  = progressList.reduce((map, p) => { map[p.course_id] = p; return map; }, {});

  const isCourseUnlocked = (course) => {
    if (course.level === 1) return true;
    return courses.filter(c => c.level === course.level - 1).every(pc => progressMap[pc.id]?.completed);
  };

  const totalXP         = progressList.reduce((s, p) => s + (p.xp_earned || 0), 0);
  const completedCount  = progressList.filter(p => p.completed).length;
  const levelCounts     = [1, 2, 3].map(level => ({
    level,
    total:     courses.filter(c => c.level === level).length,
    completed: courses.filter(c => c.level === level && progressMap[c.id]?.completed).length,
  }));

  if (!userGoal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-8 text-white text-center shadow-xl">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-white/20 p-4"><Sparkles className="h-10 w-10" /></div>
          </div>
          <h2 className="text-xl font-bold mb-2">Define o teu objetivo financeiro</h2>
          <p className="text-amber-100 mb-6">Escolhe um objetivo nas Definições para receberes um caminho personalizado.</p>
          <Link to={createPageUrl('Settings')}
            className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-6 py-3 rounded-xl hover:bg-amber-50 transition-colors">
            <Settings2 className="h-5 w-5" />
            Ir para Definições
          </Link>
        </motion.div>
      </div>
    );
  }

  /* Levels to show based on filter */
  const levelsToRender = selectedLevel === 'all'
    ? [1, 2, 3]
    : [parseInt(selectedLevel)];

  return (
    <div className="space-y-5">

      {/* Hero banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-gradient-to-br from-violet-700 via-blue-800 to-blue-900 px-5 py-5 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute top-3 right-16 w-16 h-16 bg-white/5 rounded-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-2xl backdrop-blur-sm shrink-0">
                  {GOAL_ICONS[userGoal]}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-widest mb-0.5">Aprender</p>
                  <p className="text-base sm:text-lg font-bold text-white truncate">{GOAL_LABELS[userGoal]}</p>
                  <p className="text-[11px] text-blue-200 mt-0.5">{courses.length} cursos · {completedCount} completos</p>
                </div>
              </div>
              <div className="bg-yellow-400/20 rounded-xl px-3 py-2 text-center shrink-0 backdrop-blur-sm">
                <div className="flex items-center gap-1 justify-center">
                  <Trophy className="h-3.5 w-3.5 text-yellow-300" />
                  <span className="text-base font-bold text-white">{totalXP}</span>
                </div>
                <p className="text-[10px] text-yellow-200">XP total</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {levelCounts.map(({ level, total, completed }) => (
                <div key={level} className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                  <p className="text-[10px] text-blue-200 mb-1">Nível {level}</p>
                  <p className="text-white text-sm font-bold mb-1.5">{completed}<span className="text-blue-300 font-normal">/{total}</span></p>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/70 rounded-full transition-all duration-700"
                      style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Level filter tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {['all', '1', '2', '3'].map((level) => (
          <button key={level} onClick={() => setSelectedLevel(level)}
            className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              selectedLevel === level ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {level === 'all' ? 'Todos' : `Nível ${level}`}
          </button>
        ))}
      </div>

      {/* Course sections by level */}
      <div className="space-y-6">
        {levelsToRender.map(level => {
          const levelCourses = courses.filter(c => c.level === level);
          if (levelCourses.length === 0) return null;
          const meta   = LEVEL_META[level];
          const lCount = levelCounts.find(l => l.level === level);

          return (
            <div key={level}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
                <h2 className="font-bold text-slate-800 text-sm sm:text-base">
                  Nível {level} — {meta.label}
                </h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.badge}`}>
                  {lCount?.completed}/{lCount?.total}
                </span>
              </div>

              {/* Grid of course cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {levelCourses.map((course, idx) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <CourseCard
                      course={course}
                      unlocked={isCourseUnlocked(course)}
                      progress={progressMap[course.id]}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
