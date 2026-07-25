'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

function usePasswordStrength(pwd: string) {
  return useMemo(() => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  }, [pwd]);
}

const STRENGTH_META = [
  { label: 'فارغ', color: 'bg-white/10' },
  { label: 'ضعيفة', color: 'bg-rose-500' },
  { label: 'متوسطة', color: 'bg-amber-400' },
  { label: 'جيدة', color: 'bg-sky-400' },
  { label: 'قوية', color: 'bg-emerald-400' },
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
      if (profile?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, profile, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setAuthLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg('تم تسجيل الدخول بنجاح! جاري تحويلك...');
      } else {
        if (!fullName.trim()) {
          throw new Error('الرجاء إدخال الاسم الكامل');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'student',
            },
          },
        });

        if (error) throw error;

        if (data.user && data.session) {
          setSuccessMsg('تم إنشاء الحساب وتسجيل الدخول بنجاح!');
        } else {
          setSuccessMsg('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد التسجيل.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading || (user && profile)) {
    return (
      <div className="min-h-screen bg-[#001420] p-12">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#001420] font-body flex items-center justify-center p-6 relative overflow-hidden" dir="rtl">
      {/* Fullscreen Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 opacity-25 pointer-events-none"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
      </video>
      {/* Ambient Glowing Blobs */}
      <div className="fixed -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none animate-ambient-1 z-0" />
      <div className="fixed -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-purple-500/15 blur-[140px] pointer-events-none animate-ambient-2 z-0" />

      {/* Auth Card Container */}
      <div className="w-full max-w-md relative z-10 liquid-glass-glow rounded-3xl p-8 sm:p-10 border border-white/20 space-y-8">
        
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block">
            <span className="h-14 w-14 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center mx-auto border border-cyan-400/30 font-display">
              <GraduationCap className="w-7 h-7 text-cyan-300" />
            </span>
          </Link>
          <h1 className="text-4xl sm:text-5xl font-display font-normal text-foreground">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isLogin ? 'مرحباً بك مجدداً! أدخل بياناتك لمتابعة دروسك' : 'انضم إلى المنصة السينمائية الأولى للبكالوريا'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex liquid-glass rounded-full p-1 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`w-1/2 py-2.5 rounded-full text-xs font-medium transition-all ${
              isLogin ? 'liquid-glass-glow text-foreground border border-cyan-400/40' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`w-1/2 py-2.5 rounded-full text-xs font-medium transition-all ${
              !isLogin ? 'liquid-glass-glow text-foreground border border-cyan-400/40' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            حساب جديد
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-xs leading-relaxed">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl text-xs leading-relaxed">
            {successMsg}
          </div>
        )}

        {/* Auth form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="space-y-1.5">
              <label htmlFor="full-name" className="block text-xs text-muted-foreground font-medium text-right">
                الاسم الكامل
              </label>
              <input
                id="full-name"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="محمد الأحمد"
                className="w-full text-right liquid-glass rounded-2xl p-4 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-cyan-400/40"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email-address" className="block text-xs text-muted-foreground font-medium text-right">
              البريد الإلكتروني
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              dir="ltr"
              className="w-full text-left liquid-glass rounded-2xl p-4 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-cyan-400/40"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs text-muted-foreground font-medium text-right">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full text-left liquid-glass rounded-2xl p-4 pl-12 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-cyan-400/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-3 flex items-center text-muted-foreground hover:text-foreground text-xs"
                tabIndex={-1}
              >
                {showPassword ? 'إخفاء' : 'إظهار'}
              </button>
            </div>

            {!isLogin && password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                        i <= strength ? STRENGTH_META[strength].color : 'bg-white/10'
                      }`}
                    ></div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground text-right">
                  قوة كلمة المرور: {STRENGTH_META[strength].label}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="liquid-glass-glow w-full rounded-full py-4 text-sm font-medium text-foreground hover:scale-[1.02] transition-transform border border-cyan-400/40 mt-4 cursor-pointer"
          >
            {authLoading ? 'جاري التحقق...' : isLogin ? 'تسجيل الدخول ←' : 'تأكيد الحساب ←'}
          </button>
        </form>

      </div>
    </div>
  );
}
