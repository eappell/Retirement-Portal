"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTheme } from "@/lib/theme";
import logoBlack from "../public/images/RetireWise-Logo-80h-black-tag.png";
import logoWhite from "../public/images/RetireWise-Logo-80h-white-tag.png";

export default function Footer() {
  const { theme } = useTheme();
  const [imgKey, setImgKey] = useState(0);
  const imgWrapperRef = useRef<HTMLDivElement | null>(null);

  const importedSrc = theme === "light" ? logoBlack : logoWhite;

  // Some local dev setups may not have generated the `.next/static/media` hashed file yet.
  // Compute a safe fallback public path (served from `/public/images/...`) when necessary.
  const imgMeta: any = importedSrc;
  const intrinsicWidth = imgMeta?.width ?? undefined;
  const intrinsicHeight = imgMeta?.height ?? undefined;
  const widthFor80 = (intrinsicWidth && intrinsicHeight) ? Math.round((intrinsicWidth / intrinsicHeight) * 80) : undefined;

  // Derive a string URL we can pass to next/image; prefer the imported object's `src` if present,
  // otherwise use the public image path as a fallback.
  const publicPath = theme === 'light' ? '/images/RetireWise-Logo-80h-black-tag.png' : '/images/RetireWise-Logo-80h-white-tag.png';
  const resolvedSrc: string = (typeof importedSrc === 'string' && importedSrc) || imgMeta?.src || publicPath;

  // Force a re-render of the Image component when theme changes and nudge a repaint to avoid
  // rare initial-dark-mode blending/stacking issues that hide the logo until a subsequent theme toggle.
  useEffect(() => {
    // bump key to force remount
    setImgKey(k => k + 1);

    // trigger a minimal reflow on the wrapper to ensure compositing layers update
    if (imgWrapperRef.current) {
      // read then write to force a reflow
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      imgWrapperRef.current.offsetHeight;
      imgWrapperRef.current.style.transform = 'translateZ(0)';
      // revert transform after a tick
      setTimeout(() => {
        if (imgWrapperRef.current) imgWrapperRef.current.style.transform = '';
      }, 50);
    }
  }, [theme]);

  return (
    <footer className="relative z-20 mt-[10px] pt-[20px] pb-6" style={{ position: 'static', isolation: 'isolate' }}>
      <div className="max-w-[1400px] mx-auto px-4">
        <div ref={imgWrapperRef} className="flex justify-center">
          <Image
            key={imgKey}
            src={resolvedSrc}
            alt="RetireWise"
            width={widthFor80}
            height={80}
            priority
            // Ensure logo uses normal blend mode so it isn't blended into overlays behind it
            className="w-auto h-[80px] min-h-[80px] object-contain mix-blend-normal"
            style={{ display: 'block', transform: 'translateZ(0)' }}
          />
        </div>
      </div>
    </footer>
  );
}
