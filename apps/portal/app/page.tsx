"use client";

import Link from "next/link";
import {useAuth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {useEffect, useState} from "react";

export default function Home() {
  const {user, loading} = useAuth();
  const [mounted, setMounted] = useState(false);

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Retirement Portal</h1>
            <p className="text-gray-600">Plan your retirement with confidence</p>
          </div>

          <div className="space-y-4">
            <Link
              href="/auth/signup"
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
            >
              Create Account
            </Link>

            <Link
              href="/auth/login"
              className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-4 rounded-lg text-center transition-colors"
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
              className="block w-full bg-blue-100 hover:bg-blue-200 text-blue-900 font-semibold py-3 px-4 rounded-lg text-center transition-colors"
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
            <p>• Monthly Retirement Income Estimator</p>
            <p>• Retire Abroad AI Recommendations</p>
            <p>• Plus more coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
