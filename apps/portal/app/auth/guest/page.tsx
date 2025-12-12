"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/lib/auth";
import {useAnalytics} from "@/lib/useAnalytics";
import Link from "next/link";

export default function GuestPage() {
  const router = useRouter();
  const {loginAnonymously} = useAuth();
  const {trackEvent} = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGuestLogin = async () => {
    setError("");
    setLoading(true);

    try {
      await loginAnonymously();

      // Track guest login
      await trackEvent({
        eventType: "login",
        application: "portal",
        metadata: {method: "anonymous"},
      });

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guest login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-0 bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Continue as Guest</h1>
            <p className="text-gray-600 mt-2">Try our tools without signing up</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Free Tier Benefits:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 5 AI queries per day</li>
              <li>• Access all retirement tools</li>
              <li>• Session-based calculations</li>
              <li>• Try before signing up</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? "Starting..." : "Continue as Guest"}
          </button>

          <div className="text-center text-sm text-gray-600">
            Want to unlock more features?{" "}
            <Link href="/auth/signup" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Create an account
            </Link>
          </div>

          <div className="text-center text-sm text-gray-600">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
