'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { Target, Check, Trash2, Plus } from 'lucide-react';

interface Subject {
  id: number;
  name: string;
  branches?: {
    name: string;
  };
}

interface Quiz {
  id: number;
  subject_id: number;
  title: string;
  description: string;
  subjects?: {
    name: string;
  };
}

interface Question {
  id: number;
  quiz_id: number;
  question_text: string;
  options: string[];
  correct_option_index: number;
}

export default function AdminQuizzesPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<Record<number, Question[]>>({});
  const [dbLoading, setDbLoading] = useState(true);
  const router = useRouter();

  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [activeQuizIdForQuestion, setActiveQuizIdForQuestion] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [opt0, setOpt0] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [correctIdx, setCorrectIdx] = useState<number>(0);
  const [questionActionLoading, setQuestionActionLoading] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth');
      } else if (profile?.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, profile, loading, router]);

  const fetchData = async () => {
    try {
      setDbLoading(true);
      const { data: subData } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          branches (
            name
          )
        `);
      
      const formattedSubjects = (subData || []).map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        branches: Array.isArray(sub.branches) ? sub.branches[0] : sub.branches,
      }));
      setSubjects(formattedSubjects);
      if (formattedSubjects.length > 0 && subjectId === 0) {
        setSubjectId(formattedSubjects[0].id);
      }

      const { data: qData } = await supabase
        .from('quizzes')
        .select(`
          id,
          subject_id,
          title,
          description,
          subjects (
            name
          )
        `)
        .order('id', { ascending: false });

      const formattedQuizzes = (qData || []).map((q: any) => ({
        ...q,
        subjects: Array.isArray(q.subjects) ? q.subjects[0] : q.subjects,
      }));
      setQuizzes(formattedQuizzes);

      const { data: qstData } = await supabase.from('questions').select('*').order('id', { ascending: true });
      const qstMap: Record<number, Question[]> = {};
      (qstData || []).forEach((q: any) => {
        if (!qstMap[q.quiz_id]) qstMap[q.quiz_id] = [];
        qstMap[q.quiz_id].push({
          id: q.id,
          quiz_id: q.quiz_id,
          question_text: q.question_text,
          options: Array.isArray(q.options) ? q.options : typeof q.options === 'string' ? JSON.parse(q.options) : [],
          correct_option_index: q.correct_option_index,
        });
      });
      setQuestions(qstMap);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchData();
    }
  }, [user, profile]);

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || subjectId === 0) return;

    setActionLoading(true);
    try {
      if (editingQuizId) {
        const { error } = await supabase
          .from('quizzes')
          .update({
            subject_id: subjectId,
            title,
            description,
          })
          .eq('id', editingQuizId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('quizzes').insert({
          subject_id: subjectId,
          title,
          description,
        });

        if (error) throw error;
      }

      setTitle('');
      setDescription('');
      setEditingQuizId(null);
      await fetchData();
    } catch (err: any) {
      console.error('Error saving quiz:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuizIdForQuestion || !questionText.trim() || !opt0.trim() || !opt1.trim()) return;

    setQuestionActionLoading(true);
    try {
      const opts = [opt0, opt1, opt2, opt3].filter(o => o.trim().length > 0);

      const { error } = await supabase.from('questions').insert({
        quiz_id: activeQuizIdForQuestion,
        question_text: questionText,
        options: opts,
        correct_option_index: correctIdx,
      });

      if (error) throw error;

      setQuestionText('');
      setOpt0('');
      setOpt1('');
      setOpt2('');
      setOpt3('');
      setCorrectIdx(0);
      setActiveQuizIdForQuestion(null);
      await fetchData();
    } catch (err: any) {
      console.error('Error adding question:', err);
    } finally {
      setQuestionActionLoading(false);
    }
  };

  const handleDeleteQuiz = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار وجميع أسئلته؟')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('quizzes').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting quiz:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteQuestion = async (qId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', qId);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting question:', err);
    }
  };

  if (loading || dbLoading) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="p-8">
          <TableSkeleton rows={5} />
        </div>
      </SidebarLayout>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 overflow-y-auto text-right border border-white/15">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/10 pb-6">
          <div>
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-rose-400 border border-rose-400/20 uppercase inline-block">
              إدارة التقييمات والأتمتة
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3 flex items-center gap-3">
              الاختبارات المؤتمتة <Target className="w-8 h-8 text-rose-400" />
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              بناء وتعديل نماذج الاختبارات، إضافة الأسئلة وتحديد الخيارات الصحيحة.
            </p>
          </div>

          <Link
            href="/admin"
            className="liquid-glass rounded-full px-6 py-2.5 text-xs text-foreground hover:scale-105 transition-transform"
          >
            ← العودة لمركز الإدارة
          </Link>
        </div>

        {/* Quiz Form */}
        <form onSubmit={handleQuizSubmit} className="liquid-glass rounded-3xl p-6 border border-white/15 space-y-4">
          <h3 className="text-2xl font-display text-foreground border-b border-white/10 pb-3">
            {editingQuizId ? 'تعديل الاختبار' : 'إضافة نموذج اختبار جديد'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">المادة الدراسية</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(Number(e.target.value))}
                className="w-full liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id} className="bg-[#001420]">{sub.name} ({sub.branches?.name})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">عنوان الاختبار</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: اختبار الوحدة الأولى - التوازن الكيميائي"
                className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">وصف الاختبار والتعليمات</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب تعليمات الاختبار والنقاط المخصصة..."
              className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={actionLoading}
              className="liquid-glass-glow rounded-full px-8 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer flex items-center gap-1.5"
            >
              {actionLoading ? 'جاري الحفظ...' : editingQuizId ? <>تحديث الاختبار <Check className="w-3.5 h-3.5 text-emerald-400" /></> : <>حفظ النموذج الجديد <Plus className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </form>

        {/* Quizzes Grid */}
        <div className="space-y-6">
          <h3 className="text-2xl font-display text-foreground">قائمة الاختبارات والأسئلة ({quizzes.length})</h3>

          <div className="space-y-6">
            {quizzes.map((quiz) => {
              const quizQuestions = questions[quiz.id] || [];
              const isAddingQuestion = activeQuizIdForQuestion === quiz.id;

              return (
                <div key={quiz.id} className="liquid-glass-glow rounded-3xl p-6 border border-white/15 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
                    <div>
                      <span className="text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full">
                        {quiz.subjects?.name || 'مادة عامة'}
                      </span>
                      <h4 className="text-2xl font-display text-foreground mt-2">{quiz.title}</h4>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveQuizIdForQuestion(isAddingQuestion ? null : quiz.id)}
                        className="liquid-glass rounded-full px-4 py-1.5 text-xs text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/10 flex items-center gap-1 cursor-pointer"
                      >
                        {isAddingQuestion ? 'إلغاء الإضافة' : <>إضافة سؤال جديد <Plus className="w-3.5 h-3.5" /></>}
                      </button>
                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="liquid-glass rounded-full px-4 py-1.5 text-xs text-rose-400 border border-white/5 hover:border-rose-500/40 flex items-center gap-1 cursor-pointer"
                      >
                        حذف <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Add Question Form overlay */}
                  {isAddingQuestion && (
                    <form onSubmit={handleAddQuestion} className="liquid-glass rounded-2xl p-5 border border-emerald-400/30 space-y-3">
                      <h5 className="text-sm font-bold text-emerald-400">إضافة سؤال جديد للنموذج</h5>
                      
                      <textarea
                        rows={2}
                        required
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="نص السؤال..."
                        className="w-full text-right liquid-glass rounded-xl p-3 text-xs text-foreground focus:outline-none"
                      ></textarea>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={opt0}
                          onChange={(e) => setOpt0(e.target.value)}
                          placeholder="الخيار الأول (أ)"
                          className="liquid-glass rounded-xl p-2.5 text-xs text-foreground"
                        />
                        <input
                          type="text"
                          required
                          value={opt1}
                          onChange={(e) => setOpt1(e.target.value)}
                          placeholder="الخيار الثاني (ب)"
                          className="liquid-glass rounded-xl p-2.5 text-xs text-foreground"
                        />
                        <input
                          type="text"
                          value={opt2}
                          onChange={(e) => setOpt2(e.target.value)}
                          placeholder="الخيار الثالث (ج)"
                          className="liquid-glass rounded-xl p-2.5 text-xs text-foreground"
                        />
                        <input
                          type="text"
                          value={opt3}
                          onChange={(e) => setOpt3(e.target.value)}
                          placeholder="الخيار الرابع (د)"
                          className="liquid-glass rounded-xl p-2.5 text-xs text-foreground"
                        />
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>الخيار الصحيح:</span>
                          <select
                            value={correctIdx}
                            onChange={(e) => setCorrectIdx(Number(e.target.value))}
                            className="liquid-glass rounded-full px-3 py-1 text-xs text-cyan-300"
                          >
                            <option value={0} className="bg-[#001420]">الخيار الأول (أ)</option>
                            <option value={1} className="bg-[#001420]">الخيار الثاني (ب)</option>
                            <option value={2} className="bg-[#001420]">الخيار الثالث (ج)</option>
                            <option value={3} className="bg-[#001420]">الخيار الرابع (د)</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          disabled={questionActionLoading}
                          className="liquid-glass-glow rounded-full px-6 py-2 text-xs text-foreground border border-emerald-400/40 flex items-center gap-1.5 cursor-pointer"
                        >
                          حفظ السؤال <Check className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Questions List */}
                  <div className="space-y-2">
                    {quizQuestions.map((q, qIdx) => (
                      <div key={q.id} className="liquid-glass rounded-xl p-4 border border-white/5 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-foreground">{qIdx + 1}. {q.question_text}</span>
                          <span className="text-[10px] text-muted-foreground block mt-1">الخيارات: {q.options.join(' | ')}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="text-rose-400 hover:underline text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          حذف السؤال <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>
    </SidebarLayout>
  );
}
