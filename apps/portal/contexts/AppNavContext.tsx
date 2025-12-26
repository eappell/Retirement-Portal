"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type AppNavState = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  visible?: boolean;
};

type AppNavContextValue = {
  state: AppNavState;
  setState: (s: AppNavState) => void;
};

const AppNavContext = createContext<AppNavContextValue | undefined>(undefined);

export const AppNavProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppNavState>({ visible: false });
  return <AppNavContext.Provider value={{ state, setState }}>{children}</AppNavContext.Provider>;
};

export const useAppNav = () => {
  const ctx = useContext(AppNavContext);
  if (!ctx) throw new Error("useAppNav must be used within AppNavProvider");
  return ctx;
};

// Component apps can render to set the app nav content while mounted.
export function SetAppNavContent({ title, description, actions }: { title?: string; description?: string; actions?: ReactNode }) {
  const { setState } = useAppNav();
  useEffect(() => {
    setState({ title, description, actions, visible: true });
    return () => setState({ visible: false });
  }, [title, description, actions, setState]);
  return null;
}
