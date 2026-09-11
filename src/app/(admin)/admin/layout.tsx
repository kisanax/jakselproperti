import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import AdminShell from "./AdminShell";
import PWARegister from "./PWARegister";
import "./admin.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | jakselproperti.com",
  description: "Internal admin panel — jakselproperti.com",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jaksel Admin",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="admin-theme-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            try {
              var t = localStorage.getItem('admin-theme');
              var theme = (t === 'light' || t === 'dark') ? t : 'dark';
              document.documentElement.setAttribute('data-theme', theme);
              if (document.body) document.body.setAttribute('data-theme', theme);
            } catch(e) {}
          `,
        }}
      />
      <div className={`admin-layout ${inter.variable}`} style={{ fontFamily: "var(--font-admin)" }} suppressHydrationWarning>
        <AdminShell>{children}</AdminShell>
        <PWARegister />
      </div>
    </>
  );
}
