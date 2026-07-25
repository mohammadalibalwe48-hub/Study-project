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
      <div className="flex-1 flex flex-col justify-center items-center py-20 px-6 bg-[#001420] text-center text-foreground">
        <h2 className="text-4xl font-display font-normal">الدرس غير موجود</h2>
        <p className="text-xs text-muted-foreground mt-2">الرجاء العودة إلى المواد المقررة.</p>
        <Link
          href="/subjects"
          className="mt-6 liquid-glass-glow rounded-full px-8 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40"
        >
          العودة للمواد
        </Link>
      </div>
    );
  }

  const embedUrl = getYoutubeEmbedUrl(lesson.video_url);

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full w-full">
        {/* Central Content Area */}
        <section className="flex-1 liquid-glass-glow rounded-3xl p-6 sm:p-8 flex flex-col gap-8 overflow-y-auto text-right border border-white/15">
          {/* Breadcrumbs */}
          <div className="flex items-center justify-between w-full border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                لوحة التحكم
              </Link>
              <span>/</span>
              <Link href={`/subjects/${lesson.subject_id}`} className="hover:text-foreground transition-colors truncate">
                {subjectName || 'المادة'}
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium truncate">{lesson.name}</span>
            </div>

            <Link
              href={`/subjects/${lesson.subject_id}`}
              className="liquid-glass rounded-full px-5 py-2 text-xs text-foreground hover:scale-105 transition-transform"
            >
              ← العودة للمادة
            </Link>
          </div>

          {/* Lesson Title Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6 gap-4">
            <div>
              <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3.5 py-1 rounded-full inline-block font-medium">
                {lesson.unit || 'الشرح المرئي والملاحظات الوزارية'}
              </span>
              <h1 className="text-3xl sm:text-4xl font-display font-normal text-foreground mt-3 leading-snug">{lesson.name}</h1>
            </div>

            <button
              onClick={handleToggleBookmark}
              className={`liquid-glass-glow rounded-full px-6 py-3 text-xs font-medium transition-all shrink-0 border border-cyan-400/40 cursor-pointer flex items-center gap-1.5 ${
                isBookmarked ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' : 'text-foreground'
              }`}
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
              <div className="overflow-hidden rounded-3xl border border-cyan-500/30 bg-black aspect-video shadow-2xl relative group">
                <iframe
                  src={embedUrl}
                  title={lesson.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                ></iframe>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 p-4 rounded-2xl border border-white/10 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Video className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>شاهد الفيديو المباشر أو ابحث عن كافة شروحات أساتذة البكالوريا لهذا الدرس:</span>
                </div>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent('شرح بكالوريا سوريا ' + lesson.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="liquid-glass-glow rounded-xl px-4 py-2 text-xs font-bold text-cyan-300 hover:text-white transition border border-cyan-400/40 inline-flex items-center gap-1.5 shrink-0"
                >
                  🔍 البحث المباشر في يوتيوب عن «{lesson.name}»
                </a>
              </div>
            </div>
          ) : (
            <div className="liquid-glass rounded-3xl p-8 text-center space-y-4 border border-white/10">
              <p className="text-foreground text-sm font-medium">شاهد كافة الشروحات المرئية المطابقة لـ «{lesson.name}» على يوتيوب:</p>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent('شرح بكالوريا سوريا ' + lesson.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 liquid-glass-glow rounded-full px-8 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40"
              >
                مشاهدة الشروحات المطابقة للدرس على يوتيوب 🔍 <Video className="w-4 h-4 text-cyan-400" />
              </a>
            </div>
          )}

          {/* Detailed Verified Lesson Notes */}
          {lesson.content && (
            <div className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10 text-right">
              <h3 className="text-2xl font-display font-normal text-foreground border-b border-white/10 pb-3">
                شرح الملاحظات والاستنتاجات الهامة
              </h3>
              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                {lesson.content}
              </div>
            </div>
          )}

          {/* PDF Files & Summaries */}
          <div className="space-y-6 pt-4 border-t border-white/10">
            <h3 className="text-2xl sm:text-3xl font-display font-normal text-foreground">الملخصات وأوراق العمل</h3>
            {files.length === 0 ? (
              <p className="text-xs text-muted-foreground liquid-glass p-6 rounded-2xl border border-white/10">
                لا توجد ملفات مرفقة بهذا الدرس حالياً.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between liquid-glass-glow rounded-2xl p-5 border border-white/15 hover:scale-[1.02] transition-transform group"
                  >
                    <div className="space-y-1 text-right min-w-0 pr-2">
                      <h4 className="font-display font-normal text-foreground text-base truncate">{file.name}</h4>
                      <span className="text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-2.5 py-0.5 rounded-full inline-block">
                        PDF
                      </span>
                    </div>

                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="liquid-glass-glow rounded-full px-5 py-2 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 shrink-0 flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" /> تحميل
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Sidebar (Sibling Lessons Navigation) */}
        <section className="w-full lg:w-96 shrink-0 liquid-glass-glow rounded-3xl p-6 flex flex-col gap-6 overflow-y-auto text-right border border-white/15">
          <div className="border-b border-white/10 pb-4">
            <h4 className="font-display text-2xl text-foreground">دروس الوحدة الحالية</h4>
          </div>

          <div className="space-y-3">
            {siblingLessons.map((sib, index) => {
              const isCurrent = sib.id === lesson.id;
              return (
                <Link
                  key={sib.id}
                  href={`/lessons/${sib.id}`}
                  className={`flex items-center gap-4 w-full text-right rounded-2xl p-4 transition-transform hover:scale-[1.02] border ${
                    isCurrent
                      ? 'liquid-glass-glow text-foreground border-cyan-400/40 font-medium'
                      : 'liquid-glass text-muted-foreground hover:text-foreground border-white/5'
                  }`}
                >
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center font-display font-bold text-xs shrink-0 ${
                      isCurrent
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                        : 'bg-white/5 text-muted-foreground'
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
