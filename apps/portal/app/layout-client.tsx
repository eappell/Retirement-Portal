"use client";

import {AuthProvider} from "@/lib/auth";
import {ThemeProvider} from "@/lib/theme";
import ToastProvider from "@/components/ToastProvider";
import { useEffect } from 'react';

export default function RootLayoutClient({children}: {children: React.ReactNode}) {
  // Defensive guard: ensure unexpected full-viewport overlays (div.fixed.inset-0) don't
  // inadvertently capture pointer events. The observer will add `pointer-events: none`
  // to overlays that do not contain a dialog-like element. This makes the app resilient
  // to accidental overlays without changing existing modal behavior.
  useEffect(() => {
    const guard = () => {
      try {
        document.querySelectorAll('div.fixed.inset-0').forEach((el) => {
          // If the overlay contains a dialog-like element (role dialog/status/alertdialog)
          // or an element with 'data-allow-overlay', treat it as a real overlay and keep pointer
          // events enabled. Otherwise, prevent it from capturing pointer interactions.
          const hasDialog = el.querySelector('[role="dialog"], [role="status"], [role="alertdialog"]');
          const allow = el.hasAttribute('data-allow-overlay');
          if (!hasDialog && !allow) {
            (el as HTMLElement).style.pointerEvents = 'none';
          }
        });
      } catch (e) {
        // Ignore errors; this is best-effort guard only
      }
    };

    guard();
    const observer = new MutationObserver(guard);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1 min-h-0">{children}</main>
          </div>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
