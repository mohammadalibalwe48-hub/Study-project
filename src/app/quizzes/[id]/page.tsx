'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { MathText } from '@/components/FormulaRenderer';
import { awardXP, updateStreak, checkAndUnlockBadges, Badge } from '@/utils/xpHelper';
import { AlertTriangle, FileText, Sparkles, Lightbulb, RotateCcw, Bookmark, Check, X, Clock } from 'lucide-react';

interface Quiz {
  id: number;
  title: string;
  description: string;
  subject_id: number;
  time_limit?: number;
  is_official?: boolean;
  exam_year?: number;
}

interface Question {
  id: number;
  quiz_id: number;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
}

interface QuizResult {
  id: number;
  score: number;
  total_questions: number;
  completed_at: string;
}

interface ConfettiPiece {
  id: number;
  color: string;
  left: number;
  delay: number;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function QuizPlayPage({ params }: PageProps) {
  const { id: quizId } = use(params);
  const { user, profile, loading, signOut } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [previousAttempts, setPreviousAttempts] = useState<QuizResult[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  const [phase, setPhase] = useState<'start' | 'running' | 'results'>('start');
  const [mode, setMode] = useState<'exam' | 'practice'>('practice');

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState(1800);
  const [timeSpent, setTimeSpent] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const [score, setScore] = useState(0);
  const [savingResult, setSavingResult] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<Badge[]>([]);
  const [timeoutSubmitted, setTimeoutSubmitted] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);

  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect' | 'flagged'>('all');

  const router = useRouter();

  const handleSelectOption = useCallback((optIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIdx]: optIdx,
    }));
  }, [currentIdx]);

  const handleToggleFlag = useCallback(() => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentIdx]: !prev[currentIdx],
    }));
  }, [currentIdx]);

  const handleNext = useCallback(() => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  }, [currentIdx, questions.length]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  }, [currentIdx]);

  const calculateScore = useCallback(() => {
    let s = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct_option_index) {
        s++;
      }
    });
    return s;
  }, [questions, selectedAnswers]);

  const executeFinish = useCallback(async (isTimeout = false) => {
    setTimerActive(false);
    const finalScore = calculateScore();
    setScore(finalScore);
    setTimeoutSubmitted(isTimeout);

    if (user) {
      setSavingResult(true);
      try {
        const { error } = await supabase.from('quiz_results').insert({
          user_id: user.id,
          quiz_id: Number(quizId),
          score: finalScore,
          total_questions: questions.length,
        });

        if (error) throw error;
        setSaveSuccess(true);

        const gained = 50 + finalScore * 10;
        setXpGained(gained);

        await awardXP(user.id, gained);
        await updateStreak(user.id);
        const unlocked = await checkAndUnlockBadges(user.id);
        setNewlyUnlockedBadges(unlocked);
      } catch (err) {
        console.error('Error saving quiz result:', err);
      } finally {
        setSavingResult(false);
      }
    }

    setPhase('results');

    if ((finalScore / questions.length) >= 0.5) {
      const colors = ['#38bdf8', '#fbbf24', '#34d399', '#f472b6', '#a78bfa'];
      const pieces: ConfettiPiece[] = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        left: Math.random() * 100,
        delay: Math.random() * 2,
      }));
      setConfettiPieces(pieces);
    }
  }, [calculateScore, quizId, questions.length, user]);

  const triggerAutoSubmit = useCallback(() => {
    executeFinish(true);
  }, [executeFinish]);

  const handleStartQuiz = () => {
    const limitMinutes = quiz?.time_limit || 30;
    setTimeRemaining(limitMinutes * 60);
    setTimeSpent(0);
    setCurrentIdx(0);
    setSelectedAnswers({});
    setFlaggedQuestions({});
    setTimerActive(true);
    setPhase('running');
  };

  const handleFinish = () => {
    if (Object.keys(selectedAnswers).length < questions.length) {
      if (!confirm('لم تقم بالإجابة على جميع الأسئلة بعد. هل أنت متأكد من إنهاء وتسليم الاختبار؟')) {
        return;
      }
    }
    executeFinish(false);
  };

  const handleExit = () => {
    if (confirm('هل أنت متأكد من الخروج من الاختبار الحالي؟ لن يتم حفظ تقدمك.')) {
      setTimerActive(false);
      setPhase('start');
    }
  };

  const handleRetake = () => {
    setPhase('start');
  };

  useEffect(() => {
    async function fetchQuizData() {
      try {
        setDbLoading(true);
        const { data: qData, error: qErr } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();
        if (qErr) throw qErr;
        setQuiz(qData);

        const { data: qList, error: listErr } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('id', { ascending: true });
        if (listErr) throw listErr;
        setQuestions(qList || []);

        if (user) {
          const { data: attData, error: attErr } = await supabase
            .from('quiz_results')
            .select('id, score, total_questions, completed_at')
            .eq('user_id', user.id)
            .eq('quiz_id', quizId)
            .order('completed_at', { ascending: false });
          if (!attErr) {
            setPreviousAttempts(attData || []);
          }
        }
      } catch (err) {
        console.error('Error fetching quiz details:', err);
      } finally {
        setDbLoading(false);
      }
    }

    fetchQuizData();
  }, [user, quizId]);

  useEffect(() => {
    if (phase !== 'running') return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'هل أنت متأكد من مغادرة الصفحة؟';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running' || !timerActive) return;

    const interval = setInterval(() => {
      if (mode === 'exam') {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            triggerAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      } else {
        setTimeSpent((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, timerActive, mode, triggerAutoSubmit]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || dbLoading) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="p-8">
          <DashboardSkeleton />
        </div>
      </SidebarLayout>
    );
  }

  if (!quiz) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="flex-1 flex flex-col justify-center items-center py-20 px-6 text-center text-foreground">
          <div className="p-4 bg-rose-500/10 rounded-full mb-6 text-rose-400"><AlertTriangle className="w-12 h-12" /></div>
          <h2 className="text-3xl font-display font-normal">الاختبار غير موجود</h2>
          <p className="text-muted-foreground text-xs mt-2">الرجاء العودة إلى صفحة المادة.</p>
          <Link
            href="/dashboard"
            className="mt-6 liquid-glass-glow rounded-full px-8 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40"
          >
            العودة للرئيسية
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  if (questions.length === 0) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="flex-1 flex flex-col justify-center items-center py-20 px-6 text-center space-y-4 max-w-xl mx-auto text-foreground">
          <FileText className="w-12 h-12 text-cyan-400" />
          <h2 className="text-3xl font-display font-normal">لا توجد أسئلة مضافة بعد</h2>
          <p className="text-muted-foreground text-xs">
            لم يتم إضافة أسئلة لهذا الاختبار بعد.
          </p>
          <Link
            href={`/subjects/${quiz.subject_id}`}
            className="liquid-glass-glow rounded-full px-8 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40"
          >
            الرجوع للمادة
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  if (phase === 'start') {
    const highestScoreAttempt = previousAttempts.length > 0 
      ? [...previousAttempts].sort((a, b) => b.score - a.score)[0] 
      : null;

    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="flex-1 flex flex-col gap-8 p-6 lg:p-8 max-w-5xl mx-auto w-full text-right" dir="rtl">
          
          <div className="flex items-center justify-between w-full border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">لوحة التحكم</Link>
              <span>/</span>
              <Link href={`/subjects/${quiz.subject_id}`} className="hover:text-foreground transition-colors">المادة</Link>
              <span>/</span>
              <span className="text-foreground font-medium">{quiz.title}</span>
            </div>
            <Link
              href={`/subjects/${quiz.subject_id}`}
              className="liquid-glass rounded-full px-5 py-2 text-xs text-foreground hover:scale-105 transition-transform"
            >
              ← الرجوع للمادة
            </Link>
          </div>

          <div className="liquid-glass-glow rounded-3xl p-8 border border-white/20 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3.5 py-1 rounded-full inline-block font-medium">
                {quiz.is_official ? `دورة وزارية رسمية ${quiz.exam_year || ''}` : 'اختبار مراجعة دراسي'}
              </span>
              <h2 className="text-4xl sm:text-5xl font-display font-normal text-foreground mt-4">{quiz.title}</h2>
              <p className="text-muted-foreground text-sm mt-3 leading-relaxed max-w-2xl">
                {quiz.description || 'قيّم مستوى فهمك واستعد للاختبارات النهائية من خلال حل الأسئلة المتاحة.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="liquid-glass rounded-2xl p-6 flex items-center gap-4 border border-white/10">
              <FileText className="w-8 h-8 text-cyan-400 shrink-0" />
              <div>
                <h4 className="text-xs text-muted-foreground">عدد الأسئلة</h4>
                <p className="text-2xl font-display text-foreground">{questions.length} أسئلة</p>
              </div>
            </div>
            <div className="liquid-glass rounded-2xl p-6 flex items-center gap-4 border border-white/10">
              <Clock className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-xs text-muted-foreground">الوقت المتاح</h4>
                <p className="text-2xl font-display text-foreground">{quiz.time_limit || 30} دقيقة</p>
              </div>
            </div>
            <div className="liquid-glass rounded-2xl p-6 flex items-center gap-4 border border-white/10">
              <Sparkles className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-xs text-muted-foreground">النقاط المتاحة</h4>
                <p className="text-2xl font-display text-emerald-400">+{50 + questions.length * 10} XP</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-display font-normal text-foreground">اختر وضع الدراسة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setMode('practice')}
                className={`text-right rounded-3xl p-6 border flex flex-col justify-between h-full transition-all cursor-pointer ${
                  mode === 'practice'
                    ? 'liquid-glass-glow border-cyan-400/50 scale-[1.02]'
                    : 'liquid-glass border-white/10'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Lightbulb className="w-6 h-6 text-amber-400" />
                    <span className={`text-[11px] font-medium px-3 py-1 rounded-full ${
                      mode === 'practice' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'bg-white/5 text-muted-foreground'
                    }`}>
                      وضع التدريب
                    </span>
                  </div>
                  <h4 className="text-xl font-display text-foreground mt-3">التدريب الحر (بدون وقت)</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    حل الأسئلة دون قلق من الوقت. احصل على تقييم وتفسير فوري لكل سؤال مع شرح مباشر.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setMode('exam')}
                className={`text-right rounded-3xl p-6 border flex flex-col justify-between h-full transition-all cursor-pointer ${
                  mode === 'exam'
                    ? 'liquid-glass-glow border-cyan-400/50 scale-[1.02]'
                    : 'liquid-glass border-white/10'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">⏱️</span>
                    <span className={`text-[11px] font-medium px-3 py-1 rounded-full ${
                      mode === 'exam' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'bg-white/5 text-muted-foreground'
                    }`}>
                      وضع الاختبار
                    </span>
                  </div>
                  <h4 className="text-xl font-display text-foreground mt-3">محاكاة الامتحان الوزاري</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    اختبار حقيقي بوقت تنازلي. تُحجب الإجابات للشروحات حتى إنهاء الاختبار وتسليمه.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={handleStartQuiz}
              className="liquid-glass-glow rounded-full px-12 py-4 text-sm font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer"
            >
              ابدأ الاختبار الآن ←
            </button>
          </div>

          {previousAttempts.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-white/10">
              <h3 className="text-2xl font-display font-normal text-foreground">محاولاتك السابقة</h3>
              <div className="liquid-glass rounded-3xl overflow-hidden border border-white/10">
                {highestScoreAttempt && (
                  <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">أفضل نتيجة لك:</span>
                    <span className="font-bold text-emerald-400">
                      {highestScoreAttempt.score} / {highestScoreAttempt.total_questions} ({Math.round((highestScoreAttempt.score / highestScoreAttempt.total_questions) * 100)}%)
                    </span>
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto divide-y divide-white/5 text-xs">
                  {previousAttempts.map((attempt, index) => {
                    const pct = Math.round((attempt.score / attempt.total_questions) * 100);
                    return (
                      <div key={attempt.id} className="p-4 flex items-center justify-between">
                        <span className="text-muted-foreground">المحاولة {previousAttempts.length - index}</span>
                        <span className="font-medium text-foreground">{attempt.score} / {attempt.total_questions} ({pct}%)</span>
                        <span className="text-muted-foreground">
                          {new Date(attempt.completed_at).toLocaleDateString('ar-SY')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </SidebarLayout>
    );
  }

  if (phase === 'running') {
    const currentQuestion = questions[currentIdx];
    const selectedOptIdx = selectedAnswers[currentIdx];
    const totalQuestions = questions.length;
    const progressPercent = Math.round(((currentIdx + 1) / totalQuestions) * 100);
    const isQuestionAnswered = selectedOptIdx !== undefined;
    const isQuestionFlagged = flaggedQuestions[currentIdx] === true;
    const isTimerUrgent = mode === 'exam' && timeRemaining < 300;

    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 h-full w-full text-right" dir="rtl">
          
          <section className="w-full lg:w-80 shrink-0 liquid-glass-glow rounded-3xl p-5 flex flex-col gap-6 border border-white/15 h-fit overflow-y-auto">
            <div className="border-b border-white/10 pb-3">
              <h4 className="font-display font-normal text-foreground text-xl">خريطة الأسئلة</h4>
              <p className="text-[11px] text-muted-foreground mt-1">تنقّل بسرعة بين الأسئلة</p>
            </div>

            <div className="grid grid-cols-5 gap-2.5 max-h-72 lg:max-h-none overflow-y-auto p-1">
              {questions.map((_, idx) => {
                const isCurrent = idx === currentIdx;
                const isAnswered = selectedAnswers[idx] !== undefined;
                const isFlagged = flaggedQuestions[idx] === true;

                let btnStyle = 'liquid-glass text-muted-foreground border-white/10';
                
                if (isCurrent) {
                  btnStyle = 'liquid-glass-glow text-foreground border-cyan-400/50 scale-105';
                } else if (isFlagged) {
                  btnStyle = 'bg-amber-400/20 text-amber-300 border-amber-400/30';
                } else if (isAnswered) {
                  btnStyle = 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 w-9 flex items-center justify-center font-display font-bold text-xs rounded-xl transition-all cursor-pointer ${btnStyle}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex-1 liquid-glass-glow rounded-3xl p-6 flex flex-col gap-6 border border-white/15 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 w-full">
              <div className="flex flex-col">
                <h3 className="font-display font-normal text-foreground text-2xl truncate">{quiz.title}</h3>
                <span className="text-[11px] text-muted-foreground mt-1">
                  سؤال {currentIdx + 1} من {totalQuestions}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xs font-bold border ${
                  isTimerUrgent ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' : 'liquid-glass text-foreground border-white/10'
                }`}>
                  <span>⏱️</span>
                  <span>{mode === 'exam' ? formatTime(timeRemaining) : formatTime(timeSpent)}</span>
                </div>

                <button
                  onClick={handleExit}
                  className="liquid-glass rounded-full border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 px-4 py-2 text-xs font-medium cursor-pointer"
                >
                  إنهاء وإلغاء
                </button>
              </div>
            </div>

            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
              <div
                className="bg-cyan-400 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full">
                  السؤال {currentIdx + 1}
                </span>
                <button
                  onClick={handleToggleFlag}
                  className={`text-xs font-medium px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isQuestionFlagged
                      ? 'bg-amber-400/20 border-amber-400/30 text-amber-300'
                      : 'liquid-glass border-white/10 text-muted-foreground'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isQuestionFlagged ? 'fill-amber-300 text-amber-300' : ''}`} />
                  {isQuestionFlagged ? 'مؤشر للمراجعة' : 'تأشير للمراجعة'}
                </button>
              </div>
              
              <div className="text-2xl sm:text-3xl font-display font-normal text-foreground leading-relaxed">
                <MathText text={currentQuestion.question_text} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              {currentQuestion.options.map((option, optIdx) => {
                const isSelected = selectedOptIdx === optIdx;
                const isCorrectOpt = currentQuestion.correct_option_index === optIdx;
                
                let optStyle = 'liquid-glass border-white/10 hover:border-white/30 text-foreground';

                if (mode === 'exam') {
                  if (isSelected) {
                    optStyle = 'liquid-glass-glow border-cyan-400/50 text-cyan-200';
                  }
                } else {
                  if (isQuestionAnswered) {
                    if (isCorrectOpt) {
                      optStyle = 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300';
                    } else if (isSelected) {
                      optStyle = 'bg-rose-500/15 border-rose-500/40 text-rose-300';
                    } else {
                      optStyle = 'liquid-glass opacity-50 border-white/5';
                    }
                  } else {
                    if (isSelected) {
                      optStyle = 'liquid-glass-glow border-cyan-400/50 text-cyan-200';
                    }
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => {
                      if (mode === 'exam' || !isQuestionAnswered) {
                        handleSelectOption(optIdx);
                      }
                    }}
                    disabled={mode === 'practice' && isQuestionAnswered}
                    className={`flex items-center text-right w-full p-4 rounded-2xl border transition-all text-sm cursor-pointer ${optStyle}`}
                  >
                    <span className="h-7 w-7 rounded-full flex items-center justify-center font-display font-bold text-xs bg-white/10 text-foreground ml-3 shrink-0">
                      {optIdx === 0 ? 'أ' : optIdx === 1 ? 'ب' : optIdx === 2 ? 'ج' : 'د'}
                    </span>
                    <MathText text={option} className="flex-1" />
                  </button>
                );
              })}
            </div>

            {mode === 'practice' && isQuestionAnswered && (
              <div className="liquid-glass rounded-2xl p-5 border border-white/10 text-right space-y-2">
                <p className={`text-xs font-bold flex items-center gap-1.5 ${selectedOptIdx === currentQuestion.correct_option_index ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedOptIdx === currentQuestion.correct_option_index ? (
                    <><Check className="w-4 h-4 text-emerald-400" /> إجابة صحيحة!</>
                  ) : (
                    <><X className="w-4 h-4 text-rose-400" /> إجابة خاطئة.</>
                  )}
                </p>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {currentQuestion.explanation ? (
                    <MathText text={currentQuestion.explanation} />
                  ) : (
                    <span>الخيار الصحيح هو الخيار ({currentQuestion.correct_option_index === 0 ? 'أ' : currentQuestion.correct_option_index === 1 ? 'ب' : currentQuestion.correct_option_index === 2 ? 'ج' : 'د'}).</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-auto">
              <button
                onClick={handlePrev}
                disabled={currentIdx === 0}
                className="liquid-glass rounded-full px-6 py-2.5 text-xs text-foreground font-medium disabled:opacity-40 cursor-pointer"
              >
                ← السابق
              </button>

              {currentIdx === totalQuestions - 1 ? (
                <button
                  onClick={handleFinish}
                  disabled={savingResult}
                  className="liquid-glass-glow rounded-full px-8 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-emerald-400/40 cursor-pointer flex items-center gap-1.5"
                >
                  {savingResult ? 'جاري التسليم...' : <>تسليم الاختبار <Check className="w-3.5 h-3.5 text-emerald-400" /></>}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="liquid-glass-glow rounded-full px-8 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer"
                >
                  التالي →
                </button>
              )}
            </div>
          </section>

        </div>
      </SidebarLayout>
    );
  }

  if (phase === 'results') {
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 50;

    const filteredQuestionsWithIndex = questions.map((q, idx) => ({ q, idx })).filter(({ q, idx }) => {
      const studentAnsIdx = selectedAnswers[idx];
      const isCorrect = studentAnsIdx === q.correct_option_index;
      const isFlagged = flaggedQuestions[idx] === true;

      if (reviewFilter === 'correct') return isCorrect && studentAnsIdx !== undefined;
      if (reviewFilter === 'incorrect') return !isCorrect || studentAnsIdx === undefined;
      if (reviewFilter === 'flagged') return isFlagged;
      return true;
    });

    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="flex-1 flex flex-col gap-8 p-6 lg:p-8 max-w-5xl mx-auto w-full text-right" dir="rtl">
          
          <div className="flex items-center justify-between w-full border-b border-white/10 pb-4">
            <h1 className="font-display font-normal text-foreground text-3xl">نتائج التقييم والحل</h1>
            <Link
              href={`/subjects/${quiz.subject_id}`}
              className="liquid-glass rounded-full px-6 py-2 text-xs text-foreground hover:scale-105 transition-transform"
            >
              ← العودة للمادة
            </Link>
          </div>

          <div className="liquid-glass-glow rounded-3xl p-8 border border-white/15 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-right">
              <h2 className="text-4xl font-display font-normal text-foreground">النتيجة النهائية للمقرر</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {passed 
                  ? 'أداء رائع ومميز! لقد اجتزت هذا الاختبار بنجاح.' 
                  : 'أداء بحاجة لبعض التحسين. واصل المراجعة وستحقق علامات أفضل!'}
              </p>
              
              {saveSuccess && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {xpGained > 0 && (
                    <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> حصلت على +{xpGained} XP!
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center p-6 liquid-glass rounded-3xl border border-white/15 w-44 h-44 shrink-0">
              <span className="text-3xl font-display text-foreground">
                {score} / {questions.length}
              </span>
              <span className="text-[11px] text-muted-foreground mt-1">إجابة صحيحة</span>
              <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-1 rounded-full font-medium mt-3">
                النسبة: {percentage}%
              </span>
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
              <h3 className="text-2xl font-display font-normal text-foreground">تفاصيل ومراجعة الإجابات</h3>
              
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'all', label: 'الكل' },
                    { id: 'correct', label: 'الإجابات الصحيحة' },
                    { id: 'incorrect', label: 'الإجابات الخاطئة' },
                    { id: 'flagged', label: 'الأسئلة المؤشرة' }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setReviewFilter(tab.id)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                      reviewFilter === tab.id
                        ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
                        : 'liquid-glass text-muted-foreground hover:text-foreground border-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredQuestionsWithIndex.length === 0 ? (
              <div className="liquid-glass rounded-3xl p-12 text-center text-muted-foreground text-xs border border-white/10">
                لا توجد أسئلة تطابق الفلتر المختار.
              </div>
            ) : (
              <div className="space-y-6">
                {filteredQuestionsWithIndex.map(({ q, idx }) => {
                  const studentAnsIdx = selectedAnswers[idx];
                  const isCorrect = studentAnsIdx === q.correct_option_index;
                  
                  return (
                    <div
                      key={q.id}
                      className="liquid-glass rounded-3xl border border-white/10 p-6 space-y-4 text-right"
                    >
                      <div className="flex gap-4 items-start">
                        <span className="h-7 w-7 rounded-full bg-white/10 text-foreground flex items-center justify-center font-display font-bold text-xs shrink-0 mt-1">
                          {idx + 1}
                        </span>
                        <div className="font-display font-normal text-foreground text-xl leading-relaxed">
                          <MathText text={q.question_text} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt, optIdx) => {
                          const isStudentSelect = studentAnsIdx === optIdx;
                          const isCorrectOpt = q.correct_option_index === optIdx;
                          
                          let optStyle = 'liquid-glass border-white/10 text-foreground';

                          if (isCorrectOpt) {
                            optStyle = 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300';
                          } else if (isStudentSelect && !isCorrect) {
                            optStyle = 'bg-rose-500/15 border-rose-500/40 text-rose-300';
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`p-3.5 text-xs rounded-2xl border flex gap-3 items-center ${optStyle}`}
                            >
                              <span className="h-6 w-6 rounded-full flex items-center justify-center font-display text-[10px] bg-white/10 shrink-0">
                                {optIdx === 0 ? 'أ' : optIdx === 1 ? 'ب' : optIdx === 2 ? 'ج' : 'د'}
                              </span>
                              <MathText text={opt} className="flex-1" />
                            </div>
                          );
                        })}
                      </div>

                      <div className="liquid-glass rounded-2xl p-4 border border-white/5 text-xs text-muted-foreground leading-relaxed">
                        {q.explanation ? (
                          <MathText text={q.explanation} />
                        ) : (
                          <span>الإجابة الصحيحة هي الخيار ({q.correct_option_index === 0 ? 'أ' : q.correct_option_index === 1 ? 'ب' : q.correct_option_index === 2 ? 'ج' : 'د'}).</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-4 items-center justify-center pt-6">
              <button
                onClick={handleRetake}
                className="liquid-glass-glow rounded-full px-8 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer flex items-center gap-1.5"
              >
                إعادة المحاولة <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <Link
                href={`/subjects/${quiz.subject_id}`}
                className="liquid-glass rounded-full px-8 py-3 text-xs text-foreground hover:scale-105 transition-transform"
              >
                العودة للمادة
              </Link>
            </div>

          </div>

        </div>
      </SidebarLayout>
    );
  }

  return null;
}
