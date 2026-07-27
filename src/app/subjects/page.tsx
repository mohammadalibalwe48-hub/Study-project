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
      <span className="app-chip bg-[#bce9fa] text-[11px]">
        {branch.name}
      </span>
    );
  };

  const content = (
    <div className="mx-auto w-full max-w-[1180px] space-y-6 text-right">
      {/* Header and Page Title */}
      <div className="flex flex-col gap-4 border-b border-[#d6d4cd] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <span className="app-chip bg-[#ffd64d]">
            دليل المناهج والكتب الوزارية
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
            تصفح المقررات الدراسية
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            كافة المواد والدروس والاختبارات التفاعلية المخصصة لمنهاج الثالث الثانوي بكافة فروعه.
          </p>
        </div>

        {!user && (
          <Link href="/auth" className="app-button app-button-secondary min-h-10 rounded-xl px-5 py-2.5 text-xs">
            تسجيل الدخول للدراسة
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="app-card flex flex-col items-center justify-between gap-6 bg-white p-5 md:flex-row">
        {/* Branch Filters */}
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto" dir="rtl">
          <button
            onClick={() => setSelectedBranchId('all')}
            className={`app-chip ${selectedBranchId === 'all' ? 'app-chip-active' : ''}`}
          >
            جميع الفروع
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranchId(b.id)}
              className={`app-chip ${selectedBranchId === b.id
                ? 'app-chip-active'
                : ''
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
            className="app-input w-full text-right pr-6 pl-12 text-sm"
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
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#282825] border-t-transparent"></div>
          <p className="text-muted-foreground text-sm">جاري تحميل المواد...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="app-card bg-white p-16 text-center text-[#6e6e67] text-sm">
          لم يتم العثور على مواد تطابق خيارات البحث الحالية.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((sub) => {
            return (
              <div
                key={sub.id}
                className="app-card flex min-h-[260px] flex-col justify-between bg-white p-6 transition-all group hover:-translate-y-1"
              >
                <div className="space-y-4 text-right">
                  <div className="flex justify-between items-center">
                    {getBranchBadge(sub.branch_id)}
                    <span className="app-chip min-h-7 px-2.5 py-1 text-[10px]">
                      مادة معتمدة
                    </span>
                  </div>
                  <h3 className="text-2xl font-extrabold group-hover:text-[#ff5636] transition-colors">
                    {sub.name}
                  </h3>
                  <p className="text-[#6e6e67] text-xs leading-relaxed line-clamp-3">
                    {sub.description || 'تصفح محتوى المادة، الشروحات، النماذج، وحل الاختبارات التفاعلية.'}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[#deddd7] pt-4">
                  <span className="text-xs text-[#6e6e67]">منهاج وزارة التربية</span>
                  <Link
                    href={user ? `/subjects/${sub.id}` : '/auth'}
                    className="app-button app-button-secondary min-h-9 rounded-xl px-4 py-2 text-xs"
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
    <div className="min-h-screen bg-[#b9ced8] p-4 sm:p-6" dir="rtl">
      {/* Guest Navigation Header */}
      <header className="app-guest-nav max-w-6xl px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/logo.png" className="h-10 w-10 rounded-full border border-white/20 object-cover" alt="الشعار" />
          <span className="text-2xl font-display text-foreground">منصة البكالوريا</span>
        </Link>
        <Link href="/auth" className="app-button app-button-secondary min-h-10 rounded-xl px-5 py-2.5 text-xs">
          تسجيل الدخول
        </Link>
      </header>
      <div className="relative z-10">
        {content}
      </div>
    </div>
  );
}
