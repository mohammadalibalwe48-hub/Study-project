'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { Trophy, Lock, Timer, GraduationCap, UserCheck, Award, ArrowLeft } from 'lucide-react';

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
      <main className="mx-auto w-full max-w-[1180px] space-y-8 text-right bg-dot-pattern py-4" dir="rtl">
        
        {/* Header */}
        <div className="flex items-center justify-between w-full border-b-2 border-[#282825] pb-4">
          <div className="flex items-center gap-2 text-xs font-black text-[#5f5f59]">
            <Link href="/dashboard" className="hover:text-[#ff5636] transition-colors">
              لوحة التحكم
            </Link>
            <span>/</span>
            <span className="text-[#282825]">الملف الشخصي والإنجازات</span>
          </div>

          <Link
            href="/dashboard"
            className="app-button border-2 border-[#282825] bg-white text-[#282825] px-4 py-1.5 text-xs font-black shadow-[2px_2px_0_#282825] hover:bg-[#282825] hover:text-white transition-all flex items-center gap-1"
          >
            <span>لوحة التحكم</span>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* User details banner */}
        <div className="rounded-2xl border-2 border-[#282825] bg-[#ffd64d] p-6 sm:p-8 shadow-[6px_6px_0_#282825] flex flex-col sm:flex-row items-center sm:justify-between gap-6 bg-stripe-pattern">
          <div className="flex items-center gap-6 text-center sm:text-right flex-col sm:flex-row">
            <div className="h-20 w-20 rounded-2xl border-2 border-[#282825] bg-white text-[#ff5636] flex items-center justify-center font-black text-4xl shrink-0 shadow-[3px_3px_0_#282825]">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-[#282825]">{profile?.full_name}</h1>
              <p className="app-chip bg-white border border-[#282825] text-xs font-black px-3 py-1 shadow-[1.5px_1.5px_0_#282825] inline-block">{profile?.email}</p>
              <div className="mt-2">
                <span className="app-chip bg-[#bce9fa] border border-[#282825] text-xs font-black px-3.5 py-1 shadow-[1.5px_1.5px_0_#282825] inline-block">
                  المسار: الفرع {branchName} 🎓
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-2xl border-2 border-[#282825] bg-[#bce9fa] p-6 shadow-[5px_5px_0_#282825] space-y-2">
            <span className="text-xs font-black text-[#282825]">الاختبارات المنجزة</span>
            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-4xl font-black text-[#282825]">{totalCompleted}</span>
              <span className="text-xs font-black text-[#282825]/70">محاولات</span>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[#282825] bg-[#cce6b4] p-6 shadow-[5px_5px_0_#282825] space-y-2">
            <span className="text-xs font-black text-[#282825]">متوسط التحصيل</span>
            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-4xl font-black text-[#15803d]">{averagePercentage}%</span>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[#282825] bg-[#ffdc72] p-6 shadow-[5px_5px_0_#282825] space-y-2">
            <span className="text-xs font-black text-[#282825]">أفضل علامة</span>
            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-4xl font-black text-[#282825]">{highestScoreObj.pct}%</span>
              <span className="text-xs font-black text-[#282825]/70">({highestScoreObj.score})</span>
            </div>
          </div>
        </div>

        {/* Gamification Badges Section */}
        <div className="space-y-6 pt-4">
          <h2 className="text-2xl font-black text-[#282825]">الأوسمة والدروع المحققة</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Badge 1: Perfect Score */}
            {results.some(r => r.score === r.total_questions && r.total_questions > 0) ? (
              <div className="rounded-2xl border-2 border-[#282825] bg-[#ffd64d] p-6 shadow-[5px_5px_0_#282825] flex items-center gap-4">
                <span className="h-14 w-14 rounded-xl bg-white border-2 border-[#282825] text-[#ff5636] flex items-center justify-center shrink-0 shadow-[2px_2px_0_#282825]">
                  <Trophy className="w-7 h-7 text-[#ff5636]" />
                </span>
                <div>
                  <h3 className="font-black text-lg text-[#282825]">العلامة التامة ⭐️</h3>
                  <p className="text-xs font-bold text-[#282825]/80 mt-1">حل اختبار كامل بنسبة 100%</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-[#282825]/30 bg-[#fafaf7] p-6 shadow-[2px_2px_0_#282825]/20 flex items-center gap-4 opacity-50">
                <span className="h-14 w-14 rounded-xl bg-white border border-[#282825]/30 text-[#77776f] flex items-center justify-center shrink-0">
                  <Lock className="w-7 h-7" />
                </span>
                <div>
                  <h3 className="font-black text-lg text-[#77776f]">العلامة التامة (مغلق)</h3>
                  <p className="text-xs font-bold text-[#77776f] mt-1">حل اختبار كامل بنسبة 100%</p>
                </div>
              </div>
            )}

            {/* Badge 2: Determined Focus */}
            {focusSessions >= 3 ? (
              <div className="rounded-2xl border-2 border-[#282825] bg-[#bce9fa] p-6 shadow-[5px_5px_0_#282825] flex items-center gap-4">
                <span className="h-14 w-14 rounded-xl bg-white border-2 border-[#282825] text-[#ff5636] flex items-center justify-center shrink-0 shadow-[2px_2px_0_#282825]">
                  <Timer className="w-7 h-7 text-[#ff5636]" />
                </span>
                <div>
                  <h3 className="font-black text-lg text-[#282825]">المثابرة المتواصلة ⏱️</h3>
                  <p className="text-xs font-bold text-[#282825]/80 mt-1">إتمام 3 جلسات تركيز</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-[#282825]/30 bg-[#fafaf7] p-6 shadow-[2px_2px_0_#282825]/20 flex items-center gap-4 opacity-50">
                <span className="h-14 w-14 rounded-xl bg-white border border-[#282825]/30 text-[#77776f] flex items-center justify-center shrink-0">
                  <Lock className="w-7 h-7" />
                </span>
                <div>
                  <h3 className="font-black text-lg text-[#77776f]">المثابرة (مغلق)</h3>
                  <p className="text-xs font-bold text-[#77776f] mt-1">إتمام 3 جلسات تركيز</p>
                </div>
              </div>
            )}

            {/* Badge 3: Scholar */}
            {totalCompleted >= 3 ? (
              <div className="rounded-2xl border-2 border-[#282825] bg-[#d8bcff] p-6 shadow-[5px_5px_0_#282825] flex items-center gap-4">
                <span className="h-14 w-14 rounded-xl bg-white border-2 border-[#282825] text-[#ff5636] flex items-center justify-center shrink-0 shadow-[2px_2px_0_#282825]">
                  <GraduationCap className="w-7 h-7 text-[#ff5636]" />
                </span>
                <div>
                  <h3 className="font-black text-lg text-[#282825]">الطالب المجتهد 🎓</h3>
                  <p className="text-xs font-bold text-[#282825]/80 mt-1">حل 3 اختبارات أو مذاكرات</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-[#282825]/30 bg-[#fafaf7] p-6 shadow-[2px_2px_0_#282825]/20 flex items-center gap-4 opacity-50">
                <span className="h-14 w-14 rounded-xl bg-white border border-[#282825]/30 text-[#77776f] flex items-center justify-center shrink-0">
                  <Lock className="w-7 h-7" />
                </span>
                <div>
                  <h3 className="font-black text-lg text-[#77776f]">المجتهد (مغلق)</h3>
                  <p className="text-xs font-bold text-[#77776f] mt-1">حل 3 اختبارات أو مذاكرات</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="space-y-6 pt-4">
          <h2 className="text-2xl font-black text-[#282825]">سجل الاختبارات والمذاكرات</h2>
          
          {results.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[#282825] bg-white p-12 text-center text-[#5f5f59] text-sm font-black shadow-[4px_4px_0_#282825]">
              لم تقم بحل أي اختبارات بعد.
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-[#282825] bg-white overflow-hidden shadow-[5px_5px_0_#282825]">
              <table className="w-full text-right border-collapse text-xs font-bold">
                <thead>
                  <tr className="border-b-2 border-[#282825] bg-[#ffd64d] text-[#282825] font-black">
                    <th className="p-4">اسم الاختبار</th>
                    <th className="p-4">الدرجة</th>
                    <th className="p-4">النسبة المئوية</th>
                    <th className="p-4">تاريخ الحل</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-[#282825]/10">
                  {results.map((res) => {
                    const pct = Math.round((res.score / res.total_questions) * 100);
                    return (
                      <tr key={res.id} className="hover:bg-[#fafaf7] transition-colors text-[#282825]">
                        <td className="p-4 font-black">
                          {res.quizzes?.title || 'اختبار مراجعة'}
                        </td>
                        <td className="p-4 font-black">
                          {res.score} / {res.total_questions}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-lg border border-[#282825] text-[11px] font-black shadow-[1px_1px_0_#282825] ${
                            pct >= 50 ? 'bg-[#cce6b4] text-[#15803d]' : 'bg-[#ff5636] text-white'
                          }`}>
                            {pct}% {pct >= 50 ? 'ناجح 🟢' : 'غير ناجح 🔴'}
                          </span>
                        </td>
                        <td className="p-4 text-[#5f5f59]">
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
      </main>
    </SidebarLayout>
  );
}
