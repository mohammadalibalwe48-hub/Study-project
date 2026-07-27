'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { Check } from 'lucide-react';

interface Plan {
  name: string;
  price: string;
  period: string;
  color: string;
  shadow_color: string;
  popular: boolean;
  description: string;
  features: string[];
  cta_text: string;
}

export default function PricingPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      try {
        setDbLoading(true);
        const { data, error } = await supabase
          .from('pricing_plans')
          .select('*')
          .order('id', { ascending: true });
        
        if (error) throw error;
        setPlans(data || []);
      } catch (err) {
        console.error('Error fetching pricing plans:', err);
      } finally {
        setDbLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const content = (
    <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-12 overflow-y-auto text-right border border-white/15">
      
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-cyan-300 border border-cyan-400/20 uppercase inline-block">
          باقات تناسب جميع الطلاب
        </span>
        <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground">
          خطط الاشتراك وباقات التفوق
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          اختر الباقة المناسبة للوصول الكامل إلى آلاف الأسئلة المؤتمتة وشروحات المنهاج والمساعد الذكي.
        </p>
      </div>

      {/* Plans cards */}
      {dbLoading ? (
        <div className="py-20 text-center space-y-4">
          <div className="h-10 w-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground text-sm">جاري تحميل الباقات...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto w-full">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`liquid-glass-glow rounded-3xl p-8 border ${
                plan.popular ? 'border-cyan-400/50 scale-[1.03]' : 'border-white/15'
              } flex flex-col justify-between relative text-right h-full hover:scale-[1.04] transition-all`}
            >
              {plan.popular && (
                <span className="absolute -top-4 left-6 bg-cyan-500 text-slate-950 text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  الأكثر طلباً ⭐
                </span>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-3xl font-display font-normal text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{plan.description}</p>
                </div>

                {/* Price block */}
                <div className="py-4 border-y border-white/10 flex items-baseline gap-2">
                  <span className="text-4xl font-display text-foreground">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">/ {plan.period}</span>
                </div>

                {/* Features list */}
                <ul className="space-y-3 text-xs text-muted-foreground">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-foreground">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <div className="pt-8 mt-auto">
                <Link
                  href="/auth"
                  className="liquid-glass-glow rounded-full w-full block text-center py-3.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40"
                >
                  {plan.cta_text || 'اشترك الآن'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );

  if (user) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        {content}
      </SidebarLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#001420] p-6 max-w-7xl mx-auto flex flex-col justify-between relative overflow-hidden" dir="rtl">
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
      <header className="relative z-10 w-full flex justify-between items-center liquid-glass rounded-full px-8 py-4 mb-8 border border-white/15">
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/logo.png" className="h-10 w-10 rounded-full border border-white/20 object-cover" alt="الشعار" />
          <span className="text-2xl font-display text-foreground">منصة مسار</span>
        </Link>
        <Link href="/auth" className="liquid-glass-glow rounded-full px-6 py-2.5 text-xs text-foreground font-medium hover:scale-105 transition-transform border border-cyan-400/40">
          تسجيل الدخول
        </Link>
      </header>
      <div className="relative z-10">
        {content}
      </div>
    </div>
  );
}
