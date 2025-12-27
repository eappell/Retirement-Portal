"use client";

import React from "react";
import Image from "next/image";
import { useTheme } from "@/lib/theme";
import logoBlack from "../public/images/RetireWise-Logo-80h-black-tag.png";
import logoWhite from "../public/images/RetireWise-Logo-80h-white-tag.png";

export default function Footer() {
  const { theme } = useTheme();

  const src = theme === "light" ? logoBlack : logoWhite;
  // If the imported image object contains width/height metadata, use those so Next/Image serves
  // the image at its native resolution (preserving full resolution on high-DPI screens).
  const imgMeta: any = src;
  const intrinsicWidth = imgMeta?.width ?? undefined;
  const intrinsicHeight = imgMeta?.height ?? undefined;

  return (
    <footer className="mt-8 py-6">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex justify-center">
          <Image
            src={src}
            alt="RetireWise"
            width={intrinsicWidth}
            height={intrinsicHeight}
            priority
            className="w-auto h-auto object-contain"
          />
        </div>
      </div>
    </footer>
  );
}
