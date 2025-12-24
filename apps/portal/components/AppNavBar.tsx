"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/theme";

export default function AppNavBar() {
  const { theme } = useTheme();

  // expose appnav height so layout can offset properly
  useEffect(() => {
    const el = document.getElementById('portal-appnav');
    if (!el) return;
    const setHeight = () => {
      const h = el.offsetHeight;
      document.documentElement.style.setProperty('--portal-appnav-height', `${h}px`);
    };
    setHeight();
    const ro = new ResizeObserver(setHeight);
    ro.observe(el);
    const t = setTimeout(setHeight, 500);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);

  const bgClass = theme === 'light' ? 'bg-white border-b border-gray-100' : 'bg-slate-900 border-b border-slate-700';

  return (
    <div>
      {/* full-width fixed background */}
      <div className={`appnav-fixed ${bgClass}`} />
      {/* content container */}
      <div id="portal-appnav" className="appnav-content">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="text-sm text-gray-500">App navigation or controls go here</div>
          <div className="text-sm text-gray-500">(Optional actions)</div>
        </div>
      </div>
    </div>
  );
}
