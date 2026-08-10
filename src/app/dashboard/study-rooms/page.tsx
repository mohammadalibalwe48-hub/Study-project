'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useStudyRoomCall, type RemoteRoomStream, type RoomParticipant } from './useStudyRoomCall';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { awardXP } from '@/utils/xpHelper';
import { focusAudio } from '@/utils/audioSynth';
import {
  ArrowRight,
  Brain,
  CloudRain,
  Coffee,
  Headphones,
  MessageSquare,
  Mic,
  MicOff,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Sparkles,
  UserRound,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react';

interface Subject {
  id: number;
  name: string;
  description: string | null;
}

type RoomMode = 'voice' | 'video' | 'both';

interface StudyRoom {
  id: string;
  title: string;
  description: string;
  mode: RoomMode;
  capacity: number;
  subject_id: number | null;
  creator_id: string;
  created_at: string;
  members?: { user_id: string }[];
  subjects?: { name: string }[] | null;
}

interface RoomForm {
  title: string;
  description: string;
  mode: RoomMode;
  capacity: number;
  subjectId: string;
}

const defaultForm: RoomForm = {
  title: '',
  description: '',
  mode: 'both',
  capacity: 6,
  subjectId: '',
};

const cardBgs = ['bg-[#ffdc72]', 'bg-[#bce9fa]', 'bg-[#d8bcff]', 'bg-[#cce6b4]'];

type SupabaseFailure = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function getDatabaseError(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const failure = error as SupabaseFailure;
    const details = [failure.message, failure.details, failure.hint, failure.code && `(${failure.code})`].filter(Boolean);
    if (details.length > 0) return details.join(' — ');
  }
  return fallback;
}

export default function StudyRoomsPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<RoomForm>(defaultForm);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [chatMessages, setChatMessages] = useState<RoomMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [messageError, setMessageError] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [timerDuration, setTimerDuration] = useState(1500);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(1500);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [soundMode, setSoundMode] = useState<'off' | 'rain' | 'binaural' | 'hum'>('off');
  const [soundVolume, setSoundVolume] = useState(0.5);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const roomChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const {
    participants,
    remoteStreams,
    localStream,
    micEnabled,
    cameraEnabled,
    mediaError,
    toggleMic,
    toggleCamera,
    cleanup: cleanupCall,
  } = useStudyRoomCall({
    roomId: selectedRoom?.id || null,
    userId: user?.id || null,
    profileName: profile?.full_name || user?.email || 'طالب مسار',
    localVideoRef,
  });

  const refreshRooms = useCallback(async () => {
    const { data: roomData, error: roomError } = await supabase
      .from('study_rooms')
      .select('id,title,description,mode,capacity,subject_id,creator_id,created_at,study_room_members(user_id)')
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    if (roomError) throw roomError;

    const baseRooms = (roomData || []) as unknown as StudyRoom[];
    if (baseRooms.length === 0) {
      setRooms([]);
      return;
    }

    const subjectIds = [...new Set(baseRooms.flatMap((room) => room.subject_id === null ? [] : [room.subject_id]))];
    const subjectResult = subjectIds.length > 0
      ? await supabase.from('subjects').select('id,name').in('id', subjectIds)
      : { data: [], error: null };
    if (subjectResult.error) throw subjectResult.error;

    const subjectNames = new Map((subjectResult.data || []).map((subject) => [subject.id, subject.name]));
    setRooms(baseRooms.map((room) => ({
      ...room,
      members: room.members || [],
      subjects: room.subject_id && subjectNames.has(room.subject_id)
        ? [{ name: subjectNames.get(room.subject_id)! }]
        : null,
    })));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        setDbLoading(true);
        setError('');

        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('id,name,description')
          .order('id');
        if (subjectError) throw subjectError;
        if (!cancelled) setSubjects(subjectData || []);

        await refreshRooms();
      } catch (loadError) {
        console.error('Study-room directory failed to load:', loadError);
        if (!cancelled) setError(getDatabaseError(loadError, 'تعذر تحميل الغرف'));
      } finally {
        if (!cancelled) setDbLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshRooms, user]);

  const createRoom = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || creating) return;
    const title = form.title.trim();
    if (title.length < 3) { setError('اكتب عنواناً واضحاً للغرفة (3 أحرف على الأقل).'); return; }
    setCreating(true); setError('');
    try {
      const { data: room, error: roomError } = await supabase.from('study_rooms').insert({
        creator_id: user.id,
        subject_id: form.subjectId ? Number(form.subjectId) : null,
        title,
        description: form.description.trim(),
        mode: form.mode,
        capacity: form.capacity,
        is_public: true,
      }).select('id,title,description,mode,capacity,subject_id,creator_id,created_at').single();
      if (roomError) throw roomError;

      const { error: memberError } = await supabase.from('study_room_members').insert({ room_id: room.id, user_id: user.id, role: 'host' });
      if (memberError) console.error('Member insert error:', memberError);

      const selectedSubject = subjects.find((subject) => subject.id === room.subject_id);
      const createdRoom = {
        ...room,
        members: [{ user_id: user.id }],
        subjects: selectedSubject ? [{ name: selectedSubject.name }] : null,
      } as StudyRoom;
      setRooms((current) => [createdRoom, ...current]);
      setForm(defaultForm); setShowCreate(false); setSelectedRoom(createdRoom);
    } catch (createError) {
      console.error('Study room creation failed:', createError);
      setError(getDatabaseError(createError, 'تعذر إنشاء الغرفة'));
    } finally { setCreating(false); }
  };

  const joinRoom = async (room: StudyRoom) => {
    if (!user) return;
    setError('');
    const { error: joinError } = await supabase.rpc('join_study_room', { p_room_id: room.id });
    if (joinError) {
      setError(joinError.message.toLowerCase().includes('full') ? 'الغرفة ممتلئة حالياً.' : 'تعذر الانضمام إلى الغرفة.');
      return;
    }
    setSelectedRoom(room);
  };

  const leaveRoom = async () => {
    if (!user || !selectedRoom) return;
    await cleanupCall();
    await supabase.from('study_room_members').delete().eq('room_id', selectedRoom.id).eq('user_id', user.id);
    setSelectedRoom(null); setChatMessages([]); setTimerActive(false);
    await refreshRooms();
  };

  useEffect(() => {
    if (!selectedRoom || !user) return;
    let cancelled = false;
    const roomId = selectedRoom.id;
    async function loadRoom() {
      const { data: messages } = await supabase.from('room_messages').select('id,message,created_at,users(full_name)').eq('room_id', roomId).order('created_at').limit(100);
      if (!cancelled) setChatMessages((messages || []) as unknown as RoomMessage[]);
    }
    loadRoom();
    const channel = supabase.channel(`room:${selectedRoom.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${selectedRoom.id}` }, (payload) => {
        setChatMessages((current) => current.some((message) => message.id === payload.new.id) ? current : [...current, payload.new as RoomMessage]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_room_members', filter: `room_id=eq.${selectedRoom.id}` }, async () => {
        await loadRoom();
        await refreshRooms();
      })
      .subscribe();
    roomChannelRef.current = channel;
    return () => { cancelled = true; roomChannelRef.current = null; supabase.removeChannel(channel); };
  }, [refreshRooms, selectedRoom, user]);

  useEffect(() => {
    if (!timerActive) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setTimerSecondsLeft((current) => {
      if (current <= 1) { setTimerActive(false); if (user) awardXP(user.id, 30); return 0; }
      return current - 1;
    }), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, user]);

  useEffect(() => () => { focusAudio.stopFocusSound(); }, []);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !selectedRoom) return;
    const message = messageInput.trim().slice(0, 1000);
    if (!message) return;
    setMessageInput(''); setMessageError('');
    const { error: sendError } = await supabase.from('room_messages').insert({
      room_id: selectedRoom.id,
      user_id: user.id,
      message,
    });
    if (sendError) { setMessageInput(message); setMessageError('تعذر إرسال الرسالة. تأكد أنك ما زلت داخل الغرفة.'); }
  };

  const selectTimer = (duration: number) => { setTimerActive(false); setTimerDuration(duration); setTimerSecondsLeft(duration); };
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  if (loading || dbLoading) return <SidebarLayout role={profile?.role} signOut={signOut}><div className="p-8"><DashboardSkeleton /></div></SidebarLayout>;

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <main className="mx-auto w-full max-w-[1240px] space-y-7 bg-dot-pattern py-4 text-right" dir="rtl">
        <header className="flex flex-col gap-5 border-b-2 border-[#282825] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="app-chip border-2 border-[#282825] bg-[#ffd64d] font-black shadow-[2.5px_2.5px_0_#282825]"><Radio className="h-4 w-4 text-[#ff5636]" /> غرف النقاش المباشر</span>
            <h1 className="mt-3 text-3xl font-black text-[#282825] sm:text-5xl">ذاكر مع أشخاص يفهمون هدفك</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-[#5f5f59]">أنشئ غرفة لموضوع محدد، ناقش بهدوء، واستخدم الصوت أو الفيديو عندما تحتاج إلى شرح أسرع.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="app-button flex items-center justify-center gap-2 border-2 border-[#282825] bg-[#ff5636] px-5 py-3 text-sm font-black text-white shadow-[3px_3px_0_#282825]"><Plus className="h-5 w-5" /> إنشاء غرفة</button>
        </header>

        {error && <div role="alert" className="flex items-center justify-between rounded-2xl border-2 border-[#ff5636] bg-[#fff0ed] p-4 text-sm font-bold text-[#9f2413]"><span>{error}</span><button aria-label="إغلاق التنبيه" onClick={() => setError('')}><X className="h-5 w-5" /></button></div>}

        {!selectedRoom ? (
          <section className="space-y-5">
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-[#282825] bg-white p-5 shadow-[4px_4px_0_#282825] sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black">الغرف المفتوحة الآن</h2><p className="mt-1 text-xs font-bold text-[#5f5f59]">حتى ٨ أشخاص في الغرفة الواحدة لتبقى المحادثة واضحة وسريعة.</p></div><span className="app-chip border border-[#282825] bg-[#bce9fa] text-xs font-black shadow-[1.5px_1.5px_0_#282825]">{rooms.length} غرفة</span></div>
            {rooms.length === 0 ? <div className="rounded-2xl border-2 border-dashed border-[#282825] bg-white p-12 text-center"><Users className="mx-auto h-12 w-12 text-[#ff5636]" /><h3 className="mt-4 text-2xl font-black">ابدأ أول جلسة نقاش</h3><p className="mt-2 text-sm font-semibold text-[#5f5f59]">لا توجد غرف عامة حالياً. أنشئ غرفة ودع زملاءك ينضمون.</p></div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{rooms.map((room, index) => { const memberCount = room.members?.length || 0; return <article key={room.id} className={`flex min-h-[245px] flex-col justify-between rounded-2xl border-2 border-[#282825] p-6 shadow-[4px_4px_0_#282825] ${cardBgs[index % cardBgs.length]}`}><div><div className="flex items-center justify-between gap-3"><span className="rounded-full border border-[#282825] bg-white px-3 py-1 text-[11px] font-black">{room.mode === 'voice' ? 'صوت فقط' : room.mode === 'video' ? 'فيديو' : 'صوت + فيديو'}</span><span className="flex items-center gap-1 text-xs font-black"><Users className="h-4 w-4" /> {memberCount}/{room.capacity}</span></div><h3 className="mt-5 text-2xl font-black">{room.title}</h3>{room.subjects?.[0]?.name && <p className="mt-1 text-xs font-black text-[#ff5636]">{room.subjects[0].name}</p>}<p className="mt-3 line-clamp-3 text-sm font-semibold leading-relaxed text-[#4a4a44]">{room.description || 'نقاش تعليمي مفتوح مع زملاء مسار.'}</p></div><button onClick={() => joinRoom(room)} disabled={memberCount >= room.capacity && !room.members?.some((member) => member.user_id === user?.id)} className="app-button mt-5 flex items-center justify-center gap-2 border-2 border-[#282825] bg-[#ff5636] py-3 text-xs font-black text-white shadow-[2px_2px_0_#282825] disabled:cursor-not-allowed disabled:bg-[#999]"><ArrowRight className="h-4 w-4" /> {room.members?.some((member) => member.user_id === user?.id) ? 'متابعة الدخول' : memberCount >= room.capacity ? 'الغرفة ممتلئة' : 'انضم الآن'}</button></article>; })}</div>}
            <div className="rounded-2xl border-2 border-[#282825] bg-[#282825] p-5 text-white shadow-[4px_4px_0_#ff5636]"><div className="flex items-start gap-3"><Headphones className="mt-1 h-5 w-5 shrink-0 text-[#ffd64d]" /><div><h3 className="font-black">إرشاد سريع للجلسة</h3><p className="mt-1 text-sm font-semibold leading-relaxed text-white/75">استخدم سماعة لتقليل الصدى، وفعّل الكاميرا فقط عندما تحتاجها. غرف الفيديو تعمل بنظام اتصال مباشر ومناسبة للمجموعات الصغيرة.</p></div></div></div>
          </section>
        ) : <ActiveRoom room={selectedRoom} userId={user?.id || ''} profileName={profile?.full_name || user?.email || 'طالب مسار'} members={participants} remoteStreams={remoteStreams} localStream={localStream} chatMessages={chatMessages} messageInput={messageInput} setMessageInput={setMessageInput} sendMessage={sendMessage} messageError={messageError} chatEndRef={chatEndRef} leaveRoom={leaveRoom} timerDuration={timerDuration} timerSecondsLeft={timerSecondsLeft} timerActive={timerActive} setTimerActive={setTimerActive} selectTimer={selectTimer} formatTime={formatTime} soundMode={soundMode} soundVolume={soundVolume} setSoundVolume={setSoundVolume} setSoundMode={setSoundMode} micEnabled={micEnabled} cameraEnabled={cameraEnabled} toggleMic={toggleMic} toggleCamera={toggleCamera} localVideoRef={localVideoRef} mediaError={mediaError} />}

        {showCreate && <CreateRoomModal form={form} setForm={setForm} onSubmit={createRoom} onClose={() => setShowCreate(false)} creating={creating} subjects={subjects} />}
      </main>
    </SidebarLayout>
  );
}

function LocalVideoCard({ localVideoRef, cameraEnabled, profileName, localStream }: { localVideoRef: React.RefObject<HTMLVideoElement | null>; cameraEnabled: boolean; profileName: string; localStream: MediaStream | null }) {
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      void localVideoRef.current.play().catch(() => undefined);
    }
  }, [cameraEnabled, localStream, localVideoRef]);

  return (
    <div className="relative min-h-56 overflow-hidden rounded-2xl border-2 border-[#282825] bg-[#282825] shadow-[4px_4px_0_#ff5636]">
      <video
        ref={localVideoRef}
        muted
        playsInline
        className={`h-full min-h-56 w-full object-cover ${cameraEnabled ? 'block' : 'hidden'}`}
      />
      {!cameraEnabled && (
        <div className="flex min-h-56 flex-col items-center justify-center text-white">
          <UserRound className="h-12 w-12 text-[#ffd64d]" />
          <p className="mt-2 font-black">{profileName}</p>
          <span className="mt-1 text-xs font-semibold text-white/60">أنت</span>
        </div>
      )}
      <span className="absolute bottom-3 right-3 rounded-full bg-[#282825]/85 px-3 py-1 text-xs font-black text-white">أنت</span>
    </div>
  );
}

function RemoteVideo({ stream, name }: { stream: MediaStream; name: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => undefined);
    }
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      void audioRef.current.play().catch(() => undefined);
    }
  }, [stream]);

  return (
    <div className="relative min-h-56 overflow-hidden rounded-2xl border-2 border-[#282825] bg-[#282825] shadow-[4px_4px_0_#d8bcff]">
      <audio ref={audioRef} autoPlay playsInline controls={false} />
      <video ref={videoRef} autoPlay muted={false} playsInline className="h-full min-h-56 w-full object-cover" />
      <span className="absolute bottom-3 right-3 rounded-full bg-[#282825]/85 px-3 py-1 text-xs font-black text-white">{name}</span>
    </div>
  );
}

interface RoomMessage { id: number; message: string; created_at: string; users?: { full_name: string }[] | null; }

function CreateRoomModal({ form, setForm, onSubmit, onClose, creating, subjects }: { form: RoomForm; setForm: React.Dispatch<React.SetStateAction<RoomForm>>; onSubmit: (event: FormEvent) => void; onClose: () => void; creating: boolean; subjects: Subject[] }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#282825]/60 p-4" role="dialog" aria-modal="true" aria-labelledby="create-room-title"><form onSubmit={onSubmit} className="w-full max-w-xl rounded-2xl border-2 border-[#282825] bg-[#fafaf7] p-6 text-right shadow-[7px_7px_0_#282825]" dir="rtl"><div className="flex items-center justify-between"><h2 id="create-room-title" className="text-2xl font-black">إنشاء غرفة نقاش</h2><button type="button" aria-label="إغلاق" onClick={onClose}><X /></button></div><label className="mt-5 block text-sm font-black">اسم الغرفة<input required minLength={3} maxLength={80} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="mt-2 w-full rounded-xl border-2 border-[#282825] bg-white p-3 font-semibold outline-none focus:border-[#ff5636]" placeholder="مثلاً: مراجعة قوانين نيوتن" /></label><label className="mt-4 block text-sm font-black">الوصف<textarea maxLength={500} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-2 min-h-24 w-full rounded-xl border-2 border-[#282825] bg-white p-3 font-semibold outline-none focus:border-[#ff5636]" placeholder="ما الذي ستناقشونه؟" /></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-black">المادة<select value={form.subjectId} onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))} className="mt-2 w-full rounded-xl border-2 border-[#282825] bg-white p-3 font-semibold"><option value="">بدون مادة محددة</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label className="text-sm font-black">السعة<select value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border-2 border-[#282825] bg-white p-3 font-semibold"><option value={2}>شخصان</option><option value={4}>٤ أشخاص</option><option value={6}>٦ أشخاص</option><option value={8}>٨ أشخاص</option></select></label></div><fieldset className="mt-4"><legend className="text-sm font-black">نوع الغرفة</legend><div className="mt-2 grid grid-cols-3 gap-2">{(['voice', 'video', 'both'] as RoomMode[]).map((mode) => <button key={mode} type="button" onClick={() => setForm((current) => ({ ...current, mode }))} className={`rounded-xl border-2 border-[#282825] p-3 text-xs font-black ${form.mode === mode ? 'bg-[#ffd64d] shadow-[2px_2px_0_#282825]' : 'bg-white'}`}>{mode === 'voice' ? 'صوت' : mode === 'video' ? 'فيديو' : 'كلاهما'}</button>)}</div></fieldset><div className="mt-6 flex gap-3"><button type="submit" disabled={creating} className="app-button flex-1 border-2 border-[#282825] bg-[#ff5636] p-3 font-black text-white disabled:opacity-60">{creating ? 'جاري الإنشاء…' : 'إنشاء وانضمام'}</button><button type="button" onClick={onClose} className="app-button border-2 border-[#282825] bg-white p-3 font-black">إلغاء</button></div></form></div>;
}

function ActiveRoom({ room, userId, profileName, members, remoteStreams, localStream, chatMessages, messageInput, setMessageInput, sendMessage, messageError, chatEndRef, leaveRoom, timerDuration, timerSecondsLeft, timerActive, setTimerActive, selectTimer, formatTime, soundMode, soundVolume, setSoundVolume, setSoundMode, micEnabled, cameraEnabled, toggleMic, toggleCamera, localVideoRef, mediaError }: { room: StudyRoom; userId: string; profileName: string; members: RoomParticipant[]; remoteStreams: RemoteRoomStream[]; localStream: MediaStream | null; chatMessages: RoomMessage[]; messageInput: string; setMessageInput: (value: string) => void; sendMessage: (event: FormEvent) => void; messageError: string; chatEndRef: React.RefObject<HTMLDivElement | null>; leaveRoom: () => void; timerDuration: number; timerSecondsLeft: number; timerActive: boolean; setTimerActive: (value: boolean) => void; selectTimer: (duration: number) => void; formatTime: (seconds: number) => string; soundMode: 'off' | 'rain' | 'binaural' | 'hum'; soundVolume: number; setSoundVolume: (value: number) => void; setSoundMode: (value: 'off' | 'rain' | 'binaural' | 'hum') => void; micEnabled: boolean; cameraEnabled: boolean; toggleMic: () => void; toggleCamera: () => void; localVideoRef: React.RefObject<HTMLVideoElement | null>; mediaError: string }) {
  const stopSound = () => { focusAudio.stopFocusSound(); setSoundMode('off'); };
  const toggleSound = (mode: 'rain' | 'binaural' | 'hum') => { if (soundMode === mode) stopSound(); else { setSoundMode(mode); focusAudio.startFocusSound(mode, soundVolume); } };
  return <section className="space-y-6"><header className="flex flex-col gap-4 border-b-2 border-[#282825] pb-5 sm:flex-row sm:items-center sm:justify-between"><div><span className="app-chip border-2 border-[#282825] bg-[#bce9fa] font-black"><Radio className="h-4 w-4" /> متصل الآن</span><h2 className="mt-2 text-3xl font-black">{room.title}</h2><p className="mt-1 text-sm font-semibold text-[#5f5f59]">{members.length} من {room.capacity} مشاركين · {room.mode === 'both' ? 'صوت وفيديو' : room.mode === 'voice' ? 'صوت' : 'فيديو'}</p></div><button onClick={leaveRoom} className="app-button flex items-center justify-center gap-2 border-2 border-[#282825] bg-white px-5 py-3 text-sm font-black text-[#ff5636] shadow-[2px_2px_0_#282825]"><X className="h-4 w-4" /> مغادرة الغرفة</button></header><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-6"><div className="grid gap-3 sm:grid-cols-2">{remoteStreams.map((remote) => <RemoteVideo key={remote.userId} stream={remote.stream} name={members.find((member) => member.userId === remote.userId)?.fullName || 'طالب مسار'} />)}<LocalVideoCard localVideoRef={localVideoRef} cameraEnabled={cameraEnabled} profileName={profileName} localStream={localStream} /><div className="rounded-2xl border-2 border-[#282825] bg-white p-4 shadow-[3px_3px_0_#282825]"><h3 className="font-black">المشاركون المتصلون</h3><div className="mt-4 space-y-2">{members.map((member) => <div key={member.userId} className="flex items-center gap-2 rounded-xl bg-[#fafaf7] p-3 text-sm font-bold"><UserRound className="h-4 w-4 text-[#ff5636]" />{member.userId === userId ? `${member.fullName} (أنت)` : member.fullName}<span className={`mr-auto h-2 w-2 rounded-full ${member.isOnline ? 'bg-[#5fae44]' : 'bg-[#999]'}`} /></div>)}</div></div></div><div className="rounded-2xl border-2 border-[#282825] bg-[#ffd64d] p-6 text-center shadow-[4px_4px_0_#282825]"><div className="flex flex-wrap justify-center gap-3"><button onClick={toggleMic} className={`app-button flex items-center gap-2 border-2 border-[#282825] px-4 py-3 text-xs font-black shadow-[2px_2px_0_#282825] ${micEnabled ? 'bg-white' : 'bg-[#ff5636] text-white'}`}>{micEnabled ? <Mic /> : <MicOff />} {micEnabled ? 'الميكروفون يعمل' : 'تشغيل الميكروفون'}</button><button onClick={toggleCamera} className={`app-button flex items-center gap-2 border-2 border-[#282825] px-4 py-3 text-xs font-black shadow-[2px_2px_0_#282825] ${cameraEnabled ? 'bg-white' : 'bg-[#ff5636] text-white'}`}>{cameraEnabled ? <Video /> : <VideoOff />} {cameraEnabled ? 'الكاميرا تعمل' : 'تشغيل الكاميرا'}</button></div>{mediaError && <p role="alert" className="mt-3 text-xs font-bold text-[#9f2413]">{mediaError}</p>}</div><div className="rounded-2xl border-2 border-[#282825] bg-white p-5 shadow-[4px_4px_0_#282825]"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-black"><Brain className="h-5 w-5 text-[#ff5636]" /> مؤقت التركيز</h3><div className="flex gap-2"><button onClick={() => selectTimer(1500)} className={`rounded-lg border-2 border-[#282825] px-2 py-1 text-[10px] font-black ${timerDuration === 1500 ? 'bg-[#282825] text-white' : 'bg-white'}`}>٢٥د</button><button onClick={() => selectTimer(3000)} className={`rounded-lg border-2 border-[#282825] px-2 py-1 text-[10px] font-black ${timerDuration === 3000 ? 'bg-[#282825] text-white' : 'bg-white'}`}>٥٠د</button></div></div><p className="my-4 text-center font-mono text-5xl font-black">{formatTime(timerSecondsLeft)}</p><div className="flex justify-center gap-2"><button onClick={() => setTimerActive(!timerActive)} className="app-button flex items-center gap-2 border-2 border-[#282825] bg-[#ff5636] px-4 py-2 text-xs font-black text-white shadow-[2px_2px_0_#282825]">{timerActive ? <Pause /> : <Play />} {timerActive ? 'إيقاف' : 'بدء'}</button><button onClick={() => { setTimerActive(false); selectTimer(timerDuration); }} className="app-button flex items-center gap-2 border-2 border-[#282825] bg-white px-4 py-2 text-xs font-black shadow-[2px_2px_0_#282825]"><RotateCcw /> إعادة</button></div></div><div className="rounded-2xl border-2 border-[#282825] bg-white p-5 shadow-[4px_4px_0_#282825]"><h3 className="font-black">أجواء التركيز</h3><div className="mt-3 grid grid-cols-3 gap-2">{([['rain', 'مطر', CloudRain], ['binaural', 'ألفا', Sparkles], ['hum', 'مقهى', Coffee]] as const).map(([mode, label, Icon]) => <button key={mode} onClick={() => toggleSound(mode)} className={`rounded-xl border-2 border-[#282825] p-2 text-xs font-black ${soundMode === mode ? 'bg-[#ffd64d]' : 'bg-white'}`}><Icon className="mx-auto h-4 w-4 text-[#ff5636]" />{label}</button>)}</div><label className="mt-3 block text-xs font-bold">مستوى الصوت<input type="range" min="0" max="1" step="0.05" value={soundVolume} onChange={(event) => { const volume = Number(event.target.value); setSoundVolume(volume); if (soundMode !== 'off') focusAudio.setVolume(volume); }} className="mt-2 w-full accent-[#ff5636]" /></label></div></div><div className="flex min-h-[620px] flex-col rounded-2xl border-2 border-[#282825] bg-white p-5 shadow-[4px_4px_0_#282825]"><h3 className="flex items-center justify-between border-b-2 border-[#282825]/10 pb-3 font-black"><span>نقاش الغرفة</span><MessageSquare className="h-5 w-5 text-[#ff5636]" /></h3><div className="flex-1 space-y-3 overflow-y-auto py-4">{chatMessages.length === 0 && <p className="py-8 text-center text-sm font-semibold text-[#77776f]">ابدأوا النقاش برسالة قصيرة ومحترمة.</p>}{chatMessages.map((message) => <article key={message.id} className="rounded-xl border border-[#282825]/20 bg-[#fafaf7] p-3"><div className="flex items-center justify-between text-[10px] font-black"><span>{message.users?.[0]?.full_name || 'طالب مسار'}</span><time className="font-normal text-[#77776f]">{new Date(message.created_at).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}</time></div><p className="mt-1 text-sm font-semibold leading-relaxed">{message.message}</p></article>)}<div ref={chatEndRef} /></div><form onSubmit={sendMessage} className="flex gap-2 border-t-2 border-[#282825]/10 pt-3"><label className="sr-only" htmlFor="room-message">رسالة الغرفة</label><input id="room-message" maxLength={1000} value={messageInput} onChange={(event) => setMessageInput(event.target.value)} placeholder="شارك فكرة أو سؤالاً…" className="min-w-0 flex-1 rounded-xl border-2 border-[#282825] p-3 text-sm font-semibold outline-none focus:border-[#ff5636]" /><button className="app-button border-2 border-[#282825] bg-[#ff5636] px-4 text-xs font-black text-white shadow-[2px_2px_0_#282825]">إرسال</button></form>{messageError && <p role="alert" className="mt-2 text-xs font-bold text-[#9f2413]">{messageError}</p>}</div></div></section>;
}
