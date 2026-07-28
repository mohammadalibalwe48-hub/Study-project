'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Check, Plus, Trash2, Trophy, Target, Sparkles } from 'lucide-react';
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
      <main className="mx-auto w-full max-w-[1100px] space-y-8 text-right bg-dot-pattern py-4" dir="rtl">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b-2 border-[#282825] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="app-chip bg-[#ffd64d] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
              <CalendarDays className="h-4 w-4 text-[#ff5636]" /> جدول الدراسة والأهداف
            </span>
            <h1 className="mt-3 text-3xl font-black sm:text-5xl text-[#282825]">مخطط الدراسة اليومي</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-[#5f5f59]">نظّم مهامك، حدد موعد المراجعة، واكسب نقاط خبرة عند إتمام كل خطوة.</p>
          </div>
          
          <div className="rounded-2xl border-2 border-[#282825] bg-[#bce9fa] p-4 text-center min-w-44 shadow-[4px_4px_0_#282825]">
            <span className="block text-xs font-black text-[#282825]">نسبة إنجاز المهام</span>
            <strong className="text-3xl font-black text-[#282825]">{completedCount} / {tasks.length}</strong>
            <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-[#282825] bg-white">
              <div className="h-full bg-[#ff5636] animate-progress-stripe transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        {/* Content Section */}
        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Add Goal Sidebar Form */}
          <form onSubmit={handleAddTask} className="rounded-2xl border-2 border-[#282825] bg-[#dcbcff] p-6 shadow-[5px_5px_0_#282825] h-fit bg-dot-pattern-dense">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#282825] bg-[#ffd64d] shadow-[2px_2px_0_#282825]">
              <Plus className="h-6 w-6 stroke-[3px] text-[#282825]" />
            </span>
            <h2 className="mt-4 text-2xl font-black text-[#282825]">إضافة هدف جديد</h2>
            <p className="mt-1 text-xs font-bold text-[#5f5f59]">قسّم هدفك الكبير إلى مهمة يومية واضحة.</p>
            
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-[#282825] mb-1.5">عنوان المهمة</label>
                <input 
                  required 
                  value={title} 
                  onChange={(event) => setTitle(event.target.value)} 
                  placeholder="مثال: مراجعة درس النواس المرن" 
                  className="app-input w-full text-sm border-2 border-[#282825] shadow-[2px_2px_0_#282825] focus:shadow-[4px_4px_0_#282825]" 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#282825] mb-1.5">المادة المرتبطة</label>
                <select 
                  value={subjectId} 
                  onChange={(event) => setSubjectId(event.target.value)} 
                  className="app-input w-full text-sm border-2 border-[#282825] shadow-[2px_2px_0_#282825] focus:shadow-[4px_4px_0_#282825]"
                >
                  <option value="">اختر المادة...</option>
                  {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-[#282825] mb-1.5">تاريخ الإنجاز</label>
                <input 
                  type="date" 
                  required 
                  value={dueDate} 
                  onChange={(event) => setDueDate(event.target.value)} 
                  className="app-input w-full text-sm border-2 border-[#282825] shadow-[2px_2px_0_#282825] focus:shadow-[4px_4px_0_#282825]" 
                />
              </div>

              <button 
                disabled={actionLoading} 
                className="app-button w-full border-2 border-[#282825] bg-[#ff5636] text-white py-3 text-sm font-black shadow-[3px_3px_0_#282825] hover:shadow-[5px_5px_0_#282825] hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4 stroke-[3px]" />
                <span>{actionLoading ? 'جاري الإضافة...' : 'إضافة الهدف (+5 XP)'}</span>
              </button>
            </div>
          </form>

          {/* Goals List */}
          <section className="rounded-2xl border-2 border-[#282825] bg-white p-6 shadow-[5px_5px_0_#282825]">
            <div className="flex items-center justify-between border-b-2 border-[#282825]/10 pb-4">
              <div>
                <h2 className="text-2xl font-black text-[#282825]">قائمة أهدافك</h2>
                <p className="mt-1 text-xs font-extrabold text-[#5f5f59]">ابدأ بالأهم، ثم انتقل إلى التالي.</p>
              </div>
              <Trophy className="h-7 w-7 text-[#ff5636]" />
            </div>

            {tasks.length === 0 ? (
              <div className="mt-6 rounded-2xl border-2 border-dashed border-[#282825] bg-[#fafaf7] p-12 text-center text-sm font-black text-[#5f5f59]">
                لا توجد مهام بعد. أضف هدفك الأول للبدء.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center gap-3 py-3.5 px-3 border-b border-[#282825]/10 rounded-xl transition hover:bg-[#fafaf7]"
                  >
                    <button 
                      onClick={() => handleToggleTask(task)} 
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#282825] transition-all shadow-[1.5px_1.5px_0_#282825] ${
                        task.is_completed ? 'bg-[#ffd64d] text-[#282825] shadow-none translate-x-0.5 translate-y-0.5' : 'bg-white text-transparent'
                      }`} 
                      aria-label="تغيير حالة المهمة"
                    >
                      <Check className="h-4 w-4 stroke-[3px]" />
                    </button>
                    
                    <div className="min-w-0 flex-1">
                      <h3 className={`text-sm font-black ${task.is_completed ? 'text-[#888880] line-through font-normal' : 'text-[#282825]'}`}>
                        {task.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#5f5f59]">
                        {task.subjects?.name && (
                          <span className="rounded-md border border-[#282825] bg-[#bce9fa] px-2 py-0.5 font-black text-[#282825]">
                            {task.subjects.name}
                          </span>
                        )}
                        <span>{new Intl.DateTimeFormat('ar-SY').format(new Date(`${task.due_date}T00:00:00`))}</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleDeleteTask(task.id)} 
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-[#77776f] hover:border-[#282825] hover:bg-[#ff5636] hover:text-white transition-all shadow-none hover:shadow-[2px_2px_0_#282825]" 
                      aria-label="حذف المهمة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
    </SidebarLayout>
  );
}
