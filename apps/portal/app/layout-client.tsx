"use client";

import {AuthProvider} from "@/lib/auth";
import {ThemeProvider} from "@/lib/theme";
import ToastProvider from "@/components/ToastProvider";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import AppNavBar from "@/components/AppNavBar";
import { AppNavProvider } from "@/contexts/AppNavContext";

export default function RootLayoutClient({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppNavProvider>
          <Header />
          <AppNavBar />

          <div className="main-portal-content">
            <div className="max-w-[1400px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
              <main>{children}</main>
            </div>
          </div>
        </AppNavProvider>

        <Footer />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
