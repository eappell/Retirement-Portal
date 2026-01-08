"use client";

import { useState, useEffect } from "react";
import { ArrowUpIcon } from "@heroicons/react/24/solid";

export function ScrollToTopButton() {
  // Temporarily hide portal-level scroll-to-top control to avoid duplicate UX
  // while embedded apps rely on portal chrome for scrolling.
  return null;
}
