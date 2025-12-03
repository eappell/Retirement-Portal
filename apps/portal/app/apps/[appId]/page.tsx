"use client";

import {useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {useAuth} from "@/lib/auth";
import {useAnalytics} from "@/lib/useAnalytics";
import {auth} from "@/lib/firebase";

export default function AppLauncherPage({params}: {params: Promise<{appId: string}>}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {user} = useAuth();
  const {trackEvent} = useAnalytics();
  const [mounted, setMounted] = useState(false);
  const [appId, setAppId] = useState<string>("");
  const [appName, setAppName] = useState<string>("");
  const [appUrl, setAppUrl] = useState<string>("");
  const [authToken, setAuthToken] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      params.then((p) => setAppId(p.appId));
      setAppName(searchParams.get("name") || "");
      setAppUrl(searchParams.get("url") || "");
    }
  }, [mounted, params, searchParams]);

  useEffect(() => {
    if (mounted && !user) {
      router.push("/");
    }
  }, [user, mounted, router]);

  useEffect(() => {
    const getAuthToken = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const token = await currentUser.getIdToken();
          setAuthToken(token);
          trackEvent({
            eventType: "app_accessed",
            application: appId || "unknown",
            metadata: {appName},
          });
        }
      } catch (error) {
        console.error("Failed to get auth token:", error);
      }
    };

    if (mounted && user && appId && appUrl) {
      getAuthToken();
    }
  }, [mounted, user, appId, appUrl, appName, trackEvent]);

  if (!mounted || !user || !appId || !appUrl || !authToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading app...</p>
        </div>
      </div>
    );
  }

  // Build the app URL with auth token as query parameter
  const iframeUrl = `${appUrl}?token=${encodeURIComponent(authToken)}&userId=${encodeURIComponent(user.uid)}`;

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">{appName}</h1>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* iFrame Container */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={iframeUrl}
          title={appName}
          className="w-full h-full border-none"
          allow="microphone; camera; geolocation"
        />
      </div>
    </div>
  );
}
