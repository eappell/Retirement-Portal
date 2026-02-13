"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useUserTier } from "@/lib/useUserTier";
import { useAnalytics } from "@/lib/useAnalytics";
import { useToolData } from "@/contexts/ToolDataContext";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { AppIcon } from "@/components/icon-map";
import { AICoach } from "@/components/AICoach";
import { Orchestrator } from "@/components/Orchestrator";
import { aggregateAllToolData } from "@/lib/dataAggregationService";
import { analyzeCrossToolPatterns } from "@/lib/crossToolAnalyzer";
import { loadToolData, TOOL_IDS } from "@/lib/pocketbaseDataService";
import type { CrossToolInsight } from "@/lib/types/aggregatedToolData";
import type { OrchestratorPlan } from "@/lib/types/orchestratorTypes";
import { SunIcon, MoonIcon, SparklesIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { useRetirementData } from "@/lib/retirementContext";

import logoSmBlack from "../public/images/RetireWise-Logo-black-notag-240.png";
import logoSmWhite from "../public/images/RetireWise-Logo-white-notag-240.png";

interface DevSettings {
  [appId: string]: {
    enabled: boolean;
    port: string;
  };
}

const DEV_SETTINGS_KEY = 'portal-dev-settings';
const ORCHESTRATOR_CACHE_KEY = 'retirewise_orchestrator_plan_v1';
const ORCHESTRATOR_PLAN_UPDATED_EVENT = 'orchestrator-plan-updated';

function getDevSettings(): DevSettings {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(DEV_SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function getEffectiveUrl(app: { id: string; url: string }, devSettings: DevSettings): string {
  const setting = devSettings[app.id];
  if (setting?.enabled && setting.port) {
    return `http://localhost:${setting.port}`;
  }
  return app.url;
}

interface App {
  id: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  freeAllowed?: boolean;
  gradient?: string;
  disabled?: boolean;
  badge?: string;
  sortOrder?: number;
  category?: string;
}

// Map app IDs/names to categories based on expected groupings
function determineCategory(app: { id: string; name: string }): string {
  const key = `${app.id} ${app.name}`.toLowerCase();

  // Financial Security tools
  if (
    key.includes('income') ||
    key.includes('estimator') ||
    key.includes('planner') && (key.includes('retirement') || key.includes('income')) ||
    key.includes('social security') ||
    key.includes('ss-') ||
    key.includes('tax') ||
    key.includes('longevity') ||
    key.includes('drawdown') ||
    key.includes('healthcare') ||
    key.includes('health') ||
    key.includes('pension')
  ) {
    return 'financial';
  }

  // Lifestyle & Purpose tools
  if (
    key.includes('abroad') ||
    key.includes('state') && key.includes('relocat') ||
    key.includes('identity') ||
    key.includes('volunteer') ||
    key.includes('purpose') ||
    key.includes('activity')
  ) {
    return 'lifestyle';
  }

  // Legacy & Impact tools
  if (
    key.includes('legacy') ||
    key.includes('gift') ||
    key.includes('estate') ||
    key.includes('digital')
  ) {
    return 'legacy';
  }

  // Default to financial if unknown
  return 'financial';
}

const DEFAULT_APPS: App[] = [
  {
    id: "income-estimator",
    name: "Retirement Income Planner",
    description: "Model income, taxes, and net worth across every scenario with Monte Carlo simulation.",
    icon: "ChartBarIcon",
    url: "http://localhost:5173/",
    freeAllowed: true,
    category: "financial",
  },
  {
    id: "ss-optimizer",
    name: "Social Security Optimization",
    description: "Find the claiming strategy that maximizes your lifetime benefits.",
    icon: "BuildingLibraryIcon",
    url: "http://localhost:5174/",
    freeAllowed: true,
    category: "financial",
  },
  {
    id: "tax-analyzer",
    name: "Tax Impact Analyzer",
    description: "Plan Roth conversions, withdrawal order, and IRMAA avoidance.",
    icon: "DocumentTextIcon",
    url: "http://localhost:3001/",
    freeAllowed: true,
    category: "financial",
  },
  {
    id: "longevity-planner",
    name: "Longevity & Drawdown",
    description: "Determine sustainable withdrawal strategies based on longevity estimates.",
    icon: "ArrowTrendingDownIcon",
    url: "http://localhost:5175/",
    freeAllowed: true,
    category: "financial",
  },
  {
    id: "healthcare-cost",
    name: "Healthcare Cost Calculator",
    description: "Project lifetime healthcare costs with Medicare, IRMAA, long-term care.",
    icon: "HeartIcon",
    url: "http://localhost:5176/",
    freeAllowed: true,
    category: "financial",
  },
  {
    id: "retire-abroad",
    name: "Retire Abroad AI",
    description: "Compare 100+ countries across cost of living, healthcare, visas, and culture.",
    icon: "GlobeAltIcon",
    url: "https://retire-abroad-ai.vercel.app/",
    freeAllowed: true,
    category: "lifestyle",
  },
  {
    id: "state-relocator",
    name: "State Relocate Selector",
    description: "Compare states with comprehensive tax analysis and relocation guidance.",
    icon: "HomeIcon",
    url: "http://localhost:5177/",
    freeAllowed: true,
    category: "lifestyle",
  },
  {
    id: "retirement-identity-builder",
    name: "Retirement Identity Builder",
    description: "Discover who you are beyond your career with a 7-step guided journey.",
    icon: "SparklesIcon",
    url: "http://localhost:5178/",
    freeAllowed: true,
    category: "lifestyle",
  },
  {
    id: "volunteer-matcher",
    name: "Volunteer Purpose Matchmaker",
    description: "Match your skills to meaningful volunteer opportunities near you.",
    icon: "UserGroupIcon",
    url: "http://localhost:5179/",
    freeAllowed: true,
    category: "lifestyle",
  },
  {
    id: "legacy-flow-visualizer",
    name: "Legacy Flow Visualizer",
    description: "Visualize estate distribution with interactive Sankey diagrams.",
    icon: "ScaleIcon",
    url: "http://localhost:5180/",
    freeAllowed: true,
    category: "legacy",
  },
  {
    id: "gifting-planner",
    name: "Gifting Strategy Planner",
    description: "Plan meaningful lifetime gifts within tax thresholds.",
    icon: "GiftIcon",
    url: "http://localhost:5181/",
    freeAllowed: true,
    category: "legacy",
  },
  {
    id: "digital-estate-manager",
    name: "Digital Estate Manager",
    description: "Organize your complete digital legacy vault.",
    icon: "LockClosedIcon",
    url: "http://localhost:5182/",
    freeAllowed: true,
    category: "legacy",
  },
];

// Category definitions
const CATEGORIES = [
  {
    id: "financial",
    name: "Financial Security",
    description: "Income, taxes, Social Security, healthcare & withdrawal strategies",
    icon: "💰",
    badgeClass: "badge-financial",
    cardAccent: "linear-gradient(90deg, #3b82f6, #60a5fa)",
    tagClass: "tag-financial",
  },
  {
    id: "lifestyle",
    name: "Lifestyle & Purpose",
    description: "Where you'll live, who you'll be, and how you'll spend your time",
    icon: "🌅",
    badgeClass: "badge-lifestyle",
    cardAccent: "linear-gradient(90deg, #8b5cf6, #a78bfa)",
    tagClass: "tag-lifestyle",
  },
  {
    id: "legacy",
    name: "Legacy & Impact",
    description: "Estate distribution, lifetime giving, and your digital footprint",
    icon: "🌿",
    badgeClass: "badge-legacy",
    cardAccent: "linear-gradient(90deg, #10b981, #34d399)",
    tagClass: "tag-legacy",
  },
];

// Sidebar overview navigation items
const NAV_OVERVIEW = [
  { id: "dashboard", label: "Dashboard", icon: "⊞", href: "/dashboard" },
  { id: "ai-coach", label: "AI Coach", icon: "✦", href: "#", action: "open-ai-coach" as const },
  { id: "action-plan", label: "Action Plan", icon: "▷", href: "#", action: "open-orchestrator" as const },
];

// Sidebar app icon map - resolve from both app ID and Heroicon name
const SIDEBAR_APP_ICONS: Record<string, string> = {
  // By app ID
  'income-estimator': '📊',
  'retirement-income-estimator': '📊',
  'income-planner': '📊',
  'retirement-income-planner': '📊',
  'ss-optimizer': '🏛️',
  'social-security': '🏛️',
  'social-security-optimizer': '🏛️',
  'tax-analyzer': '🧾',
  'tax-impact': '🧾',
  'tax-impact-analyzer': '🧾',
  'longevity-planner': '📉',
  'longevity-drawdown': '📉',
  'longevity-and-drawdown': '📉',
  'healthcare-cost': '🏥',
  'healthcare': '🏥',
  'healthcare-cost-calculator': '🏥',
  'retire-abroad': '🌍',
  'retire-abroad-ai': '🌍',
  'state-relocator': '🏡',
  'state-relocate': '🏡',
  'state-relocation': '🏡',
  'state-relocate-selector': '🏡',
  'retirement-identity-builder': '✨',
  'identity-builder': '✨',
  'volunteer-matcher': '🤝',
  'volunteer-purpose': '🤝',
  'volunteer-purpose-matchmaker': '🤝',
  'legacy-flow-visualizer': '⚖️',
  'legacy-visualizer': '⚖️',
  'gifting-planner': '🎁',
  'gifting-strategy': '🎁',
  'gifting-strategy-planner': '🎁',
  'digital-estate-manager': '🔐',
  'digital-estate': '🔐',
  'estate-manager': '🔐',
  // By Heroicon name (fallback when ID doesn't match)
  'ChartBarIcon': '📊',
  'BuildingLibraryIcon': '🏛️',
  'DocumentTextIcon': '🧾',
  'ArrowTrendingDownIcon': '📉',
  'HeartIcon': '🏥',
  'GlobeAltIcon': '🌍',
  'HomeIcon': '🏡',
  'SparklesIcon': '✨',
  'UserGroupIcon': '🤝',
  'ScaleIcon': '⚖️',
  'GiftIcon': '🎁',
  'LockClosedIcon': '🔐',
  'Heart': '🏥',
  'Globe': '🌍',
  'Home': '🏡',
  'Sparkles': '✨',
  'Users': '🤝',
  'Scale': '⚖️',
  'Gift': '🎁',
  'Lock': '🔐',
  'BarChart': '📊',
  'Building': '🏛️',
  'FileText': '🧾',
  'TrendingDown': '📉',
};

/** Resolve an emoji icon for a sidebar app by trying id, icon name, and keyword matching */
function getSidebarIcon(app: { id: string; name: string; icon?: string }): string {
  // Direct ID match
  if (SIDEBAR_APP_ICONS[app.id]) return SIDEBAR_APP_ICONS[app.id];
  // Icon name match
  if (app.icon && SIDEBAR_APP_ICONS[app.icon]) return SIDEBAR_APP_ICONS[app.icon];
  // Keyword match on app name
  const n = app.name.toLowerCase();
  if (n.includes('income') || n.includes('planner') && !n.includes('gift')) return '📊';
  if (n.includes('social security')) return '🏛️';
  if (n.includes('tax')) return '🧾';
  if (n.includes('longevity') || n.includes('drawdown')) return '📉';
  if (n.includes('healthcare') || n.includes('health')) return '🏥';
  if (n.includes('abroad')) return '🌍';
  if (n.includes('state') && n.includes('reloc')) return '🏡';
  if (n.includes('identity')) return '✨';
  if (n.includes('volunteer') || n.includes('purpose')) return '🤝';
  if (n.includes('legacy')) return '⚖️';
  if (n.includes('gift')) return '🎁';
  if (n.includes('digital') || n.includes('estate')) return '🔐';
  return '📦';
}

// Short names for sidebar display
const SIDEBAR_APP_NAMES: Record<string, string> = {
  'income-estimator': 'Income Planner',
  'ss-optimizer': 'Social Security',
  'tax-analyzer': 'Tax Analyzer',
  'longevity-planner': 'Longevity & Drawdown',
  'healthcare-cost': 'Healthcare Costs',
  'retire-abroad': 'Retire Abroad AI',
  'state-relocator': 'State Relocation',
  'retirement-identity-builder': 'Identity Builder',
  'volunteer-matcher': 'Volunteer Match',
  'legacy-flow-visualizer': 'Legacy Visualizer',
  'gifting-planner': 'Gifting Planner',
  'digital-estate-manager': 'Digital Estate',
};

/** Parse first name from full name string or email */
function parseFirstName(user: { name?: string | null; displayName?: string | null; email?: string | null }): string {
  // Try name field first (from auth context)
  const fullName = user.name || user.displayName;
  if (fullName && fullName.trim()) {
    const firstName = fullName.trim().split(/\s+/)[0];
    if (firstName && firstName.length > 0) return firstName;
  }
  // Fallback to email prefix
  if (user.email) {
    const prefix = user.email.split('@')[0];
    // If email prefix looks like a name (not all numbers), capitalize it
    if (prefix && !/^\d+$/.test(prefix)) {
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
  }
  return 'Planner';
}

export function DashboardVariantTwo({ children, activeNavId }: { children?: React.ReactNode; activeNavId?: string } = {}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { tier, loading: tierLoading } = useUserTier();
  const { trackEvent } = useAnalytics();
  const { toolData: cachedToolData, isLoading: toolDataLoading, isInitialized: toolDataReady } = useToolData();
  const { userData } = useRetirementData();

  const [mounted, setMounted] = useState(false);
  const [apps, setApps] = useState<App[]>(DEFAULT_APPS);
  const [loadingApps, setLoadingApps] = useState(true);
  const [devSettings, setDevSettings] = useState<DevSettings>({});
  const [isAICoachOpen, setIsAICoachOpen] = useState(false);
  const [isOrchestratorOpen, setIsOrchestratorOpen] = useState(false);
  const [crossToolInsights, setCrossToolInsights] = useState<CrossToolInsight[]>([]);
  const [insightsLastFetched, setInsightsLastFetched] = useState<Date | null>(null);
  const [orchestratorScore, setOrchestratorScore] = useState<number | null>(null);
  const [orchestratorPlan, setOrchestratorPlan] = useState<OrchestratorPlan | null>(null);
  const [showInsightPreview, setShowInsightPreview] = useState(false);
  const [previewInsightIndex, setPreviewInsightIndex] = useState(0);
  const insightHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      try { return localStorage.getItem('v2-sidebar-collapsed') === 'true'; } catch { return false; }
    }
    return false;
  });
  const [adminPopout, setAdminPopout] = useState<{ top: number; left: number } | null>(null);
  const adminTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userPopout, setUserPopout] = useState<{ top: number; left: number } | null>(null);
  const userTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('v2-sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  // Fetch cross-tool insights
  const fetchCrossToolInsights = useCallback(async () => {
    if (!user || !auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const aggregatedData = await aggregateAllToolData(token, cachedToolData);
      const insights = analyzeCrossToolPatterns(aggregatedData);
      setCrossToolInsights(insights);
      setInsightsLastFetched(new Date());
    } catch (error) {
      console.error('Error fetching cross-tool insights:', error);
    }
  }, [user, cachedToolData]);

  useEffect(() => {
    setMounted(true);
    setDevSettings(getDevSettings());

    // Override global layout padding for sidebar layout
    document.documentElement.style.setProperty('--portal-header-height', '0px');
    // Hide the global ScrollToTop when sidebar layout is active
    const scrollToTop = document.querySelector('[class*="scroll-to-top"], [class*="ScrollToTop"]') as HTMLElement | null;
    if (scrollToTop) scrollToTop.style.display = 'none';

    const handleDevSettingsChange = (e: CustomEvent<DevSettings>) => {
      setDevSettings(e.detail);
    };
    window.addEventListener('dev-settings-changed', handleDevSettingsChange as EventListener);

    // Keyboard shortcut for AI Coach (Cmd/Ctrl + K)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsAICoachOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('dev-settings-changed', handleDevSettingsChange as EventListener);
      window.removeEventListener('keydown', handleKeyDown);
      // Restore global layout when unmounting
      document.documentElement.style.removeProperty('--portal-header-height');
      if (scrollToTop) scrollToTop.style.display = '';
    };
  }, []);

  // Fetch insights when ready
  useEffect(() => {
    if (mounted && user && !insightsLastFetched && toolDataReady && !toolDataLoading) {
      fetchCrossToolInsights();
    }
  }, [mounted, user, insightsLastFetched, toolDataReady, toolDataLoading, fetchCrossToolInsights]);

  // Load orchestrator score
  useEffect(() => {
    if (!mounted || !user) return;

    const loadOrchestratorSummary = async () => {
      const raw = localStorage.getItem(ORCHESTRATOR_CACHE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.userId === user.uid && typeof parsed.plan?.retirementReadinessScore === 'number') {
            setOrchestratorScore(parsed.plan.retirementReadinessScore);
          }
        } catch { /* ignore */ }
      }

      if (!auth.currentUser) return;
      try {
        const token = await auth.currentUser.getIdToken();
        const saved = await loadToolData(token, TOOL_IDS.ORCHESTRATOR_PLAN);
        const pbPlan = saved?.data?.plan as OrchestratorPlan | undefined;
        if (pbPlan) {
          if (typeof pbPlan.retirementReadinessScore === 'number') {
            setOrchestratorScore(pbPlan.retirementReadinessScore);
          }
          setOrchestratorPlan(pbPlan);
        }
      } catch (error) {
        console.warn('Failed to load orchestrator plan summary:', error);
      }
    };

    const handlePlanUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ score?: number }>;
      if (typeof customEvent.detail?.score === 'number') {
        setOrchestratorScore(customEvent.detail.score);
      }
    };

    void loadOrchestratorSummary();
    window.addEventListener(ORCHESTRATOR_PLAN_UPDATED_EVENT, handlePlanUpdated as EventListener);
    return () => window.removeEventListener(ORCHESTRATOR_PLAN_UPDATED_EVENT, handlePlanUpdated as EventListener);
  }, [mounted, user]);

  // Load apps from Firestore
  useEffect(() => {
    const loadApps = async () => {
      try {
        setLoadingApps(true);
        const appsRef = collection(db, "apps");
        const snapshot = await getDocs(appsRef);
        const loadedApps: App[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          const appData = {
            id: data.id,
            name: data.name,
            description: data.description,
            icon: data.icon || "Squares2X2Icon",
            url: data.url,
            freeAllowed: data.freeAllowed,
            gradient: data.gradient,
            disabled: data.disabled,
            badge: data.badge,
            sortOrder: data.sortOrder || 0,
            category: data.category || determineCategory({ id: data.id, name: data.name }),
          };
          loadedApps.push(appData);
        });

        if (loadedApps.length > 0) {
          // Merge with defaults and assign categories
          const visible = loadedApps.filter(a => !a.disabled);
          visible.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          setApps(visible.length > 0 ? visible : DEFAULT_APPS);
        }
      } catch (error) {
        console.error("Error loading apps:", error);
      } finally {
        setLoadingApps(false);
      }
    };

    if (mounted) {
      loadApps();
    }
  }, [mounted]);

  const handleAppClick = (app: App) => {
    trackEvent({
      eventType: "app_launch",
      application: "portal",
      metadata: { appId: app.id },
    });
  };

  const handleLogout = async () => {
    await trackEvent({
      eventType: "logout",
      application: "portal",
    });
    await logout();
    router.push("/");
  };

  if (!mounted || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-v2-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-v2-gold mx-auto mb-4"></div>
          <p className="text-v2-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const logoSrc = theme === "light" ? logoSmBlack : logoSmWhite;
  const insightCount = crossToolInsights.filter(i => i.priority === 'critical' || i.priority === 'high').length;
  const previewInsights = crossToolInsights.length > 0 ? crossToolInsights : [];
  const previewInsight = previewInsights[previewInsightIndex] || null;

  // Group apps by category
  const appsByCategory = CATEGORIES.map(cat => ({
    ...cat,
    apps: apps.filter(app => (app.category || 'financial') === cat.id),
  }));

  // Compute stats for cards - use PocketBase cached data for tools count
  const toolsWithData = Object.keys(cachedToolData).filter(toolId => {
    // Only count actual tool data, not orchestrator plan
    if (toolId === TOOL_IDS.ORCHESTRATOR_PLAN) return false;
    const entry = cachedToolData[toolId];
    return entry && entry.data && Object.keys(entry.data).length > 0;
  });
  const toolsAnalyzedCount = toolsWithData.length;
  const toolsIncompleteCount = Math.max(0, apps.length - toolsAnalyzedCount);
  const firstName = parseFirstName(user as any);

  // Retirement age from user profile
  const retirementAge = (user as any)?.retirementAge ?? userData?.retirementAge ?? null;
  const currentAge = (() => {
    const dob = (user as any)?.dob;
    if (!dob) return userData?.age ?? null;
    const birthDate = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const m = now.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
    return age;
  })();
  const yearsToRetirement = (retirementAge && currentAge) ? Math.max(0, retirementAge - currentAge) : null;
  const monthsToRetirement = yearsToRetirement !== null ? yearsToRetirement * 12 : null;

  // Estimated annual income from profile
  const estimatedIncome = userData?.estimatedIncome ?? (user as any)?.currentAnnualIncome ?? null;

  // Portfolio success (Monte Carlo) from orchestrator data
  const portfolioSuccess = orchestratorPlan?.retirementReadinessScore ?? null;

  // Format date for topbar
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format impact number
  const formatImpact = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toLocaleString();
  };

  return (
    <div className="v2-layout" data-theme={theme}>
      {/* AI Coach Panel */}
      <AICoach
        isOpen={isAICoachOpen}
        onClose={() => setIsAICoachOpen(false)}
        initialInsights={crossToolInsights}
      />

      {/* Orchestrator Agent Panel */}
      <Orchestrator
        isOpen={isOrchestratorOpen}
        onClose={() => setIsOrchestratorOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`v2-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Logo + Collapse Toggle */}
        <div className="v2-sidebar-logo">
          <Link href="/dashboard" className="v2-sidebar-logo-link">
            <Image
              src={logoSrc}
              alt="RetireWise"
              width={160}
              height={44}
              style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
              className="v2-logo-full"
              priority
            />
            <span className="v2-logo-icon">RW</span>
          </Link>
          <button
            className="v2-sidebar-collapse-btn"
            onClick={toggleSidebarCollapsed}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d={sidebarCollapsed ? 'M6 3l5 5-5 5' : 'M10 3L5 8l5 5'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Overview Navigation */}
        <div className="v2-sidebar-section">
          <div className="v2-sidebar-label">Overview</div>
          {NAV_OVERVIEW.map(item => (
            item.action ? (
              <button
                key={item.id}
                onClick={(e) => {
                  e.preventDefault();
                  if (item.action === 'open-ai-coach') setIsAICoachOpen(true);
                  if (item.action === 'open-orchestrator') setIsOrchestratorOpen(true);
                }}
                className={`v2-sidebar-item`}
                data-tooltip={item.label}
              >
                <span className="v2-si-icon">{item.icon}</span>
                <span className="v2-sidebar-text">{item.label}</span>
              </button>
            ) : (
              <Link
                key={item.id}
                href={item.href}
                className={`v2-sidebar-item ${item.id === (activeNavId || 'dashboard') ? 'active' : ''}`}
                data-tooltip={item.label}
              >
                <span className="v2-si-icon">{item.icon}</span>
                <span className="v2-sidebar-text">{item.label}</span>
              </Link>
            )
          ))}
        </div>

        <div className="v2-sidebar-divider" />

        {/* App categories in sidebar */}
        {appsByCategory.map(category => (
          category.apps.length > 0 && (
            <div key={category.id}>
              <div className="v2-sidebar-section">
                <div className="v2-sidebar-label">{category.name.split(' ')[0] === 'Financial' ? 'Financial' : category.name.split(' ')[0] === 'Lifestyle' ? 'Lifestyle' : 'Legacy'}</div>
                {category.apps.map(app => (
                  <Link
                    key={app.id}
                    href={`/apps/${app.id}`}
                    onClick={() => handleAppClick(app)}
                    className={`v2-sidebar-item ${activeNavId === app.id ? 'active' : ''}`}
                    data-tooltip={SIDEBAR_APP_NAMES[app.id] || app.name}
                  >
                    <span className="v2-si-icon">{getSidebarIcon(app)}</span>
                    <span className="v2-sidebar-text">{SIDEBAR_APP_NAMES[app.id] || app.name}</span>
                  </Link>
                ))}
              </div>
              <div className="v2-sidebar-divider" />
            </div>
          )
        ))}

        {/* User Info at Bottom */}
        <div className="v2-sidebar-bottom">
          <Link href="/profile" className={`v2-sidebar-item ${activeNavId === 'profile' ? 'active' : ''}`} style={{ marginBottom: '4px' }} data-tooltip="Settings">
            <span className="v2-si-icon">⚙</span>
            <span className="v2-sidebar-text">Settings</span>
          </Link>
          {tier === 'admin' && (
            <div
              className="v2-admin-menu-wrap"
              style={{ marginBottom: '4px' }}
              onMouseEnter={(e) => {
                if (adminTimerRef.current) clearTimeout(adminTimerRef.current);
                const rect = e.currentTarget.getBoundingClientRect();
                setAdminPopout({ top: rect.top, left: rect.right + 6 });
              }}
              onMouseLeave={() => {
                adminTimerRef.current = setTimeout(() => setAdminPopout(null), 150);
              }}
            >
              <Link href="/admin/dashboard" className={`v2-sidebar-item ${activeNavId === 'admin' ? 'active' : ''}`} data-tooltip="Admin Dashboard">
                <span className="v2-si-icon">🛡️</span>
                <span className="v2-sidebar-text">Admin Dashboard</span>
                <span className="v2-admin-chevron">›</span>
              </Link>
            </div>
          )}
          <div
            className="v2-user-menu-wrap"
            onMouseEnter={(e) => {
              if (userTimerRef.current) clearTimeout(userTimerRef.current);
              const rect = e.currentTarget.getBoundingClientRect();
              setUserPopout({ top: rect.top, left: rect.right + 6 });
            }}
            onMouseLeave={() => {
              userTimerRef.current = setTimeout(() => setUserPopout(null), 150);
            }}
          >
            <div className="v2-user-info" role="button" tabIndex={0} data-tooltip={firstName}>
              <div className="v2-user-avatar">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="v2-user-info-text">
                <div className="v2-user-name">{firstName}</div>
                <div className="v2-user-role">{tierLoading ? "..." : tier === 'admin' ? 'Admin · Premium' : tier === 'paid' ? 'Premium' : 'Free'}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* User popout menu (fixed position to escape sidebar overflow) */}
      {userPopout && (
        <div
          className="v2-admin-popout visible"
          style={{ position: 'fixed', top: userPopout.top, left: userPopout.left }}
          onMouseEnter={() => { if (userTimerRef.current) clearTimeout(userTimerRef.current); }}
          onMouseLeave={() => { userTimerRef.current = setTimeout(() => setUserPopout(null), 150); }}
        >
          <button className="v2-popout-item v2-popout-btn" onClick={() => { setUserPopout(null); handleLogout(); }}>
            <span className="v2-si-icon">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Admin popout menu (fixed position to escape sidebar overflow) */}
      {adminPopout && (
        <div
          className="v2-admin-popout visible"
          style={{ position: 'fixed', top: adminPopout.top, left: adminPopout.left }}
          onMouseEnter={() => { if (adminTimerRef.current) clearTimeout(adminTimerRef.current); }}
          onMouseLeave={() => { adminTimerRef.current = setTimeout(() => setAdminPopout(null), 150); }}
        >
          <Link href="/admin/dashboard?tab=users" className="v2-popout-item" onClick={() => setAdminPopout(null)}>
            <span className="v2-si-icon">👥</span>
            <span>Manage Users</span>
          </Link>
          <Link href="/admin/dashboard?tab=apps" className="v2-popout-item" onClick={() => setAdminPopout(null)}>
            <span className="v2-si-icon">📱</span>
            <span>Manage Apps</span>
          </Link>
        </div>
      )}

      {/* Main Content Area */}
      <main className="v2-main">
        {/* Top Bar */}
        <header className="v2-topbar">
          <div className="v2-topbar-left">
            <h1>My Dashboard</h1>
            <p>{todayStr}</p>
          </div>

          <div className="v2-topbar-right">
            {/* Readiness Pill */}
            {orchestratorScore !== null && (
              <button
                onClick={() => setIsOrchestratorOpen(true)}
                className="v2-readiness-pill"
              >
                <div className="v2-readiness-ring">
                  <svg width="28" height="28" viewBox="0 0 28 28">
                    <circle
                      cx="14"
                      cy="14"
                      r="12"
                      fill="none"
                      stroke="var(--v2-readiness-track)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="14"
                      cy="14"
                      r="12"
                      fill="none"
                      stroke="var(--v2-gold)"
                      strokeWidth="3"
                      strokeDasharray={`${(orchestratorScore / 100) * 75.4} 75.4`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="v2-readiness-num">{Math.round(orchestratorScore)}</span>
                </div>
                <div>
                  <div className="v2-readiness-label">Readiness</div>
                  <div className="v2-readiness-sub">Click to view plan</div>
                </div>
              </button>
            )}

            {/* AI Coach Button with Insight Preview */}
            <div
              className="v2-ai-btn-wrapper"
              onMouseEnter={() => {
                if (insightHideTimeoutRef.current) clearTimeout(insightHideTimeoutRef.current);
                if (previewInsight) {
                  setPreviewInsightIndex(0);
                  setShowInsightPreview(true);
                }
              }}
              onMouseLeave={() => {
                insightHideTimeoutRef.current = setTimeout(() => setShowInsightPreview(false), 400);
              }}
            >
              {/* Insight Preview Card */}
              {showInsightPreview && previewInsight && (
                <div
                  onClick={() => setIsAICoachOpen(true)}
                  role="button"
                  tabIndex={0}
                  className="v2-insight-preview"
                >
                  <div className="v2-insight-arrow" />
                  <div className="v2-insight-header">
                    <span className={`v2-insight-priority v2-insight-priority-${previewInsight.priority}`}>
                      {previewInsight.priority.toUpperCase()}
                    </span>
                    <span className="v2-insight-impact">
                      ${formatImpact(previewInsight.potentialImpact)} impact
                    </span>
                  </div>
                  <h4 className="v2-insight-title">{previewInsight.title}</h4>
                  <p className="v2-insight-desc">{previewInsight.description}</p>
                  {previewInsights.length > 1 && (
                    <div className="v2-insight-nav">
                      <button
                        type="button"
                        className="v2-insight-nav-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewInsightIndex((i) => (i - 1 + previewInsights.length) % previewInsights.length);
                        }}
                      >
                        ← Prev
                      </button>
                      <span className="v2-insight-counter">
                        {previewInsightIndex + 1}/{previewInsights.length}
                      </span>
                      <button
                        type="button"
                        className="v2-insight-nav-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewInsightIndex((i) => (i + 1) % previewInsights.length);
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                  <span className="v2-insight-cta">Click to learn more →</span>
                </div>
              )}
              <button onClick={() => setIsAICoachOpen(true)} className="v2-ai-btn">
                <SparklesIcon className="w-4 h-4" />
                <span>AI Coach</span>
                {insightCount > 0 && (
                  <span className="v2-ai-badge">{insightCount > 9 ? '9+' : insightCount}</span>
                )}
              </button>
            </div>

            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="v2-icon-btn v2-theme-toggle">
              {theme === 'dark' ? (
                <SunIcon className="w-5 h-5" />
              ) : (
                <MoonIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </header>

        {/* Page Body */}
        <div className="v2-page-body">
          {children ? children : (
          <>
          {/* Welcome Banner */}
          <div className="v2-welcome-banner">
            <div className="v2-welcome-text">
              <h2>Welcome back, <em>{firstName}.</em></h2>
              <p>Your retirement plan is looking strong. Here&apos;s what to work on next.</p>
            </div>
            <div className="v2-welcome-actions">
              <button
                onClick={() => setIsOrchestratorOpen(true)}
                className="v2-btn-banner-primary"
              >
                View Action Plan →
              </button>
              <Link href="/profile" className="v2-btn-banner-ghost">
                Update Profile
              </Link>
            </div>
          </div>

          {/* AI Orchestrator Banner */}
          <div
            onClick={() => setIsOrchestratorOpen(true)}
            className="v2-orchestrator-banner"
            role="button"
            tabIndex={0}
          >
            <div className="v2-orch-left">
              <div className="v2-orch-icon">
                <span>✦</span>
              </div>
              <div className="v2-orch-text">
                <div className="v2-orch-title">Generate Unified Retirement Plan</div>
                <div className="v2-orch-desc">AI Orchestrator analyzes all your tools together for cross-tool insights and a personalized action plan</div>
              </div>
            </div>
            <div className="v2-orch-right">
              <div className="v2-orch-meta">
                <span className="v2-orch-meta-item">
                  <span className={`v2-orch-meta-dot ${toolsAnalyzedCount > 0 ? 'complete' : 'warn'}`} />
                  {toolsAnalyzedCount} tools analyzed
                </span>
                <span className="v2-orch-meta-item">
                  <span className={`v2-orch-meta-dot ${toolsIncompleteCount === 0 ? 'complete' : 'warn'}`} />
                  {toolsIncompleteCount} tools incomplete
                </span>
              </div>
              <span className="v2-orch-launch-btn">
                Launch →
              </span>
            </div>
          </div>

          {/* Stats Strip */}
          <div className="v2-stats-strip">
            <div className="v2-stat-card">
              <div className="v2-stat-label">Retirement Age</div>
              <div className="v2-stat-value">
                {retirementAge !== null ? (
                  <>{retirementAge} <span className="v2-stat-muted">yrs</span></>
                ) : '—'}
              </div>
              <div className="v2-stat-sub">
                {monthsToRetirement !== null && monthsToRetirement > 0
                  ? (yearsToRetirement! > 1 ? `${yearsToRetirement} years away` : `${monthsToRetirement} months away`)
                  : retirementAge ? 'Set in profile' : 'Set in profile'}
              </div>
              <div className="v2-stat-bar-track">
                <div className="v2-stat-bar-fill" style={{ width: retirementAge && currentAge ? `${Math.min(100, Math.round((currentAge / retirementAge) * 100))}%` : '0%' } as React.CSSProperties} />
              </div>
            </div>
            <div className="v2-stat-card">
              <div className="v2-stat-label">Est. Annual Income</div>
              <div className="v2-stat-value">
                {estimatedIncome ? (
                  <>$<span className="v2-stat-gold">{Math.round(estimatedIncome / 1000)}</span>K</>
                ) : '—'}
              </div>
              <div className="v2-stat-sub">From all sources</div>
              <div className="v2-stat-bar-track">
                <div className="v2-stat-bar-fill" style={{ width: estimatedIncome ? '72%' : '0%' } as React.CSSProperties} />
              </div>
            </div>
            <div className="v2-stat-card">
              <div className="v2-stat-label">Tools Completed</div>
              <div className="v2-stat-value">
                {toolsAnalyzedCount} <span className="v2-stat-muted">/ {apps.length}</span>
              </div>
              <div className="v2-stat-sub">{toolsIncompleteCount} tools remaining</div>
              <div className="v2-stat-bar-track">
                <div className="v2-stat-bar-fill" style={{ width: apps.length > 0 ? `${Math.round((toolsAnalyzedCount / apps.length) * 100)}%` : '0%' } as React.CSSProperties} />
              </div>
            </div>
            <div className="v2-stat-card">
              <div className="v2-stat-label">Readiness Score</div>
              <div className="v2-stat-value">
                {portfolioSuccess !== null ? (
                  <><span className="v2-stat-gold">{Math.round(portfolioSuccess)}</span><span className="v2-stat-muted">/100</span></>
                ) : '—'}
              </div>
              <div className="v2-stat-sub">{portfolioSuccess !== null ? 'AI Orchestrator score' : 'Generate plan'}</div>
              <div className="v2-stat-bar-track">
                <div className={`v2-stat-bar-fill ${portfolioSuccess !== null && portfolioSuccess >= 80 ? 'v2-stat-bar-green' : ''}`}
                  style={{ width: portfolioSuccess !== null ? `${Math.round(portfolioSuccess)}%` : '0%' } as React.CSSProperties} />
              </div>
            </div>
          </div>

          {/* App Categories */}
          {appsByCategory.map(category => (
            <div key={category.id} className={`v2-category-group v2-cat-${category.id}`} id={category.id}>
              <div className="v2-category-header">
                <div className={`v2-cat-icon-badge ${category.badgeClass}`}>
                  {category.icon}
                </div>
                <div className="v2-cat-header-text">
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                </div>
              </div>

              <div className="v2-apps-grid">
                {category.apps.map(app => {
                  const effectiveUrl = getEffectiveUrl(app, devSettings);
                  const isDevMode = devSettings[app.id]?.enabled;

                  return (
                    <Link
                      key={app.id}
                      href={`/apps/${app.id}`}
                      onClick={() => handleAppClick(app)}
                      className="v2-app-card"
                      style={{ '--card-accent': category.cardAccent } as React.CSSProperties}
                    >
                      {isDevMode && (
                        <span className="v2-dev-badge">DEV</span>
                      )}
                      <div className="v2-app-card-header">
                        <div className="v2-app-icon-wrap">
                          <AppIcon icon={app.icon} className="w-6 h-6" color="currentColor" />
                        </div>
                        <div className="v2-app-name">{app.name}</div>
                      </div>
                      <div className="v2-app-desc">{app.description}</div>
                      <div className="v2-app-card-footer">
                        <span className={`v2-app-tag ${category.tagClass}`}>
                          {category.name.split(' ')[0]}
                        </span>
                        <span className="v2-app-arrow">→</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          </>
          )}
        </div>
      </main>
    </div>
  );
}
