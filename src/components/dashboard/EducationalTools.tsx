import Link from 'next/link';
import React from 'react';
import { BookmarkIcon, CalendarIcon, CardsIcon, ChartIcon, ClockIcon, FlameIcon, LightningIcon } from '@/components/icons/SvgIcons';

interface EducationalToolsProps {
  xpData: { xp: number; streak_days: number } | null;
}

export default function EducationalTools({ xpData }: EducationalToolsProps) {
  const tools = [
    {
      name: 'مخطط الدراسة والتنظيم',
      href: '/dashboard/planner',
      icon: CalendarIcon,
      accent: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
    },
    {
      name: 'بطاقات التذكر الذكية',
      href: '/dashboard/flashcards',
      icon: CardsIcon,
      accent: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    },
    {
      name: 'تحليل الأداء والتحصيل',
      href: '/dashboard/analytics',
      icon: ChartIcon,
      accent: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
    },
    {
      name: 'غرف التركيز والبومودورو',
      href: '/dashboard/study-rooms',
      icon: ClockIcon,
      accent: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
    },
    {
      name: 'المكتبة والمحفوظات',
      href: '/dashboard/bookmarks',
      icon: BookmarkIcon,
      accent: 'text-rose-400 border-rose-400/30 bg-rose-400/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
        <h3 className="text-3xl font-display font-normal text-foreground">أدوات التفوق والمراجعة</h3>
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

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {tools.map((tool, idx) => {
          const Icon = tool.icon;
          return (
            <Link
              key={idx}
              href={tool.href}
              className="liquid-glass-glow rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-center border border-white/15 hover:scale-[1.05] transition-all group cursor-pointer"
            >
              <div className={`p-4 rounded-2xl border ${tool.accent} group-hover:scale-110 transition-transform`}>
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
