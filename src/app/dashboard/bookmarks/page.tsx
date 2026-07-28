'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { ListSkeleton } from '@/components/SkeletonLoader';
import { Trash2, Bookmark, ArrowLeft } from 'lucide-react';

interface BookmarkedItem {
  id: number;
  item_type: 'lesson' | 'post';
  item_id: number;
  details?: {
    title: string;
    subjectName?: string;
    subjectId?: number;
  } | null;
}

export default function BookmarksHubPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkedItem[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  const fetchBookmarks = async () => {
    if (!user) return;
    try {
      setDbLoading(true);

      const { data: bData, error: bErr } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id);

      if (bErr) throw bErr;

      const formattedBookmarks: BookmarkedItem[] = [];

      for (const item of (bData || [])) {
        let details: any = null;

        if (item.item_type === 'lesson') {
          const { data: lesData } = await supabase
            .from('lessons')
            .select(`
              name,
              subject_id,
              subjects (
                name
              )
            `)
            .eq('id', item.item_id)
            .single();

          if (lesData) {
            const subjectObj = Array.isArray(lesData.subjects) ? lesData.subjects[0] : lesData.subjects;
            details = {
              title: lesData.name,
              subjectName: subjectObj?.name || 'مادة عامة',
              subjectId: lesData.subject_id,
            };
          }
        } else if (item.item_type === 'post') {
          const { data: postData } = await supabase
            .from('forum_posts')
            .select(`
              title,
              subject_id,
              subjects (
                name
              )
            `)
            .eq('id', item.item_id)
            .single();

          if (postData) {
            const subjectObj = Array.isArray(postData.subjects) ? postData.subjects[0] : postData.subjects;
            details = {
              title: postData.title,
              subjectName: subjectObj?.name || 'منتدى عام',
              subjectId: postData.subject_id,
            };
          }
        }

        formattedBookmarks.push({
          id: item.id,
          item_type: item.item_type,
          item_id: item.item_id,
          details,
        });
      }

      setBookmarks(formattedBookmarks);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBookmarks();
    }
  }, [user]);

  const handleRemoveBookmark = async (bookmarkId: number) => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (error) throw error;
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    } catch (err) {
      console.error('Error removing bookmark:', err);
    }
  };

  if (loading || dbLoading) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="p-8">
          <ListSkeleton count={4} />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <main className="mx-auto w-full max-w-[1180px] space-y-8 text-right bg-dot-pattern py-4" dir="rtl">
        
        {/* Header */}
        <div className="flex flex-col gap-4 border-b-2 border-[#282825] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="app-chip bg-[#ff5636] text-white border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
              <Bookmark className="h-4 w-4" /> المكتبة الخاصة والمحفوظات
            </span>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl text-[#282825]">
              المحفوظات والدروس المرجعية
            </h1>
            <p className="text-[#5f5f59] text-sm max-w-xl leading-relaxed font-semibold mt-1">
              مكان واحد يجمع كافة الدروس والاستفسارات والملاحظات التي قمت بحفظها للمراجعة السريعة.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[#282825] bg-[#ffd64d] p-4 text-center shadow-[4px_4px_0_#282825] min-w-44 shrink-0">
            <span className="text-xs font-black text-[#282825] block">إجمالي العناصر المحفوظة</span>
            <span className="text-3xl font-black text-[#282825]">{bookmarks.length} عنصر</span>
          </div>
        </div>

        {/* Bookmarks Grid */}
        {bookmarks.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#282825] bg-white p-16 text-center text-[#5f5f59] text-sm font-black shadow-[4px_4px_0_#282825]">
            لم تقم بحفظ أي دروس أو استفسارات في مفضلتك بعد.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bookmarks.map((bm) => {
              const isLesson = bm.item_type === 'lesson';
              const targetUrl = isLesson ? `/lessons/${bm.item_id}` : `/forum/${bm.item_id}`;

              return (
                <div
                  key={bm.id}
                  className="rounded-2xl border-2 border-[#282825] bg-white p-6 shadow-[5px_5px_0_#282825] flex flex-col justify-between hover:scale-[1.01] transition-all group"
                >
                  <div className="space-y-4 text-right">
                    <div className="flex justify-between items-center">
                      <span className={`app-chip border border-[#282825] px-3 py-1 text-[11px] font-black shadow-[1.5px_1.5px_0_#282825] ${
                        isLesson ? 'bg-[#bce9fa]' : 'bg-[#d8bcff]'
                      }`}>
                        {isLesson ? 'درس مرئي 📹' : 'استفسار منتدى 💬'}
                      </span>
                      {bm.details?.subjectName && (
                        <span className="app-chip bg-[#fafaf7] border border-[#282825] px-3 py-0.5 text-xs font-black shadow-[1.5px_1.5px_0_#282825]">
                          {bm.details.subjectName}
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl font-black text-[#282825] group-hover:text-[#ff5636] transition-colors leading-snug">
                      {bm.details?.title || 'عنصر محفوظ'}
                    </h3>
                  </div>

                  <div className="mt-6 pt-4 border-t-2 border-[#282825]/10 flex justify-between items-center">
                    <button
                      onClick={() => handleRemoveBookmark(bm.id)}
                      className="text-xs font-black text-[#ff5636] hover:underline p-1 flex items-center gap-1 cursor-pointer"
                    >
                      <span>إلغاء الحفظ</span>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <Link
                      href={targetUrl}
                      className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-5 py-2 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[4px_4px_0_#282825] hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
                    >
                      <span>عرض المحتوى</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>
    </SidebarLayout>
  );
}
