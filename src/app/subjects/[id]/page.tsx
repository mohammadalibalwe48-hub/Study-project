'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { ListSkeleton } from '@/components/SkeletonLoader';

interface Subject {
  id: number;
  name: string;
  description: string;
}

interface Lesson {
  id: number;
  name: string;
  order_index: number;
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  lesson_id: number | null;
  is_official?: boolean;
  exam_year?: number;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SubjectDetailPage({ params }: PageProps) {
  const { id: subjectId } = use(params);
  const { user, profile, loading, signOut } = useAuth();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchDetails() {
      if (!user) return;
      try {
        setDbLoading(true);

        const { data: subData, error: subErr } = await supabase
          .from('subjects')
          .select('*')
          .eq('id', subjectId)
          .single();
        if (subErr) throw subErr;
        setSubject(subData);

        const { data: lesData, error: lesErr } = await supabase
          .from('lessons')
          .select('*')
          .eq('subject_id', subjectId)
          .order('order_index', { ascending: true });
        if (lesErr) throw lesErr;
        setLessons(lesData || []);

        const { data: quizData, error: quizErr } = await supabase
          .from('quizzes')
          .select('*')
          .eq('subject_id', subjectId);
        if (quizErr) throw quizErr;
        setQuizzes(quizData || []);
      } catch (err) {
        console.error('Error fetching subject details:', err);
      } finally {
        setDbLoading(false);
      }
    }

    fetchDetails();
  }, [user, subjectId]);

  if (loading || dbLoading) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="p-8">
          <ListSkeleton count={4} />
        </div>
      </SidebarLayout>
    );
  }

  if (!subject) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 px-6 bg-[#001420] text-center text-foreground">
        <h2 className="text-4xl font-display font-normal">المادة غير موجودة</h2>
        <p className="text-xs text-muted-foreground mt-2">الرجاء العودة إلى لوحة التحكم.</p>
        <Link
          href="/dashboard"
          className="mt-6 liquid-glass-glow rounded-full px-8 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40"
        >
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full w-full">
        
        {/* Central Content Column */}
        <section className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 overflow-y-auto text-right border border-white/15">
          {/* Header Back Button */}
          <div className="flex items-center justify-between w-full border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                لوحة التحكم
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">{subject.name}</span>
            </div>

            <Link
              href="/dashboard"
              className="liquid-glass rounded-full px-5 py-2 text-xs text-foreground hover:scale-105 transition-transform"
            >
              ← العودة
            </Link>
          </div>

          {/* Subject Presentation Banner */}
          <div className="liquid-glass rounded-3xl p-8 border border-white/15 flex flex-col justify-between text-right space-y-4">
            <div className="space-y-3">
              <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3.5 py-1 rounded-full inline-block font-medium">
                مقرر البكالوريا
              </span>
              <h2 className="text-4xl sm:text-5xl font-display font-normal text-foreground">{subject.name}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                {subject.description || 'ابدأ بمراجعة الدروس وحل الاختبارات المتاحة لهذه المادة لتقييم مستواك الدراسي.'}
              </p>
            </div>
          </div>

          {/* Lessons List */}
          <div className="space-y-6 pt-4">
            <h3 className="text-3xl font-display font-normal text-foreground">الدروس والوحدات المتاحة</h3>
            
            {lessons.length === 0 ? (
              <div className="liquid-glass rounded-3xl p-12 text-center text-muted-foreground text-sm border border-white/10">
                لم يتم إضافة دروس لهذه المادة بعد.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {lessons.map((les, index) => (
                  <Link
                    key={les.id}
                    href={`/lessons/${les.id}`}
                    className="flex items-center justify-between liquid-glass-glow rounded-2xl p-5 border border-white/15 hover:scale-[1.01] transition-transform group cursor-pointer"
                  >
                    <div className="flex items-center gap-4 text-right">
                      <span className="h-10 w-10 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-display font-bold text-sm border border-cyan-400/30">
                        {index + 1}
                      </span>
                      <h4 className="font-display font-normal text-foreground text-xl group-hover:text-cyan-200 transition-colors">
                        {les.name}
                      </h4>
                    </div>
                    <span className="text-xs text-foreground font-medium flex items-center gap-2">
                      عرض الدرس ←
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Sidebar Column (Challenges/Quizzes) */}
        <section className="w-full lg:w-96 shrink-0 liquid-glass-glow rounded-3xl p-6 flex flex-col gap-8 overflow-y-auto text-right border border-white/15">
          {/* General Quizzes */}
          <div className="border-b border-white/10 pb-4">
            <h4 className="font-display text-2xl text-foreground">الاختبارات والتكاليف</h4>
          </div>

          {quizzes.filter(q => !q.is_official).length === 0 ? (
            <div className="liquid-glass rounded-2xl p-6 text-center text-muted-foreground text-xs border border-white/10">
              لا يوجد اختبارات مخصصة لهذه المادة بعد.
            </div>
          ) : (
            <div className="space-y-4">
              {quizzes.filter(q => !q.is_official).map((quiz) => (
                <div
                  key={quiz.id}
                  className="liquid-glass rounded-2xl p-5 border border-white/10 space-y-4 text-right hover:scale-[1.02] transition-transform"
                >
                  <div className="space-y-2">
                    <h5 className="font-display text-xl text-foreground">
                      {quiz.title}
                    </h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {quiz.description || 'اختبار مراجعة لمفاهيم المقرر.'}
                    </p>
                  </div>
                  
                  <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[11px] text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20">متاح للحل</span>
                    <Link
                      href={`/quizzes/${quiz.id}`}
                      className="liquid-glass-glow rounded-full px-4 py-1.5 text-xs text-foreground font-medium hover:scale-105 transition-transform border border-cyan-400/40"
                    >
                      ابدأ الاختبار ←
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Official Ministerial Exam Archives */}
          <div className="border-b border-white/10 pb-4 pt-4">
            <h4 className="font-display text-2xl text-foreground">دورات رسمية وسلالم</h4>
          </div>

          {quizzes.filter(q => q.is_official).length === 0 ? (
            <div className="liquid-glass rounded-2xl p-6 text-center text-muted-foreground text-xs border border-white/10">
              لا يوجد دورات رسمية مضافة بعد.
            </div>
          ) : (
            <div className="space-y-4">
              {quizzes.filter(q => q.is_official).map((quiz) => (
                <div
                  key={quiz.id}
                  className="liquid-glass-glow rounded-2xl p-5 border border-amber-400/30 space-y-4 text-right hover:scale-[1.02] transition-transform"
                >
                  <div className="space-y-2">
                    <span className="text-[11px] text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
                      دورة {quiz.exam_year || 'الوزارية'}
                    </span>
                    <h5 className="font-display text-xl text-foreground mt-2">
                      {quiz.title}
                    </h5>
                  </div>
                  
                  <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[11px] text-muted-foreground">سلالم التصحيح</span>
                    <Link
                      href={`/quizzes/${quiz.id}`}
                      className="liquid-glass-glow rounded-full px-4 py-1.5 text-xs text-foreground font-medium hover:scale-105 transition-transform border border-amber-400/40"
                    >
                      حل الدورة ←
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </SidebarLayout>
  );
}
