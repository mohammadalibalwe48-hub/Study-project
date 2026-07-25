'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import FormulaRenderer, { MathText } from '@/components/FormulaRenderer';
import { useAuth } from '@/context/AuthContext';
import { Check, Bookmark, Landmark, FlaskConical, BookOpen } from 'lucide-react';
import {
  MINISTRY_EXAMS,
  OPTION_LETTERS,
  TRACK_META,
  formatTimer,
  type Track,
  type MinistryExam,
} from './ministryExamsData';

type Phase = 'catalog' | 'running' | 'review';
type ReviewFilter = 'all' | 'correct' | 'wrong';

export default function MinistryExamsPage() {
  const { profile, signOut } = useAuth();

  const [trackFilter, setTrackFilter] = useState<'all' | Track>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeExam, setActiveExam] = useState<MinistryExam | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [phase, setPhase] = useState<Phase>('catalog');
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');

  useEffect(() => {
    if (phase !== 'running') return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase('review');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const subjectsList = useMemo(
    () => Array.from(new Set(MINISTRY_EXAMS.map((e) => e.subjectName))),
    [],
  );

  const stats = useMemo(() => {
    const totalQuestions = MINISTRY_EXAMS.reduce((s, e) => s + e.questions.length, 0);
    const totalMinutes = MINISTRY_EXAMS.reduce((s, e) => s + e.durationMinutes, 0);
    const totalMarks = MINISTRY_EXAMS.reduce((s, e) => s + e.totalMarks, 0);
    return { totalQuestions, totalMinutes, totalMarks };
  }, []);

  const filteredExams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MINISTRY_EXAMS.filter((exam) => {
      if (trackFilter !== 'all' && exam.track !== trackFilter) return false;
      if (subjectFilter !== 'all' && exam.subjectName !== subjectFilter) return false;
      if (q) {
        return (
          exam.title.toLowerCase().includes(q) ||
          exam.subjectName.toLowerCase().includes(q) ||
          exam.year.includes(q) ||
          exam.session.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [trackFilter, subjectFilter, searchQuery]);

  const launchExam = useCallback((exam: MinistryExam) => {
    setActiveExam(exam);
    setCurrentIdx(0);
    setAnswers({});
    setFlagged({});
    setSecondsLeft(exam.durationMinutes * 60);
    setReviewFilter('all');
    setPhase('running');
  }, []);

  const selectOption = useCallback((questionId: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }, []);

  const toggleFlag = useCallback((questionId: number) => {
    setFlagged((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }, []);

  const finishExam = useCallback(() => {
    if (!activeExam) return;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < activeExam.questions.length) {
      const confirmSubmit = confirm(
        `أجبت على ${answeredCount} من ${activeExam.questions.length} أسئلة فقط. هل تريد التسليم الآن؟`,
      );
      if (!confirmSubmit) return;
    }
    setPhase('review');
  }, [activeExam, answers]);

  const exitToCatalog = useCallback(() => {
    if (phase === 'running') {
      const confirmExit = confirm('هل أنت متأكد من الخروج؟ سيتم إلغاء تقدمك الحالية.');
      if (!confirmExit) return;
    }
    setActiveExam(null);
    setPhase('catalog');
  }, [phase]);

  const resetFilters = useCallback(() => {
    setTrackFilter('all');
    setSubjectFilter('all');
    setSearchQuery('');
  }, []);

  const score = useMemo(() => {
    if (!activeExam) return { value: 0, total: 0, percent: 0, correct: 0, wrong: 0, skipped: 0 };
    let totalScore = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    activeExam.questions.forEach((q) => {
      const ans = answers[q.id];
      if (ans === undefined) {
        skipped++;
      } else if (ans === q.correctIndex) {
        correct++;
        totalScore += q.points;
      } else {
        wrong++;
      }
    });

    const percent = Math.round((totalScore / activeExam.totalMarks) * 100);
    return {
      value: totalScore,
      total: activeExam.totalMarks,
      percent,
      correct,
      wrong,
      skipped,
    };
  }, [activeExam, answers]);

  if (phase === 'review' && activeExam) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8 text-right" dir="rtl">
          <header className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-1 rounded-full inline-block">
                تقرير نتيجة الامتحان
              </span>
              <h1 className="text-3xl font-display font-normal text-foreground mt-2">{activeExam.title}</h1>
            </div>
            <button
              onClick={exitToCatalog}
              className="liquid-glass rounded-full px-6 py-2 text-xs text-foreground hover:scale-105 transition-transform"
            >
              العودة للنماذج الوزارية ←
            </button>
          </header>

          <section className="liquid-glass-glow rounded-3xl p-6 border border-white/15">
            <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr] items-center">
              <div className="liquid-glass rounded-2xl p-6 border border-white/10 text-center space-y-2">
                <span className="text-xs text-muted-foreground">النتيجة النهائية</span>
                <div className="text-5xl font-display text-emerald-400">
                  {score.percent}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {score.value} / {score.total} درجة
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="liquid-glass p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-xs text-muted-foreground">إجابات صحيحة</p>
                  <p className="text-2xl font-display text-emerald-400 mt-1">{score.correct}</p>
                </div>
                <div className="liquid-glass p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-xs text-muted-foreground">إجابات خاطئة</p>
                  <p className="text-2xl font-display text-rose-400 mt-1">{score.wrong}</p>
                </div>
                <div className="liquid-glass p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-xs text-muted-foreground">متروك</p>
                  <p className="text-2xl font-display text-amber-400 mt-1">{score.skipped}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-6">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-2xl font-display text-foreground">شرح الإجابات والسلم</h3>
              <div className="flex flex-wrap gap-2">
                {([
                  ['all', `الكل (${activeExam.questions.length})`],
                  ['correct', `الصحيحة (${score.correct})`],
                  ['wrong', `الخاطئة (${score.wrong + score.skipped})`],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setReviewFilter(key)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                      reviewFilter === key
                        ? 'liquid-glass-glow text-foreground border border-cyan-400/40'
                        : 'liquid-glass text-muted-foreground border-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {activeExam.questions
                .filter((q) => {
                  const a = answers[q.id];
                  const ok = a === q.correctIndex;
                  if (reviewFilter === 'correct') return ok;
                  if (reviewFilter === 'wrong') return !ok;
                  return true;
                })
                .map((q, i) => {
                  const userAnswer = answers[q.id];
                  const ok = userAnswer === q.correctIndex;
                  const skipped = userAnswer === undefined;
                  return (
                    <article
                      key={q.id}
                      className={`liquid-glass rounded-2xl p-5 border text-right space-y-3 ${
                        ok ? 'border-emerald-400/30' : 'border-rose-400/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium text-foreground">
                          {i + 1}. {q.question}
                        </h4>
                        <span className={`text-[11px] px-3 py-0.5 rounded-full ${ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {ok ? `+${q.points}` : skipped ? 'متروك' : 'خطأ'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-muted-foreground leading-relaxed pt-2">
                        <div className="bg-emerald-500/10 border border-emerald-400/20 p-3 rounded-xl text-emerald-300">
                          <span className="font-bold">الإجابة النموذجية: </span>
                          <MathText text={q.options[q.correctIndex]} />
                        </div>
                        {userAnswer !== undefined && !ok && (
                          <div className="bg-rose-500/10 border border-rose-400/20 p-3 rounded-xl text-rose-300">
                            <span className="font-bold">إجابتك: </span>
                            <MathText text={q.options[userAnswer]} />
                          </div>
                        )}
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <span className="font-bold">التوضيح: </span>
                          <MathText text={q.explanation} />
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        </div>
      </SidebarLayout>
    );
  }

  if (phase === 'running' && activeExam) {
    const current = activeExam.questions[currentIdx];
    const answeredCount = Object.keys(answers).length;
    const progressPct = Math.round(((currentIdx + 1) / activeExam.questions.length) * 100);

    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8 text-right" dir="rtl">
          <header className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3.5 py-1 rounded-full inline-block font-medium">
                {activeExam.subjectName} • {activeExam.year}
              </span>
              <h1 className="text-3xl font-display font-normal text-foreground mt-2">{activeExam.title}</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="liquid-glass rounded-full px-5 py-2 text-xs font-mono font-bold text-foreground border border-white/10">
                ⏱️ {formatTimer(secondsLeft)}
              </div>
              <button
                onClick={finishExam}
                className="liquid-glass-glow rounded-full px-6 py-2 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-emerald-400/40 cursor-pointer flex items-center gap-1.5"
              >
                تسليم النموذج <Check className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
            <section className="liquid-glass-glow rounded-3xl p-6 border border-white/15 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-xs text-muted-foreground">السؤال {currentIdx + 1} من {activeExam.questions.length}</span>
                <button
                  onClick={() => toggleFlag(current.id)}
                  className={`text-xs font-medium px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                    flagged[current.id] ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' : 'liquid-glass border-white/10 text-muted-foreground'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${flagged[current.id] ? 'fill-amber-300 text-amber-300' : ''}`} />
                  {flagged[current.id] ? 'مؤشر للمراجعة' : 'تأشير للمراجعة'}
                </button>
              </div>

              <h3 className="text-2xl font-display text-foreground leading-relaxed">
                {current.question}
              </h3>

              <div className="grid grid-cols-1 gap-3 pt-4">
                {current.options.map((opt, optIdx) => {
                  const isSelected = answers[current.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => selectOption(current.id, optIdx)}
                      className={`flex items-center text-right w-full p-4 rounded-2xl border transition-all text-xs cursor-pointer ${
                        isSelected
                          ? 'liquid-glass-glow border-cyan-400/50 text-cyan-200'
                          : 'liquid-glass border-white/10 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="h-6 w-6 rounded-full flex items-center justify-center font-display text-[10px] bg-white/10 ml-3 shrink-0">
                        {OPTION_LETTERS[optIdx]}
                      </span>
                      <MathText text={opt} className="flex-1" />
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                <button
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  className="liquid-glass rounded-full px-6 py-2.5 text-xs text-foreground font-medium disabled:opacity-40 cursor-pointer"
                >
                  ← السابق
                </button>
                <button
                  onClick={() => setCurrentIdx((prev) => Math.min(activeExam.questions.length - 1, prev + 1))}
                  disabled={currentIdx === activeExam.questions.length - 1}
                  className="liquid-glass-glow rounded-full px-8 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer disabled:opacity-40"
                >
                  التالي →
                </button>
              </div>
            </section>

            <aside className="liquid-glass-glow rounded-3xl p-5 border border-white/15 h-fit">
              <h4 className="font-display text-xl text-foreground border-b border-white/10 pb-3 mb-4">خريطة النموذج</h4>
              <div className="grid grid-cols-5 gap-2">
                {activeExam.questions.map((q, idx) => {
                  const isCurrent = idx === currentIdx;
                  const isAnswered = answers[q.id] !== undefined;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-9 w-9 rounded-xl font-display text-xs border transition-all cursor-pointer ${
                        isCurrent
                          ? 'liquid-glass-glow text-foreground border-cyan-400/50 scale-105'
                          : isAnswered
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
                          : 'liquid-glass text-muted-foreground border-white/5'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8 text-right" dir="rtl">
        <section className="liquid-glass-glow rounded-3xl p-8 border border-white/15 space-y-4">
          <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-cyan-300 border border-cyan-400/20 uppercase inline-flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-cyan-300" /> محاكي الامتحانات الوزارية
          </span>
          <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground">
            النماذج الوزارية الرسمية
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            تجربة امتحانية حقيقية: فلاتر دقيقة، مؤقت زمني مطابق للامتحان الوزاري، وسلم تصحيح تفصيلي.
          </p>
        </section>

        <section className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المادة، السنة، أو الدورة..."
              className="w-full sm:max-w-md liquid-glass rounded-2xl p-3.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyan-400/40"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTrackFilter('all')}
                className={`px-5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  trackFilter === 'all'
                    ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
                    : 'liquid-glass text-muted-foreground border-white/5'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setTrackFilter('scientific')}
                className={`px-5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  trackFilter === 'scientific'
                    ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
                    : 'liquid-glass text-muted-foreground border-white/5'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 text-cyan-400" /> علمي
              </button>
              <button
                onClick={() => setTrackFilter('literary')}
                className={`px-5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  trackFilter === 'literary'
                    ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
                    : 'liquid-glass text-muted-foreground border-white/5'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-pink-400" /> أدبي
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <article
              key={exam.id}
              className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between hover:scale-[1.02] transition-all group"
            >
              <div className="space-y-4 text-right">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full">
                    {exam.subjectName}
                  </span>
                  <span className="text-xs text-muted-foreground">{exam.year}</span>
                </div>

                <h3 className="text-2xl font-display font-normal text-foreground group-hover:text-cyan-200 transition-colors">
                  {exam.title}
                </h3>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/10 text-center text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">الوقت</span>
                    <span className="text-foreground font-medium">{exam.durationMinutes}د</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">الأسئلة</span>
                    <span className="text-foreground font-medium">{exam.questions.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">العلامة</span>
                    <span className="text-foreground font-medium">{exam.totalMarks}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => launchExam(exam)}
                className="liquid-glass-glow rounded-full w-full py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 mt-6 cursor-pointer"
              >
                ابدأ النموذج ←
              </button>
            </article>
          ))}
        </section>
      </div>
    </SidebarLayout>
  );
}
