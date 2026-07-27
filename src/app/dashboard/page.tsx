'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { BookIcon, ScienceIcon, SparkIcon } from '@/components/icons/SvgIcons';
import RecommendedCourses from '@/components/dashboard/RecommendedCourses';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import { getUserXPAndStreak } from '@/utils/xpHelper';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { Sparkles } from 'lucide-react';

interface Branch {
  id: number;
  name: string;
  slug: string;
  description: string;
}

interface Subject {
  id: number;
  name: string;
  description: string;
  image_url: string | null;
}

interface QuizResult {
  score: number;
  total_questions: number;
}

export default function DashboardPage() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [updatingBranch, setUpdatingBranch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [realLeaderboard, setRealLeaderboard] = useState<any[]>([]);
  const [xpData, setXpData] = useState<{ xp: number; streak_days: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile && profile.role === 'admin') {
      router.push('/admin');
    }
  }, [profile, router]);

  useEffect(() => {
    async function fetchData(retries = 2) {
      if (!user || !profile || profile.role === 'admin') return;

      try {
        setDbLoading(true);
        const { data: branchData, error: branchErr } = await supabase
          .from('branches')
          .select('*');
        if (branchErr) throw branchErr;
        setBranches(branchData || []);

        if (profile.branch_id) {
          const { data: subjectData, error: subjectErr } = await supabase
            .from('subjects')
            .select('*')
            .eq('branch_id', profile.branch_id);
          if (subjectErr) throw subjectErr;
          setSubjects(subjectData || []);

          const { data: resultData, error: resultErr } = await supabase
            .from('quiz_results')
            .select('score, total_questions')
            .eq('user_id', user.id);
          if (resultErr) throw resultErr;
          setResults(resultData || []);

          // Fetch leaderboard
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
            .limit(5);

          if (!leaderErr && leaderData) {
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

          // Fetch XP and streak
          const xp = await getUserXPAndStreak(user.id);
          setXpData(xp);
        }
        setDbLoading(false);
      } catch (err: any) {
        if (err.code === 'PGRST303' && retries > 0) {
          console.warn('JWT issued in the future (PGRST303). Retrying fetch in 1 second...');
          setTimeout(() => fetchData(retries - 1), 1000);
          return;
        }
        console.error('Error fetching dashboard data:', {
          message: err.message || String(err),
          details: err.details,
          hint: err.hint,
          code: err.code,
        });
        setDbLoading(false);
      }
    }

    if (user && profile) {
      fetchData();
    }
  }, [user, profile]);

  const handleSelectBranch = async (branchId: number) => {
    if (!user) return;
    setUpdatingBranch(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ branch_id: branchId })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
    } catch (err) {
      console.error('Error choosing branch:', err);
      alert('حدث خطأ أثناء حفظ اختيارك، يرجى المحاولة لاحقاً.');
    } finally {
      setUpdatingBranch(false);
    }
  };

  const handleClearBranch = async () => {
    if (!user) return;
    if (!confirm('هل أنت متأكد أنك تريد تغيير فرعك الدراسي؟ سيتم تصفير تقدمك بالفرع الحالي.')) return;
    setUpdatingBranch(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ branch_id: null })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      setSubjects([]);
    } catch (err) {
      console.error('Error clearing branch:', err);
    } finally {
      setUpdatingBranch(false);
    }
  };

  if (loading || dbLoading) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="p-6">
          <DashboardSkeleton />
        </div>
      </SidebarLayout>
    );
  }

  // Branch Selection View
  if (profile && !profile.branch_id) {
    return (
      <SidebarLayout role={profile.role} signOut={signOut}>
        <div className="flex-1 flex flex-col justify-center items-center py-20 px-6 relative overflow-hidden text-center">
          <div className="w-full max-w-4xl space-y-10">
            <div className="space-y-4">
              <span className="liquid-glass-glow rounded-full px-6 py-2 text-xs font-medium uppercase tracking-widest text-cyan-300 border border-cyan-400/30 inline-block">
                بداية الرحلة الدراسية
              </span>
              <h1 className="text-5xl sm:text-7xl font-display font-normal text-foreground">
                اختر مسارك الدراسي في البكالوريا
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                يرجى تحديد فرعك الدراسي لتخصيص الدروس والمواد والنماذج امتحانية المؤتمتة.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
              {branches.map((b) => {
                const isScientific = b.slug === 'scientific';
                return (
                  <div
                    key={b.id}
                    className="liquid-glass-glow rounded-3xl p-8 flex flex-col justify-between text-right border border-white/20 hover:scale-[1.03] transition-transform group cursor-pointer"
                  >
                    <div className="space-y-6">
                      <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30">
                        {isScientific ? <ScienceIcon className="w-8 h-8" /> : <BookIcon className="w-8 h-8" />}
                      </div>
                      <h3 className="text-3xl font-display font-normal text-foreground">{b.name}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{b.description}</p>
                    </div>

                    <button
                      onClick={() => handleSelectBranch(b.id)}
                      disabled={updatingBranch}
                      className="liquid-glass-glow w-full mt-8 py-4 rounded-full text-base font-medium text-foreground hover:scale-[1.03] transition-transform cursor-pointer border border-cyan-400/40"
                    >
                      {updatingBranch ? 'جاري الحفظ...' : 'اختر هذا الفرع الدراسي'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  // Calculate statistics
  const totalQuizzesCount = results.length;
  const averageScorePercent = totalQuizzesCount > 0
    ? Math.round((results.reduce((acc, curr) => acc + (curr.score / curr.total_questions), 0) / totalQuizzesCount) * 100)
    : 0;

  const currentBranchName = branches.find((b) => b.id === profile?.branch_id)?.name || 'غير محدد';
  const currentLeaderboard = realLeaderboard;

  // Filter subjects by search query
  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="flex-1 flex flex-col lg:flex-row gap-5 h-full w-full max-w-[1500px] mx-auto">

        {/* Central Content Area */}
        <section className="flex-1 liquid-glass-glow rounded-3xl p-4 sm:p-6 lg:p-7 flex flex-col gap-7 lg:gap-8 overflow-y-auto border border-white/15">

          {/* Student Welcome Banner Header */}
          <div className="relative liquid-glass rounded-2xl p-4 sm:p-6 lg:p-7 border border-white/20 overflow-hidden flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-2">
                <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3.5 py-1 rounded-full inline-block font-medium">
                  الفرع {currentBranchName}
                </span>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
                  مرحباً بك، {profile?.full_name || 'طالب البكالوريا'} <Sparkles className="w-8 h-8 text-amber-400" />
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                  واصل رحلة التفوق والتميز! استكشف الدروس، حل النماذج المؤتمتة، وحقق أهدافك اليوم.
                </p>
              </div>

              {/* Action shortcuts */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => router.push('/subjects')}
                  className="rounded-xl bg-cyan-400 px-5 py-3 text-xs font-bold text-slate-950 hover:bg-cyan-300 transition-colors border border-cyan-300/30"
                >
                  متابعة المذاكرة ←
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
              <div className="liquid-glass p-3 rounded-xl border border-white/10 text-right">
                <span className="text-[11px] text-muted-foreground block">معدل الإنجاز</span>
                <span className="text-3xl font-display text-emerald-400">{averageScorePercent}%</span>
              </div>
              <div className="liquid-glass p-3 rounded-xl border border-white/10 text-right">
                <span className="text-[11px] text-muted-foreground block">اختبارات مكتملة</span>
                <span className="text-3xl font-display text-cyan-300">{totalQuizzesCount}</span>
              </div>
              <div className="liquid-glass p-3 rounded-xl border border-white/10 text-right">
                <span className="text-[11px] text-muted-foreground block">نقاط الخبرة (XP)</span>
                <span className="text-3xl font-display text-amber-400">{xpData?.xp || 0}</span>
              </div>
              <div className="liquid-glass p-3 rounded-xl border border-white/10 text-right">
                <span className="text-[11px] text-muted-foreground block">سلسلة المذاكرة</span>
                <span className="text-3xl font-display text-rose-400">{xpData?.streak_days || 0} أيام</span>
              </div>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="space-y-3">
            <div className="relative flex flex-col sm:flex-row items-center gap-4 justify-between w-full">
              <div className="relative w-full flex items-center">
                <input
                  type="text"
                  placeholder="ابحث عن درس، قانون، أو مادة دراسية..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="البحث في محتوى المنصة"
                  className="w-full text-right liquid-glass rounded-xl py-3.5 pr-5 pl-12 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyan-400/40"
                />
                <span className="absolute left-4 text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* Enrolled Courses Section */}
          <div className="relative">
            <RecommendedCourses subjects={filteredSubjects} />
          </div>

        </section>

        {/* Dashboard Sidebar Widget */}
        <DashboardSidebar
          profile={profile}
          currentBranchName={currentBranchName}
          totalQuizzesCount={totalQuizzesCount}
          subjectsCount={subjects.length}
          averageScorePercent={averageScorePercent}
          currentLeaderboard={currentLeaderboard}
          userId={user?.id}
          onClearBranch={handleClearBranch}
        />

      </div>
    </SidebarLayout>
  );
}
