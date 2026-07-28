'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { MessageSquare, Search, Award, Star, UserCheck } from 'lucide-react';

interface Mentor {
  id: number;
  name: string;
  subject: string;
  avatar: string;
  bio: string;
  whatsapp: string;
  experience: string;
  rating: number;
  reviews_count: number;
}

export default function MentorsPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    async function fetchMentors() {
      try {
        setDbLoading(true);
        const { data, error } = await supabase
          .from('mentors')
          .select('*')
          .order('id', { ascending: true });

        if (error) throw error;
        setMentors(data || []);
      } catch (err) {
        console.error('Error fetching mentors:', err);
      } finally {
        setDbLoading(false);
      }
    }
    fetchMentors();
  }, []);

  const filteredMentors = mentors.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.bio.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cardThemes = [
    'bg-[#ffdc72] neo-shadow-interactive-yellow',
    'bg-[#bce9fa] neo-shadow-interactive-blue',
    'bg-[#d8bcff] neo-shadow-interactive-purple',
    'bg-[#cce6b4] neo-shadow-interactive-coral',
  ];

  const content = (
    <div className="mx-auto w-full max-w-[1180px] space-y-8 text-right bg-dot-pattern py-4">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b-2 border-[#282825] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <span className="app-chip bg-[#ffd64d] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
            <UserCheck className="h-4 w-4 text-[#ff5636]" /> نخبة من معلمي سوريا
          </span>
          <h1 className="mt-2 text-3xl font-black sm:text-5xl text-[#282825]">
            المدرسون المعتمدون
          </h1>
          <p className="text-[#5f5f59] text-sm max-w-xl leading-relaxed font-semibold">
            تواصل مباشرة مع أفضل المدرسين المعتمدين لمتابعة استفساراتك وحجز جلسات المراجعة.
          </p>
        </div>

        {!user && (
          <Link
            href="/auth"
            className="app-button border-2 border-[#282825] bg-[#ff5636] text-white shadow-[3px_3px_0_#282825] hover:shadow-[5px_5px_0_#282825] hover:-translate-y-0.5 transition-all text-xs font-black px-6 py-2.5"
          >
            تسجيل الدخول
          </Link>
        )}
      </div>

      {/* Search Filter */}
      <div className="rounded-2xl border-2 border-[#282825] bg-white p-5 shadow-[4px_4px_0_#282825]">
        <div className="relative w-full flex items-center">
          <Search className="absolute right-4 h-4 w-4 text-[#282825] z-10" />
          <input
            type="text"
            placeholder="ابحث باسم المدرس أو المادة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="app-input w-full text-right pr-11 pl-4 text-sm border-2 border-[#282825] shadow-[2px_2px_0_#282825] focus:shadow-[4px_4px_0_#282825]"
          />
        </div>
      </div>

      {/* Mentors Cards Grid */}
      {dbLoading ? (
        <div className="py-20 text-center space-y-4">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#282825] border-t-[#ff5636]"></div>
          <p className="text-[#5f5f59] text-sm font-black">جاري تحميل كادر الأساتذة...</p>
        </div>
      ) : filteredMentors.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#282825] bg-white p-16 text-center text-[#5f5f59] text-sm font-black shadow-[4px_4px_0_#282825]">
          لم يتم العثور على مدرسين يطابقون خيارات البحث.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMentors.map((mentor, index) => {
            const cardBg = cardThemes[index % cardThemes.length];

            return (
              <div
                key={mentor.id}
                className={`rounded-2xl border-2 border-[#282825] p-6 flex flex-col justify-between transition-all group hover:scale-[1.02] ${cardBg}`}
              >
                <div className="text-right space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="app-chip bg-white border border-[#282825] px-3 py-1 text-[11px] font-black shadow-[1.5px_1.5px_0_#282825]">
                      مدرس {mentor.subject}
                    </span>
                    <span className="app-chip bg-white border border-[#282825] px-2.5 py-0.5 text-xs font-black text-[#282825] shadow-[1.5px_1.5px_0_#282825] flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#ffd64d] text-[#282825]" /> {mentor.rating} ({mentor.reviews_count})
                    </span>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div className="w-16 h-16 rounded-2xl border-2 border-[#282825] overflow-hidden relative shrink-0 shadow-[2px_2px_0_#282825] bg-white">
                      <img src={mentor.avatar} alt={mentor.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-[#282825] group-hover:text-[#ff5636] transition-colors leading-snug">
                        {mentor.name}
                      </h3>
                      <p className="text-xs font-bold text-[#282825]/70">خبرة {mentor.experience}</p>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-[#282825] bg-white/80 p-4 rounded-xl border border-[#282825]/20 leading-relaxed">
                    {mentor.bio}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#282825]/15 flex justify-between items-center">
                  <span className="text-xs font-black text-[#282825]/70">استشارة مباشرة</span>
                  <a
                    href={`https://wa.me/${mentor.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="app-button border-2 border-[#282825] bg-[#25D366] text-white px-4 py-2 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[3.5px_3.5px_0_#282825] hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
                  >
                    <span>تواصل عبر واتساب</span>
                    <MessageSquare className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );

  if (user) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        {content}
      </SidebarLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#b9ced8] p-4 sm:p-6" dir="rtl">
      <header className="app-guest-nav max-w-6xl mx-auto mb-6 flex items-center justify-between rounded-2xl border-2 border-[#282825] bg-white px-5 py-4 shadow-[4px_4px_0_#282825]">
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/logo.png" className="h-10 w-10 rounded-xl border border-[#282825] object-contain p-0.5" alt="الشعار" />
          <span className="text-xl font-black text-[#282825]">منصة مسار التعليمية</span>
        </Link>
        <Link href="/auth" className="app-button border-2 border-[#282825] bg-[#ff5636] text-white min-h-10 rounded-xl px-5 py-2 text-xs font-black shadow-[2px_2px_0_#282825]">
          تسجيل الدخول
        </Link>
      </header>
      <div className="relative z-10">
        {content}
      </div>
    </div>
  );
}
