"use client";

import {AuthProvider} from "@/lib/auth";
import {ThemeProvider} from "@/lib/theme";
import ToastProvider from "@/components/ToastProvider";

import Footer from "@/components/Footer";
import { AppNavProvider } from "@/contexts/AppNavContext";

export default function RootLayoutClient({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppNavProvider>
            <div className="max-w-[1400px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
              <main>{children}</main>
            </div>

            <Footer />
          </AppNavProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
