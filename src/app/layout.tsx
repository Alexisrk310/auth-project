import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider"; // Restoring this import
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://thunderxis.vercel.app'),
  title: {
    default: "ThunderXis | Future Fashion",
    template: "%s | ThunderXis"
  },
  description: "Dystopian Streetwear Store. Explore the future of fashion with our exclusive collection.",
  openGraph: {
    title: "ThunderXis | Future Fashion",
    description: "Dystopian Streetwear Store. Explore the future of fashion.",
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://thunderxis.vercel.app',
    siteName: 'ThunderXis',
    locale: 'es_CO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ThunderXis | Future Fashion',
    description: 'Dystopian Streetwear Store',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <ToastProvider>
            <Navbar />
            {children}
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
