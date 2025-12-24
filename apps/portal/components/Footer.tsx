"use client";

import React from "react";
import Image from "next/image";
import { useTheme } from "@/lib/theme";
import logoBlack from "../public/images/RetireWise-Logo-80h-black-tag.png";
import logoWhite from "../public/images/RetireWise-Logo-80h-white-tag.png";

export default function Footer() {
  const { theme } = useTheme();

  const src = theme === "light" ? logoBlack : logoWhite;

  return (
    <footer className="mt-8 py-6">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex justify-center">
          <Image src={src} alt="RetireWise" height={80} priority className="w-auto object-contain" />
        </div>
      </div>
    </footer>
  );
}
