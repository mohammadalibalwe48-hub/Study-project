'use client';

import React, { useState, useEffect } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { useAuth } from '@/context/AuthContext';
import LiveRoomCard from '@/components/LiveRoomCard';
import { LiveRoom } from '@/data/liveRoomsData';
import { Radio, Plus, Search, Video, Mic, X, Check, Database, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function LiveRoomsLobbyPage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [subjectsList, setSubjectsList] = useState<string[]>(['الكل', 'الفيزياء', 'الكيمياء', 'الرياضيات', 'اللغة العربية', 'اللغة الإنكليزية', 'العلوم العامة']);
  const [selectedSubject, setSelectedSubject] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New room form state
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('الفيزياء');
  const [newIsTutorSession, setNewIsTutorSession] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  // 1. Fetch Active Rooms from Supabase Database & Global Channel
  async function fetchSupabaseRooms() {
    setIsLoadingRooms(true);
    try {
      // First try fetching from live_rooms table
      const { data: dbRooms, error } = await supabase
        .from('live_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && dbRooms && dbRooms.length > 0) {
        const formatted: LiveRoom[] = dbRooms.map((r: any) => ({
          id: String(r.id),
          title: r.title,
          subject: r.subject || 'الفيزياء',
          hostName: r.host_name || r.hostName || 'طالب مسار',
          isTutorSession: Boolean(r.is_tutor_session ?? r.isTutorSession),
          activeCount: r.active_count || 1,
          maxCount: r.max_count || 30,
          tags: r.tags || ['مباشر الان'],
          description: r.description || 'غرفة بث ومذاكرة تفاعلية.',
          createdAt: new Date(r.created_at || Date.now()).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }),
        }));
        setRooms(formatted);
      } else {
        // Fallback: load rooms from Supabase room_messages table or local cache
        const { data: msgRooms } = await supabase
          .from('room_messages')
          .select('room_id, message, created_at')
          .not('room_id', 'is', null)
          .order('created_at', { ascending: false });

        if (msgRooms && msgRooms.length > 0) {
          const uniqueRoomIds = Array.from(new Set(msgRooms.map((m: any) => m.room_id))).filter(Boolean);
          const fallbackRooms: LiveRoom[] = uniqueRoomIds.map((rid: any) => {
            // Check local room details or generate clean room
            const localSaved = typeof window !== 'undefined' ? localStorage.getItem(`masar_room_${rid}`) : null;
            if (localSaved) {
              try { return JSON.parse(localSaved); } catch {}
            }
            return {
              id: String(rid),
              title: `غرفة بث ومذاكرة تفاعلية (${rid})`,
              subject: 'الفيزياء والعلوم',
              hostName: 'طالب مسار',
              isTutorSession: false,
              activeCount: 1,
              maxCount: 20,
              tags: ['مباشر الان'],
              description: 'غرفة بث ومذاكرة تفاعلية نشطة الآن.',
              createdAt: 'الآن',
            };
          });
          setRooms(fallbackRooms);
        }
      }
    } catch (err) {
      console.warn('Supabase rooms fetch info:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  }

  useEffect(() => {
    fetchSupabaseRooms();
  }, []);

  // 2. Fetch Subjects from Supabase
  useEffect(() => {
    async function loadSupabaseSubjects() {
      try {
        const { data, error } = await supabase.from('subjects').select('name, title, name_ar').order('id', { ascending: true });
        if (!error && data && data.length > 0) {
          const names = data.map((s) => s.title || s.name_ar || s.name).filter(Boolean);
          if (names.length > 0) {
            setSubjectsList(['الكل', ...names]);
            setNewSubject(names[0]);
          }
        }
      } catch (err) {
        console.warn('Supabase subjects query:', err);
      }
    }
    loadSupabaseSubjects();
  }, []);

  // 3. Supabase Realtime Channel & Postgres Changes Subscriptions
  useEffect(() => {
    const channel = supabase.channel('global_live_rooms_lobby', {
      config: { broadcast: { self: true } }
    });

    // Listen for broadcast events when any user creates a room
    channel.on('broadcast', { event: 'new_room_created' }, (payload) => {
      if (payload?.payload?.room) {
        const newR = payload.payload.room;
        setRooms((prev) => {
          if (prev.some((r) => r.id === newR.id)) return prev;
          return [newR, ...prev];
        });
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredRooms = rooms.filter((r) => {
    const matchSubject = selectedSubject === 'الكل' || r.subject === selectedSubject;
    const matchSearch = r.title.includes(searchQuery) || r.description.includes(searchQuery) || r.hostName.includes(searchQuery);
    return matchSubject && matchSearch;
  });

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const roomId = `room-${Date.now()}`;
    const newRoomObj: LiveRoom = {
      id: roomId,
      title: newTitle.trim(),
      subject: newSubject,
      hostName: profile?.full_name || 'طالب مسار',
      isTutorSession: newIsTutorSession || profile?.role === 'admin',
      activeCount: 1,
      maxCount: newIsTutorSession ? 50 : 12,
      tags: ['مباشر الان', 'Supabase Realtime'],
      description: newDescription.trim() || 'غرفة بث ومذاكرة تفاعلية جديدة.',
      createdAt: 'الآن',
    };

    // Store in localStorage for fast local retrieval
    try {
      localStorage.setItem(`masar_room_${roomId}`, JSON.stringify(newRoomObj));
    } catch {}

    // 1. Insert into Supabase Table `live_rooms`
    try {
      await supabase.from('live_rooms').insert({
        id: roomId,
        title: newRoomObj.title,
        subject: newRoomObj.subject,
        host_name: newRoomObj.hostName,
        is_tutor_session: newRoomObj.isTutorSession,
        max_count: newRoomObj.maxCount,
        description: newRoomObj.description,
      });
    } catch (err) {
      console.warn('Supabase DB room insert info:', err);
    }

    // 2. Broadcast to all online users via Supabase Realtime Broadcast Channel
    try {
      const channel = supabase.channel('global_live_rooms_lobby');
      await channel.send({
        type: 'broadcast',
        event: 'new_room_created',
        payload: { room: newRoomObj },
      });
    } catch (err) {
      console.warn('Supabase Realtime broadcast info:', err);
    }

    // Update local state and navigate
    setRooms((prev) => [newRoomObj, ...prev]);
    setIsSubmitting(false);
    setCreateModalOpen(false);
    router.push(`/live-rooms/${roomId}`);
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="space-y-8 text-right" dir="rtl">
        
        {/* Banner Section */}
        <header className="rounded-3xl border-2 border-[#282825] bg-[#ffd64d] p-6 sm:p-8 shadow-[6px_6px_0_#282825] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-[#ff5636] text-white border-2 border-[#282825] shadow-[1.5px_1.5px_0_#282825]">
                <Radio className="w-4 h-4 animate-pulse" />
                <span>غرف البث التفاعلي المباشر 🎙️📹</span>
              </span>

              <span className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-white text-[#282825] border-2 border-[#282825]">
                <Database className="w-3.5 h-3.5 text-[#ff5636]" />
                <span>مربوطة بقاعدة بيانات Supabase ⚡</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#282825]">
              غرف البث والمذاكرة الصوتية والمرئية المباشرة
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#282825]/80 max-w-2xl leading-relaxed">
              تفاعل مباشرة مع زملائك والمدرسين صوتياً ومرئياً، تظهر جميع الغرف فور إنشائها لكافة الطلاب عبر Supabase.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSupabaseRooms}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[#282825] bg-white text-[#282825] shadow-[2px_2px_0_#282825] hover:bg-[#bce9fa] transition-all cursor-pointer"
              title="تحديث الغرف من Supabase"
            >
              <RefreshCw className={`w-5 h-5 ${isLoadingRooms ? 'animate-spin text-[#ff5636]' : ''}`} />
            </button>

            <button
              onClick={() => setCreateModalOpen(true)}
              className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-6 py-3.5 text-xs font-black shadow-[3px_3px_0_#282825] hover:shadow-[5px_5px_0_#282825] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              <span>إنشاء غرفة جديدة</span>
            </button>
          </div>
        </header>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          
          {/* Subject Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {subjectsList.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-4 py-2 text-xs font-black rounded-xl border-2 transition-all cursor-pointer whitespace-nowrap ${
                  selectedSubject === sub
                    ? 'bg-[#282825] text-white border-[#282825] shadow-[2px_2px_0_#ff5636]'
                    : 'bg-white text-[#282825] border-[#282825] hover:bg-[#bce9fa] shadow-[2px_2px_0_#282825]'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f5f59]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن عنوان أو مادة أو مدرس..."
              className="w-full rounded-xl border-2 border-[#282825] bg-white pr-10 pl-4 py-2 text-xs font-semibold placeholder-[#77776f] shadow-[2px_2px_0_#282825] focus:outline-none focus:border-[#ff5636]"
            />
          </div>
        </div>

        {/* Rooms Grid */}
        {isLoadingRooms ? (
          <div className="py-16 text-center text-xs font-bold text-[#5f5f59] space-y-2">
            <RefreshCw className="w-8 h-8 text-[#ff5636] animate-spin mx-auto" />
            <p>جاري جلب الغرف النشطة من قاعدة بيانات Supabase...</p>
          </div>
        ) : filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <LiveRoomCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center rounded-3xl border-2 border-dashed border-[#282825] bg-white p-8 space-y-3">
            <Radio className="w-12 h-12 text-[#ff5636] mx-auto opacity-50" />
            <h3 className="text-lg font-black text-[#282825]">لا توجد غرف بث نشطة حالياً</h3>
            <p className="text-xs font-bold text-[#5f5f59]">أنشئ غرفتك الآن وستظهر لجميع الطلاب المتصلين بنفس اللحظة عبر Supabase!</p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="app-button border-2 border-[#282825] bg-[#ffd64d] text-[#282825] px-6 py-3 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[3.5px_3.5px_0_#282825] transition-all cursor-pointer inline-flex items-center gap-2 mt-2"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              <span>إنشاء أول غرفة بث الآن</span>
            </button>
          </div>
        )}

      </div>

      {/* Create Room Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
          <div className="relative w-full max-w-lg rounded-3xl border-2 border-[#282825] bg-[#fafaf7] p-6 sm:p-8 shadow-[8px_8px_0_#282825] space-y-6 text-right">
            
            <div className="flex items-center justify-between border-b-2 border-[#282825]/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#282825] bg-[#ffd64d] shadow-[2px_2px_0_#282825]">
                  <Video className="w-5 h-5 text-[#ff5636]" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-[#282825]">إنشاء غرفة بث تفاعلية جديدة</h2>
                  <small className="text-[11px] font-bold text-[#5f5f59]">تزامن فوري ومحفوظ عبر Supabase</small>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#282825] bg-white hover:bg-[#ff5636] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-[#282825] font-black mb-1.5">عنوان الغرفة أو الجلسة:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: مراجعة مسائل الفيزياء والنواسات..."
                  className="w-full rounded-xl border-2 border-[#282825] bg-white p-3 text-xs font-semibold placeholder-[#77776f] shadow-[2px_2px_0_#282825] focus:outline-none focus:border-[#ff5636]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#282825] font-black mb-1.5">المادة الدراسية:</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#282825] bg-white p-3 text-xs font-semibold shadow-[2px_2px_0_#282825] focus:outline-none"
                  >
                    {subjectsList.filter((s) => s !== 'الكل').map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#282825] font-black mb-1.5">نوع الجلسة:</label>
                  <select
                    value={newIsTutorSession ? 'tutor' : 'peer'}
                    onChange={(e) => setNewIsTutorSession(e.target.value === 'tutor')}
                    className="w-full rounded-xl border-2 border-[#282825] bg-white p-3 text-xs font-semibold shadow-[2px_2px_0_#282825] focus:outline-none"
                  >
                    <option value="peer">مذاكرة جماعية للطلاب</option>
                    <option value="tutor">جلسة مدرس معتمد</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#282825] font-black mb-1.5">وصف مختصر للغرفة:</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="اكتب النقاط التي سيتم مناقشتها في البث..."
                  className="w-full rounded-xl border-2 border-[#282825] bg-white p-3 text-xs font-semibold placeholder-[#77776f] shadow-[2px_2px_0_#282825] focus:outline-none focus:border-[#ff5636]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border-2 border-[#282825] bg-white text-[#282825] text-xs font-black cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-6 py-2.5 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[3.5px_3.5px_0_#282825] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3px]" />
                  <span>{isSubmitting ? 'جاري الحفظ في Supabase...' : 'انطلق الآن 🚀'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </SidebarLayout>
  );
}
