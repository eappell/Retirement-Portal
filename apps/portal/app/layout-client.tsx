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
          {children}
          <Footer />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
