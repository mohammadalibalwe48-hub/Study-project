'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { Check, Star, Video } from 'lucide-react';

interface Lesson {
  id: number;
  subject_id: number;
  name: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
}

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

function getYoutubeEmbedUrl(url: string | null) {
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
  const { id: lessonId } = use(params);
  const { user, profile, loading, signOut } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
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
        const { data: lesData, error: lesErr } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', lessonId)
          .single();
        if (lesErr) throw lesErr;
        setLesson(lesData);

        if (lesData) {
          const { data: subData } = await supabase
            .from('subjects')
            .select('name')
            .eq('id', lesData.subject_id)
            .single();
          if (subData) setSubjectName(subData.name);

          const { data: fileData, error: fileErr } = await supabase
            .from('files')
            .select('*')
            .eq('lesson_id', lessonId);
          if (!fileErr) setFiles(fileData || []);

          const { data: sibData, error: sibErr } = await supabase
            .from('lessons')
            .select('id, name, order_index')
            .eq('subject_id', lesData.subject_id)
            .order('order_index', { ascending: true });
          if (!sibErr) setSiblingLessons(sibData || []);

          if (user) {
            const { data: bData } = await supabase
              .from('bookmarks')
              .select('id')
              .eq('user_id', user.id)
              .eq('item_type', 'lesson')
              .eq('item_id', Number(lessonId))
              .maybeSingle();

            if (bData) {
              setIsBookmarked(true);
              setBookmarkId(bData.id);
            } else {
              setIsBookmarked(false);
              setBookmarkId(null);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching lesson data:', err);
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
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', bookmarkId);
        if (error) throw error;
        setIsBookmarked(false);
        setBookmarkId(null);
      } else {
        const { data, error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            item_type: 'lesson',
            item_id: Number(lessonId),
          })
          .select('id')
          .single();
        if (error) throw error;
        setIsBookmarked(true);
        setBookmarkId(data.id);
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

  const embedUrl = getYoutubeEmbedUrl(lesson.video_url);

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full w-full">
        
        {/* Central Content Area */}
        <section className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 overflow-y-auto text-right border border-white/15">
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
                الشرح المرئي والملاحظات
              </span>
              <h1 className="text-4xl sm:text-5xl font-display font-normal text-foreground mt-3">{lesson.name}</h1>
            </div>
            
            <button
              onClick={handleToggleBookmark}
              className={`liquid-glass-glow rounded-full px-6 py-3 text-xs font-medium transition-all shrink-0 border border-cyan-400/40 cursor-pointer flex items-center gap-1.5 ${
                isBookmarked ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' : 'text-foreground'
              }`}
            >
              {isBookmarked ? (
                <><Check className="w-3.5 h-3.5 text-emerald-400" /> محفوظ في مفضلتك</>
              ) : (
                <><Star className="w-3.5 h-3.5 text-amber-400" /> حفظ في المفضلة</>
              )}
            </button>
          </div>

          {/* Embedded Video */}
          {embedUrl ? (
            <div className="overflow-hidden rounded-3xl border border-white/15 bg-black aspect-video shadow-2xl">
              <iframe
                src={embedUrl}
                title={lesson.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              ></iframe>
            </div>
          ) : lesson.video_url ? (
            <div className="liquid-glass rounded-3xl p-8 text-center space-y-4 border border-white/10">
              <p className="text-foreground text-sm font-medium">شاهد الفيديو التوضيحي للدرس على يوتيوب:</p>
              <a
                href={lesson.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 liquid-glass-glow rounded-full px-8 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40"
              >
                مشاهدة الفيديو على يوتيوب <Video className="w-4 h-4 text-cyan-400" />
              </a>
            </div>
          ) : null}

          {/* Notes */}
          {lesson.content && (
            <div className="liquid-glass rounded-3xl p-8 space-y-4 border border-white/10 text-right">
              <h3 className="text-2xl font-display font-normal text-foreground border-b border-white/10 pb-3">ملاحظات وشروحات الدرس</h3>
              <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {lesson.content}
              </div>
            </div>
          )}

          {/* PDF Files */}
          <div className="space-y-6 pt-4 border-t border-white/10">
            <h3 className="text-3xl font-display font-normal text-foreground">الملخصات وأوراق العمل</h3>
            {files.length === 0 ? (
              <p className="text-xs text-muted-foreground liquid-glass p-6 rounded-2xl border border-white/10">لا توجد ملفات مرفقة بهذا الدرس حالياً.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between liquid-glass-glow rounded-2xl p-5 border border-white/15 hover:scale-[1.02] transition-transform group"
                  >
                    <div className="space-y-1 text-right">
                      <h4 className="font-display font-normal text-foreground text-lg truncate">{file.name}</h4>
                      <span className="text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-2.5 py-0.5 rounded-full inline-block">PDF</span>
                    </div>
                    
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="liquid-glass-glow rounded-full px-5 py-2 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 shrink-0"
                    >
                      تحميل ↓
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
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center font-display font-bold text-xs ${
                    isCurrent ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'bg-white/5 text-muted-foreground'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="font-display text-lg truncate">{sib.name}</span>
                </Link>
              );
            })}
          </div>
        </section>

      </div>
    </SidebarLayout>
  );
}
