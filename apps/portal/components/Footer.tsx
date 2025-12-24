"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useTheme } from "@/lib/theme";
import logoBlack from "../public/images/RetireWise-Logo-80h-black-tag.png";
import logoWhite from "../public/images/RetireWise-Logo-80h-white-tag.png";

export default function Footer() {
  const { theme } = useTheme();

  const src = theme === "light" ? logoBlack : logoWhite;

  // Make footer fixed and expose its height so pages (iframes) can avoid being obscured.
  // We set body padding-bottom to the footer's computed height and clean up on unmount.
  useEffect(() => {
    const el = document.getElementById('portal-footer');
    if (!el) return;
    const setPadding = () => {
      const h = el.offsetHeight;
      // set CSS variable and body padding
      document.documentElement.style.setProperty('--portal-footer-height', `${h}px`);
      document.body.style.paddingBottom = `${h}px`;
    };
    setPadding();
    const ro = new ResizeObserver(setPadding);
    ro.observe(el);
    // ensure a small timeout to allow fonts/images to load and affect size
    const t = setTimeout(setPadding, 1000);
    return () => {
      ro.disconnect();
      clearTimeout(t);
      document.documentElement.style.removeProperty('--portal-footer-height');
      // avoid removing unrelated padding if other code modified it: only clear if it matches our value
      if (document.body.style.paddingBottom) document.body.style.paddingBottom = "";
    };
  }, []);

  return (
    <footer id="portal-footer" className="fixed left-0 right-0 bottom-0 z-40">
      <div className="bg-white dark:bg-[#001021] border-t border-gray-200 dark:border-slate-700 py-3">
        <div className="max-w-[1400px] mx-auto px-4 flex justify-center">
          <Image src={src} alt="RetireWise" height={80} priority className="w-auto object-contain" />
        </div>
      </div>
    </footer>
  );
}
