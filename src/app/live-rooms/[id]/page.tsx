'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SidebarLayout from '@/components/SidebarLayout';
import { useAuth } from '@/context/AuthContext';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Hand,
  LogOut,
  MessageSquare,
  Users,
  PenTool,
  Send,
  Radio,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Wifi,
} from 'lucide-react';
import { LiveRoom } from '@/data/liveRoomsData';
import { supabase } from '@/utils/supabase/client';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isHost?: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  handRaised: boolean;
}

export default function ActiveLiveRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  // Load real room data from LocalStorage or Supabase
  const [roomData, setRoomData] = useState<LiveRoom>({
    id: id || 'room-live',
    title: 'غرفة البث المباشر والمذاكرة التفاعلية',
    subject: 'المادة الدراسية',
    hostName: profile?.full_name || 'طالب مسار',
    isTutorSession: profile?.role === 'admin',
    activeCount: 1,
    maxCount: 30,
    tags: ['بث مباشر', 'Supabase Realtime'],
    description: 'غرفة مذاكرة صوتية ومرئية تفاعلية حية حقيقية.',
    createdAt: 'الآن',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`masar_room_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.title) setRoomData(parsed);
      }
    } catch {
      // Ignore
    }
  }, [id]);

  // Media States
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'whiteboard'>('chat');
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  // Media Stream References
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Supabase Realtime Channel Reference
  const channelRef = useRef<any>(null);

  // Zero Fake Data: Live Chat State starts empty
  const [chatMessages, setChatMessages] = useState<
    { id: string; sender: string; text: string; time: string; isHost?: boolean }[]
  >([]);
  const [chatInput, setChatInput] = useState('');

  // Whiteboard Notes State
  const [boardNotes, setBoardNotes] = useState(
    `📌 سبورة وملاحظات الجلسة المباشرة (متزامنة لحظياً عبر Supabase Realtime):`
  );

  // Zero Fake Data: Participants list starts with ONLY real connected user
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: user?.id || 'me-local',
      name: profile?.full_name || 'أنت (طالب مسار)',
      isHost: profile?.role === 'admin' || roomData.hostName === profile?.full_name,
      isMuted: !isMicOn,
      isVideoOn: isCamOn,
      handRaised: handRaised,
    },
  ]);

  // 1. Supabase Realtime Integration (Presence & Broadcast)
  useEffect(() => {
    const roomIdStr = id || 'global-room';
    const channel = supabase.channel(`live_room_${roomIdStr}`, {
      config: {
        presence: { key: user?.id || `anon-${Math.random()}` },
        broadcast: { self: false },
      },
    });

    channelRef.current = channel;

    // Presence Sync Handler: Updates real connected participants
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      const onlineUsers: Participant[] = [];

      Object.keys(presenceState).forEach((key) => {
        const presences = presenceState[key] as any[];
        if (presences && presences.length > 0) {
          const info = presences[0];
          onlineUsers.push({
            id: key,
            name: info.full_name || 'طالب مسار',
            isHost: info.isHost || false,
            isMuted: info.isMuted ?? false,
            isVideoOn: info.isVideoOn ?? true,
            handRaised: info.handRaised ?? false,
          });
        }
      });

      if (onlineUsers.length > 0) {
        setParticipants(onlineUsers);
      }
    });

    // Broadcast Handlers (Chat, State, Whiteboard)
    channel.on('broadcast', { event: 'chat_message' }, (payload) => {
      if (payload?.payload) {
        setChatMessages((prev) => [...prev, payload.payload]);
      }
    });

    channel.on('broadcast', { event: 'whiteboard_update' }, (payload) => {
      if (payload?.payload?.text !== undefined) {
        setBoardNotes(payload.payload.text);
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsSupabaseConnected(true);
        channel.track({
          full_name: profile?.full_name || 'طالب مسار',
          isHost: profile?.role === 'admin' || roomData.hostName === profile?.full_name,
          isMuted: !isMicOn,
          isVideoOn: isCamOn,
          handRaised: handRaised,
        });
      }
    });

    // Load actual messages from Supabase Database
    async function loadSupabaseRoomMessages() {
      try {
        const { data, error } = await supabase
          .from('room_messages')
          .select('id, message, created_at, users(full_name)')
          .order('created_at', { ascending: true })
          .limit(30);

        if (!error && data && data.length > 0) {
          const formatted = data.map((m: any) => ({
            id: String(m.id),
            sender: m.users?.full_name || 'طالب مسار',
            text: m.message,
            time: new Date(m.created_at).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }),
          }));
          setChatMessages(formatted);
        }
      } catch (err) {
        console.warn('Supabase DB messages query:', err);
      }
    }

    loadSupabaseRoomMessages();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user, profile, roomData.hostName]);

  // 2. Sync Local State Changes to Supabase Presence
  useEffect(() => {
    if (channelRef.current && isSupabaseConnected) {
      channelRef.current.track({
        full_name: profile?.full_name || 'طالب مسار',
        isHost: profile?.role === 'admin' || roomData.hostName === profile?.full_name,
        isMuted: !isMicOn,
        isVideoOn: isCamOn,
        handRaised: handRaised,
      });
    }
  }, [isMicOn, isCamOn, handRaised, isSupabaseConnected, profile, roomData.hostName]);

  // 3. WebRTC Camera & Microphone Access
  useEffect(() => {
    async function startCamera() {
      try {
        setMediaError(null);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera/Mic access info:', err);
        setMediaError('لم يتم تفعيل الكاميرا أو الميكروفون حالياً، يمكنك المتابعة بالمحادثة والكتابة مباشرة.');
        setIsCamOn(false);
      }
    }

    startCamera();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Handle Mute/Unmute
  function toggleMic() {
    setIsMicOn((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = next));
      }
      return next;
    });
  }

  // Handle Camera Toggle
  function toggleCam() {
    setIsCamOn((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = next));
      }
      return next;
    });
  }

  // Handle Screen Share Toggle
  async function toggleScreenShare() {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);

        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } catch (err) {
        console.warn('Screen sharing info:', err);
      }
    }
  }

  // Send Chat Message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: Date.now().toString(),
      sender: profile?.full_name || 'أنت (طالب مسار)',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    // Broadcast via Supabase Realtime
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: newMsg,
      });
    }

    // Persist to Supabase Database
    try {
      if (user?.id) {
        await supabase.from('room_messages').insert({
          message: newMsg.text,
          user_id: user.id,
          subject_id: 1,
        });
      }
    } catch (err) {
      console.warn('Supabase DB save info:', err);
    }
  }

  // Whiteboard Change Broadcast
  function handleWhiteboardChange(val: string) {
    setBoardNotes(val);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'whiteboard_update',
        payload: { text: val },
      });
    }
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="space-y-6 text-right" dir="rtl">
        
        {/* Room Header Top Bar */}
        <div className="rounded-2xl border-2 border-[#282825] bg-white p-4 shadow-[4px_4px_0_#282825] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#282825] bg-[#ff5636] text-white shadow-[1.5px_1.5px_0_#282825]">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-black text-[#282825]">{roomData.title}</h1>
              <p className="text-xs font-bold text-[#5f5f59]">
                مادة {roomData.subject} • المضيف: {roomData.hostName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-[#cce6b4] text-[#15803d] border-2 border-[#282825] shadow-[1.5px_1.5px_0_#282825]">
              <Wifi className="w-3.5 h-3.5 text-[#15803d] animate-pulse" />
              <span>Supabase Realtime ({participants.length} متصل)</span>
            </span>

            <button
              onClick={() => router.push('/live-rooms')}
              className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-4 py-1.5 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[3.5px_3.5px_0_#282825] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>مغادرة الغرفة</span>
            </button>
          </div>
        </div>

        {/* Permission Alert Error */}
        {mediaError && (
          <div className="rounded-xl border-2 border-[#282825] bg-[#ffd64d]/40 p-3.5 text-xs font-bold text-[#282825] flex items-center gap-2 shadow-[2px_2px_0_#282825]">
            <AlertCircle className="w-4 h-4 text-[#ff5636] shrink-0" />
            <span>{mediaError}</span>
          </div>
        )}

        {/* Main Grid: Video Gallery & Sidebar Chat/Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* VIDEO GALLERY (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Screen Share View or Camera Feed */}
            {isScreenSharing ? (
              <div className="relative rounded-3xl border-2 border-[#282825] bg-black overflow-hidden shadow-[6px_6px_0_#282825] aspect-video flex items-center justify-center">
                <video ref={screenVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
                <span className="absolute top-3 right-3 bg-[#ff5636] text-white text-xs font-black px-3 py-1 rounded-xl border border-white shadow-md">
                  🖥️ يتم مشاركة الشاشة الآن
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Local User Video Feed */}
                <div className="relative rounded-3xl border-2 border-[#282825] bg-[#282825] overflow-hidden shadow-[4px_4px_0_#282825] aspect-video flex items-center justify-center">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isCamOn ? 'hidden' : ''}`}
                  />
                  {!isCamOn && (
                    <div className="text-center text-white space-y-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ff5636] mx-auto text-lg font-black border-2 border-white">
                        {profile?.full_name?.charAt(0) || 'أ'}
                      </div>
                      <span className="text-xs font-bold block">{profile?.full_name || 'أنت'} (الكاميرا مغلقة)</span>
                    </div>
                  )}

                  {/* Status Overlay Badge */}
                  <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between pointer-events-none">
                    <span className="bg-black/70 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-xl border border-white/20">
                      أنت ({profile?.full_name || 'طالب'})
                    </span>

                    <div className="flex items-center gap-1.5">
                      {handRaised && (
                        <span className="bg-[#ffd64d] text-[#282825] p-1 rounded-lg border border-[#282825] animate-bounce">
                          ✋
                        </span>
                      )}
                      <span className={`p-1.5 rounded-lg border border-white ${isMicOn ? 'bg-[#cce6b4] text-[#15803d]' : 'bg-[#ff5636] text-white'}`}>
                        {isMicOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Host Video Stream / Placeholder */}
                <div className="relative rounded-3xl border-2 border-[#282825] bg-[#1e293b] overflow-hidden shadow-[4px_4px_0_#282825] aspect-video flex items-center justify-center">
                  <div className="text-center text-white space-y-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ffd64d] text-[#282825] mx-auto text-xl font-black border-2 border-[#282825]">
                      {roomData.hostName.charAt(0)}
                    </div>
                    <span className="text-xs font-black block text-[#ffd64d]">{roomData.hostName}</span>
                    <span className="text-[10px] font-bold bg-[#cce6b4] text-[#15803d] px-2 py-0.5 rounded-md border border-[#282825] inline-block">
                      🎙️ متصل في البث
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between pointer-events-none">
                    <span className="bg-black/70 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-xl border border-white/20 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#ffd64d]" /> {roomData.hostName}
                    </span>
                    <span className="p-1.5 rounded-lg bg-[#cce6b4] text-[#15803d] border border-white">
                      <Mic className="w-3 h-3" />
                    </span>
                  </div>
                </div>

              </div>
            )}

            {/* INTERACTIVE VOICE & VIDEO CONTROL BAR */}
            <div className="rounded-2xl border-2 border-[#282825] bg-[#ffd64d] p-4 shadow-[4px_4px_0_#282825] flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
              
              {/* Toggle Microphone */}
              <button
                onClick={toggleMic}
                className={`app-button border-2 border-[#282825] px-4 py-2.5 rounded-xl text-xs font-black shadow-[2px_2px_0_#282825] flex items-center gap-2 cursor-pointer transition-all ${
                  isMicOn ? 'bg-[#cce6b4] text-[#15803d]' : 'bg-[#ff5636] text-white'
                }`}
              >
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                <span>{isMicOn ? 'الميكروفون يعمل' : 'الميكروفون مكتوم'}</span>
              </button>

              {/* Toggle Camera */}
              <button
                onClick={toggleCam}
                className={`app-button border-2 border-[#282825] px-4 py-2.5 rounded-xl text-xs font-black shadow-[2px_2px_0_#282825] flex items-center gap-2 cursor-pointer transition-all ${
                  isCamOn ? 'bg-[#bce9fa] text-[#282825]' : 'bg-[#282825] text-white'
                }`}
              >
                {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                <span>{isCamOn ? 'الكاميرا تشغّل' : 'الكاميرا مغلقة'}</span>
              </button>

              {/* Screen Share */}
              <button
                onClick={toggleScreenShare}
                className={`app-button border-2 border-[#282825] px-4 py-2.5 rounded-xl text-xs font-black shadow-[2px_2px_0_#282825] flex items-center gap-2 cursor-pointer transition-all ${
                  isScreenSharing ? 'bg-[#ff5636] text-white' : 'bg-white text-[#282825]'
                }`}
              >
                <MonitorUp className="w-4 h-4" />
                <span>{isScreenSharing ? 'إيقاف الشاشة' : 'مشاركة الشاشة'}</span>
              </button>

              {/* Hand Raise */}
              <button
                onClick={() => setHandRaised(!handRaised)}
                className={`app-button border-2 border-[#282825] px-4 py-2.5 rounded-xl text-xs font-black shadow-[2px_2px_0_#282825] flex items-center gap-2 cursor-pointer transition-all ${
                  handRaised ? 'bg-[#dcbcff] text-[#282825]' : 'bg-white text-[#282825]'
                }`}
              >
                <Hand className="w-4 h-4" />
                <span>{handRaised ? 'تم رفع اليد ✋' : 'رفع اليد'}</span>
              </button>

            </div>

          </div>

          {/* SIDEBAR TABS: CHAT / PARTICIPANTS / NOTES (1 Column) */}
          <div className="rounded-3xl border-2 border-[#282825] bg-white p-5 shadow-[5px_5px_0_#282825] space-y-4 flex flex-col h-[520px]">
            
            {/* Tab Selectors */}
            <div className="grid grid-cols-3 gap-1.5 bg-[#fafaf7] p-1.5 rounded-2xl border-2 border-[#282825]">
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-1.5 text-xs font-black rounded-xl border transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'chat' ? 'bg-[#282825] text-white border-[#282825]' : 'border-transparent text-[#5f5f59]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>الدردشة</span>
              </button>

              <button
                onClick={() => setActiveTab('participants')}
                className={`py-1.5 text-xs font-black rounded-xl border transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'participants' ? 'bg-[#282825] text-white border-[#282825]' : 'border-transparent text-[#5f5f59]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>المشاركون ({participants.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('whiteboard')}
                className={`py-1.5 text-xs font-black rounded-xl border transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'whiteboard' ? 'bg-[#282825] text-white border-[#282825]' : 'border-transparent text-[#5f5f59]'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>السبورة</span>
              </button>
            </div>

            {/* TAB CONTENT: CHAT */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-3 p-1">
                  {chatMessages.length > 0 ? (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="space-y-1 text-xs font-semibold">
                        <div className="flex items-center justify-between text-[10px] text-[#77776f]">
                          <span className="font-black text-[#282825]">{msg.sender}</span>
                          <span>{msg.time}</span>
                        </div>
                        <div className={`p-3 rounded-xl border border-[#282825] leading-relaxed ${
                          msg.isHost ? 'bg-[#ffd64d]/40 text-[#282825] font-bold' : 'bg-[#fafaf7] text-[#282825]'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-xs font-bold text-[#77776f]">
                      لا توجد رسائل حالياً. كن الأول واكتب رسالة للبث 💬
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="pt-3 border-t-2 border-[#282825]/10 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="اكتب رسالة لحظية عبر Supabase..."
                    className="w-full rounded-xl border-2 border-[#282825] bg-[#fafaf7] p-2.5 text-xs font-semibold placeholder-[#77776f] focus:outline-none focus:border-[#ff5636]"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-4 py-2.5 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[3px_3px_0_#282825] transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB CONTENT: PARTICIPANTS */}
            {activeTab === 'participants' && (
              <div className="flex-1 overflow-y-auto space-y-2 p-1">
                {participants.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl border-2 border-[#282825] bg-[#fafaf7] flex items-center justify-between text-xs font-bold shadow-[2px_2px_0_#282825]">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffd64d] text-[#282825] font-black border border-[#282825]">
                        {p.name.charAt(0)}
                      </span>
                      <span>{p.name}</span>
                      {p.isHost && (
                        <span className="text-[10px] font-black text-[#ff5636] bg-[#ff5636]/10 px-2 py-0.5 rounded-md border border-[#ff5636]">
                          مضيف
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {p.handRaised && <span className="text-sm">✋</span>}
                      <span className={`p-1 rounded-lg border ${p.isMuted ? 'bg-[#ff5636] text-white' : 'bg-[#cce6b4] text-[#15803d]'}`}>
                        {p.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT: WHITEBOARD & NOTES */}
            {activeTab === 'whiteboard' && (
              <div className="flex-1 flex flex-col space-y-2">
                <span className="text-xs font-black text-[#282825] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#ff5636]" /> سبورة وملاحظات الجلسة (مزامنة Supabase)
                </span>
                <textarea
                  rows={15}
                  value={boardNotes}
                  onChange={(e) => handleWhiteboardChange(e.target.value)}
                  placeholder="اكتب ملاحظات الجلسة وتتزامن مع الجميع مباشرة..."
                  className="w-full flex-1 rounded-2xl border-2 border-[#282825] bg-[#bce9fa]/20 p-4 text-xs font-semibold text-[#282825] leading-relaxed shadow-[2.5px_2.5px_0_#282825] focus:outline-none"
                />
              </div>
            )}

          </div>

        </div>

      </div>
    </SidebarLayout>
  );
}
