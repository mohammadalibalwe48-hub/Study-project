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
import { MessageSquare, Plus, Sparkles, UserRound, BookOpen, Send } from 'lucide-react';

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
      <main className="mx-auto w-full max-w-[1180px] space-y-8 text-right bg-dot-pattern py-4">
        
        {/* Top Header & Action */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between border-b-2 border-[#282825] pb-6">
          <div className="space-y-3">
            <span className="app-chip bg-[#ffd64d] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
              <MessageSquare className="h-4 w-4 text-[#ff5636]" /> مجتمع التبادل والأسئلة
            </span>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl text-[#282825]">
              المنتدى التعليمي والمناقشات
            </h1>
            <p className="text-[#5f5f59] text-sm max-w-xl leading-relaxed font-semibold">
              اطرح أسئلتك حول المنهاج، تبادل الشروحات مع زملائك، واحصل على إجابات واضحة من مجتمع مسار.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="app-button border-2 border-[#282825] bg-[#ff5636] text-white shadow-[3.5px_3.5px_0_#282825] hover:shadow-[5px_5px_0_#282825] hover:-translate-y-0.5 transition-all text-xs font-black px-6 py-3 flex items-center gap-2 shrink-0"
          >
            <span>{showForm ? 'إغلاق النموذج' : 'طرح سؤال جديد'}</span>
            <Plus className="h-4 w-4 stroke-[3px]" />
          </button>
        </div>

        {/* Ask Question Form */}
        {showForm && (
          <form onSubmit={handleSubmitQuestion} className="rounded-2xl border-2 border-[#282825] bg-white p-6 sm:p-8 shadow-[6px_6px_0_#282825] space-y-6 bg-dot-pattern-dense">
            <div className="border-b-2 border-[#282825]/10 pb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#282825] bg-[#ffd64d] shadow-[2px_2px_0_#282825]">
                <ChatIcon className="w-5 h-5 text-[#282825]" />
              </span>
              <h3 className="font-black text-xl text-[#282825]">
                اطرح سؤالك الدراسي للمناقشة:
              </h3>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-[#282825]">المادة المرتبطة</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(Number(e.target.value))}
                className="w-full rounded-xl border-2 border-[#282825] bg-white p-3.5 text-[#282825] text-sm font-bold shadow-[2px_2px_0_#282825] focus:outline-none focus:border-[#ff5636]"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id} className="bg-white text-[#282825]">
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-[#282825]">عنوان السؤال</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: استفسار حول تطبيقات الاشتقاق في الرياضيات"
                className="w-full rounded-xl border-2 border-[#282825] bg-white p-3.5 text-[#282825] text-sm font-semibold placeholder-[#77776f] shadow-[2px_2px_0_#282825] focus:outline-none focus:border-[#ff5636]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-[#282825]">تفاصيل السؤال وصيغته</label>
              <textarea
                rows={5}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="اكتب تفاصيل سؤالك هنا..."
                className="w-full rounded-xl border-2 border-[#282825] bg-white p-3.5 text-[#282825] text-sm font-semibold placeholder-[#77776f] shadow-[2px_2px_0_#282825] focus:outline-none focus:border-[#ff5636]"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="app-button w-full border-2 border-[#282825] bg-[#ff5636] text-white py-4 text-sm font-black shadow-[4px_4px_0_#282825] hover:shadow-[6px_6px_0_#282825] hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{actionLoading ? 'جاري النشر...' : 'نشر السؤال للمناقشة (+15 XP)'}</span>
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Posts list */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#282825]">المناقشات والأسئلة الحالية</h2>
            <span className="app-chip bg-[#bce9fa] border border-[#282825] text-xs font-black shadow-[1.5px_1.5px_0_#282825]">
              {posts.length} سؤال مطروح
            </span>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[#282825] bg-white p-12 text-center text-[#5f5f59] text-sm font-black shadow-[4px_4px_0_#282825]">
              لا توجد أسئلة أو نقاشات مطروحة بعد. كن أول من يطرح سؤالاً!
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/forum/${post.id}`}
                  className="block rounded-2xl border-2 border-[#282825] bg-white p-6 shadow-[4px_4px_0_#282825] hover:shadow-[6px_6px_0_#282825] hover:-translate-y-0.5 transition-all group text-right cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#282825]/10 pb-3">
                      <span className="app-chip bg-[#ffd64d] border border-[#282825] px-3 py-0.5 text-[11px] font-black shadow-[1.5px_1.5px_0_#282825]">
                        {post.subjects?.name}
                      </span>
                      <span className="text-xs font-black text-[#5f5f59] flex items-center gap-1.5 bg-[#f4f3ee] border border-[#282825]/20 px-3 py-1 rounded-lg">
                        <UserRound className="h-3.5 w-3.5 text-[#ff5636]" />
                        <span>بواسطة: {post.users?.full_name || 'طالب مسار'}</span>
                      </span>
                    </div>
                    
                    <h3 className="font-black text-2xl text-[#282825] group-hover:text-[#ff5636] transition-colors leading-snug">
                      {post.title}
                    </h3>
                    
                    <p className="text-[#5f5f59] text-xs font-semibold leading-relaxed line-clamp-2">
                      {post.content}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </SidebarLayout>
  );
}
