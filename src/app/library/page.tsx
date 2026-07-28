'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Download, BookOpen, FileText, Sparkles, Filter } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { BookIcon, FileIcon } from '@/components/icons/SvgIcons';

interface LibraryFile {
  id: number;
  name: string;
  category: 'textbook' | 'summary' | 'exam';
  subject: string;
  size: string;
  format: string;
  download_url: string;
  description: string;
}

export default function LibraryPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'textbook' | 'summary' | 'exam'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    async function fetchLibrary() {
      try {
        setDbLoading(true);
        const { data, error } = await supabase
          .from('library_resources')
          .select('*')
          .order('id', { ascending: true });

        if (error) throw error;
        setLibraryFiles(data || []);
      } catch (err) {
        console.error('Error fetching library resources:', err);
      } finally {
        setDbLoading(false);
      }
    }
    fetchLibrary();
  }, []);

  const filteredFiles = libraryFiles.filter((f) => {
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const content = (
    <div className="mx-auto w-full max-w-[1180px] space-y-8 text-right bg-dot-pattern py-4">
      {/* Header and Title */}
      <div className="flex flex-col gap-4 border-b-2 border-[#282825] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <span className="app-chip bg-[#bce9fa] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
            <BookOpen className="h-4 w-4 text-[#ff5636]" /> المستندات والملفات المفتوحة
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl text-[#282825]">
            المكتبة الرقمية والملخصات
          </h1>
          <p className="text-[#5f5f59] text-sm max-w-xl leading-relaxed font-semibold">
            تحميل الكتب المدرسية الرسمية وملخصات الأساتذة وسلالم التصحيح الوزارية مباشرة دون إعلانات.
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

      {/* Filter and Search Panel */}
      <div className="rounded-2xl border-2 border-[#282825] flex flex-col items-center justify-between gap-6 bg-white p-5 md:flex-row shadow-[4px_4px_0_#282825]">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto dir-rtl">
          <span className="text-xs font-black text-[#5f5f59] flex items-center gap-1 ml-1">
            <Filter className="h-3.5 w-3.5" /> النوع:
          </span>
          
          <button
            onClick={() => setSelectedCategory('all')}
            className={`rounded-xl border-2 border-[#282825] px-4 py-2 text-xs font-black transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#282825] text-white shadow-[2px_2px_0_#ff5636]'
                : 'bg-white text-[#282825] hover:bg-[#ffd64d] shadow-[2px_2px_0_#282825]'
            }`}
          >
            الكل
          </button>
          
          <button
            onClick={() => setSelectedCategory('textbook')}
            className={`rounded-xl border-2 border-[#282825] px-4 py-2 text-xs font-black transition-all ${
              selectedCategory === 'textbook'
                ? 'bg-[#282825] text-white shadow-[2px_2px_0_#ff5636]'
                : 'bg-[#bce9fa] text-[#282825] hover:bg-[#bce9fa]/80 shadow-[2px_2px_0_#282825]'
            }`}
          >
            الكتب المدرسية 📚
          </button>
          
          <button
            onClick={() => setSelectedCategory('summary')}
            className={`rounded-xl border-2 border-[#282825] px-4 py-2 text-xs font-black transition-all ${
              selectedCategory === 'summary'
                ? 'bg-[#282825] text-white shadow-[2px_2px_0_#ff5636]'
                : 'bg-[#ffdc72] text-[#282825] hover:bg-[#ffdc72]/80 shadow-[2px_2px_0_#282825]'
            }`}
          >
            ملخصات وأوراق عمل 📝
          </button>
          
          <button
            onClick={() => setSelectedCategory('exam')}
            className={`rounded-xl border-2 border-[#282825] px-4 py-2 text-xs font-black transition-all ${
              selectedCategory === 'exam'
                ? 'bg-[#282825] text-white shadow-[2px_2px_0_#ff5636]'
                : 'bg-[#d8bcff] text-[#282825] hover:bg-[#d8bcff]/80 shadow-[2px_2px_0_#282825]'
            }`}
          >
            سلالم تصحيح ودورات 🎯
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:max-w-md flex items-center">
          <Search className="absolute right-4 h-4 w-4 text-[#282825] z-10" />
          <input
            type="text"
            placeholder="ابحث عن ملف، كتاب، أو ملخص..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="app-input w-full text-right pr-11 pl-4 text-sm border-2 border-[#282825] shadow-[2px_2px_0_#282825] focus:shadow-[4px_4px_0_#282825] focus:border-[#ff5636]"
          />
        </div>
      </div>

      {/* Files Grid */}
      {dbLoading ? (
        <div className="py-20 text-center space-y-4">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#282825] border-t-[#ff5636]"></div>
          <p className="text-[#5f5f59] text-sm font-black">جاري تحميل المستندات...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#282825] bg-white p-16 text-center text-[#5f5f59] text-sm font-extrabold shadow-[4px_4px_0_#282825]">
          لا توجد ملفات تطابق عملية البحث حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredFiles.map((file) => {
            let catName = 'كتاب مدرسي';
            let catBg = 'bg-[#bce9fa] neo-shadow-interactive-blue';
            if (file.category === 'summary') {
              catName = 'ملخص ومراجعة';
              catBg = 'bg-[#ffdc72] neo-shadow-interactive-yellow';
            } else if (file.category === 'exam') {
              catName = 'امتحانات ودورات';
              catBg = 'bg-[#d8bcff] neo-shadow-interactive-purple';
            }

            return (
              <div
                key={file.id}
                className={`rounded-2xl border-2 border-[#282825] p-6 flex flex-col justify-between transition-all group hover:scale-[1.01] ${catBg}`}
              >
                <div className="space-y-4 text-right">
                  <div className="flex justify-between items-center">
                    <span className="app-chip bg-white border border-[#282825] px-3 py-1 text-[11px] font-black shadow-[1.5px_1.5px_0_#282825]">
                      {catName}
                    </span>
                    <span className="app-chip bg-white/80 border border-[#282825] px-3 py-1 text-xs font-black shadow-[1.5px_1.5px_0_#282825]">
                      {file.subject}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-[#282825] group-hover:text-[#ff5636] transition-colors leading-snug">
                    {file.name}
                  </h3>

                  <p className="text-xs font-semibold text-[#4a4a44] bg-white/80 p-4 rounded-xl border border-[#282825]/20 leading-relaxed">
                    {file.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#282825]/15 flex justify-between items-center">
                  <div className="flex gap-2 text-xs font-extrabold text-[#282825]">
                    <span className="bg-white border border-[#282825] px-3 py-1 rounded-xl shadow-[1px_1px_0_#282825] inline-flex items-center gap-1">
                      <BookIcon className="w-3.5 h-3.5" /> {file.size}
                    </span>
                    <span className="bg-white border border-[#282825] px-3 py-1 rounded-xl shadow-[1px_1px_0_#282825] inline-flex items-center gap-1">
                      <FileIcon className="w-3.5 h-3.5" /> {file.format}
                    </span>
                  </div>

                  <a
                    href={file.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-5 py-2 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[4px_4px_0_#282825] hover:-translate-y-0.5 transition-all flex items-center gap-2"
                  >
                    <span>تحميل الملف</span>
                    <Download className="w-3.5 h-3.5" />
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
