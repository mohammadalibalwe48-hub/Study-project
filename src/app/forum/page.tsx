'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { ChatIcon } from '@/components/icons/SvgIcons';
import { ListSkeleton } from '@/components/SkeletonLoader';
import { awardXP, updateStreak, checkAndUnlockBadges } from '@/utils/xpHelper';

interface Subject {
  id: number;
  name: string;
}

interface ForumPost {
  id: number;
  title: string;
  content: string;
  created_at: string;
  users: {
    full_name: string;
  };
  subjects: {
    name: string;
  };
}

export default function ForumPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const router = useRouter();

  // New Post Form State
  const [subjectId, setSubjectId] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  const fetchData = async () => {
    try {
      setDbLoading(true);
      const { data: subData } = await supabase.from('subjects').select('id, name');
      setSubjects(subData || []);
      if (subData && subData.length > 0 && subjectId === 0) {
        setSubjectId(subData[0].id);
      }

      const { data: postsData } = await supabase
        .from('forum_posts')
        .select(`
          id,
          title,
          content,
          created_at,
          users (
            full_name
          ),
          subjects (
            name
          )
        `)
        .order('created_at', { ascending: false });

      setPosts((postsData as any) || []);
    } catch (err) {
      console.error('Error fetching forum data:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !content.trim() || subjectId === 0) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('forum_posts')
        .insert({
          user_id: user.id,
          subject_id: subjectId,
          title,
          content,
        });

      if (error) throw error;
      alert('تم نشر سؤالك بنجاح في منتدى النقاش! حصلت على +15 XP!');

      await awardXP(user.id, 15);
      await updateStreak(user.id);
      await checkAndUnlockBadges(user.id);

      setTitle('');
      setContent('');
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      console.error('Error posting question:', err);
      alert(err.message || 'حدث خطأ أثناء النشر');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || dbLoading) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="p-6">
          <ListSkeleton count={5} />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full w-full">

        {/* Central Content Area */}
        <section className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-6 overflow-y-auto text-right border border-white/15">
          <div className="flex items-center justify-between w-full border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                لوحة التحكم
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">المنتدى التعليمي</span>
            </div>

            <button
              onClick={() => setShowForm(!showForm)}
              className="liquid-glass-glow rounded-full px-6 py-2.5 text-xs text-foreground font-medium hover:scale-105 transition-transform border border-cyan-400/40"
            >
              {showForm ? 'إغلاق النموذج' : 'طرح سؤال جديد +'}
            </button>
          </div>

          <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground">
            المنتدى التعليمي والمناقشات
          </h1>

          {/* Ask Question Form */}
          {showForm && (
            <form onSubmit={handleSubmitQuestion} className="liquid-glass rounded-3xl p-8 border border-white/20 space-y-6 animate-scale-in">
              <h4 className="font-display text-2xl text-foreground border-b border-white/10 pb-4 flex items-center gap-3">
                <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <ChatIcon className="w-5 h-5" />
                </span>
                اطرح سؤالك الدراسي للمناقشة:
              </h4>

              <div className="space-y-2">
                <label className="block text-xs text-muted-foreground font-medium">المادة المرتبطة</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(Number(e.target.value))}
                  className="w-full liquid-glass rounded-2xl p-4 text-foreground text-sm font-medium focus:outline-none focus:border-cyan-400/40"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id} className="bg-[#001420] text-foreground">
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-muted-foreground font-medium">عنوان السؤال</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: استفسار حول تطبيقات الاشتقاق في الرياضيات"
                  className="w-full liquid-glass rounded-2xl p-4 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-cyan-400/40"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-muted-foreground font-medium">تفاصيل السؤال وصيغته</label>
                <textarea
                  rows={5}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="اكتب تفاصيل سؤالك هنا..."
                  className="w-full liquid-glass rounded-2xl p-4 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-cyan-400/40"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="liquid-glass-glow w-full rounded-full py-4 text-sm font-medium text-foreground hover:scale-[1.02] transition-transform border border-cyan-400/40 cursor-pointer"
              >
                {actionLoading ? 'جاري النشر...' : 'نشر السؤال للمناقشة'}
              </button>
            </form>
          )}

          {/* Posts list */}
          <div className="space-y-6 pt-4">
            <h3 className="text-3xl font-display font-normal text-foreground">المناقشات والأسئلة الحالية</h3>

            {posts.length === 0 ? (
              <div className="liquid-glass rounded-3xl p-12 text-center text-muted-foreground text-sm border border-white/10">
                لا توجد أسئلة أو نقاشات مطروحة بعد. كن أول من يطرح سؤالاً!
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/forum/${post.id}`}
                    className="block liquid-glass-glow rounded-3xl p-6 border border-white/15 hover:scale-[1.01] transition-transform group text-right cursor-pointer"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                        <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full">
                          {post.subjects?.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          بواسطة: {post.users?.full_name}
                        </span>
                      </div>
                      <h4 className="font-display font-normal text-foreground text-2xl group-hover:text-cyan-200 transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                        {post.content}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
    </SidebarLayout>
  );
}
