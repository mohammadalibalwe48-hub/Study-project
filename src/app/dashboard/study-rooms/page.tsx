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
import { ClockIcon, FlameIcon, SparkIcon, TargetIcon, TrophyIcon } from '@/components/icons/SvgIcons';
import { Target, Rocket, Brain, Pause, Play, RotateCcw, CloudRain, Sparkles, Coffee, MessageSquare } from 'lucide-react';

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
      <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 overflow-y-auto text-right border border-white/15">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-cyan-300 border border-cyan-400/20 uppercase inline-block">
              غرف التركيز الافتراضية
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3 flex items-center gap-3">
              مساحة المذاكرة التفاعلية <Target className="w-8 h-8 text-cyan-400" />
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
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
              className="liquid-glass rounded-full px-6 py-2.5 text-xs text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              ← اختيار غرفة أخرى
            </button>
          )}
        </div>

        {!selectedSubject ? (
          /* ROOM SELECTION GRID */
          <div className="space-y-6">
            <div className="flex justify-between items-center liquid-glass p-6 rounded-3xl border border-white/10">
              <div>
                <h2 className="text-2xl font-display font-normal text-foreground">اختر مقرر المادة للانضمام لغرفة التركيز</h2>
                <p className="text-xs text-muted-foreground mt-1">كل غرفة توفر بيئة تفاعلية ومؤقتات تخصصية وأصوات ذهنية لرفع التركيز.</p>
              </div>
              <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3.5 py-1 rounded-full">
                {subjects.length} غرف متاحية
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((sub) => (
                <div
                  key={sub.id}
                  className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between min-h-[250px] hover:scale-[1.03] transition-all group text-right"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-1 rounded-full">
                        مقرر بكالوريا
                      </span>
                      <span className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        غرفة مفعّلة
                      </span>
                    </div>

                    <h3 className="text-3xl font-display font-normal text-foreground group-hover:text-cyan-200 transition-colors">
                      {sub.name}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {sub.description || 'جلسات تكرار متباعد وحل تمارين مع زملائك بكفاءة عالية.'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedSubject(sub);
                      setTimerActive(false);
                    }}
                    className="liquid-glass-glow rounded-full w-full py-3.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 mt-6 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Rocket className="w-4 h-4 text-cyan-400" /> دخول غرفة {sub.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ACTIVE FOCUS ROOM VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* TIMER & AUDIO */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="liquid-glass-glow rounded-3xl p-8 border border-white/15 flex flex-col items-center justify-center text-center space-y-6">
                <div className="flex items-center justify-between w-full border-b border-white/10 pb-4">
                  <h2 className="text-3xl font-display font-normal text-foreground flex items-center gap-2">
                    غرفة {selectedSubject.name} <Brain className="w-6 h-6 text-purple-400" />
                  </h2>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectTimerPreset(1500)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${timerDuration === 1500 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'liquid-glass text-muted-foreground'}`}
                    >
                      25د بومودورو
                    </button>
                    <button
                      onClick={() => selectTimerPreset(3000)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${timerDuration === 3000 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'liquid-glass text-muted-foreground'}`}
                    >
                      50د مركز
                    </button>
                  </div>
                </div>

                <div className="text-6xl sm:text-7xl font-display font-normal text-foreground tracking-widest font-mono">
                  {formatTime(timerSecondsLeft)}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setTimerActive(!timerActive)}
                    className="liquid-glass-glow rounded-full px-10 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer flex items-center gap-2"
                  >
                    {timerActive ? <><Pause className="w-4 h-4" /> إيقاف مؤقت</> : <><Play className="w-4 h-4 text-cyan-400 fill-cyan-400" /> بدء التركيز</>}
                  </button>

                  <button
                    onClick={() => {
                      setTimerActive(false);
                      setTimerSecondsLeft(timerDuration);
                    }}
                    className="liquid-glass rounded-full px-6 py-3 text-xs text-muted-foreground hover:text-foreground border border-white/10 flex items-center gap-1.5"
                  >
                    إعادة ضبط <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sound Ambience */}
              <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-4">
                <h3 className="text-xl font-display text-foreground">أصوات التركيز والخلفية الذهنية</h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleSoundToggle('rain')}
                    className={`py-3 rounded-2xl text-xs font-medium border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${soundMode === 'rain' ? 'liquid-glass-glow text-cyan-300 border-cyan-400/40' : 'liquid-glass text-muted-foreground'}`}
                  >
                    <CloudRain className="w-4 h-4 text-cyan-400" /> مطر ناعم
                  </button>
                  <button
                    onClick={() => handleSoundToggle('binaural')}
                    className={`py-3 rounded-2xl text-xs font-medium border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${soundMode === 'binaural' ? 'liquid-glass-glow text-cyan-300 border-cyan-400/40' : 'liquid-glass text-muted-foreground'}`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" /> موجات ألفا
                  </button>
                  <button
                    onClick={() => handleSoundToggle('hum')}
                    className={`py-3 rounded-2xl text-xs font-medium border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${soundMode === 'hum' ? 'liquid-glass-glow text-cyan-300 border-cyan-400/40' : 'liquid-glass text-muted-foreground'}`}
                  >
                    <Coffee className="w-4 h-4 text-emerald-400" /> مقهى هادئ
                  </button>
                </div>
              </div>
            </div>

            {/* CHAT PANEL */}
            <div className="lg:col-span-5 liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col h-[500px] justify-between">
              <h3 className="text-2xl font-display text-foreground border-b border-white/10 pb-3 mb-3 flex items-center gap-2">
                شات الطلاب المباشر <MessageSquare className="w-5 h-5 text-cyan-300" />
              </h3>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="liquid-glass rounded-2xl p-3 border border-white/5 text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-cyan-300 font-medium">
                      <span>{msg.users?.full_name || 'طالب'}</span>
                      <span className="text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-foreground leading-relaxed">{msg.message}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t border-white/10">
                <input
                  type="text"
                  required
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="اكتب استفسارك هنا..."
                  className="flex-1 liquid-glass rounded-2xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none"
                />
                <button
                  type="submit"
                  className="liquid-glass-glow rounded-2xl px-5 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40"
                >
                  إرسال
                </button>
              </form>
            </div>

          </div>
        )}

      </div>
    </SidebarLayout>
  );
}
