"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/lib/auth";
import {useAnalytics} from "@/lib/useAnalytics";
import {db} from "@/lib/firebase";
import {collection, getDocs} from "firebase/firestore";
import Link from "next/link";
import {Header} from "@/components/Header";
// CubeIcon intentionally removed (unused)
import { getIconComponent, AppIcon, getIconColor } from "@/components/icon-map";
import { CARTOON_ICON_MAP } from '@/components/cartoon-icons';

// Use shared icon resolver so Firestore icon names (e.g. "Heart") resolve correctly

interface App {
  id: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  freeAllowed?: boolean;
  gradient?: string;
  disabled?: boolean;
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
  },
  {
    id: "tax-impact-analyzer",
    name: "Tax Impact Analyzer",
    description: "Analyze tax impacts in retirement with detailed projections",
    icon: "💰",
    url: "http://localhost:3001/",
    freeAllowed: true,
    disabled: false,
  },
  {
    id: "healthcare-cost",
    name: "Healthcare Cost Estimator",
    description: "Plan for your retirement healthcare expenses",
    icon: "❤️",
    url: "https://healthcare-cost.vercel.app/",
    freeAllowed: true,
    gradient: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)',
    disabled: false,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const {user} = useAuth();
  
  const {trackEvent} = useAnalytics();
  const [mounted, setMounted] = useState(false);
  const [apps, setApps] = useState<App[]>(DEFAULT_APPS);
  const [loadingApps, setLoadingApps] = useState(true);
 

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !user) {
      router.push("/");
    }
  }, [user, mounted, router]);

 

 

  

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
                }
              : d;
          }).concat(loadedApps.filter((a) => !DEFAULT_APPS.some((d) => matchesDefault(d, a))).map(a => ({ id: a.id, name: a.name, description: a.description, icon: a.icon || '📦', url: a.url || '', freeAllowed: a.freeAllowed, gradient: a.gradient || '', disabled: a.disabled })));
          // Hide disabled apps from the dashboard list
          const visible = merged.filter(a => !a.disabled);
          setApps(visible);
        } else {
          setApps(DEFAULT_APPS);
        }
      } catch (error) {
        console.error("Error loading apps:", error);
        // Fall back to default apps
        setApps(DEFAULT_APPS);
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E8E3DF] to-[#BFCDE0]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B5394] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  

  return (
    <div className="min-h-screen bg-background portal-dashboard dashboard-redesign">
      <Header />

      {/* Background particles (dark mode only) */}
      <div className="background-particles" aria-hidden="true">
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
      </div>

      <main className="max-w-[1400px] mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* User info card removed: information is available in the header */}

        {/* Apps Grid */}
        <div>
          <h2 
            className="mb-2 text-center dashboard-title"
            style={{ 
              fontFamily: "-apple-system, 'system-ui', 'Segoe UI', system-ui, sans-serif", 
              fontSize: '48px', 
              fontWeight: 800, 
              fontStyle: 'normal',
              letterSpacing: '-0.02em'
            }}
          >
            Available Tools
          </h2>
          <p className="text-center text-slate-400" style={{ fontSize: '20px', fontWeight: 500, marginBottom: '50px' }}>Plan with Clarity. Live with Confidence.</p>
          <div className="tools-grid-custom">
            {apps.map((app, index) => {
              // Determine app type from id/name
              const key = `${app.id || ''} ${app.name || ''}`.toLowerCase();
              
              // Define icon square gradients (light shades), tile backgrounds (very light/subtle), and badges
              type AppStyle = { iconGradient: string; tileBg: string; badge: string };
              const getAppStyle = (): AppStyle => {
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
              
              const appStyle = getAppStyle();
              
              return (
                <Link
                  key={app.id}
                  href={`/apps/${app.id}?name=${encodeURIComponent(app.name)}&url=${encodeURIComponent(app.url)}`}
                  onClick={() => handleAppClick(app)}
                  data-app-id={app.id}
                  className="app-tile app-tile-unified rounded-2xl shadow-lg hover:shadow-2xl transform transition-all duration-200 hover:scale-[1.035] block group"
                  style={{ padding: '30px', backgroundColor: appStyle.tileBg, maxWidth: '668px', height: '180px' }}
                >
                  <div className="flex items-start justify-between h-full">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {/* Icon square with gradient background */}
                        <div className="app-tile-icon-bg" style={{ background: appStyle.iconGradient }}>
                          {CARTOON_ICON_MAP[app.id] ? (
                            <AppIcon icon={app.icon} appId={app.id} className="cartoon-svg" bgColor="transparent" />
                          ) : (app.id || app.name || '').toLowerCase().includes('income') ? (
                            <img src="/images/money1_trans.png" alt={app.name} width={48} height={48} className="block" />
                          ) : (
                            <AppIcon icon={app.icon} appId={app.id} className="app-tile-hero-icon" color="#ffffff" />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <h3 className="text-2xl text-white" style={{ fontWeight: 800 }}>
                          {app.name}
                        </h3>
                        <p className="mt-2 app-description">{app.description}</p>
                        {appStyle.badge && (
                          <span className="app-tile-badge mt-3">{appStyle.badge}</span>
                        )}
                      </div>
                    </div>

                  </div>
                </Link>
              );
            })}
          </div>
          
        </div>

        {/* Coming Soon */}
        <div className="mt-12 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg shadow-lg p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">More Tools Coming Soon</h3>
          <p className="text-gray-600">
            We're constantly adding new retirement planning tools and features to help you plan better.
          </p>
        </div>

        {/* Sample Dashboard Link */}
        <div className="mt-8 text-center">
          <a
            href="/docs/sampledash.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            View Sample Dashboard Design
          </a>
        </div>
      </main>
    </div>
  );
}
