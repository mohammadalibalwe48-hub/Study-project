'use client';

import React, { useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { useAuth } from '@/context/AuthContext';
import LiveRoomCard from '@/components/LiveRoomCard';
import { INITIAL_LIVE_ROOMS, LiveRoom } from '@/data/liveRoomsData';
import { Radio, Plus, Search, Filter, Video, Mic, Sparkles, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SUBJECT_OPTIONS = ['الكل', 'الفيزياء', 'الكيمياء', 'الرياضيات', 'اللغة العربية', 'اللغة الإنكليزية', 'العلوم العامة'];

export default function LiveRoomsLobbyPage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const [rooms, setRooms] = useState<LiveRoom[]>(INITIAL_LIVE_ROOMS);
  const [selectedSubject, setSelectedSubject] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New room form state
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('الفيزياء');
  const [newIsTutorSession, setNewIsTutorSession] = useState(false);
  const [newDescription, setNewDescription] = useState('');

  const filteredRooms = rooms.filter((r) => {
    const matchSubject = selectedSubject === 'الكل' || r.subject === selectedSubject;
    const matchSearch = r.title.includes(searchQuery) || r.description.includes(searchQuery) || r.hostName.includes(searchQuery);
    return matchSubject && matchSearch;
  });

  function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const roomId = `room-${Date.now()}`;
    const newRoomObj: LiveRoom = {
      id: roomId,
      title: newTitle.trim(),
      subject: newSubject,
      hostName: profile?.full_name || 'طالب مسار',
      isTutorSession: newIsTutorSession,
      activeCount: 1,
      maxCount: newIsTutorSession ? 50 : 12,
      tags: ['مباشر الان'],
      description: newDescription.trim() || 'غرفة مذاكرة وبث مباشر جديدة.',
      createdAt: 'الآن',
    };

    setRooms((prev) => [newRoomObj, ...prev]);
    setCreateModalOpen(false);
    router.push(`/live-rooms/${roomId}`);
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="space-y-8" dir="rtl">
        
        {/* Banner Section */}
        <header className="rounded-3xl border-2 border-[#282825] bg-[#ffd64d] p-6 sm:p-8 shadow-[6px_6px_0_#282825] flex flex-col md:flex-row md:items-center justify-between gap-6 text-right">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-[#ff5636] text-white border-2 border-[#282825] shadow-[1.5px_1.5px_0_#282825]">
              <Radio className="w-4 h-4 animate-pulse" />
              <span>غرف البث والدردشة الصوتيّة والمرئية 🎙️📹</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#282825]">
              غرف البث والمذاكرة التفاعلية المباشرة
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#282825]/80 max-w-2xl leading-relaxed">
              انضم لغرف البث الصوتي والمرئي المباشر، شارك ميكروفونك وكاميرتك مع زملائك والمدرسين، واطرح أسئلتك في الوقت الفعلي!
            </p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-6 py-3.5 text-xs font-black shadow-[3px_3px_0_#282825] hover:shadow-[5px_5px_0_#282825] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
            <span>إنشاء غرفة جديدة</span>
          </button>
        </header>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          
          {/* Subject Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {SUBJECT_OPTIONS.map((sub) => (
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
        {filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <LiveRoomCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center rounded-3xl border-2 border-dashed border-[#282825] bg-white p-8 space-y-3">
            <Radio className="w-10 h-10 text-[#ff5636] mx-auto opacity-50" />
            <h3 className="text-base font-black text-[#282825]">لا توجد غرف بث متاحة حالياً بهذه المواصفات</h3>
            <p className="text-xs font-bold text-[#5f5f59]">كن الأول وابدأ غرفة مذاكرة جديدة الآن!</p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="app-button border-2 border-[#282825] bg-[#ffd64d] text-[#282825] px-5 py-2.5 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[3.5px_3.5px_0_#282825] transition-all cursor-pointer inline-flex items-center gap-1.5 mt-2"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              <span>إنشاء غرفة الآن</span>
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
                <h2 className="text-lg font-black text-[#282825]">إنشاء غرفة بث تفاعلية جديدة</h2>
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
                  placeholder="مثال: مراجعة قوانين الفيزياء والنواسات..."
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
                    {SUBJECT_OPTIONS.filter((s) => s !== 'الكل').map((sub) => (
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
                  className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-6 py-2.5 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[3.5px_3.5px_0_#282825] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3px]" />
                  <span>انطلق الآن 🚀</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </SidebarLayout>
  );
}
