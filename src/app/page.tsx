'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Clock, BookOpen, X } from 'lucide-react';

/* ---------- SVG Icons ---------- */
function CapIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  );
}

function StarIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" stroke="none" viewBox="0 0 24 24">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function AnalyticsIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function QuestionIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function VideoIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function DocumentIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ChevronIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ArrowIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

/* ---------- Reveal-on-scroll hook ---------- */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

/* ---------- Animated counter ---------- */
function Counter({ to, suffix = '', duration = 1600 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const { ref, visible } = useReveal<HTMLDivElement>();
  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, to, duration]);
  return (
    <div ref={ref}>
      {val.toLocaleString('ar-SY')}
      {suffix}
    </div>
  );
}

/* ---------- Main Home Page ---------- */
export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Curriculum Syllabus Interactive States
  type SubjectKey = 'math' | 'physics' | 'chemistry' | 'arabic';
  interface SyllabusUnit {
    title: string;
    lessons: number;
    hours: number;
    description: string;
  }
  const [activeSubject, setActiveSubject] = useState<SubjectKey>('math');
  const [selectedUnit, setSelectedUnit] = useState<SyllabusUnit | null>(null);

  // FAQ accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Countdown timer calculation
  const [daysLeft, setDaysLeft] = useState<number>(() => {
    const targetDate = new Date('2027-06-01T08:00:00');
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
  });

  useEffect(() => {
    const targetDate = new Date('2027-06-01T08:00:00');
    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      setDaysLeft(Math.max(days, 0));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, []);

  const syllabusData = {
    math: {
      name: 'الرياضيات',
      units: [
        { title: 'النهايات والاستمرار', lessons: 14, hours: 22, description: 'دراسة مفهوم النهاية، المبرهنات الأساسية للنهايات، مقاربة التوابع والاستمرار عند نقطة وعلى مجال.' },
        { title: 'الاشتقاق وتطبيقاته', lessons: 16, hours: 26, description: 'حساب المشتقات وتحديد جهة التغير والتطبيقات العملية والمسائل الكبرى لنظرية القيم الوسطى.' },
        { title: 'التكامل وتطبيقات المساحة', lessons: 12, hours: 20, description: 'التوابع الأصلية والتكامل المحدد وحساب حجوم ومساحات السطوح الدوارة.' }
      ]
    },
    physics: {
      name: 'الفيزياء',
      units: [
        { title: 'النواسات (المرن والفتل)', lessons: 10, hours: 18, description: 'دراسة الاهتزازات الميكانيكية الحرة غير المتخامدة، وتحديد الدور الخاص والطاقة الكامنة.' },
        { title: 'ميكانيك السوائل وعلم الحركة', lessons: 8, hours: 14, description: 'معادلة الاستمرارية، نظرية برنولي وتطبيقاتها اللزوجة، ودراسة تدفق السوائل.' },
        { title: 'الكهرباء والمغناطيسية', lessons: 12, hours: 22, description: 'الحقل المغناطيسي المتولد، تيار التحريض الذاتي، والاهتزازات الكهربائية المستقرة.' }
      ]
    },
    chemistry: {
      name: 'الكيمياء',
      units: [
        { title: 'الكيمياء النووية والنشاط الإشعاعي', lessons: 6, hours: 10, description: 'التفاعلات النووية والاندماج والانشطار الذري وعمر النصف للنظائر الإشعاعية.' },
        { title: 'الغازات والسرعة الكيميائية', lessons: 8, hours: 12, description: 'قوانين الغازات الكاملة الحركية، سرعة التفاعل، والعوامل المؤثرة على التوازن الكيميائي.' },
        { title: 'الكيمياء العضوية والأحماض', lessons: 10, hours: 16, description: 'دراسة الحموض والأسس، وتفاعلات الأسترة العضوية والأغوال والألدهيدات.' }
      ]
    },
    arabic: {
      name: 'اللغة العربية',
      units: [
        { title: 'الأدب والقضايا الوطنية والفكرية', lessons: 8, hours: 12, description: 'تحليل النصوص الأدبية الخاصة بشعر المقاومة والقضايا الوطنية والاجتماعية.' },
        { title: 'دراسة النصوص وتحليل القوافي', lessons: 10, hours: 14, description: 'البلاغة العربية والبحور الشعرية ودراسة المقال الأدبي وتطبيقاته النقدية.' },
        { title: 'قواعد النحو والإعراب الأساسية', lessons: 12, hours: 18, description: 'دراسة الحالات الإعرابية للأسماء والأفعال، الجمل التي لها محل من الإعراب وتطبيقاتها.' }
      ]
    }
  };

  const faqs = [
    { q: 'هل المنصة مجانية بالكامل؟', a: 'نعم، يمكنك التسجيل والوصول إلى الدروس والاختبارات الأساسية مجاناً. تتوفر باقات مدفوعة لمحتوى متقدم ومميزات إضافية.' },
    { q: 'هل النماذج الوزارية محدّثة؟', a: 'نعم، نقوم بتحديث بنك الأسئلة والنماذج الوزارية بشكل دوري لتطابق أحدث المناهج المعتمدة من وزارة التربية السورية.' },
    { q: 'هل يمكنني استخدام المنصة على الهاتف؟', a: 'بالتأكيد، المنصة متجاوبة بالكامل وتعمل بسلاسة على الهواتف والأجهزة اللوحية وأجهزة الكمبيوتر.' },
    { q: 'كيف يتم حساب العلامات تلقائياً؟', a: 'عند إنهاء أي اختبار، تقوم المنصة بحساب علامتك وفق سلم التصحيح الوزاري وعرض تحليل مفصل لأدائك ونقاط ضعفك.' },
    { q: 'هل تدعم المنصة الفرع الأدبي والعلمي؟', a: 'نعم، نغطي مواد الفرعين العلمي والأدبي بالكامل مع دروس واختبارات مخصصة لكل فرع.' },
  ];

  const stats = [
    { value: 50000, suffix: '+', label: 'طالب نشط' },
    { value: 96, suffix: '%', label: 'نسبة النجاح' },
    { value: 12000, suffix: '+', label: 'سؤال مؤتمت' },
    { value: 410, suffix: '+', label: 'درس فيديو' },
  ];

  const features = [
    { icon: AnalyticsIcon, title: 'متابعة ذكية', desc: 'تحليلات دقيقة تظهر نقاط ضعفك وتقترح مسارات مخصصة.', badge: 'ذكاء اصطناعي' },
    { icon: QuestionIcon, title: 'بنك أسئلة', desc: 'آلاف الأسئلة المصممة بنمط MCQ لمحاكاة الامتحانات.', badge: 'جديد' },
    { icon: VideoIcon, title: 'دروس فيديو', desc: 'مكتبة مصورة شاملة تغطي كافة الأبحاث العلمية والأدبية.', badge: 'عالية الدقة' },
    { icon: DocumentIcon, title: 'ملخصات PDF', desc: 'كبسولات دراسية وسلالم تصحيح وزارية قابلة للتحميل.', badge: 'تحميل مباشر' },
  ];

  const subjects = [
    { name: 'الرياضيات', lessons: 125, img: '/images/subject_math.png', progress: 78, tag: 'الأكثر طلباً' },
    { name: 'الفيزياء', lessons: 90, img: '/images/subject_physics.png', progress: 64, tag: 'محدّث' },
    { name: 'الكيمياء', lessons: 85, img: '/images/subject_chemistry.png', progress: 71, tag: 'تفاعلات' },
    { name: 'اللغة العربية', lessons: 110, img: '/images/subject_arabic.png', progress: 82, tag: 'أدبي' },
  ];

  const steps = [
    { num: '01', title: 'أنشئ حسابك', desc: 'سجّل مجاناً في أقل من دقيقة واختر فرعك الدراسي.' },
    { num: '02', title: 'تعلّم ودرّب', desc: 'تابع الدروس، حلّ الاختبارات، وابنِ سلسلة إنجازاتك.' },
    { num: '03', title: 'تفوّق وحقق', desc: 'احصل على تحليل أدائك وكن جاهزاً تماماً للامتحان النهائي.' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#002538] text-foreground font-body select-none overflow-x-hidden" dir="rtl">

      {/* ===== HERO SECTION WITH VIDEO BACKGROUND & GLASS NAVBAR ===== */}
      <div className="relative min-h-screen flex flex-col justify-between overflow-hidden">

        {/* Fullscreen Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
            type="video/mp4"
          />
        </video>

        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-[#002538] z-0 pointer-events-none" />

        {/* ===== Glassmorphic Navigation Navbar ===== */}
        <header className="relative z-10 w-full">
          <div className="relative z-10 flex flex-row justify-between items-center px-8 py-6 max-w-7xl mx-auto">
            {/* Platform Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20 shadow-md">
                <img src="/images/logo.png" alt="الشعار" className="w-full h-full object-cover" />
              </div>
              <span className="text-3xl tracking-tight font-display text-foreground font-normal">
                منصة البكالوريا
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav aria-label="التنقل الرئيسي" className="hidden md:flex gap-8 items-center font-medium">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                الرئيسية
              </Link>
              <Link href="/subjects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                المواد الدراسية
              </Link>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                مسارات التعلم
              </Link>
              <Link href="/forum" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                المجتمع التفاعلي
              </Link>
              <Link href="/library" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                المكتبة والملخصات
              </Link>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                عن المنصة
              </Link>
            </nav>

            {/* Primary Navigation CTA */}
            <div className="flex items-center gap-4">
              {loading ? (
                <div className="h-10 w-28 liquid-glass rounded-full animate-pulse"></div>
              ) : user ? (
                <Link
                  href={profile?.role === 'admin' ? '/admin' : '/dashboard'}
                  className="liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground hover:scale-[1.03] transition-all inline-flex items-center gap-2 cursor-pointer font-medium"
                >
                  لوحة التحكم
                </Link>
              ) : (
                <Link
                  href="/auth"
                  className="liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground hover:scale-[1.03] transition-all inline-flex items-center gap-2 cursor-pointer font-medium"
                >
                  ابدأ التعلم الآن
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden liquid-glass p-2.5 rounded-full text-foreground hover:scale-105 cursor-pointer"
                aria-label="القائمة"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Drawer Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden relative z-20 max-w-7xl mx-auto px-8 pb-6 animate-scale-in">
              <div className="liquid-glass rounded-3xl p-6 flex flex-col gap-4 text-center font-medium">
                <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground py-2">
                  الرئيسية
                </Link>
                <Link href="/subjects" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground py-2">
                  المواد الدراسية
                </Link>
                <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground py-2">
                  مسارات التعلم
                </Link>
                <Link href="/forum" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground py-2">
                  المجتمع التفاعلي
                </Link>
                <Link href="/library" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground py-2">
                  المكتبة والملخصات
                </Link>
                <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground py-2">
                  عن المنصة
                </Link>
              </div>
            </div>
          )}
        </header>

        {/* ===== Cinematic Hero Content ===== */}
        <div className="relative z-10 max-w-7xl mx-auto px-8 py-20 my-auto flex flex-col items-start w-full text-right">

          {/* Countdown indicator badge */}
          <div className="inline-flex items-center gap-3 liquid-glass rounded-full px-5 py-2 text-xs sm:text-sm text-foreground mb-8 animate-fade-rise">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <span>متبقي <strong className="text-white font-semibold mx-1">{daysLeft} يوم</strong> على امتحانات البكالوريا السورية</span>
          </div>

          {/* Hero Main Headline */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-7xl font-normal font-display animate-fade-rise text-foreground">
            حيث يتحول الشغف والفضول{' '}
            <em className="not-italic text-muted-foreground">إلى إتقان وتفوق.</em>
          </h1>

          {/* Hero Supporting Text */}
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mt-8 leading-relaxed animate-fade-rise-delay">
            استكشف الدروس التفاعلية، طوّر مهاراتك الدراسية، وتعلّم عبر منصة مصممة خصيصاً للمفكرين والمبدعين وطلاب البكالوريا السورية.
          </p>

          {/* Hero Primary CTA Button */}
          <Link
            href={user ? '/dashboard' : '/auth'}
            className="liquid-glass rounded-full px-14 py-5 text-base mt-12 hover:scale-[1.03] cursor-pointer animate-fade-rise-delay-2 text-foreground font-medium inline-flex items-center justify-center gap-3 transition-transform"
          >
            {user ? 'الانتقال للوحة التحكم' : 'ابدأ رحلة التفوق الآن'}
            <ArrowIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
          </Link>
        </div>

        {/* Scroll down indicator */}
        <div className="relative z-10 pb-8 text-center animate-pulse">
          <span className="text-xs text-muted-foreground tracking-widest uppercase">اسحب للاستكشاف</span>
        </div>
      </div>

      {/* ===== PLATFORM METRICS & STATS ===== */}
      <section className="py-20 px-8 bg-[#001d2c]/80 border-t border-border relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="liquid-glass p-8 rounded-3xl text-center space-y-2 border border-border">
              <div className="text-4xl sm:text-5xl font-display font-normal text-foreground">
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div className="text-sm text-muted-foreground font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== INTERACTIVE ROADMAP & STEPS ===== */}
      <section className="py-24 px-8 max-w-7xl mx-auto w-full space-y-16 text-right">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">طريقة التعلم</span>
          <h2 className="text-4xl sm:text-6xl font-display font-normal tracking-tight text-foreground">
            ثلاث خطوات نحو التفوق الأكاديمي
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            ثلاث خطوات عملية للوصول إلى أعلى الدرجات في البكالوريا السورية
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="liquid-glass rounded-3xl p-8 flex flex-col items-start gap-6 border border-border">
              <span className="text-4xl font-display text-muted-foreground">{step.num}</span>
              <h3 className="text-2xl font-display font-normal text-foreground">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section className="py-24 px-8 bg-[#001d2c]/50 border-y border-border text-right">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">مميزات المنصة</span>
            <h2 className="text-4xl sm:text-6xl font-display font-normal text-foreground">
              مصممة لطلاب البكالوريا
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              أدوات تفاعلية متكاملة لتحليل المستوى، حل الاختبارات، وتحميل الكبسولات
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="liquid-glass rounded-3xl p-8 flex flex-col justify-between gap-6 border border-border group hover:scale-[1.02] transition-transform">
                  <div className="flex justify-between items-center">
                    <div className="p-3 rounded-2xl bg-white/5 text-foreground">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      {f.badge}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-display font-normal text-foreground">{f.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                  </div>
                  <Link href="/auth" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors pt-4 border-t border-white/5">
                    استكشف المزيد <ArrowIcon className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== SUBJECTS EXPLORER ===== */}
      <section className="py-24 px-8 max-w-7xl mx-auto w-full space-y-16 text-right">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-border pb-8">
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">المناهج الدراسية</span>
            <h2 className="text-4xl sm:text-6xl font-display font-normal text-foreground">
              أتقن كافة المواد الدراسية
            </h2>
          </div>
          <Link href="/subjects" className="liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground hover:scale-[1.03] transition-transform">
            تصفح كافة المواد →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {subjects.map((s, i) => (
            <div key={i} className="liquid-glass rounded-3xl p-6 flex flex-col gap-6 border border-border hover:scale-[1.02] transition-transform">
              <div className="w-full h-44 rounded-2xl overflow-hidden bg-black/20">
                <img src={s.img} alt={s.name} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-display font-normal text-foreground">{s.name}</h3>
                  <span className="text-xs text-muted-foreground bg-white/5 px-2.5 py-1 rounded-full">{s.tag}</span>
                </div>
                <p className="text-xs text-muted-foreground">{s.lessons} درس فيديو وتدريب مؤتمت</p>
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>نسبة التغطية</span>
                  <span>{s.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-foreground rounded-full" style={{ width: `${s.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== INTERACTIVE SYLLABUS UNIT EXPLORER ===== */}
      <section className="py-24 px-8 bg-[#001d2c]/50 border-t border-border text-right">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">المفردات والتفاصيل التفاعلية</span>
            <h2 className="text-4xl sm:text-6xl font-display font-normal text-foreground">
              استكشاف مفصل لجميع الوحدات
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Subject Selector Tabs */}
            <div className="lg:col-span-4 flex flex-row lg:flex-col gap-3 overflow-x-auto pb-4 lg:pb-0">
              {Object.entries(syllabusData).map(([key, data]) => {
                const isActive = activeSubject === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setActiveSubject(key as SubjectKey); setSelectedUnit(null); }}
                    className={`w-full text-right py-4 px-6 rounded-2xl text-sm font-medium transition-all cursor-pointer ${
                      isActive ? 'liquid-glass text-foreground border border-white/20' : 'bg-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {data.name}
                  </button>
                );
              })}
            </div>

            {/* Units list */}
            <div className="lg:col-span-8 space-y-6">
              <div className="liquid-glass rounded-3xl p-8 border border-border space-y-6">
                <h3 className="text-2xl font-display text-foreground">وحدات مقرر {syllabusData[activeSubject].name}</h3>
                <div className="space-y-4">
                  {syllabusData[activeSubject].units.map((unit, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedUnit(unit)}
                      className={`p-6 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                        selectedUnit?.title === unit.title ? 'liquid-glass border-white/30 text-foreground' : 'bg-white/5 border-white/10 hover:border-white/20 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="space-y-1">
                        <h4 className="text-lg font-medium">{unit.title}</h4>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-cyan-400" /> {unit.hours} ساعة</span>
                          <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-cyan-400" /> {unit.lessons} درس</span>
                        </div>
                      </div>
                      <span className="text-sm font-light">عرض التفاصيل ←</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Unit Details Modal */}
              {selectedUnit && (
                <div className="liquid-glass rounded-3xl p-8 border border-border space-y-6 animate-scale-in">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xl font-display text-foreground">{selectedUnit.title}</h4>
                    <button
                      onClick={() => setSelectedUnit(null)}
                      className="text-xs text-muted-foreground hover:text-foreground px-3 py-1 rounded-full bg-white/5 flex items-center gap-1"
                    >
                      إغلاق <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{selectedUnit.description}</p>
                  <Link
                    href="/auth"
                    className="liquid-glass rounded-full px-6 py-3 text-sm text-foreground hover:scale-[1.03] transition-all inline-block"
                  >
                    ابدأ دروس هذه الوحدة الآن
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section className="py-24 px-8 max-w-3xl mx-auto w-full space-y-12 text-right">
        <div className="text-center space-y-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">الأسئلة الشائعة</span>
          <h2 className="text-4xl sm:text-6xl font-display font-normal text-foreground">
            إجابات لأهم تساؤلاتك
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="liquid-glass rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex justify-between items-center p-6 text-right font-medium text-foreground text-base hover:bg-white/5 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronIcon className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-foreground' : ''}`} />
              </button>
              {openFaq === i && (
                <p className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed border-t border-white/5 pt-4">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#001723] text-foreground py-16 px-8 border-t border-border mt-auto text-right">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-2 text-center md:text-right">
            <h3 className="text-3xl font-display tracking-tight text-foreground">منصة البكالوريا</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              تجربة تعليمية سينمائية حديثة لطلاب البكالوريا السورية وفق أحدث المعايير الامتحانية والتحليلات التفاعلية.
            </p>
          </div>

          <div className="flex gap-8 text-xs text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">عن المنصة</Link>
            <Link href="/subjects" className="hover:text-foreground transition-colors">المواد الدراسية</Link>
            <Link href="/forum" className="hover:text-foreground transition-colors">المجتمع التفاعلي</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">سياسة الخصوصية</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
