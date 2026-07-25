'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { Crown, Trash2 } from 'lucide-react';

interface UserRecord {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'student' | 'admin';
  branch_id: number | null;
  created_at: string;
  branches?: {
    name: string;
  } | null;
}

interface Branch {
  id: number;
  name: string;
}

export default function AdminUsersPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'admin'>('all');
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

  const fetchData = async () => {
    if (!user || profile?.role !== 'admin') return;
    try {
      setDbLoading(true);
      const { data: brData } = await supabase.from('branches').select('*');
      setBranches(brData || []);

      const { data: uData, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          role,
          branch_id,
          created_at,
          branches (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsersList((uData as any) || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      fetchData();
    }
  }, [user, profile]);

  const handleRoleChange = async (targetUserId: string, newRole: 'student' | 'admin') => {
    if (!confirm(`هل أنت متأكد من تغيير صلاحية هذا المستخدم إلى (${newRole === 'admin' ? 'مدير نظام Admin' : 'طالب Student'})؟`)) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', targetUserId);

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error('Error updating role:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBranchChange = async (targetUserId: string, newBranchId: number | null) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ branch_id: newBranchId })
        .eq('id', targetUserId);

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error('Error updating branch:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!confirm('تحذير: هل أنت متأكد من حذف هذا الحساب نهائياً من النظام؟')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', targetUserId);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting user:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

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
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-cyan-300 border border-cyan-400/20 uppercase inline-block">
              إدارة الأعضاء والوصول
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3 flex items-center gap-3">
              إدارة المستخدمين والصلاحيات <Crown className="w-8 h-8 text-amber-400" />
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              إدارة صلاحيات الطلاب والمدراء، تعديل الفروع الدراسية، والتحكم بالحسابات.
            </p>
          </div>

          <Link
            href="/admin"
            className="liquid-glass rounded-full px-6 py-2.5 text-xs text-foreground hover:scale-105 transition-transform"
          >
            ← العودة لمركز الإدارة
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center liquid-glass p-4 rounded-3xl border border-white/10">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم أو البريد الإلكتروني..."
            className="w-full sm:max-w-md liquid-glass rounded-2xl p-3.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none border border-white/10"
          />

          <div className="flex gap-2">
            {(
              [
                ['all', 'الجميع'],
                ['student', 'الطلاب'],
                ['admin', 'المدراء'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRoleFilter(key)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  roleFilter === key
                    ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
                    : 'liquid-glass text-muted-foreground border-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="liquid-glass rounded-3xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-muted-foreground font-medium">
                <tr>
                  <th className="p-4">المستخدم</th>
                  <th className="p-4">البريد الإلكتروني</th>
                  <th className="p-4">الصلاحية</th>
                  <th className="p-4">الفرع الدراسي</th>
                  <th className="p-4">تاريخ التسجيل</th>
                  <th className="p-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-foreground">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-medium text-sm">{u.full_name || 'بدون اسم'}</td>
                    <td className="p-4 text-muted-foreground">{u.email}</td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                        disabled={actionLoading || u.id === user?.id}
                        className="liquid-glass rounded-full px-3 py-1 text-xs text-cyan-300 border border-cyan-400/20 focus:outline-none"
                      >
                        <option value="student" className="bg-[#001420]">طالب Student</option>
                        <option value="admin" className="bg-[#001420]">مدير Admin</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <select
                        value={u.branch_id || ''}
                        onChange={(e) => handleBranchChange(u.id, e.target.value ? Number(e.target.value) : null)}
                        disabled={actionLoading}
                        className="liquid-glass rounded-full px-3 py-1 text-xs text-foreground border border-white/10 focus:outline-none"
                      >
                        <option value="" className="bg-[#001420]">غير محدد</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id} className="bg-[#001420]">{b.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString('ar-SY')}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={actionLoading || u.id === user?.id}
                        className="text-rose-400 hover:underline disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer mx-auto"
                      >
                        حذف <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </SidebarLayout>
  );
}
