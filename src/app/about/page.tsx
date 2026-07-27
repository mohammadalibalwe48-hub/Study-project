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
    <div className="app-page app-card flex flex-col gap-10 bg-[#fafaf7] text-right">

      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-white/10 pb-6">
        <div className="space-y-3">
          <span className="app-page-kicker">
            من نحن ورؤيتنا للتعليم
          </span>
          <h1 className="app-page-title">
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
          <p className="app-card bg-[#bce9fa] p-6 text-sm leading-relaxed">
            تأسست منصة البكالوريا بهدف ردم الفجوة في الحصول على تعليم تفاعلي متميز وموثوق لطلاب الثانوية العامة في سوريا. نؤمن بأن التكنولوجيا عندما تقترن بنخبة المدرسين والخطط الذكية قادرة على فتح آفاق جديدة للطلاب وتيسير طرق الفهم والحصول على العلامة التامة.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            توفر المنصة شروحات مرئية تفصيلية، وبنك أسئلة مؤتمت ضخم يضم آلاف الأسئلة الاختيارية الموافقة للأنماط الامتحانية الوزارية المحدثة، ومخططات دراسة ذكية مخصصة لمستوى الطالب، بالإضافة للرفيق البطل كأول مساعد ذكاء اصطناعي دراسي في سوريا.
          </p>
        </div>

        {/* Brand visual box */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="app-card bg-[#dcbcff] p-8 text-center space-y-4 flex flex-col items-center">
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
            className={`app-card p-6 text-center flex flex-col items-center justify-center gap-2 ${idx % 2 === 0 ? 'bg-[#ffd64d]' : 'bg-[#bce9fa]'}`}
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
    <div className="app-page-canvas" dir="rtl">
      <header className="app-guest-nav">
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/logo.png" className="h-10 w-10 rounded-full border border-white/20 object-cover" alt="الشعار" />
          <span className="text-2xl font-display text-foreground">منصة البكالوريا</span>
        </Link>
        <Link href="/auth" className="app-button app-button-secondary min-h-10 rounded-xl px-5 py-2.5 text-xs">
          تسجيل الدخول
        </Link>
      </header>
      <div className="relative z-10">
        {content}
      </div>
    </div>
  );
}
