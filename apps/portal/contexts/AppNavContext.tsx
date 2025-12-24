"use client";

import React, { createContext, useContext, useState } from "react";

export interface AppNavContent {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

interface AppNavContextValue {
  content: AppNavContent | null;
  setContent: (c: AppNavContent | null) => void;
}

const AppNavContext = createContext<AppNavContextValue | undefined>(undefined);

export const AppNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<AppNavContent | null>(null);
  return <AppNavContext.Provider value={{ content, setContent }}>{children}</AppNavContext.Provider>;
};

export function useAppNav() {
  const ctx = useContext(AppNavContext);
  if (!ctx) throw new Error("useAppNav must be used within AppNavProvider");
  return ctx;
}
