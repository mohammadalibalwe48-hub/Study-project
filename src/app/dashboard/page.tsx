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
  { bg: 'bg-[#ffdc72]', accent: 'bg-[#ff5636]', tag: 'bg-[#282825] text-[#ffdc72]', border: 'border-[#282825]', shadow: 'neo-shadow-interactive-yellow' },
  { bg: 'bg-[#d8bcff]', accent: 'bg-[#7c3aed]', tag: 'bg-[#282825] text-[#d8bcff]', border: 'border-[#282825]', shadow: 'neo-shadow-interactive-purple' },
  { bg: 'bg-[#bce9fa]', accent: 'bg-[#0284c7]', tag: 'bg-[#282825] text-[#bce9fa]', border: 'border-[#282825]', shadow: 'neo-shadow-interactive-blue' },
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
    const branchThemes = [
      { color: 'bg-[#ffdc72]', shadow: 'neo-shadow-interactive-yellow' },
      { color: 'bg-[#d8bcff]', shadow: 'neo-shadow-interactive-purple' },
      { color: 'bg-[#bce9fa]', shadow: 'neo-shadow-interactive-blue' },
    ];
    return (
      <SidebarLayout role={profile.role} signOut={signOut}>
        <main className="mx-auto flex min-h-[80vh] w-full max-w-4xl flex-col justify-center px-6 py-12 text-center bg-dot-pattern">
          <span className="app-chip mx-auto bg-[#ffd64d] border-2 border-[#282825] shadow-[2px_2px_0_#282825] font-black">خطوة واحدة للبدء</span>
          <h1 className="mt-6 text-3xl font-black sm:text-5xl text-[#282825]">ما هو فرعك الدراسي؟</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#5f5f59] font-semibold">سنستخدم اختيارك لإظهار المواد والدروس المناسبة وإنشاء مساحة دراسية مخصصة لك.</p>
          
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {branches.map((branch, idx) => {
              const theme = branchThemes[idx % branchThemes.length];
              return (
                <button 
                  key={branch.id} 
                  onClick={() => selectBranch(branch.id)} 
                  disabled={updatingBranch} 
                  className={`rounded-2xl border-2 border-[#282825] p-6 text-right transition-all hover:scale-[1.02] active:scale-[0.98] ${theme.color} ${theme.shadow}`}
                >
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#282825] bg-white shadow-[2px_2px_0_#282825]">
                    <ScienceIcon className="h-6 w-6 text-[#282825]" />
                  </span>
                  <strong className="block text-2xl font-black text-[#282825]">{branch.name}</strong>
                  <span className="mt-3 block text-sm leading-6 text-[#4a4a44] font-medium">{branch.description}</span>
                </button>
              );
            })}
          </div>
        </main>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <main className="mx-auto w-full max-w-[1180px] space-y-8 pb-10">
        
        {/* Header Block */}
        <header className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between border-b border-[#deddd7] pb-6">
          <div>
            <p className="text-sm font-black text-[#ff5636] flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#ff5636] animate-ping" />
              <span>{new Intl.DateTimeFormat('ar-SY', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl text-[#282825]">
              أهلًا {profile?.full_name?.split(' ')[0] || 'بك'}، مستعد للتعلّم؟
            </h1>
            <p className="mt-2 text-sm text-[#5f5f59] font-bold">
              الفرع الدراسي: <span className="bg-[#bce9fa] border border-[#282825] px-2 py-0.5 rounded-md text-xs font-black shadow-[1.5px_1.5px_0_#282825]">{currentBranchName}</span>
              <span className="mx-2">•</span> اجعل اليوم خطوة صغيرة نحو هدفك الكبير 🚀
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative w-full sm:w-64 xl:hidden">
              <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#282825] z-10" />
              <input 
                value={searchQuery} 
                onChange={(event) => setSearchQuery(event.target.value)} 
                className="app-input w-full pr-10 text-sm border-2 border-[#282825] shadow-[2px_2px_0_#282825]" 
                placeholder="ابحث عن مادة..." 
              />
            </label>
            
            <span className="app-chip bg-[#ffd64d] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
              <Flame className="h-4 w-4 text-[#ff5636] fill-[#ff5636]" /> {xpData?.streak_days || 0} أيام متتالية
            </span>
            
            <Link 
              href="/dashboard/planner" 
              className="app-button app-button-secondary border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] hover:shadow-[4px_4px_0_#282825] hover:-translate-y-0.5 transition-all text-sm font-black"
            >
              <CalendarDays className="h-4 w-4" /> خطتي
            </Link>
          </div>
        </header>

        {/* Hero Alert & Daily Progress */}
        <section className="grid gap-6 xl:grid-cols-[1.45fr_.85fr]">
          
          {/* Next Lesson Box */}
          <article className="relative overflow-hidden rounded-[28px] border-2 border-[#282825] bg-gradient-to-br from-[#e9d5ff] via-[#f3e8ff] to-[#fae8ff] p-6 shadow-[5px_5px_0_#282825] transition-all duration-200 hover:shadow-[7px_7px_0_#282825] sm:p-8 bg-dot-pattern-dense">
            <div className="absolute -left-12 -top-12 h-48 w-48 rounded-full bg-[#d8b4fe]/30 blur-2xl pointer-events-none" />
            
            <div className="relative z-10 max-w-xl text-right">
              <span className="app-chip border-2 border-[#282825] bg-white shadow-[2px_2px_0_#282825] font-black">
                <Target className="h-4 w-4 text-[#ff5636]" /> خطوتك التالية
              </span>
              
              <p className="mt-6 text-sm font-black text-[#7c3aed] uppercase tracking-wide">
                {nextLesson?.subjects?.name || subjects[0]?.name || 'مادتك الأولى'}
              </p>
              
              <h2 className="mt-2 text-2xl font-black text-[#282825] sm:text-3xl leading-snug">
                {nextLesson?.name || 'ابدأ باستكشاف دروس مادتك'}
              </h2>
              
              <p className="mt-4 flex items-center gap-2 text-sm font-extrabold text-[#5f5f59]">
                <Clock3 className="h-4 w-4 text-[#ff5636]" /> ٢٥ دقيقة مقترحة للدراسة والتركيز
              </p>
              
              <Link 
                href={nextLesson ? `/lessons/${nextLesson.id}` : '/subjects'} 
                className="app-button mt-8 border-2 border-[#282825] bg-[#ff5636] text-white shadow-[3px_3px_0_#282825] hover:shadow-[5px_5px_0_#282825] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all font-black text-sm"
              >
                <span>ابدأ الآن</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="absolute bottom-6 left-8 hidden rotate-[-6deg] rounded-[20px] border-2 border-[#282825] bg-[#ffd64d] px-5 py-3 font-black shadow-[4px_4px_0_#282825] transition-all hover:rotate-6 hover:scale-105 sm:block select-none">
              تقدم بثبات! 🚀
            </div>
          </article>

          {/* Today's Goal Gauge */}
          <article className="rounded-[28px] border-2 border-[#282825] bg-white p-6 shadow-[5px_5px_0_#282825]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-black text-[#282825]">إنجاز اليوم</p>
                <p className="mt-1 text-xs text-[#5f5f59] font-bold">{completedToday} من {todayTasks.length} مهام مكتملة</p>
              </div>
              <strong className="text-3xl font-black text-[#ff5636] bg-[#ff5636]/10 border border-[#ff5636] px-3 py-1 rounded-xl shadow-[2px_2px_0_#ff5636]">
                {completionPercent}%
              </strong>
            </div>
            
            {/* Striped progress bar */}
            <div className="mt-6 h-5 overflow-hidden rounded-full border-2 border-[#282825] bg-[#f1f0eb] p-0.5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[#ff5636] to-[#ff7d63] transition-all duration-500 animate-progress-stripe" 
                style={{ width: `${completionPercent}%` }} 
              />
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-4 border-t-2 border-[#282825] pt-6">
              <div>
                <span className="text-xs font-black text-[#5f5f59]">متوسط الاختبارات</span>
                <strong className="mt-2 block text-3xl font-black text-[#282825]">{averageScore}%</strong>
              </div>
              <div>
                <span className="text-xs font-black text-[#5f5f59]">نقاط الخبرة (XP)</span>
                <strong className="mt-2 block text-3xl font-black text-[#ff5636]">{xpData?.xp || 0}</strong>
              </div>
            </div>
          </article>
        </section>

        {/* Subjects Course list */}
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#282825]">دوراتي الدراسية</h2>
              <p className="mt-1 text-sm text-[#5f5f59] font-semibold">تابع تقدمك في المواد الأساسية للمنهاج</p>
            </div>
            <Link href="/subjects" className="text-sm font-black text-[#ff5636] hover:underline flex items-center gap-1">
              <span>عرض الكل</span>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {visibleSubjects.length > 0 ? visibleSubjects.map((subject, index) => {
              const theme = colorThemes[index % colorThemes.length];
              const progress = index === 0 ? 34 : index === 1 ? 58 : 76;
              return (
                <article 
                  key={subject.id} 
                  className={`rounded-2xl border-2 border-[#282825] p-5 transition-all duration-200 hover:scale-[1.02] ${theme.bg} ${theme.shadow}`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`rounded-xl border border-[#282825] px-3.5 py-1 text-xs font-black shadow-[1.5px_1.5px_0_#282825] ${theme.tag}`}>
                      {subject.name}
                    </span>
                    <Bookmark className="h-5 w-5 text-[#282825] cursor-pointer" />
                  </div>
                  
                  <h3 className="mt-6 min-h-[50px] text-xl font-black leading-snug text-[#282825]">
                    {subject.name}
                  </h3>
                  
                  <div className="mt-5 flex items-center justify-between text-xs font-black text-[#282825]/80">
                    <span>التقدم الدراسي</span>
                    <span>{progress}%</span>
                  </div>
                  
                  {/* Subject progress bar */}
                  <div className="mt-2.5 h-3 overflow-hidden rounded-full border-2 border-[#282825] bg-white/90">
                    <div className={`h-full rounded-full ${theme.accent}`} style={{ width: `${progress}%` }} />
                  </div>
                  
                  <div className="mt-6 flex items-center justify-between pt-3 border-t border-[#282825]/10">
                    <span className="flex -space-x-2 space-x-reverse select-none">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#282825] bg-[#ff5636] text-[10px] font-black text-white">أ</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#282825] bg-[#0284c7] text-[10px] font-black text-white">ر</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#282825] bg-[#282825] text-[9px] font-black text-white">+٨</span>
                    </span>
                    
                    <Link 
                      href={`/subjects/${subject.id}`} 
                      className="app-button min-h-9 border-2 border-[#282825] bg-white text-[#282825] px-4 py-1.5 text-xs font-black shadow-[2px_2px_0_#282825] hover:bg-[#282825] hover:text-white hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                    >
                      متابعة
                    </Link>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-2xl border-2 border-dashed border-[#282825] col-span-full p-8 text-center text-sm font-semibold text-[#5f5f59] bg-white">
                لا توجد مواد مرتبطة بفرعك بعد.
              </div>
            )}
          </div>
        </section>

        {/* Tasks Checklist & Aside challenge */}
        <section className="grid gap-6 xl:grid-cols-[1fr_310px]">
          
          {/* Tasks notebook */}
          <article className="rounded-[28px] border-2 border-[#282825] bg-white p-5 shadow-[5px_5px_0_#282825] sm:p-6 bg-dot-pattern-dense">
            <div className="flex items-center justify-between border-b border-[#282825]/10 pb-4">
              <div>
                <h2 className="text-xl font-black text-[#282825]">مهامي القادمة</h2>
                <p className="mt-1 text-xs text-[#5f5f59] font-bold">أنهِ المهام بالترتيب المناسب لك</p>
              </div>
              <Link href="/dashboard/planner" className="text-xs font-black text-[#ff5636] hover:underline">
                عرض المخطط
              </Link>
            </div>
            
            <div className="mt-5 space-y-2">
              {todayTasks.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-[#282825] bg-[#fafaf7] p-8 text-center">
                  <CalendarDays className="mx-auto h-8 w-8 text-[#5f5f59]" />
                  <p className="mt-3 font-black text-[#282825]">يومك فارغ حتى الآن</p>
                  <p className="mt-1 text-xs text-[#5f5f59] font-bold">أضف مهمة صغيرة يمكنك إنجازها اليوم.</p>
                </div>
              ) : (
                todayTasks.slice(0, 5).map((task) => (
                  <button 
                    key={task.id} 
                    onClick={() => toggleTask(task)} 
                    className="flex w-full items-center gap-3 border-b border-[#282825]/10 px-2 py-3.5 text-right transition hover:bg-[#fafaf7] rounded-xl hover:-translate-y-0.5 hover:shadow-[1.5px_1.5px_0_#282825] hover:border-[#282825] hover:bg-white"
                  >
                    <span 
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#282825] transition-all shadow-[1.5px_1.5px_0_#282825] ${task.completed ? 'bg-[#ffd64d] text-[#282825] shadow-none translate-x-0.5 translate-y-0.5' : 'bg-white text-transparent'}`}
                    >
                      {task.completed ? <Check className="h-4 w-4 stroke-[3px]" /> : <Circle className="h-3 w-3 text-[#d6d4cd]" />}
                    </span>
                    
                    <span className="min-w-0 flex-1">
                      <strong className={`block text-sm font-extrabold ${task.completed ? 'text-[#77776f] line-through font-medium' : 'text-[#282825]'}`}>
                        {task.title}
                      </strong>
                      {task.subjects?.name && (
                        <small className="text-[10px] font-black bg-[#ff5636]/10 border border-[#ff5636]/30 text-[#ff5636] px-2 py-0.5 rounded-md mt-1 inline-block">
                          {task.subjects.name}
                        </small>
                      )}
                    </span>
                    <small className="text-xs font-black text-[#77776f]">اليوم</small>
                  </button>
                ))
              )}
            </div>
            
            <form onSubmit={addTodayTask} className="mt-5 flex gap-2">
              <input 
                value={taskTitle} 
                onChange={(event) => setTaskTitle(event.target.value)} 
                placeholder="أضف مهمة لليوم..." 
                aria-label="مهمة جديدة" 
                className="app-input min-w-0 flex-1 text-sm border-2 border-[#282825] shadow-[2px_2px_0_#282825] focus:shadow-[4px_4px_0_#282825] focus:border-[#ff5636]" 
              />
              <button 
                disabled={addingTask || !taskTitle.trim()} 
                className="app-button flex h-[46px] w-[46px] shrink-0 items-center justify-center p-0 border-2 border-[#282825] bg-[#ff5636] shadow-[2px_2px_0_#282825] hover:shadow-[3px_3px_0_#282825] hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none"
              >
                <Plus className="h-5 w-5 stroke-[2.5px]" />
              </button>
            </form>
          </article>

          {/* Aside Challenge card */}
          <aside className="relative overflow-hidden rounded-[28px] border-2 border-[#282825] bg-gradient-to-br from-[#ffd64d] via-[#ffe685] to-[#fff0b3] p-6 text-[#282825] shadow-[5px_5px_0_#282825] bg-stripe-pattern">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#ff5636]" />
              <span className="text-xs font-black uppercase tracking-wider bg-white border border-[#282825] px-2 py-0.5 rounded shadow-[1px_1px_0_#282825]">اقتراح مخصص لك</span>
            </div>
            
            <h2 className="mt-5 text-2xl font-black leading-snug">مستعد لتحدٍ جديد؟</h2>
            <p className="mt-3 text-sm font-extrabold leading-6 text-slate-800">
              اختبر معلوماتك بنموذج امتحان وزاري قصير واحصل على نقاط خبرة إضافية.
            </p>
            
            <div className="mt-5 flex items-center gap-2 text-xs font-black text-slate-850">
              <Trophy className="h-4 w-4 text-[#ff5636] fill-[#ff5636]" /> +٢٠ XP عند إكمال الاختبار
            </div>
            
            <Link 
              href="/dashboard/exams" 
              className="app-button mt-8 border-2 border-[#282825] bg-[#ff5636] text-white py-3 text-sm font-black shadow-[3px_3px_0_#282825] hover:shadow-[5px_5px_0_#282825] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <span>ابدأ الاختبار</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </aside>
        </section>

      </main>
    </SidebarLayout>
  );
}
