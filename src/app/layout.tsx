import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-eb-garamond",
  display: "swap",
});

const theSeasons = localFont({
  src: [
    {
      path: "../../public/fonts/The Seasons Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/The Seasons Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-the-seasons",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jaksel Properti | Properti Pilihan Jakarta Selatan",
  description: "Temukan rumah, apartemen, tanah, dan properti pilihan untuk dijual di Jakarta Selatan.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${theSeasons.variable} ${ebGaramond.variable}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
