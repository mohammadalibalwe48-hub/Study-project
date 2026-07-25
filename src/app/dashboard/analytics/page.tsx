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
import { Trophy, Target } from 'lucide-react';

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
      <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 overflow-y-auto text-right border border-white/15">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/10 pb-6">
          <div>
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-cyan-300 border border-cyan-400/20 uppercase inline-block">
              التحليل التكيّفي الذكي
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3">
              تحليل المستوى والتحصيل
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              تقارير بيانية تفصيلية لكشف نقاط القوة ومكامن الضعف ومعدل الاستجابة الامتحانية.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="liquid-glass-glow rounded-full px-4 py-2 text-xs text-foreground font-medium flex items-center gap-2 border border-amber-400/30">
              <LightningIcon className="w-4 h-4 text-amber-400" /> {xpData?.xp || 0} XP
            </span>
            <span className="liquid-glass-glow rounded-full px-4 py-2 text-xs text-foreground font-medium flex items-center gap-2 border border-rose-400/30">
              <FlameIcon className="w-4 h-4 text-rose-400" /> {xpData?.streak_days || 0} أيام
            </span>
          </div>
        </div>

        {/* Global Performance Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-2">
            <span className="text-xs text-muted-foreground">معدل التحصيل العام</span>
            <div className="text-4xl font-display text-emerald-400 pt-2">{overallAveragePercent}%</div>
          </div>

          <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-2">
            <span className="text-xs text-muted-foreground">إجمالي الاختبارات المحلولة</span>
            <div className="text-4xl font-display text-cyan-300 pt-2">{totalCompletedQuizzes} اختبار</div>
          </div>

          <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-2">
            <span className="text-xs text-muted-foreground">المواد المغطاة</span>
            <div className="text-4xl font-display text-amber-400 pt-2">{subjectPerformances.length} مادة</div>
          </div>
        </div>

        {/* Strengths & Weaknesses Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Strengths */}
          <div className="liquid-glass rounded-3xl p-6 border border-emerald-400/30 space-y-4">
            <h3 className="text-2xl font-display text-foreground border-b border-white/10 pb-3 flex items-center gap-2">
              نقاط القوة والتفوق <Trophy className="w-6 h-6 text-amber-400" />
            </h3>
            {strengths.length === 0 ? (
              <p className="text-xs text-muted-foreground">قم بإنهاء المزيد من الاختبارات بنسبة أعلى من 70% لإظهار المواد المتميزة.</p>
            ) : (
              <div className="space-y-3">
                {strengths.map((sp) => (
                  <div key={sp.subjectId} className="liquid-glass rounded-2xl p-4 border border-white/10 flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-medium text-foreground text-sm">{sp.subjectName}</h4>
                      <span className="text-[11px] text-muted-foreground">{sp.attempts} محاولات</span>
                    </div>
                    <span className="text-emerald-400 font-bold text-base">%{sp.averageScorePercent}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weaknesses */}
          <div className="liquid-glass rounded-3xl p-6 border border-rose-400/30 space-y-4">
            <h3 className="text-2xl font-display text-foreground border-b border-white/10 pb-3 flex items-center gap-2">
              مواد بحاجة لمراجعة وإعادة تدريب <Target className="w-6 h-6 text-rose-400" />
            </h3>
            {weakSpots.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد مواد ضعيفة حالياً! أداءك ممتاز جداً.</p>
            ) : (
              <div className="space-y-3">
                {weakSpots.map((sp) => (
                  <div key={sp.subjectId} className="liquid-glass rounded-2xl p-4 border border-white/10 flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-medium text-foreground text-sm">{sp.subjectName}</h4>
                      <span className="text-[11px] text-muted-foreground">{sp.attempts} محاولات</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-rose-400 font-bold text-base">%{sp.averageScorePercent}</span>
                      <Link
                        href={`/subjects/${sp.subjectId}`}
                        className="liquid-glass-glow rounded-full px-3 py-1 text-[11px] text-foreground hover:scale-105 border border-cyan-400/30"
                      >
                        تدرب الآن ←
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </SidebarLayout>
  );
}
