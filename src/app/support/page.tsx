'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

export default function SupportPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeFaqId, setActiveFaqId] = useState<number | null>(null);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    async function fetchFaqs() {
      try {
        setDbLoading(true);
        const { data, error } = await supabase
          .from('faqs')
          .select('*')
          .order('id', { ascending: true });
        
        if (error) throw error;
        setFaqs(data || []);
      } catch (err) {
        console.error('Error fetching FAQs:', err);
      } finally {
        setDbLoading(false);
      }
    }
    fetchFaqs();
  }, []);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return;
    setIsSubmitted(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id || null,
          subject: ticketSubject,
          message: ticketMessage
        });
      
      if (error) throw error;
      
      setTicketSubject('');
      setTicketMessage('');
      alert('تم إرسال تذكرتك بنجاح! سيقوم فريق الدعم الفني بالرد عليك في أقرب وقت عبر بريدك الإلكتروني.');
    } catch (err) {
      console.error('Error submitting support ticket:', err);
      alert('حدث خطأ أثناء إرسال التذكرة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitted(false);
    }
  };

  const toggleFaq = (id: number) => {
    if (activeFaqId === id) {
      setActiveFaqId(null);
    } else {
      setActiveFaqId(id);
    }
  };

  const content = (
    <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col lg:flex-row gap-10 overflow-y-auto border border-white/15 text-right">
      
      {/* Left: Support Ticket Form */}
      <div className="flex-1 liquid-glass rounded-3xl p-6 text-right space-y-6 border border-white/10">
        <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-cyan-300 border border-cyan-400/20 uppercase inline-block">
          الدعم الفني والشكاوى
        </span>
        <h2 className="text-3xl font-display font-normal text-foreground">أرسل تذكرة دعم</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          هل واجهت مشكلة تقنية أو لديك استفسار؟ املأ النموذج وسيصلك الرد خلال 24 ساعة.
        </p>

        <form onSubmit={handleSubmitTicket} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground font-medium">عنوان المشكلة أو التذكرة</label>
            <input
              type="text"
              required
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              placeholder="مثال: استفسار حول سلالم التصحيح"
              className="w-full text-right liquid-glass rounded-2xl p-4 text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyan-400/40 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground font-medium">تفاصيل الشكوى أو السؤال</label>
            <textarea
              rows={5}
              required
              value={ticketMessage}
              onChange={(e) => setTicketMessage(e.target.value)}
              placeholder="اكتب تفاصيل استفسارك هنا..."
              className="w-full text-right liquid-glass rounded-2xl p-4 text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyan-400/40 text-sm"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={isSubmitted}
            className="liquid-glass-glow w-full rounded-full py-4 text-sm font-medium text-foreground hover:scale-[1.02] transition-transform border border-cyan-400/40 cursor-pointer"
          >
            {isSubmitted ? 'جاري الإرسال...' : 'إرسال تذكرة الدعم'}
          </button>
        </form>
      </div>

      {/* Right: FAQ Accordion */}
      <div className="flex-1 space-y-6">
        <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-amber-300 border border-amber-400/20 uppercase inline-block">
          الأسئلة الشائعة
        </span>
        <h2 className="text-3xl font-display font-normal text-foreground">إجابات سريعة تهمك</h2>

        {dbLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">جاري تحميل الأسئلة الشائعة...</div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="liquid-glass rounded-2xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-4 text-right font-medium text-sm text-foreground flex justify-between items-center gap-4 hover:bg-white/5 transition-colors"
                >
                  <span>{faq.question}</span>
                  <span className="text-muted-foreground text-lg">{activeFaqId === faq.id ? '−' : '+'}</span>
                </button>
                {activeFaqId === faq.id && (
                  <div className="p-4 pt-0 text-xs text-muted-foreground border-t border-white/5 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
