"use client";

import {AuthProvider} from "@/lib/auth";
import {ThemeProvider} from "@/lib/theme";
import ToastProvider from "@/components/ToastProvider";

export default function RootLayoutClient({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
