'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { ListSkeleton } from '@/components/SkeletonLoader';
import {
  CURRICULUM_SUBJECTS,
  CURRICULUM_LESSONS,
  CURRICULUM_QUIZZES,
} from '@/utils/curriculumData';

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
  const { id: subjectIdStr } = use(params);
  const subjectId = Number(subjectIdStr);
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

        if (!subErr && subData) {
          setSubject(subData);
          const { data: lesData } = await supabase
            .from('lessons')
            .select('*')
            .eq('subject_id', subjectId)
            .order('order_index', { ascending: true });

          const staticLessons = CURRICULUM_LESSONS.filter((l) => l.subject_id === subjectId);
          setLessons(lesData && lesData.length > 0 ? lesData : staticLessons);

          const { data: quizData } = await supabase
            .from('quizzes')
            .select('*')
            .eq('subject_id', subjectId);

          const staticQuizzes = CURRICULUM_QUIZZES.filter((q) => q.subject_id === subjectId).map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description,
            lesson_id: q.lesson_id ?? null,
            is_official: q.is_official,
            exam_year: q.exam_year,
          }));
          setQuizzes(quizData && quizData.length > 0 ? quizData : staticQuizzes);
        } else {
          // Fallback to static verified curriculum dataset
          const staticSub = CURRICULUM_SUBJECTS.find((s) => s.id === subjectId) || CURRICULUM_SUBJECTS[0];
          setSubject(staticSub);
          setLessons(CURRICULUM_LESSONS.filter((l) => l.subject_id === staticSub.id));
          setQuizzes(
            CURRICULUM_QUIZZES.filter((q) => q.subject_id === staticSub.id).map((q) => ({
              id: q.id,
              title: q.title,
              description: q.description,
              lesson_id: q.lesson_id ?? null,
              is_official: q.is_official,
              exam_year: q.exam_year,
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching subject details:', err);
        const staticSub = CURRICULUM_SUBJECTS.find((s) => s.id === subjectId) || CURRICULUM_SUBJECTS[0];
        setSubject(staticSub);
        setLessons(CURRICULUM_LESSONS.filter((l) => l.subject_id === staticSub.id));
        setQuizzes(
          CURRICULUM_QUIZZES.filter((q) => q.subject_id === staticSub.id).map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description,
            lesson_id: q.lesson_id ?? null,
            is_official: q.is_official,
            exam_year: q.exam_year,
          }))
        );
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
                مقرر البكالوريا السورية
              </span>
              <h2 className="text-4xl sm:text-5xl font-display font-normal text-foreground">{subject.name}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                {subject.description ||
                  'ابدأ بمراجعة الدروس وحل الاختبارات المتاحة لهذه المادة لتقييم مستواك الدراسي.'}
              </p>
            </div>
          </div>

          {/* Lessons List Section */}
          <div className="space-y-6">
            <h3 className="text-3xl font-display font-normal text-foreground">الدروس والشروحات المرئية</h3>

            {lessons.length === 0 ? (
              <p className="text-xs text-muted-foreground liquid-glass p-6 rounded-2xl border border-white/10">
                لا توجد دروس متاحة لهذه المادة حالياً.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lessons.map((les, index) => (
                  <div
                    key={les.id}
                    className="liquid-glass-glow rounded-2xl p-5 border border-white/15 hover:scale-[1.02] transition-transform flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4 text-right min-w-0 pr-2">
                      <span className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center font-display font-bold text-sm shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-display font-normal text-foreground text-lg truncate group-hover:text-cyan-200 transition-colors">
                          {les.name}
                        </h4>
                        <span className="text-[10px] text-muted-foreground">فيديو + ملخص وزاري</span>
                      </div>
                    </div>

                    <Link
                      href={`/lessons/${les.id}`}
                      className="liquid-glass-glow rounded-full px-5 py-2 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 shrink-0"
                    >
                      بدء الدرس ←
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quizzes List Section */}
          <div className="space-y-6 pt-4 border-t border-white/10">
            <h3 className="text-3xl font-display font-normal text-foreground">الاختبارات التفاعلية المؤتمتة</h3>

            {quizzes.length === 0 ? (
              <p className="text-xs text-muted-foreground liquid-glass p-6 rounded-2xl border border-white/10">
                لا توجد اختبارات متاحة لهذه المادة حالياً.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quizzes.map((q) => (
                  <div
                    key={q.id}
                    className="liquid-glass-glow rounded-2xl p-5 border border-white/15 hover:scale-[1.02] transition-transform flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-2 text-right">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-2.5 py-0.5 rounded-full inline-block">
                          {q.is_official ? `وزاري ${q.exam_year}` : 'اختبار مؤتمت'}
                        </span>
                      </div>
                      <h4 className="font-display font-normal text-foreground text-lg truncate group-hover:text-cyan-200 transition-colors">
                        {q.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{q.description}</p>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                      <span className="text-[11px] text-muted-foreground">تصحيح فوري ومعالجة</span>
                      <Link
                        href={`/quizzes/${q.id}`}
                        className="liquid-glass-glow rounded-full px-5 py-2 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40"
                      >
                        بدء الاختبار ←
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </SidebarLayout>
  );
}
