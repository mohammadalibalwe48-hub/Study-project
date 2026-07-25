'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { Trophy, Medal, Award } from 'lucide-react';

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
      <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 border border-white/15 text-right overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full space-y-8">
          
          <div className="space-y-4 border-b border-white/10 pb-6">
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-amber-300 border border-amber-400/20 uppercase inline-block">
              قائمة الشرف والتفوق
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground">
              لوحة الصدارة والأوائل
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              قائمة الطلاب المتفوقين في النماذج الامتحانية المؤتمتة. حل المزيد من الاختبارات للوصول إلى القمة!
            </p>
          </div>

          {realLeaderboard.length === 0 ? (
            <div className="liquid-glass rounded-3xl p-16 text-center text-muted-foreground text-sm border border-white/10 space-y-4">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
              <h3 className="text-2xl font-display text-foreground">لا توجد نتائج مسجلة حتى الآن</h3>
              <p className="text-xs">حل الاختبارات للظهور في لوحة الصدارة.</p>
            </div>
          ) : (
            <div className="liquid-glass rounded-3xl overflow-hidden border border-white/15">
              <div className="divide-y divide-white/10">
                {realLeaderboard.map((item, index) => {
                  const isTop1 = index === 0;
                  const isTop2 = index === 1;
                  const isTop3 = index === 2;

                  return (
                    <div
                      key={index}
                      className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-base ${
                            isTop1
                              ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20'
                              : isTop2
                              ? 'bg-slate-300 text-slate-950 shadow-lg shadow-slate-300/20'
                              : isTop3
                              ? 'bg-amber-700 text-white'
                              : 'bg-white/5 text-muted-foreground border border-white/10'
                          }`}
                        >
                          {index + 1}
                        </span>

                        <div className="text-right">
                          <h4 className="text-lg font-medium text-foreground">{item.name}</h4>
                          <span className="text-xs text-muted-foreground">{item.course}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isTop1 && <span className="text-xs text-amber-400 font-medium flex items-center gap-1"><Trophy className="w-4 h-4 text-amber-400" /> المركز الأول</span>}
                        {isTop2 && <span className="text-xs text-slate-300 font-medium flex items-center gap-1"><Medal className="w-4 h-4 text-slate-300" /> المركز الثاني</span>}
                        {isTop3 && <span className="text-xs text-amber-600 font-medium flex items-center gap-1"><Award className="w-4 h-4 text-amber-600" /> المركز الثالث</span>}

                        <span className="liquid-glass-glow rounded-full px-4 py-1.5 text-xs text-emerald-400 font-bold border border-emerald-400/30">
                          %{item.scorePercent}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
