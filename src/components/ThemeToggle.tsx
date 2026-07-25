'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="brutal-btn group liquid-glass flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface text-foreground hover:bg-brand hover:scale-105 smooth-interaction focus-ring text-sm font-bold shadow-sm cursor-pointer"
      title={theme === 'light' ? 'التبديل إلى الوضع الليلي' : 'التبديل إلى الوضع النهارى'}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <>
          <Moon className="w-4 h-4 text-indigo-400 transition-transform duration-300 group-hover:-rotate-12" />
          <span className="hidden sm:inline">ليلي</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
          <span className="hidden sm:inline">نهاري</span>
        </>
      )}
    </button>
  );
}
