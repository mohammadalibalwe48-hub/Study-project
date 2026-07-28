'use client';

import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  BookOpen,
  Bookmark,
  Bot,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  FileCheck2,
  FolderOpen,
  GraduationCap,
  Grid2X2,
  Headphones,
  Home,
  Library,
  LogOut,
  Menu,
  MessageCircle,
  Radio,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  UserRound,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof Home;
  group?: 'core' | 'tools' | 'community';
  adminOnly?: boolean;
};

type ChatMessage = { sender: 'ai' | 'user'; text: string };

interface SidebarLayoutProps {
  children: ReactNode;
  role?: 'student' | 'admin';
  signOut: () => Promise<void>;
}

const navigation: NavigationItem[] = [
  { label: 'الرئيسية', href: '/dashboard', icon: Home, group: 'core' },
  { label: 'المواد', href: '/subjects', icon: FolderOpen, group: 'core' },
  { label: 'الاختبارات', href: '/dashboard/exams', icon: FileCheck2, group: 'core' },
  { label: 'المخطط', href: '/dashboard/planner', icon: CalendarDays, group: 'core' },
  
  { label: 'البث المباشر', href: '/live-rooms', icon: Radio, group: 'tools' },
  { label: 'التحليلات', href: '/dashboard/analytics', icon: ChartNoAxesColumnIncreasing, group: 'tools' },
  { label: 'البطاقات', href: '/dashboard/flashcards', icon: Grid2X2, group: 'tools' },
  { label: 'المحفوظات', href: '/dashboard/bookmarks', icon: Bookmark, group: 'tools' },
  { label: 'المكتبة', href: '/library', icon: Library, group: 'tools' },

  { label: 'المدرسون', href: '/mentors', icon: UserCheck, group: 'community' },
  { label: 'المجتمع', href: '/forum', icon: MessageCircle, group: 'community' },
  { label: 'الصدارة والأوائل', href: '/leaderboard', icon: Trophy, group: 'community' },
  { label: 'الملف الشخصي', href: '/profile', icon: UserRound, group: 'community' },
  { label: 'الدعم الفني', href: '/support', icon: CircleHelp, group: 'community' },
  { label: 'باقات الاشتراك', href: '/pricing', icon: Sparkles, group: 'community' },
  { label: 'الإدارة', href: '/admin', icon: ShieldCheck, adminOnly: true },
];

function DesktopNavigation({ items, pathname }: { items: NavigationItem[]; pathname: string }) {
  const itemIsActive = (href: string) => href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex flex-1 flex-col items-center gap-2 py-3 overflow-y-auto max-h-[calc(100vh-220px)] w-full px-1 scrollbar-none" aria-label="التنقل الرئيسي">
      {items.map((item) => {
        const Icon = item.icon;
        const active = itemIsActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            title={item.label}
            className={`group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
              active
                ? 'border-[#ff5636] bg-[#ff5636] text-white shadow-md'
                : 'border-transparent text-[#5c5c56] hover:border-[#deddd7] hover:bg-[#eeeDE7] hover:text-[#171714]'
            }`}
          >
            <Icon className="h-[19px] w-[19px]" strokeWidth={2} />
            <span className="pointer-events-none absolute right-[calc(100%+12px)] z-30 hidden whitespace-nowrap rounded-lg border border-[#282825] bg-[#282825] px-3 py-1.5 text-xs font-bold text-white shadow-xl group-hover:block">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function SidebarLayout({ children, role, signOut }: SidebarLayoutProps) {
  const { profile } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: 'أهلًا! أنا رفيقك الدراسي. اسألني عن أي نقطة في المنهاج السوري وسأشرحها لك ببساطة.' },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = menuOpen || aiOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen, aiOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const visibleNavigation = navigation.filter((item) => !item.adminOnly || role === 'admin');

  const coreItems = visibleNavigation.filter((i) => i.group === 'core');
  const toolItems = visibleNavigation.filter((i) => i.group === 'tools');
  const communityItems = visibleNavigation.filter((i) => i.group === 'community' || !i.group);

  const itemIsActive = (href: string) => href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  async function askAI(event: FormEvent) {
    event.preventDefault();
    const prompt = query.trim().slice(0, 500);
    if (!prompt || isTyping) return;

    const nextMessages: ChatMessage[] = [...messages, { sender: 'user', text: prompt }];
    setMessages(nextMessages);
    setQuery('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await response.json();
      setMessages((current) => [...current, {
        sender: 'ai',
        text: data.reply || 'يمكنني مساعدتك في شرح الدروس، حل المسائل، أو وضع خطة مراجعة مناسبة.',
      }]);
    } catch {
      setMessages((current) => [...current, { sender: 'ai', text: 'تعذر الاتصال الآن. حاول مرة أخرى بعد قليل.' }]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#b9ced8] p-0 text-[#171714] lg:p-6 xl:p-8" dir="rtl">
      <div className="app-shell relative mx-auto flex min-h-screen w-full max-w-[1480px] overflow-hidden bg-[#fafaf7] lg:min-h-[calc(100vh-3rem)] lg:rounded-[28px]">
        
        {/* LIGHT DESKTOP SIDEBAR */}
        <aside className="hidden w-[76px] shrink-0 flex-col items-center border-l border-[#deddd7] bg-[#f5f4ee] py-4 lg:flex">
          <Link href="/dashboard" className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[#282825] bg-white shadow-sm" aria-label="مسار - الرئيسية">
            <Image src="/images/logo.png" alt="" fill sizes="44px" className="object-contain p-1" priority />
          </Link>

          <DesktopNavigation items={visibleNavigation} pathname={pathname} />

          <div className="mt-auto flex flex-col items-center gap-2">
            <button onClick={() => setAiOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#deddd7] bg-white text-[#171714] hover:border-[#ff5636] hover:bg-[#ffd64d]" title="المساعد الذكي">
              <Headphones className="h-[19px] w-[19px]" />
            </button>
            <Link href="/support" className="flex h-11 w-11 items-center justify-center rounded-xl text-[#5c5c56] hover:bg-[#eeeDE7] hover:text-[#171714]" title="المساعدة"><CircleHelp className="h-[19px] w-[19px]" /></Link>
            <Link href="/profile" className="flex h-11 w-11 items-center justify-center rounded-xl text-[#5c5c56] hover:bg-[#eeeDE7] hover:text-[#171714]" title="الإعدادات"><Settings className="h-[19px] w-[19px]" /></Link>
            <button onClick={signOut} className="flex h-11 w-11 items-center justify-center rounded-xl text-[#5c5c56] hover:bg-[#ff5636] hover:text-white" title="تسجيل الخروج"><LogOut className="h-[19px] w-[19px]" /></button>
          </div>
        </aside>

        {/* MAIN SHELL */}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex min-h-[76px] items-center gap-3 border-b border-[#d6d4cd] bg-[#fafaf7]/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <button onClick={() => setMenuOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#282825] bg-white lg:hidden" aria-label="فتح القائمة"><Menu className="h-5 w-5" /></button>
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <span className="text-lg font-extrabold">مسار</span><span className="h-2 w-2 rounded-full bg-[#ff5636]" />
            </Link>
            <div className="hidden min-w-0 items-center text-xs text-[#77776f] sm:flex">
              <span>مرحبًا بك في</span><strong className="mr-1 text-base text-[#ff5636]">مسار</strong>
            </div>
            <label className="relative mr-auto hidden w-full max-w-[330px] sm:block">
              <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77776f]" />
              <input className="h-11 w-full rounded-xl border border-[#9d9c95] bg-white pr-10 pl-4 text-sm outline-none focus:border-[#ff5636]" placeholder="ابحث في دروسك..." />
            </label>
            <button className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#9d9c95] bg-white mr-auto sm:mr-0" aria-label="الإشعارات"><Bell className="h-[18px] w-[18px]" /><span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-[#ff5636]" /></button>
            <Link href="/profile" className="flex items-center gap-2 rounded-full py-1 pr-1 pl-2 hover:bg-[#efeee8]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#282825] bg-[#dcbcff] text-sm font-extrabold">
                {profile?.full_name?.charAt(0) || 'م'}
              </span>
              <span className="hidden text-right md:block">
                <strong className="block text-xs">{profile?.full_name || 'طالب مسار'}</strong>
                <small className="block text-[10px] text-[#77776f]">البكالوريا السورية</small>
              </span>
            </Link>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </section>
      </div>

      {/* SIMPLIFIED MOBILE DRAWER */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0" onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة" />
          <aside className="absolute inset-y-0 right-0 w-[min(88vw,360px)] overflow-y-auto border-l-2 border-[#282825] bg-[#fafaf7] p-5 shadow-2xl space-y-6 text-right">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b-2 border-[#282825]/10 pb-4">
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-3">
                <span className="relative h-10 w-10 overflow-hidden rounded-xl border-2 border-[#282825] bg-white shadow-[2px_2px_0_#282825]">
                  <Image src="/images/logo.png" alt="" fill sizes="40px" className="object-contain p-1" />
                </span>
                <strong className="text-lg font-black text-[#282825]">منصة مسار</strong>
              </Link>
              <button onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#282825] bg-white hover:bg-[#ff5636] hover:text-white transition-colors cursor-pointer" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* AI Assistant Banner */}
            <button onClick={() => { setMenuOpen(false); setAiOpen(true); }} className="flex w-full items-center gap-3 rounded-2xl border-2 border-[#282825] bg-[#ffd64d] p-4 shadow-[3px_3px_0_#282825] hover:shadow-[4px_4px_0_#282825] transition-all cursor-pointer">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#282825] text-white shrink-0"><Bot className="h-5 w-5" /></span>
              <span className="text-right"><strong className="block text-sm font-black text-[#282825]">اسأل رفيق مسار الذكي</strong><small className="text-[#5f5f59] font-bold">شرح فوري وإجابات امتحانية</small></span>
            </button>

            {/* Core Section (2x2 Grid) */}
            <div className="space-y-2">
              <span className="text-xs font-black text-[#77776f] block px-1">الأقسام الأساسية</span>
              <div className="grid grid-cols-2 gap-2">
                {coreItems.map((item) => {
                  const Icon = item.icon;
                  const active = itemIsActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl border-2 p-3 text-xs font-extrabold transition-all ${
                        active
                          ? 'border-[#282825] bg-[#ff5636] text-white shadow-[2px_2px_0_#282825]'
                          : 'border-[#282825]/20 bg-white text-[#282825] hover:bg-[#bce9fa] shadow-[1.5px_1.5px_0_#282825]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Study Tools Group */}
            <div className="space-y-2">
              <span className="text-xs font-black text-[#77776f] block px-1">أدوات الدراسة والتحليل</span>
              <div className="grid grid-cols-1 gap-2">
                {toolItems.map((item) => {
                  const Icon = item.icon;
                  const active = itemIsActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-xs font-bold transition-all ${
                        active
                          ? 'border-[#282825] bg-[#ff5636] text-white shadow-[2px_2px_0_#282825]'
                          : 'border-transparent bg-[#f1f0eb] text-[#282825] hover:bg-[#eeeDE7]'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-[#ff5636] shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Community & Services Group */}
            <div className="space-y-2">
              <span className="text-xs font-black text-[#77776f] block px-1">المجتمع والخدمات</span>
              <div className="grid grid-cols-1 gap-2">
                {communityItems.map((item) => {
                  const Icon = item.icon;
                  const active = itemIsActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-xs font-bold transition-all ${
                        active
                          ? 'border-[#282825] bg-[#ff5636] text-white shadow-[2px_2px_0_#282825]'
                          : 'border-transparent bg-[#f1f0eb] text-[#282825] hover:bg-[#eeeDE7]'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-[#7c3aed] shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sign Out Button */}
            <button onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#282825] bg-[#ff5636] px-4 py-3 text-xs font-black text-white shadow-[2px_2px_0_#282825] hover:shadow-[3.5px_3.5px_0_#282825] transition-all cursor-pointer">
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </button>
          </aside>
        </div>
      )}

      {/* AI CHAT MODAL */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="المساعد الدراسي">
          <button className="absolute inset-0" onClick={() => setAiOpen(false)} aria-label="إغلاق المساعد" />
          <section className="relative flex h-full w-full max-w-[480px] flex-col border-r-2 border-[#282825] bg-[#fafaf7] shadow-2xl">
            <header className="flex items-center justify-between border-b-2 border-[#282825] bg-[#ffd64d] p-5">
              <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#282825] bg-[#282825] text-[#ffd64d]"><Bot className="h-6 w-6" /></span><span><strong className="block text-base font-black text-[#282825]">رفيق مسار الذكي</strong><small className="text-[#5f5f59] font-bold">متصل ومستعد للمساعدة</small></span></div>
              <button onClick={() => setAiOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#282825] bg-white cursor-pointer hover:bg-[#ff5636] hover:text-white transition-colors" aria-label="إغلاق"><X className="h-5 w-5" /></button>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto p-5 bg-dot-pattern-dense">
              {messages.map((message, index) => (
                <div key={index} className={`max-w-[88%] rounded-2xl border-2 border-[#282825] p-4 text-sm leading-7 transition-transform hover:scale-[1.01] ${message.sender === 'user' ? 'mr-auto bg-[#dcbcff] shadow-[3px_3px_0_#282825]' : 'ml-auto bg-white shadow-[3px_3px_0_#282825]'}`}>
                  <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black text-[#282825] border-b border-[#282825]/10 pb-1">{message.sender === 'ai' ? <><Sparkles className="h-3 w-3 text-[#ff5636]" /> رفيق مسار الذكي</> : <><UserRound className="h-3 w-3 text-[#7c3aed]" /> أنت</>}</span>
                  <div className="font-semibold text-[#282825]">{message.text}</div>
                </div>
              ))}
              {isTyping && (
                <div className="ml-auto max-w-[88%] rounded-2xl border-2 border-[#282825] bg-white p-4 text-xs font-bold shadow-[3px_3px_0_#282825] animate-pulse text-[#ff5636]">
                  جاري التفكير والتوضيح... 🤖
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={askAI} className="border-t-2 border-[#282825] bg-white p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="اطرح أي سؤال في البكالوريا..."
                  className="w-full rounded-xl border-2 border-[#282825] bg-[#fafaf7] p-3 text-xs font-semibold placeholder-[#77776f] focus:outline-none focus:border-[#ff5636]"
                />
                <button
                  type="submit"
                  disabled={isTyping || !query.trim()}
                  className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-5 py-2.5 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[3.5px_3.5px_0_#282825] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <span>أرسل</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
