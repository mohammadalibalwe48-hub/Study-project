'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { CardSkeleton } from '@/components/SkeletonLoader';
import { Trash2 } from 'lucide-react';
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
      <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 overflow-y-auto text-right border border-white/15">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/10 pb-6">
          <div>
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-emerald-400 border border-emerald-400/20 uppercase inline-block">
              نظام التكرار المتباعد
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3">
              بطاقات التذكر الذكية
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              راجع مفاهيم وقوانين البكالوريا بطريقة البطاقات التفاعلية لترسيخ المعلومات في الذاكرة طويلة المدى.
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="liquid-glass-glow rounded-full px-6 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer"
          >
            {showAddForm ? 'إغلاق النموذج' : 'إضافة بطاقة جديدة +'}
          </button>
        </div>

        {/* Add Card Form */}
        {showAddForm && (
          <form onSubmit={handleCreateCard} className="liquid-glass rounded-3xl p-8 border border-white/20 space-y-6">
            <h3 className="text-2xl font-display text-foreground border-b border-white/10 pb-4">إضافة بطاقة تذكر جديدة</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs text-muted-foreground">وجه البطاقة (السؤال أو المصطلح)</label>
                <textarea
                  rows={3}
                  required
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  placeholder="مثال: ما هو قانون النواس المرن؟"
                  className="w-full text-right liquid-glass rounded-2xl p-4 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-cyan-400/40"
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-muted-foreground">ظهر البطاقة (الجواب والتوضيح)</label>
                <textarea
                  rows={3}
                  required
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder="T0 = 2π √(m/K)"
                  className="w-full text-right liquid-glass rounded-2xl p-4 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-cyan-400/40"
                ></textarea>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-muted-foreground">المادة الدراسية (اختياري)</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full liquid-glass rounded-2xl p-4 text-foreground text-sm focus:outline-none focus:border-cyan-400/40"
              >
                <option value="" className="bg-[#001420]">اختر المادة...</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id} className="bg-[#001420]">{sub.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="liquid-glass-glow w-full rounded-full py-4 text-sm font-medium text-foreground hover:scale-[1.02] transition-transform border border-emerald-400/40 cursor-pointer"
            >
              {actionLoading ? 'جاري الحفظ...' : 'حفظ البطاقة (+10 XP)'}
            </button>
          </form>
        )}

        {/* Filter bar */}
        <div className="flex items-center justify-between liquid-glass p-4 rounded-3xl border border-white/10">
          <span className="text-xs text-muted-foreground">تصفية حسب المادة:</span>
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="liquid-glass rounded-full px-5 py-2 text-xs text-foreground focus:outline-none border border-white/10"
          >
            <option value="all" className="bg-[#001420]">جميع البطاقات ({flashcards.length})</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id} className="bg-[#001420]">{sub.name}</option>
            ))}
          </select>
        </div>

        {/* Active Card Viewer */}
        {activeDeck.length === 0 ? (
          <div className="liquid-glass rounded-3xl p-16 text-center text-muted-foreground text-sm border border-white/10">
            لا توجد بطاقات تذكر مضافة في هذا التصنيف بعد.
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="liquid-glass-glow rounded-3xl p-12 min-h-[300px] border border-white/20 flex flex-col justify-between items-center text-center cursor-pointer hover:scale-[1.02] transition-all group relative"
            >
              <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3.5 py-1 rounded-full">
                {isFlipped ? 'ظهر البطاقة (الجواب)' : 'وجه البطاقة (السؤال)'}
              </span>

              <div className="my-auto space-y-4">
                <p className="text-2xl sm:text-3xl font-display font-normal text-foreground leading-relaxed">
                  {isFlipped ? currentCard.back : currentCard.front}
                </p>
                <span className="text-xs text-muted-foreground block">(اضغط على البطاقة لقلبها)</span>
              </div>

              <div className="w-full flex justify-between items-center border-t border-white/10 pt-4 text-xs text-muted-foreground">
                <span>البطاقة {currentIndex + 1} من {activeDeck.length}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCard(currentCard.id); }}
                  className="text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  حذف البطاقة <Trash2 className="w-3.5 h-3.5" />
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
                className="liquid-glass rounded-full px-6 py-3 text-xs text-foreground font-medium disabled:opacity-40 cursor-pointer"
              >
                ← البطاقة السابقة
              </button>

              <button
                onClick={() => {
                  setCurrentIndex((prev) => Math.min(activeDeck.length - 1, prev + 1));
                  setIsFlipped(false);
                }}
                disabled={currentIndex === activeDeck.length - 1}
                className="liquid-glass-glow rounded-full px-6 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer disabled:opacity-40"
              >
                البطاقة التالية →
              </button>
            </div>
          </div>
        )}

      </div>
    </SidebarLayout>
  );
}
