"use client";

import React, { useContext, useEffect, useState } from "react";

export type AppNavState = {
  title?: string;
  description?: string;
  visible?: boolean;
  // actions or toolbar buttons can be added here later
  actions?: any[];
};

type AppNavContextValue = {
  state: AppNavState;
  setState: React.Dispatch<React.SetStateAction<AppNavState>>;
};

const defaultValue: AppNavContextValue = {
  state: { visible: false },
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setState: () => {},
};

const AppNavContext = React.createContext<AppNavContextValue>(defaultValue);

export function AppNavProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppNavState>({ visible: false });

  return <AppNavContext.Provider value={{ state, setState }}>{children}</AppNavContext.Provider>;
}

export function useAppNav() {
  return useContext(AppNavContext);
}

// A small client component to declaratively set AppNav content from pages.
export function SetAppNavContent({
  title,
  description,
  visible = true,
}: {
  title?: string;
  description?: string;
  visible?: boolean;
}) {
  const { setState } = useAppNav();

  useEffect(() => {
    // Set on mount/update
    setState((prev) => ({ ...prev, title, description, visible }));
    return () => {
      // Clear visibility on unmount to avoid leaving stale content
      setState((prev) => ({ ...prev, visible: false }));
    };
  }, [title, description, visible, setState]);

  return null;
}
