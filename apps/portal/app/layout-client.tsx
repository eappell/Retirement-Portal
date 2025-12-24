"use client";

import {AuthProvider} from "@/lib/auth";
import {ThemeProvider} from "@/lib/theme";
import ToastProvider from "@/components/ToastProvider";

import Footer from "@/components/Footer";

import AppsNav from "@/components/AppsNav";

export default function RootLayoutClient({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <div className="max-w-[1400px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="hidden md:flex gap-6">
              <AppsNav />
              <main className="flex-1">{children}</main>
            </div>
            {/* Mobile / small screens - just render children full width */}
            <div className="md:hidden">{children}</div>
          </div>

          <Footer />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
