'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import FormulaRenderer, { MathText } from '@/components/FormulaRenderer';
import { useAuth } from '@/context/AuthContext';
import { Check, Bookmark, Landmark, FlaskConical, BookOpen, Clock, ArrowLeft, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';
import AiRubricModal from '@/components/AiRubricModal';
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
  const [selectedRubricQuestion, setSelectedRubricQuestion] = useState<{ question: any; userAnswerIndex?: number } | null>(null);

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

  /* REVIEW PHASE SCREEN */
  if (phase === 'review' && activeExam) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="mx-auto w-full max-w-[1180px] space-y-6 text-right bg-dot-pattern py-4" dir="rtl">
          <header className="flex flex-col gap-4 border-b-2 border-[#282825] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="app-chip bg-[#ffd64d] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
                تقرير نتيجة الامتحان الوزاري
              </span>
              <h1 className="text-3xl font-black text-[#282825] mt-2 sm:text-4xl">{activeExam.title}</h1>
            </div>
            <button
              onClick={exitToCatalog}
              className="app-button border-2 border-[#282825] bg-white text-[#282825] shadow-[3px_3px_0_#282825] hover:bg-[#282825] hover:text-white transition-all text-xs font-black px-6 py-2.5"
            >
              العودة للنماذج الوزارية ←
            </button>
          </header>

          <section className="rounded-2xl border-2 border-[#282825] bg-[#cce6b4] p-6 sm:p-8 shadow-[6px_6px_0_#282825]">
            <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr] items-center">
              <div className="rounded-2xl border-2 border-[#282825] bg-white p-6 text-center space-y-2 shadow-[4px_4px_0_#282825]">
                <span className="text-xs font-black text-[#5f5f59]">النتيجة النهائية</span>
                <div className="text-5xl font-black text-[#282825]">
                  {score.percent}%
                </div>
                <p className="text-xs font-bold text-[#5f5f59]">
                  {score.value} / {score.total} درجة
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border-2 border-[#282825] bg-white p-4 text-center shadow-[3px_3px_0_#282825]">
                  <p className="text-xs font-black text-[#5f5f59]">إجابات صحيحة</p>
                  <p className="text-3xl font-black text-[#15803d] mt-1">{score.correct}</p>
                </div>
                <div className="rounded-xl border-2 border-[#282825] bg-white p-4 text-center shadow-[3px_3px_0_#282825]">
                  <p className="text-xs font-black text-[#5f5f59]">إجابات خاطئة</p>
                  <p className="text-3xl font-black text-[#b91c1c] mt-1">{score.wrong}</p>
                </div>
                <div className="rounded-xl border-2 border-[#282825] bg-white p-4 text-center shadow-[3px_3px_0_#282825]">
                  <p className="text-xs font-black text-[#5f5f59]">متروك دون حل</p>
                  <p className="text-3xl font-black text-[#b45309] mt-1">{score.skipped}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-[#282825] bg-white p-6 shadow-[5px_5px_0_#282825] space-y-6">
            <div className="flex flex-col gap-3 border-b-2 border-[#282825]/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-2xl font-black text-[#282825]">شرح الإجابات والسلم الوزاري</h3>
              <div className="flex flex-wrap gap-2">
                {([
                  ['all', `الكل (${activeExam.questions.length})`],
                  ['correct', `الصحيحة (${score.correct})`],
                  ['wrong', `الخاطئة (${score.wrong + score.skipped})`],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setReviewFilter(key)}
                    className={`rounded-xl border-2 border-[#282825] px-4 py-1.5 text-xs font-black transition-all cursor-pointer ${
                      reviewFilter === key
                        ? 'bg-[#282825] text-white shadow-[2px_2px_0_#ff5636]'
                        : 'bg-white text-[#282825] hover:bg-[#ffd64d] shadow-[2px_2px_0_#282825]'
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
                      className={`rounded-2xl border-2 border-[#282825] p-5 text-right space-y-3 shadow-[3px_3px_0_#282825] ${
                        ok ? 'bg-[#cce6b4]/40' : 'bg-[#ff5636]/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-base font-black text-[#282825]">
                          {i + 1}. {q.question}
                        </h4>
                        <span className={`text-xs font-black px-3 py-1 rounded-lg border border-[#282825] shadow-[1px_1px_0_#282825] ${
                          ok ? 'bg-[#cce6b4] text-[#15803d]' : 'bg-[#ff5636] text-white'
                        }`}>
                          {ok ? `+${q.points}` : skipped ? 'متروك' : 'خطأ'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs font-semibold text-[#282825] pt-2">
                        <div className="bg-white border-2 border-[#282825] p-3 rounded-xl shadow-[2px_2px_0_#282825]">
                          <span className="font-black text-[#15803d]">الإجابة النموذجية: </span>
                          <MathText text={q.options[q.correctIndex]} />
                        </div>
                        {userAnswer !== undefined && !ok && (
                          <div className="bg-white border-2 border-[#282825] p-3 rounded-xl shadow-[2px_2px_0_#282825]">
                            <span className="font-black text-[#b91c1c]">إجابتك: </span>
                            <MathText text={q.options[userAnswer]} />
                          </div>
                        )}
                        <div className="bg-[#fafaf7] p-3.5 rounded-xl border border-[#282825]/20">
                          <span className="font-black text-[#ff5636]">التوضيح الوزاري: </span>
                          <MathText text={q.explanation} />
                        </div>
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => setSelectedRubricQuestion({ question: q, userAnswerIndex: userAnswer })}
                            className="app-button border-2 border-[#282825] bg-[#ffd64d] text-[#282825] text-xs font-black px-4 py-2 shadow-[2px_2px_0_#282825] hover:shadow-[3.5px_3.5px_0_#282825] hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#ff5636]" />
                            <span>سلم التصحيح والتحليل الذكي 🤖</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        </div>
        <AiRubricModal
          isOpen={!!selectedRubricQuestion}
          onClose={() => setSelectedRubricQuestion(null)}
          question={selectedRubricQuestion?.question || null}
          userAnswerIndex={selectedRubricQuestion?.userAnswerIndex}
          subjectName={activeExam?.subjectName}
          year={activeExam?.year}
          track={activeExam?.track}
        />
      </SidebarLayout>
    );
  }

  /* LIVE RUNNING QUIZ SCREEN */
  if (phase === 'running' && activeExam) {
    const current = activeExam.questions[currentIdx];
    const answeredCount = Object.keys(answers).length;

    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="mx-auto w-full max-w-[1180px] space-y-6 text-right bg-dot-pattern py-4" dir="rtl">
          
          <header className="rounded-2xl border-2 border-[#282825] bg-white p-5 shadow-[5px_5px_0_#282825] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="app-chip bg-[#bce9fa] border border-[#282825] text-xs font-black shadow-[1.5px_1.5px_0_#282825]">
                {activeExam.subjectName} • {activeExam.year}
              </span>
              <h1 className="text-2xl font-black text-[#282825] mt-2">{activeExam.title}</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border-2 border-[#282825] bg-[#ffd64d] px-5 py-2 text-sm font-mono font-black text-[#282825] shadow-[2.5px_2.5px_0_#282825]">
                ⏱️ {formatTimer(secondsLeft)}
              </div>
              <button
                onClick={finishExam}
                className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-5 py-2 text-xs font-black shadow-[2.5px_2.5px_0_#282825] hover:shadow-[4px_4px_0_#282825] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>تسليم النموذج</span>
                <Check className="w-4 h-4 stroke-[3px]" />
              </button>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
            <section className="rounded-2xl border-2 border-[#282825] bg-white p-6 shadow-[5px_5px_0_#282825] space-y-6 bg-dot-pattern-dense">
              <div className="flex items-center justify-between border-b-2 border-[#282825]/10 pb-4">
                <span className="text-xs font-black text-[#5f5f59]">السؤال {currentIdx + 1} من {activeExam.questions.length}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedRubricQuestion({ question: current, userAnswerIndex: answers[current.id] })}
                    className="text-xs font-black px-3 py-1.5 rounded-xl border-2 bg-[#ffd64d] text-[#282825] border-[#282825] shadow-[2px_2px_0_#282825] hover:shadow-[3px_3px_0_#282825] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#ff5636]" />
                    <span>سلم التصحيح والتحليل 🤖</span>
                  </button>
                  <button
                    onClick={() => toggleFlag(current.id)}
                    className={`text-xs font-black px-3.5 py-1.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      flagged[current.id] 
                        ? 'bg-[#ffd64d] text-[#282825] border-[#282825] shadow-[2px_2px_0_#282825]' 
                        : 'bg-white border-[#282825] text-[#5f5f59] shadow-[1.5px_1.5px_0_#282825]'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${flagged[current.id] ? 'fill-[#282825] text-[#282825]' : ''}`} />
                    {flagged[current.id] ? 'مؤشر للمراجعة' : 'تأشير للمراجعة'}
                  </button>
                </div>
              </div>

              <h3 className="text-2xl font-black text-[#282825] leading-relaxed">
                {current.question}
              </h3>

              <div className="grid grid-cols-1 gap-3 pt-4">
                {current.options.map((opt, optIdx) => {
                  const isSelected = answers[current.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => selectOption(current.id, optIdx)}
                      className={`flex items-center text-right w-full p-4 rounded-xl border-2 transition-all text-sm font-bold cursor-pointer ${
                        isSelected
                          ? 'bg-[#ffd64d] border-[#282825] text-[#282825] shadow-[4px_4px_0_#282825]'
                          : 'bg-white border-[#282825] text-[#282825] hover:bg-[#bce9fa] shadow-[2px_2px_0_#282825]'
                      }`}
                    >
                      <span className="h-7 w-7 rounded-lg border border-[#282825] flex items-center justify-center font-black text-xs bg-white ml-3 shrink-0 shadow-[1px_1px_0_#282825]">
                        {OPTION_LETTERS[optIdx]}
                      </span>
                      <MathText text={opt} className="flex-1" />
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-6 border-t-2 border-[#282825]/10">
                <button
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  className="app-button border-2 border-[#282825] bg-white text-[#282825] px-6 py-2.5 text-xs font-black shadow-[2.5px_2.5px_0_#282825] disabled:opacity-40 cursor-pointer"
                >
                  ← السابق
                </button>
                <button
                  onClick={() => setCurrentIdx((prev) => Math.min(activeExam.questions.length - 1, prev + 1))}
                  disabled={currentIdx === activeExam.questions.length - 1}
                  className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-8 py-2.5 text-xs font-black shadow-[2.5px_2.5px_0_#282825] hover:shadow-[4px_4px_0_#282825] transition-all cursor-pointer disabled:opacity-40"
                >
                  التالي →
                </button>
              </div>
            </section>

            <aside className="rounded-2xl border-2 border-[#282825] bg-white p-5 shadow-[5px_5px_0_#282825] h-fit">
              <h4 className="font-black text-lg text-[#282825] border-b-2 border-[#282825]/10 pb-3 mb-4">خريطة الأسئلة</h4>
              <div className="grid grid-cols-5 gap-2">
                {activeExam.questions.map((q, idx) => {
                  const isCurrent = idx === currentIdx;
                  const isAnswered = answers[q.id] !== undefined;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-9 w-9 rounded-xl font-black text-xs border-2 transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#ff5636] text-white border-[#282825] shadow-[2px_2px_0_#282825] scale-105'
                          : isAnswered
                          ? 'bg-[#ffd64d] text-[#282825] border-[#282825] shadow-[1.5px_1.5px_0_#282825]'
                          : 'bg-white text-[#282825] border-[#282825] shadow-[1px_1px_0_#282825]'
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
        <AiRubricModal
          isOpen={!!selectedRubricQuestion}
          onClose={() => setSelectedRubricQuestion(null)}
          question={selectedRubricQuestion?.question || null}
          userAnswerIndex={selectedRubricQuestion?.userAnswerIndex}
          subjectName={activeExam?.subjectName}
          year={activeExam?.year}
          track={activeExam?.track}
        />
      </SidebarLayout>
    );
  }

  /* CATALOG SCREEN */
  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <main className="mx-auto w-full max-w-[1180px] space-y-8 text-right bg-dot-pattern py-4" dir="rtl">
        
        {/* Banner Section */}
        <section className="rounded-2xl border-2 border-[#282825] bg-[#ffd64d] p-6 sm:p-8 shadow-[6px_6px_0_#282825] space-y-4 bg-stripe-pattern">
          <span className="app-chip bg-white border border-[#282825] text-xs font-black shadow-[1.5px_1.5px_0_#282825]">
            <Landmark className="w-4 h-4 text-[#ff5636]" /> محاكي الامتحانات الوزارية
          </span>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl text-[#282825]">
            النماذج الوزارية الرسمية
          </h1>
          <p className="text-[#282825] text-sm max-w-2xl leading-relaxed font-bold">
            تجربة امتحانية حقيقية: فلاتر دقيقة حسب الفرع، مؤقت زمني مطابق للامتحان الوزاري، وسلم تصحيح تفصيلي.
          </p>
        </section>

        {/* Search & Filter Bar */}
        <section className="rounded-2xl border-2 border-[#282825] bg-white p-5 shadow-[4px_4px_0_#282825] space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المادة، السنة، أو الدورة..."
              className="w-full sm:max-w-md app-input text-xs font-semibold border-2 border-[#282825] shadow-[2px_2px_0_#282825] focus:shadow-[4px_4px_0_#282825]"
            />
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setTrackFilter('all')}
                className={`rounded-xl border-2 border-[#282825] px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                  trackFilter === 'all'
                    ? 'bg-[#282825] text-white shadow-[2px_2px_0_#ff5636]'
                    : 'bg-white text-[#282825] hover:bg-[#ffd64d] shadow-[2px_2px_0_#282825]'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setTrackFilter('scientific')}
                className={`rounded-xl border-2 border-[#282825] px-4 py-2 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  trackFilter === 'scientific'
                    ? 'bg-[#282825] text-white shadow-[2px_2px_0_#ff5636]'
                    : 'bg-[#ffdc72] text-[#282825] shadow-[2px_2px_0_#282825]'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 text-[#ff5636]" /> الفرع العلمي
              </button>
              <button
                onClick={() => setTrackFilter('literary')}
                className={`rounded-xl border-2 border-[#282825] px-4 py-2 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  trackFilter === 'literary'
                    ? 'bg-[#282825] text-white shadow-[2px_2px_0_#ff5636]'
                    : 'bg-[#d8bcff] text-[#282825] shadow-[2px_2px_0_#282825]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-[#7c3aed]" /> الفرع الأدبي
              </button>
            </div>
          </div>
        </section>

        {/* Exams Catalog Grid */}
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => {
            const cardBg = exam.track === 'scientific' ? 'bg-[#ffdc72] neo-shadow-interactive-yellow' : 'bg-[#d8bcff] neo-shadow-interactive-purple';
            return (
              <article
                key={exam.id}
                className={`rounded-2xl border-2 border-[#282825] p-6 flex flex-col justify-between transition-all group hover:scale-[1.02] ${cardBg}`}
              >
                <div className="space-y-4 text-right">
                  <div className="flex justify-between items-center">
                    <span className="app-chip bg-white border border-[#282825] px-3 py-0.5 text-[11px] font-black shadow-[1.5px_1.5px_0_#282825]">
                      {exam.subjectName}
                    </span>
                    <span className="app-chip bg-white/80 border border-[#282825] px-3 py-0.5 text-xs font-black shadow-[1.5px_1.5px_0_#282825]">
                      {exam.year}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-[#282825] group-hover:text-[#ff5636] transition-colors leading-snug">
                    {exam.title}
                  </h3>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#282825]/15 text-center text-xs font-bold">
                    <div>
                      <span className="text-[#5f5f59] block text-[10px] font-black">الوقت</span>
                      <span className="text-[#282825] font-black">{exam.durationMinutes} دقيقة</span>
                    </div>
                    <div>
                      <span className="text-[#5f5f59] block text-[10px] font-black">الأسئلة</span>
                      <span className="text-[#282825] font-black">{exam.questions.length} أسئلة</span>
                    </div>
                    <div>
                      <span className="text-[#5f5f59] block text-[10px] font-black">العلامة</span>
                      <span className="text-[#282825] font-black">{exam.totalMarks} درجة</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => launchExam(exam)}
                  className="app-button border-2 border-[#282825] bg-[#ff5636] text-white w-full py-3 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[4px_4px_0_#282825] hover:-translate-y-0.5 transition-all mt-6 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>ابدأ النموذج الوزاري</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </article>
            );
          })}
        </section>
      </main>
      <AiRubricModal
        isOpen={!!selectedRubricQuestion}
        onClose={() => setSelectedRubricQuestion(null)}
        question={selectedRubricQuestion?.question || null}
        userAnswerIndex={selectedRubricQuestion?.userAnswerIndex}
        subjectName={activeExam?.subjectName}
        year={activeExam?.year}
        track={activeExam?.track}
      />
    </SidebarLayout>
  );
}
