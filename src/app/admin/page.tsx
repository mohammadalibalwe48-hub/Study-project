'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { Crown, BookOpen, FileText, Target, Folder, UserCheck } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [stats, setStats] = useState({
    usersCount: 0,
    subjectsCount: 0,
    lessonsCount: 0,
    quizzesCount: 0,
    libraryCount: 0,
    mentorsCount: 0,
    ticketsCount: 0,
    forumCount: 0,
  });
  const [dbLoading, setDbLoading] = useState(true);
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

  useEffect(() => {
    async function fetchStats() {
      if (!user || profile?.role !== 'admin') return;
      try {
        setDbLoading(true);

        const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: subjectsCount } = await supabase.from('subjects').select('*', { count: 'exact', head: true });
        const { count: lessonsCount } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
        const { count: quizzesCount } = await supabase.from('quizzes').select('*', { count: 'exact', head: true });
        const { count: libraryCount } = await supabase.from('library_resources').select('*', { count: 'exact', head: true });
        const { count: mentorsCount } = await supabase.from('mentors').select('*', { count: 'exact', head: true });
        const { count: ticketsCount } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true });
        const { count: forumCount } = await supabase.from('forum_posts').select('*', { count: 'exact', head: true });

        setStats({
          usersCount: usersCount || 0,
          subjectsCount: subjectsCount || 0,
          lessonsCount: lessonsCount || 0,
          quizzesCount: quizzesCount || 0,
          libraryCount: libraryCount || 0,
          mentorsCount: mentorsCount || 0,
          ticketsCount: ticketsCount || 0,
          forumCount: forumCount || 0,
        });
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setDbLoading(false);
      }
    }

    if (user && profile) {
      fetchStats();
    }
  }, [user, profile]);

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

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-amber-300 border border-amber-400/20 uppercase inline-block">
            مركز القيادة والإدارة العليا Super Admin
          </span>

          <Link
            href="/dashboard"
            className="liquid-glass rounded-full px-5 py-2 text-xs text-foreground hover:scale-105 transition-transform"
          >
            الانتقال لواجهة الطالب ←
          </Link>
        </div>

        {/* Main Banner */}
        <div className="liquid-glass rounded-3xl p-8 border border-white/20 space-y-3">
          <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-1 rounded-full uppercase inline-block">
            صلاحيات رئيس النظام
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-normal text-foreground flex items-center gap-3">
            مركز التحكم الكامل بالمنصة <Crown className="w-8 h-8 text-amber-400" />
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">
            أهلاً بك، {profile?.full_name || 'مدير النظام'}. لديك كامل الصلاحيات لإدارة الأعضاء، منح الأدوار، التحكم بالمواد والاختبارات والمكتبة، والإشراف على المنصة.
          </p>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="liquid-glass rounded-2xl p-5 border border-white/10 space-y-1">
            <span className="text-[11px] text-muted-foreground">المستخدمين والأعضاء</span>
            <p className="text-3xl font-display text-cyan-300">{stats.usersCount}</p>
          </div>

          <div className="liquid-glass rounded-2xl p-5 border border-white/10 space-y-1">
            <span className="text-[11px] text-muted-foreground">المواد الدراسية</span>
            <p className="text-3xl font-display text-emerald-400">{stats.subjectsCount}</p>
          </div>

          <div className="liquid-glass rounded-2xl p-5 border border-white/10 space-y-1">
            <span className="text-[11px] text-muted-foreground">إجمالي الدروس</span>
            <p className="text-3xl font-display text-amber-400">{stats.lessonsCount}</p>
          </div>

          <div className="liquid-glass rounded-2xl p-5 border border-white/10 space-y-1">
            <span className="text-[11px] text-muted-foreground">الاختبارات المؤتمتة</span>
            <p className="text-3xl font-display text-rose-400">{stats.quizzesCount}</p>
          </div>

          <div className="liquid-glass rounded-2xl p-5 border border-white/10 space-y-1">
            <span className="text-[11px] text-muted-foreground">ملفات المكتبة</span>
            <p className="text-3xl font-display text-purple-300">{stats.libraryCount}</p>
          </div>

          <div className="liquid-glass rounded-2xl p-5 border border-white/10 space-y-1">
            <span className="text-[11px] text-muted-foreground">المدرسون المعتمدون</span>
            <p className="text-3xl font-display text-sky-300">{stats.mentorsCount}</p>
          </div>

          <div className="liquid-glass rounded-2xl p-5 border border-white/10 space-y-1">
            <span className="text-[11px] text-muted-foreground">تذاكر الدعم</span>
            <p className="text-3xl font-display text-amber-300">{stats.ticketsCount}</p>
          </div>

          <div className="liquid-glass rounded-2xl p-5 border border-white/10 space-y-1">
            <span className="text-[11px] text-muted-foreground">مشاركات المنتدى</span>
            <p className="text-3xl font-display text-emerald-300">{stats.forumCount}</p>
          </div>
        </div>

        {/* Admin Command Centers Grid */}
        <div className="space-y-6 pt-6 border-t border-white/10">
          <h2 className="text-3xl font-display font-normal text-foreground">مراكز التحكم والسيطرة (10 أقسام)</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* 1. Users */}
            <div className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between hover:scale-[1.02] transition-all group">
              <div className="space-y-3">
                <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full">
                  إدارة الأعضاء
                </span>
                <h3 className="text-2xl font-display font-normal text-foreground group-hover:text-cyan-200 flex items-center gap-2">
                  <Crown className="w-6 h-6 text-amber-400" /> الأعضاء والصلاحيات
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  تعيين مدراء Admin، تغيير الفروع الدراسية، منح XP، وحذف الحسابات.
                </p>
              </div>
              <Link href="/admin/users" className="liquid-glass-glow rounded-full text-center py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 mt-6">
                إدارة الأعضاء والصلاحيات ←
              </Link>
            </div>

            {/* 2. Subjects */}
            <div className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between hover:scale-[1.02] transition-all group">
              <div className="space-y-3">
                <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full">
                  المناهج
                </span>
                <h3 className="text-2xl font-display font-normal text-foreground group-hover:text-cyan-200 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-emerald-400" /> المواد الدراسية
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  إضافة وتعديل وحذف المقررات والمواد لكل فرع دراسي.
                </p>
              </div>
              <Link href="/admin/subjects" className="liquid-glass-glow rounded-full text-center py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 mt-6">
                إدارة المواد الدراسية ←
              </Link>
            </div>

            {/* 3. Lessons */}
            <div className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between hover:scale-[1.02] transition-all group">
              <div className="space-y-3">
                <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full">
                  المحتوى التعليمي
                </span>
                <h3 className="text-2xl font-display font-normal text-foreground group-hover:text-cyan-200 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-cyan-400" /> الدروس والمرفقات
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  رفع الدروس الشاملة وتحديث فيديوهات الشرح والمستندات.
                </p>
              </div>
              <Link href="/admin/lessons" className="liquid-glass-glow rounded-full text-center py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 mt-6">
                إدارة الدروس والمرفقات ←
              </Link>
            </div>

            {/* 4. Quizzes */}
            <div className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between hover:scale-[1.02] transition-all group">
              <div className="space-y-3">
                <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full">
                  التقييم والأنشطة
                </span>
                <h3 className="text-2xl font-display font-normal text-foreground group-hover:text-cyan-200 flex items-center gap-2">
                  <Target className="w-6 h-6 text-rose-400" /> الاختبارات والأسئلة
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  بناء الاختبارات المؤتمتة، تعديل الخيارات والإجابات الصحيحة.
                </p>
              </div>
              <Link href="/admin/quizzes" className="liquid-glass-glow rounded-full text-center py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 mt-6">
                إدارة الاختبارات والأسئلة ←
              </Link>
            </div>

            {/* 5. Library */}
            <div className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between hover:scale-[1.02] transition-all group">
              <div className="space-y-3">
                <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full">
                  المكتبة الرقمية
                </span>
                <h3 className="text-2xl font-display font-normal text-foreground group-hover:text-cyan-200 flex items-center gap-2">
                  <Folder className="w-6 h-6 text-purple-400" /> الكتب والملخصات
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  إضافة وتحرير الكتب المدرسية، سلالم التصحيح ونماذج الوزارة.
                </p>
              </div>
              <Link href="/admin/library" className="liquid-glass-glow rounded-full text-center py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 mt-6">
                إدارة المكتبة الرقمية ←
              </Link>
            </div>

            {/* 6. Mentors */}
            <div className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between hover:scale-[1.02] transition-all group">
              <div className="space-y-3">
                <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full">
                  الكادر التعليمي
                </span>
                <h3 className="text-2xl font-display font-normal text-foreground group-hover:text-cyan-200 flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-sky-400" /> المدرسون المعتمدون
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  تعديل وإضافة بيانات المعلمين، روابط واتساب والتخصصات.
                </p>
              </div>
              <Link href="/admin/mentors" className="liquid-glass-glow rounded-full text-center py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 mt-6">
                إدارة المدرسين والاستشاريين ←
              </Link>
            </div>

          </div>
        </div>

      </div>
    </SidebarLayout>
  );
}
