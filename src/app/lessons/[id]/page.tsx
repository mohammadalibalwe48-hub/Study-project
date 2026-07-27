'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { Check, Star, Video, FileText } from 'lucide-react';
import { CURRICULUM_LESSONS, CURRICULUM_SUBJECTS, CurriculumLesson } from '@/utils/curriculumData';

interface FileItem {
  id: number;
  name: string;
  file_url: string;
}

interface SiblingLesson {
  id: number;
  name: string;
  order_index: number;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

function getYoutubeEmbedUrl(url: string | null | undefined) {
  if (!url) return null;
  let videoId = '';
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
  return `https://www.youtube.com/embed/${videoId}`;
}

export default function LessonDetailPage({ params }: PageProps) {
  const { id: lessonIdStr } = use(params);
  const lessonId = Number(lessonIdStr);
  const { user, profile, loading, signOut } = useAuth();
  const [lesson, setLesson] = useState<CurriculumLesson | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [siblingLessons, setSiblingLessons] = useState<SiblingLesson[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchLessonData() {
      try {
        setDbLoading(true);
        // Try fetching from Supabase
        const { data: lesData, error: lesErr } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', lessonId)
          .single();

        if (!lesErr && lesData) {
          // If video_url in DB is missing or invalid, check if we have a verified static match
          const staticMatch = CURRICULUM_LESSONS.find((l) => l.id === lessonId);
          setLesson({
            id: lesData.id,
            subject_id: lesData.subject_id,
            name: lesData.name,
            unit: lesData.unit || staticMatch?.unit || 'الوحدة المقررة',
            content: lesData.content || staticMatch?.content || '',
            video_url: lesData.video_url || staticMatch?.video_url || '',
            order_index: lesData.order_index || 1,
            durationMinutes: staticMatch?.durationMinutes || 45,
          });

          const { data: subData } = await supabase
            .from('subjects')
            .select('name')
            .eq('id', lesData.subject_id)
            .single();
          if (subData) setSubjectName(subData.name);

          const { data: fileData } = await supabase
            .from('files')
            .select('*')
            .eq('lesson_id', lessonId);
          setFiles(fileData && fileData.length > 0 ? fileData : staticMatch?.pdf_files || []);

          const { data: sibData } = await supabase
            .from('lessons')
            .select('id, name, order_index')
            .eq('subject_id', lesData.subject_id)
            .order('order_index', { ascending: true });
          setSiblingLessons(sibData && sibData.length > 0 ? sibData : CURRICULUM_LESSONS.filter(l => l.subject_id === lesData.subject_id));
        } else {
          // Fallback to static verified curriculum dataset
          const staticLesson = CURRICULUM_LESSONS.find((l) => l.id === lessonId) || CURRICULUM_LESSONS[0];
          setLesson(staticLesson);
          const staticSubject = CURRICULUM_SUBJECTS.find((s) => s.id === staticLesson.subject_id);
          setSubjectName(staticSubject?.name || 'المادة المقررة');
          setFiles(staticLesson.pdf_files || []);
          setSiblingLessons(
            CURRICULUM_LESSONS.filter((l) => l.subject_id === staticLesson.subject_id).map((l) => ({
              id: l.id,
              name: l.name,
              order_index: l.order_index,
            }))
          );
        }

        if (user) {
          const { data: bData } = await supabase
            .from('bookmarks')
            .select('id')
            .eq('user_id', user.id)
            .eq('target_type', 'lesson')
            .eq('target_id', Number(lessonId))
            .maybeSingle();

          if (bData) {
            setIsBookmarked(true);
            setBookmarkId(bData.id);
          }
        }
      } catch (err) {
        console.error('Error fetching lesson data:', err);
        // Fallback
        const staticLesson = CURRICULUM_LESSONS.find((l) => l.id === lessonId) || CURRICULUM_LESSONS[0];
        setLesson(staticLesson);
        const staticSubject = CURRICULUM_SUBJECTS.find((s) => s.id === staticLesson.subject_id);
        setSubjectName(staticSubject?.name || 'المادة');
        setFiles(staticLesson.pdf_files || []);
        setSiblingLessons(
          CURRICULUM_LESSONS.filter((l) => l.subject_id === staticLesson.subject_id).map((l) => ({
            id: l.id,
            name: l.name,
            order_index: l.order_index,
          }))
        );
      } finally {
        setDbLoading(false);
      }
    }

    fetchLessonData();
  }, [user, lessonId]);

  const handleToggleBookmark = async () => {
    if (!user) return;
    try {
      if (isBookmarked && bookmarkId) {
        await supabase.from('bookmarks').delete().eq('id', bookmarkId);
        setIsBookmarked(false);
        setBookmarkId(null);
      } else {
        const { data, error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            target_type: 'lesson',
            target_id: Number(lessonId),
          })
          .select('id')
          .single();
        if (!error && data) {
          setIsBookmarked(true);
          setBookmarkId(data.id);
        }
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
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

  if (!lesson) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 px-6 bg-white text-center text-[#282825]">
        <h2 className="text-4xl font-display font-normal">الدرس غير موجود</h2>
        <p className="text-xs text-[#6e6e67] mt-2">الرجاء العودة إلى المواد المقررة.</p>
        <Link
          href="/subjects"
          className="mt-6 student-panel rounded-full px-8 py-3 text-xs font-medium text-[#282825] hover:scale-105 transition-transform border border-[#282825]"
        >
          العودة للمواد
        </Link>
      </div>
    );
  }

  const embedUrl = getYoutubeEmbedUrl(lesson.video_url);

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="mx-auto flex h-full w-full max-w-[1180px] flex-col gap-5 lg:flex-row">
        {/* Central Content Area */}
        <section className="app-card flex flex-1 flex-col gap-7 overflow-y-auto bg-white p-5 text-right sm:p-7">
          {/* Breadcrumbs */}
          <div className="flex w-full items-center justify-between border-b border-[#deddd7] pb-4">
            <div className="flex items-center gap-2 text-xs text-[#6e6e67] truncate">
              <Link href="/dashboard" className="hover:text-[#282825] transition-colors">
                لوحة التحكم
              </Link>
              <span>/</span>
              <Link href={`/subjects/${lesson.subject_id}`} className="hover:text-[#282825] transition-colors truncate">
                {subjectName || 'المادة'}
              </Link>
              <span>/</span>
              <span className="text-[#282825] font-medium truncate">{lesson.name}</span>
            </div>

            <Link
              href={`/subjects/${lesson.subject_id}`}
              className="app-button app-button-secondary min-h-9 rounded-xl px-4 py-2 text-xs"
            >
              ← العودة للمادة
            </Link>
          </div>

          {/* Lesson Title Banner */}
          <div className="flex flex-col gap-4 border-b border-[#deddd7] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="app-chip bg-[#ffd64d]">
                {lesson.unit || 'الشرح المرئي والملاحظات الوزارية'}
              </span>
              <h1 className="mt-3 text-3xl font-extrabold leading-snug sm:text-4xl">{lesson.name}</h1>
            </div>

            <button
              onClick={handleToggleBookmark}
              className={`app-button app-button-secondary shrink-0 text-xs ${isBookmarked ? 'bg-[#ffd64d]' : ''}`}
            >
              {isBookmarked ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> محفوظ في مفضلتك
                </>
              ) : (
                <>
                  <Star className="w-3.5 h-3.5 text-amber-400" /> حفظ في المفضلة
                </>
              )}
            </button>
          </div>

          {/* Embedded Real YouTube Video Player */}
          {embedUrl ? (
            <div className="space-y-3">
              <div className="relative aspect-video overflow-hidden rounded-[24px] border-2 border-[#282825] bg-black">
                <iframe
                  src={embedUrl}
                  title={lesson.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                ></iframe>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#282825] bg-[#bce9fa] p-4 text-xs">
                <div className="flex items-center gap-2 text-[#171714] font-bold">
                  <Video className="w-4 h-4 text-[#ff5636] shrink-0" />
                  <span>شاهد الفيديو المباشر أو ابحث عن كافة شروحات أساتذة البكالوريا لهذا الدرس:</span>
                </div>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent('شرح بكالوريا سوريا ' + lesson.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-[#ff5636] hover:bg-[#ff5636] hover:text-white transition-all border border-[#282825] inline-flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  🔍 البحث المباشر في يوتيوب عن «{lesson.name}»
                </a>
              </div>
            </div>
          ) : (
            <div className="student-card rounded-3xl p-8 text-center space-y-4 border-2 border-[#282825] bg-white">
              <p className="text-[#171714] text-sm font-bold">شاهد كافة الشروحات المرئية المطابقة لـ «{lesson.name}» على يوتيوب:</p>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent('شرح بكالوريا سوريا ' + lesson.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 app-button px-8 py-3 text-xs font-extrabold text-white"
              >
                مشاهدة الشروحات المطابقة للدرس على يوتيوب 🔍 <Video className="w-4 h-4 text-white" />
              </a>
            </div>
          )}

          {/* Detailed Verified Lesson Notes */}
          {lesson.content && (
            <div className="rounded-[24px] border-2 border-[#282825] bg-[#f4f3ee] p-6 text-right sm:p-8 space-y-4 shadow-sm">
              <h3 className="text-2xl font-extrabold text-[#171714] border-b border-[#deddd7] pb-3">
                شرح الملاحظات والاستنتاجات الهامة
              </h3>
              <div className="text-sm sm:text-base text-[#171714] font-semibold leading-relaxed whitespace-pre-wrap font-sans">
                {lesson.content}
              </div>
            </div>
          )}

          {/* PDF Files & Summaries */}
          <div className="space-y-6 pt-4 border-t border-[#deddd7]">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#171714]">الملخصات وأوراق العمل</h3>
            {files.length === 0 ? (
              <p className="text-xs font-bold text-[#171714] bg-[#fafaf7] p-6 rounded-2xl border-2 border-dashed border-[#282825]">
                لا توجد ملفات مرفقة بهذا الدرس حالياً.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between student-panel rounded-2xl p-5 border border-[#282825] hover:scale-[1.02] transition-transform group"
                  >
                    <div className="space-y-1 text-right min-w-0 pr-2">
                      <h4 className="font-display font-normal text-[#282825] text-base truncate">{file.name}</h4>
                      <span className="text-[10px] text-[#e94225] bg-[#bce9fa] border border-[#282825] px-2.5 py-0.5 rounded-full inline-block">
                        PDF
                      </span>
                    </div>

                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="student-panel rounded-full px-5 py-2 text-xs font-medium text-[#282825] hover:scale-105 transition-transform border border-[#282825] shrink-0 flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#e94225]" /> تحميل
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Sidebar (Sibling Lessons Navigation) */}
        <section className="app-card flex w-full shrink-0 flex-col gap-5 overflow-y-auto bg-white p-5 text-right lg:w-96">
          <div className="border-b border-[#deddd7] pb-4">
            <h4 className="text-2xl font-extrabold">دروس الوحدة الحالية</h4>
          </div>

          <div className="space-y-3">
            {siblingLessons.map((sib, index) => {
              const isCurrent = sib.id === lesson.id;
              return (
                <Link
                  key={sib.id}
                  href={`/lessons/${sib.id}`}
                  className={`flex items-center gap-4 w-full text-right rounded-2xl p-4 transition-transform hover:scale-[1.02] border ${isCurrent
                      ? 'border-[#282825] bg-[#ffd64d] font-bold'
                      : 'border-[#deddd7] bg-[#fafaf7] text-[#6e6e67] hover:border-[#282825]'
                    }`}
                >
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center font-display font-bold text-xs shrink-0 ${isCurrent
                        ? 'bg-[#bce9fa] text-[#e94225] border border-[#282825]'
                        : 'bg-[#f0efe9] text-[#6e6e67]'
                      }`}
                  >
                    {index + 1}
                  </span>
                  <span className="font-display text-base truncate">{sib.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </SidebarLayout>
  );
}
