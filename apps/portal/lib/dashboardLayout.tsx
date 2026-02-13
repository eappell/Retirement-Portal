"use client";

import { createContext, useContext, ReactNode } from "react";

export type DashboardLayout = "default" | "sidebar";

interface DashboardLayoutContextType {
  layout: DashboardLayout;
  setLayout: (layout: DashboardLayout) => void;
  toggleLayout: () => void;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextType | undefined>(undefined);

export function DashboardLayoutProvider({ children }: { children: ReactNode }) {
  // Sidebar is now the only layout — always return "sidebar"
  const layout: DashboardLayout = "sidebar";

  const setLayout = (_newLayout: DashboardLayout) => {
    // no-op: sidebar is the permanent layout
  };

  const toggleLayout = () => {
    // no-op: sidebar is the permanent layout
  };

  return (
    <DashboardLayoutContext.Provider value={{ layout, setLayout, toggleLayout }}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);
  if (!context) {
    // Return a safe fallback for components rendered outside the provider
    return {
      layout: "sidebar" as DashboardLayout,
      setLayout: () => {/* no-op fallback */},
      toggleLayout: () => {/* no-op fallback */},
    };
  }
  return context;
}
