"use client";

import {useState} from "react";
import { useTheme } from "@/lib/theme";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useAuth} from "@/lib/auth";
import {useAnalytics} from "@/lib/useAnalytics";

export default function LoginPage() {
  const router = useRouter();
  const {login} = useAuth();
  const {trackEvent} = useAnalytics();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error("Please fill in all fields");
      }

      await login(email, password);

      // Track login
      await trackEvent({
        eventType: "login",
        application: "portal",
        metadata: {method: "email"},
      });

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-0 px-4" style={{background: 'linear-gradient(to bottom right, #E8E3DF, #BFCDE0)'}}>
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
            <p className="text-gray-600 mt-2">Welcome back to RetireWise</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              style={{backgroundColor: loading ? undefined : '#0B5394'}}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#094170')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0B5394')}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="font-medium" style={{color: '#0B5394'}}>
              Create one
            </Link>
          </div>

          <div className="text-center text-sm text-gray-600">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              Back to home
            </Link>
          </div>
        </div>
        {/* Apps list under the login card (non-clickable for unauthenticated users) */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Available Tools</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl">📊</div>
              <div>
                <div className="font-medium portal-app-name">Income Estimator</div>
                <div className="text-xs portal-app-desc">Estimate retirement income</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl">🌍</div>
              <div>
                <div className="font-medium portal-app-name">Retire Abroad</div>
                <div className="text-xs portal-app-desc">Plan retirement in another country</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl">🧾</div>
              <div>
                <div className="font-medium portal-app-name">Social Security Optimization</div>
                <div className="text-xs portal-app-desc">Find an optimal claiming strategy</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl">🏥</div>
              <div>
                <div className="font-medium portal-app-name">Healthcare Cost Calculator</div>
                <div className="text-xs portal-app-desc">Estimate healthcare expenses</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
