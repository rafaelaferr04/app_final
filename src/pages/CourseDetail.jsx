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
              onClick={() => { setMode('quiz'); setCurrentLessonIndex(0); }}
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
        /* Quiz Mode */
        <div className="px-5 py-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-700 flex items-center justify-center">
                <Gamepad2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Quiz: {course.title}</h2>
                <p className="text-sm text-slate-500">{course.quizQuestions.length} questões · {course.xp_reward} XP</p>
              </div>
            </div>

            <div className="space-y-6">
              {course.quizQuestions.map((q, qIndex) => (
                <div key={qIndex} className="space-y-3">
                  <p className="font-medium text-slate-800">{qIndex + 1}. {q.question}</p>
                  <RadioGroup
                    value={quizAnswers[qIndex]?.toString()}
                    onValueChange={(value) => setQuizAnswers({ ...quizAnswers, [qIndex]: parseInt(value) })}
                    disabled={quizSubmitted}
                  >
                    {q.options.map((option, oIndex) => {
                      const isSelected = quizAnswers[qIndex] === oIndex;
                      const isCorrect = oIndex === q.correct;
                      let cls = `quiz-option flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer `;
                      if (quizSubmitted) {
                        cls += 'quiz-submitted ';
                        if (isCorrect) cls += 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300';
                        else if (isSelected) cls += 'bg-rose-100 border-rose-400';
                        else cls += 'bg-slate-50 border-slate-200 opacity-60';
                      } else if (isSelected) {
                        cls += 'bg-blue-100 border-blue-400 ring-2 ring-blue-300 shadow-md';
                      } else {
                        cls += 'bg-slate-50 border-slate-200';
                      }
                      return (
                        <div
                          key={oIndex}
                          className={cls}
                          onClick={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [qIndex]: oIndex })}
                        >
                          <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} className="pointer-events-none" />
                          <Label htmlFor={`q${qIndex}-o${oIndex}`} className="flex-1 cursor-pointer font-medium text-slate-700 select-none pointer-events-none">
                            {option}
                          </Label>
                          {quizSubmitted && isCorrect && <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />}
                          {quizSubmitted && isSelected && !isCorrect && <span className="text-lg shrink-0">❌</span>}
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              ))}

              {!quizSubmitted ? (
                <Button
                  onClick={handleQuizSubmit}
                  disabled={Object.keys(quizAnswers).length < course.quizQuestions.length}
                  className="w-full h-12 bg-blue-700 hover:bg-blue-800"
                >
                  Submeter Respostas
                </Button>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const score = course.quizQuestions.filter((q, i) => quizAnswers[i] === q.correct).length;
                    const passed = score >= course.quizQuestions.length * 0.7;
                    return (
                      <>
                        <div className={`p-4 rounded-xl text-center ${passed ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                          <p className={`font-bold text-lg ${passed ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {passed ? '🎉 Parabéns!' : '📚 Continua a aprender!'}
                          </p>
                          <p className={`text-sm ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                            Acertaste {score}/{course.quizQuestions.length}
                          </p>
                          {passed && !progress?.completed && (
                            <p className="text-emerald-600 font-medium mt-2">+{course.xp_reward} XP ganhos!</p>
                          )}
                        </div>
                        <Link to={createPageUrl('Courses')}>
                          <Button className="w-full h-12 bg-blue-700 hover:bg-blue-800">
                            <Trophy className="mr-2 h-4 w-4" />
                            Voltar aos Cursos
                          </Button>
                        </Link>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}