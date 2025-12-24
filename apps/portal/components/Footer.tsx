"use client";

import React from "react";
import { useTheme } from "@/lib/theme";

export default function Footer() {
  const { theme } = useTheme();

  const src = theme === "light" ? "/images/RetireWise-Logo-sm-black-tag.png" : "/images/RetireWise-Logo-sm-white-tag.png";

  return (
    <footer className="mt-8 py-6">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex justify-center">
          <img src={src} alt="RetireWise" className="h-12 md:h-16 w-auto object-contain" />
        </div>
      </div>
    </footer>
  );
}
