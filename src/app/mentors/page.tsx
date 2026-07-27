'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { MessageSquare } from 'lucide-react';

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

  const content = (
    <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 border border-white/15 text-right">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-white/10 pb-6">
        <div className="space-y-3">
          <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-cyan-300 border border-cyan-400/20 uppercase inline-block">
            نخبة من معلمي سوريا
          </span>
          <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground">
            المدرسون المعتمدون
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            تواصل مباشرة مع أفضل المدرسين المعتمدين لمتابعة استفساراتك وحجز جلسات المراجعة.
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex justify-between items-center liquid-glass p-6 rounded-3xl border border-white/10">
        <div className="relative w-full flex items-center">
          <input
            type="text"
            placeholder="ابحث باسم المدرس أو المادة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-right liquid-glass rounded-2xl py-3.5 pr-6 pl-12 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyan-400/40"
          />
          <span className="absolute left-4 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
        </div>
      </div>

      {/* Mentors Cards Grid */}
      {dbLoading ? (
        <div className="py-20 text-center space-y-4">
          <div className="h-10 w-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground text-sm">جاري تحميل الأساتذة...</p>
        </div>
      ) : filteredMentors.length === 0 ? (
        <div className="liquid-glass rounded-3xl p-16 text-center text-muted-foreground text-sm border border-white/10">
          لم يتم العثور على مدرسين يطابقون خيارات البحث.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMentors.map((mentor) => (
            <div
              key={mentor.id}
              className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between hover:scale-[1.03] transition-all group"
            >
              <div className="text-right space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-1 rounded-full">
                    مدرس {mentor.subject}
                  </span>
                  <span className="text-xs text-amber-400 font-medium bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
                    ⭐ {mentor.rating} ({mentor.reviews_count})
                  </span>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-white/20 relative shrink-0">
                    <img src={mentor.avatar} alt={mentor.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-normal text-foreground group-hover:text-cyan-200 transition-colors">
                      {mentor.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">خبرة {mentor.experience}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground bg-white/5 p-4 rounded-2xl border border-white/5 leading-relaxed">
                  {mentor.bio}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">استشارة مباشرة</span>
                <a
                  href={`https://wa.me/${mentor.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="liquid-glass-glow rounded-full px-5 py-2 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-emerald-400/40 text-emerald-300 flex items-center gap-2"
                >
                  تواصل عبر واتساب <MessageSquare className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
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
    <div className="min-h-screen bg-[#001420] p-6 max-w-7xl mx-auto flex flex-col justify-between relative overflow-hidden" dir="rtl">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 opacity-20 pointer-events-none"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
      </video>
      <header className="relative z-10 w-full flex justify-between items-center liquid-glass rounded-full px-8 py-4 mb-8 border border-white/15">
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/logo.png" className="h-10 w-10 rounded-full border border-white/20 object-cover" alt="الشعار" />
          <span className="text-2xl font-display text-foreground">منصة مسار</span>
        </Link>
        <Link href="/auth" className="liquid-glass-glow rounded-full px-6 py-2.5 text-xs text-foreground font-medium hover:scale-105 transition-transform border border-cyan-400/40">
          تسجيل الدخول
        </Link>
      </header>
      <div className="relative z-10">
        {content}
      </div>
    </div>
  );
}
