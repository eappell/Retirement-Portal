"use client";

import {AuthProvider} from "@/lib/auth";
import {ThemeProvider} from "@/lib/theme";
import ToastProvider from "@/components/ToastProvider";

import Footer from "@/components/Footer";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

export default function RootLayoutClient({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <div className="h-screen flex flex-col overflow-hidden">
            <main className="flex-1 flex flex-col relative overflow-hidden" style={{ paddingTop: 'var(--portal-header-height, 100px)' }}>
              {children}
            </main>
            <Footer />
            <ScrollToTopButton />
          </div>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
