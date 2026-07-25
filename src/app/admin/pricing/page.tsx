'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { CreditCard, Check, Pencil } from 'lucide-react';

interface Plan {
  id: number;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta_text: string;
}

export default function AdminPricingPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    period: 'شهرية',
    description: '',
    featuresText: '',
    cta_text: 'اشترك الآن',
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

  const fetchPlans = async () => {
    if (!user || profile?.role !== 'admin') return;
    try {
      setDbLoading(true);
      const { data, error } = await supabase.from('pricing_plans').select('*').order('id', { ascending: true });
      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error('Error fetching pricing plans:', err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      fetchPlans();
    }
  }, [user, profile]);

  const handleEdit = (p: Plan) => {
    setEditingPlan(p);
    setFormData({
      name: p.name,
      price: p.price,
      period: p.period || 'شهرية',
      description: p.description || '',
      featuresText: Array.isArray(p.features) ? p.features.join('\n') : '',
      cta_text: p.cta_text || 'اشترك الآن',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setActionLoading(true);
    try {
      const featuresArr = formData.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const { error } = await supabase
        .from('pricing_plans')
        .update({
          name: formData.name,
          price: formData.price,
          period: formData.period,
          description: formData.description,
          features: featuresArr,
          cta_text: formData.cta_text,
        })
        .eq('id', editingPlan.id);

      if (error) throw error;

      setEditingPlan(null);
      await fetchPlans();
    } catch (err: any) {
      console.error('Error updating plan:', err);
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
            <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-emerald-400 border border-emerald-400/20 uppercase inline-block">
              إدارة الاشتراكات والخطط
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-normal text-foreground mt-3 flex items-center gap-3">
              الباقات والأسعار <CreditCard className="w-8 h-8 text-emerald-400" />
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
              تعديل أسعار خطط الاشتراك، ميزات الباقات الشاملة، ونصوص أزرار الدفع.
            </p>
          </div>

          <Link
            href="/admin"
            className="liquid-glass rounded-full px-6 py-2.5 text-xs text-foreground hover:scale-105 transition-transform"
          >
            ← العودة لمركز الإدارة
          </Link>
        </div>

        {/* Edit Plan Form */}
        {editingPlan && (
          <form onSubmit={handleSave} className="liquid-glass rounded-3xl p-6 border border-white/15 space-y-4">
            <h3 className="text-2xl font-display text-foreground border-b border-white/10 pb-3">
              تعديل باقة: {editingPlan.name}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">اسم الباقة</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">السعر</label>
                <input
                  type="text"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">الفترة</label>
                <input
                  type="text"
                  required
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ميزات الباقة (ميزة في كل سطر)</label>
              <textarea
                rows={4}
                value={formData.featuresText}
                onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                className="w-full text-right liquid-glass rounded-2xl p-3.5 text-xs text-foreground focus:outline-none border border-white/10"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="liquid-glass rounded-full px-6 py-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="liquid-glass-glow rounded-full px-8 py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-emerald-400/40 cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading ? 'جاري الحفظ...' : <>تحديث الباقة <Check className="w-3.5 h-3.5 text-emerald-400" /></>}
              </button>
            </div>
          </form>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.id} className="liquid-glass-glow rounded-3xl p-6 border border-white/15 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-400/20 px-3 py-0.5 rounded-full">
                  {p.period}
                </span>
                <h3 className="text-3xl font-display text-foreground">{p.name}</h3>
                <div className="text-2xl font-display text-cyan-300">{p.price}</div>
                
                <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs text-muted-foreground">
                  {Array.isArray(p.features) && p.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleEdit(p)}
                className="liquid-glass-glow rounded-full w-full py-2.5 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40 mt-4 cursor-pointer flex items-center justify-center gap-1.5"
              >
                تعديل الباقة <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

      </div>
    </SidebarLayout>
  );
}
