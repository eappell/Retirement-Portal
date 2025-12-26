"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/theme";

import { useAppNav } from "@/contexts/AppNavContext";

export default function AppNavBar() {
  const { theme } = useTheme();
  const { state } = useAppNav();

  // expose appnav height so layout can offset properly, or collapse to 0 when hidden
  useEffect(() => {
    const el = document.getElementById('portal-appnav');
    if (!el) return;
    if (!state?.visible) {
      document.documentElement.style.setProperty('--portal-appnav-height', `0px`);
      return;
    }
    const setHeight = () => {
      const h = el.offsetHeight;
      document.documentElement.style.setProperty('--portal-appnav-height', `${h}px`);
    };
    setHeight();
    const ro = new ResizeObserver(setHeight);
    ro.observe(el);
    const t = setTimeout(setHeight, 500);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [state?.visible, state?.title, state?.description, state?.actions]);

  const bgClass = theme === 'light' ? 'bg-white border-b border-gray-100' : 'bg-slate-900 border-b border-slate-700';

  return (
    <div aria-hidden={!state?.visible}>
      {/* full-width fixed background (hidden when not visible) */}
      <div className={`appnav-fixed ${state?.visible ? bgClass : 'bg-transparent'}`} />
      {/* content container (keeps space when visible) */}
      <div id="portal-appnav" className="appnav-content">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
          <div className="pr-4">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{state?.title}</div>
            {state?.description && <div className="text-xs text-gray-600 dark:text-gray-400">{state.description}</div>}
          </div>
          <div className="flex items-center gap-2">{state?.actions}</div>
        </div>
      </div>
    </div>
  );
}
