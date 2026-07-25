'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { SparkIcon, CloseIcon } from '@/components/icons/SvgIcons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

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

  return (
    <>
      {/* Offline Status Badge */}
      {!isOnline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500/95 text-black px-4 py-2 rounded-full font-bold text-xs shadow-xl flex items-center gap-2 backdrop-blur-md border border-amber-300 animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-red-700 animate-ping" />
          <span>أنت تعمل الآن بدون إنترنت (وضع PWA المحفوظ)</span>
        </div>
      )}

      {/* INSTALL PWA PROMPT BANNER (Shown on browser if installable) */}
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
    </>
  );
}
