import Link from 'next/link';
import React from 'react';
import { CalendarIcon, CardsIcon, ChartIcon, FlameIcon, LightningIcon } from '@/components/icons/SvgIcons';

interface EducationalToolsProps {
  xpData: { xp: number; streak_days: number } | null;
}

export default function EducationalTools({ xpData }: EducationalToolsProps) {
  const tools = [
    { name: 'مخطط الدراسة', href: '/dashboard/planner', icon: CalendarIcon, accent: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
    { name: 'بطاقات التذكر', href: '/dashboard/flashcards', icon: CardsIcon, accent: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
    { name: 'تحليل الأداء', href: '/dashboard/analytics', icon: ChartIcon, accent: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
        <h3 className="text-lg font-bold text-foreground">أدوات الدراسة</h3>
        {xpData && (
          <div className="flex items-center gap-3">
            <span className="liquid-glass-glow rounded-full px-4 py-1.5 text-xs text-foreground font-medium flex items-center gap-2 border border-amber-400/30">
              <LightningIcon className="w-4 h-4 text-amber-400" /> {xpData.xp} XP
            </span>
            <span className="liquid-glass-glow rounded-full px-4 py-1.5 text-xs text-foreground font-medium flex items-center gap-2 border border-rose-400/30">
              <FlameIcon className="w-4 h-4 text-rose-400" /> {xpData.streak_days} أيام متتالية
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tools.map((tool, idx) => {
          const Icon = tool.icon;
          return (
            <Link
              key={idx}
              href={tool.href}
              className="liquid-glass-glow rounded-2xl p-4 flex flex-row sm:flex-col items-center justify-center gap-3 text-center border border-white/15 hover:border-cyan-400/40 transition-all group cursor-pointer"
            >
              <div className={`p-2.5 rounded-xl border ${tool.accent} group-hover:scale-105 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-foreground group-hover:text-white leading-tight">
                {tool.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
