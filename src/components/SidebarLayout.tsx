'use client';

import React, { useState } from 'react';
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
      text: 'مرحباً بك! أنا الرفيق البطل، مساعدك الذكي لمنهاج البكالوريا السورية. يمكنك كتابة أي استفسار في أي وقت!',
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const menuItems: MenuItem[] = [
    {
      name: 'لوحة التحكم',
      path: '/dashboard',
      icon: <HomeIcon className="h-5 w-5" />,
      id: 'dashboard',
      description: 'ملخص التقدم والأهداف'
    },
    {
      name: 'النماذج الوزارية',
      path: '/dashboard/exams',
      icon: <BookOpenIcon className="h-5 w-5" />,
      id: 'exams',
      description: 'أسئلة وسلالم الدورات'
    },
    {
      name: 'المواد الدراسية',
      path: '/subjects',
      icon: <ChemistryIcon className="h-5 w-5" />,
      id: 'subjects',
      description: 'الدروس والاختبارات'
    },
    {
      name: 'المكتبة الشاملة',
      path: '/library',
      icon: <LibraryIcon className="h-5 w-5" />,
      id: 'library',
      description: 'الملخصات ودروس PDF'
    },
    {
      name: 'أساتذة المنصة',
      path: '/mentors',
      icon: <MentorIcon className="h-5 w-5" />,
      id: 'mentors',
      description: 'نخبة الأساتذة المختصين'
    },
    {
      name: 'المنتدى التعليمي',
      path: '/forum',
      icon: <ForumIcon className="h-5 w-5" />,
      id: 'forum',
      description: 'نقاشات واستفسارات الطلاب'
    },
    {
      name: 'الدعم والمساعدة',
      path: '/support',
      icon: <HelpIcon className="h-5 w-5" />,
      id: 'support',
      description: 'المساعدة الفنية والتوجيه'
    },
    {
      name: 'الملف الشخصي',
      path: '/profile',
      icon: <UserIcon className="h-5 w-5" />,
      id: 'profile',
      description: 'إعدادات الملف الشخصي'
    },
  ];

  if (role === 'admin') {
    menuItems.push({
      name: 'إدارة المنصة',
      path: '/admin',
      icon: <ShieldIcon className="h-5 w-5" />,
      id: 'admin',
      description: 'إدارة المحتوى والطلاب'
    });
  }

  const isItemActive = (item: MenuItem) => {
    if (item.path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  };

  const handleAskAI = (text: string) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text }]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = 'عذراً، لم أفهم سؤالك تماماً. يمكنك سؤالي عن "قوانين الفيزياء"، "تكامل الرياضيات"، "معادلات الكيمياء"، أو "نصائح المذاكرة"!';
      const cleanText = text.toLowerCase();

      if (cleanText.includes('فيزياء') || cleanText.includes('نواسات') || cleanText.includes('حركة')) {
        reply = `قوانين الفيزياء الهامة للبكالوريا:
- النواس المرن: T0 = 2π √(m/K)
- النواس البسيط: T0 = 2π √(l/g)
- الحقل المغناطيسي لملف دائري: B = 2π * 10^-7 * (N.I / R)`;
      } else if (cleanText.includes('رياضيات') || cleanText.includes('تكامل') || cleanText.includes('لوغاريتم')) {
        reply = `صيغ وقوانين الرياضيات:
- مشتق اللوغاريتم: (ln x)' = 1/x
- مشتق التابع الأسي: (e^x)' = e^x
- قانون التكامل بالتجزئة: ∫ u dv = u.v - ∫ v du`;
      } else if (cleanText.includes('كيمياء') || cleanText.includes('توازن')) {
        reply = `قوانين الكيمياء:
- ثابت التوازن Kc = [النواتج] / [المتفاعلات]
- الجداء الشاردي للماء: Kw = [H3O+] * [OH-] = 10^-14
- حساب الرقم الهيدروجيني: pH = -log[H3O+]`;
      } else if (cleanText.includes('وقت') || cleanText.includes('دراسة') || cleanText.includes('نصائح')) {
        reply = `نصائح تنظيم الوقت للبكالوريا:
1. اتبع تقنية 25 دقيقة تركيز + 5 دقائق استراحة.
2. حل النماذج الوزارية المؤتمتة بشكل دوري.
3. نم لمدة 7-8 ساعات يومياً لترسيخ المعلومات.`;
      }

      setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      setIsTyping(false);
    }, 1000);
  };

  const renderNavigationLinks = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-2.5 relative z-10" aria-label="التنقل الرئيسي">
      {menuItems.map((item) => {
        const isActive = isItemActive(item);

        return (
          <Link
            key={item.id}
            href={item.path}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={`group relative flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-right smooth-interaction focus-ring hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-950/20 ${isActive
                ? 'liquid-glass-glow text-foreground border border-cyan-400/40 font-medium scale-[1.02]'
                : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
              }`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-muted-foreground group-hover:text-foreground'
              }`}>
              {item.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium leading-5">{item.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground mt-0.5">
                {item.description}
              </span>
            </span>
            {isActive && <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#001420] text-foreground font-body p-0 lg:flex lg:gap-8 lg:p-8 relative overflow-hidden animate-fade-scale-in" dir="rtl">
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
      <div className="fixed -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none animate-ambient-1 z-0" />
      <div className="fixed top-1/2 -left-40 w-[500px] h-[500px] rounded-full bg-purple-500/15 blur-[140px] pointer-events-none animate-ambient-2 z-0" />
      <div className="fixed -bottom-40 right-1/3 w-[500px] h-[500px] rounded-full bg-sky-600/15 blur-[130px] pointer-events-none animate-ambient-3 z-0" />

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#001420]/80 px-6 py-4 backdrop-blur-xl lg:hidden animate-slide-up-soft">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/20">
              <Image src="/images/logo.png" alt="الشعار" fill sizes="40px" className="object-cover" priority />
            </span>
            <span className="min-w-0 text-right">
              <span className="block truncate text-lg font-display text-foreground">منصة البكالوريا</span>
              <span className="block truncate text-[11px] text-muted-foreground">التعليم السينمائي الذكي</span>
            </span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="liquid-glass-glow p-2.5 rounded-full text-foreground hover:scale-105 cursor-pointer focus-ring smooth-interaction"
            aria-label="فتح القائمة"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl animate-fade-scale-in lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 h-full w-full cursor-default" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-[min(88vw,360px)] flex-col overflow-hidden border-l border-white/15 bg-[#001420] p-6 shadow-2xl animate-scale-in">
            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="relative h-10 w-10 overflow-hidden rounded-full border border-white/20">
                  <Image src="/images/logo.png" alt="الشعار" fill sizes="40px" className="object-cover" />
                </span>
                <div>
                  <p className="text-xl font-display text-foreground">القائمة الرئيسية</p>
                  <p className="text-xs text-muted-foreground">اختر وجهتك الدراسية</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="liquid-glass p-2 rounded-full text-muted-foreground hover:text-foreground"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => { setMobileMenuOpen(false); setAiOpen(true); }}
              className="liquid-glass-glow mb-6 flex w-full items-center justify-between rounded-2xl px-5 py-3 text-sm text-foreground hover:scale-[1.02] smooth-interaction focus-ring"
            >
              <span className="flex items-center gap-3 font-medium">
                <RobotIcon className="h-5 w-5 text-cyan-400" />
                اسأل الرفيق البطل
              </span>
              <SparkIcon className="h-4 w-4 text-cyan-400" />
            </button>

            <div className="flex-1 overflow-y-auto pr-1">
              {renderNavigationLinks(() => setMobileMenuOpen(false))}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <button
                onClick={() => { setMobileMenuOpen(false); signOut(); }}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-400 hover:bg-rose-500/20 transition-all"
              >
                <LogOutIcon className="h-4 w-4" />
                تسجيل الخروج
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Glass Sidebar */}
      <aside className="sticky top-8 hidden h-[calc(100vh-4rem)] w-80 shrink-0 flex-col overflow-hidden rounded-3xl border border-white/15 liquid-glass-glow z-10 animate-fade-rise lg:flex">
        {/* Sidebar Brand Header */}
        <div className="border-b border-white/10 p-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="relative h-12 w-12 overflow-hidden rounded-full border border-white/20 shadow-md">
              <Image src="/images/logo.png" alt="الشعار" fill sizes="48px" className="object-cover" priority />
            </span>
            <span className="text-right">
              <span className="block text-2xl font-display tracking-tight text-foreground">منصة البكالوريا</span>
              <span className="text-[11px] text-muted-foreground">التعلم السينمائي التفاعلي</span>
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* AI Helper Banner */}
          <div className="liquid-glass rounded-2xl p-4 border border-white/10 space-y-3 animate-fade-rise-delay hover-lift">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">المساعد الذكي</p>
                <h3 className="text-lg font-display text-foreground">الرفيق البطل</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                <RobotIcon className="h-5 w-5" />
              </div>
            </div>
            <button
              onClick={() => setAiOpen(true)}
              className="liquid-glass-glow w-full py-2.5 rounded-xl text-xs text-foreground font-medium hover:scale-[1.02] smooth-interaction focus-ring inline-flex items-center justify-center gap-2"
            >
              <SparkIcon className="h-4 w-4 text-cyan-400" />
              افتح المحادثة الذكية
            </button>
          </div>

          {renderNavigationLinks()}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-white/10 p-4">
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-400 hover:bg-rose-500/20 smooth-interaction focus-ring"
          >
            <LogOutIcon className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto pt-6 lg:pt-0 relative z-10 animate-fade-rise-delay">
        {children}
      </main>


      {/* AI Assistant Drawer */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-xl animate-fade-scale-in">
          <button className="absolute inset-0 h-full w-full cursor-default" onClick={() => setAiOpen(false)} />
          <div className="relative flex h-full w-full max-w-md flex-col justify-between border-l border-white/15 bg-[#001420] p-6 shadow-2xl animate-scale-in">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400">
                  <RobotIcon className="h-6 w-6" />
                </span>
                <div>
                  <h4 className="text-xl font-display text-foreground">الرفيق البطل</h4>
                  <span className="text-xs text-muted-foreground">مساعد دراسي ذكي للبكالوريا</span>
                </div>
              </div>

              <button
                onClick={() => setAiOpen(false)}
                className="liquid-glass p-2 rounded-full text-muted-foreground hover:text-foreground"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 flex-1 space-y-4 overflow-y-auto pr-1">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-4 text-sm font-medium leading-relaxed border animate-slide-up-soft ${msg.sender === 'ai'
                      ? 'liquid-glass border-white/10 text-foreground'
                      : 'bg-cyan-500/20 border-cyan-400/30 text-white self-end'
                    }`}
                >
                  <p className="mb-1 text-[10px] text-muted-foreground">
                    {msg.sender === 'ai' ? 'الرفيق البطل' : 'أنا'}
                  </p>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
              {isTyping && (
                <div className="liquid-glass rounded-2xl p-4 text-xs text-muted-foreground animate-pulse">
                  الرفيق البطل يحلل السؤال ويكتب إجابة دقيقة...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* AI Shortcut Buttons */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAskAI('تكامل وقوانين الرياضيات')}
                className="liquid-glass py-2.5 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:-translate-y-0.5 focus-ring inline-flex items-center justify-center gap-2"
              >
                <MathIcon className="h-3.5 w-3.5" /> الرياضيات
              </button>
              <button
                onClick={() => handleAskAI('قوانين الفيزياء')}
                className="liquid-glass py-2.5 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:-translate-y-0.5 focus-ring inline-flex items-center justify-center gap-2"
              >
                <LightningIcon className="h-3.5 w-3.5 text-cyan-400" /> الفيزياء
              </button>
              <button
                onClick={() => handleAskAI('ثوابت وقوانين الكيمياء')}
                className="liquid-glass py-2.5 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:-translate-y-0.5 focus-ring inline-flex items-center justify-center gap-2"
              >
                <ChemistryIcon className="h-3.5 w-3.5" /> الكيمياء
              </button>
              <button
                onClick={() => handleAskAI('نصائح لتنظيم الوقت')}
                className="liquid-glass py-2.5 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:-translate-y-0.5 focus-ring inline-flex items-center justify-center gap-2"
              >
                <ClockIcon className="h-3.5 w-3.5" /> تنظيم الوقت
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAI(inputValue);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                required
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="اسألني أي شيء في المنهاج..."
                className="min-w-0 flex-1 liquid-glass rounded-2xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus-ring"
              />
              <button
                type="submit"
                className="liquid-glass-glow rounded-2xl px-5 py-3 text-sm font-medium text-foreground hover:scale-105 smooth-interaction focus-ring"
              >
                إرسال
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
