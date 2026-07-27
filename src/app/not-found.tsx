import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="app-page-canvas flex min-h-screen items-center justify-center" dir="rtl">
      <section className="app-shell relative w-full max-w-4xl overflow-hidden rounded-[32px] bg-[#fafaf7] p-6 sm:p-10">
        <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-[#dcbcff]" aria-hidden="true" />
        <div className="absolute -bottom-20 -right-12 h-56 w-56 rounded-full bg-[#bce9fa]" aria-hidden="true" />

        <header className="relative z-10 flex items-center justify-between gap-4 border-b-2 border-[#282825] pb-5">
          <Link href="/" className="flex items-center gap-3 font-extrabold">
            <span className="relative h-11 w-11 overflow-hidden rounded-xl border-2 border-[#282825] bg-white">
              <Image src="/images/logo.png" alt="" fill sizes="44px" className="object-contain p-1" priority />
            </span>
            <span>منصة مسار<span className="text-[#ff5636]">.</span></span>
          </Link>
          <span className="app-chip bg-[#ffd64d]">خطأ 404</span>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[520px] max-w-2xl flex-col items-center justify-center text-center">
          <div className="mb-4 text-[clamp(6rem,22vw,12rem)] font-extrabold leading-none tracking-tighter text-[#282825]">404</div>
          <h1 className="text-3xl font-extrabold sm:text-5xl">يبدو أنك ضللت الطريق!</h1>
          <p className="mt-4 max-w-lg text-sm leading-8 text-[#6e6e67]">
            الصفحة التي تحاول الوصول إليها غير موجودة أو تم نقلها. يمكنك العودة إلى البداية أو تصفح المواد المتاحة.
          </p>
          <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className="app-button px-6">
              <Home className="h-4 w-4" /> الصفحة الرئيسية
            </Link>
            <Link href="/subjects" className="app-button app-button-secondary px-6">
              تصفح المواد <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
