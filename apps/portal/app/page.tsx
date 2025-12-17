"use client";

import Link from "next/link";
import { AppIcon } from "@/components/icon-map";
import { useTheme } from "@/lib/theme";
import {useAuth} from "@/lib/auth";
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import {redirect} from "next/navigation";
import {useEffect, useState} from "react";

export default function Home() {
  const {user, loading} = useAuth();
  const [mounted, setMounted] = useState(false);
  const [apps, setApps] = useState<{id: string, name: string, gradient?: string, url?: string, icon?: string, description?: string, disabled?: boolean}[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadApps = async () => {
      try {
        setLoadingApps(true);
        const appsRef = collection(db, 'apps');
        const snapshot = await getDocs(appsRef);
        const loaded: {id: string, name: string, gradient?: string, url?: string, icon?: string, description?: string, disabled?: boolean}[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          loaded.push({ id: data.id, name: data.name, gradient: data.gradient, url: data.url, icon: data.icon, description: data.description, disabled: data.disabled });
        });
        if (loaded.length > 0) {
          setApps(loaded);
        }
      } catch (e) {
        // ignore - use static list if Firestore isn't accessible
      } finally {
        setLoadingApps(false);
      }
    };
    loadApps();
  }, []);

  // Default list of visible apps and their computed default gradients
  const DEFAULT_APPS: {id: string, name: string, gradient?: string, url?: string, icon?: string, disabled?: boolean}[] = [
    { id: 'income-estimator', name: 'Monthly Retirement Income Estimator', gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', url: 'http://localhost:5173/', icon: 'CurrencyDollarIcon', disabled: false },
    { id: 'retire-abroad', name: 'Retire Abroad AI Recommendations', gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', url: 'https://retire-abroad-ai.vercel.app/', icon: 'GlobeAltIcon', disabled: false },
    { id: 'tax-impact-analyzer', name: 'Tax Impact Analyzer', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', url: 'http://localhost:3001/', icon: 'CalculatorIcon', disabled: false },
    { id: 'social-security', name: 'Social Security Optimization', gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', url: 'https://social-security.example/', icon: 'UserGroupIcon', disabled: false },
    { id: 'healthcare-cost', name: 'Healthcare Cost Calculator', gradient: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)', url: 'https://healthcare-cost.vercel.app/', icon: 'HeartIcon', disabled: false },
  ];

  const normalizeText = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');

  const matchesDefault = (d: {id: string, name: string}, a: {id: string, name: string}) => {
    if (!a) return false;
    if (a.id === d.id) return true;
    const an = normalizeText(a.name);
    const dn = normalizeText(d.name);
    // direct substring match
    if (an.includes(dn) || dn.includes(an)) return true;
    // match by canonical id words
    if (an.includes(d.id.replace(/-/g, ' '))) return true;
    // token intersection: e.g., 'monthly retirement income estimator' vs 'monthly retirement income ai'
    const aTokens = new Set(an.split(/\s+/).filter(Boolean));
    const dTokens = new Set(dn.split(/\s+/).filter(Boolean));
    let common = 0;
    aTokens.forEach((t) => { if (dTokens.has(t)) common++; });
    if (common >= 2) return true;
    // if a majority of the shorter token set matches, consider it the same app
    const minLen = Math.min(aTokens.size || 1, dTokens.size || 1);
    if (common / minLen >= 0.5) return true;
    return false;
  };

  const displayApps: {id: string, name: string, gradient?: string, url?: string, icon?: string, disabled?: boolean}[] = DEFAULT_APPS.map((d) => {
    const override = apps.find((a) => {
      if (!a) return false;
      return matchesDefault(d, a);
    });
    if (override) {
      // prefer the override's fields but fallback to defaults when missing
      return { id: override.id || d.id, name: override.name || d.name, gradient: override.gradient || d.gradient, url: override.url || d.url || '', icon: override.icon || (d as any).icon || '📦', disabled: typeof override.disabled === 'boolean' ? override.disabled : d.disabled };
    }
    return { id: d.id, name: d.name, gradient: d.gradient || '', url: (d as any).url, icon: (d as any).icon };
  }).concat(apps.filter((a) => !DEFAULT_APPS.some((d) => matchesDefault(d, a))).map(a => ({ id: a.id, name: a.name, gradient: a.gradient || '', url: a.url || '', icon: a.icon || '📦', disabled: a.disabled })));

  const appNodes = displayApps.filter(a => !a.disabled).map((app) => {
    const gradients: Record<string, string> = {
      'healthcare-cost': 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)',
      'income-estimator': 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
      'retire-abroad': 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
      'tax-impact-analyzer': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      default: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
    };

    const key = `${app.id || ''} ${app.name || ''}`.toLowerCase();
    const gradient = app.gradient || (
      key.includes('health') || key.includes('healthcare')
        ? gradients['healthcare-cost']
        : key.includes('income') || key.includes('estimator')
        ? gradients['income-estimator']
        : key.includes('retire') || key.includes('abroad')
        ? gradients['retire-abroad']
        : key.includes('tax')
        ? gradients['tax-impact-analyzer']
        : gradients.default
    );

    return (
      <div key={app.id} data-app-id={app.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: gradient }}>
        <AppIcon icon={app.icon} className="h-5 w-5" color="#000000" />
        <span className="text-sm font-medium text-black">{app.name}</span>
      </div>
    );
  });

  

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
            <img 
              src={theme === "dark" ? "/images/large-dark.png" : "/images/large-light.png"} 
              alt="RetireWise" 
              className="h-16 w-auto mx-auto mb-2"
            />
            <p className="text-gray-600">Plan with Clarity. Live with Confidence.</p>
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
            {appNodes}

          </div>
        </div>
      </div>
    </div>
  );
}
