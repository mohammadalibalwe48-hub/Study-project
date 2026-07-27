'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, BookOpen, ChartNoAxesColumnIncreasing, FileCheck2, Menu, MessageCircle, Play, Sparkles, X } from 'lucide-react';
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
  { name: 'الرياضيات', image: '/images/subject_math.png', color: 'bg-[#ffdc72]' },
  { name: 'الفيزياء', image: '/images/subject_physics.png', color: 'bg-[#d8bcff]' },
  { name: 'الكيمياء', image: '/images/subject_chemistry.png', color: 'bg-[#bce9fa]' },
  { name: 'اللغة العربية', image: '/images/subject_arabic.png', color: 'bg-[#cce6b4]' },
];

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const destination = user ? (profile?.role === 'admin' ? '/admin' : '/dashboard') : '/auth';

  return (
    <main className="min-h-screen bg-[#b9ced8] p-0 text-[#171714] lg:p-7 xl:p-10" dir="rtl">
      <div className="app-shell mx-auto min-h-screen max-w-[1480px] overflow-hidden bg-[#fafaf7] lg:min-h-[calc(100vh-3.5rem)] lg:rounded-[32px] xl:min-h-[calc(100vh-5rem)]">
        <header className="sticky top-0 z-50 border-b border-[#d6d4cd] bg-[#fafaf7]/95 backdrop-blur-xl">
          <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-7">
            <Link href="/" className="flex items-center gap-3" aria-label="منصة مسار - الرئيسية"><span className="relative h-11 w-11 overflow-hidden rounded-xl border border-[#282825] bg-white"><Image src="/images/logo.png" alt="" fill sizes="44px" className="object-contain p-1" priority /></span><span className="text-xl font-extrabold">منصة مسار<span className="text-[#ff5636]">.</span></span></Link>
            <nav className="hidden items-center gap-7 md:flex" aria-label="التنقل الرئيسي">{mainLinks.map((link) => <Link key={link.href} href={link.href} className="text-sm font-bold text-[#5f5f59] hover:text-[#ff5636]">{link.label}</Link>)}</nav>
            <div className="flex items-center gap-2">{!loading && <Link href={destination} className="app-button min-h-10 px-4 py-2.5 text-sm">{user ? 'متابعة الدراسة' : 'ابدأ مجانًا'}</Link>}<button onClick={() => setMenuOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#282825] md:hidden" aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}>{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div>
          </div>
          {menuOpen && <nav className="border-t border-[#d6d4cd] px-4 py-3 md:hidden">{mainLinks.map((link) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold hover:bg-[#ffd64d]">{link.label}</Link>)}</nav>}
        </header>

        <section className="relative overflow-hidden border-b-2 border-[#282825]">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#dcbcff] opacity-55" /><div className="absolute -bottom-32 right-1/3 h-72 w-72 rounded-full bg-[#bce9fa] opacity-70" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:min-h-[640px] lg:grid-cols-[1.05fr_.95fr] lg:py-20">
            <div className="max-w-2xl"><span className="app-chip bg-[#ffd64d]"><Sparkles className="h-4 w-4" /> لطلاب البكالوريا السورية</span><h1 className="mt-6 text-4xl font-extrabold leading-[1.25] sm:text-5xl lg:text-6xl">تعلّم بوضوح،<span className="block text-[#ff5636]">وتقدّم بثبات.</span></h1><p className="mt-6 max-w-xl text-base leading-8 text-[#5f5f59] sm:text-lg">دروسك، اختباراتك، وخطتك الدراسية في تجربة واحدة بسيطة وملهمة تساعدك على التركيز والوصول إلى هدفك.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href={destination} className="app-button px-6">{user ? 'تابع من حيث توقفت' : 'أنشئ حسابك وابدأ'}<ArrowLeft className="h-5 w-5" /></Link><Link href="/subjects" className="app-button app-button-secondary px-6">تصفح المواد</Link></div><p className="mt-4 text-xs font-bold text-[#77776f]">تسجيل مجاني • يعمل على الهاتف • تقدم محفوظ تلقائيًا</p></div>

            <div className="relative"><div className="rounded-[30px] border-2 border-[#282825] bg-[#282825] p-3 shadow-[10px_10px_0_#ffd64d]"><div className="overflow-hidden rounded-[21px] border border-[#282825] bg-[#dcbcff]"><div className="flex items-center gap-2 border-b border-[#282825] bg-white px-4 py-3"><span className="h-3 w-3 rounded-full bg-[#ff5636]" /><span className="h-3 w-3 rounded-full bg-[#ffd64d]" /><span className="h-3 w-3 rounded-full bg-[#bce9fa]" /></div><div className="grid gap-3 p-5 sm:grid-cols-2">{subjects.map((subject) => <Link key={subject.name} href="/subjects" className={`group rounded-2xl border border-[#282825] p-4 ${subject.color}`}><Image src={subject.image} alt="" width={80} height={80} className="h-16 w-16 object-contain transition group-hover:-rotate-6 group-hover:scale-110" /><div className="mt-3 flex items-center justify-between"><strong>{subject.name}</strong><span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#282825] bg-white"><ArrowLeft className="h-4 w-4" /></span></div></Link>)}</div></div></div><div className="absolute -bottom-5 -right-4 rotate-6 rounded-xl border-2 border-[#282825] bg-[#ff5636] px-4 py-2 text-sm font-extrabold text-white shadow-[4px_4px_0_#282825]">كل شيء في مكان واحد!</div></div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><div className="mb-9 max-w-2xl"><span className="app-chip">كيف تستخدم مسار؟</span><h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">ثلاث خطوات نحو إنجاز أكبر</h2></div><div className="grid gap-4 md:grid-cols-3">{benefits.map((benefit, index) => { const Icon = benefit.icon; const colors = ['bg-[#ffdc72]', 'bg-[#d8bcff]', 'bg-[#bce9fa]']; return <article key={benefit.title} className={`app-card p-6 ${colors[index]}`}><div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#282825] bg-white"><Icon className="h-5 w-5" /></span><strong className="text-3xl text-[#282825]/30">{benefit.number}</strong></div><h3 className="mt-6 text-xl font-extrabold">{benefit.title}</h3><p className="mt-2 text-sm leading-7 text-[#5f5f59]">{benefit.description}</p></article>; })}</div></section>

        <section className="border-y-2 border-[#282825] bg-[#282825] text-white"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center"><div><p className="text-sm font-bold text-[#ffd64d]">ابدأ خطتك اليوم</p><h2 className="mt-2 text-2xl font-extrabold">جاهز لتحويل الدراسة إلى مسار واضح؟</h2><p className="mt-2 text-sm text-white/65">أنشئ حسابك وابدأ أول درس خلال دقائق.</p></div><Link href={destination} className="app-button px-7">ابدأ الآن <ArrowLeft className="h-5 w-5" /></Link></div></section>

        <footer className="flex flex-col items-center justify-between gap-4 px-5 py-7 text-sm text-[#6e6e67] sm:flex-row sm:px-8"><span>منصة مسار التعليمية — تعلّم بوضوح وتقدّم بثبات</span><Link href="/support" className="flex items-center gap-2 font-bold hover:text-[#ff5636]"><MessageCircle className="h-4 w-4" /> الدعم والمساعدة</Link></footer>
      </div>
    </main>
  );
}
