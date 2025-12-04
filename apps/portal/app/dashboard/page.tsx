"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/lib/auth";
import {useUserTier} from "@/lib/useUserTier";
import {useAnalytics} from "@/lib/useAnalytics";
import Link from "next/link";
import {Header} from "@/components/Header";

interface App {
  id: string;
  name: string;
  description: string;
  icon: string;
  url: string;
}

const APPS: App[] = [
  {
    id: "income-estimator",
    name: "Income Estimator",
    description: "Estimate your retirement income from various sources",
    icon: "📊",
    url: "https://retire.appell.me",
  },
  {
    id: "retire-abroad",
    name: "Retire Abroad",
    description: "Plan your retirement in another country",
    icon: "🌍",
    url: "https://retire-abroad-ai.vercel.app/",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const {user} = useAuth();
  const {tier, subscriptionExpiry, loading: tierLoading} = useUserTier();
  const {trackEvent} = useAnalytics();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !user) {
      router.push("/");
    }
  }, [user, mounted, router]);

  const handleAppClick = (app: App) => {
    trackEvent({
      eventType: "app_launch",
      application: "portal",
      metadata: {appId: app.id},
    });
  };

  if (!mounted || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
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
    <div className="min-h-screen bg-gray-50">
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
            <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">Upgrade to Premium</h4>
              <p className="text-purple-700 text-sm mb-4">
                Get unlimited access to all tools and remove daily query limits.
              </p>
              <Link
                href="/upgrade"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                View Plans
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
            {APPS.map((app) => (
              <Link
                key={app.id}
                href={`/apps?appId=${app.id}&name=${encodeURIComponent(app.name)}&url=${encodeURIComponent(app.url)}`}
                onClick={() => handleAppClick(app)}
                className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6 block group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-4xl mb-4">{app.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {app.name}
                    </h3>
                    <p className="text-gray-600 mt-2">{app.description}</p>
                  </div>
                  <div className="text-2xl">→</div>
                </div>
              </Link>
            ))}
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
