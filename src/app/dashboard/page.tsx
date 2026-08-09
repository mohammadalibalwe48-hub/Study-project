'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  Circle,
  Clock3,
  Flame,
  Plus,
  Search,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { ScienceIcon } from '@/components/icons/SvgIcons';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { getUserXPAndStreak, awardXP, updateStreak } from '@/utils/xpHelper';

interface Branch { id: number; name: string; slug: string; description: string; }
interface Subject { id: number; name: string; description: string; image_url: string | null; }
interface Lesson { id: number; name: string; subject_id: number; subjects?: { name: string } | null; }
interface PlannerTask { id: number; title: string; due_date: string | null; completed: boolean; subject_id: number | null; subjects?: { name: string } | null; }
interface QuizResult {
  score: number;
  total_questions: number;
  completed_at: string;
  quizzes?: { title: string; subject_id: number; subjects?: { name: string } | null } | null;
}

function localDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const subjectThemes = [
  { surface: '#fff1bd', accent: '#f5b700', soft: '#fff8dd' },
  { surface: '#eadcff', accent: '#7c3aed', soft: '#f6f0ff' },
  { surface: '#d9f2fb', accent: '#0284c7', soft: '#effaff' },
];

export default function DashboardPage() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const [xpData, setXpData] = useState<{ xp: number; streak_days: number } | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [updatingBranch, setUpdatingBranch] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  useEffect(() => {
    if (profile?.role === 'admin') router.push('/admin');
  }, [profile, router]);

  useEffect(() => {
    async function fetchDashboard() {
      if (!user || !profile || profile.role === 'admin') return;
      setDbLoading(true);
      try {
        const { data: branchData } = await supabase.from('branches').select('*');
        setBranches(branchData || []);
        if (!profile.branch_id) return;

        const [{ data: subjectData }, { data: taskData }, { data: resultData }] = await Promise.all([
          supabase.from('subjects').select('*').eq('branch_id', profile.branch_id),
          supabase.from('planner_tasks').select('id,title,due_date,completed,subject_id,subjects(name)').eq('user_id', user.id).order('due_date', { ascending: true }),
          supabase.from('quiz_results').select('score,total_questions,completed_at,quizzes(title,subject_id,subjects(name))').eq('user_id', user.id).order('completed_at', { ascending: false }),
        ]);

        const loadedSubjects = (subjectData || []) as Subject[];
        const loadedResults = (resultData || []) as unknown as QuizResult[];
        setSubjects(loadedSubjects);
        setTasks((taskData || []) as unknown as PlannerTask[]);
        setResults(loadedResults);
        setXpData(await getUserXPAndStreak(user.id));

        if (loadedSubjects.length > 0) {
          const latestResultSubjectId = loadedResults[0]?.quizzes?.subject_id;
          const recommendedSubjectId = latestResultSubjectId && loadedSubjects.some((subject) => subject.id === latestResultSubjectId)
            ? latestResultSubjectId
            : loadedSubjects[0].id;
          const { data: lessonData } = await supabase
            .from('lessons')
            .select('id,name,subject_id,subjects(name)')
            .eq('subject_id', recommendedSubjectId)
            .order('order_index', { ascending: true })
            .limit(1);
          setNextLesson((lessonData?.[0] as unknown as Lesson) || null);
        }
      } finally {
        setDbLoading(false);
      }
    }
    fetchDashboard();
  }, [user, profile]);

  const today = localDateKey();
  const todayTasks = useMemo(() => tasks.filter((task) => !task.due_date || task.due_date.slice(0, 10) <= today), [tasks, today]);
  const completedToday = todayTasks.filter((task) => task.completed).length;
  const completionPercent = todayTasks.length ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  const averageScore = results.length ? Math.round(results.reduce((sum, result) => sum + result.score / result.total_questions, 0) / results.length * 100) : 0;
  const latestResult = results[0] || null;
  const latestSubjectId = latestResult?.quizzes?.subject_id;
  const latestSubject = subjects.find((subject) => subject.id === latestSubjectId);
  const latestScore = latestResult ? Math.round((latestResult.score / latestResult.total_questions) * 100) : null;
  const visibleSubjects = subjects.filter((subject) => subject.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3);
  const firstName = profile?.full_name?.split(' ')[0] || 'بك';
  const dateLabel = new Intl.DateTimeFormat('ar-SY', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const ringStyle = { '--dashboard-progress': `${completionPercent * 3.6}deg` } as CSSProperties;

  async function selectBranch(branchId: number) {
    if (!user) return;
    setUpdatingBranch(true);
    const { error } = await supabase.from('users').update({ branch_id: branchId }).eq('id', user.id);
    if (!error) await refreshProfile();
    setUpdatingBranch(false);
  }

  async function toggleTask(task: PlannerTask) {
    if (!user) return;
    const completed = !task.completed;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed } : item));
    const { error } = await supabase.from('planner_tasks').update({ completed }).eq('id', task.id).eq('user_id', user.id);
    if (error) setTasks((current) => current.map((item) => item.id === task.id ? task : item));
    if (!error && completed) {
      await awardXP(user.id, 10);
      await updateStreak(user.id);
      setXpData((current) => current ? { ...current, xp: current.xp + 10 } : current);
    }
  }

  async function addTodayTask(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !taskTitle.trim()) return;
    setAddingTask(true);
    const { data, error } = await supabase.from('planner_tasks').insert({ user_id: user.id, title: taskTitle.trim(), due_date: today, completed: false }).select('id,title,due_date,completed,subject_id').single();
    if (!error && data) {
      setTasks((current) => [...current, data as PlannerTask]);
      setTaskTitle('');
    }
    setAddingTask(false);
  }

  if (loading || dbLoading) {
    return <SidebarLayout role={profile?.role} signOut={signOut}><div className="p-6"><DashboardSkeleton /></div></SidebarLayout>;
  }

  if (profile && !profile.branch_id) {
    return (
      <SidebarLayout role={profile.role} signOut={signOut}>
        <main className="dashboard-canvas flex min-h-[80vh] items-center justify-center px-4 py-12">
          <section className="w-full max-w-4xl text-center" data-reveal>
            <span className="dashboard-kicker mx-auto"><Sparkles className="h-4 w-4" /> خطوة واحدة للبدء</span>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-[#20201d] sm:text-5xl">اختر فرعك الدراسي</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-7 text-[#686862]">لنرتّب مساحتك حول المواد والدروس التي تهمك فعلًا.</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {branches.map((branch, index) => (
                <button key={branch.id} onClick={() => selectBranch(branch.id)} disabled={updatingBranch} className="dashboard-branch-card group" style={{ '--branch-delay': `${index * 80}ms` } as CSSProperties}>
                  <span className="dashboard-branch-icon"><ScienceIcon className="h-6 w-6" /></span>
                  <span><strong className="block text-xl font-black">{branch.name}</strong><small className="mt-2 block text-sm font-semibold leading-6 text-[#686862]">{branch.description}</small></span>
                  <ArrowUpLeft className="mr-auto h-5 w-5 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1" />
                </button>
              ))}
            </div>
          </section>
        </main>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <main className="dashboard-canvas mx-auto w-full max-w-[1200px] pb-12">
        <header className="dashboard-welcome" data-reveal>
          <div>
            <p className="dashboard-eyebrow"><span /> {dateLabel}</p>
            <h1 className="mt-2 text-3xl font-black text-[#20201d] sm:text-[2.65rem]">صباح الإنجاز، {firstName}</h1>
            <p className="mt-2 text-sm font-semibold text-[#72726b]">ركّز على خطوة واحدة الآن، واترك الباقي لمسارك.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="dashboard-pill"><Flame className="h-4 w-4 fill-[#ff6547] text-[#ff6547]" /><strong>{xpData?.streak_days || 0}</strong> أيام متتالية</span>
            <span className="dashboard-pill dashboard-pill-dark"><Zap className="h-4 w-4 fill-[#ffd64d] text-[#ffd64d]" /><strong>{xpData?.xp || 0}</strong> XP</span>
            <Link href="/dashboard/planner" className="dashboard-icon-link" aria-label="فتح المخطط"><CalendarDays className="h-5 w-5" /></Link>
          </div>
        </header>

        <section className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.65fr)]">
          <article className="dashboard-focus-card" data-reveal>
            <div className="relative z-10 flex h-full flex-col justify-between gap-10">
              <div>
                <span className="dashboard-kicker"><Target className="h-4 w-4" /> جلسة اليوم</span>
                <p className="mt-7 text-xs font-black uppercase text-[#7c3aed]">{nextLesson?.subjects?.name || latestSubject?.name || subjects[0]?.name || 'مادتك الأولى'}</p>
                <h2 className="mt-2 max-w-2xl text-2xl font-black leading-[1.45] text-[#20201d] sm:text-[2rem]">{nextLesson?.name || 'ابدأ باستكشاف دروس مادتك'}</h2>
                <p className="mt-3 flex items-center gap-2 text-sm font-bold text-[#66665f]"><Clock3 className="h-4 w-4" /> {latestScore === null ? 'جلسة تركيز مقترحة · ٢٥ دقيقة' : `آخر نتيجة لك ${latestScore}% · لنثبت فهمك`}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={nextLesson ? `/lessons/${nextLesson.id}` : '/subjects'} className="dashboard-primary-action"><span>{latestScore === null ? 'ابدأ الجلسة' : 'تابع المراجعة'}</span><ArrowLeft className="h-4 w-4" /></Link>
                <span className="text-xs font-bold text-[#77776f]">{latestScore === null ? 'أكمل درسًا لتحصل على نقاط إضافية' : `مراجعة ${latestSubject?.name || 'المادة'} الآن تقوي نتيجتك القادمة`}</span>
              </div>
            </div>
            <div className="dashboard-focus-mark" aria-hidden="true"><BookOpen className="h-16 w-16" /><span>25</span></div>
          </article>

          <article className="dashboard-progress-card" data-reveal>
            <div className="flex items-start justify-between">
              <div><p className="text-lg font-black text-[#20201d]">إيقاع اليوم</p><p className="mt-1 text-xs font-semibold text-[#77776f]">{completedToday} من {todayTasks.length} مهام</p></div>
              <span className="dashboard-live-badge">مباشر</span>
            </div>
            <div className="dashboard-progress-ring" style={ringStyle} aria-label={`نسبة إنجاز اليوم ${completionPercent}%`}>
              <div><strong>{completionPercent}<small>%</small></strong><span>مكتمل</span></div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#deddd7] border-t border-[#deddd7] pt-5">
              <div className="px-3 text-center"><small className="block text-[11px] font-bold text-[#77776f]">متوسط الاختبارات</small><strong className="mt-1 block text-xl font-black">{averageScore}%</strong></div>
              <div className="px-3 text-center"><small className="block text-[11px] font-bold text-[#77776f]">موادك</small><strong className="mt-1 block text-xl font-black">{subjects.length}</strong></div>
            </div>
          </article>
        </section>

        <section className="mt-9" data-reveal>
          <div className="dashboard-section-heading">
            <div><span className="dashboard-section-index">01</span><h2>موادك الحالية</h2><p>واصل من حيث توقفت</p></div>
            <div className="flex items-center gap-3">
              <label className="dashboard-subject-search"><Search className="h-4 w-4" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ابحث عن مادة" aria-label="ابحث عن مادة" /></label>
              <Link href="/subjects" className="dashboard-text-link">عرض الكل <ChevronLeft className="h-4 w-4" /></Link>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {visibleSubjects.length > 0 ? visibleSubjects.map((subject, index) => {
              const theme = subjectThemes[index % subjectThemes.length];
              const subjectResults = results.filter((result) => result.quizzes?.subject_id === subject.id);
              const progress = subjectResults.length
                ? Math.round(subjectResults.reduce((sum, result) => sum + result.score / result.total_questions, 0) / subjectResults.length * 100)
                : 0;
              return (
                <Link key={subject.id} href={`/subjects/${subject.id}`} className="dashboard-subject-card group" style={{ '--subject-surface': theme.surface, '--subject-accent': theme.accent, '--subject-soft': theme.soft, '--subject-delay': `${index * 90}ms` } as CSSProperties}>
                  <div className="flex items-start justify-between"><span className="dashboard-subject-icon"><BookOpen className="h-5 w-5" /></span><ArrowUpLeft className="h-5 w-5 text-[#77776f] transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1" /></div>
                  <div className="mt-7"><p className="text-[11px] font-black text-[#77776f]">المادة الدراسية</p><h3 className="mt-1 text-xl font-black text-[#20201d]">{subject.name}</h3></div>
                  <div className="mt-7"><div className="flex justify-between text-[11px] font-black"><span>التقدم</span><span>{progress}%</span></div><div className="dashboard-subject-progress"><span style={{ width: `${progress}%` }} /></div></div>
                </Link>
              );
            }) : <div className="dashboard-empty col-span-full">لا توجد مواد مطابقة الآن.</div>}
          </div>
        </section>

        <section className="mt-9 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <article className="dashboard-task-card" data-reveal>
            <div className="dashboard-section-heading border-b border-[#e6e5df] pb-5">
              <div><span className="dashboard-section-index">02</span><h2>قائمة اليوم</h2><p>مهام صغيرة، تقدّم واضح</p></div>
              <span className="dashboard-task-count">{todayTasks.filter((task) => !task.completed).length} متبقية</span>
            </div>
            <div className="mt-3 min-h-44">
              {todayTasks.length === 0 ? (
                <div className="dashboard-empty"><CalendarDays className="mx-auto mb-2 h-7 w-7" />يومك فارغ. أضف أول خطوة.</div>
              ) : todayTasks.slice(0, 5).map((task, index) => (
                <button key={task.id} onClick={() => toggleTask(task)} className={`dashboard-task-row ${task.completed ? 'is-complete' : ''}`} style={{ '--task-delay': `${index * 55}ms` } as CSSProperties}>
                  <span className="dashboard-check">{task.completed ? <Check className="h-4 w-4" /> : <Circle className="h-2.5 w-2.5" />}</span>
                  <span className="min-w-0 flex-1"><strong>{task.title}</strong>{task.subjects?.name && <small>{task.subjects.name}</small>}</span>
                  <span className="dashboard-task-time">اليوم</span>
                </button>
              ))}
            </div>
            <form onSubmit={addTodayTask} className="dashboard-add-task">
              <Plus className="h-5 w-5 text-[#ff5636]" />
              <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="ما الخطوة التالية؟" aria-label="مهمة جديدة" />
              <button disabled={addingTask || !taskTitle.trim()}>إضافة</button>
            </form>
          </article>

          <aside className="dashboard-challenge-card" data-reveal>
            <span className="dashboard-challenge-icon"><Trophy className="h-6 w-6" /></span>
            <p className="mt-7 text-xs font-black text-[#ffdd61]">تحدّي اليوم</p>
            <h2 className="mt-2 text-2xl font-black leading-snug">اختبر مستواك في 10 دقائق</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-white/70">نموذج وزاري قصير يساعدك على اكتشاف نقاط قوتك.</p>
            <div className="mt-6 flex items-center gap-2 text-xs font-black"><Zap className="h-4 w-4 fill-[#ffdd61] text-[#ffdd61]" /> +٢٠ نقطة خبرة</div>
            <Link href="/dashboard/exams" className="dashboard-challenge-action"><span>ابدأ التحدّي</span><ArrowLeft className="h-4 w-4" /></Link>
            <Sparkles className="dashboard-challenge-spark" aria-hidden="true" />
          </aside>
        </section>
      </main>
    </SidebarLayout>
  );
}
