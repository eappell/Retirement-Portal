"use client";

import Link from "next/link";
import { useTheme } from "@/lib/theme";
import {useAuth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {useEffect, useState} from "react";

export default function Home() {
  const {user, loading} = useAuth();
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-pulse">
          <div className="h-12 w-12 rounded-full bg-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{background: 'linear-gradient(to bottom right, #E8E3DF, #BFCDE0)'}}>
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">RetireWise</h1>
            <p className="text-gray-600">Plan your retirement with confidence</p>
          </div>

          <div className="space-y-4">
            <Link
              href="/auth/signup"
              className="block w-full text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
              style={{backgroundColor: '#0B5394'}}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#094170'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0B5394'}
            >
              Create Account
            </Link>

            <Link
              href="/auth/login"
              className="block w-full text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
              style={{backgroundColor: '#22c55e'}}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
            >
              Sign In
            </Link>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <Link
              href="/auth/guest"
              className="block w-full font-semibold py-3 px-4 rounded-lg text-center transition-colors"
              style={{backgroundColor: '#BFCDE0', color: '#6b5e62'}}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a8bdd4'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#BFCDE0'}
            >
              Continue as Guest
            </Link>
          </div>

          <p className="text-xs text-gray-600 text-center">
            Guest users have limited access. Features are restricted to free tier.
          </p>
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p className="mb-4 font-semibold">Available Tools:</p>
          <div className="space-y-2">
            <p className="portal-app-name">Monthly Retirement Income Estimator</p>
            <p className="portal-app-name">Retire Abroad AI Recommendations</p>
            <p className="portal-app-name">Social Security Optimization</p>
            <p className="portal-app-name">Healthcare Cost Calculator</p>
          </div>
        </div>
      </div>
    </div>
  );
}
