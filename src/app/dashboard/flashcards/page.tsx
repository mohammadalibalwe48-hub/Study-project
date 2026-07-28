'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { CardSkeleton } from '@/components/SkeletonLoader';
import { Trash2, Brain, Plus, Filter, RotateCw } from 'lucide-react';
import { awardXP, updateStreak, checkAndUnlockBadges } from '@/utils/xpHelper';

interface Subject {
  id: number;
  name: string;
}

interface Flashcard {
  id: number;
  front: string;
  back: string;
  ease_level: 'hard' | 'medium' | 'easy';
  subject_id: number | null;
  subjects?: {
    name: string;
  } | null;
}

export default function FlashcardsPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const router = useRouter();

  const [activeDeck, setActiveDeck] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

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

      const { data: fcData, error: fcErr } = await supabase
        .from('flashcards')
        .select(`
          id,
          front,
          back,
          ease_level,
          subject_id,
          subjects (
            name
          )
        `)
        .eq('user_id', user.id);

      if (fcErr) throw fcErr;
      setFlashcards(fcData as any || []);
    } catch (err) {
      console.error('Error fetching flashcards:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    let filtered = flashcards;
    if (selectedSubjectFilter !== 'all') {
      filtered = flashcards.filter(c => c.subject_id === Number(selectedSubjectFilter));
    }
    setActiveDeck(filtered);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [flashcards, selectedSubjectFilter]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !front.trim() || !back.trim()) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('flashcards')
        .insert({
          user_id: user.id,
          front,
          back,
          subject_id: subjectId ? Number(subjectId) : null,
          ease_level: 'medium',
        });

      if (error) throw error;

      await awardXP(user.id, 10);
      await updateStreak(user.id);
      await checkAndUnlockBadges(user.id);

      setFront('');
      setBack('');
      setSubjectId('');
      setShowAddForm(false);
      await fetchData();
    } catch (err) {
      console.error('Error adding flashcard:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCard = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه البطاقة؟')) return;
    try {
      const { error } = await supabase.from('flashcards').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  };

  const currentCard = activeDeck[currentIndex];

  if (loading || dbLoading) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="p-8">
          <CardSkeleton />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <main className="mx-auto w-full max-w-[1180px] space-y-8 text-right bg-dot-pattern py-4" dir="rtl">
        
        {/* Header */}
        <div className="flex flex-col gap-4 border-b-2 border-[#282825] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="app-chip bg-[#cce6b4] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
              <Brain className="h-4 w-4 text-[#ff5636]" /> نظام التكرار المتباعد
            </span>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl text-[#282825]">
              بطاقات التذكر الذكية
            </h1>
            <p className="text-[#5f5f59] text-sm max-w-xl leading-relaxed font-semibold mt-1">
              راجع مفاهيم وقوانين البكالوريا بطريقة البطاقات التفاعلية لترسيخ المعلومات في الذاكرة طويلة المدى.
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-6 py-3 text-xs font-black shadow-[3.5px_3.5px_0_#282825] hover:shadow-[5px_5px_0_#282825] hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>{showAddForm ? 'إغلاق النموذج' : 'إضافة بطاقة جديدة'}</span>
            <Plus className="h-4 w-4 stroke-[3px]" />
          </button>
        </div>

        {/* Add Card Form */}
        {showAddForm && (
          <form onSubmit={handleCreateCard} className="rounded-2xl border-2 border-[#282825] bg-[#ffd64d] p-6 sm:p-8 shadow-[6px_6px_0_#282825] space-y-6 bg-dot-pattern-dense">
            <h3 className="text-2xl font-black text-[#282825] border-b-2 border-[#282825]/10 pb-4">إضافة بطاقة تذكر جديدة</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-[#282825]">وجه البطاقة (السؤال أو المصطلح)</label>
                <textarea
                  rows={3}
                  required
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  placeholder="مثال: ما هو قانون دور النواس المرن؟"
                  className="w-full text-right rounded-xl border-2 border-[#282825] bg-white p-4 text-[#282825] placeholder-[#77776f] text-sm font-semibold shadow-[2px_2px_0_#282825] focus:outline-none focus:border-[#ff5636]"
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-[#282825]">ظهر البطاقة (الجواب والتوضيح)</label>
                <textarea
                  rows={3}
                  required
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder="T0 = 2π √(m/K)"
                  className="w-full text-right rounded-xl border-2 border-[#282825] bg-white p-4 text-[#282825] placeholder-[#77776f] text-sm font-semibold shadow-[2px_2px_0_#282825] focus:outline-none focus:border-[#ff5636]"
                ></textarea>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-[#282825]">المادة الدراسية (اختياري)</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-xl border-2 border-[#282825] bg-white p-3.5 text-[#282825] text-sm font-bold shadow-[2px_2px_0_#282825] focus:outline-none focus:border-[#ff5636]"
              >
                <option value="" className="bg-white text-[#282825]">اختر المادة...</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id} className="bg-white text-[#282825]">{sub.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="app-button w-full border-2 border-[#282825] bg-[#ff5636] text-white py-4 text-sm font-black shadow-[4px_4px_0_#282825] hover:shadow-[6px_6px_0_#282825] hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              {actionLoading ? 'جاري الحفظ...' : 'حفظ البطاقة (+10 XP)'}
            </button>
          </form>
        )}

        {/* Filter bar */}
        <div className="flex items-center justify-between rounded-2xl border-2 border-[#282825] bg-white p-4 shadow-[4px_4px_0_#282825]">
          <span className="text-xs font-black text-[#282825] flex items-center gap-1.5">
            <Filter className="h-4 w-4" /> تصفية حسب المادة:
          </span>
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="rounded-xl border-2 border-[#282825] bg-white px-4 py-2 text-xs font-black text-[#282825] shadow-[2px_2px_0_#282825] focus:outline-none"
          >
            <option value="all" className="bg-white text-[#282825]">جميع البطاقات ({flashcards.length})</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id} className="bg-white text-[#282825]">{sub.name}</option>
            ))}
          </select>
        </div>

        {/* Active Card Viewer */}
        {activeDeck.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#282825] bg-white p-16 text-center text-[#5f5f59] text-sm font-black shadow-[4px_4px_0_#282825]">
            لا توجد بطاقات تذكر مضافة في هذا التصنيف بعد.
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="rounded-2xl border-2 border-[#282825] bg-white p-10 min-h-[320px] shadow-[6px_6px_0_#282825] hover:shadow-[8px_8px_0_#282825] hover:-translate-y-0.5 transition-all flex flex-col justify-between items-center text-center cursor-pointer relative bg-dot-pattern"
            >
              <span className="app-chip bg-[#ffd64d] border-2 border-[#282825] shadow-[2px_2px_0_#282825] font-black text-xs">
                {isFlipped ? 'ظهر البطاقة (الإجابة 💡)' : 'وجه البطاقة (السؤال ❓)'}
              </span>

              <div className="my-auto space-y-4">
                <p className="text-2xl sm:text-3xl font-black text-[#282825] leading-relaxed">
                  {isFlipped ? currentCard.back : currentCard.front}
                </p>
                <span className="text-xs font-bold text-[#5f5f59] block flex items-center justify-center gap-1">
                  <RotateCw className="h-3.5 w-3.5" /> (اضغط على البطاقة لقلبها)
                </span>
              </div>

              <div className="w-full flex justify-between items-center border-t-2 border-[#282825]/10 pt-4 text-xs font-bold text-[#5f5f59]">
                <span>البطاقة {currentIndex + 1} من {activeDeck.length}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCard(currentCard.id); }}
                  className="text-[#ff5636] hover:underline flex items-center gap-1 font-black cursor-pointer"
                >
                  <span>حذف البطاقة</span>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stepper buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setCurrentIndex((prev) => Math.max(0, prev - 1));
                  setIsFlipped(false);
                }}
                disabled={currentIndex === 0}
                className="app-button border-2 border-[#282825] bg-white text-[#282825] px-6 py-3 text-xs font-black shadow-[3px_3px_0_#282825] disabled:opacity-40 cursor-pointer"
              >
                ← البطاقة السابقة
              </button>

              <button
                onClick={() => {
                  setCurrentIndex((prev) => Math.min(activeDeck.length - 1, prev + 1));
                  setIsFlipped(false);
                }}
                disabled={currentIndex === activeDeck.length - 1}
                className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-6 py-3 text-xs font-black shadow-[3px_3px_0_#282825] hover:shadow-[5px_5px_0_#282825] hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
              >
                البطاقة التالية →
              </button>
            </div>
          </div>
        )}

      </main>
    </SidebarLayout>
  );
}
