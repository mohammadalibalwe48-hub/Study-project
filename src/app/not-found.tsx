'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Home } from 'lucide-react';

export default function NotFound() {
  const [scaleY, setScaleY] = useState(1);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (textRef.current) {
        const textHeight = textRef.current.offsetHeight;
        if (textHeight > 0) {
          const calculatedScaleY = window.innerHeight / textHeight;
          setScaleY(calculatedScaleY);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-[#001420] text-foreground relative select-none font-body" dir="rtl">
      {/* Fullscreen Background Video */}
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
      {/* BACKGROUND "404" TEXT EFFECT */}
      <div 
        className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-30 z-0"
        style={{
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)',
        }}
      >
        <div className="relative flex items-center justify-center w-full h-full">
          <div
            ref={textRef}
            className="text-white/40 font-display leading-none tracking-tighter whitespace-nowrap"
            style={{
              fontSize: 'clamp(200px, 48vw, 800px)',
              transform: `scale(1.15, ${scaleY * 1.4})`,
              transformOrigin: 'center',
            }}
          >
            404
          </div>
        </div>
      </div>

      {/* NAVIGATION BAR */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/10 liquid-glass">
        <Link href="/" className="flex items-center gap-3 cursor-pointer group">
          <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-md border border-white/20">
            <Image
              src="/images/logo.png"
              alt="شعار منصة البكالوريا"
              fill
              sizes="40px"
              className="object-cover group-hover:scale-105 transition-transform"
              priority
            />
          </div>
          <span className="text-white font-display text-2xl tracking-tight">
            منصة البكالوريا
          </span>
        </Link>

        <Link
          href="/"
          className="px-6 py-2.5 rounded-full text-white liquid-glass-glow hover:scale-105 transition-transform flex items-center gap-2 font-medium text-xs border border-cyan-400/40"
        >
          <Home className="w-4 h-4" />
          <span>الصفحة الرئيسية</span>
        </Link>
      </nav>

      {/* CONTENT PANEL */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="liquid-glass-glow rounded-3xl p-10 max-w-lg border border-white/20 space-y-6">
          <span className="text-xs font-medium px-4 py-1.5 liquid-glass rounded-full text-rose-400 border border-rose-400/20 uppercase inline-block">
            خطأ 404 - الصفحة غير موجودة
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-normal text-foreground">
            يبدو أنك ضللت الطريق!
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            الصفحة التي تحاول الوصول إليها غير موجودة أو تم نقلها إلى عنوان آخر.
          </p>

          <Link
            href="/"
            className="liquid-glass-glow w-full inline-flex items-center justify-center gap-2 rounded-full py-4 text-xs font-medium text-foreground hover:scale-105 transition-transform border border-cyan-400/40"
          >
            العودة إلى الصفحة الرئيسية ←
          </Link>
        </div>
      </div>
    </div>
  );
}
