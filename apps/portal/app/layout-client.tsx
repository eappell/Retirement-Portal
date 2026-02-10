"use client";

import {AuthProvider} from "@/lib/auth";
import {ThemeProvider} from "@/lib/theme";
import {RetirementProvider} from "@/lib/retirementContext";
import {ToolDataProvider} from "@/contexts/ToolDataContext";
import ToastProvider from "@/components/ToastProvider";

import Footer from "@/components/Footer";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

export default function RootLayoutClient({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToolDataProvider>
          <RetirementProvider>
            <ToastProvider>
            <div className="min-h-screen flex flex-col">
              <main className="flex-1 flex flex-col relative" style={{ paddingTop: 'var(--portal-header-height, 100px)' }}>
                {children}
              </main>
              <Footer />
              <ScrollToTopButton />
            </div>
          </ToastProvider>
          </RetirementProvider>
        </ToolDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
