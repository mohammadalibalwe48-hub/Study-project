'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
    <div className="app-page app-card flex flex-col gap-8 bg-[#fafaf7] text-right">

      {/* Header and title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-white/10 pb-6">
        <div className="space-y-3">
          <span className="app-page-kicker">
            المستندات والملفات المفتوحة
          </span>
          <h1 className="app-page-title">
            المكتبة الرقمية والملخصات
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            تحميل الكتب المدرسية الرسمية وملخصات الأساتذة وسلالم التصحيح الوزارية مباشرة.
          </p>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 liquid-glass p-6 rounded-3xl border border-white/10">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto" dir="rtl">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${selectedCategory === 'all'
                ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
                : 'bg-white/5 text-muted-foreground hover:text-foreground border border-white/5'
              }`}
          >
            الكل
          </button>
          <button
            onClick={() => setSelectedCategory('textbook')}
            className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${selectedCategory === 'textbook'
                ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
                : 'bg-white/5 text-muted-foreground hover:text-foreground border border-white/5'
              }`}
          >
            الكتب المدرسية
          </button>
          <button
            onClick={() => setSelectedCategory('summary')}
            className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${selectedCategory === 'summary'
                ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
                : 'bg-white/5 text-muted-foreground hover:text-foreground border border-white/5'
              }`}
          >
            ملخصات وأوراق عمل
          </button>
          <button
            onClick={() => setSelectedCategory('exam')}
            className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${selectedCategory === 'exam'
                ? 'liquid-glass-glow text-foreground border border-cyan-400/40 scale-105'
                : 'bg-white/5 text-muted-foreground hover:text-foreground border border-white/5'
              }`}
          >
            دورات وسلالم تصحيح
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:max-w-md flex items-center">
          <input
            type="text"
            placeholder="ابحث عن ملف، كتاب، أو ملخص..."
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

      {/* Files Grid */}
      {dbLoading ? (
        <div className="py-20 text-center space-y-4">
          <div className="h-10 w-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground text-sm">جاري تحميل المستندات...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="liquid-glass rounded-3xl p-16 text-center text-muted-foreground text-sm border border-white/10">
          لا توجد ملفات تطابق عملية البحث حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredFiles.map((file) => {
            let catName = 'كتاب مدرسي';
            if (file.category === 'summary') {
              catName = 'ملخص ومراجعة';
            } else if (file.category === 'exam') {
              catName = 'امتحانات ودورات';
            }

            return (
              <div
                key={file.id}
                className="app-card bg-white p-6 flex flex-col justify-between hover:-translate-y-1 transition-all duration-200 group"
              >
                <div className="space-y-4 text-right">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-1 rounded-full">
                      {catName}
                    </span>
                    <span className="text-xs text-muted-foreground bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                      {file.subject}
                    </span>
                  </div>

                  <h3 className="text-2xl font-display font-normal text-foreground group-hover:text-cyan-200 transition-colors">
                    {file.name}
                  </h3>

                  <p className="text-xs text-muted-foreground bg-white/5 p-4 rounded-2xl border border-white/5 leading-relaxed">
                    {file.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10 inline-flex items-center gap-1.5">
                      <BookIcon className="w-3.5 h-3.5" /> {file.size}
                    </span>
                    <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10 inline-flex items-center gap-1.5">
                      <FileIcon className="w-3.5 h-3.5" /> {file.format}
                    </span>
                  </div>

                  <a
                    href={file.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="liquid-glass-glow rounded-full px-5 py-2 text-xs font-medium text-foreground hover:scale-105 transition-transform flex items-center gap-2 border border-cyan-400/40"
                  >
                    تحميل الملف ↓
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
    <div className="app-page-canvas" dir="rtl">
      <header className="app-guest-nav">
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
