"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useUserTier } from "@/lib/useUserTier";
import { useAnalytics } from "@/lib/useAnalytics";
import { Header } from "@/components/Header";
import { IFrameWrapper } from "@/components/IFrameWrapper";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// Fallback registry for default apps
const DEFAULT_APPS: Record<string, any> = {
  "income-estimator": {
    name: "Monthly Retirement Income Estimator",
    url: "http://localhost:5173/",
    description: "Estimate your retirement income from various sources",
    freeAllowed: true,
  },
  "retire-abroad": {
    name: "Retire Abroad AI",
    url: "https://retire-abroad-ai.vercel.app/",
    description: "Plan your retirement in another country with AI recommendations",
    freeAllowed: true,
  },
};

export default function AppPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { user } = useAuth();
  const { tier, loading: tierLoading } = useUserTier();
  const { trackEvent } = useAnalytics();
  const [mounted, setMounted] = useState(false);
  const [appTitle, setAppTitle] = useState<string>("");
  const [appDescription, setAppDescription] = useState<string>("");
  const [appConfig, setAppConfig] = useState<any>(null);
  const [loadingApp, setLoadingApp] = useState(true);

  const appId = (params.appId as string) || "";
  const appName = searchParams.get("name") || "";
  const appUrl = searchParams.get("url") || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for app metadata from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("Portal received message:", event.data);
      if (event.data?.type === "APP_METADATA") {
        console.log("Setting app title and description:", event.data.title, event.data.description);
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

  // Load app configuration from Firestore
  useEffect(() => {
    const loadAppConfig = async () => {
      try {
        setLoadingApp(true);
        const appsRef = collection(db, "apps");
        const q = query(appsRef, where("id", "==", appId));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const appDoc = snapshot.docs[0];
          setAppConfig(appDoc.data());
        } else {
          // Fall back to default apps
          setAppConfig(DEFAULT_APPS[appId] || null);
        }
      } catch (error) {
        console.error("Error loading app config:", error);
        // Fall back to default apps on error
        setAppConfig(DEFAULT_APPS[appId] || null);
      } finally {
        setLoadingApp(false);
      }
    };

    if (mounted && appId) {
      loadAppConfig();
    }
  }, [mounted, appId]);

  // Check if app is allowed for user tier
  useEffect(() => {
    if (mounted && user && !tierLoading && appId && appConfig) {
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
  }, [mounted, user, tier, tierLoading, appId, appConfig, router, trackEvent]);

  if (!mounted || !user || tierLoading || loadingApp) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!appId || !appConfig) {
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

  // Use app URL from query params if provided, otherwise use config
  const finalAppUrl = appUrl || appConfig.url;
  const finalAppName = appName || appConfig.name;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />

      {/* App Info Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {appTitle || finalAppName}
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
          appName={finalAppName}
          appUrl={finalAppUrl}
          description={appConfig.description}
        />
      </div>
    </div>
  );
}
