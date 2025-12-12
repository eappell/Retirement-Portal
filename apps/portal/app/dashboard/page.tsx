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
import { getIconComponent } from "@/components/icon-map";

// Use shared icon resolver so Firestore icon names (e.g. "Heart") resolve correctly

interface App {
  id: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  freeAllowed?: boolean;
}

const DEFAULT_APPS: App[] = [
  {
    id: "income-estimator",
    name: "Income Estimator",
    description: "Estimate your retirement income from various sources",
    icon: "📊",
    url: "http://localhost:5173/",
    freeAllowed: true,
  },
  {
    id: "retire-abroad",
    name: "Retire Abroad",
    description: "Plan your retirement in another country",
    icon: "🌍",
    url: "https://retire-abroad-ai.vercel.app/",
    freeAllowed: true,
  },
  {
    id: "tax-impact-analyzer",
    name: "Tax Impact Analyzer",
    description: "Analyze tax impacts in retirement with detailed projections",
    icon: "💰",
    url: "http://localhost:3001/",
    freeAllowed: true,
  },
  {
    id: "healthcare-cost",
    name: "Healthcare Cost Estimator",
    description: "Plan for your retirement healthcare expenses",
    icon: "❤️",
    url: "https://healthcare-cost.vercel.app/",
    freeAllowed: true,
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
          });
        });

        if (loadedApps.length > 0) {
          setApps(loadedApps);
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
      <div className="flex min-h-screen items-center justify-center" style={{background: 'linear-gradient(to bottom right, #E8E3DF, #BFCDE0)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: '#0B5394'}}></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  

  return (
    <div className="min-h-screen bg-background portal-dashboard">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* User info card removed: information is available in the header */}

        {/* Apps Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Tools</h2>
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

              // Specific overrides: healthcare gets red, income-estimator should be green, retire-abroad should be blue
              const gradient = app.id === 'healthcare-cost'
                ? redGradient
                : app.id === 'income-estimator'
                ? greenGradient
                : app.id === 'retire-abroad'
                ? blueGradient
                : gradients[index % gradients.length];
              
              return (
                <Link
                  key={app.id}
                  href={`/apps/${app.id}?name=${encodeURIComponent(app.name)}&url=${encodeURIComponent(app.url)}`}
                  onClick={() => handleAppClick(app)}
                  className="rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6 block group"
                  style={{background: gradient}}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {(() => {
                          const IconComponent = getIconComponent(app.icon);
                          return <IconComponent className="h-10 w-10" style={{color: '#111827'}} />;
                        })()}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold group-hover:transition-colors" style={{color: '#111827'}} onMouseEnter={(e) => e.currentTarget.style.color = '#000000'} onMouseLeave={(e) => e.currentTarget.style.color = '#111827'}>
                          {app.name}
                        </h3>
                        <p className="mt-2" style={{color: '#111827'}}>{app.description}</p>
                      </div>
                    </div>
                    <div className="text-2xl" style={{color: '#111827'}}>→</div>
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
