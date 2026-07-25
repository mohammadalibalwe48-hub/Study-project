'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { ListSkeleton } from '@/components/SkeletonLoader';
import { Trash2 } from 'lucide-react';

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
      <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 overflow-y-auto text-right border border-white/15">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/10 pb-6">
          <div>
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-rose-400 border border-rose-400/20 uppercase inline-block">
              المكتبة الخاصة
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3">
              المحفوظات والدروس المرجعية
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              مكان واحد يجمع كافة الدروس والاستفسارات والملاحظات التي قمت بحفظها للمراجعة السريعة.
            </p>
          </div>

          <div className="liquid-glass rounded-2xl p-4 border border-white/10 text-center shrink-0">
            <span className="text-xs text-muted-foreground block">إجمالي المحفوظات</span>
            <span className="text-2xl font-display text-rose-400">{bookmarks.length} عنصر</span>
          </div>
        </div>

        {/* Bookmarks Grid */}
        {bookmarks.length === 0 ? (
          <div className="liquid-glass rounded-3xl p-16 text-center text-muted-foreground text-sm border border-white/10">
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
                  className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between hover:scale-[1.02] transition-all group"
                >
                  <div className="space-y-4 text-right">
                    <div className="flex justify-between items-center">
                      <span className={`text-[11px] px-3 py-1 rounded-full border ${
                        isLesson ? 'bg-cyan-500/10 text-cyan-300 border-cyan-400/20' : 'bg-purple-500/10 text-purple-300 border-purple-400/20'
                      }`}>
                        {isLesson ? 'درس مرئي' : 'استفسار منتدى'}
                      </span>
                      {bm.details?.subjectName && (
                        <span className="text-xs text-muted-foreground bg-white/5 px-2.5 py-0.5 rounded-full">
                          {bm.details.subjectName}
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl font-display font-normal text-foreground group-hover:text-cyan-200 transition-colors">
                      {bm.details?.title || 'عنصر محفوظ'}
                    </h3>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                    <button
                      onClick={() => handleRemoveBookmark(bm.id)}
                      className="text-xs text-muted-foreground hover:text-rose-400 p-2 flex items-center gap-1 cursor-pointer"
                    >
                      إلغاء الحفظ <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <Link
                      href={targetUrl}
                      className="liquid-glass-glow rounded-full px-5 py-2 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40"
                    >
                      عرض المحتوى ←
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </SidebarLayout>
  );
}
