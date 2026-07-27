'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, CalendarDays, Check, ChevronLeft, Circle, Clock3, Flame, Plus, Search, Sparkles, Target, Trophy } from 'lucide-react';
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
interface QuizResult { score: number; total_questions: number; completed_at: string; }

function localDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const colorThemes = [
  { bg: 'bg-[#fff5d6]', accent: 'bg-[#ff5636]', tag: 'bg-[#ff5636] text-white', border: 'border-[#f3ca40]' },
  { bg: 'bg-[#f3e8ff]', accent: 'bg-[#8b5cf6]', tag: 'bg-[#7c3aed] text-white', border: 'border-[#d8b4fe]' },
  { bg: 'bg-[#e0f2fe]', accent: 'bg-[#0284c7]', tag: 'bg-[#0284c7] text-white', border: 'border-[#bae6fd]' },
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
          supabase.from('quiz_results').select('score,total_questions,completed_at').eq('user_id', user.id).order('completed_at', { ascending: false }),
        ]);

        const loadedSubjects = (subjectData || []) as Subject[];
        setSubjects(loadedSubjects);
        setTasks((taskData || []) as unknown as PlannerTask[]);
        setResults((resultData || []) as QuizResult[]);
        setXpData(await getUserXPAndStreak(user.id));

        if (loadedSubjects.length > 0) {
          const { data: lessonData } = await supabase.from('lessons').select('id,name,subject_id,subjects(name)').in('subject_id', loadedSubjects.map((subject) => subject.id)).order('order_index', { ascending: true }).limit(1);
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
  const currentBranchName = branches.find((branch) => branch.id === profile?.branch_id)?.name || '';
  const visibleSubjects = subjects.filter((subject) => subject.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3);

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
        <main className="mx-auto flex min-h-[80vh] w-full max-w-4xl flex-col justify-center px-4 py-12 text-center">
          <span className="app-chip mx-auto bg-[#ffd64d]">خطوة واحدة للبدء</span>
          <h1 className="mt-5 text-3xl font-extrabold sm:text-5xl">ما هو فرعك الدراسي؟</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#6e6e67]">سنستخدم اختيارك لإظهار المواد والدروس المناسبة وإنشاء مساحة دراسية مخصصة لك.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {branches.map((branch) => (
              <button key={branch.id} onClick={() => selectBranch(branch.id)} disabled={updatingBranch} className="app-card p-6 text-right hover:-translate-y-1 hover:bg-[#ffd64d]">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#282825] bg-[#bce9fa]"><ScienceIcon className="h-6 w-6" /></span>
                <strong className="block text-xl">{branch.name}</strong>
                <span className="mt-2 block text-sm leading-6 text-[#6e6e67]">{branch.description}</span>
              </button>
            ))}
          </div>
        </main>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <main className="mx-auto w-full max-w-[1180px] space-y-6 pb-10">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-bold text-[#ff5636]">{new Intl.DateTimeFormat('ar-SY', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">أهلًا {profile?.full_name?.split(' ')[0] || 'بك'}، مستعد للتعلّم؟</h1>
            <p className="mt-2 text-sm text-[#6e6e67]">{currentBranchName} <span className="mx-1">•</span> اجعل اليوم خطوة صغيرة نحو هدفك الكبير</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative w-full sm:w-64 xl:hidden"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77776f]" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="app-input w-full pr-9 text-sm" placeholder="ابحث عن مادة..." /></label>
            <span className="app-chip bg-[#ffd64d]"><Flame className="h-4 w-4" /> {xpData?.streak_days || 0} أيام متتالية</span>
            <Link href="/dashboard/planner" className="app-button app-button-secondary"><CalendarDays className="h-4 w-4" /> خطتي</Link>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]">
          <article className="relative overflow-hidden rounded-[24px] border-2 border-slate-900 bg-[#e9d5ff] p-6 sm:p-8">
            <div className="absolute -left-10 -top-14 h-48 w-48 rounded-full bg-[#d8b4fe] opacity-70" />
            <div className="relative z-10 max-w-xl">
              <span className="app-chip bg-white"><Target className="h-4 w-4 text-[#ff5636]" /> خطوتك التالية</span>
              <p className="mt-6 text-sm font-bold text-slate-700">{nextLesson?.subjects?.name || subjects[0]?.name || 'مادتك الأولى'}</p>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">{nextLesson?.name || 'ابدأ باستكشاف دروس مادتك'}</h2>
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-700"><Clock3 className="h-4 w-4" /> 25 دقيقة مقترحة</p>
              <Link href={nextLesson ? `/lessons/${nextLesson.id}` : '/subjects'} className="app-button mt-6">ابدأ الآن <ArrowLeft className="h-4 w-4" /></Link>
            </div>
            <div className="absolute bottom-5 left-8 hidden rotate-[-8deg] rounded-[20px] border-2 border-slate-900 bg-[#ffd64d] px-5 py-3 font-extrabold shadow-[5px_5px_0_#0f172a] sm:block">تقدم بثبات!</div>
          </article>

          <article className="app-card bg-white p-6">
            <div className="flex items-start justify-between"><div><p className="text-sm font-extrabold">إنجاز اليوم</p><p className="mt-1 text-xs text-[#77776f]">{completedToday} من {todayTasks.length} مهام مكتملة</p></div><strong className="text-3xl font-extrabold">{completionPercent}%</strong></div>
            <div className="mt-5 h-3 overflow-hidden rounded-full border border-slate-300 bg-[#f1f0eb]"><div className="h-full rounded-full bg-[#ff5636] transition-all" style={{ width: `${completionPercent}%` }} /></div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#deddd7] pt-5"><div><span className="text-xs text-[#77776f]">متوسط الاختبارات</span><strong className="mt-1 block text-xl">{averageScore}%</strong></div><div><span className="text-xs text-[#77776f]">نقاط الخبرة</span><strong className="mt-1 block text-xl">{xpData?.xp || 0}</strong></div></div>
          </article>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between"><div><h2 className="text-2xl font-extrabold">دوراتي</h2><p className="mt-1 text-xs text-[#77776f]">تابع تقدمك في المواد الأساسية</p></div><Link href="/subjects" className="text-sm font-bold text-[#ff5636]">عرض الكل <ChevronLeft className="inline h-4 w-4" /></Link></div>
          <div className="grid gap-4 md:grid-cols-3">
            {visibleSubjects.length > 0 ? visibleSubjects.map((subject, index) => {
              const theme = colorThemes[index % colorThemes.length];
              const progress = index === 0 ? 34 : index === 1 ? 58 : 76;
              return (
                <article key={subject.id} className={`app-card ${theme.bg} ${theme.border} p-5 transition hover:-translate-y-1`}>
                  <div className="flex items-start justify-between">
                    <span className={`rounded-lg px-3 py-1 text-xs font-bold ${theme.tag}`}>{subject.name}</span>
                    <Bookmark className="h-5 w-5 text-slate-700" />
                  </div>
                  <h3 className="mt-5 min-h-[58px] text-xl font-extrabold leading-snug text-slate-900">{subject.name}</h3>
                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-700"><span>التقدم</span><span>{progress}%</span></div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-slate-300 bg-white/80">
                    <div className={`h-full rounded-full ${theme.accent}`} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="flex -space-x-2 space-x-reverse">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-[#ff5636] text-[10px] font-bold text-white">م</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-[#0284c7] text-[10px] font-bold text-white">س</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-slate-700 text-[9px] font-bold text-white">+8</span>
                    </span>
                    <Link href={`/subjects/${subject.id}`} className="app-button min-h-9 px-4 py-1.5 text-xs">متابعة</Link>
                  </div>
                </article>
              );
            }) : <div className="app-card col-span-full p-8 text-center text-sm text-[#77776f]">لا توجد مواد مرتبطة بفرعك بعد.</div>}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_300px]">
          <article className="app-card bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-xl font-extrabold">مهامي القادمة</h2><p className="mt-1 text-xs text-[#77776f]">أنهِ المهام بالترتيب المناسب لك</p></div><Link href="/dashboard/planner" className="text-xs font-bold text-[#ff5636]">عرض المخطط</Link></div>
            <div className="mt-5 space-y-1">
              {todayTasks.length === 0 ? <div className="rounded-2xl border border-dashed border-[#aaa9a2] p-7 text-center"><CalendarDays className="mx-auto h-7 w-7 text-[#77776f]" /><p className="mt-3 font-bold">يومك فارغ حتى الآن</p><p className="mt-1 text-xs text-[#77776f]">أضف مهمة صغيرة يمكنك إنجازها اليوم.</p></div> : todayTasks.slice(0, 5).map((task) => <button key={task.id} onClick={() => toggleTask(task)} className="flex w-full items-center gap-3 border-b border-[#deddd7] px-1 py-3 text-right hover:bg-[#fafaf7]"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-400 ${task.completed ? 'bg-[#ffd64d]' : 'bg-white text-transparent'}`}>{task.completed ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}</span><span className="min-w-0 flex-1"><strong className={`block text-sm ${task.completed ? 'text-[#77776f] line-through' : ''}`}>{task.title}</strong>{task.subjects?.name && <small className="text-xs text-[#ff5636]">{task.subjects.name}</small>}</span><small className="text-xs text-[#77776f]">اليوم</small></button>)}
            </div>
            <form onSubmit={addTodayTask} className="mt-4 flex gap-2"><input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="أضف مهمة لليوم..." aria-label="مهمة جديدة" className="app-input min-w-0 flex-1 text-sm" /><button disabled={addingTask || !taskTitle.trim()} className="app-button flex h-[46px] w-[46px] shrink-0 items-center justify-center p-0"><Plus className="h-5 w-5" /></button></form>
          </article>

          <aside className="rounded-[24px] border border-slate-800 bg-[#0f172a] p-5 text-white shadow-lg"><div className="flex items-center gap-2 text-[#ffd64d]"><Sparkles className="h-5 w-5" /><span className="text-xs font-bold">اقتراح مخصص لك</span></div><h2 className="mt-5 text-2xl font-extrabold leading-snug">مستعد لتحدٍ جديد؟</h2><p className="mt-3 text-sm leading-7 text-slate-300">اختبر معلوماتك بنموذج قصير واحصل على نقاط خبرة إضافية.</p><div className="mt-5 flex items-center gap-2 text-xs text-slate-300"><Trophy className="h-4 w-4 text-[#ffd64d]" /> +20 XP عند الإكمال</div><Link href="/dashboard/exams" className="app-button mt-6 flex w-full items-center justify-center gap-2 py-3 text-sm font-extrabold text-white">ابدأ الاختبار <ArrowLeft className="h-4 w-4" /></Link></aside>
        </section>
      </main>
    </SidebarLayout>
  );
}
