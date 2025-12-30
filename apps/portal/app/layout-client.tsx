"use client";

import {AuthProvider} from "@/lib/auth";
import {ThemeProvider} from "@/lib/theme";
import ToastProvider from "@/components/ToastProvider";

import Footer from "@/components/Footer";

export default function RootLayoutClient({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1" style={{ paddingTop: 'var(--portal-header-height, 100px)' }}>
              {children}
            </main>
            <Footer />
          </div>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
