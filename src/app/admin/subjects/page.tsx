'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { BookOpen, Check, Pencil, Trash2, Plus } from 'lucide-react';

interface Branch {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  branch_id: number;
  name: string;
  description: string;
  image_url: string | null;
  branches?: {
    name: string;
  };
}

export default function AdminSubjectsPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const router = useRouter();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [branchId, setBranchId] = useState<number>(0);
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

  const fetchSubjectsAndBranches = async () => {
    try {
      setDbLoading(true);
      const { data: branchData } = await supabase.from('branches').select('id, name');
      setBranches(branchData || []);
      if (branchData && branchData.length > 0 && branchId === 0) {
        setBranchId(branchData[0].id);
      }

      const { data: subData } = await supabase
        .from('subjects')
        .select(`
          id,
          branch_id,
          name,
          description,
          image_url,
          branches (
            name
          )
        `)
        .order('id', { ascending: false });
      setSubjects((subData as any) || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchSubjectsAndBranches();
    }
  }, [user, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setActionLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('subjects')
          .update({
            name,
            description,
            branch_id: branchId,
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('subjects').insert({
          name,
          description,
          branch_id: branchId,
        });

        if (error) throw error;
      }

      setName('');
      setDescription('');
      setEditingId(null);
      await fetchSubjectsAndBranches();
    } catch (err: any) {
      console.error('Error saving subject:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (sub: Subject) => {
    setEditingId(sub.id);
    setName(sub.name);
    setDescription(sub.description || '');
    setBranchId(sub.branch_id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه المادة التعليمية وكافة بياناتها؟')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
      await fetchSubjectsAndBranches();
    } catch (err: any) {
      console.error('Error deleting subject:', err);
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
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-emerald-400 border border-emerald-400/20 uppercase inline-block">
              إدارة المناهج والمقررات
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3 flex items-center gap-3">
              المواد الدراسية <BookOpen className="w-8 h-8 text-emerald-400" />
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              إضافة، تعديل، وحذف المواد الدراسية المخصصة لكل فرع تعليمي.
            </p>
          </div>

          <Link
            href="/admin"
            className="liquid-glass rounded-full px-6 py-2.5 text-xs text-foreground hover:scale-105 transition-transform"
          >
            ← العودة لمركز الإدارة
          </Link>
        </div>

        {/* Add / Edit Form */}
        <form onSubmit={handleSubmit} className="liquid-glass rounded-3xl p-6 border border-white/15 space-y-4">
          <h3 className="text-2xl font-display text-foreground border-b border-white/10 pb-3">
            {editingId ? 'تعديل بيانات المادة' : 'إضافة مادة دراسية جديدة'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">اسم المادة</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: الرياضيات - الفرع العلمي"
                className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">الفرع الدراسي</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(Number(e.target.value))}
                className="w-full liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#001420]">{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">وصف المادة</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر لمكونات المادة والمقرر الوزاري..."
              className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setName('');
                  setDescription('');
                }}
                className="liquid-glass rounded-full px-6 py-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                إلغاء التعديل
              </button>
            )}
            <button
              type="submit"
              disabled={actionLoading}
              className="liquid-glass-glow rounded-full px-8 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-emerald-400/40 cursor-pointer flex items-center gap-1.5"
            >
              {actionLoading ? 'جاري الحفظ...' : editingId ? <>تحديث المادة <Check className="w-3.5 h-3.5 text-emerald-400" /></> : <>حفظ المادة الجديدة <Plus className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </form>

        {/* Subjects List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((sub) => (
            <div key={sub.id} className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full">
                    {sub.branches?.name || 'فرع عام'}
                  </span>
                </div>
                <h3 className="text-2xl font-display text-foreground">{sub.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{sub.description || 'لا يوجد وصف مضاف.'}</p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-white/10">
                <button
                  onClick={() => handleEdit(sub)}
                  className="liquid-glass rounded-full flex-1 py-2 text-xs text-cyan-300 hover:border-cyan-400/40 border border-white/5 flex items-center justify-center gap-1 cursor-pointer"
                >
                  تعديل <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(sub.id)}
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
