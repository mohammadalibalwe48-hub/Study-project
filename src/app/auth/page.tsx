'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import styles from './auth.module.css';

function usePasswordStrength(password: string) {
  return useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);
}

const STRENGTH_META = [
  { label: 'فارغ', color: 'bg-[#deddd6]' },
  { label: 'ضعيفة', color: 'bg-[#e84d3c]' },
  { label: 'متوسطة', color: 'bg-[#f5b72e]' },
  { label: 'جيدة', color: 'bg-[#2d9ac5]' },
  { label: 'قوية', color: 'bg-[#24936e]' },
];

const weekDays = [
  { day: 'س', value: 44 },
  { day: 'ح', value: 68 },
  { day: 'ن', value: 54 },
  { day: 'ث', value: 86 },
  { day: 'ر', value: 63 },
  { day: 'خ', value: 100 },
  { day: 'ج', value: 72 },
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const strength = usePasswordStrength(password);

  useEffect(() => {
    if (!loading && user) {
      router.push(profile?.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, profile, loading, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setAuthLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setSuccessMsg('تم تسجيل الدخول بنجاح! جاري تحويلك...');
      } else {
        if (!fullName.trim()) throw new Error('الرجاء إدخال الاسم الكامل');

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role: 'student' } },
        });

        if (error) throw error;
        setSuccessMsg(
          data.user && data.session
            ? 'تم إنشاء الحساب وتسجيل الدخول بنجاح!'
            : 'تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد التسجيل.',
        );
      }
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setAuthLoading(false);
    }
  };

  const switchMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setErrorMsg('');
    setSuccessMsg('');
  };

  if (loading || (user && profile)) {
    return (
      <div className="min-h-screen bg-[#091723] p-12">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <main className={`${styles.authCanvas} min-h-screen overflow-hidden bg-[#a9c8d5] p-0 text-[#181816] lg:p-5 xl:p-7`} dir="rtl">
      <div className="mx-auto grid min-h-screen max-w-[1540px] overflow-hidden bg-[#fbfbf8] shadow-[0_30px_90px_rgba(24,39,47,0.26)] lg:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.72fr)] lg:rounded-[28px] lg:border-2 lg:border-[#20201d] xl:min-h-[calc(100vh-3.5rem)]">
        <section className={`${styles.visualPanel} relative hidden min-h-0 overflow-hidden border-l-2 border-[#20201d] bg-[#0b1928] px-10 py-9 text-white lg:flex lg:flex-col xl:px-14 xl:py-11`} aria-label="نظرة على تجربة مسار التعليمية">
          <div className="absolute left-0 top-0 h-2 w-1/3 bg-[#ff5b3d]" />
          <div className="absolute right-1/3 top-0 h-2 w-1/3 bg-[#ffd64d]" />
          <div className="absolute right-0 top-0 h-2 w-1/3 bg-[#57d6e7]" />

          <header className={`${styles.brandEnter} relative z-10 flex items-center justify-between`}>
            <Link href="/" className="flex items-center gap-3" aria-label="منصة مسار - الرئيسية">
              <span className={`${styles.logoGlow} relative h-12 w-12 overflow-hidden rounded-xl border border-white/20 bg-[#08121e]`}>
                <Image src="/images/logo.png" alt="" fill sizes="48px" className="object-cover" priority />
              </span>
              <span className="text-xl font-extrabold">منصة مسار<span className="text-[#ffd64d]">.</span></span>
            </Link>
            <span className="flex items-center gap-2 border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-bold text-white/65 backdrop-blur-sm">
              <span className={`${styles.liveDot} h-2 w-2 rounded-full bg-emerald-400`} />
              تقدّمك محفوظ دائمًا
            </span>
          </header>

          <div className="relative z-10 grid flex-1 content-center gap-8 py-7 xl:grid-cols-[0.76fr_1.24fr] xl:items-center xl:gap-10">
            <div className={`${styles.copyEnter} max-w-lg`}>
              <span className="inline-flex items-center gap-2 text-xs font-extrabold text-[#69d7e7]">
                <Sparkles className={`${styles.sparkle} h-4 w-4`} />
                مستقبلك يبدأ بخطوة واضحة
              </span>
              <h2 className="mt-5 text-4xl font-extrabold leading-[1.35] xl:text-[46px]">
                ركّز على حلمك،
                <span className="block text-[#ffd64d]">ونحن نرتّب المسار.</span>
              </h2>
              <p className="mt-5 max-w-md text-sm font-medium leading-8 text-white/62">
                تجربة دراسية تجمع خطتك، دروسك، واختباراتك في مكان واحد لتعرف دائمًا ما خطوتك التالية.
              </p>
              <div className="mt-8 flex gap-6 border-t border-white/12 pt-6">
                <div><strong className="block text-xl text-white">+120</strong><span className="text-[11px] text-white/45">درسًا منظّمًا</span></div>
                <div><strong className="block text-xl text-white">24/7</strong><span className="text-[11px] text-white/45">مساعد ذكي</span></div>
                <div><strong className="block text-xl text-white">100%</strong><span className="text-[11px] text-white/45">تقدّم محفوظ</span></div>
              </div>
            </div>

            <div className={`${styles.stageEnter} relative mx-auto w-full max-w-[490px]`}>
              <div className={`${styles.dashboardStage} overflow-hidden rounded-2xl border border-white/15 bg-[#f8f7f1] text-[#20201d] shadow-[0_30px_80px_rgba(0,0,0,0.38)]`}>
                <div className="flex h-12 items-center justify-between border-b border-[#deddd6] bg-white px-4">
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#ff5b3d]" /><span className="h-2.5 w-2.5 rounded-full bg-[#ffd64d]" /><span className="h-2.5 w-2.5 rounded-full bg-[#69d7e7]" /></div>
                  <span className="text-[10px] font-extrabold text-[#77776f]">لوحة تقدّمي</span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div><span className="text-[10px] font-bold text-[#77776f]">مساء الخير، محمد</span><h3 className="mt-1 text-base font-extrabold">جاهز لإنجاز اليوم؟</h3></div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#20201d] bg-[#ffd64d]"><Target className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-4 grid grid-cols-[1.3fr_.7fr] gap-3">
                    <div className="rounded-xl border border-[#20201d] bg-white p-3">
                      <div className="flex items-center justify-between"><span className="text-[10px] font-extrabold">نشاط الأسبوع</span><BarChart3 className="h-4 w-4 text-[#ff5b3d]" /></div>
                      <div className="mt-4 flex h-20 items-end justify-between gap-2">
                        {weekDays.map((item, index) => <div key={item.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><span className={`${styles.progressFill} w-full rounded-sm ${index === 5 ? 'bg-[#ff5b3d]' : 'bg-[#bce9fa]'}`} style={{ height: `${item.value}%`, animationDelay: `${700 + index * 80}ms` }} /><span className="text-[8px] font-bold text-[#888880]">{item.day}</span></div>)}
                      </div>
                    </div>
                    <div className="flex flex-col justify-between rounded-xl border border-[#20201d] bg-[#d9c1fa] p-3">
                      <Clock3 className="h-4 w-4" /><div><strong className="block text-xl">4.5</strong><span className="text-[9px] font-bold">ساعة هذا الأسبوع</span></div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-[#20201d] bg-[#ffdc72] p-3">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white"><BookOpen className="h-4 w-4" /></span><div><strong className="block text-[11px]">الفيزياء الحديثة</strong><span className="text-[9px] font-bold text-[#686860]">الدرس 8 من 12</span></div></div><span className="text-xs font-extrabold">68%</span></div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/12"><div className={`${styles.progressFill} h-full w-[68%] rounded-full bg-[#20201d]`} /></div>
                  </div>
                </div>
              </div>

              <div className={`${styles.floatCardOne} absolute -left-6 top-16 flex items-center gap-2 rounded-xl border-2 border-[#20201d] bg-[#ff5b3d] px-3 py-2.5 text-white shadow-[5px_5px_0_#20201d]`}>
                <CheckCircle2 className="h-5 w-5" /><div><strong className="block text-[10px]">اكتمل الدرس!</strong><span className="text-[8px] text-white/70">+25 نقطة خبرة</span></div>
              </div>
              <div className={`${styles.floatCardTwo} absolute -bottom-5 right-5 flex items-center gap-2 rounded-xl border-2 border-[#20201d] bg-[#bce9fa] px-3 py-2.5 text-[#20201d] shadow-[5px_5px_0_#20201d]`}>
                <Sparkles className="h-4 w-4" /><strong className="text-[10px]">6 أيام متتالية</strong>
              </div>
            </div>
          </div>

          <footer className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-[10px] font-bold text-white/38">
            <span>مصممة لطلاب البكالوريا السورية</span>
            <span>تعلّم بوضوح • تقدّم بثبات</span>
          </footer>
        </section>

        <section className={`${styles.formEnter} flex min-h-screen flex-col px-5 py-5 sm:px-10 sm:py-7 lg:min-h-0 lg:px-12 xl:px-[72px]`} aria-labelledby="auth-heading">
          <header className="flex h-12 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 lg:hidden" aria-label="منصة مسار - الرئيسية">
              <span className="relative h-10 w-10 overflow-hidden rounded-xl border border-[#20201d] bg-[#0b1928]"><Image src="/images/logo.png" alt="" fill sizes="40px" className="object-cover" priority /></span>
              <strong>مسار<span className="text-[#ff5b3d]">.</span></strong>
            </Link>
            <Link href="/" className="mr-auto inline-flex h-10 items-center gap-2 text-xs font-extrabold text-[#66665f] hover:text-[#ff5b3d]">
              <ChevronLeft className="h-4 w-4 rotate-180" /> الرئيسية
            </Link>
          </header>

          <div className="mx-auto my-auto w-full max-w-[450px] py-8 sm:py-10">
            <div key={isLogin ? 'login-title' : 'signup-title'} className={styles.modePanel}>
              <span className="inline-flex items-center gap-2 text-xs font-extrabold text-[#e8492f]"><span className="h-px w-7 bg-[#e8492f]" />{isLogin ? 'مرحبًا بعودتك' : 'انضم إلى مسار'}</span>
              <h1 id="auth-heading" className="mt-3 text-3xl font-extrabold leading-[1.3] sm:text-[38px]">{isLogin ? 'أكمل رحلتك من هنا.' : 'خطوتك الأولى تبدأ هنا.'}</h1>
              <p className="mt-3 text-sm font-semibold leading-7 text-[#6a6a63]">{isLogin ? 'سجّل دخولك واستعد كل دروسك وخطتك وتقدمك.' : 'أنشئ حسابًا مجانيًا واجعل دراستك أكثر وضوحًا وتنظيمًا.'}</p>
            </div>

            <div className="mt-7 grid h-12 grid-cols-2 rounded-xl border border-[#c9c8c0] bg-[#efeee8] p-1" role="tablist" aria-label="نوع الحساب">
              <button type="button" role="tab" aria-selected={isLogin} onClick={() => switchMode(true)} className={`rounded-lg text-xs font-extrabold ${isLogin ? 'bg-white text-[#20201d] shadow-[0_2px_10px_rgba(32,32,29,0.12)]' : 'text-[#73736c] hover:text-[#20201d]'}`}>تسجيل الدخول</button>
              <button type="button" role="tab" aria-selected={!isLogin} onClick={() => switchMode(false)} className={`rounded-lg text-xs font-extrabold ${!isLogin ? 'bg-white text-[#20201d] shadow-[0_2px_10px_rgba(32,32,29,0.12)]' : 'text-[#73736c] hover:text-[#20201d]'}`}>إنشاء حساب</button>
            </div>

            <div aria-live="polite" className="mt-4 min-h-0">
              {errorMsg && <div role="alert" className="rounded-lg border border-[#efb3a9] bg-[#fff1ee] px-4 py-3 text-xs font-bold leading-6 text-[#a52b18]">{errorMsg}</div>}
              {successMsg && <div role="status" className="rounded-lg border border-[#a8d7c5] bg-[#edf9f4] px-4 py-3 text-xs font-bold leading-6 text-[#176449]">{successMsg}</div>}
            </div>

            <form key={isLogin ? 'login-form' : 'signup-form'} className={`${styles.modePanel} mt-4 space-y-4`} onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="space-y-1.5">
                  <label htmlFor="full-name" className="block text-xs font-extrabold">الاسم الكامل</label>
                  <div className="group relative"><UserRound className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#85857d] group-focus-within:text-[#e8492f]" /><input id="full-name" name="fullName" type="text" autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="محمد الأحمد" className="h-[50px] w-full rounded-xl border border-[#aaa9a1] bg-white pr-11 pl-4 text-sm font-semibold outline-none placeholder:text-[#aaa9a1] focus:border-[#e8492f] focus:shadow-[0_0_0_3px_rgba(232,73,47,0.12)]" /></div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email-address" className="block text-xs font-extrabold">البريد الإلكتروني</label>
                <div className="group relative"><Mail className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#85857d] group-focus-within:text-[#e8492f]" /><input id="email-address" name="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" dir="ltr" className="h-[50px] w-full rounded-xl border border-[#aaa9a1] bg-white px-11 text-left text-sm font-semibold outline-none placeholder:text-[#aaa9a1] focus:border-[#e8492f] focus:shadow-[0_0_0_3px_rgba(232,73,47,0.12)]" /></div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-extrabold">كلمة المرور</label>
                <div className="group relative"><LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#85857d] group-focus-within:text-[#e8492f]" /><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" dir="ltr" className="h-[50px] w-full rounded-xl border border-[#aaa9a1] bg-white px-11 text-left text-sm font-semibold outline-none placeholder:text-[#aaa9a1] focus:border-[#e8492f] focus:shadow-[0_0_0_3px_rgba(232,73,47,0.12)]" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute left-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-[#73736c] hover:bg-[#f1f0eb] hover:text-[#e8492f]" aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} aria-pressed={showPassword}>{showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}</button></div>
                {!isLogin && password.length > 0 && <div className="pt-1" aria-live="polite"><div className="flex gap-1.5" aria-hidden="true">{[1, 2, 3, 4].map((index) => <span key={index} className={`h-1 flex-1 rounded-full ${index <= strength ? STRENGTH_META[strength].color : 'bg-[#deddd6]'}`} />)}</div><div className="mt-1.5 flex justify-between text-[10px] font-bold text-[#76766f]"><span>8 أحرف، رقم ورمز</span><span>القوة: {STRENGTH_META[strength].label}</span></div></div>}
              </div>

              <button type="submit" disabled={authLoading} className={`${styles.submitButton} mt-2 flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#20201d] bg-[#ff5b3d] text-sm font-extrabold text-white shadow-[0_5px_0_#20201d] hover:-translate-y-0.5 hover:bg-[#ff6b50] hover:shadow-[0_7px_0_#20201d] active:translate-y-1 active:shadow-[0_1px_0_#20201d] disabled:translate-y-0 disabled:shadow-none`}>
                {authLoading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> جاري التحقق...</> : <>{isLogin ? 'الدخول إلى حسابي' : 'إنشاء حسابي مجانًا'}<ArrowLeft className={`${styles.submitArrow} h-[18px] w-[18px]`} /></>}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold text-[#77776f]"><Check className="h-3.5 w-3.5 text-[#24936e]" /> حساب آمن <span className="h-1 w-1 rounded-full bg-[#b5b4ac]" /> تقدم محفوظ تلقائيًا</div>
          </div>

          <footer className="pb-1 text-center text-[10px] font-semibold text-[#8a8a82]">بالمتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية</footer>
        </section>
      </div>
    </main>
  );
}
