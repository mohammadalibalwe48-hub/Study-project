'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { ListSkeleton } from '@/components/SkeletonLoader';
import { Check, Star, Send } from 'lucide-react';
import { awardXP, updateStreak, checkAndUnlockBadges } from '@/utils/xpHelper';

interface ForumPostDetail {
  id: number;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  users: {
    full_name: string;
  };
  subjects: {
    name: string;
  };
}

interface ForumReply {
  id: number;
  content: string;
  created_at: string;
  users: {
    full_name: string;
  };
}

export default function ForumPostDetailsPage() {
  const { user, profile, loading, signOut } = useAuth();
  const params = useParams();
  const router = useRouter();
  const postId = Number(params?.id);

  const [post, setPost] = useState<ForumPostDetail | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Form State
  const [replyContent, setReplyContent] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  const fetchPostAndReplies = async () => {
    if (isNaN(postId) || !user) return;
    try {
      setDbLoading(true);
      const { data: postData, error: postErr } = await supabase
        .from('forum_posts')
        .select(`
          id,
          title,
          content,
          created_at,
          user_id,
          users (
            full_name
          ),
          subjects (
            name
          )
        `)
        .eq('id', postId)
        .single();

      if (postErr) throw postErr;
      setPost(postData as any);

      const { data: repliesData } = await supabase
        .from('forum_replies')
        .select(`
          id,
          content,
          created_at,
          users (
            full_name
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      setReplies((repliesData as any) || []);

      const { data: bData } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_type', 'post')
        .eq('item_id', postId)
        .maybeSingle();

      if (bData) {
        setIsBookmarked(true);
        setBookmarkId(bData.id);
      } else {
        setIsBookmarked(false);
        setBookmarkId(null);
      }
    } catch (err) {
      console.error('Error fetching post detail:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user && postId) {
      fetchPostAndReplies();
    }
  }, [user, postId]);

  const handleToggleBookmark = async () => {
    if (!user || isNaN(postId)) return;
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
            item_type: 'post',
            item_id: postId,
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

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !replyContent.trim() || isNaN(postId)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('forum_replies')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: replyContent,
        });

      if (error) throw error;
      setReplyContent('');

      await awardXP(user.id, 5);
      await updateStreak(user.id);
      await checkAndUnlockBadges(user.id);

      await fetchPostAndReplies();
    } catch (err: any) {
      console.error('Error posting reply:', err);
      alert(err.message || 'حدث خطأ أثناء الرد');
    } finally {
      setActionLoading(false);
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

  if (!post) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-foreground">
          <h2 className="text-3xl font-display font-normal">عذراً، هذا السؤال غير متوفر أو تم حذفه.</h2>
          <Link href="/forum" className="mt-6 liquid-glass-glow rounded-full px-8 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40">
            العودة للمنتدى الدراسي
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 overflow-y-auto text-right border border-white/15">
        {/* Header */}
        <div className="flex items-center justify-between w-full border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              لوحة التحكم
            </Link>
            <span>/</span>
            <Link href="/forum" className="hover:text-foreground transition-colors">
              منتدى النقاش
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">تفاصيل الاستفسار</span>
          </div>

          <Link
            href="/forum"
            className="liquid-glass rounded-full px-5 py-2 text-xs text-foreground hover:scale-105 transition-transform"
          >
            ← العودة للمنتدى
          </Link>
        </div>

        {/* Main Post Content */}
        <div className="liquid-glass rounded-3xl p-8 space-y-6 border border-white/15">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3.5 py-1 rounded-full font-medium">
              مادة {post.subjects?.name}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleBookmark}
                className={`liquid-glass-glow rounded-full px-4 py-1.5 text-xs font-medium transition-all border border-cyan-400/40 cursor-pointer flex items-center gap-1.5 ${
                  isBookmarked ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' : 'text-foreground'
                }`}
              >
                {isBookmarked ? (
                  <><Check className="w-3.5 h-3.5 text-emerald-400" /> محفوظ</>
                ) : (
                  <><Star className="w-3.5 h-3.5 text-amber-400" /> حفظ الاستفسار</>
                )}
              </button>
              <span className="text-xs text-muted-foreground">المرسل: {post.users?.full_name}</span>
            </div>
          </div>

          <h2 className="text-4xl font-display font-normal text-foreground">{post.title}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-white/5 p-5 rounded-2xl border border-white/5">{post.content}</p>
        </div>

        {/* Replies List */}
        <div className="space-y-6 pt-4">
          <h3 className="text-3xl font-display font-normal text-foreground">الردود والحلول ({replies.length})</h3>
          
          {replies.length === 0 ? (
            <div className="liquid-glass rounded-3xl p-12 text-center text-muted-foreground text-xs border border-white/10">
              لم يقم أحد بالرد على هذا السؤال بعد. كن أول من يساعد زميله!
            </div>
          ) : (
            <div className="space-y-4">
              {replies.map((reply) => (
                <div key={reply.id} className="liquid-glass rounded-2xl p-6 space-y-3 border border-white/10">
                  <div className="flex justify-between items-center text-xs text-muted-foreground border-b border-white/5 pb-2">
                    <span className="text-cyan-300 font-medium">{reply.users?.full_name}</span>
                    <span>{new Date(reply.created_at).toLocaleDateString('ar-SY')}</span>
                  </div>
                  <p className="text-foreground text-xs leading-relaxed">{reply.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Reply Form */}
        <form onSubmit={handleSubmitReply} className="border-t border-white/10 pt-8 space-y-4">
          <label htmlFor="reply-input" className="block text-2xl font-display text-foreground">أضف رداً أو حلاً تعليمياً:</label>
          <textarea
            id="reply-input"
            rows={4}
            required
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="اكتب ردك أو صيغة الحل هنا..."
            className="w-full liquid-glass rounded-2xl p-4 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-cyan-400/40"
          ></textarea>

          <button
            type="submit"
            disabled={actionLoading}
            className="liquid-glass-glow rounded-full px-8 py-3.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-emerald-400/40 cursor-pointer flex items-center gap-1.5"
          >
            {actionLoading ? 'جاري الإرسال...' : <>إرسال الرد <Send className="w-3.5 h-3.5 text-emerald-400" /></>}
          </button>
        </form>

      </div>
    </SidebarLayout>
  );
}
