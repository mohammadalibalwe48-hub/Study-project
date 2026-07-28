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
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { INITIAL_LIVE_ROOMS, LiveRoom } from '@/data/liveRoomsData';

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
  const { profile, signOut } = useAuth();

  // Find room details from dataset or fallback
  const roomData: LiveRoom = INITIAL_LIVE_ROOMS.find((r) => r.id === id) || {
    id: id || 'custom-room',
    title: 'غرفة البث المباشر والمذاكرة التفاعلية',
    subject: 'الفيزياء والرياضيات',
    hostName: profile?.full_name || 'أحمد الطالب',
    isTutorSession: true,
    activeCount: 5,
    maxCount: 30,
    tags: ['بث مباشر', 'تفاعلي'],
    description: 'غرفة بث وم مذاكرة تفاعلية سريعة لطلاب البكالوريا السورية.',
    createdAt: 'الآن',
  };

  // Media States
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'whiteboard'>('chat');

  // Media Stream References
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Live Chat State
  const [chatMessages, setChatMessages] = useState<
    { id: string; sender: string; text: string; time: string; isHost?: boolean }[]
  >([
    {
      id: '1',
      sender: 'أ. عصام الحلاق',
      text: 'أهلاً بكم يا أبطال في البث المباشر! اكتبوا أي سؤال تريدون مناقشته في الشات 🎙️',
      time: '10:00 ص',
      isHost: true,
    },
    {
      id: '2',
      sender: 'خالد (علمي)',
      text: 'استاذ ممكن نعيد القانون الرئيسي في المسألة الثانية؟',
      time: '10:02 ص',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Whiteboard Notes State
  const [boardNotes, setBoardNotes] = useState(
    `📌 ملاحظات الجلسة المباشرة:\n1. قانون النواس الثقيل: T_0 = 2\\pi \\sqrt{\\dfrac{I_{\\Delta}}{m \\cdot g \\cdot d}}\n2. انتبه لحساب العزم I_{\\Delta} بالوحدات الدولية (kg.m^2)`
  );

  // Participants Mock State
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: 'user-me',
      name: profile?.full_name || 'أنت (طالب مسار)',
      isHost: false,
      isMuted: !isMicOn,
      isVideoOn: isCamOn,
      handRaised: handRaised,
    },
    {
      id: 'host-1',
      name: roomData.hostName,
      isHost: true,
      isMuted: false,
      isVideoOn: true,
      handRaised: false,
    },
    {
      id: 'student-2',
      name: 'سامي الجراح (علمي)',
      isHost: false,
      isMuted: true,
      isVideoOn: true,
      handRaised: true,
    },
    {
      id: 'student-3',
      name: 'نور الهدى (أدبي)',
      isHost: false,
      isMuted: true,
      isVideoOn: false,
      handRaised: false,
    },
  ]);

  // Handle Local WebRTC Camera & Microphone Access
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
        console.warn('Camera/Mic permission denied or not available:', err);
        setMediaError('لم يتم منح الإذن للكاميرا أو الميكروفون، يمكنك المتابعة بالصوت أو النص.');
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
        console.warn('Screen sharing cancelled:', err);
      }
    }
  }

  // Send Chat Message
  function handleSendMessage(e: React.FormEvent) {
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
              <Users className="w-3.5 h-3.5" />
              <span>{participants.length} مشارك متصل</span>
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

        {/* Main Grid: Video Gallery (Left) & Sidebar Chat/Notes (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* VIDEO GALLERY (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Screen Share View or Featured Video */}
            {isScreenSharing ? (
              <div className="relative rounded-3xl border-2 border-[#282825] bg-black overflow-hidden shadow-[6px_6px_0_#282825] aspect-video flex items-center justify-center">
                <video ref={screenVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
                <span className="absolute top-3 right-3 bg-[#ff5636] text-white text-xs font-black px-3 py-1 rounded-xl border border-white shadow-md">
                  🖥️ يتم مشاركة الشاشة الآن
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Local User Camera Feed */}
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

                {/* Host Featured Video Feed */}
                <div className="relative rounded-3xl border-2 border-[#282825] bg-[#1e293b] overflow-hidden shadow-[4px_4px_0_#282825] aspect-video flex items-center justify-center">
                  <div className="text-center text-white space-y-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ffd64d] text-[#282825] mx-auto text-xl font-black border-2 border-[#282825]">
                      {roomData.hostName.charAt(0)}
                    </div>
                    <span className="text-xs font-black block text-[#ffd64d]">{roomData.hostName} (المضيف)</span>
                    <span className="text-[10px] font-bold bg-[#cce6b4] text-[#15803d] px-2 py-0.5 rounded-md border border-[#282825] inline-block">
                      🎙️ يتحدث الآن...
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
                <span>المشاركون</span>
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
                  {chatMessages.map((msg) => (
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
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="pt-3 border-t-2 border-[#282825]/10 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="اكتب رسالة للبث..."
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
                  <Sparkles className="w-4 h-4 text-[#ff5636]" /> سبورة وملاحظات الجلسة المباشرة
                </span>
                <textarea
                  rows={15}
                  value={boardNotes}
                  onChange={(e) => setBoardNotes(e.target.value)}
                  placeholder="اكتب قوانين وملاحظات الجلسة هنا..."
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
