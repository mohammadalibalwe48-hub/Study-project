'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { Newspaper, Check, Pencil, Trash2, Plus } from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  category: 'study-tips' | 'advice' | 'news';
  author: string;
  date: string;
  read_time: string;
}

export default function AdminBlogPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'study-tips' as 'study-tips' | 'advice' | 'news',
    author: 'فريق المنصة التربوي',
    date: new Date().toISOString().split('T')[0],
    read_time: '4 دقائق',
    excerpt: '',
    content: '',
  });

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
      const { data, error } = await supabase.from('blog_posts').select('*').order('id', { ascending: false });
      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching blog posts:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      fetchPosts();
    }
  }, [user, profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    setActionLoading(true);
    try {
      if (editingPost) {
        const { error } = await supabase.from('blog_posts').update(formData).eq('id', editingPost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('blog_posts').insert([formData]);
        if (error) throw error;
      }

      setShowModal(false);
      setEditingPost(null);
      await fetchPosts();
    } catch (err: any) {
      console.error('Error saving blog post:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (p: BlogPost) => {
    setEditingPost(p);
    setFormData({
      title: p.title,
      category: p.category,
      author: p.author || 'فريق المنصة التربوي',
      date: p.date || new Date().toISOString().split('T')[0],
      read_time: p.read_time || '4 دقائق',
      excerpt: p.excerpt || '',
      content: p.content || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المقال من المدونة؟')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
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
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-purple-300 border border-purple-400/20 uppercase inline-block">
              إدارة المدونة والمحتوى
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3 flex items-center gap-3">
              المدونة والنشرات <Newspaper className="w-8 h-8 text-purple-400" />
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              كتابة ونشر النصائح التربوية، الأخبار الوزارية، وتوجيهات الدراسة لطلاب البكالوريا.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingPost(null);
                setFormData({
                  title: '',
                  category: 'study-tips',
                  author: 'فريق المنصة التربوي',
                  date: new Date().toISOString().split('T')[0],
                  read_time: '4 دقائق',
                  excerpt: '',
                  content: '',
                });
                setShowModal(!showModal);
              }}
              className="liquid-glass-glow rounded-full px-6 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer flex items-center gap-1.5"
            >
              {showModal ? 'إغلاق النموذج' : <>كتابة مقال جديد <Plus className="w-3.5 h-3.5" /></>}
            </button>
            <Link
              href="/admin"
              className="liquid-glass rounded-full px-6 py-2.5 text-xs text-foreground hover:scale-105 transition-transform"
            >
              ← العودة لمركز الإدارة
            </Link>
          </div>
        </div>

        {/* Form Modal */}
        {showModal && (
          <form onSubmit={handleSave} className="liquid-glass rounded-3xl p-6 border border-white/15 space-y-4">
            <h3 className="text-2xl font-display text-foreground border-b border-white/10 pb-3">
              {editingPost ? 'تعديل المقال' : 'كتابة مقال جديد'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">عنوان المقال</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="كيف تنظم وقتك في الامتحان النصفية..."
                  className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">التصنيف</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
                >
                  <option value="study-tips" className="bg-[#001420]">نصائح دراسية Study Tips</option>
                  <option value="advice" className="bg-[#001420]">إرشادات الامتحان Advice</option>
                  <option value="news" className="bg-[#001420]">أخبار رسمية News</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ملخص المقال (Excerpt)</label>
              <input
                type="text"
                required
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="نبذة موجزة تظهر في بطاقة المقال..."
                className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">نص المقال الكامل</label>
              <textarea
                rows={6}
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="اكتب المحتوى الكامل للمقال هنا..."
                className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="liquid-glass-glow rounded-full px-8 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading ? 'جاري الحفظ...' : editingPost ? <>تحديث المقال <Check className="w-3.5 h-3.5 text-emerald-400" /></> : <>نشر المقال <Plus className="w-3.5 h-3.5" /></>}
              </button>
            </div>
          </form>
        )}

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p) => (
            <div key={p.id} className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-purple-300 bg-purple-500/10 border border-purple-400/20 px-3 py-0.5 rounded-full">
                    {p.category}
                  </span>
                  <span className="text-xs text-muted-foreground">{p.date}</span>
                </div>
                <h3 className="text-2xl font-display text-foreground">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{p.excerpt}</p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-white/10">
                <button
                  onClick={() => handleEdit(p)}
                  className="liquid-glass rounded-full flex-1 py-2 text-xs text-cyan-300 hover:border-cyan-400/40 border border-white/5 flex items-center justify-center gap-1 cursor-pointer"
                >
                  تعديل <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="liquid-glass rounded-full flex-1 py-2 text-xs text-rose-400 hover:border-rose-500/40 border border-white/5 flex items-center justify-center gap-1 cursor-pointer"
                >
                  حذف <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </SidebarLayout>
  );
}
