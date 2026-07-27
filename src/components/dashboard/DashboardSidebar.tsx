import React from 'react';
import PomodoroTimer from '@/components/PomodoroTimer';

interface Profile {
  full_name: string | null;
  role: string;
  branch_id?: number | null;
}

interface DashboardSidebarProps {
  profile: Profile | null;
  currentBranchName: string;
  totalQuizzesCount: number;
  subjectsCount: number;
  averageScorePercent: number;
  currentLeaderboard: any[];
  userId: string | undefined;
  onClearBranch: () => void;
}

export default function DashboardSidebar({
  profile,
  currentBranchName,
  totalQuizzesCount,
  subjectsCount,
  averageScorePercent,
  currentLeaderboard,
  userId,
  onClearBranch
}: DashboardSidebarProps) {
  return (
    <section className="w-full lg:w-80 shrink-0 liquid-glass-glow rounded-3xl p-4 sm:p-5 flex flex-col gap-6 border border-white/15" aria-label="ملخص الأداء">
      <div className="flex flex-col gap-6">
        {/* Profile Info Header Card */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-4 text-right">
            <span className="h-13 w-13 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <div>
              <h4 className="text-lg font-bold text-foreground">{profile?.full_name || 'طالب البكالوريا'}</h4>
              <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full inline-block mt-1">
                {currentBranchName}
              </span>
            </div>
          </div>

          <button
            onClick={onClearBranch}
            className="p-2.5 rounded-full bg-white/5 text-muted-foreground hover:text-rose-400 hover:bg-white/10 transition-colors"
            title="تغيير الفرع الدراسي"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Analytics Stats Grid */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold tracking-wide text-muted-foreground">ملخص الأداء</h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="liquid-glass rounded-xl p-3 flex flex-col justify-between border border-white/10">
              <span className="text-[11px] text-muted-foreground">الاختبارات</span>
              <span className="text-3xl font-display font-normal text-foreground mt-2">{totalQuizzesCount}</span>
            </div>

            <div className="liquid-glass rounded-xl p-3 flex flex-col justify-between border border-white/10">
              <span className="text-[11px] text-muted-foreground">المواد المقررة</span>
              <span className="text-3xl font-display font-normal text-foreground mt-2">{subjectsCount}</span>
            </div>

            <div className="liquid-glass rounded-xl p-3 flex flex-col justify-between border border-white/10">
              <span className="text-[11px] text-muted-foreground">معدل الإنجاز</span>
              <span className="text-3xl font-display font-normal text-emerald-400 mt-2">{averageScorePercent}%</span>
            </div>

            <div className="liquid-glass rounded-xl p-3 flex flex-col justify-between border border-white/10">
              <span className="text-[11px] text-muted-foreground">الأوسمة الأكاديمية</span>
              <span className="text-3xl font-display font-normal text-amber-400 mt-2">+3</span>
            </div>
          </div>
        </div>

        {/* Pomodoro Timer */}
        {userId && <PomodoroTimer userId={userId} />}

        {/* Leaderboard / Honor Roll */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h4 className="text-lg font-bold text-foreground">قائمة الشرف</h4>
          {currentLeaderboard.length === 0 ? (
            <div className="text-center py-6 px-4 liquid-glass rounded-2xl text-xs text-muted-foreground border border-white/10">
              حل الاختبار الأول ليتم تصنيفك في لوحة الترتيب!
            </div>
          ) : (
            <div className="space-y-3">
              {currentLeaderboard.slice(0, 3).map((item, idx) => (
                <div key={idx} className="liquid-glass rounded-2xl p-3.5 flex items-center justify-between border border-white/10">
                  <div className="flex items-center gap-3 text-right">
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center font-display text-sm font-bold ${idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : 'bg-amber-700 text-white'
                      }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <h5 className="text-sm font-medium text-foreground">{item.name}</h5>
                      <span className="text-[11px] text-muted-foreground">{item.course}</span>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                    {item.scorePercent ? `%${item.scorePercent}` : `${item.rating || 5}.0`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
