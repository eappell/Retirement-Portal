"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/lib/auth";
import {useAnalytics} from "@/lib/useAnalytics";
import {db} from "@/lib/firebase";
import {collection, getDocs} from "firebase/firestore";
import Link from "next/link";
import {Header} from "@/components/Header";
import { AppIcon } from "@/components/icon-map";
import { useTheme } from '@/lib/theme';
import { AICoach } from "@/components/AICoach";
import { FloatingInsight } from "@/components/FloatingInsight";
import { useRetirementData } from "@/lib/retirementContext";
import { analyzeUserData, hasNewInsights } from "@/lib/proactiveInsights";

// Use shared icon resolver so Firestore icon names (e.g. "Heart") resolve correctly

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

function getEffectiveUrl(app: { id: string; url: string }, devSettings: DevSettings): string {
  const setting = devSettings[app.id];
  if (setting?.enabled && setting.port) {
    return `http://localhost:${setting.port}`;
  }
  return app.url;
}

// Convert hex color to rgba string with given alpha
function hexToRgba(hex: string, alpha = 0.06) {
  try {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (e) {
    return hex; // fallback to original value
  }
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
}

const DEFAULT_APPS: App[] = [
  {
    id: "income-estimator",
    name: "Income Estimator",
    description: "Estimate your retirement income from various sources",
    icon: "📊",
    url: "http://localhost:5173/",
    freeAllowed: true,
    gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
    disabled: false,
    badge: "AI-Powered",
  },
  {
    id: "retire-abroad",
    name: "Retire Abroad",
    description: "Plan your retirement in another country",
    icon: "🌍",
    url: "https://retire-abroad-ai.vercel.app/",
    freeAllowed: true,
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
    disabled: false,
    badge: "100+ Destinations",
  },
  {
    id: "tax-impact-analyzer",
    name: "Tax Impact Analyzer",
    description: "Analyze tax impacts in retirement with detailed projections",
    icon: "💰",
    url: "http://localhost:3001/",
    freeAllowed: true,
    disabled: false,
    badge: "Tax Optimization",
  },
  {
    id: "pension-vs-lumpsum-analyzer",
    name: "Pension vs. Lump Sum Analyzer",
    description: "Compare pension vs lump sum options with detailed analysis",
    icon: "💰",
    url: "http://localhost:3002/",
    freeAllowed: true,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    disabled: false,
    badge: "Data-Driven",
  },
];


export default function DashboardPage() {
  const router = useRouter();
  const {user, loading: authLoading} = useAuth();
  const { theme } = useTheme();
  const { userData, loading: dataLoading } = useRetirementData();
  
  const {trackEvent} = useAnalytics();
  const [mounted, setMounted] = useState(false);
  const [apps, setApps] = useState<App[]>(DEFAULT_APPS);
  const [loadingApps, setLoadingApps] = useState(true);
  const [devSettings, setDevSettings] = useState<DevSettings>({});
  const [isAICoachOpen, setIsAICoachOpen] = useState(false);
  const [hasAIInsight, setHasAIInsight] = useState(false);
  const [previousInsights, setPreviousInsights] = useState<any[]>([]);


 

  useEffect(() => {
    setMounted(true);
    // Load dev settings from localStorage
    setDevSettings(getDevSettings());
    
    // Listen for dev settings changes from admin page
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
    };
  }, []);

  // Allow bypassing auth redirect in tests by appending ?testMode=1 to the URL
  // Proactive insights analysis
  useEffect(() => {
    if (userData && !dataLoading) {
      const insights = analyzeUserData(userData);
      
      // Check if there are new insights
      if (hasNewInsights(previousInsights, insights)) {
        setHasAIInsight(true);
      }
      
      setPreviousInsights(insights);
    }
  }, [userData, dataLoading]);

  const testMode = (typeof window !== 'undefined') && new URLSearchParams(window.location.search).get('testMode') === '1';

  useEffect(() => {
    // Only redirect to login if auth has finished loading and there's no user
    // but allow `testMode` to force-render the dashboard for visual tests.
    if (mounted && !authLoading && !user && !testMode) {
      router.push("/");
    }
  }, [user, mounted, authLoading, router, testMode]);

 

 

  

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
          loadedApps.push({
            id: data.id,
            name: data.name,
            description: data.description,
            icon: data.icon || "📦",
            url: data.url,
            freeAllowed: data.freeAllowed,
            gradient: data.gradient,
            disabled: data.disabled,
            badge: data.badge,
            sortOrder: data.sortOrder || 0,
          });
        });

          if (loadedApps.length > 0) {
            // Loaded apps
          // Merge firestore apps into defaults: favor firestore values (including gradient)
          const normalizeText = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
          const matchesDefault = (d: App, a: App) => {
            if (!a) return false;
            if (a.id === d.id) return true;
            const an = normalizeText(a.name);
            const dn = normalizeText(d.name);
            if (an.includes(dn) || dn.includes(an)) return true;
            if (an.includes(d.id.replace(/-/g, ' '))) return true;
            const aTokens = new Set(an.split(/\s+/).filter(Boolean));
            const dTokens = new Set(dn.split(/\s+/).filter(Boolean));
            let common = 0;
            aTokens.forEach((t) => { if (dTokens.has(t)) common++; });
            if (common >= 2) return true;
            const minLen = Math.min(aTokens.size || 1, dTokens.size || 1);
            if (common / minLen >= 0.5) return true;
            return false;
          };
          const merged = DEFAULT_APPS.map((d) => {
            const override = loadedApps.find((a) => matchesDefault(d, a));
            return override
              ? {
                  id: override.id || d.id,
                  name: override.name || d.name,
                  description: override.description || d.description,
                  icon: override.icon || d.icon,
                  url: override.url || d.url || '',
                  freeAllowed: typeof override.freeAllowed === 'boolean' ? override.freeAllowed : d.freeAllowed,
                  gradient: override.gradient || d.gradient,
                  disabled: typeof override.disabled === 'boolean' ? override.disabled : d.disabled,
                  badge: override.badge || d.badge,
                  sortOrder: override.sortOrder || d.sortOrder || 0,
                }
              : d;
          }).concat(loadedApps.filter((a) => !DEFAULT_APPS.some((d) => matchesDefault(d, a))).map(a => ({ id: a.id, name: a.name, description: a.description, icon: a.icon || '📦', url: a.url || '', freeAllowed: a.freeAllowed, gradient: a.gradient || '', disabled: a.disabled, badge: a.badge || '', sortOrder: a.sortOrder || 0 })));
          // Hide disabled apps from the dashboard list
          const visible = merged.filter(a => !a.disabled);
          // Sort apps by sortOrder, then alphabetically by name
          visible.sort((a, b) => {
            const orderA = a.sortOrder || 0;
            const orderB = b.sortOrder || 0;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
          });
          setApps(visible);
        } else {
          setApps([...DEFAULT_APPS].sort((a, b) => {
            const orderA = a.sortOrder || 0;
            const orderB = b.sortOrder || 0;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
          }));
        }
      } catch (error) {
        console.error("Error loading apps:", error);
        // Fall back to default apps
        setApps([...DEFAULT_APPS].sort((a, b) => {
          const orderA = a.sortOrder || 0;
          const orderB = b.sortOrder || 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        }));
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
      metadata: {appId: app.id},
    });
  };

  if (!mounted || !user) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#E8E3DF] to-[#BFCDE0] py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B5394] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  

  return (
    <div className="flex-1 bg-background portal-dashboard dashboard-redesign pb-0">
      <Header onAICoachOpen={() => setIsAICoachOpen(true)} />

      {/* AI Coach Panel */}
      <AICoach isOpen={isAICoachOpen} onClose={() => setIsAICoachOpen(false)} />

      {/* Floating Insight Button */}
      <FloatingInsight 
        onClick={() => setIsAICoachOpen(true)} 
        hasInsight={hasAIInsight}
      />

      {/* Background particles (static, no animation) */}
      <div className="background-particles" aria-hidden="true">
        <div className={"particle" + (theme === 'light' ? ' particle-light' : '')} />
        <div className={"particle" + (theme === 'light' ? ' particle-light' : '')} />
        <div className={"particle" + (theme === 'light' ? ' particle-light' : '')} />
        <div className={"particle" + (theme === 'light' ? ' particle-light' : '')} />
        <div className={"particle" + (theme === 'light' ? ' particle-light' : '')} />
      </div>





      <main className="max-w-[1400px] mx-auto px-4 pt-10 pb-4 sm:px-6 lg:px-8">
        {/* User info card removed: information is available in the header */}

        {/* Apps Grid */}
        <div>
          <div className="tools-grid-custom">
            {apps.map((app, index) => {
              // Determine app type from id/name
              const key = `${app.id || ''} ${app.name || ''}`.toLowerCase();
              
              // Define icon square gradients (light shades), tile backgrounds (very light/subtle), and badges
              type AppStyle = { iconGradient: string; tileBg: string; badge: string };
              const getAppStyle = (app: App, key: string): AppStyle => {
                // Use badge from database if available, otherwise fallback to defaults based on app type
                if (app.badge) {
                  // Determine colors based on existing logic for consistency
                  
                  if (key.includes('income') || key.includes('estimator')) {
                    return {
                      iconGradient: 'linear-gradient(135deg, #86efac 0%, #4ade80 100%)',
                      tileBg: 'rgba(134, 239, 172, 0.08)',
                      badge: app.badge
                    };
                  }
                  if (key.includes('retire') || key.includes('abroad')) {
                    return {
                      iconGradient: 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)',
                      tileBg: 'rgba(147, 197, 253, 0.08)',
                      badge: app.badge
                    };
                  }
                  if (key.includes('tax')) {
                    return {
                      iconGradient: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)',
                      tileBg: 'rgba(196, 181, 253, 0.08)',
                      badge: app.badge
                    };
                  }
                  if (key.includes('health') || key.includes('healthcare')) {
                    return {
                      iconGradient: 'linear-gradient(135deg, #fca5a5 0%, #f87171 100%)',
                      tileBg: 'rgba(252, 165, 165, 0.08)',
                      badge: app.badge
                    };
                  }
                  // Default fallback
                  return {
                    iconGradient: 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)',
                    tileBg: 'rgba(147, 197, 253, 0.08)',
                    badge: app.badge
                  };
                }
                
                // Fallback to hardcoded badges for backward compatibility
                
                if (key.includes('income') || key.includes('estimator')) {
                  return {
                    iconGradient: 'linear-gradient(135deg, #86efac 0%, #4ade80 100%)', // light green
                    tileBg: 'rgba(134, 239, 172, 0.08)', // very subtle green
                    badge: 'AI-Powered'
                  };
                }
                if (key.includes('retire') || key.includes('abroad')) {
                  return {
                    iconGradient: 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)', // light blue
                    tileBg: 'rgba(147, 197, 253, 0.08)', // very subtle blue
                    badge: '100+ Destinations'
                  };
                }
                if (key.includes('tax')) {
                  return {
                    iconGradient: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)', // light purple
                    tileBg: 'rgba(196, 181, 253, 0.08)', // very subtle purple
                    badge: 'Tax Optimization'
                  };
                }
                if (key.includes('health') || key.includes('healthcare')) {
                  return {
                    iconGradient: 'linear-gradient(135deg, #fca5a5 0%, #f87171 100%)', // light red
                    tileBg: 'rgba(252, 165, 165, 0.08)', // very subtle red
                    badge: 'Personalized'
                  };
                }
                if (key.includes('activity')) {
                  return {
                    iconGradient: 'linear-gradient(135deg, #fdba74 0%, #fb923c 100%)', // light orange
                    tileBg: 'rgba(253, 186, 116, 0.08)', // very subtle orange
                    badge: '3-Phase Planning'
                  };
                }
                if (key.includes('social') || key.includes('security')) {
                  return {
                    iconGradient: 'linear-gradient(135deg, #166534 0%, #15803d 100%)', // dark green
                    tileBg: 'rgba(22, 101, 52, 0.08)', // very subtle dark green
                    badge: 'Data-Driven'
                  };
                }
                // Default fallback
                return {
                  iconGradient: 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)',
                  tileBg: 'rgba(147, 197, 253, 0.08)',
                  badge: ''
                };
              };
              
              const appStyle = getAppStyle(app, key);
              // Keep tile background subtle (use tileBg). If app.gradient exists, extract its first hex
              // and apply a VERY light, transparent shade for the tile background so the tint is barely noticeable.
              let tileBackgroundStyle: any = { backgroundColor: appStyle.tileBg };
              if (app.gradient) {
                const match = String(app.gradient).match(/#(?:[0-9a-fA-F]{3}){1,2}/g);
                if (match && match.length > 0) {
                  // Use the first color in the gradient for the subtle tint
                  tileBackgroundStyle = { backgroundColor: hexToRgba(match[0], 0.04) };
                } else {
                  // Fallback: very low-opacity overlay of the full gradient (rare)
                  tileBackgroundStyle = { backgroundImage: app.gradient, opacity: 0.98 };
                }
              }
              const effectiveUrl = getEffectiveUrl(app, devSettings);
              const isDevMode = devSettings[app.id]?.enabled;
              
              return (
                <Link
                  key={app.id}
                  href={`/apps/${app.id}`}
                  onClick={() => handleAppClick(app)}
                  data-app-id={app.id}
                  className="app-tile app-tile-unified rounded-2xl shadow-lg hover:shadow-2xl transform transition-all duration-200 hover:scale-[1.035] block group"
                  style={{ padding: '30px', ...tileBackgroundStyle, maxWidth: '668px', height: '180px', position: 'relative' }}
                >
                  {isDevMode && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                      🔧 DEV
                    </div>
                  )}
                  <div className="flex items-start justify-between h-full">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {/* Icon square with gradient background - always use Heroicons from Firestore */}
                        <div className="app-tile-icon-bg" style={{ background: app.gradient ? app.gradient : appStyle.iconGradient }}>
                          <AppIcon icon={app.icon} className="app-tile-hero-icon" color="#ffffff" />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <h3 className="text-xl text-white" style={{ fontWeight: 700 }}>
                          {app.name}
                        </h3>
                        <p className="mt-2 app-description">{app.description}</p>
                      </div>
                    </div>

                  </div>
                </Link>
              );
            })}
          </div>
          
        </div>

        {/* Stats Section */}
        <div className="stats-section mt-6">
          <div className="stat-card">
            <div className="stat-value">{apps.length}</div>
            <div className="stat-label">Planning Tools</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">AI</div>
            <div className="stat-label">Powered Insights</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">No Sales</div>
            <div className="stat-label">No Financial Product Sales</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">∞</div>
            <div className="stat-label">Possibilities</div>
          </div>
        </div>
      </main>
    </div>
  );
}
