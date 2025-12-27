"use client";

import React from "react";
import Image from "next/image";
import { useTheme } from "@/lib/theme";
import logoBlack from "../public/images/RetireWise-Logo-80h-black-tag.png";
import logoWhite from "../public/images/RetireWise-Logo-80h-white-tag.png";

export default function Footer() {
  const { theme } = useTheme();

  const src = theme === "light" ? logoBlack : logoWhite;
  // If the imported image object contains width/height metadata, compute a width that matches
  // a fixed display height of 80px so the logo renders at 80px high (crisp on retina displays).
  const imgMeta: any = src;
  const intrinsicWidth = imgMeta?.width ?? undefined;
  const intrinsicHeight = imgMeta?.height ?? undefined;
  const widthFor80 = (intrinsicWidth && intrinsicHeight) ? Math.round((intrinsicWidth / intrinsicHeight) * 80) : undefined;

  return (
    <footer className="mt-8 py-6">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex justify-center">
          <Image
            src={src}
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
