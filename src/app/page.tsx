'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, BookOpen, ChartNoAxesColumnIncreasing, FileCheck2, Menu, MessageCircle, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const mainLinks = [
  { href: '/subjects', label: 'المواد' },
  { href: '/dashboard/exams', label: 'النماذج الوزارية' },
  { href: '/library', label: 'المكتبة' },
  { href: '/forum', label: 'المجتمع' },
];

const benefits = [
  {
    icon: BookOpen,
    title: 'ادرس درسًا واحدًا',
    description: 'اختر مادتك وابدأ من الدرس المناسب لمستواك دون البحث بين عشرات الخيارات.',
  },
  {
    icon: FileCheck2,
    title: 'اختبر فهمك',
    description: 'حل اختبارًا قصيرًا أو نموذجًا وزاريًا واحصل على نتيجتك مباشرة.',
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: 'اعرف خطوتك التالية',
    description: 'تابع تقدمك وارجع إلى النقاط التي تحتاج إلى مراجعة فقط.',
  },
];

const subjectLinks = [
  { name: 'الرياضيات', image: '/images/subject_math.png' },
  { name: 'الفيزياء', image: '/images/subject_physics.png' },
  { name: 'الكيمياء', image: '/images/subject_chemistry.png' },
  { name: 'اللغة العربية', image: '/images/subject_arabic.png' },
];

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const destination = user ? (profile?.role === 'admin' ? '/admin' : '/dashboard') : '/auth';

  return (
    <main className="min-h-screen text-foreground" dir="rtl">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071a2b]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="منصة مسار - الرئيسية">
            <Image src="/images/logo.png" alt="" width={40} height={40} className="rounded-xl" priority />
            <span className="text-lg font-extrabold">منصة مسار</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="التنقل الرئيسي">
            {mainLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-semibold text-slate-300 hover:text-cyan-300">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!loading && (
              <Link href={destination} className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300">
                {user ? 'متابعة الدراسة' : 'ابدأ مجانًا'}
              </Link>
            )}
            <button onClick={() => setMenuOpen((open) => !open)} className="rounded-xl border border-white/10 p-2.5 text-white md:hidden" aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'} aria-expanded={menuOpen}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-white/10 px-4 py-3 md:hidden" aria-label="قائمة الهاتف">
            <div className="mx-auto grid max-w-6xl gap-1">
              {mainLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <section className="relative isolate overflow-hidden border-b border-white/10">
        <video autoPlay loop muted playsInline preload="auto" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover">
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-10 bg-gradient-to-l from-[#071a2b]/80 via-[#071a2b]/50 to-[#071a2b]/25" />
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
          <div className="max-w-2xl">
            <span className="mb-5 inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1.5 text-sm font-bold text-cyan-300">
              لطلاب البكالوريا السورية
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.25] sm:text-5xl lg:text-6xl">
              كل ما تحتاجه للدراسة،
              <span className="block text-cyan-300">في مسار واضح وبسيط.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              اختر المادة، ادرس الدرس، ثم اختبر نفسك. مسار تجمع لك الدروس والنماذج والملخصات دون تشتيت.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={destination} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-300">
                {user ? 'تابع من حيث توقفت' : 'أنشئ حسابك وابدأ'}
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <Link href="/subjects" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-bold text-white hover:bg-white/10">
                تصفح المواد
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">تسجيل مجاني • يعمل على الهاتف • تقدم محفوظ تلقائيًا</p>
          </div>

          <div className="liquid-glass-glow rounded-3xl p-5 sm:p-7">
            <p className="mb-4 text-sm font-bold text-slate-300">اختر مادة لتبدأ</p>
            <div className="grid grid-cols-2 gap-3">
              {subjectLinks.map((subject) => (
                <Link key={subject.name} href="/subjects" className="group rounded-2xl border border-white/10 bg-white/[.035] p-4 hover:border-cyan-400/40 hover:bg-cyan-400/[.06]">
                  <Image src={subject.image} alt="" width={72} height={72} className="mb-3 h-14 w-14 object-contain" />
                  <span className="font-bold group-hover:text-cyan-300">{subject.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0a1f31]/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-9 max-w-2xl">
            <p className="text-sm font-bold text-cyan-300">كيف تستخدم المنصة؟</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">ثلاث خطوات فقط</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <article key={benefit.title} className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/12 text-cyan-300"><Icon className="h-5 w-5" /></span>
                    <span className="text-sm font-bold text-slate-500">0{index + 1}</span>
                  </div>
                  <h3 className="text-lg font-bold">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{benefit.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-extrabold">تحتاج مساعدة في اختيار البداية؟</h2>
          <p className="mt-2 text-slate-400">فريق الدعم والمجتمع التعليمي جاهزان لمساعدتك.</p>
        </div>
        <Link href="/support" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 font-bold hover:bg-white/5">
          <MessageCircle className="h-5 w-5 text-cyan-300" /> تواصل معنا
        </Link>
      </section>

      <footer className="border-t border-white/10 px-4 py-7 text-center text-sm text-slate-500">
        منصة مسار التعليمية — تعلّم بوضوح وتقدّم بثبات
      </footer>
    </main>
  );
}
