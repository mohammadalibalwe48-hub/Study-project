'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  SparkIcon,
  CloseIcon,
  BookOpenIcon,
  ClockIcon,
  LightningIcon,
  ShieldIcon,
  MathIcon,
} from '@/components/icons/SvgIcons';
import { playFocusTone, stopFocusTone } from '@/utils/audioSynth';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Exclusive PWA Tools Drawer State
  const [showPwaTools, setShowPwaTools] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'formulas' | 'audio'>('notes');
  const [offlineNotes, setOfflineNotes] = useState('');
  const [audioActive, setAudioActive] = useState<string | null>(null);
  const [savedNotesMessage, setSavedNotesMessage] = useState(false);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Detect if running in standalone mode (Installed PWA)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker Registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration error:', err);
        });
    }

    // Capture Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show banner if not already dismissed in session
      const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Load saved offline notes
    const loadedNotes = localStorage.getItem('baccalaureate_pwa_scratchpad') || '';
    setOfflineNotes(loadedNotes);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const handleSaveNotes = () => {
    localStorage.setItem('baccalaureate_pwa_scratchpad', offlineNotes);
    setSavedNotesMessage(true);
    setTimeout(() => setSavedNotesMessage(false), 2000);
  };

  const toggleFocusAudio = (type: 'binaural' | 'rain' | 'deep') => {
    if (audioActive === type) {
      stopFocusTone();
      setAudioActive(null);
    } else {
      stopFocusTone();
      playFocusTone(type);
      setAudioActive(type);
    }
  };

  return (
    <>
      {/* Offline Status Badge */}
      {!isOnline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500/95 text-black px-4 py-2 rounded-full font-bold text-xs shadow-xl flex items-center gap-2 backdrop-blur-md border border-amber-300 animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-red-700 animate-ping" />
          <span>أنت تعمل الآن بدون إنترنت (وضع PWA المحفوظ)</span>
        </div>
      )}

      {/* 1. INSTALL PWA PROMPT BANNER (Shown on browser if installable) */}
      {showInstallBanner && !isStandalone && (
        <div className="fixed bottom-5 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-slate-900/95 text-white p-5 rounded-2xl border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
          <button
            onClick={handleDismissBanner}
            aria-label="إغلاق التنبيه"
            className="absolute top-3 left-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <CloseIcon className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-cyan-950 border border-cyan-400/30 flex-shrink-0 shadow-md">
              <Image
                src="/images/logo.png"
                alt="شعار التطبيق"
                fill
                className="object-contain p-1"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-cyan-300">تطبيق البكالوريا السورية</h4>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                  تطبيق PWA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                ثبّت التطبيق على جهازك للحصول على سرعة فائقة، وتصفح بدون إنترنت، وتنبيهات دراسية ذكية!
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleInstallClick}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-2"
                >
                  <SparkIcon className="w-4 h-4" />
                  <span>تثبيت التطبيق الآن</span>
                </button>
                <button
                  onClick={handleDismissBanner}
                  className="text-xs text-slate-400 hover:text-slate-200 px-2 py-2"
                >
                  ليس الآن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. EXCLUSIVE PWA FLOATING QUICK BAR (Always visible or enhanced in Installed/PWA Mode) */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setShowPwaTools(!showPwaTools)}
          className={`relative group flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border transition-all duration-300 ${
            isStandalone
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/50 hover:scale-105 shadow-cyan-500/30'
              : 'bg-slate-900/90 text-cyan-300 border-cyan-500/30 hover:border-cyan-400 backdrop-blur-md'
          }`}
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
          </span>
          <span className="font-extrabold text-xs tracking-wide">
            {isStandalone ? 'أدوات PWA الحصرية' : 'مساعد الدراسة السريع'}
          </span>
          <SparkIcon className="w-4 h-4 text-amber-300 animate-spin-slow" />
        </button>

        {/* EXCLUSIVE PWA TOOLS MODAL */}
        {showPwaTools && (
          <div className="absolute bottom-16 left-0 w-80 md:w-96 bg-slate-900/95 border border-cyan-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                  ⚡
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-cyan-200">
                    {isStandalone ? 'حقيبة أدوات التطبيق المثبت (PWA)' : 'صندوق الأدوات الدراسية'}
                  </h3>
                  <p className="text-[10px] text-slate-400">ميزات سريعة تعمل أوفلاين</p>
                </div>
              </div>
              <button
                onClick={() => setShowPwaTools(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Tool Nav Tabs */}
            <div className="flex bg-slate-950/80 p-1 rounded-xl mb-4 border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  activeTab === 'notes'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                المسودة السريعة
              </button>
              <button
                onClick={() => setActiveTab('formulas')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  activeTab === 'formulas'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                دليل القوانين
              </button>
              <button
                onClick={() => setActiveTab('audio')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  activeTab === 'audio'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                صوت التركيز
              </button>
            </div>

            {/* TAB 1: QUICK OFFLINE NOTES */}
            {activeTab === 'notes' && (
              <div className="space-y-3">
                <label className="text-[11px] font-medium text-slate-300 block">
                  دون ملاحظاتك وقوانينك السريعة (تُحفظ تلقائياً بدون إنترنت):
                </label>
                <textarea
                  value={offlineNotes}
                  onChange={(e) => setOfflineNotes(e.target.value)}
                  placeholder="اكتب معادلة، ملحوظة أستاذ، أو تذكير مراجعة هنا..."
                  className="w-full h-32 bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none font-mono"
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSaveNotes}
                    className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                  >
                    <span>حفظ الملاحظات</span>
                  </button>
                  {savedNotesMessage && (
                    <span className="text-[11px] font-bold text-emerald-400 animate-fade-in">
                      ✓ تم الحفظ محلياً
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: EXCLUSIVE FORMULA CHEAT SHEET */}
            {activeTab === 'formulas' && (
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1 text-xs">
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <div className="font-bold text-amber-400 mb-1">الرياضيات: الدالة المشتقة</div>
                  <div className="text-[11px] text-slate-300 font-mono text-left dir-ltr">
                    (u / v)&apos; = (u&apos;v - uv&apos;) / v²
                  </div>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <div className="font-bold text-cyan-400 mb-1">الفيزياء: النواس المرن</div>
                  <div className="text-[11px] text-slate-300 font-mono text-left dir-ltr">
                    T₀ = 2π √(m / k)
                  </div>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <div className="font-bold text-emerald-400 mb-1">الكيمياء: ثابت التوازن</div>
                  <div className="text-[11px] text-slate-300 font-mono text-left dir-ltr">
                    Kc = [Products] / [Reactants]
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FOCUS AUDIO SYNTHESIZER */}
            {activeTab === 'audio' && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-300">
                  مولد موجات ألفا الصوتية الحصري لمساعدتك على التركيز الذهني والتعلم العميق:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => toggleFocusAudio('binaural')}
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition ${
                      audioActive === 'binaural'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    🧠 موجات ألفا (432Hz)
                    <span className="block text-[9px] font-normal text-slate-400 mt-1">
                      {audioActive === 'binaural' ? '▶ يعمل الآن' : 'انقر للتشغيل'}
                    </span>
                  </button>
                  <button
                    onClick={() => toggleFocusAudio('rain')}
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition ${
                      audioActive === 'rain'
                        ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    🌧️ الضوضاء البيضاء
                    <span className="block text-[9px] font-normal text-slate-400 mt-1">
                      {audioActive === 'rain' ? '▶ يعمل الآن' : 'انقر للتشغيل'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
