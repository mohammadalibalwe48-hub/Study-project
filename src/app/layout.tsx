import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: {
    default: "منصة البكالوريا السورية | للتعلم والاختبارات",
    template: "%s | منصة البكالوريا السورية",
  },
  description:
    "المنصة التعليمية الأولى لطلاب البكالوريا السورية - مراجعة دروس واختبارات تفاعلية ذكية وحساب العلامات تلقائياً.",
  manifest: "/manifest.json",
  keywords: [
    "البكالوريا السورية",
    "منصة تعليمية",
    "اختبارات تفاعلية",
    "الفرع العلمي",
    "الفرع الأدبي",
    "مراجعة دروس",
    "نماذج وزارية",
  ],
  authors: [{ name: "منصة البكالوريا السورية" }],
  openGraph: {
    title: "منصة البكالوريا السورية | للتعلم والاختبارات",
    description:
      "المنصة التعليمية الأولى لطلاب البكالوريا السورية - مراجعة دروس واختبارات تفاعلية ذكية.",
    type: "website",
    locale: "ar_SY",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffd500",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className="h-full antialiased font-sans"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" integrity="sha384-GvrOXuhFURyBkB54FfYHFOlHOnH7T128Nxyb48Yvh6g23ZwJwuIdn50wcomD4gEB" crossOrigin="anonymous" />
      </head>
      <body
        className="min-h-full flex flex-col transition-colors duration-200 selection:bg-cyan-300/25 selection:text-white"
      >
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
