import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, CheckCircle2, Star, Trophy, ChevronRight, Gamepad2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import confetti from 'canvas-confetti';
import { ALL_COURSES } from '../data/coursesData';
import { COURSES_CONTENT } from '../data/courseContent';
import { ALL_ACHIEVEMENTS } from './Achievements';
import { calculateTotalXP } from '../lib/xpUtils';

export default function CourseDetail() {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [mode, setMode] = useState('learn');
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id') || 'budgeting-basics';
  const initialMode = urlParams.get('mode') || 'learn';

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Get metadata from ALL_COURSES and content from COURSES_CONTENT
  const courseMeta = ALL_COURSES.find(c => c.id === courseId);
  const courseContent = COURSES_CONTENT[courseId];

  const course = courseMeta && courseContent
    ? { ...courseMeta, lessons: courseContent.lessons, quizQuestions: courseContent.quizQuestions }
    : null;

  const { data: progressList = [] } = useQuery({
    queryKey: ['courseProgress', user?.email],
    queryFn: () => user ? base44.entities.CourseProgress.filter({ created_by: user.email }) : [],
    enabled: !!user,
  });

  const { data: userProfiles = [] } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      if (profiles.length === 0) {
        const newProfile = await base44.entities.UserProfile.create({ total_xp: 0, current_level: 1, streak_days: 0 });
        return [newProfile];
      }
      return profiles;
    },
    enabled: !!user,
  });

  const progress = progressList.find(p => p.course_id === courseId);
  const userProfile = userProfiles[0];
  const completedLessons = progress?.lessons_completed || [];

  const createProgress = useMutation({
    mutationFn: (data) => base44.entities.CourseProgress.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courseProgress'] }),
  });

  const updateProgress = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CourseProgress.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courseProgress'] }),
  });

  const updateUserProfile = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserProfile.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
  });

  const currentLesson = course?.lessons[currentLessonIndex];

  const markLessonComplete = async () => {
    if (!currentLesson) return;
    const newCompleted = [...new Set([...completedLessons, currentLesson.id])];
    if (progress) {
      await updateProgress.mutateAsync({ id: progress.id, data: { lessons_completed: newCompleted } });
    } else {
      await createProgress.mutateAsync({
        course_id: courseId, level: courseMeta?.level || 1,
        lessons_completed: newCompleted, completed: false, xp_earned: 0,
      });
    }
  };

  const handleQuizSubmit = async () => {
    setQuizSubmitted(true);
    const questions = course.quizQuestions;
    const correctCount = questions.filter((q, i) => quizAnswers[i] === q.correct).length;
    const passed = correctCount >= questions.length * 0.7;

    if (passed && !progress?.completed) {
      const xpEarned = course.xp_reward;

      // Save course progress first
      let updatedProgressList = progressList;
      if (progress) {
        await updateProgress.mutateAsync({
          id: progress.id,
          data: { completed: true, xp_earned: xpEarned, quiz_scores: [...(progress.quiz_scores || []), correctCount] },
        });
        updatedProgressList = progressList.map(p =>
          p.course_id === courseId ? { ...p, completed: true, xp_earned: xpEarned } : p
        );
      } else {
        const newP = await createProgress.mutateAsync({
          course_id: courseId, level: courseMeta?.level || 1,
          lessons_completed: course.lessons.map(l => l.id),
          completed: true, xp_earned: xpEarned, quiz_scores: [correctCount],
        });
        updatedProgressList = [...progressList, { course_id: courseId, completed: true, xp_earned: xpEarned }];
      }

      // Recalculate total XP correctly
      if (userProfile) {
        const achievementRecords = await base44.entities.Achievement.filter({ created_by: userProfile.created_by || user?.email });
        const userGoal = userProfile.financial_goal || null;

        const newTotalXP = calculateTotalXP({
          achievements: achievementRecords,
          allAchievements: ALL_ACHIEVEMENTS,
          courseProgressList: updatedProgressList,
          allCourses: ALL_COURSES,
          financialGoal: userGoal,
        });

        const newLevel = Math.floor(newTotalXP / 500) + 1;
        await updateUserProfile.mutateAsync({
          id: userProfile.id,
          data: { total_xp: newTotalXP, current_level: newLevel },
        });
      }

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const goToNextLesson = () => {
    if (currentLessonIndex < course.lessons.length - 1) {
      markLessonComplete();
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-5">
        <p className="text-slate-500">Curso não encontrado</p>
        <Link to={createPageUrl('Courses')}>
          <Button variant="outline">Voltar aos Cursos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="flex items-center gap-4 px-5 py-4">
          <Link to={createPageUrl('Courses')} className="p-2 -ml-2 rounded-xl hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-800 truncate">{course.title}</h1>
            <p className="text-xs text-slate-500">{mode === 'learn' ? 'Modo Aprendizagem' : 'Modo Jogo'}</p>
          </div>
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="h-4 w-4 fill-amber-400" />
            <span className="font-bold text-sm">{course.xp_reward} XP</span>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="px-5 pb-4">
          <div className="flex gap-2 p-1 rounded-xl bg-slate-100">
            <button
              onClick={() => { setMode('learn'); setQuizSubmitted(false); setQuizAnswers({}); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all ${mode === 'learn' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
            >
              <BookOpen className="h-4 w-4" />
              Aprender
            </button>
            <button
              onClick={() => { setMode('quiz'); setCurrentLessonIndex(0); setCurrentQuestionIndex(0); setQuizAnswers({}); setQuizSubmitted(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all ${mode === 'quiz' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
            >
              <Gamepad2 className="h-4 w-4" />
              Jogar
            </button>
          </div>
        </div>
      </div>

      {mode === 'learn' ? (
        <>
          {/* Lesson Selector */}
          <div className="px-5 py-4 overflow-x-auto">
            <div className="flex gap-2">
              {course.lessons.map((lesson, index) => {
                const isCompleted = completedLessons.includes(lesson.id);
                const isCurrent = index === currentLessonIndex;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setCurrentLessonIndex(index)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      isCurrent ? 'bg-blue-700 text-white' :
                      isCompleted ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <span className="font-bold">{index + 1}</span>}
                    <span className="hidden sm:inline">{lesson.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lesson Content */}
          <div className="px-5 py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentLesson?.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
              >
                <h2 className="text-xl font-bold text-slate-800 mb-4">{currentLesson?.title}</h2>
                <div className="prose prose-slate max-w-none">
                  {currentLesson?.content?.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-3 text-slate-600 whitespace-pre-line leading-relaxed">
                      {paragraph.split('**').map((part, j) =>
                        j % 2 === 1 ? <strong key={j} className="text-slate-800">{part}</strong> : part
                      )}
                    </p>
                  ))}
                </div>

                <div className="mt-6 flex gap-3">
                  {currentLessonIndex < course.lessons.length - 1 ? (
                    <Button onClick={goToNextLesson} className="flex-1 h-12 bg-blue-700 hover:bg-blue-800">
                      Próxima Lição <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => { markLessonComplete(); setMode('quiz'); }}
                      className="flex-1 h-12 bg-blue-700 hover:bg-blue-800"
                    >
                      <Gamepad2 className="mr-2 h-4 w-4" /> Fazer Quiz (+{course.xp_reward} XP)
                    </Button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      ) : (
        /* Quiz Mode — one question at a time */
        <div className="px-5 py-4">
          {!quizSubmitted ? (() => {
            const q = course.quizQuestions[currentQuestionIndex];
            const total = course.quizQuestions.length;
            const answered = quizAnswers[currentQuestionIndex] !== undefined;
            const isLast = currentQuestionIndex === total - 1;

            return (
              <AnimatePresence mode="wait">
                <motion.div key={currentQuestionIndex}
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                  className="space-y-4">

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>Pergunta {currentQuestionIndex + 1} de {total}</span>
                      <span>{Math.round(((currentQuestionIndex) / total) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-700 rounded-full transition-all duration-500"
                        style={{ width: `${((currentQuestionIndex) / total) * 100}%` }} />
                    </div>
                  </div>

                  {/* Question card */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <p className="font-semibold text-slate-800 text-base mb-5">{q.question}</p>
                    <div className="space-y-3">
                      {q.options.map((option, oIndex) => {
                        const isSelected = quizAnswers[currentQuestionIndex] === oIndex;
                        return (
                          <button key={oIndex} onClick={() => setQuizAnswers({ ...quizAnswers, [currentQuestionIndex]: oIndex })}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium text-sm
                              ${isSelected ? 'bg-blue-50 border-blue-500 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex gap-3">
                      {currentQuestionIndex > 0 && (
                        <Button variant="outline" onClick={() => setCurrentQuestionIndex(i => i - 1)} className="h-12 px-5 rounded-xl">
                          ← Anterior
                        </Button>
                      )}
                      {!isLast ? (
                        <Button onClick={() => setCurrentQuestionIndex(i => i + 1)} disabled={!answered}
                          className="flex-1 h-12 bg-blue-700 hover:bg-blue-800 rounded-xl">
                          Próxima <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button onClick={handleQuizSubmit}
                          disabled={Object.keys(quizAnswers).length < total}
                          className="flex-1 h-12 bg-blue-700 hover:bg-blue-800 rounded-xl">
                          Submeter Respostas
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            );
          })() : (
            /* Results */
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-4">
              {(() => {
                const score = course.quizQuestions.filter((q, i) => quizAnswers[i] === q.correct).length;
                const passed = score >= course.quizQuestions.length * 0.7;
                return (
                  <>
                    <div className={`p-6 rounded-2xl text-center ${passed ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-amber-50 border-2 border-amber-200'}`}>
                      <p className={`font-bold text-2xl mb-1 ${passed ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {passed ? '🎉 Parabéns!' : '📚 Continua a aprender!'}
                      </p>
                      <p className={`text-sm ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                        Acertaste {score} de {course.quizQuestions.length}
                      </p>
                      {passed && !progress?.completed && (
                        <p className="text-emerald-600 font-semibold mt-2">+{course.xp_reward} XP ganhos!</p>
                      )}
                    </div>

                    {/* Question review */}
                    <div className="space-y-3">
                      {course.quizQuestions.map((q, i) => {
                        const correct = quizAnswers[i] === q.correct;
                        return (
                          <div key={i} className={`p-4 rounded-2xl border-2 ${correct ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                            <p className="text-sm font-semibold text-slate-800 mb-1">{i + 1}. {q.question}</p>
                            <p className={`text-xs ${correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {correct ? '✓ Correto' : `✗ Errado — Resposta certa: ${q.options[q.correct]}`}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <Link to={createPageUrl('Courses')}>
                      <Button className="w-full h-12 bg-blue-700 hover:bg-blue-800 rounded-xl">
                        <Trophy className="mr-2 h-4 w-4" />
                        Voltar aos Cursos
                      </Button>
                    </Link>
                  </>
                );
              })()}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}