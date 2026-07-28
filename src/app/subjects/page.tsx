'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft, BookOpen, Sparkles, Filter } from 'lucide-react';
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
      <span className="app-chip bg-[#bce9fa] border border-[#282825] text-[11px] font-black shadow-[1.5px_1.5px_0_#282825]">
        {branch.name}
      </span>
    );
  };

  const subjectCardThemes = [
    { bg: 'bg-[#ffdc72]', shadow: 'neo-shadow-interactive-yellow' },
    { bg: 'bg-[#d8bcff]', shadow: 'neo-shadow-interactive-purple' },
    { bg: 'bg-[#bce9fa]', shadow: 'neo-shadow-interactive-blue' },
    { bg: 'bg-[#cce6b4]', shadow: 'neo-shadow-interactive-coral' },
  ];

  const content = (
    <div className="mx-auto w-full max-w-[1180px] space-y-8 text-right bg-dot-pattern py-4">
      {/* Header and Page Title */}
      <div className="flex flex-col gap-4 border-b-2 border-[#282825] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <span className="app-chip bg-[#ffd64d] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
            <BookOpen className="h-4 w-4 text-[#ff5636]" /> دليل المناهج والكتب الوزارية
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl text-[#282825]">
            تصفح المقررات الدراسية
          </h1>
          <p className="text-[#5f5f59] text-sm max-w-xl leading-relaxed font-semibold">
            كافة المواد والدروس والاختبارات التفاعلية المخصصة لمنهاج الثالث الثانوي بكافة فروعه.
          </p>
        </div>

        {!user && (
          <Link 
            href="/auth" 
            className="app-button border-2 border-[#282825] bg-[#ff5636] text-white shadow-[3px_3px_0_#282825] hover:shadow-[5px_5px_0_#282825] hover:-translate-y-0.5 transition-all text-xs font-black px-6 py-2.5"
          >
            تسجيل الدخول للدراسة
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border-2 border-[#282825] flex flex-col items-center justify-between gap-6 bg-white p-5 md:flex-row shadow-[4px_4px_0_#282825]">
        {/* Branch Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto" dir="rtl">
          <span className="text-xs font-black text-[#5f5f59] flex items-center gap-1 ml-1">
            <Filter className="h-3.5 w-3.5" /> الفرع:
          </span>
          
          <button
            onClick={() => setSelectedBranchId('all')}
            className={`rounded-xl border-2 border-[#282825] px-4 py-2 text-xs font-black transition-all ${
              selectedBranchId === 'all'
                ? 'bg-[#282825] text-white shadow-[2px_2px_0_#ff5636]'
                : 'bg-white text-[#282825] hover:bg-[#ffd64d] shadow-[2px_2px_0_#282825]'
            }`}
          >
            جميع الفروع
          </button>
          
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranchId(b.id)}
              className={`rounded-xl border-2 border-[#282825] px-4 py-2 text-xs font-black transition-all ${
                selectedBranchId === b.id
                  ? 'bg-[#282825] text-white shadow-[2px_2px_0_#ff5636]'
                  : 'bg-white text-[#282825] hover:bg-[#ffd64d] shadow-[2px_2px_0_#282825]'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:max-w-md flex items-center">
          <Search className="absolute right-4 h-4 w-4 text-[#282825] z-10" />
          <input
            type="text"
            placeholder="ابحث عن مادة دراسية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="app-input w-full text-right pr-11 pl-4 text-sm border-2 border-[#282825] shadow-[2px_2px_0_#282825] focus:shadow-[4px_4px_0_#282825] focus:border-[#ff5636]"
          />
        </div>
      </div>

      {/* Subjects Grid */}
      {dbLoading ? (
        <div className="py-20 text-center space-y-4">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#282825] border-t-[#ff5636]"></div>
          <p className="text-[#5f5f59] text-sm font-black">جاري تحميل المواد الدراسية...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#282825] bg-white p-16 text-center text-[#5f5f59] text-sm font-extrabold shadow-[4px_4px_0_#282825]">
          لم يتم العثور على مواد تطابق خيارات البحث الحالية.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((sub, index) => {
            const theme = subjectCardThemes[index % subjectCardThemes.length];
            return (
              <div
                key={sub.id}
                className={`rounded-2xl border-2 border-[#282825] flex min-h-[270px] flex-col justify-between p-6 transition-all group hover:scale-[1.02] ${theme.bg} ${theme.shadow}`}
              >
                <div className="space-y-4 text-right">
                  <div className="flex justify-between items-center">
                    {getBranchBadge(sub.branch_id)}
                    <span className="app-chip bg-white border border-[#282825] min-h-7 px-3 py-0.5 text-[10px] font-black shadow-[1.5px_1.5px_0_#282825]">
                      مادة معتمدة ⭐️
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-black text-[#282825] group-hover:text-[#ff5636] transition-colors">
                    {sub.name}
                  </h3>
                  
                  <p className="text-[#4a4a44] text-xs leading-relaxed font-semibold line-clamp-3">
                    {sub.description || 'تصفح محتوى المادة، الشروحات، النماذج، وحل الاختبارات التفاعلية.'}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[#282825]/15 pt-4">
                  <span className="text-[11px] font-black text-[#282825]/70">منهاج وزارة التربية</span>
                  <Link
                    href={user ? `/subjects/${sub.id}` : '/auth'}
                    className="app-button border-2 border-[#282825] bg-white text-[#282825] min-h-9 px-4 py-1.5 text-xs font-black shadow-[2px_2px_0_#282825] hover:bg-[#282825] hover:text-white hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5"
                  >
                    <span>دخول المادة</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
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
