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
      <div className="flex-1 flex flex-col justify-center items-center py-20 px-6 bg-white text-center text-[#282825]">
        <h2 className="text-4xl font-display font-normal">المادة غير موجودة</h2>
        <p className="text-xs text-[#6e6e67] mt-2">الرجاء العودة إلى لوحة التحكم.</p>
        <Link
          href="/dashboard"
          className="mt-6 student-panel rounded-full px-8 py-3 text-xs font-medium text-[#282825] hover:scale-105 transition-transform border border-[#282825]"
        >
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="mx-auto flex h-full w-full max-w-[1180px] flex-col gap-5 lg:flex-row">
        {/* Central Content Column */}
        <section className="app-card flex flex-1 flex-col gap-7 overflow-y-auto bg-white p-5 text-right sm:p-7">
          {/* Header Back Button */}
          <div className="flex w-full items-center justify-between border-b border-[#deddd7] pb-4">
            <div className="flex items-center gap-2 text-xs text-[#6e6e67]">
              <Link href="/dashboard" className="hover:text-[#282825] transition-colors">
                لوحة التحكم
              </Link>
              <span>/</span>
              <span className="text-[#282825] font-medium">{subject.name}</span>
            </div>

            <Link
              href="/dashboard"
              className="app-button app-button-secondary min-h-9 rounded-xl px-4 py-2 text-xs"
            >
              ← العودة
            </Link>
          </div>

          {/* Subject Presentation Banner */}
          <div className="rounded-[24px] border-2 border-[#282825] bg-[#dcbcff] p-6 text-right sm:p-8">
            <div className="space-y-3">
              <span className="app-chip bg-[#ffd64d]">
                مقرر البكالوريا السورية
              </span>
              <h2 className="text-4xl font-extrabold sm:text-5xl">{subject.name}</h2>
              <p className="text-[#6e6e67] text-sm leading-relaxed max-w-2xl">
                {subject.description ||
                  'ابدأ بمراجعة الدروس وحل الاختبارات المتاحة لهذه المادة لتقييم مستواك الدراسي.'}
              </p>
            </div>
          </div>

          {/* Lessons List Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-extrabold sm:text-3xl">الدروس والشروحات المرئية</h3>

            {lessons.length === 0 ? (
              <p className="text-xs text-[#6e6e67] student-card p-6 rounded-2xl border border-[#deddd7]">
                لا توجد دروس متاحة لهذه المادة حالياً.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lessons.map((les, index) => (
                  <div
                    key={les.id}
                    className="flex items-center justify-between rounded-2xl border border-[#282825] bg-[#fafaf7] p-5 transition-transform group hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-4 text-right min-w-0 pr-2">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#282825] bg-[#bce9fa] text-sm font-extrabold">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-display font-normal text-[#282825] text-lg truncate group-hover:text-[#e94225] transition-colors">
                          {les.name}
                        </h4>
                        <span className="text-[10px] text-[#6e6e67]">فيديو + ملخص وزاري</span>
                      </div>
                    </div>

                    <Link
                      href={`/lessons/${les.id}`}
                      className="app-button min-h-9 shrink-0 rounded-xl px-4 py-2 text-xs"
                    >
                      بدء الدرس ←
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quizzes List Section */}
          <div className="space-y-6 pt-4 border-t border-[#deddd7]">
            <h3 className="text-2xl font-extrabold sm:text-3xl">الاختبارات التفاعلية المؤتمتة</h3>

            {quizzes.length === 0 ? (
              <p className="text-xs text-[#6e6e67] student-card p-6 rounded-2xl border border-[#deddd7]">
                لا توجد اختبارات متاحة لهذه المادة حالياً.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quizzes.map((q) => (
                  <div
                    key={q.id}
                    className="flex flex-col justify-between space-y-4 rounded-2xl border border-[#282825] bg-[#ffd64d] p-5 transition-transform group hover:-translate-y-0.5"
                  >
                    <div className="space-y-2 text-right">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#e94225] bg-[#bce9fa] border border-[#282825] px-2.5 py-0.5 rounded-full inline-block">
                          {q.is_official ? `وزاري ${q.exam_year}` : 'اختبار مؤتمت'}
                        </span>
                      </div>
                      <h4 className="font-display font-normal text-[#282825] text-lg truncate group-hover:text-[#e94225] transition-colors">
                        {q.title}
                      </h4>
                      <p className="text-xs text-[#6e6e67] line-clamp-2">{q.description}</p>
                    </div>

                    <div className="pt-3 border-t border-[#deddd7] flex justify-between items-center">
                      <span className="text-[11px] text-[#6e6e67]">تصحيح فوري ومعالجة</span>
                      <Link
                        href={`/quizzes/${q.id}`}
                        className="app-button min-h-9 rounded-xl px-4 py-2 text-xs"
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
