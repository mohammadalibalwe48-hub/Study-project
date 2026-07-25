'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import { awardXP, updateStreak, checkAndUnlockBadges } from '@/utils/xpHelper';

interface PomodoroTimerProps {
  userId: string;
}

const TOTAL_SECONDS = 1500; // 25 minutes
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function PomodoroTimer({ userId }: PomodoroTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [isActive, setIsActive] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTimerComplete = async () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    alert('انتهت جلسة التركيز بنجاح! حصلت على +50 XP!');
    setSavingSession(true);

    try {
      const { error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          duration_minutes: 25,
        });

      if (error) throw error;

      await awardXP(userId, 50);
      await updateStreak(userId);
      await checkAndUnlockBadges(userId);
    } catch (err) {
      console.error('Error logging study session:', err);
    } finally {
      setSavingSession(false);
      setSecondsLeft(TOTAL_SECONDS);
    }
  };

  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      handleTimerComplete();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, secondsLeft]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(TOTAL_SECONDS);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = Math.round(((TOTAL_SECONDS - secondsLeft) / TOTAL_SECONDS) * 100);
  const strokeDashoffset = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;

  return (
    <div className="liquid-glass rounded-3xl p-6 flex flex-col items-center border border-border">
      <div className="w-full flex justify-between items-center border-b border-border pb-4 mb-6">
        <h4 className="font-display font-normal text-foreground text-xl">
          مؤقت التركيز / Pomodoro
        </h4>
        <span className="liquid-glass rounded-full px-3 py-1 text-xs text-muted-foreground">25 min</span>
      </div>

      <div className="relative flex items-center justify-center w-full my-2">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="#ffffff"
            strokeWidth="8"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-display font-normal text-foreground tracking-widest">
            {formatTime(secondsLeft)}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase mt-1">
            {isActive ? 'جدية الدراسة' : 'مستعد'}
          </span>
        </div>
      </div>

      <div className="flex gap-3 w-full mt-6">
        <button
          onClick={toggleTimer}
          disabled={savingSession}
          className="liquid-glass flex-1 py-2.5 rounded-2xl text-xs font-medium text-foreground hover:scale-105 transition-transform"
        >
          {isActive ? 'إيقاف مؤقت' : 'ابدأ الجلسة'}
        </button>
        <button
          onClick={resetTimer}
          disabled={savingSession}
          className="liquid-glass px-4 py-2.5 rounded-2xl text-xs text-muted-foreground hover:text-foreground"
        >
          إعادة
        </button>
      </div>
    </div>
  );
}
