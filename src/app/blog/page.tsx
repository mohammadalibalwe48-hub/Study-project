'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  category: 'study-tips' | 'advice' | 'news';
  author: string;
  date: string;
  read_time: string;
  color: string;
}

export default function BlogPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'study-tips' | 'advice' | 'news'>('all');
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    async function fetchBlog() {
      try {
        setDbLoading(true);
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .order('id', { ascending: true });
        
        if (error) throw error;
        setBlogPosts(data || []);
      } catch (err) {
        console.error('Error fetching blog posts:', err);
      } finally {
        setDbLoading(false);
      }
    }
    fetchBlog();
  }, []);

  const filteredPosts = blogPosts.filter((post) =>
    selectedCategory === 'all' || post.category === selectedCategory
  );

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'study-tips':
        return <span className="text-[11px] text-amber-300 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">طرق الدراسة</span>;
      case 'advice':
        return <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-1 rounded-full">إرشادات ونظام</span>;
      case 'news':
        return <span className="text-[11px] text-purple-300 bg-purple-500/10 border border-purple-400/20 px-3 py-1 rounded-full">أخبار امتحانية</span>;
      default:
        return null;
    }
  };

  const content = (
    <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 overflow-y-auto text-right border border-white/15">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-white/10 pb-6">
        <div className="space-y-3">
          <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-cyan-300 border border-cyan-400/20 uppercase inline-block">
            نصائح ومقالات مفيدة
          </span>
          <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground">
            مدونة التفوق والنجاح
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            مقالات حصرية من أساتذة ومستشارين لتوجيه طلاب البكالوريا وتجاوز الامتحانات بتفوق.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2.5" dir="rtl">
        <button
          onClick={() => { setSelectedCategory('all'); setActivePostId(null); }}
          className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
            selectedCategory === 'all'
              ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
              : 'bg-white/5 text-muted-foreground hover:text-foreground border border-white/5'
          }`}
        >
          جميع المقالات
        </button>
        <button
          onClick={() => { setSelectedCategory('study-tips'); setActivePostId(null); }}
          className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
            selectedCategory === 'study-tips'
              ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
              : 'bg-white/5 text-muted-foreground hover:text-foreground border border-white/5'
          }`}
        >
          طرق الدراسة والتركيز
        </button>
        <button
          onClick={() => { setSelectedCategory('advice'); setActivePostId(null); }}
          className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
            selectedCategory === 'advice'
              ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
              : 'bg-white/5 text-muted-foreground hover:text-foreground border border-white/5'
          }`}
        >
          نصائح امتحانية
        </button>
        <button
          onClick={() => { setSelectedCategory('news'); setActivePostId(null); }}
          className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
            selectedCategory === 'news'
              ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
              : 'bg-white/5 text-muted-foreground hover:text-foreground border border-white/5'
          }`}
        >
          أخبار البكالوريا
        </button>
      </div>

      {/* Blog Posts Grid */}
      {dbLoading ? (
        <div className="py-20 text-center space-y-4">
          <div className="h-10 w-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground text-sm">جاري تحميل المقالات...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="liquid-glass rounded-3xl p-16 text-center text-muted-foreground text-sm border border-white/10">
          لا توجد مقالات في التصنيف المحدد حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between hover:scale-[1.02] transition-all group"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  {getCategoryBadge(post.category)}
                  <span className="text-xs text-muted-foreground">{post.read_time} قراءة</span>
                </div>

                <h3 className="text-2xl font-display font-normal text-foreground group-hover:text-cyan-200 transition-colors">
                  {post.title}
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>

                {activePostId === post.id && (
                  <div className="pt-4 border-t border-white/10 text-xs text-muted-foreground space-y-3 leading-relaxed animate-fade-rise">
                    <p className="whitespace-pre-wrap">{post.content}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">بواسطة: {post.author}</span>
                <button
                  onClick={() => setActivePostId(activePostId === post.id ? null : post.id)}
                  className="liquid-glass-glow rounded-full px-5 py-2 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40"
                >
                  {activePostId === post.id ? 'إغلاق المقال ×' : 'قراءة المقال كامل ←'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );

  if (user) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        {content}
      </SidebarLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#001420] p-6 max-w-7xl mx-auto flex flex-col justify-between relative overflow-hidden" dir="rtl">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 opacity-20 pointer-events-none"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
      </video>
      <header className="relative z-10 w-full flex justify-between items-center liquid-glass rounded-full px-8 py-4 mb-8 border border-white/15">
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/logo.png" className="h-10 w-10 rounded-full border border-white/20 object-cover" alt="الشعار" />
          <span className="text-2xl font-display text-foreground">منصة مسار</span>
        </Link>
        <Link href="/auth" className="liquid-glass-glow rounded-full px-6 py-2.5 text-xs text-foreground font-medium hover:scale-105 transition-transform border border-cyan-400/40">
          تسجيل الدخول
        </Link>
      </header>
      <div className="relative z-10">
        {content}
      </div>
    </div>
  );
}
