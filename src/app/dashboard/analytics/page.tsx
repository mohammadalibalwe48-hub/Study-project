'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { getUserXPAndStreak } from '@/utils/xpHelper';
import { FlameIcon, LightningIcon } from '@/components/icons/SvgIcons';
import { Trophy, Target, TrendingUp, Award, ArrowLeft } from 'lucide-react';

interface QuizResult {
  id: number;
  score: number;
  total_questions: number;
  completed_at: string;
  quizzes?: {
    title: string;
    subjects?: {
      id: number;
      name: string;
    } | null;
  } | null;
}

interface SubjectPerformance {
  subjectId: number;
  subjectName: string;
  attempts: number;
  totalCorrect: number;
  totalQuestions: number;
  averageScorePercent: number;
}

export default function AnalyticsPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [xpData, setXpData] = useState<{ xp: number; streak_days: number } | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  const fetchData = async () => {
    if (!user) return;
    try {
      setDbLoading(true);

      const xp = await getUserXPAndStreak(user.id);
      setXpData(xp);

      const { data: resultsData, error: resultsErr } = await supabase
        .from('quiz_results')
        .select(`
          id,
          score,
          total_questions,
          completed_at,
          quizzes (
            title,
            subjects (
              id,
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (resultsErr) throw resultsErr;
      setResults(resultsData as any || []);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading || dbLoading) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="p-8">
          <DashboardSkeleton />
        </div>
      </SidebarLayout>
    );
  }

  const totalCompletedQuizzes = results.length;
  const overallAveragePercent = totalCompletedQuizzes > 0
    ? Math.round(
        (results.reduce((acc, curr) => acc + (curr.score / curr.total_questions), 0) / totalCompletedQuizzes) * 100
      )
    : 0;

  const subjectMap: Record<number, SubjectPerformance> = {};
  results.forEach((res) => {
    const subj = res.quizzes?.subjects;
    if (subj) {
      if (!subjectMap[subj.id]) {
        subjectMap[subj.id] = {
          subjectId: subj.id,
          subjectName: subj.name,
          attempts: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          averageScorePercent: 0,
        };
      }
      subjectMap[subj.id].attempts += 1;
      subjectMap[subj.id].totalCorrect += res.score;
      subjectMap[subj.id].totalQuestions += res.total_questions;
    }
  });

  const subjectPerformances: SubjectPerformance[] = Object.values(subjectMap).map((sp) => ({
    ...sp,
    averageScorePercent: Math.round((sp.totalCorrect / sp.totalQuestions) * 100),
  }));

  const strengths = subjectPerformances.filter((sp) => sp.averageScorePercent >= 70);
  const weakSpots = subjectPerformances.filter((sp) => sp.averageScorePercent < 70);

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <main className="mx-auto w-full max-w-[1180px] space-y-8 text-right bg-dot-pattern py-4" dir="rtl">
        
        {/* Header */}
        <div className="flex flex-col gap-4 border-b-2 border-[#282825] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="app-chip bg-[#bce9fa] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
              <TrendingUp className="h-4 w-4 text-[#ff5636]" /> التحليل التكيّفي الذكي
            </span>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl text-[#282825]">
              تحليل المستوى والتحصيل
            </h1>
            <p className="text-[#5f5f59] text-sm max-w-xl leading-relaxed font-semibold mt-1">
              تقارير بيانية تفصيلية لكشف نقاط القوة ومكامن الضعف ومعدل الاستجابة الامتحانية.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="app-chip bg-[#ffd64d] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black text-xs">
              <LightningIcon className="w-4 h-4 text-[#ff5636]" /> {xpData?.xp || 0} XP
            </span>
            <span className="app-chip bg-[#dcbcff] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black text-xs">
              <FlameIcon className="w-4 h-4 text-[#ff5636]" /> {xpData?.streak_days || 0} أيام
            </span>
          </div>
        </div>

        {/* Global Performance Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-2xl border-2 border-[#282825] bg-[#cce6b4] p-6 shadow-[5px_5px_0_#282825] space-y-2">
            <span className="text-xs font-black text-[#282825]">معدل التحصيل العام</span>
            <div className="text-5xl font-black text-[#282825] pt-1">{overallAveragePercent}%</div>
          </div>

          <div className="rounded-2xl border-2 border-[#282825] bg-[#bce9fa] p-6 shadow-[5px_5px_0_#282825] space-y-2">
            <span className="text-xs font-black text-[#282825]">إجمالي الاختبارات المحلولة</span>
            <div className="text-4xl font-black text-[#282825] pt-1">{totalCompletedQuizzes} اختبارات</div>
          </div>

          <div className="rounded-2xl border-2 border-[#282825] bg-[#ffdc72] p-6 shadow-[5px_5px_0_#282825] space-y-2">
            <span className="text-xs font-black text-[#282825]">المواد المغطاة</span>
            <div className="text-4xl font-black text-[#282825] pt-1">{subjectPerformances.length} مواد</div>
          </div>
        </div>

        {/* Strengths & Weaknesses Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Strengths */}
          <div className="rounded-2xl border-2 border-[#282825] bg-white p-6 shadow-[5px_5px_0_#282825] space-y-4">
            <h3 className="text-2xl font-black text-[#282825] border-b-2 border-[#282825]/10 pb-3 flex items-center justify-between">
              <span>نقاط القوة والتفوق</span>
              <Trophy className="w-6 h-6 text-[#ff5636]" />
            </h3>
            
            {strengths.length === 0 ? (
              <p className="text-xs font-bold text-[#5f5f59]">قم بإنهاء المزيد من الاختبارات بنسبة أعلى من 70% لإظهار المواد المتميزة.</p>
            ) : (
              <div className="space-y-3">
                {strengths.map((sp) => (
                  <div key={sp.subjectId} className="rounded-xl border-2 border-[#282825] bg-[#cce6b4]/30 p-4 flex justify-between items-center text-xs shadow-[2px_2px_0_#282825]">
                    <div>
                      <h4 className="font-black text-[#282825] text-sm">{sp.subjectName}</h4>
                      <span className="text-[11px] font-bold text-[#5f5f59]">{sp.attempts} محاولات</span>
                    </div>
                    <span className="text-[#15803d] font-black text-lg bg-white border border-[#282825] px-3 py-1 rounded-lg shadow-[1px_1px_0_#282825]">
                      %{sp.averageScorePercent}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weaknesses */}
          <div className="rounded-2xl border-2 border-[#282825] bg-[#ff5636]/10 p-6 shadow-[5px_5px_0_#282825] space-y-4">
            <h3 className="text-2xl font-black text-[#282825] border-b-2 border-[#282825]/10 pb-3 flex items-center justify-between">
              <span>مواد بحاجة لمراجعة</span>
              <Target className="w-6 h-6 text-[#ff5636]" />
            </h3>
            
            {weakSpots.length === 0 ? (
              <p className="text-xs font-bold text-[#5f5f59]">لا توجد مواد ضعيفة حالياً! أداؤك ممتاز جداً.</p>
            ) : (
              <div className="space-y-3">
                {weakSpots.map((sp) => (
                  <div key={sp.subjectId} className="rounded-xl border-2 border-[#282825] bg-white p-4 flex justify-between items-center text-xs shadow-[2px_2px_0_#282825]">
                    <div>
                      <h4 className="font-black text-[#282825] text-sm">{sp.subjectName}</h4>
                      <span className="text-[11px] font-bold text-[#5f5f59]">{sp.attempts} محاولات</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#b91c1c] font-black text-lg bg-[#ff5636]/10 border border-[#282825] px-3 py-1 rounded-lg">
                        %{sp.averageScorePercent}
                      </span>
                      <Link
                        href={`/subjects/${sp.subjectId}`}
                        className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-3.5 py-1.5 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[3px_3px_0_#282825] transition-all flex items-center gap-1"
                      >
                        <span>تدرب الآن</span>
                        <ArrowLeft className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </main>
    </SidebarLayout>
  );
}
