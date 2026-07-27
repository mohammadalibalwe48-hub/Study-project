'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Check, Plus, Trash2, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { ListSkeleton } from '@/components/SkeletonLoader';
import { awardXP, updateStreak, checkAndUnlockBadges } from '@/utils/xpHelper';

interface Subject { id: number; name: string; }
interface PlannerTask { id: number; title: string; due_date: string; is_completed: boolean; subject_id: number | null; subjects?: { name: string } | null; }

export default function PlannerPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { if (!loading && !user) router.push('/auth'); }, [user, loading, router]);

  const fetchData = async () => {
    if (!user) return;
    try {
      setDbLoading(true);
      const { data: subData } = await supabase.from('subjects').select('id, name');
      setSubjects(subData || []);
      const { data: tasksData, error } = await supabase.from('planner_tasks').select('id,title,due_date,is_completed,subject_id,subjects(name)').eq('user_id', user.id).order('due_date', { ascending: true });
      if (error) throw error;
      setTasks((tasksData as unknown as PlannerTask[]) || []);
    } catch (error) {
      console.error('Error fetching planner data:', error);
    } finally { setDbLoading(false); }
  };

  useEffect(() => { if (user) void fetchData(); }, [user]);

  const handleAddTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !title.trim() || !dueDate) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('planner_tasks').insert({ user_id: user.id, title: title.trim(), due_date: dueDate, subject_id: subjectId ? Number(subjectId) : null, is_completed: false });
      if (error) throw error;
      await awardXP(user.id, 5); await updateStreak(user.id); await checkAndUnlockBadges(user.id);
      setTitle(''); setSubjectId(''); await fetchData();
    } catch (error) { console.error('Error adding task:', error); }
    finally { setActionLoading(false); }
  };

  const handleToggleTask = async (task: PlannerTask) => {
    if (!user) return;
    const is_completed = !task.is_completed;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, is_completed } : item));
    try {
      const { error } = await supabase.from('planner_tasks').update({ is_completed }).eq('id', task.id);
      if (error) throw error;
      if (is_completed) { await awardXP(user.id, 10); await updateStreak(user.id); await checkAndUnlockBadges(user.id); }
    } catch (error) { setTasks((current) => current.map((item) => item.id === task.id ? task : item)); console.error('Error toggling task:', error); }
  };

  const handleDeleteTask = async (id: number) => {
    if (!user) return;
    setTasks((current) => current.filter((task) => task.id !== id));
    const { error } = await supabase.from('planner_tasks').delete().eq('id', id);
    if (error) { console.error('Error deleting task:', error); await fetchData(); }
  };

  if (loading || dbLoading) return <SidebarLayout role={profile?.role} signOut={signOut}><div className="p-6"><ListSkeleton count={4} /></div></SidebarLayout>;

  const completedCount = tasks.filter((task) => task.is_completed).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <main className="mx-auto w-full max-w-[1100px] space-y-6">
        <header className="flex flex-col gap-4 border-b border-[#d6d4cd] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div><span className="app-chip bg-[#ffd64d]"><CalendarDays className="h-4 w-4" /> جدول الدراسة والأهداف</span><h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">مخطط الدراسة اليومي</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-[#6e6e67]">نظّم مهامك، حدد موعد المراجعة، واكسب نقاط خبرة عند إتمام كل خطوة.</p></div>
          <div className="app-card min-w-40 bg-[#bce9fa] p-4 text-center"><span className="block text-xs text-[#6e6e67]">إنجاز المهام</span><strong className="text-2xl">{completedCount} / {tasks.length}</strong><div className="mt-2 h-2 overflow-hidden rounded-full border border-[#282825] bg-white"><div className="h-full bg-[#ff5636]" style={{ width: `${progress}%` }} /></div></div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <form onSubmit={handleAddTask} className="app-card h-fit bg-[#dcbcff] p-5 sm:p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#282825] bg-[#ffd64d]"><Plus className="h-5 w-5" /></span><h2 className="mt-4 text-xl font-extrabold">إضافة هدف جديد</h2><p className="mt-1 text-xs text-[#6e6e67]">قسّم هدفك الكبير إلى مهمة واضحة.</p>
            <div className="mt-5 space-y-3"><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: مراجعة درس النواس" className="app-input w-full text-sm" /><select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="app-input w-full text-sm"><option value="">اختر المادة...</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><input type="date" required value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="app-input w-full text-sm" /><button disabled={actionLoading} className="app-button w-full"><Plus className="h-4 w-4" /> {actionLoading ? 'جاري الإضافة...' : 'إضافة الهدف (+5 XP)'}</button></div>
          </form>

          <section className="app-card bg-white p-5 sm:p-6"><div className="flex items-center justify-between border-b border-[#deddd7] pb-4"><div><h2 className="text-xl font-extrabold">قائمة أهدافك</h2><p className="mt-1 text-xs text-[#6e6e67]">ابدأ بالأهم، ثم انتقل إلى التالي.</p></div><Trophy className="h-6 w-6 text-[#ff5636]" /></div>
            {tasks.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-[#aaa9a2] p-12 text-center text-sm text-[#6e6e67]">لا توجد مهام بعد. أضف هدفك الأول للبدء.</div> : <div className="mt-3 divide-y divide-[#deddd7]">{tasks.map((task) => <div key={task.id} className="flex items-center gap-3 py-4"><button onClick={() => handleToggleTask(task)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#282825] ${task.is_completed ? 'bg-[#ffd64d]' : 'bg-white text-transparent'}`} aria-label="تغيير حالة المهمة"><Check className="h-4 w-4" /></button><div className="min-w-0 flex-1"><h3 className={`text-sm font-bold ${task.is_completed ? 'text-[#888880] line-through' : ''}`}>{task.title}</h3><div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#6e6e67]">{task.subjects?.name && <span className="rounded-full border border-[#282825] bg-[#bce9fa] px-2 py-0.5 font-bold">{task.subjects.name}</span>}<span>{new Intl.DateTimeFormat('ar-SY').format(new Date(`${task.due_date}T00:00:00`))}</span></div></div><button onClick={() => handleDeleteTask(task.id)} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#77776f] hover:bg-[#ff5636] hover:text-white" aria-label="حذف المهمة"><Trash2 className="h-4 w-4" /></button></div>)}</div>}
          </section>
        </section>
      </main>
    </SidebarLayout>
  );
}
