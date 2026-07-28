'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { Check, Sparkles, Star, Zap } from 'lucide-react';

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

  const cardThemes = [
    { bg: 'bg-[#bce9fa]', shadow: 'neo-shadow-interactive-blue' },
    { bg: 'bg-[#ffd64d]', shadow: 'neo-shadow-interactive-yellow' },
    { bg: 'bg-[#d8bcff]', shadow: 'neo-shadow-interactive-purple' },
  ];

  const content = (
    <div className="mx-auto w-full max-w-[1180px] space-y-12 text-right bg-dot-pattern py-4">

      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="app-chip bg-[#ffd64d] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
          <Zap className="h-4 w-4 text-[#ff5636]" /> باقات تناسب جميع الطلاب
        </span>
        <h1 className="text-3xl font-black sm:text-5xl text-[#282825]">
          خطط الاشتراك وباقات التفوق
        </h1>
        <p className="text-[#5f5f59] text-sm font-semibold leading-relaxed">
          اختر الباقة المناسبة للوصول الكامل إلى آلاف الأسئلة المؤتمتة وشروحات المنهاج والمساعد الذكي.
        </p>
      </div>

      {/* Plans cards */}
      {dbLoading ? (
        <div className="py-20 text-center space-y-4">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#282825] border-t-[#ff5636]"></div>
          <p className="text-[#5f5f59] text-sm font-black">جاري تحميل الباقات...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto w-full">
          {plans.map((plan, idx) => {
            const theme = cardThemes[idx % cardThemes.length];
            return (
              <div
                key={idx}
                className={`rounded-2xl border-2 border-[#282825] p-8 ${theme.bg} ${theme.shadow} flex flex-col justify-between relative text-right h-full transition-all group hover:scale-[1.02]`}
              >
                {plan.popular && (
                  <span className="absolute -top-4 left-6 bg-[#ff5636] text-white border-2 border-[#282825] text-[11px] font-black px-4 py-1 rounded-xl uppercase shadow-[2px_2px_0_#282825]">
                    الأكثر طلباً ⭐
                  </span>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-3xl font-black text-[#282825]">{plan.name}</h3>
                    <p className="text-xs font-semibold text-[#282825]/80 mt-2 leading-relaxed">{plan.description}</p>
                  </div>

                  {/* Price block */}
                  <div className="py-4 border-y-2 border-[#282825]/15 flex items-baseline gap-2">
                    <span className="text-4xl font-black text-[#282825]">{plan.price}</span>
                    <span className="text-xs font-bold text-[#282825]/70">/ {plan.period}</span>
                  </div>

                  {/* Features list */}
                  <ul className="space-y-3 text-xs font-bold text-[#282825]">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full border border-[#282825] bg-white flex items-center justify-center text-[#ff5636] shrink-0 shadow-[1px_1px_0_#282825]">
                          <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t-2 border-[#282825]/15">
                  <Link
                    href={user ? '/support' : '/auth'}
                    className="app-button border-2 border-[#282825] bg-[#ff5636] text-white w-full py-3.5 text-xs font-black shadow-[3px_3px_0_#282825] hover:shadow-[5px_5px_0_#282825] hover:-translate-y-0.5 transition-all text-center block"
                  >
                    {plan.cta_text || 'اشترك الآن'}
                  </Link>
                </div>
              </div>
            );
          })}
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
    <div className="min-h-screen bg-[#b9ced8] p-4 sm:p-6" dir="rtl">
      <header className="app-guest-nav max-w-6xl mx-auto mb-6 flex items-center justify-between rounded-2xl border-2 border-[#282825] bg-white px-5 py-4 shadow-[4px_4px_0_#282825]">
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/logo.png" className="h-10 w-10 rounded-xl border border-[#282825] object-contain p-0.5" alt="الشعار" />
          <span className="text-xl font-black text-[#282825]">منصة مسار التعليمية</span>
        </Link>
        <Link href="/auth" className="app-button border-2 border-[#282825] bg-[#ff5636] text-white min-h-10 rounded-xl px-5 py-2 text-xs font-black shadow-[2px_2px_0_#282825]">
          تسجيل الدخول
        </Link>
      </header>
      <div className="relative z-10">
        {content}
      </div>
    </div>
  );
}
