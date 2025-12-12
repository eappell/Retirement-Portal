"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useUserTier } from "@/lib/useUserTier";
import { useAnalytics } from "@/lib/useAnalytics";
import { Header } from "@/components/Header";
import { IFrameWrapper } from "@/components/IFrameWrapper";

const APP_REGISTRY = {
  "income-estimator": {
    name: "Monthly Retirement Income Estimator",
    url: "http://localhost:5173/",
    description: "Estimate your retirement income from various sources",
    freeAllowed: true,
  },
  "retire-abroad": {
    name: "Retire Abroad AI",
    url: "http://localhost:3001/",
    description: "Plan your retirement in another country with AI recommendations",
    freeAllowed: true,
  },
};

export default function AppPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { tier, loading: tierLoading } = useUserTier();
  const { trackEvent } = useAnalytics();
  const [mounted, setMounted] = useState(false);
  const [appTitle, setAppTitle] = useState<string>("");
  const [appDescription, setAppDescription] = useState<string>("");

  const appId = (searchParams.get("appId") as keyof typeof APP_REGISTRY) || "";
  const appName = searchParams.get("name") || "";
  const appUrl = searchParams.get("url") || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for app metadata from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "APP_METADATA") {
        setAppTitle(event.data.title || "");
        setAppDescription(event.data.description || "");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (mounted && !user) {
      router.push("/");
    }
  }, [user, mounted, router]);

  // Check if app is allowed for user tier
  useEffect(() => {
    if (mounted && user && !tierLoading && appId) {
      const appConfig = APP_REGISTRY[appId];

      if (!appConfig) {
        router.push("/dashboard");
        return;
      }

      // Check if free tier is restricted from this app
      if (tier === "free" && !appConfig.freeAllowed) {
        router.push("/upgrade");
        return;
      }

      // Track app access
      trackEvent({
        eventType: "app_access",
        application: "portal",
        metadata: {
          appId,
          appName: appConfig.name,
          tier,
        },
      });
    }
  }, [mounted, user, tier, tierLoading, appId, router, trackEvent]);

  if (!mounted || !user || tierLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!appId || !APP_REGISTRY[appId]) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-600 font-semibold mb-4">Application not found</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const app = APP_REGISTRY[appId];

  return (
    <div className="flex flex-col min-h-0 bg-gray-50">
      <Header />

      {/* App Info Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {appTitle || app.name}
            </h2>
            {appDescription && (
              <p className="text-sm text-gray-600">{appDescription}</p>
            )}
          </div>
          <div id="app-toolbar-placeholder" className="flex-shrink-0 flex items-center gap-2" />
        </div>
      </div>

      {/* iFrame Container */}
      <div className="flex-1 overflow-hidden">
        <IFrameWrapper
          appId={appId}
          appName={app.name}
          appUrl={`${app.url}${app.url.includes('?') ? '&' : '?'}embedded=true`}
          description={app.description}
        />
      </div>
    </div>
  );
}
