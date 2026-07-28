'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { Trophy, Medal, Award, Crown, Sparkles } from 'lucide-react';

export default function LeaderboardPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [dbLoading, setDbLoading] = useState(true);
  const [realLeaderboard, setRealLeaderboard] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchLeaderboard() {
      if (!user || !profile || profile.role === 'admin') return;

      try {
        setDbLoading(true);
        const { data: leaderData, error: leaderErr } = await supabase
          .from('quiz_results')
          .select(`
            score,
            total_questions,
            users (
              full_name
            ),
            quizzes (
              subjects (
                name
              )
            )
          `)
          .order('score', { ascending: false })
          .limit(20);

        if (leaderErr) throw leaderErr;

        if (leaderData) {
          const formatted = leaderData.map((item: any) => {
            const userName = item.users?.full_name || 'طالب متفوق';
            const quizObj = Array.isArray(item.quizzes) ? item.quizzes[0] : item.quizzes;
            const subjectObj = quizObj ? (Array.isArray(quizObj.subjects) ? quizObj.subjects[0] : quizObj.subjects) : null;
            const subjectName = subjectObj?.name || 'مقرر عام';
            return {
              name: userName,
              course: subjectName,
              scorePercent: Math.round((item.score / item.total_questions) * 100),
            };
          });
          setRealLeaderboard(formatted);
        }
      } catch (err: any) {
        console.error('Error fetching leaderboard data:', err.message);
      } finally {
        setDbLoading(false);
      }
    }

    if (user && profile) {
      fetchLeaderboard();
    }
  }, [user, profile]);

  if (loading || dbLoading) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="p-8">
          <TableSkeleton rows={6} />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <main className="mx-auto w-full max-w-[1180px] space-y-8 text-right bg-dot-pattern py-4" dir="rtl">
        
        {/* Header */}
        <div className="space-y-3 border-b-2 border-[#282825] pb-6">
          <span className="app-chip bg-[#ffd64d] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
            <Trophy className="h-4 w-4 text-[#ff5636]" /> قائمة الشرف والتفوق
          </span>
          <h1 className="mt-2 text-3xl font-black sm:text-5xl text-[#282825]">
            لوحة الصدارة والأوائل
          </h1>
          <p className="text-[#5f5f59] text-sm max-w-xl leading-relaxed font-semibold">
            قائمة الطلاب المتفوقين في النماذج الامتحانية المؤتمتة. حل المزيد من الاختبارات للوصول إلى القمة!
          </p>
        </div>

        {realLeaderboard.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#282825] bg-white p-16 text-center text-[#5f5f59] text-sm font-black shadow-[4px_4px_0_#282825] space-y-4">
            <Trophy className="w-12 h-12 text-[#ff5636] mx-auto" />
            <h3 className="text-2xl font-black text-[#282825]">لا توجد نتائج مسجلة حتى الآن</h3>
            <p className="text-xs font-semibold">حل الاختبارات للظهور في لوحة الصدارة.</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Top 3 Podium Cards */}
            {realLeaderboard.length >= 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                
                {/* 2nd Place */}
                <div className="rounded-2xl border-2 border-[#282825] bg-[#bce9fa] p-6 shadow-[5px_5px_0_#282825] flex flex-col justify-between items-center text-center order-2 sm:order-1">
                  <div className="flex flex-col items-center space-y-2">
                    <span className="h-12 w-12 rounded-xl border-2 border-[#282825] bg-white flex items-center justify-center font-black text-xl shadow-[2px_2px_0_#282825]">
                      🥈 2
                    </span>
                    <h3 className="font-black text-xl text-[#282825] mt-2">{realLeaderboard[1].name}</h3>
                    <span className="text-xs font-extrabold text-[#282825]/70">{realLeaderboard[1].course}</span>
                  </div>
                  <span className="app-chip bg-white border border-[#282825] px-4 py-1 text-sm font-black shadow-[1.5px_1.5px_0_#282825] mt-4">
                    %{realLeaderboard[1].scorePercent}
                  </span>
                </div>

                {/* 1st Place */}
                <div className="rounded-2xl border-2 border-[#282825] bg-[#ffd64d] p-6 shadow-[6px_6px_0_#282825] flex flex-col justify-between items-center text-center order-1 sm:order-2 sm:-translate-y-2 bg-stripe-pattern">
                  <div className="flex flex-col items-center space-y-2">
                    <span className="h-14 w-14 rounded-2xl border-2 border-[#282825] bg-white flex items-center justify-center font-black text-2xl shadow-[3px_3px_0_#282825]">
                      🥇 1
                    </span>
                    <div className="flex items-center gap-1">
                      <Crown className="h-5 w-5 text-[#ff5636]" />
                      <h3 className="font-black text-2xl text-[#282825]">{realLeaderboard[0].name}</h3>
                    </div>
                    <span className="text-xs font-extrabold text-[#282825]">{realLeaderboard[0].course}</span>
                  </div>
                  <span className="app-chip bg-[#ff5636] text-white border border-[#282825] px-5 py-1.5 text-base font-black shadow-[2px_2px_0_#282825] mt-4">
                    %{realLeaderboard[0].scorePercent}
                  </span>
                </div>

                {/* 3rd Place */}
                <div className="rounded-2xl border-2 border-[#282825] bg-[#d8bcff] p-6 shadow-[5px_5px_0_#282825] flex flex-col justify-between items-center text-center order-3">
                  <div className="flex flex-col items-center space-y-2">
                    <span className="h-12 w-12 rounded-xl border-2 border-[#282825] bg-white flex items-center justify-center font-black text-xl shadow-[2px_2px_0_#282825]">
                      🥉 3
                    </span>
                    <h3 className="font-black text-xl text-[#282825] mt-2">{realLeaderboard[2].name}</h3>
                    <span className="text-xs font-extrabold text-[#282825]/70">{realLeaderboard[2].course}</span>
                  </div>
                  <span className="app-chip bg-white border border-[#282825] px-4 py-1 text-sm font-black shadow-[1.5px_1.5px_0_#282825] mt-4">
                    %{realLeaderboard[2].scorePercent}
                  </span>
                </div>

              </div>
            )}

            {/* Complete Ranking List Table */}
            <div className="rounded-2xl border-2 border-[#282825] bg-white overflow-hidden shadow-[5px_5px_0_#282825]">
              <div className="divide-y-2 border-[#282825]/10">
                {realLeaderboard.map((item, index) => {
                  const isTop1 = index === 0;
                  const isTop2 = index === 1;
                  const isTop3 = index === 2;

                  return (
                    <div
                      key={index}
                      className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#fafaf7] transition-colors gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`w-10 h-10 rounded-xl border-2 border-[#282825] flex items-center justify-center font-black text-sm shadow-[1.5px_1.5px_0_#282825] ${
                            isTop1
                              ? 'bg-[#ffd64d] text-[#282825]'
                              : isTop2
                              ? 'bg-[#bce9fa] text-[#282825]'
                              : isTop3
                              ? 'bg-[#d8bcff] text-[#282825]'
                              : 'bg-white text-[#282825]'
                          }`}
                        >
                          {index + 1}
                        </span>

                        <div className="text-right">
                          <h3 className="text-base font-black text-[#282825]">{item.name}</h3>
                          <span className="text-xs font-semibold text-[#5f5f59]">{item.course}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isTop1 && <span className="app-chip bg-[#ffd64d] border border-[#282825] text-xs font-black shadow-[1px_1px_0_#282825] hidden sm:flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-[#ff5636]" /> المركز الأول</span>}
                        {isTop2 && <span className="app-chip bg-[#bce9fa] border border-[#282825] text-xs font-black shadow-[1px_1px_0_#282825] hidden sm:flex items-center gap-1"><Medal className="w-3.5 h-3.5 text-[#ff5636]" /> المركز الثاني</span>}
                        {isTop3 && <span className="app-chip bg-[#d8bcff] border border-[#282825] text-xs font-black shadow-[1px_1px_0_#282825] hidden sm:flex items-center gap-1"><Award className="w-3.5 h-3.5 text-[#ff5636]" /> المركز الثالث</span>}

                        <span className="app-chip bg-[#cce6b4] border border-[#282825] px-3.5 py-1 text-xs font-black shadow-[1.5px_1.5px_0_#282825]">
                          %{item.scorePercent}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </main>
    </SidebarLayout>
  );
}
