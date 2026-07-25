'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { MessageSquare, Eye, Trash2 } from 'lucide-react';

interface ForumPost {
  id: number;
  title: string;
  content: string;
  created_at: string;
  users?: {
    full_name: string;
  } | null;
  subjects?: {
    name: string;
  } | null;
}

export default function AdminForumPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth');
      } else if (profile?.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, profile, loading, router]);

  const fetchPosts = async () => {
    if (!user || profile?.role !== 'admin') return;
    try {
      setDbLoading(true);
      const { data, error } = await supabase
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
        .order('id', { ascending: false });

      if (error) throw error;
      setPosts((data as any) || []);
    } catch (err) {
      console.error('Error fetching admin forum posts:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      fetchPosts();
    }
  }, [user, profile]);

  const handleDeletePost = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه المشاركة وجميع الردود التابعة لها؟')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('forum_posts').delete().eq('id', id);
      if (error) throw error;
      await fetchPosts();
    } catch (err: any) {
      console.error('Error deleting post:', err);
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
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-amber-300 border border-amber-400/20 uppercase inline-block">
              إشراف المجتمع الطلابي
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3 flex items-center gap-3">
              إشراف منتدى النقاش <MessageSquare className="w-8 h-8 text-amber-300" />
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              مراقبة منشورات واستفسارات الطلاب وحذف المحتوى المخالف لقواعد المنصة.
            </p>
          </div>

          <Link
            href="/admin"
            className="liquid-glass rounded-full px-6 py-2.5 text-xs text-foreground hover:scale-105 transition-transform"
          >
            ← العودة لمركز الإدارة
          </Link>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          <h3 className="text-2xl font-display text-foreground">المنشورات الحالية ({posts.length})</h3>

          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="liquid-glass rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-2 text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full">
                      مادة {post.subjects?.name || 'عامة'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">المرسل: {post.users?.full_name || 'طالب'}</span>
                    <span className="text-[10px] text-muted-foreground">• {new Date(post.created_at).toLocaleDateString('ar-SY')}</span>
                  </div>
                  <h4 className="text-xl font-display text-foreground">{post.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{post.content}</p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/forum/${post.id}`}
                    className="liquid-glass rounded-full px-4 py-1.5 text-xs text-cyan-300 border border-white/5 hover:border-cyan-400/40 flex items-center gap-1"
                  >
                    معاينة <Eye className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => handleDeletePost(post.id)}
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
