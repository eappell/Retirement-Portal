"use client";

import { Suspense } from "react";
import AppPageContent from "./content";

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-0 bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <AppPageContent />
    </Suspense>
  );
}
