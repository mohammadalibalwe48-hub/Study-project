'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import SidebarLayout from '@/components/SidebarLayout';
import { HelpCircle, Send, ChevronDown, MessageSquare, Headphones } from 'lucide-react';

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
    <div className="mx-auto w-full max-w-[1180px] space-y-8 text-right bg-dot-pattern py-4">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b-2 border-[#282825] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <span className="app-chip bg-[#bce9fa] border-2 border-[#282825] shadow-[2.5px_2.5px_0_#282825] font-black">
            <Headphones className="h-4 w-4 text-[#ff5636]" /> الدعم الفني والمساعدة
          </span>
          <h1 className="mt-2 text-3xl font-black sm:text-5xl text-[#282825]">
            مركز الدعم والأسئلة الشائعة
          </h1>
          <p className="text-[#5f5f59] text-sm max-w-xl leading-relaxed font-semibold">
            نحن هنا لمساعدتك! تواصل معنا أو تصفح الإجابات على الأسئلة الأكثر تكراراً.
          </p>
        </div>

        {!user && (
          <Link
            href="/auth"
            className="app-button border-2 border-[#282825] bg-[#ff5636] text-white shadow-[3px_3px_0_#282825] hover:shadow-[5px_5px_0_#282825] hover:-translate-y-0.5 transition-all text-xs font-black px-6 py-2.5"
          >
            تسجيل الدخول
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Support Ticket Form */}
        <div className="lg:col-span-5 rounded-2xl border-2 border-[#282825] bg-[#bce9fa] p-6 sm:p-8 shadow-[6px_6px_0_#282825] space-y-6 bg-dot-pattern-dense">
          <span className="app-chip bg-white border border-[#282825] text-xs font-black shadow-[1.5px_1.5px_0_#282825]">
            تواصل معنا مباشرة
          </span>
          <h2 className="text-2xl font-black text-[#282825]">أرسل تذكرة دعم</h2>
          <p className="text-xs font-semibold text-[#282825]/80 leading-relaxed">
            هل واجهت مشكلة تقنية أو لديك استفسار؟ املأ النموذج وسيصلك الرد خلال 24 ساعة.
          </p>

          <form onSubmit={handleSubmitTicket} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="block text-xs font-black text-[#282825]">عنوان التذكرة</label>
              <input
                type="text"
                required
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="مثال: استفسار حول النماذج الوزارية"
                className="w-full rounded-xl border-2 border-[#282825] bg-white p-3.5 text-[#282825] text-sm font-semibold placeholder-[#77776f] shadow-[2px_2px_0_#282825] focus:outline-none focus:border-[#ff5636]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-[#282825]">تفاصيل التذكرة</label>
              <textarea
                rows={5}
                required
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                placeholder="اشرح مشكلتك أو استفسارك بالتفصيل..."
                className="w-full rounded-xl border-2 border-[#282825] bg-white p-3.5 text-[#282825] text-sm font-semibold placeholder-[#77776f] shadow-[2px_2px_0_#282825] focus:outline-none focus:border-[#ff5636]"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isSubmitted}
              className="app-button w-full border-2 border-[#282825] bg-[#ff5636] text-white py-3.5 text-xs font-black shadow-[3px_3px_0_#282825] hover:shadow-[5px_5px_0_#282825] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <span>{isSubmitted ? 'جاري الإرسال...' : 'إرسال التذكرة'}</span>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* FAQs Accordion */}
        <div className="lg:col-span-7 rounded-2xl border-2 border-[#282825] bg-white p-6 sm:p-8 shadow-[6px_6px_0_#282825] space-y-6">
          <div className="border-b-2 border-[#282825]/10 pb-4">
            <h2 className="text-2xl font-black text-[#282825] flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-[#ff5636]" /> الأسئلة الشائعة والإرشادات
            </h2>
            <p className="text-xs font-semibold text-[#5f5f59] mt-1">تصفح الأسئلة الأكثر تكراراً للحصول على إجابات فورية.</p>
          </div>

          {dbLoading ? (
            <div className="py-12 text-center space-y-4">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#282825] border-t-[#ff5636]"></div>
              <p className="text-[#5f5f59] text-xs font-black">جاري تحميل الأسئلة الشائعة...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {faqs.map((faq) => {
                const isOpen = activeFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="rounded-xl border-2 border-[#282825] bg-[#fafaf7] overflow-hidden transition-all shadow-[2.5px_2.5px_0_#282825]"
                  >
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full p-4 flex items-center justify-between text-right font-black text-sm text-[#282825] hover:bg-[#ffd64d]/30 transition-colors"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown className={`w-4 h-4 text-[#282825] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="p-4 pt-0 border-t border-[#282825]/10 text-xs font-semibold text-[#5f5f59] leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
