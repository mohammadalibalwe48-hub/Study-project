'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { BookOpen, Video, Check, Pencil, Trash2, Plus } from 'lucide-react';

interface Subject {
  id: number;
  name: string;
  branches?: {
    name: string;
  };
}

interface Lesson {
  id: number;
  subject_id: number;
  name: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  subjects?: {
    name: string;
  };
}

interface FileItem {
  id: number;
  lesson_id: number;
  name: string;
  file_url: string;
}

export default function AdminLessonsPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonFiles, setLessonFiles] = useState<Record<number, FileItem[]>>({});
  const [dbLoading, setDbLoading] = useState(true);
  const router = useRouter();

  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number>(0);
  const [name, setName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [content, setContent] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

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

      const { data: lesData } = await supabase
        .from('lessons')
        .select(`
          id,
          subject_id,
          name,
          content,
          video_url,
          order_index,
          subjects (
            name
          )
        `)
        .order('order_index', { ascending: true });

      const formattedLessons = (lesData || []).map((les: any) => ({
        ...les,
        subjects: Array.isArray(les.subjects) ? les.subjects[0] : les.subjects,
      }));
      setLessons(formattedLessons);

      const { data: fileData } = await supabase.from('files').select('*');
      const fileMap: Record<number, FileItem[]> = {};
      (fileData || []).forEach((f: FileItem) => {
        if (!fileMap[f.lesson_id]) fileMap[f.lesson_id] = [];
        fileMap[f.lesson_id].push(f);
      });
      setLessonFiles(fileMap);
    } catch (err) {
      console.error('Error fetching lessons:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchData();
    }
  }, [user, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || subjectId === 0) return;

    setActionLoading(true);
    try {
      if (editingLessonId) {
        const { error } = await supabase
          .from('lessons')
          .update({
            subject_id: subjectId,
            name,
            video_url: videoUrl || null,
            content: content || null,
            order_index: orderIndex,
          })
          .eq('id', editingLessonId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('lessons').insert({
          subject_id: subjectId,
          name,
          video_url: videoUrl || null,
          content: content || null,
          order_index: orderIndex,
        });

        if (error) throw error;
      }

      setName('');
      setVideoUrl('');
      setContent('');
      setOrderIndex(0);
      setEditingLessonId(null);
      await fetchData();
    } catch (err: any) {
      console.error('Error saving lesson:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (les: Lesson) => {
    setEditingLessonId(les.id);
    setSubjectId(les.subject_id);
    setName(les.name);
    setVideoUrl(les.video_url || '');
    setContent(les.content || '');
    setOrderIndex(les.order_index || 0);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدرس وكافة الملفات المرتبطة به؟')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting lesson:', err);
    } finally {
      setActionLoading(false);
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
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-cyan-300 border border-cyan-400/20 uppercase inline-block">
              إدارة الدروس التعليمية
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3 flex items-center gap-3">
              الدروس والمرفقات <BookOpen className="w-8 h-8 text-cyan-300" />
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              إضافة وتحديث الدروس المرئية، ترتيب الفصول، ورفع الملفات والشروحات.
            </p>
          </div>

          <Link
            href="/admin"
            className="liquid-glass rounded-full px-6 py-2.5 text-xs text-foreground hover:scale-105 transition-transform"
          >
            ← العودة لمركز الإدارة
          </Link>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="liquid-glass rounded-3xl p-6 border border-white/15 space-y-4">
          <h3 className="text-2xl font-display text-foreground border-b border-white/10 pb-3">
            {editingLessonId ? 'تعديل الدرس' : 'إضافة درس جديد'}
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
              <label className="text-xs text-muted-foreground">عنوان الدرس</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: الدرس الأول - التوازن الكيميائي"
                className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1 sm:col-span-3">
              <label className="text-xs text-muted-foreground">رابط الفيديو (YouTube / MP4)</label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/..."
                className="w-full text-left liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ترتيب الترتيب</label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(Number(e.target.value))}
                className="w-full text-center liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">نص الشرح والنظريات</label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب تفاصيل الدرس والقوانين المفتاحية..."
              className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {editingLessonId && (
              <button
                type="button"
                onClick={() => {
                  setEditingLessonId(null);
                  setName('');
                  setVideoUrl('');
                  setContent('');
                }}
                className="liquid-glass rounded-full px-6 py-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                إلغاء التعديل
              </button>
            )}
            <button
              type="submit"
              disabled={actionLoading}
              className="liquid-glass-glow rounded-full px-8 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer flex items-center gap-1.5"
            >
              {actionLoading ? 'جاري الحفظ...' : editingLessonId ? <>تحديث الدرس <Check className="w-3.5 h-3.5 text-emerald-400" /></> : <>حفظ الدرس الجديد <Plus className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </form>

        {/* Lessons List */}
        <div className="space-y-4">
          <h3 className="text-2xl font-display text-foreground">قائمة الدروس المسجلة ({lessons.length})</h3>

          <div className="space-y-3">
            {lessons.map((les) => (
              <div key={les.id} className="liquid-glass rounded-2xl p-5 border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1 text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-2.5 py-0.5 rounded-full">
                      {les.subjects?.name || 'مادة عامة'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">ترتيب: #{les.order_index}</span>
                  </div>
                  <h4 className="text-lg font-display text-foreground">{les.name}</h4>
                  {les.video_url && <span className="text-[11px] text-emerald-400 flex items-center gap-1"><Video className="w-3.5 h-3.5 text-emerald-400" /> يحتوي فيديو شرح</span>}
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(les)}
                    className="liquid-glass rounded-full px-4 py-1.5 text-xs text-cyan-300 border border-white/5 hover:border-cyan-400/40 flex items-center gap-1 cursor-pointer"
                  >
                    تعديل <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(les.id)}
                    className="liquid-glass rounded-full px-4 py-1.5 text-xs text-rose-400 border border-white/5 hover:border-rose-500/40 flex items-center gap-1 cursor-pointer"
                  >
                    حذف <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </SidebarLayout>
  );
}
