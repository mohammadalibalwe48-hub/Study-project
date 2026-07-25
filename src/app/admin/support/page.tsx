'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { Ticket, Check, Trash2, Plus } from 'lucide-react';

interface SupportTicket {
  id: number;
  subject: string;
  message: string;
  created_at: string;
  users?: {
    full_name: string;
    email: string;
  } | null;
}

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

export default function AdminSupportPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);

  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
  });

  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth');
      } else if (profile?.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, profile, loading, router]);

  const fetchData = async () => {
    if (!user || profile?.role !== 'admin') return;
    try {
      setDbLoading(true);

      const { data: tData, error: tErr } = await supabase
        .from('support_tickets')
        .select(`
          id,
          subject,
          message,
          created_at,
          users (
            full_name,
            email
          )
        `)
        .order('id', { ascending: false });

      if (tErr) throw tErr;
      setTickets((tData as any) || []);

      const { data: fData, error: fErr } = await supabase
        .from('faqs')
        .select('*')
        .order('id', { ascending: true });

      if (fErr) throw fErr;
      setFaqs(fData || []);
    } catch (err) {
      console.error('Error fetching admin support data:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      fetchData();
    }
  }, [user, profile]);

  const handleDeleteTicket = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه التذكرة؟')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('support_tickets').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting ticket:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqForm.question.trim() || !faqForm.answer.trim()) return;

    setActionLoading(true);
    try {
      if (editingFaq) {
        const { error } = await supabase.from('faqs').update(faqForm).eq('id', editingFaq.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('faqs').insert([faqForm]);
        if (error) throw error;
      }

      setShowFaqModal(false);
      setEditingFaq(null);
      await fetchData();
    } catch (err: any) {
      console.error('Error saving FAQ:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteFaq = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال الشائع؟')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting FAQ:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || dbLoading) {
    return (
      <SidebarLayout role={profile?.role} signOut={signOut}>
        <div className="p-8">
          <TableSkeleton rows={5} />
        </div>
      </SidebarLayout>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <SidebarLayout role={profile?.role} signOut={signOut}>
      <div className="flex-1 liquid-glass-glow rounded-3xl p-8 flex flex-col gap-8 overflow-y-auto text-right border border-white/15">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/10 pb-6">
          <div>
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-rose-400 border border-rose-400/20 uppercase inline-block">
              مركز الدعم والأسئلة الشائعة
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3 flex items-center gap-3">
              التذاكر والخدمات <Ticket className="w-8 h-8 text-rose-400" />
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              معالجة تذاكر الدعم الفني واستفسارات الطلاب، وتحديث قائمة الأسئلة الشائعة FAQ.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingFaq(null);
                setFaqForm({ question: '', answer: '' });
                setShowFaqModal(!showFaqModal);
              }}
              className="liquid-glass-glow rounded-full px-6 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer flex items-center gap-1.5"
            >
              {showFaqModal ? 'إغلاق النموذج' : <>إضافة سؤال شائع <Plus className="w-3.5 h-3.5" /></>}
            </button>
            <Link
              href="/admin"
              className="liquid-glass rounded-full px-6 py-2.5 text-xs text-foreground hover:scale-105 transition-transform"
            >
              ← العودة لمركز الإدارة
            </Link>
          </div>
        </div>

        {/* Modal Form */}
        {showFaqModal && (
          <form onSubmit={handleSaveFaq} className="liquid-glass rounded-3xl p-6 border border-white/15 space-y-4">
            <h3 className="text-2xl font-display text-foreground border-b border-white/10 pb-3">
              {editingFaq ? 'تعديل السؤال الشائع' : 'إضافة سؤال شائع جديد'}
            </h3>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">السؤال</label>
              <input
                type="text"
                required
                value={faqForm.question}
                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                placeholder="كيف يمكنني الوصول للدروس المسجلة؟"
                className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">الإجابة</label>
              <textarea
                rows={3}
                required
                value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                placeholder="تظهر جميع الدروس المسجلة فور اختيار المادة..."
                className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="liquid-glass-glow rounded-full px-8 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading ? 'جاري الحفظ...' : editingFaq ? <>تحديث السؤال <Check className="w-3.5 h-3.5 text-emerald-400" /></> : <>إضافة السؤال <Plus className="w-3.5 h-3.5" /></>}
              </button>
            </div>
          </form>
        )}

        {/* Support Tickets Section */}
        <div className="space-y-4">
          <h3 className="text-2xl font-display text-foreground">تذاكر الدعم الواردة ({tickets.length})</h3>
          
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="liquid-glass rounded-2xl p-6 border border-white/10 flex justify-between items-start text-xs space-y-2">
                <div className="space-y-2 text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-0.5 rounded-full">
                      {ticket.users?.full_name || 'طالب'} ({ticket.users?.email})
                    </span>
                    <span className="text-[10px] text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString('ar-SY')}</span>
                  </div>
                  <h4 className="text-lg font-display text-foreground">{ticket.subject}</h4>
                  <p className="text-muted-foreground leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">{ticket.message}</p>
                </div>

                <button
                  onClick={() => handleDeleteTicket(ticket.id)}
                  className="text-rose-400 hover:underline shrink-0 p-2 text-xs flex items-center gap-1 cursor-pointer"
                >
                  حذف التذكرة <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs List Section */}
        <div className="space-y-4 border-t border-white/10 pt-6">
          <h3 className="text-2xl font-display text-foreground">الأسئلة الشائعة FAQ ({faqs.length})</h3>
          
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="liquid-glass rounded-2xl p-5 border border-white/10 flex justify-between items-start text-xs">
                <div className="space-y-1 text-right">
                  <h4 className="font-bold text-foreground text-sm">{faq.question}</h4>
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>

                <button
                  onClick={() => handleDeleteFaq(faq.id)}
                  className="text-rose-400 hover:underline shrink-0 p-2 text-xs flex items-center gap-1 cursor-pointer"
                >
                  حذف <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </SidebarLayout>
  );
}
