import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import Script from 'next/script';
import "./globals.css";
import {AuthProvider} from "@/lib/auth";
import RootLayoutClient from "./layout-client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RetireWise - Plan Your Future",
  description: "Comprehensive retirement planning portal with multiple retirement calculators and AI recommendations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        {/* Remove any attributes injected by browser extensions before React hydrates */}
        <Script id="strip-extension-attributes" strategy="beforeInteractive">{`
          const html = document.documentElement;
          // Remove common extension attributes
          html.removeAttribute('rp-extension');
          html.removeAttribute('data-be-installed');
          // Remove any style attributes that might be added
          html.removeAttribute('style');
        `}</Script>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
