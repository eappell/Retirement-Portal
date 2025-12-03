"use client";

import {AuthProvider} from "@/lib/auth";

export default function RootLayoutClient({children}: {children: React.ReactNode}) {
  return <AuthProvider>{children}</AuthProvider>;
}
