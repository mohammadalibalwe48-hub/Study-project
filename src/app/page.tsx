'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  Atom,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  FileCheck2,
  FunctionSquare,
  Menu,
  MessageCircle,
  Orbit,
  Play,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const mainLinks = [
  { href: '/subjects', label: 'المواد' },
  { href: '/dashboard/exams', label: 'النماذج الوزارية' },
  { href: '/library', label: 'المكتبة' },
  { href: '/forum', label: 'المجتمع' },
];

const benefits = [
  { icon: BookOpen, number: '01', title: 'اختر مادتك', description: 'كل دروس منهاجك مرتبة في مكان واحد، لتبدأ من النقطة المناسبة لك.' },
  { icon: FileCheck2, number: '02', title: 'تعلّم واختبر', description: 'شروحات واضحة واختبارات قصيرة تساعدك على تثبيت ما تعلمته.' },
  { icon: ChartNoAxesColumnIncreasing, number: '03', title: 'راقب تقدمك', description: 'اعرف إنجازك اليومي وما الذي يحتاج منك إلى مراجعة إضافية.' },
];

const subjects = [
  { name: 'الرياضيات', image: '/images/subject_math.png', color: 'bg-[#ffdc72]', progress: '82%' },
  { name: 'الفيزياء', image: '/images/subject_physics.png', color: 'bg-[#d8bcff]', progress: '68%' },
  { name: 'الكيمياء', image: '/images/subject_chemistry.png', color: 'bg-[#bce9fa]', progress: '75%' },
  { name: 'اللغة العربية', image: '/images/subject_arabic.png', color: 'bg-[#cce6b4]', progress: '91%' },
];

const tickerItems = ['دروس منظمة', 'اختبارات ذكية', 'خطط دراسية', 'نماذج وزارية', 'تقدم محفوظ'];

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const destination = user ? (profile?.role === 'admin' ? '/admin' : '/dashboard') : '/auth';

  return (
    <main className="home-canvas min-h-screen bg-[#b9ced8] p-0 text-[#171714] lg:p-7 xl:p-10" dir="rtl">
      <div className="app-shell home-shell mx-auto min-h-screen max-w-[1480px] overflow-hidden bg-[#fafaf7] lg:min-h-[calc(100vh-3.5rem)] lg:rounded-[32px] xl:min-h-[calc(100vh-5rem)]">
        <header className="home-header sticky top-0 z-50 border-b border-[#d6d4cd] bg-[#fafaf7]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-7">
            <Link href="/" className="group flex items-center gap-3" aria-label="منصة مسار - الرئيسية">
              <span className="home-logo relative h-11 w-11 overflow-hidden rounded-xl border border-[#282825] bg-white">
                <Image src="/images/logo.png" alt="" fill sizes="44px" className="object-contain p-1 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110" priority />
              </span>
              <span className="text-xl font-extrabold">منصة مسار<span className="text-[#ff5636]">.</span></span>
            </Link>
            <nav className="hidden items-center gap-7 md:flex" aria-label="التنقل الرئيسي">
              {mainLinks.map((link, index) => <Link key={link.href} href={link.href} className="home-nav-link text-sm font-bold text-[#5f5f59]" style={{ '--nav-order': index } as React.CSSProperties}>{link.label}</Link>)}
            </nav>
            <div className="flex items-center gap-2">
              {!loading && <Link href={destination} className="app-button home-cta min-h-10 px-4 py-2.5 text-sm">{user ? 'متابعة الدراسة' : 'ابدأ مجانًا'}<ArrowLeft className="h-4 w-4" /></Link>}
              <button onClick={() => setMenuOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#282825] md:hidden" aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}>{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
            </div>
          </div>
          {menuOpen && <nav className="mobile-menu border-t border-[#d6d4cd] px-4 py-3 md:hidden">{mainLinks.map((link, index) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold hover:bg-[#ffd64d]" style={{ '--menu-order': index } as React.CSSProperties}>{link.label}</Link>)}</nav>}
        </header>

        <section className="home-hero relative overflow-hidden border-b-2 border-[#282825]">
          <div className="hero-grid absolute inset-0" aria-hidden="true" />
          <div className="hero-aurora hero-aurora-one" aria-hidden="true" />
          <div className="hero-aurora hero-aurora-two" aria-hidden="true" />
          <div className="hero-orbit hero-orbit-one" aria-hidden="true"><Atom className="h-5 w-5" /></div>
          <div className="hero-orbit hero-orbit-two" aria-hidden="true"><FunctionSquare className="h-5 w-5" /></div>
          <div className="hero-orbit hero-orbit-three" aria-hidden="true"><Orbit className="h-5 w-5" /></div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 lg:min-h-[650px] lg:grid-cols-[1.02fr_.98fr] lg:py-20">
            <div className="hero-copy max-w-2xl">
              <span className="app-chip hero-chip bg-[#ffd64d]"><Sparkles className="h-4 w-4" /> لطلاب البكالوريا السورية <span className="hero-live-dot" /></span>
              <h1 className="hero-title mt-6 text-4xl font-extrabold leading-[1.25] sm:text-5xl lg:text-6xl">
                <span className="hero-line">تعلّم بوضوح،</span>
                <span className="hero-line hero-line-accent block text-[#ff5636]">وتقدّم بثبات.</span>
              </h1>
              <p className="hero-description mt-6 max-w-xl text-base leading-8 text-[#5f5f59] sm:text-lg">دروسك، اختباراتك، وخطتك الدراسية في تجربة واحدة بسيطة وملهمة تساعدك على التركيز والوصول إلى هدفك.</p>
              <div className="hero-actions mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={destination} className="app-button home-cta px-6">{user ? 'تابع من حيث توقفت' : 'أنشئ حسابك وابدأ'}<ArrowLeft className="h-5 w-5" /></Link>
                <Link href="/subjects" className="app-button app-button-secondary group px-6"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffd64d]"><Play className="h-3.5 w-3.5 fill-current transition-transform group-hover:scale-125" /></span>تصفح المواد</Link>
              </div>
              <p className="hero-meta mt-5 flex flex-wrap items-center gap-2 text-xs font-bold text-[#77776f]"><span>تسجيل مجاني</span><i /> <span>يعمل على الهاتف</span><i /> <span>تقدم محفوظ تلقائيًا</span></p>
            </div>

            <div className="hero-stage relative mx-auto w-full max-w-[590px]" data-reveal>
              <div className="hero-stage-shadow absolute inset-4 rounded-[34px] bg-[#ffd64d]" aria-hidden="true" />
              <div className="hero-browser relative rounded-[30px] border-2 border-[#282825] bg-[#282825] p-3">
                <div className="overflow-hidden rounded-[21px] border border-[#282825] bg-[#dcbcff]">
                  <div className="flex items-center justify-between border-b border-[#282825] bg-white px-4 py-3">
                    <div className="flex items-center gap-2"><span className="browser-dot bg-[#ff5636]" /><span className="browser-dot bg-[#ffd64d]" /><span className="browser-dot bg-[#bce9fa]" /></div>
                    <span className="text-[10px] font-extrabold text-[#77776f]">مساري اليوم</span>
                  </div>
                  <div className="grid gap-3 p-5 sm:grid-cols-2">
                    {subjects.map((subject, index) => (
                      <Link key={subject.name} href="/subjects" className={`subject-tile group rounded-2xl border border-[#282825] p-4 ${subject.color}`} style={{ '--tile-order': index } as React.CSSProperties}>
                        <div className="flex items-start justify-between">
                          <Image src={subject.image} alt="" width={80} height={80} className="h-16 w-16 object-contain" />
                          <span className="subject-progress text-[10px] font-extrabold">{subject.progress}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between"><strong>{subject.name}</strong><span className="subject-arrow flex h-8 w-8 items-center justify-center rounded-full border border-[#282825] bg-white"><ArrowLeft className="h-4 w-4" /></span></div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <div className="hero-sticker absolute -bottom-5 -right-2 rounded-xl border-2 border-[#282825] bg-[#ff5636] px-4 py-2 text-sm font-extrabold text-white shadow-[4px_4px_0_#282825]">كل شيء في مكان واحد!</div>
              <div className="hero-score absolute -left-3 top-16 hidden rounded-xl border-2 border-[#282825] bg-white p-3 shadow-[4px_4px_0_#282825] sm:block"><strong className="block text-lg">+25</strong><span className="text-[10px] font-bold text-[#77776f]">نقطة إنجاز ✦</span></div>
            </div>
          </div>
        </section>

        <div className="ticker overflow-hidden border-b-2 border-[#282825] bg-[#ffd64d] py-3" aria-label="مزايا منصة مسار">
          <div className="ticker-track flex w-max items-center gap-7">
            {[...tickerItems, ...tickerItems].map((item, index) => <span key={`${item}-${index}`} className="flex items-center gap-7 whitespace-nowrap text-sm font-extrabold"><Sparkles className="h-4 w-4 text-[#ff5636]" />{item}</span>)}
          </div>
        </div>

        <section className="steps-section relative mx-auto max-w-7xl overflow-hidden px-5 py-20 sm:px-8">
          <div className="steps-squiggle" aria-hidden="true" />
          <div className="mb-10 max-w-2xl" data-reveal><span className="app-chip">كيف تستخدم مسار؟</span><h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">ثلاث خطوات نحو <span className="relative text-[#ff5636]">إنجاز أكبر<span className="title-sketch" aria-hidden="true" /></span></h2></div>
          <div className="grid gap-5 md:grid-cols-3">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              const colors = ['bg-[#ffdc72]', 'bg-[#d8bcff]', 'bg-[#bce9fa]'];
              return <article key={benefit.title} className={`step-card app-card group p-6 ${colors[index]}`} data-reveal style={{ '--card-order': index } as React.CSSProperties}><div className="flex items-center justify-between"><span className="step-icon flex h-12 w-12 items-center justify-center rounded-xl border border-[#282825] bg-white"><Icon className="h-5 w-5" /></span><strong className="step-number text-4xl text-[#282825]/25">{benefit.number}</strong></div><h3 className="mt-6 text-xl font-extrabold">{benefit.title}</h3><p className="mt-2 text-sm leading-7 text-[#5f5f59]">{benefit.description}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold opacity-0 transition-all group-hover:translate-x-[-4px] group-hover:opacity-100">ابدأ الخطوة <ArrowLeft className="h-4 w-4" /></span></article>;
            })}
          </div>
        </section>

        <section className="home-final-cta relative overflow-hidden border-y-2 border-[#282825] bg-[#282825] text-white">
          <div className="cta-beam" aria-hidden="true" />
          <div className="cta-star cta-star-one" aria-hidden="true">✦</div><div className="cta-star cta-star-two" aria-hidden="true">✦</div>
          <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center" data-reveal><div><p className="flex items-center gap-2 text-sm font-bold text-[#ffd64d]"><span className="hero-live-dot bg-[#ffd64d]" /> ابدأ خطتك اليوم</p><h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">جاهز لتحويل الدراسة إلى مسار واضح؟</h2><p className="mt-2 text-sm text-white/65">أنشئ حسابك وابدأ أول درس خلال دقائق.</p></div><Link href={destination} className="app-button home-cta px-7">ابدأ الآن <ArrowLeft className="h-5 w-5" /></Link></div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-4 px-5 py-7 text-sm text-[#6e6e67] sm:flex-row sm:px-8"><span>منصة مسار التعليمية — تعلّم بوضوح وتقدّم بثبات</span><Link href="/support" className="group flex items-center gap-2 font-bold hover:text-[#ff5636]"><MessageCircle className="h-4 w-4 transition-transform group-hover:-rotate-12 group-hover:scale-110" /> الدعم والمساعدة</Link></footer>
      </div>
    </main>
  );
}
