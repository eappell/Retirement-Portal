"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/lib/auth";
import {useUserTier} from "@/lib/useUserTier";
import {useAnalytics} from "@/lib/useAnalytics";
import {db} from "@/lib/firebase";
import {collection, getDocs} from "firebase/firestore";
import Link from "next/link";
import {Header} from "@/components/Header";
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
];

export default function DashboardPage() {
  const router = useRouter();
  const {user} = useAuth();
  const {tier, subscriptionExpiry, loading: tierLoading} = useUserTier();
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

  const isGuest = user.isAnonymous;
  const isAdmin = tier === "admin";
  const isPaid = tier === "paid";
  const daysUntilExpiry = subscriptionExpiry
    ? Math.ceil((new Date(subscriptionExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* User Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase">Email</h3>
              <p className="text-lg text-gray-900 mt-2">{user.email || "Guest User"}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase">Tier</h3>
              <div className="flex items-center mt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    isAdmin
                      ? "bg-red-100 text-red-800"
                      : isPaid
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {isGuest ? "Guest" : isAdmin ? "Admin" : isPaid ? "Premium" : "Free"}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase">Status</h3>
              <p className="text-lg text-gray-900 mt-2">
                {tierLoading ? (
                  "Loading..."
                ) : isGuest ? (
                  <span className="text-orange-600">Session-based</span>
                ) : isAdmin ? (
                  <span className="text-red-600">Full Access</span>
                ) : isPaid ? (
                  daysUntilExpiry ? (
                    <span className="text-green-600">{daysUntilExpiry} days remaining</span>
                  ) : (
                    <span className="text-green-600">Active</span>
                  )
                ) : (
                  <span className="text-blue-600">5 queries/day</span>
                )}
              </p>
            </div>
          </div>

          {!isPaid && !isAdmin && !isGuest && (
            <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
              <h4 className="font-semibold mb-2 dark:!text-purple-100" style={{color: '#1f2937'}}>Upgrade to Premium</h4>
              <p className="text-sm mb-4 dark:!text-purple-200" style={{color: '#374151'}}>
                Get unlimited access to all tools and remove daily query limits.
              </p>
                            <Link
                href="/upgrade"
                className="inline-block text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                style={{backgroundColor: '#0B5394'}}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#094170'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0B5394'}
              >
                Upgrade to Premium
              </Link>
            </div>
          )}

          {isGuest && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Guest Mode</h4>
              <p className="text-blue-700 text-sm mb-4">
                You're using the portal as a guest. Create an account to save your calculations and unlock more features.
              </p>
              <Link
                href="/auth/signup"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>

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
              const gradient = gradients[index % gradients.length];
              
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
                          const iconData = AVAILABLE_ICONS.find(i => i.name === app.icon);
                          if (iconData) {
                            const IconComponent = iconData.component;
                            return <IconComponent className="h-10 w-10" style={{color: '#f3f4f6'}} />;
                          }
                          return <CubeIcon className="h-10 w-10" style={{color: '#f3f4f6'}} />;
                        })()}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold group-hover:transition-colors" style={{color: '#f3f4f6'}} onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.color = '#f3f4f6'}>
                          {app.name}
                        </h3>
                        <p className="mt-2" style={{color: '#e5e7eb'}}>{app.description}</p>
                      </div>
                    </div>
                    <div className="text-2xl" style={{color: '#f3f4f6'}}>→</div>
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
