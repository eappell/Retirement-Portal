"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useUserTier } from "@/lib/useUserTier";
import { useAnalytics } from "@/lib/useAnalytics";
import { useTheme } from "@/lib/theme";
import { Header } from "@/components/Header";
import { IFrameWrapper } from "@/components/IFrameWrapper";
import { AICoach } from "@/components/AICoach";
import { DashboardVariantTwo } from "@/components/DashboardVariantTwo";
import { useDashboardLayout } from "@/lib/dashboardLayout";

import { db, auth } from "@/lib/firebase";
import { aggregateAllToolData } from "@/lib/dataAggregationService";
import { analyzeCrossToolPatterns } from "@/lib/crossToolAnalyzer";
import type { CrossToolInsight } from "@/lib/types/aggregatedToolData";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  CubeIcon,
  CalculatorIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  GlobeAltIcon,
  RocketLaunchIcon,
  BuildingOfficeIcon,
  HomeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  ShoppingCartIcon,
  SparklesIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { AppIcon } from "@/components/icon-map";

// Available HeroIcons mapping
const AVAILABLE_ICONS = [
  { name: "Calculator", component: CalculatorIcon },
  { name: "Chart Bar", component: ChartBarIcon },
  { name: "Currency Dollar", component: CurrencyDollarIcon },
  { name: "Credit Card", component: CreditCardIcon },
  { name: "Globe", component: GlobeAltIcon },
  { name: "Rocket", component: RocketLaunchIcon },
  { name: "Building", component: BuildingOfficeIcon },
  { name: "Home", component: HomeIcon },
  { name: "User Group", component: UserGroupIcon },
  { name: "Document", component: DocumentTextIcon },
  { name: "Chat", component: ChatBubbleLeftIcon },
  { name: "Shopping Cart", component: ShoppingCartIcon },
  { name: "Sparkles", component: SparklesIcon },
  { name: "Bolt", component: BoltIcon },
  { name: "Cube", component: CubeIcon },
];

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
  "tax-impact-analyzer": {
    name: "Tax Impact Analyzer",
    url: "http://localhost:3001/",
    description: "Analyze tax impacts in retirement with detailed projections",
    freeAllowed: true,
  },
  "healthcare-cost": {
    name: "Healthcare Cost Estimator",
    url: "https://healthcare-cost.vercel.app/",
    description: "Plan for your retirement healthcare expenses with personalized projections",
    freeAllowed: true,
  },
};

export default function AppPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { tier, loading: tierLoading } = useUserTier();
  const { trackEvent } = useAnalytics();
  const { theme } = useTheme();
  const { layout } = useDashboardLayout();
  const [mounted, setMounted] = useState(false);
  const [appTitle, setAppTitle] = useState<string>("");
  const [appDescription, setAppDescription] = useState<string>("");
  const [appConfig, setAppConfig] = useState<any>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [devSettings, setDevSettings] = useState<any>({});
  const [isAICoachOpen, setIsAICoachOpen] = useState(false);
  const [crossToolInsights, setCrossToolInsights] = useState<CrossToolInsight[]>([]);
  const [hasAIInsight, setHasAIInsight] = useState(false);

  const appId = (params.appId as string) || "";
  const appName = searchParams.get("name") || "";
  const appUrl = searchParams.get("url") || "";

  useEffect(() => {
    setMounted(true);
    
    // Load dev settings from localStorage
    try {
      const stored = localStorage.getItem('portal-dev-settings');
      if (stored) {
        setDevSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading dev settings:', e);
    }
    
    // Listen for dev settings changes
    const handleDevSettingsChange = (e: CustomEvent) => {
      setDevSettings(e.detail || {});
    };
    
    window.addEventListener('dev-settings-changed', handleDevSettingsChange as EventListener);
    return () => {
      window.removeEventListener('dev-settings-changed', handleDevSettingsChange as EventListener);
    };
  }, []);

  // Reset state when appId changes (e.g., when switching apps via dropdown)
  useEffect(() => {
    setAppConfig(null);
    setAppTitle("");
    setAppDescription("");
    setLoadingApp(true);
  }, [appId]);

  // Listen for app metadata from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.debug("Portal received message:", event.data);
      if (event.data?.type === "APP_METADATA") {
        console.debug("Setting app title and description:", event.data.title, event.data.description);
        setAppTitle(event.data.title || "");
        setAppDescription(event.data.description || "");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    // Only redirect to login if auth has finished loading and there's no user
    if (mounted && !authLoading && !user) {
      router.push("/");
    }
  }, [user, mounted, authLoading, router]);

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

  // Fetch cross-tool insights from PocketBase
  const fetchCrossToolInsights = useCallback(async () => {
    if (!user || !auth.currentUser) return;

    try {
      const token = await auth.currentUser.getIdToken();
      const aggregatedData = await aggregateAllToolData(token);
      const insights = analyzeCrossToolPatterns(aggregatedData);

      // Check if new high-priority insights appeared
      const newHighPriority = insights.filter(
        i => (i.priority === 'critical' || i.priority === 'high') &&
        !crossToolInsights.some(prev => prev.id === i.id)
      );

      if (newHighPriority.length > 0) {
        setHasAIInsight(true);
      }

      setCrossToolInsights(insights);
    } catch (error) {
      console.error('Error fetching cross-tool insights:', error);
    }
  }, [user, crossToolInsights]);

  // Fetch insights on mount
  useEffect(() => {
    if (mounted && user) {
      fetchCrossToolInsights();
    }
  }, [mounted, user]);

  // Listen for tool data changes via postMessage
  useEffect(() => {
    const handleToolDataSaved = (event: MessageEvent) => {
      if (event.data?.type === 'TOOL_DATA_SAVED') {
        // Refresh insights when any tool saves data
        fetchCrossToolInsights();
      }
    };

    window.addEventListener('message', handleToolDataSaved);
    return () => window.removeEventListener('message', handleToolDataSaved);
  }, [fetchCrossToolInsights]);

  // Keyboard shortcut for AI Coach (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsAICoachOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    const notFoundContent = (
      <div className="text-center py-12">
        <p className="text-red-600 font-semibold mb-4">Application not found</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg"
        >
          Back to Dashboard
        </button>
      </div>
    );

    if (layout === 'sidebar') {
      return <DashboardVariantTwo>{notFoundContent}</DashboardVariantTwo>;
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          {notFoundContent}
        </div>
      </div>
    );
  }

  // If app is disabled in Firestore, show an offline placeholder page
  if (appConfig?.disabled) {
    const disabledContent = (
      <div className="text-center py-12">
        <p className="text-red-600 font-semibold mb-4">{appConfig.name || 'This application'} is temporarily offline</p>
        <p className="text-gray-600 mb-6">We&apos;re sorry — this tool is temporarily unavailable. Please check back later.</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg"
        >
          Back to Dashboard
        </button>
      </div>
    );

    if (layout === 'sidebar') {
      return <DashboardVariantTwo activeNavId={appId}>{disabledContent}</DashboardVariantTwo>;
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          {disabledContent}
        </div>
      </div>
    );
  }

  // Use app URL from query params if provided, otherwise use config
  // If dev mode is enabled for this app, use localhost URL
  let baseAppUrl = appUrl || appConfig.url;
  if (devSettings[appId]?.enabled) {
    const port = devSettings[appId]?.port || '3000';
    baseAppUrl = `http://localhost:${port}/`;
    console.log(`[Portal] Dev mode active for ${appId}: loading from ${baseAppUrl}`);
  }
  const finalAppUrl = `${baseAppUrl}${baseAppUrl.includes('?') ? '&' : '?'}embedded=true`;
  const finalAppName = appName || appConfig.name;

  // App Info Bar content
  const appInfoBar = (
    <div 
      className="border-b z-30 transition-top duration-300 sticky"
      style={{ 
        top: 'var(--portal-header-height, 4rem)',
        backgroundColor: theme === 'light' ? '#F9F8F6' : '#1e293b',
        borderColor: theme === 'light' ? '#e5e7eb' : '#334155'
      }}
    >
      <div className={`${layout !== 'sidebar' ? 'max-w-[1400px]' : ''} mx-auto px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between`}>
        <div className="flex items-center gap-4 flex-1">
          {/* App Icon */}
          <AppIcon icon={appConfig.icon} className={`h-8 w-8 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`} />
          
          {/* App Name and Description */}
          <div className="flex-1">
            <h2 className={`text-lg font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              {appConfig.name}
            </h2>
            {appConfig.description && (
              <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{appConfig.description}</p>
            )}
          </div>
        </div>
        <div id="app-toolbar-placeholder" className="flex-shrink-0 flex items-center gap-2" />
      </div>
    </div>
  );

  // Sidebar layout: render inside DashboardVariantTwo shell
  if (layout === 'sidebar') {
    return (
      <DashboardVariantTwo activeNavId={appId}>
        <div className="v2-app-content">
          {appInfoBar}
          <IFrameWrapper
            key={`${appId}-${finalAppUrl}`}
            appId={appId}
            appName={finalAppName}
            appUrl={finalAppUrl}
            description={appConfig.description}
          />
        </div>
      </DashboardVariantTwo>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-[#F9F8F6]' : 'bg-[#0f172a]'}`}>
      <Header onAICoachOpen={() => setIsAICoachOpen(true)} insightCount={crossToolInsights.filter(i => i.priority === 'critical' || i.priority === 'high').length} topInsight={crossToolInsights[0] || null} />

      {/* AI Coach Panel */}
      <AICoach
        isOpen={isAICoachOpen}
        onClose={() => setIsAICoachOpen(false)}
        initialInsights={crossToolInsights}
      />

      {appInfoBar}

      {/* iFrame Container */}
      <IFrameWrapper
        key={`${appId}-${finalAppUrl}`}
        appId={appId}
        appName={finalAppName}
        appUrl={finalAppUrl}
        description={appConfig.description}
      />
    </div>
  );
}
