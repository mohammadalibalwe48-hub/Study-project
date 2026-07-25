'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpenIcon,
  ChemistryIcon,
  ClockIcon,
  CloseIcon,
  ForumIcon,
  HelpIcon,
  HomeIcon,
  LibraryIcon,
  LogOutIcon,
  MathIcon,
  MenuIcon,
  MentorIcon,
  RobotIcon,
  ShieldIcon,
  SparkIcon,
  UserIcon,
  LightningIcon,
} from '@/components/icons/SvgIcons';

interface SidebarLayoutProps {
  children: React.ReactNode;
  role?: 'student' | 'admin';
  signOut: () => Promise<void>;
}

type MenuItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  id: string;
  description: string;
};

export default function SidebarLayout({ children, role, signOut }: SidebarLayoutProps) {
  const pathname = usePathname();
  const [aiOpen, setAiOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: 'ai' | 'user'; text: string }[]>([
    {
      sender: 'ai',
      text: 'مرحباً بك يا بطل! أنا (الرفيق البطل)، مساعدك الذكي المخصص حصرياً لمنهاج البكالوريا السورية والمنصة التعليمية. اسألني عن أي قانون، مسألة، أو إعراب وسأساعدك فوراً! 🎓',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Anti-Spam Cooldown CountDown Timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Lock body scroll when mobile drawer or AI drawer is open
  useEffect(() => {
    if (mobileMenuOpen || aiOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, aiOpen]);

  const menuItems: MenuItem[] = [
    {
      name: 'لوحة التحكم',
      path: '/dashboard',
      icon: <HomeIcon className="h-5 w-5" />,
      id: 'dashboard',
      description: 'ملخص التقدم والأهداف',
    },
    {
      name: 'النماذج الوزارية',
      path: '/dashboard/exams',
      icon: <BookOpenIcon className="h-5 w-5" />,
      id: 'exams',
      description: 'أسئلة وسلالم الدورات',
    },
    {
      name: 'المواد الدراسية',
      path: '/subjects',
      icon: <ChemistryIcon className="h-5 w-5" />,
      id: 'subjects',
      description: 'الدروس والاختبارات',
    },
    {
      name: 'المكتبة الشاملة',
      path: '/library',
      icon: <LibraryIcon className="h-5 w-5" />,
      id: 'library',
      description: 'الملخصات ودروس PDF',
    },
    {
      name: 'أساتذة المنصة',
      path: '/mentors',
      icon: <MentorIcon className="h-5 w-5" />,
      id: 'mentors',
      description: 'نخبة الأساتذة المختصين',
    },
    {
      name: 'المنتدى التعليمي',
      path: '/forum',
      icon: <ForumIcon className="h-5 w-5" />,
      id: 'forum',
      description: 'نقاشات واستفسارات الطلاب',
    },
    {
      name: 'الدعم والمساعدة',
      path: '/support',
      icon: <HelpIcon className="h-5 w-5" />,
      id: 'support',
      description: 'المساعدة الفنية والتوجيه',
    },
    {
      name: 'الملف الشخصي',
      path: '/profile',
      icon: <UserIcon className="h-5 w-5" />,
      id: 'profile',
      description: 'إعدادات الملف الشخصي',
    },
  ];

  if (role === 'admin') {
    menuItems.push({
      name: 'إدارة المنصة',
      path: '/admin',
      icon: <ShieldIcon className="h-5 w-5" />,
      id: 'admin',
      description: 'إدارة المحتوى والطلاب',
    });
  }

  const isItemActive = (item: MenuItem) => {
    if (item.path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  };

  const handleAskAI = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping || cooldown > 0) return;

    // Enforce 500 characters limit
    const cleanPrompt = trimmed.slice(0, 500);

    const newMessages = [...messages, { sender: 'user' as const, text: cleanPrompt }];
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);
    setCooldown(3); // 3-second anti-spam cooldown after sending

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { sender: 'ai', text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'أهلاً بك! يسعدني إجابتك على أي سؤال في منهاج البكالوريا السورية ورغبتك بالتميز والنجاح.',
          },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'حدث خطأ مؤقت في الاتصال بالسيرفر، أعد المحاولة مجدداً وسأكون معك فوراً!',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        sender: 'ai',
        text: 'تم بدء محادثة جديدة! تفضل بطرح أي سؤال يتعلق بـ منهاج البكالوريا السورية أو استخدام المنصة.',
      },
    ]);
  };

  const renderNavigationLinks = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-2.5 relative z-10 w-full" aria-label="التنقل الرئيسي">
      {menuItems.map((item) => {
        const isActive = isItemActive(item);

        return (
          <Link
            key={item.id}
            href={item.path}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={`group relative flex items-center justify-between gap-3.5 rounded-2xl px-4 py-3.5 text-right transition-all duration-300 ${
              isActive
                ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent text-white border border-cyan-400/40 shadow-lg shadow-cyan-950/40 font-semibold'
                : 'bg-slate-900/40 text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'bg-slate-800/80 text-slate-400 group-hover:text-cyan-400 group-hover:bg-slate-700'
                }`}
              >
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-snug">{item.name}</span>
                <span className="block truncate text-[11px] text-slate-400 mt-0.5 font-normal">
                  {item.description}
                </span>
              </div>
            </div>

            {isActive && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div
      className="min-h-screen bg-[#040812] text-foreground font-body p-0 lg:flex lg:gap-8 lg:p-8 relative overflow-hidden"
      dir="rtl"
    >
      {/* Fullscreen Looping Background Video */}
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

      {/* Ambient Animated Mesh Glowing Blobs */}
      <div className="fixed -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-1/2 -left-40 w-[500px] h-[500px] rounded-full bg-purple-500/15 blur-[140px] pointer-events-none z-0" />
      <div className="fixed -bottom-40 right-1/3 w-[500px] h-[500px] rounded-full bg-sky-600/15 blur-[130px] pointer-events-none z-0" />

      {/* MOBILE TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 border-b border-cyan-500/20 bg-slate-950/85 px-4 py-3.5 backdrop-blur-2xl lg:hidden">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-950/50 bg-slate-900">
              <Image src="/images/logo.png" alt="الشعار" fill sizes="40px" className="object-contain p-1" priority />
            </div>
            <div className="min-w-0 text-right">
              <span className="block truncate text-base font-extrabold text-white">منصة البكالوريا</span>
              <span className="block truncate text-[10px] font-bold text-cyan-400 tracking-wider">
                التعليم السينمائي الذكي
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-400/30 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md active:scale-95"
              aria-label="فتح القائمة الرئيسية"
            >
              <span>القائمة</span>
              <MenuIcon className="h-5 w-5 text-cyan-400" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE SIDEBAR DRAWER */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl lg:hidden animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop Touch Dismiss */}
          <div
            className="absolute inset-0 h-full w-full bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sliding Glass Drawer Container */}
          <aside className="absolute right-0 top-0 bottom-0 flex h-full w-[85vw] max-w-[340px] flex-col justify-between border-l border-cyan-500/30 bg-[#070d19]/95 p-5 shadow-2xl shadow-cyan-950/80 backdrop-blur-3xl animate-in slide-in-from-right duration-300 overflow-y-auto">
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800/80 pt-2">
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-cyan-400/40 bg-slate-900 shadow-md">
                    <Image src="/images/logo.png" alt="الشعار" fill sizes="44px" className="object-contain p-1" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">منصة البكالوريا</h3>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-cyan-300 bg-cyan-500/20 rounded-full border border-cyan-500/30 mt-0.5">
                      {role === 'admin' ? 'مشرف النظام' : 'طالب علمي / أدبي'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition"
                  aria-label="إغلاق القائمة"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              {/* AI Assistant Quick Trigger */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAiOpen(true);
                }}
                className="mb-5 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-purple-600/20 p-3.5 border border-cyan-400/40 text-white hover:border-cyan-300 transition shadow-lg shadow-cyan-950/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 font-bold">
                    <RobotIcon className="h-5 w-5" />
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold text-cyan-200">الرفيق البطل</span>
                    <span className="block text-[10px] text-slate-300">مساعدك المنهاجي الذكي</span>
                  </div>
                </div>
                <SparkIcon className="h-4 w-4 text-cyan-400 animate-pulse" />
              </button>

              {/* Navigation Links List */}
              <div className="w-full">
                {renderNavigationLinks(() => setMobileMenuOpen(false))}
              </div>
            </div>

            {/* Drawer Footer / Sign Out */}
            <div className="pt-4 mt-6 border-t border-slate-800/80">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition active:scale-95"
              >
                <LogOutIcon className="h-4 w-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="sticky top-8 hidden h-[calc(100vh-4rem)] w-80 shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl backdrop-blur-2xl z-10 lg:flex">
        <div>
          {/* Sidebar Brand Header */}
          <div className="border-b border-slate-800/80 pb-5 mb-5">
            <Link href="/dashboard" className="flex items-center gap-3.5">
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-cyan-400/40 bg-slate-900 shadow-md">
                <Image src="/images/logo.png" alt="الشعار" fill sizes="48px" className="object-contain p-1" priority />
              </div>
              <div className="text-right">
                <span className="block text-xl font-extrabold text-white">منصة البكالوريا</span>
                <span className="text-[11px] font-bold text-cyan-400">التعلم السينمائي التفاعلي</span>
              </div>
            </Link>
          </div>

          <div className="space-y-4">
            {/* AI Helper Banner */}
            <div className="bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-transparent p-4 rounded-2xl border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-cyan-400">المساعد المنهاجي الذكي</p>
                  <h3 className="text-base font-extrabold text-white">الرفيق البطل</h3>
                </div>
                <div className="p-2 rounded-xl bg-cyan-500 text-slate-950">
                  <RobotIcon className="h-5 w-5" />
                </div>
              </div>
              <button
                onClick={() => setAiOpen(true)}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                <SparkIcon className="h-4 w-4" />
                <span>افتح المحادثة الذكية</span>
              </button>
            </div>

            {renderNavigationLinks()}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-800/80 pt-4">
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition"
          >
            <LogOutIcon className="h-4 w-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="min-w-0 flex-1 overflow-y-auto pt-4 lg:pt-0 relative z-10">{children}</main>

      {/* REDESIGNED AI ASSISTANT DRAWER WITH ANTI-SPAM PROTECTION */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="absolute inset-0 h-full w-full cursor-default" onClick={() => setAiOpen(false)} />
          <div className="relative flex h-full w-full max-w-lg flex-col justify-between border-l border-cyan-500/30 bg-[#060c18] p-5 shadow-2xl backdrop-blur-3xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800/90 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-md shadow-cyan-500/30">
                  <RobotIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-extrabold text-white">الرفيق البطل</h4>
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
                      منهاج البكالوريا السورية
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    مخصص حصرياً للمواد والامتحانات والمنصة
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearChat}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 transition"
                  title="مسح المحادثة"
                >
                  مسح
                </button>
                <button
                  onClick={() => setAiOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
                  aria-label="إغلاق المحادثة"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages Chat Area */}
            <div className="my-4 flex-1 space-y-4 overflow-y-auto pr-1">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-4 text-sm font-medium leading-relaxed border transition-all ${
                    msg.sender === 'ai'
                      ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-sm'
                      : 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border-cyan-400/40 text-white self-end'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold text-cyan-400 flex items-center gap-1.5">
                      {msg.sender === 'ai' ? (
                        <>
                          <RobotIcon className="w-3.5 h-3.5" />
                          <span>الرفيق البطل (مساعد المنهاج)</span>
                        </>
                      ) : (
                        <span>أنا</span>
                      )}
                    </span>

                    {msg.sender === 'ai' && (
                      <button
                        onClick={() => handleCopyText(msg.text, idx)}
                        className="text-[10px] text-slate-400 hover:text-cyan-300 px-2 py-0.5 rounded bg-slate-800/80 transition"
                      >
                        {copiedIndex === idx ? '✓ تم النسخ' : 'نسخ النص'}
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-xs md:text-sm font-sans dir-rtl">
                    {msg.text}
                  </p>
                </div>
              ))}

              {isTyping && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs text-cyan-300 animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>الرفيق البطل يراجع المنهاج ويكتب لك إجابة دقيقة...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Baccalaureate Topic Shortcuts */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAskAI('شرح قوانين تكامل الرياضيات وتطبيقاتها')}
                disabled={isTyping || cooldown > 0}
                className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500 py-2 px-2.5 rounded-xl text-[11px] text-slate-300 hover:text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <MathIcon className="h-3.5 w-3.5 text-cyan-400" /> قوانين الرياضيات
              </button>
              <button
                onClick={() => handleAskAI('ملخص قوانين النواسات وحركة الفيزياء')}
                disabled={isTyping || cooldown > 0}
                className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500 py-2 px-2.5 rounded-xl text-[11px] text-slate-300 hover:text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <LightningIcon className="h-3.5 w-3.5 text-amber-400" /> مسودات الفيزياء
              </button>
              <button
                onClick={() => handleAskAI('قوانين وثوابت المعايرة والتوازن الكيميائي')}
                disabled={isTyping || cooldown > 0}
                className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500 py-2 px-2.5 rounded-xl text-[11px] text-slate-300 hover:text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <ChemistryIcon className="h-3.5 w-3.5 text-emerald-400" /> الكيمياء الوزارية
              </button>
              <button
                onClick={() => handleAskAI('كيف أحسب مجموعي في البكالوريا ومفاضلة الجامعات؟')}
                disabled={isTyping || cooldown > 0}
                className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500 py-2 px-2.5 rounded-xl text-[11px] text-slate-300 hover:text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <ClockIcon className="h-3.5 w-3.5 text-purple-400" /> حساب المفاضلة
              </button>
            </div>

            {/* Input Form with Character Counter & Anti-Spam Cooldown */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAI(inputValue);
              }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>أسئلة حصرياً في المنهاج السوري والمنصة</span>
                <span>
                  {inputValue.length}/500 حرف {cooldown > 0 && `• يرجى الانتظار (${cooldown}ث)`}
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  maxLength={500}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    cooldown > 0
                      ? `يرجى الانتظار ${cooldown} ثوانٍ...`
                      : 'اسألني أي سؤال في المواد أو المنصة...'
                  }
                  disabled={isTyping || cooldown > 0}
                  className="min-w-0 flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={isTyping || cooldown > 0 || !inputValue.trim()}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold px-5 py-3 rounded-2xl text-xs md:text-sm transition disabled:opacity-50 shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5"
                >
                  <span>إرسال</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
