"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useUserTier } from "@/lib/useUserTier";
import { useAnalytics } from "@/lib/useAnalytics";
import { Header } from "@/components/Header";
import { IFrameWrapper } from "@/components/IFrameWrapper";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// Dev settings interface (matches admin apps page)
interface DevSettings {
  [appId: string]: {
    enabled: boolean;
    port: string;
  };
}

const DEV_SETTINGS_KEY = 'portal-dev-settings';

function getDevSettings(): DevSettings {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(DEV_SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function getEffectiveUrl(appId: string, url: string, devSettings: DevSettings): string {
  const setting = devSettings[appId];
  if (setting?.enabled && setting.port) {
    return `http://localhost:${setting.port}`;
  }
  return url;
}

interface AppConfig {
  id: string;
  name: string;
  url: string;
  description: string;
  freeAllowed: boolean;
}

// Fallback registry for apps not yet in Firebase
const FALLBACK_REGISTRY: Record<string, AppConfig> = {
  "income-estimator": {
    id: "income-estimator",
    name: "Monthly Retirement Income Estimator",
    url: "http://localhost:5173/",
    description: "Estimate your retirement income from various sources",
    freeAllowed: true,
  },
  "retire-abroad": {
    id: "retire-abroad",
    name: "Retire Abroad AI",
    url: "http://localhost:3001/",
    description: "Plan your retirement in another country with AI recommendations",
    freeAllowed: true,
  },
  "pension-vs-lumpsum-analyzer": {
    id: "pension-vs-lumpsum-analyzer",
    name: "Pension vs. Lump Sum Analyzer",
    url: "http://localhost:3002/",
    description: "Compare pension vs lump sum options with detailed analysis",
    freeAllowed: true,
  },
  "longevity-drawdown-planner": {
    id: "longevity-drawdown-planner",
    name: "Longevity & Drawdown Planner",
    url: "http://localhost:3000/",
    description: "Personalized longevity and withdrawal strategy planner",
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
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [devSettings, setDevSettings] = useState<DevSettings>({});

  const appId = searchParams.get("appId") || "";

  useEffect(() => {
    setMounted(true);
    setDevSettings(getDevSettings());
  }, []);

  // Fetch app config from Firebase
  useEffect(() => {
    async function fetchAppConfig() {
      if (!appId) {
        setLoadingApp(false);
        return;
      }

      try {
        // Try to fetch from Firebase first
        const appsRef = collection(db, "apps");
        const q = query(appsRef, where("id", "==", appId));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const appData = snapshot.docs[0].data() as AppConfig;
          setAppConfig(appData);
        } else if (FALLBACK_REGISTRY[appId]) {
          // Fall back to local registry
          setAppConfig(FALLBACK_REGISTRY[appId]);
        } else {
          setAppConfig(null);
        }
      } catch (error) {
        console.error("Error fetching app config:", error);
        // Fall back to local registry on error
        if (FALLBACK_REGISTRY[appId]) {
          setAppConfig(FALLBACK_REGISTRY[appId]);
        } else {
          setAppConfig(null);
        }
      } finally {
        setLoadingApp(false);
      }
    }

    if (mounted) {
      fetchAppConfig();
    }
  }, [appId, mounted]);

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
    if (mounted && user && !tierLoading && !loadingApp && appId) {
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
  }, [mounted, user, tier, tierLoading, loadingApp, appId, appConfig, router, trackEvent]);

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
              type="button"
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

  // Get effective URL (respects dev settings for local development)
  const effectiveUrl = getEffectiveUrl(appId, appConfig.url, devSettings);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />

      {/* App Info Bar */}
      <div
        className="bg-white border-b border-gray-200 sticky z-30"
        style={{ top: 'var(--portal-header-height, 4rem)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {appTitle || appConfig.name}
            </h2>
            {appDescription && (
              <p className="text-sm text-gray-600">{appDescription}</p>
            )}
          </div>
          <div id="app-toolbar-placeholder" className="flex-shrink-0 flex items-center gap-2" />
        </div>
      </div>

      {/* iFrame Container */}
      <div className="flex-1 overflow-visible flex justify-center">
        <div className="w-full max-w-7xl">
          <IFrameWrapper
            appId={appId}
            appName={appConfig.name}
            appUrl={`${effectiveUrl}${effectiveUrl.includes('?') ? '&' : '?'}embedded=true`}
            description={appConfig.description}
          />
        </div>
      </div>
    </div>
  );
}
