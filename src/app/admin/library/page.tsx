'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { Folder, Check, Pencil, Trash2, Plus } from 'lucide-react';

interface LibraryResource {
  id: number;
  name: string;
  category: 'textbook' | 'summary' | 'exam';
  subject: string;
  size: string;
  format: string;
  download_url: string;
  description: string;
}

export default function AdminLibraryPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResource, setEditingResource] = useState<LibraryResource | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'textbook' as 'textbook' | 'summary' | 'exam',
    subject: 'الرياضيات',
    size: '15 MB',
    format: 'PDF',
    download_url: '',
    description: '',
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

  const fetchResources = async () => {
    if (!user || profile?.role !== 'admin') return;
    try {
      setDbLoading(true);
      const { data, error } = await supabase
        .from('library_resources')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error('Error fetching library resources:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      fetchResources();
    }
  }, [user, profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.download_url.trim()) return;

    setActionLoading(true);
    try {
      if (editingResource) {
        const { error } = await supabase
          .from('library_resources')
          .update(formData)
          .eq('id', editingResource.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('library_resources')
          .insert([formData]);
        if (error) throw error;
      }

      setShowAddModal(false);
      setEditingResource(null);
      setFormData({
        name: '',
        category: 'textbook',
        subject: 'الرياضيات',
        size: '15 MB',
        format: 'PDF',
        download_url: '',
        description: '',
      });
      await fetchResources();
    } catch (err: any) {
      console.error('Error saving resource:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (resource: LibraryResource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      category: resource.category,
      subject: resource.subject,
      size: resource.size,
      format: resource.format,
      download_url: resource.download_url,
      description: resource.description || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الملف من المكتبة نهائياً؟')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('library_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchResources();
    } catch (err: any) {
      console.error('Error deleting resource:', err);
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
              إدارة المكتبة الرقمية
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3 flex items-center gap-3">
              المستندات والكتب الرقمية <Folder className="w-8 h-8 text-purple-300" />
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              إضافة وتحرير كتب البكالوريا، سلالم التصحيح، والنماذج الوزارية المتاحة للتحميل.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingResource(null);
                setFormData({
                  name: '',
                  category: 'textbook',
                  subject: 'الرياضيات',
                  size: '15 MB',
                  format: 'PDF',
                  download_url: '',
                  description: '',
                });
                setShowAddModal(!showAddModal);
              }}
              className="liquid-glass-glow rounded-full px-6 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer flex items-center gap-1.5"
            >
              {showAddModal ? 'إغلاق النموذج' : <>إضافة ملف جديد <Plus className="w-3.5 h-3.5" /></>}
            </button>
            <Link
              href="/admin"
              className="liquid-glass rounded-full px-6 py-2.5 text-xs text-foreground hover:scale-105 transition-transform"
            >
              ← العودة لمركز الإدارة
            </Link>
          </div>
        </div>

        {/* Modal Form */}
        {showAddModal && (
          <form onSubmit={handleSave} className="liquid-glass rounded-3xl p-6 border border-white/15 space-y-4">
            <h3 className="text-2xl font-display text-foreground border-b border-white/10 pb-3">
              {editingResource ? 'تعديل بيانات الملف' : 'إضافة ملف جديد للمكتبة'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">اسم الملف</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: كتاب الفيزياء البكالوريا العلمي"
                  className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">رابط التحميل Direct Download URL</label>
                <input
                  type="url"
                  required
                  value={formData.download_url}
                  onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full text-left liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">المادة</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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
                  <option value="textbook" className="bg-[#001420]">كتاب مدرسي رسمى</option>
                  <option value="summary" className="bg-[#001420]">ملخص وحلول</option>
                  <option value="exam" className="bg-[#001420]">أسئلة ونماذج وزارية</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">حجم الملف</label>
                <input
                  type="text"
                  required
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full text-center liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="liquid-glass-glow rounded-full px-8 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading ? 'جاري الحفظ...' : editingResource ? <>تحديث الملف <Check className="w-3.5 h-3.5 text-emerald-400" /></> : <>إضافة الملف للمكتبة <Plus className="w-3.5 h-3.5" /></>}
              </button>
            </div>
          </form>
        )}

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => (
            <div key={res.id} className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-purple-300 bg-purple-500/10 border border-purple-400/20 px-3 py-0.5 rounded-full">
                    {res.subject}
                  </span>
                  <span className="text-xs text-muted-foreground">{res.size}</span>
                </div>
                <h3 className="text-2xl font-display text-foreground">{res.name}</h3>
              </div>

              <div className="flex gap-2 pt-4 border-t border-white/10">
                <button
                  onClick={() => handleEdit(res)}
                  className="liquid-glass rounded-full flex-1 py-2 text-xs text-cyan-300 hover:border-cyan-400/40 border border-white/5 flex items-center justify-center gap-1 cursor-pointer"
                >
                  تعديل <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(res.id)}
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
