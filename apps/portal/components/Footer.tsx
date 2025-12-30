"use client";

import React from "react";
import Image from "next/image";
import { useTheme } from "@/lib/theme";
import logoBlack from "../public/images/RetireWise-Logo-80h-black-tag.png";
import logoWhite from "../public/images/RetireWise-Logo-80h-white-tag.png";

export default function Footer() {
  const { theme } = useTheme();

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

  return (
    <footer className="relative mt-[10px] pt-[20px] pb-6" style={{ position: 'static' }}>
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex justify-center">
          <Image
            src={resolvedSrc}
            alt="RetireWise"
            width={widthFor80}
            height={80}
            priority
            className="w-auto h-[80px] min-h-[80px] object-contain"
          />
        </div>
      </div>
    </footer>
  );
}
