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

      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* User info card removed: information is available in the header */}

        {/* Apps Grid */}
        <div>
          <h2 className="text-3xl font-extrabold text-blue-900 mb-2 text-center">Available Tools</h2>
          <p className="text-center text-blue-800 mb-6 text-lg font-medium">Plan with Clarity. Live with Confidence.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {apps.map((app, index) => {
              // Create different gradients using vibrant standard colors
              const gradients = [
                'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', // Blue
                'linear-gradient(135deg, #34d399 0%, #10b981 100%)', // Green
                'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', // Yellow/Amber
                'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', // Purple
              ];
              // For the healthcare app, use a distinct red gradient
              const redGradient = 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)';
              const blueGradient = 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)';
              const greenGradient = 'linear-gradient(135deg, #34d399 0%, #10b981 100%)';

              // Determine gradient robustly using id or name keywords (handles Firestore variations)
              const key = `${app.id || ''} ${app.name || ''}`.toLowerCase();
              // Prefer app-provided gradient if present
              const computedGradient = key.includes('health') || key.includes('healthcare')
                ? redGradient
                : key.includes('income') || key.includes('estimator')
                ? greenGradient
                : key.includes('retire') || key.includes('abroad')
                ? blueGradient
                : gradients[index % gradients.length];
              const gradient = app.gradient || computedGradient;

              // Choose a robust classname to apply the gradient via CSS so it persists
              // Only apply the static per-app class when an explicit gradient is not set in Firestore
              const appGradientClass = app.gradient
                ? ''
                : key.includes('health') || key.includes('healthcare')
                ? 'app-gradient-healthcare'
                : key.includes('income') || key.includes('estimator')
                ? 'app-gradient-income-estimator'
                : key.includes('retire') || key.includes('abroad')
                ? 'app-gradient-retire-abroad'
                : '';
              
              
              
              return (
                <Link
                  key={app.id}
                  href={`/apps/${app.id}?name=${encodeURIComponent(app.name)}&url=${encodeURIComponent(app.url)}`}
                  onClick={() => handleAppClick(app)}
                  data-app-id={app.id}
                  className={`app-tile app-tile-unified rounded-2xl shadow-lg hover:shadow-2xl transform transition-all duration-200 hover:scale-105 p-8 md:p-10 block group ${appGradientClass}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {/* Use filled cartoon icon when available, otherwise fall back to the heroicon-in-circle */}
                        {CARTOON_ICON_MAP[app.id] ? (
                          <div className="cartoon-icon">
                            <AppIcon icon={app.icon} appId={app.id} className="cartoon-svg" />
                          </div>
                        ) : ( (app.id || app.name || '').toLowerCase().includes('income') ? (
                          // Explicit fallback: if app id or name looks like the income estimator, render the processed image asset inside rounded square
                          <div className="app-tile-icon app-tile-icon--light">
                            <img src="/images/money1_trans.png" alt={app.name} width={34} height={34} className="block" />
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-full flex items-center justify-center bg-white shadow-sm transition-transform transform group-hover:rotate-6">
                            <AppIcon icon={app.icon} appId={app.id} className="h-8 w-8" color={getIconColor(app.id || app.name)} />
                          </div>
                        ))}
                      </div>

                      <div>
                        <h3 className="text-2xl font-bold text-white">
                          {app.name}
                        </h3>
                        <p className="mt-2 text-white/90">{app.description}</p>
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
      </main>
    </div>
  );
}
