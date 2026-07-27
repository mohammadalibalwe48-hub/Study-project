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
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof Home;
  adminOnly?: boolean;
};

type ChatMessage = { sender: 'ai' | 'user'; text: string };

interface SidebarLayoutProps {
  children: ReactNode;
  role?: 'student' | 'admin';
  signOut: () => Promise<void>;
}

function NavigationLinks({
  items,
  pathname,
  mobile = false,
  onNavigate,
}: {
  items: NavigationItem[];
  pathname: string;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const itemIsActive = (href: string) => href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className={mobile ? 'grid gap-2' : 'flex flex-1 flex-col items-center gap-2 py-3'} aria-label="التنقل الرئيسي">
      {items.map((item) => {
        const Icon = item.icon;
        const active = itemIsActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            title={item.label}
            className={
              mobile
                ? `flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold transition ${active ? 'border-[#ff5636] bg-[#ff5636] text-white' : 'border-transparent bg-[#f1f0eb] text-[#171714] hover:bg-[#e4e2d9]'}`
                : `group relative flex h-11 w-11 items-center justify-center rounded-xl border transition ${active ? 'border-[#ff5636] bg-[#ff5636] text-white shadow-md' : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white'}`
            }
          >
            <Icon className="h-[19px] w-[19px]" strokeWidth={2} />
            {mobile && <span>{item.label}</span>}
            {!mobile && (
              <span className="pointer-events-none absolute right-[calc(100%+12px)] z-30 hidden whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-100 shadow-xl group-hover:block">
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

const navigation: NavigationItem[] = [
  { label: 'الرئيسية', href: '/dashboard', icon: Home },
  { label: 'المواد', href: '/subjects', icon: FolderOpen },
  { label: 'الاختبارات', href: '/dashboard/exams', icon: FileCheck2 },
  { label: 'المخطط', href: '/dashboard/planner', icon: CalendarDays },
  { label: 'التحليلات', href: '/dashboard/analytics', icon: ChartNoAxesColumnIncreasing },
  { label: 'البطاقات', href: '/dashboard/flashcards', icon: Grid2X2 },
  { label: 'المحفوظات', href: '/dashboard/bookmarks', icon: Bookmark },
  { label: 'المكتبة', href: '/library', icon: Library },
  { label: 'المجتمع', href: '/forum', icon: MessageCircle },
  { label: 'الإدارة', href: '/admin', icon: ShieldCheck, adminOnly: true },
];

export default function SidebarLayout({ children, role, signOut }: SidebarLayoutProps) {
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
        <aside className="hidden w-[76px] shrink-0 flex-col items-center border-l border-slate-800 bg-[#0f172a] py-4 lg:flex">
          <Link href="/dashboard" className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900" aria-label="مسار - الرئيسية">
            <Image src="/images/logo.png" alt="" fill sizes="44px" className="object-contain p-1" priority />
          </Link>
          <NavigationLinks items={visibleNavigation} pathname={pathname} />
          <div className="mt-auto flex flex-col items-center gap-2">
            <button onClick={() => setAiOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white" title="المساعد الذكي">
              <Headphones className="h-[19px] w-[19px]" />
            </button>
            <Link href="/support" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white" title="المساعدة"><CircleHelp className="h-[19px] w-[19px]" /></Link>
            <Link href="/profile" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white" title="الإعدادات"><Settings className="h-[19px] w-[19px]" /></Link>
            <button onClick={signOut} className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-[#ff5636] hover:text-white" title="تسجيل الخروج"><LogOut className="h-[19px] w-[19px]" /></button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex min-h-[76px] items-center gap-3 border-b border-[#d6d4cd] bg-[#fafaf7]/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <button onClick={() => setMenuOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#282825] lg:hidden" aria-label="فتح القائمة"><Menu className="h-5 w-5" /></button>
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
            <button className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#9d9c95] bg-white" aria-label="الإشعارات"><Bell className="h-[18px] w-[18px]" /><span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-[#ff5636]" /></button>
            <Link href="/profile" className="flex items-center gap-2 rounded-full py-1 pr-1 pl-2 hover:bg-[#efeee8]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#282825] bg-[#dcbcff] text-sm font-extrabold">م</span>
              <span className="hidden text-right md:block"><strong className="block text-xs">طالب مسار</strong><small className="block text-[10px] text-[#77776f]">البكالوريا السورية</small></span>
            </Link>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </section>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0" onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة" />
          <aside className="absolute inset-y-0 right-0 w-[min(86vw,350px)] overflow-y-auto border-l-2 border-[#282825] bg-[#fafaf7] p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-[#d6d4cd] pb-4">
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-3"><span className="relative h-10 w-10 overflow-hidden rounded-xl border border-[#282825] bg-white"><Image src="/images/logo.png" alt="" fill sizes="40px" className="object-contain p-1" /></span><strong className="text-xl">منصة مسار</strong></Link>
              <button onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#282825]" aria-label="إغلاق"><X className="h-5 w-5" /></button>
            </div>
            <button onClick={() => { setMenuOpen(false); setAiOpen(true); }} className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-[#282825] bg-[#ffd64d] p-4 text-right">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#282825] text-white"><Bot className="h-5 w-5" /></span>
              <span><strong className="block text-sm">اسأل رفيقك الذكي</strong><small className="text-[#676760]">شرح فوري لأي نقطة</small></span>
            </button>
            <NavigationLinks items={visibleNavigation} pathname={pathname} mobile onNavigate={() => setMenuOpen(false)} />
            <button onClick={signOut} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#282825] bg-[#ff5636] px-4 py-3 text-sm font-bold text-white"><LogOut className="h-4 w-4" /> تسجيل الخروج</button>
          </aside>
        </div>
      )}

      {aiOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="المساعد الدراسي">
          <button className="absolute inset-0" onClick={() => setAiOpen(false)} aria-label="إغلاق المساعد" />
          <section className="relative flex h-full w-full max-w-[480px] flex-col border-r-2 border-[#282825] bg-[#fafaf7] shadow-2xl">
            <header className="flex items-center justify-between border-b-2 border-[#282825] bg-[#ffd64d] p-5">
              <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#282825] bg-[#282825] text-white"><Bot className="h-6 w-6" /></span><span><strong className="block">رفيق مسار الذكي</strong><small>متصل ومستعد للمساعدة</small></span></div>
              <button onClick={() => setAiOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#282825] bg-white" aria-label="إغلاق"><X className="h-5 w-5" /></button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.map((message, index) => (
                <div key={index} className={`max-w-[88%] rounded-2xl border border-[#282825] p-4 text-sm leading-7 ${message.sender === 'user' ? 'mr-auto bg-[#dcbcff]' : 'ml-auto bg-white'}`}>
                  <span className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold text-[#6e6e67]">{message.sender === 'ai' ? <><Sparkles className="h-3 w-3" /> رفيق مسار</> : <><UserRound className="h-3 w-3" /> أنت</>}</span>
                  {message.text}
                </div>
              ))}
              {isTyping && <div className="ml-auto w-fit rounded-2xl border border-[#282825] bg-white px-4 py-3 text-xs font-bold">يفكر في الإجابة...</div>}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t border-[#d6d4cd] p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {['اشرح لي هذا الدرس', 'ضع خطة مراجعة', 'اختبرني بسؤال'].map((suggestion) => <button key={suggestion} onClick={() => setQuery(suggestion)} className="rounded-full border border-[#9d9c95] bg-white px-3 py-1.5 text-[11px] font-bold hover:border-[#282825]">{suggestion}</button>)}
              </div>
              <form onSubmit={askAI} className="flex gap-2">
                <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={500} className="app-input min-w-0 flex-1 text-sm" placeholder="اكتب سؤالك هنا..." />
                <button disabled={!query.trim() || isTyping} className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-[#282825] bg-[#ff5636] text-white" aria-label="إرسال"><Send className="h-5 w-5" /></button>
              </form>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
