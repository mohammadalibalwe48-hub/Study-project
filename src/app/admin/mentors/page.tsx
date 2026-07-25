'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { UserCheck, Check, Pencil, Trash2, Plus, Star } from 'lucide-react';

interface Mentor {
  id: number;
  name: string;
  subject: string;
  avatar: string;
  bio: string;
  whatsapp: string;
  experience: string;
  rating: number;
  reviews_count: number;
}

export default function AdminMentorsPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMentor, setEditingMentor] = useState<Mentor | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    subject: 'الرياضيات',
    avatar: 'teacher',
    bio: '',
    whatsapp: '963900000000',
    experience: 'خبرة 10 سنوات',
    rating: 5.0,
    reviews_count: 50,
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

  const fetchMentors = async () => {
    if (!user || profile?.role !== 'admin') return;
    try {
      setDbLoading(true);
      const { data, error } = await supabase.from('mentors').select('*').order('id', { ascending: false });
      if (error) throw error;
      setMentors(data || []);
    } catch (err) {
      console.error('Error fetching mentors:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      fetchMentors();
    }
  }, [user, profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.subject.trim()) return;

    setActionLoading(true);
    try {
      if (editingMentor) {
        const { error } = await supabase.from('mentors').update(formData).eq('id', editingMentor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('mentors').insert([formData]);
        if (error) throw error;
      }

      setShowModal(false);
      setEditingMentor(null);
      await fetchMentors();
    } catch (err: any) {
      console.error('Error saving mentor:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (mentor: Mentor) => {
    setEditingMentor(mentor);
    setFormData({
      name: mentor.name,
      subject: mentor.subject,
      avatar: mentor.avatar || 'teacher',
      bio: mentor.bio || '',
      whatsapp: mentor.whatsapp || '',
      experience: mentor.experience || '',
      rating: mentor.rating || 5.0,
      reviews_count: mentor.reviews_count || 50,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المدرس المعتمد؟')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('mentors').delete().eq('id', id);
      if (error) throw error;
      await fetchMentors();
    } catch (err: any) {
      console.error('Error deleting mentor:', err);
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
              الكادر التعليمي المعتمد
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3 flex items-center gap-3">
              المدرسون المعتمدون <UserCheck className="w-8 h-8 text-sky-400" />
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              إضافة وتعديل بيانات الأساتذة والمستشارين وروابط التواصل المباشر عبر واتساب.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingMentor(null);
                setFormData({
                  name: '',
                  subject: 'الرياضيات',
                  avatar: 'teacher',
                  bio: '',
                  whatsapp: '963900000000',
                  experience: 'خبرة 10 سنوات',
                  rating: 5.0,
                  reviews_count: 50,
                });
                setShowModal(!showModal);
              }}
              className="liquid-glass-glow rounded-full px-6 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer flex items-center gap-1.5"
            >
              {showModal ? 'إغلاق النموذج' : <>إضافة مدرس جديد <Plus className="w-3.5 h-3.5" /></>}
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
        {showModal && (
          <form onSubmit={handleSave} className="liquid-glass rounded-3xl p-6 border border-white/15 space-y-4">
            <h3 className="text-2xl font-display text-foreground border-b border-white/10 pb-3">
              {editingMentor ? 'تعديل بيانات المدرس' : 'إضافة مدرس معتمد جديد'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">اسم المدرس</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="أ. أحمد السوري"
                  className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">المادة والتخصص</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">رقم واتساب (مع الرمز)</label>
                <input
                  type="text"
                  required
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full text-left liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">نبذة وسيرة الذاتية</label>
              <textarea
                rows={2}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="liquid-glass-glow rounded-full px-8 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading ? 'جاري الحفظ...' : editingMentor ? <>تحديث المدرس <Check className="w-3.5 h-3.5 text-emerald-400" /></> : <>حفظ المدرس الجديد <Plus className="w-3.5 h-3.5" /></>}
              </button>
            </div>
          </form>
        )}

        {/* Mentors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((mentor) => (
            <div key={mentor.id} className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/20 px-3 py-0.5 rounded-full">
                    مدرس {mentor.subject}
                  </span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {mentor.rating}</span>
                </div>
                <h3 className="text-2xl font-display text-foreground">{mentor.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{mentor.bio}</p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-white/10">
                <button
                  onClick={() => handleEdit(mentor)}
                  className="liquid-glass rounded-full flex-1 py-2 text-xs text-cyan-300 hover:border-cyan-400/40 border border-white/5 flex items-center justify-center gap-1 cursor-pointer"
                >
                  تعديل <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(mentor.id)}
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
