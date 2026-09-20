import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jaksel Properti | Properti Pilihan Jakarta Selatan",
  description: "Temukan rumah, apartemen, tanah, dan properti pilihan untuk dijual di Jakarta Selatan.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <body className={jakarta.variable} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}


