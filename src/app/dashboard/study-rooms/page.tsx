'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { awardXP, updateStreak, checkAndUnlockBadges } from '@/utils/xpHelper';
import { focusAudio } from '@/utils/audioSynth';
import { Target, Rocket, Brain, Pause, Play, RotateCcw, CloudRain, Sparkles, Coffee, MessageSquare, ArrowLeft } from 'lucide-react';

interface Subject {
  id: number;
  name: string;
  description: string;
  branch_id: number;
}

interface RoomMessage {
  id: number;
  message: string;
  created_at: string;
  users?: {
    full_name: string;
  } | null;
}

interface PlannerTask {
  id: number;
  title: string;
  is_completed: boolean;
}

export default function StudyRoomsPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [dbLoading, setDbLoading] = useState(true);

  const [timerDuration, setTimerDuration] = useState<number>(1500);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(1500);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [soundMode, setSoundMode] = useState<'off' | 'rain' | 'binaural' | 'hum'>('off');
  const [soundVolume, setSoundVolume] = useState<number>(0.5);

  const [chatMessages, setChatMessages] = useState<RoomMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [sessionTasks, setSessionTasks] = useState<PlannerTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchSubjectsData() {
      try {
        setDbLoading(true);
        const { data, error } = await supabase.from('subjects').select('*').order('id', { ascending: true });
        if (error) throw error;
        setSubjects(data || []);
      } catch (err) {
        console.error('Error fetching study room subjects:', err);
      } finally {
        setDbLoading(false);
      }
    }
    fetchSubjectsData();
  }, []);

  const fetchRoomMessages = async (subjId: number) => {
    try {
      const { data, error } = await supabase
        .from('room_messages')
        .select(`
          id,
          message,
          created_at,
          users (
            full_name
          )
        `)
        .eq('subject_id', subjId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (!error && data) {
        setChatMessages(data as any || []);
      }
    } catch (err) {
      console.error('Error fetching room messages:', err);
    }
  };

  const fetchSessionTasks = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('id, title, is_completed')
        .eq('user_id', user.id)
        .order('id', { ascending: false })
        .limit(6);

      if (!error && data) {
        setSessionTasks(data || []);
      }
    } catch (err) {
      console.error('Error fetching session tasks:', err);
    }
  };

  useEffect(() => {
    if (selectedSubject) {
      fetchRoomMessages(selectedSubject.id);
      fetchSessionTasks();

      const channel = supabase
        .channel(`room_${selectedSubject.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `subject_id=eq.${selectedSubject.id}` },
          () => {
            fetchRoomMessages(selectedSubject.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimerActive(false);
            if (user) {
              awardXP(user.id, 30);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, user]);

  const handleSoundToggle = (mode: 'rain' | 'binaural' | 'hum') => {
    if (soundMode === mode) {
      setSoundMode('off');
      focusAudio.stopFocusSound();
    } else {
      setSoundMode(mode);
      focusAudio.startFocusSound(mode, soundVolume);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !user || !selectedSubject) return;

    const msgText = messageInput.trim();
    setMessageInput('');

    try {
      const { error } = await supabase.from('room_messages').insert({
        user_id: user.id,
        subject_id: selectedSubject.id,
        message: msgText,
      });

      if (error) throw error;
      await fetchRoomMessages(selectedSubject.id);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error('Error sending room message:', err);
    }
  };

  const selectTimerPreset = (secs: number) => {
    setTimerActive(false);
    setTimerDuration(secs);
    setTimerSecondsLeft(secs);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || dbLoading) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="p-8">
          <DashboardSkeleton />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <main className="mx-auto w-full max-w-[1180px] space-y-8 text-right bg-dot-pattern py-4" dir="rtl">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-[#282825] pb-6">
          <div>
            <span className="app-chip bg-[#ffd64d] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
              <Target className="h-4 w-4 text-[#ff5636]" /> غرف التركيز الافتراضية
            </span>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl text-[#282825]">
              مساحة المذاكرة التفاعلية
            </h1>
            <p className="text-[#5f5f59] text-sm max-w-xl leading-relaxed font-semibold mt-1">
              انضم لغرفة المادة الدراسية، اضبط مؤقت البومودورو، استمع لأصوات التركيز الذهنية، وتبادل الأسئلة مع زملائك.
            </p>
          </div>

          {selectedSubject && (
            <button
              onClick={() => {
                setSelectedSubject(null);
                setTimerActive(false);
                focusAudio.stopFocusSound();
                setSoundMode('off');
              }}
              className="app-button border-2 border-[#282825] bg-white text-[#ff5636] px-5 py-2.5 text-xs font-black shadow-[2.5px_2.5px_0_#282825] hover:bg-[#ff5636] hover:text-white transition-all cursor-pointer"
            >
              ← اختيار غرفة أخرى
            </button>
          )}
        </div>

        {!selectedSubject ? (
          /* ROOM SELECTION GRID */
          <div className="space-y-6">
            <div className="flex justify-between items-center rounded-2xl border-2 border-[#282825] bg-white p-5 shadow-[4px_4px_0_#282825]">
              <div>
                <h2 className="text-xl font-black text-[#282825]">اختر غرفة المادة للانضمام لغرفة التركيز</h2>
                <p className="text-xs font-bold text-[#5f5f59] mt-1">كل غرفة توفر بيئة تفاعلية ومؤقتات تخصصية وأصوات ذهنية لرفع التركيز.</p>
              </div>
              <span className="app-chip bg-[#bce9fa] border border-[#282825] text-xs font-black shadow-[1.5px_1.5px_0_#282825]">
                {subjects.length} غرف متاحة
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((sub, index) => {
                const cardBgs = ['bg-[#ffdc72] neo-shadow-interactive-yellow', 'bg-[#bce9fa] neo-shadow-interactive-blue', 'bg-[#d8bcff] neo-shadow-interactive-purple', 'bg-[#cce6b4] neo-shadow-interactive-coral'];
                const bg = cardBgs[index % cardBgs.length];

                return (
                  <div
                    key={sub.id}
                    className={`rounded-2xl border-2 border-[#282825] p-6 flex flex-col justify-between min-h-[250px] transition-all group text-right ${bg}`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="app-chip bg-white border border-[#282825] px-3 py-1 text-[11px] font-black shadow-[1.5px_1.5px_0_#282825]">
                          مقرر بكالوريا
                        </span>
                        <span className="app-chip bg-white border border-[#282825] px-2.5 py-0.5 text-xs font-black text-[#15803d] shadow-[1.5px_1.5px_0_#282825] flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#15803d] animate-pulse" />
                          متاحة الآن
                        </span>
                      </div>

                      <h3 className="text-3xl font-black text-[#282825] group-hover:text-[#ff5636] transition-colors">
                        {sub.name}
                      </h3>
                      <p className="text-xs font-semibold text-[#4a4a44] leading-relaxed line-clamp-2">
                        {sub.description || 'جلسات تكرار متباعد وحل تمارين مع زملائك بكفاءة عالية.'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedSubject(sub);
                        setTimerActive(false);
                      }}
                      className="app-button border-2 border-[#282825] bg-[#ff5636] text-white w-full py-3 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[4px_4px_0_#282825] hover:-translate-y-0.5 transition-all mt-6 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Rocket className="w-4 h-4 text-white" /> 
                      <span>دخول غرفة {sub.name}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ACTIVE FOCUS ROOM VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* TIMER & AUDIO */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="rounded-2xl border-2 border-[#282825] bg-[#ffd64d] p-8 shadow-[6px_6px_0_#282825] flex flex-col items-center justify-center text-center space-y-6 bg-stripe-pattern">
                <div className="flex items-center justify-between w-full border-b-2 border-[#282825]/15 pb-4">
                  <h2 className="text-2xl font-black text-[#282825] flex items-center gap-2">
                    غرفة {selectedSubject.name} <Brain className="w-6 h-6 text-[#ff5636]" />
                  </h2>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectTimerPreset(1500)}
                      className={`rounded-xl border-2 border-[#282825] px-3.5 py-1 text-xs font-black transition-all ${
                        timerDuration === 1500 ? 'bg-[#282825] text-white shadow-[2px_2px_0_#ff5636]' : 'bg-white text-[#282825] shadow-[2px_2px_0_#282825]'
                      }`}
                    >
                      25د بومودورو
                    </button>
                    <button
                      onClick={() => selectTimerPreset(3000)}
                      className={`rounded-xl border-2 border-[#282825] px-3.5 py-1 text-xs font-black transition-all ${
                        timerDuration === 3000 ? 'bg-[#282825] text-white shadow-[2px_2px_0_#ff5636]' : 'bg-white text-[#282825] shadow-[2px_2px_0_#282825]'
                      }`}
                    >
                      50د مركز
                    </button>
                  </div>
                </div>

                <div className="text-6xl sm:text-7xl font-black text-[#282825] tracking-widest font-mono">
                  {formatTime(timerSecondsLeft)}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setTimerActive(!timerActive)}
                    className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-8 py-3 text-xs font-black shadow-[3px_3px_0_#282825] hover:shadow-[5px_5px_0_#282825] transition-all cursor-pointer flex items-center gap-2"
                  >
                    {timerActive ? <><Pause className="w-4 h-4" /> إيقاف مؤقت</> : <><Play className="w-4 h-4 text-white fill-white" /> بدء التركيز</>}
                  </button>

                  <button
                    onClick={() => {
                      setTimerActive(false);
                      setTimerSecondsLeft(timerDuration);
                    }}
                    className="app-button border-2 border-[#282825] bg-white text-[#282825] px-6 py-3 text-xs font-black shadow-[2.5px_2.5px_0_#282825] flex items-center gap-1.5"
                  >
                    إعادة ضبط <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sound Ambience */}
              <div className="rounded-2xl border-2 border-[#282825] bg-white p-6 shadow-[5px_5px_0_#282825] space-y-4">
                <h3 className="text-lg font-black text-[#282825]">أصوات التركيز والخلفية الذهنية</h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleSoundToggle('rain')}
                    className={`py-3 rounded-xl border-2 border-[#282825] text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      soundMode === 'rain' ? 'bg-[#bce9fa] text-[#282825] shadow-[3px_3px_0_#282825]' : 'bg-white text-[#5f5f59] shadow-[2px_2px_0_#282825]'
                    }`}
                  >
                    <CloudRain className="w-4 h-4 text-[#ff5636]" /> مطر ناعم
                  </button>
                  <button
                    onClick={() => handleSoundToggle('binaural')}
                    className={`py-3 rounded-xl border-2 border-[#282825] text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      soundMode === 'binaural' ? 'bg-[#ffd64d] text-[#282825] shadow-[3px_3px_0_#282825]' : 'bg-white text-[#5f5f59] shadow-[2px_2px_0_#282825]'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-[#ff5636]" /> موجات ألفا
                  </button>
                  <button
                    onClick={() => handleSoundToggle('hum')}
                    className={`py-3 rounded-xl border-2 border-[#282825] text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      soundMode === 'hum' ? 'bg-[#cce6b4] text-[#282825] shadow-[3px_3px_0_#282825]' : 'bg-white text-[#5f5f59] shadow-[2px_2px_0_#282825]'
                    }`}
                  >
                    <Coffee className="w-4 h-4 text-[#ff5636]" /> مقهى هادئ
                  </button>
                </div>
              </div>
            </div>

            {/* CHAT PANEL */}
            <div className="lg:col-span-5 rounded-2xl border-2 border-[#282825] bg-white p-6 shadow-[5px_5px_0_#282825] flex flex-col h-[500px] justify-between">
              <h3 className="text-xl font-black text-[#282825] border-b-2 border-[#282825]/10 pb-3 mb-3 flex items-center justify-between">
                <span>شات الطلاب المباشر</span>
                <MessageSquare className="w-5 h-5 text-[#ff5636]" />
              </h3>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="rounded-xl border border-[#282825]/20 bg-[#fafaf7] p-3 text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-black text-[#282825]">
                      <span>{msg.users?.full_name || 'طالب مسار'}</span>
                      <span className="text-[#77776f] font-normal">{new Date(msg.created_at).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[#282825] font-semibold leading-relaxed">{msg.message}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t-2 border-[#282825]/10">
                <input
                  type="text"
                  required
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="اكتب استفسارك هنا..."
                  className="flex-1 rounded-xl border-2 border-[#282825] bg-white px-4 py-2.5 text-xs font-semibold text-[#282825] placeholder-[#77776f] shadow-[2px_2px_0_#282825] focus:outline-none focus:border-[#ff5636]"
                />
                <button
                  type="submit"
                  className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-5 py-2.5 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[3.5px_3.5px_0_#282825] transition-all"
                >
                  إرسال
                </button>
              </form>
            </div>

          </div>
        )}

      </main>
    </SidebarLayout>
  );
}
