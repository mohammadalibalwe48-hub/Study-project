'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

interface Subject {
  id: number;
  name: string;
  description: string;
  branch_id: number;
  image_url?: string;
}

interface Branch {
  id: number;
  name: string;
  slug: string;
}

export default function SubjectsPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setDbLoading(true);
        const { data: subData, error: subErr } = await supabase
          .from('subjects')
          .select('*');
        if (subErr) {
          console.error('Error fetching subjects:', subErr);
        } else if (subData) {
          setSubjects(subData);
        }

        const { data: brData, error: brErr } = await supabase
          .from('branches')
          .select('*');
        if (brErr) {
          console.error('Error fetching branches:', brErr);
        } else if (brData) {
          setBranches(brData);
        }
      } catch (err) {
        console.error('Unexpected error fetching curriculum data:', err);
      } finally {
        setDbLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredSubjects = subjects.filter((s) => {
    const matchesBranch = selectedBranchId === 'all' || s.branch_id === selectedBranchId;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesBranch && matchesSearch;
  });

  const getBranchBadge = (branchId: number) => {
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) return null;
    return (
      <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-1 rounded-full inline-block">
        {branch.name}
      </span>
    );
  };

  const content = (
    <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 border border-white/15 text-right">
      {/* Header and Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-white/10 pb-6">
        <div className="space-y-3">
          <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-muted-foreground uppercase inline-block border border-white/10">
            دليل المناهج والكتب الوزارية
          </span>
          <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground">
            تصفح المقررات الدراسية
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            كافة المواد والدروس والاختبارات التفاعلية المخصصة لمنهاج الثالث الثانوي بكافة فروعه.
          </p>
        </div>

        {!user && (
          <Link href="/auth" className="liquid-glass-glow rounded-full px-6 py-3 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40">
            تسجيل الدخول للدراسة
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 liquid-glass p-6 rounded-3xl border border-white/10">
        {/* Branch Filters */}
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto" dir="rtl">
          <button
            onClick={() => setSelectedBranchId('all')}
            className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
              selectedBranchId === 'all'
                ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
                : 'bg-white/5 text-muted-foreground hover:text-foreground border border-white/5'
            }`}
          >
            جميع الفروع
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranchId(b.id)}
              className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
                selectedBranchId === b.id
                  ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
                  : 'bg-white/5 text-muted-foreground hover:text-foreground border border-white/5'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:max-w-md flex items-center">
          <input
            type="text"
            placeholder="ابحث عن مادة دراسية..."
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

      {/* Subjects Grid */}
      {dbLoading ? (
        <div className="py-20 text-center space-y-4">
          <div className="h-10 w-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground text-sm">جاري تحميل المواد...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="liquid-glass rounded-3xl p-16 text-center text-muted-foreground text-sm border border-white/10">
          لم يتم العثور على مواد تطابق خيارات البحث الحالية.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSubjects.map((sub) => {
            return (
              <div
                key={sub.id}
                className="liquid-glass-glow rounded-3xl p-6 flex flex-col justify-between min-h-[260px] border border-white/15 hover:scale-[1.03] transition-all group relative overflow-hidden"
              >
                <div className="space-y-4 text-right">
                  <div className="flex justify-between items-center">
                    {getBranchBadge(sub.branch_id)}
                    <span className="text-[10px] text-muted-foreground bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                      مادة معتمدة
                    </span>
                  </div>
                  <h3 className="text-2xl font-display font-normal text-foreground group-hover:text-cyan-200 transition-colors">
                    {sub.name}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">
                    {sub.description || 'تصفح محتوى المادة، الشروحات، النماذج، وحل الاختبارات التفاعلية.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">منهاج وزارة التربية</span>
                  <Link
                    href={user ? `/subjects/${sub.id}` : '/auth'}
                    className="liquid-glass-glow rounded-full px-5 py-2 text-xs font-medium text-foreground hover:scale-105 transition-transform flex items-center gap-2 border border-cyan-400/30"
                  >
                    دخول المادة ←
                  </Link>
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
    <div className="min-h-screen bg-[#001420] p-6 max-w-7xl mx-auto flex flex-col justify-between relative overflow-hidden" dir="rtl">
      {/* Fullscreen Looping Video Background */}
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
      {/* Guest Navigation Header */}
      <header className="relative z-10 w-full flex justify-between items-center liquid-glass rounded-full px-8 py-4 mb-8 border border-white/15">
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/logo.png" className="h-10 w-10 rounded-full border border-white/20 object-cover" alt="الشعار" />
          <span className="text-2xl font-display text-foreground">منصة البكالوريا</span>
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
