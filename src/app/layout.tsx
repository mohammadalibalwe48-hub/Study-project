import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import PwaInstaller from "@/components/pwa/PwaInstaller";

export const metadata: Metadata = {
  title: {
    default: "منصة البكالوريا السورية الذكية | PWA",
    template: "%s | منصة البكالوريا السورية",
  },
  description:
    "المنصة التعليمية الأولى لطلاب البكالوريا السورية - مراجعة دروس واختبارات تفاعلية ذكية، وحساب العلامات تلقائياً مع دعم نمط PWA للأوفلاين.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  keywords: [
    "البكالوريا السورية",
    "منصة تعليمية",
    "اختبارات تفاعلية",
    "الفرع العلمي",
    "الفرع الأدبي",
    "مراجعة دروس",
    "نماذج وزارية",
    "تطبيق PWA",
  ],
  authors: [{ name: "منصة البكالوريا السورية" }],
  openGraph: {
    title: "منصة البكالوريا السورية الذكية | PWA",
    description:
      "المنصة التعليمية الأولى لطلاب البكالوريا السورية - مراجعة دروس واختبارات تفاعلية ذكية.",
    type: "website",
    locale: "ar_SY",
    images: [{ url: "/images/logo.png", width: 500, height: 500, alt: "شعار البكالوريا السورية" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#06b6d4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" integrity="sha384-GvrOXuhFURyBkB54FfYHFOlHOnH7T128Nxyb48Yvh6g23ZwJwuIdn50wcomD4gEB" crossOrigin="anonymous" />
      </head>
      <body
        className="min-h-full flex flex-col transition-colors duration-200 selection:bg-cyan-300/25 selection:text-white"
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
            <PwaInstaller />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
