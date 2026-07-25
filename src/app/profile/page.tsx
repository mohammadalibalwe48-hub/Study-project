'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { Trophy, Lock, Timer, GraduationCap } from 'lucide-react';

interface QuizResultJoin {
  id: number;
  score: number;
  total_questions: number;
  completed_at: string;
  quizzes: {
    title: string;
  };
}

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();
  const [results, setResults] = useState<QuizResultJoin[]>([]);
  const [focusSessions, setFocusSessions] = useState(0);
  const [branchName, setBranchName] = useState('غير محدد');
  const [dbLoading, setDbLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      try {
        setDbLoading(true);
        const { data, error } = await supabase
          .from('quiz_results')
          .select(`
            id,
            score,
            total_questions,
            completed_at,
            quizzes (
              title
            )
          `)
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });

        if (error) throw error;
        setResults((data as any) || []);

        const { count: sessionCount, error: sessionErr } = await supabase
          .from('study_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!sessionErr) {
          setFocusSessions(sessionCount || 0);
        }

        if (profile?.branch_id) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('name')
            .eq('id', profile.branch_id)
            .single();
          if (branchData) setBranchName(branchData.name);
        }
      } catch (err) {
        console.error('Error fetching profile stats:', err);
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
          <DashboardSkeleton />
        </div>
      </SidebarLayout>
    );
  }

  const totalCompleted = results.length;
  const averagePercentage = totalCompleted > 0
    ? Math.round((results.reduce((acc, curr) => acc + (curr.score / curr.total_questions), 0) / totalCompleted) * 100)
    : 0;

  const highestScoreObj = results.reduce(
    (max, item) => {
      const pct = (item.score / item.total_questions) * 100;
      return pct > max.pct ? { score: `${item.score}/${item.total_questions}`, pct } : max;
    },
    { score: '0/0', pct: 0 }
  );

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-10 overflow-y-auto text-right border border-white/15">
        
        {/* Header */}
        <div className="flex items-center justify-between w-full border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              لوحة التحكم
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">الملف الشخصي</span>
          </div>

          <Link
            href="/dashboard"
            className="liquid-glass rounded-full px-5 py-2 text-xs text-foreground hover:scale-105 transition-transform"
          >
            ← العودة للوحة التحكم
          </Link>
        </div>

        {/* User details banner */}
        <div className="liquid-glass rounded-3xl p-8 border border-white/15 flex flex-col sm:flex-row items-center sm:justify-between gap-6">
          <div className="flex items-center gap-6 text-center sm:text-right flex-col sm:flex-row">
            <div className="h-20 w-20 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center font-display text-4xl shrink-0">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-display font-normal text-foreground">{profile?.full_name}</h2>
              <p className="text-xs text-muted-foreground bg-white/5 border border-white/10 px-3 py-1 rounded-full inline-block">{profile?.email}</p>
              <div className="mt-2">
                <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3.5 py-1 rounded-full inline-block">
                  المسار: الفرع {branchName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-2">
            <span className="text-xs text-muted-foreground">الاختبارات المنجزة</span>
            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-4xl font-display text-foreground">{totalCompleted}</span>
              <span className="text-xs text-muted-foreground">محاولة</span>
            </div>
          </div>

          <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-2">
            <span className="text-xs text-muted-foreground">متوسط التحصيل</span>
            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-4xl font-display text-emerald-400">{averagePercentage}%</span>
            </div>
          </div>

          <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-2">
            <span className="text-xs text-muted-foreground">أفضل علامة</span>
            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-4xl font-display text-amber-400">{highestScoreObj.pct}%</span>
              <span className="text-xs text-muted-foreground">({highestScoreObj.score})</span>
            </div>
          </div>
        </div>

        {/* Gamification Badges Section */}
        <div className="space-y-6 pt-6 border-t border-white/10">
          <h3 className="text-3xl font-display font-normal text-foreground">الأوسمة والدروع المحققة</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Badge 1: Perfect Score */}
            {results.some(r => r.score === r.total_questions && r.total_questions > 0) ? (
              <div className="liquid-glass-glow rounded-3xl p-6 border border-amber-400/30 flex items-center gap-4">
                <span className="h-14 w-14 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/30">
                  <Trophy className="w-7 h-7 text-amber-400" />
                </span>
                <div>
                  <h4 className="font-display text-lg text-foreground">العلامة التامة</h4>
                  <p className="text-xs text-muted-foreground mt-1">حل اختبار كامل بنسبة 100%</p>
                </div>
              </div>
            ) : (
              <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex items-center gap-4 opacity-50">
                <span className="h-14 w-14 rounded-2xl bg-white/5 text-muted-foreground flex items-center justify-center shrink-0 border border-white/10">
                  <Lock className="w-7 h-7 text-muted-foreground" />
                </span>
                <div>
                  <h4 className="font-display text-lg text-muted-foreground">العلامة التامة (مغلق)</h4>
                  <p className="text-xs text-muted-foreground mt-1">حل اختبار كامل بنسبة 100%</p>
                </div>
              </div>
            )}

            {/* Badge 2: Determined Focus */}
            {focusSessions >= 3 ? (
              <div className="liquid-glass-glow rounded-3xl p-6 border border-cyan-400/30 flex items-center gap-4">
                <span className="h-14 w-14 rounded-2xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0 border border-cyan-400/30">
                  <Timer className="w-7 h-7 text-cyan-300" />
                </span>
                <div>
                  <h4 className="font-display text-lg text-foreground">المثابرة المتواصلة</h4>
                  <p className="text-xs text-muted-foreground mt-1">إتمام 3 جلسات تركيز</p>
                </div>
              </div>
            ) : (
              <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex items-center gap-4 opacity-50">
                <span className="h-14 w-14 rounded-2xl bg-white/5 text-muted-foreground flex items-center justify-center shrink-0 border border-white/10">
                  <Lock className="w-7 h-7 text-muted-foreground" />
                </span>
                <div>
                  <h4 className="font-display text-lg text-muted-foreground">المثابرة (مغلق)</h4>
                  <p className="text-xs text-muted-foreground mt-1">إتمام 3 جلسات تركيز</p>
                </div>
              </div>
            )}

            {/* Badge 3: Scholar */}
            {totalCompleted >= 3 ? (
              <div className="liquid-glass-glow rounded-3xl p-6 border border-emerald-400/30 flex items-center gap-4">
                <span className="h-14 w-14 rounded-2xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
                  <GraduationCap className="w-7 h-7 text-emerald-300" />
                </span>
                <div>
                  <h4 className="font-display text-lg text-foreground">الطالب المجتهد</h4>
                  <p className="text-xs text-muted-foreground mt-1">حل 3 اختبارات أو مذاكرات</p>
                </div>
              </div>
            ) : (
              <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex items-center gap-4 opacity-50">
                <span className="h-14 w-14 rounded-2xl bg-white/5 text-muted-foreground flex items-center justify-center shrink-0 border border-white/10">
                  <Lock className="w-7 h-7 text-muted-foreground" />
                </span>
                <div>
                  <h4 className="font-display text-lg text-muted-foreground">المجتهد (مغلق)</h4>
                  <p className="text-xs text-muted-foreground mt-1">حل 3 اختبارات أو مذاكرات</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="space-y-6 pt-6 border-t border-white/10">
          <h3 className="text-3xl font-display font-normal text-foreground">سجل الاختبارات والمذاكرات</h3>
          
          {results.length === 0 ? (
            <div className="liquid-glass rounded-3xl p-12 text-center text-muted-foreground text-sm border border-white/10">
              لم تقم بحل أي اختبارات بعد.
            </div>
          ) : (
            <div className="liquid-glass rounded-3xl overflow-hidden border border-white/10">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-muted-foreground font-medium">
                    <th className="p-4">اسم الاختبار</th>
                    <th className="p-4">الدرجة</th>
                    <th className="p-4">النسبة المئوية</th>
                    <th className="p-4">تاريخ الحل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {results.map((res) => {
                    const pct = Math.round((res.score / res.total_questions) * 100);
                    return (
                      <tr key={res.id} className="hover:bg-white/5 transition-colors text-foreground">
                        <td className="p-4 font-medium">
                          {res.quizzes?.title || 'اختبار مراجعة'}
                        </td>
                        <td className="p-4">
                          {res.score} / {res.total_questions}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-medium ${
                            pct >= 50 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {pct}% {pct >= 50 ? 'ناجح' : 'غير ناجح'}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(res.completed_at).toLocaleDateString('ar-SY')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
