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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        {/* Remove any rp-extension attribute injected by browser extensions before React hydrates */}
        <Script id="strip-rp-extension" strategy="beforeInteractive">{`document.documentElement.removeAttribute('rp-extension');`}</Script>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
