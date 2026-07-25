'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import SidebarLayout from '@/components/SidebarLayout';
import { GraduationCap } from 'lucide-react';

export default function AboutPage() {
  const { user, profile, signOut } = useAuth();

  const stats = [
    { number: '+50K', label: 'طالب وطالبة متفوقين' },
    { number: '96%', label: 'نسبة النجاح السنوية' },
    { number: '+12K', label: 'سؤال وجواب مؤتمت' },
    { number: '24/7', label: 'دعم ومتابعة ذكية مستمرة' }
  ];

  const content = (
    <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-10 overflow-y-auto text-right border border-white/15">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-white/10 pb-6">
        <div className="space-y-3">
          <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-cyan-300 border border-cyan-400/20 uppercase inline-block">
            من نحن ورؤيتنا للتعليم
          </span>
          <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground">
            عن منصة البكالوريا
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            المنصة التعليمية السورية الأولى الموجهة لخدمة طلاب البكالوريا بكافة المحافظات، بأحدث التقنيات وأفضل الأساتذة.
          </p>
        </div>
      </div>

      {/* Main Copy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <h3 className="text-3xl font-display font-normal text-foreground">رؤيتنا: جعل التميز الأكاديمي واقعاً ملموساً</h3>
          <p className="text-sm text-muted-foreground leading-relaxed liquid-glass p-6 rounded-3xl border border-white/10">
            تأسست منصة البكالوريا بهدف ردم الفجوة في الحصول على تعليم تفاعلي متميز وموثوق لطلاب الثانوية العامة في سوريا. نؤمن بأن التكنولوجيا عندما تقترن بنخبة المدرسين والخطط الذكية قادرة على فتح آفاق جديدة للطلاب وتيسير طرق الفهم والحصول على العلامة التامة.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            توفر المنصة شروحات مرئية تفصيلية، وبنك أسئلة مؤتمت ضخم يضم آلاف الأسئلة الاختيارية الموافقة للأنماط الامتحانية الوزارية المحدثة، ومخططات دراسة ذكية مخصصة لمستوى الطالب، بالإضافة للرفيق البطل كأول مساعد ذكاء اصطناعي دراسي في سوريا.
          </p>
        </div>

        {/* Brand visual box */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="liquid-glass-glow rounded-3xl p-8 border border-cyan-400/30 text-center space-y-4 flex flex-col items-center">
            <GraduationCap className="w-12 h-12 text-cyan-300" />
            <h4 className="text-2xl font-display font-normal text-foreground">طموح ورسالة واحدة</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              من دمشق إلى حلب، ومن حمص إلى اللاذقية وحماة ودرعا والسويداء ودير الزور، نجمع الطلاب نحو قمة النجاح.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Counter Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6">
        {stats.map((st, idx) => (
          <div
            key={idx}
            className="liquid-glass-glow rounded-3xl p-6 text-center border border-white/15 flex flex-col items-center justify-center gap-2"
          >
            <span className="text-3xl font-display text-cyan-300">{st.number}</span>
            <span className="text-[11px] text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/10">
              {st.label}
            </span>
          </div>
        ))}
      </div>

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
          <span className="text-2xl font-display text-foreground">منصة البكالوريا</span>
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
