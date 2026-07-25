'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { ListSkeleton } from '@/components/SkeletonLoader';
import { Check, Trash2 } from 'lucide-react';
import { awardXP, updateStreak, checkAndUnlockBadges } from '@/utils/xpHelper';

interface Subject {
  id: number;
  name: string;
}

interface PlannerTask {
  id: number;
  title: string;
  due_date: string;
  is_completed: boolean;
  subject_id: number | null;
  subjects?: {
    name: string;
  } | null;
}

export default function PlannerPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  const fetchData = async () => {
    if (!user) return;
    try {
      setDbLoading(true);

      const { data: subData } = await supabase.from('subjects').select('id, name');
      setSubjects(subData || []);

      const { data: tasksData, error: tasksErr } = await supabase
        .from('planner_tasks')
        .select(`
          id,
          title,
          due_date,
          is_completed,
          subject_id,
          subjects (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (tasksErr) throw tasksErr;
      setTasks(tasksData as any || []);
    } catch (err) {
      console.error('Error fetching planner data:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !dueDate) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('planner_tasks')
        .insert({
          user_id: user.id,
          title: title.trim(),
          due_date: dueDate,
          subject_id: subjectId ? Number(subjectId) : null,
          is_completed: false,
        });

      if (error) throw error;

      await awardXP(user.id, 5);
      await updateStreak(user.id);
      await checkAndUnlockBadges(user.id);

      setTitle('');
      setSubjectId('');
      await fetchData();
    } catch (err) {
      console.error('Error adding task:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTask = async (task: PlannerTask) => {
    if (!user) return;
    try {
      const newCompleted = !task.is_completed;
      const { error } = await supabase
        .from('planner_tasks')
        .update({ is_completed: newCompleted })
        .eq('id', task.id);

      if (error) throw error;

      if (newCompleted) {
        await awardXP(user.id, 10);
        await updateStreak(user.id);
        await checkAndUnlockBadges(user.id);
      }

      await fetchData();
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('planner_tasks').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  if (loading || dbLoading) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="p-8">
          <ListSkeleton count={4} />
        </div>
      </SidebarLayout>
    );
  }

  const completedCount = tasks.filter(t => t.is_completed).length;

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 overflow-y-auto text-right border border-white/15">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/10 pb-6">
          <div>
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-amber-300 border border-amber-400/20 uppercase inline-block">
              جدول الدراسة والأهداف
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3">
              مخطط الدراسة اليومي
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              نظّم مهامك الدراسية اليومية، حدد مواعيد المراجعة، واكسب +10 XP عند إتمام كل مهمة.
            </p>
          </div>

          <div className="liquid-glass rounded-2xl p-4 border border-white/10 text-center shrink-0">
            <span className="text-xs text-muted-foreground block">إنجاز المهام</span>
            <span className="text-2xl font-display text-emerald-400">{completedCount} / {tasks.length}</span>
          </div>
        </div>

        {/* Add Task Form */}
        <form onSubmit={handleAddTask} className="liquid-glass rounded-3xl p-6 border border-white/15 space-y-4">
          <h3 className="text-xl font-display text-foreground">إضافة هدف دراسي جديد</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: مراجعة مسائل النواس الثقيل"
              className="sm:col-span-2 text-right liquid-glass rounded-2xl p-4 text-foreground placeholder-muted-foreground text-xs focus:outline-none focus:border-cyan-400/40"
            />

            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="liquid-glass rounded-2xl p-4 text-foreground text-xs focus:outline-none border border-white/10"
            >
              <option value="" className="bg-[#001420]">اختر المادة...</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id} className="bg-[#001420]">{sub.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs text-muted-foreground whitespace-nowrap">تاريخ الإنجاز:</span>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="liquid-glass rounded-2xl px-4 py-2.5 text-xs text-foreground focus:outline-none border border-white/10"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="liquid-glass-glow rounded-full px-8 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer shrink-0"
            >
              {actionLoading ? 'جاري الإضافة...' : 'إضافة الهدف (+5 XP)'}
            </button>
          </div>
        </form>

        {/* Tasks List */}
        <div className="space-y-4">
          <h3 className="text-2xl font-display font-normal text-foreground">قائمة الأهداف المسجلة</h3>

          {tasks.length === 0 ? (
            <div className="liquid-glass rounded-3xl p-12 text-center text-muted-foreground text-sm border border-white/10">
              لا توجد مهام دراسية مسجلة بعد. أضف هدفك الأول للبدء!
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`liquid-glass rounded-2xl p-4 border flex items-center justify-between transition-all ${
                    task.is_completed ? 'border-emerald-400/30 bg-emerald-500/5 opacity-80' : 'border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4 text-right">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className={`h-6 w-6 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                        task.is_completed
                          ? 'bg-emerald-500 border-emerald-400 text-black'
                          : 'border-white/30 text-transparent hover:border-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>

                    <div>
                      <h4 className={`text-sm font-medium ${task.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        {task.subjects?.name && (
                          <span className="text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-2.5 py-0.5 rounded-full">
                            {task.subjects.name}
                          </span>
                        )}
                        <span>تاريخ: {task.due_date}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-xs text-muted-foreground hover:text-rose-400 p-2 flex items-center gap-1 cursor-pointer"
                  >
                    حذف <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </SidebarLayout>
  );
}
