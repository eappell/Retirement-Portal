"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Toast = { id: string; message: string; type?: "success" | "error" | "info" };

type ToastContextValue = {
  showToast: (message: string, type?: Toast["type"]) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 9);
    const toast: Toast = { id, message, type };
    setToasts((t) => [toast, ...t]);
    // auto-dismiss
    window.setTimeout(() => remove(id), 3500);
  }, [remove]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed right-4 bottom-6 z-50 flex flex-col gap-3 items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`max-w-sm w-full rounded-md px-4 py-2 shadow-md text-sm text-white animate-fade-in-up ${
              t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-gray-800"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
