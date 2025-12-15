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
import { getIconComponent, AppIcon } from "@/components/icon-map";

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
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const [mounted, setMounted] = useState(false);
  const [apps, setApps] = useState<App[]>(DEFAULT_APPS);
  const [loadingApps, setLoadingApps] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadApps = async () => {
      try {
        setLoadingApps(true);
        const appsRef = collection(db, 'apps');
        const snapshot = await getDocs(appsRef);
        const loadedApps: App[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          loadedApps.push({
            id: data.id,
            name: data.name,
            description: data.description,
            url: data.url,
            icon: data.icon,
            freeAllowed: data.freeAllowed,
            gradient: data.gradient,
            disabled: data.disabled,
          });
        });

        if (loadedApps.length > 0) {
          const normalizeText = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
          const matchesDefault = (d: App, a?: App) => {
            if (!a) return false;
            if (a.id === d.id) return true;
            const an = normalizeText(a.name || '');
            const dn = normalizeText(d.name || '');
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

      <main>
        <div className="dashboard-redesign">
          <div className="background-particles" aria-hidden="true">
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
          </div>

          <div className="container">
            <div className="hero-section">
              <h1>Available Tools</h1>
              <p className="subtitle">Retire Confidently, Live Fully</p>
            </div>

            <div className="tools-grid">
              <div className="tool-card income" onClick={() => router.push('/apps/income-estimator?name=Monthly%20Retirement%20Income%20Estimator')}>
                <div className="tool-card-content">
                  <div className="tool-icon">💰</div>
                  <div className="tool-info">
                    <div className="tool-title">Monthly Retirement Income AI</div>
                    <p className="tool-description">Estimate your retirement income, taxes, and net worth with AI-powered precision and personalized recommendations.</p>
                    <span className="badge">AI-Powered</span>
                  </div>
                </div>
              </div>

              <div className="tool-card abroad" onClick={() => router.push('/apps/retire-abroad?name=Retire%20Abroad%20AI%20Recommendations')}>
                <div className="tool-card-content">
                  <div className="tool-icon">🌍</div>
                  <div className="tool-info">
                    <div className="tool-title">Retire Abroad AI</div>
                    <p className="tool-description">Find your perfect retirement destination from 100+ countries with personalized matching based on your lifestyle and budget.</p>
                    <span className="badge">100+ Destinations</span>
                  </div>
                </div>
              </div>

              <div className="tool-card tax" onClick={() => router.push('/apps/tax-impact-analyzer?name=Tax%20Impact%20Analyzer')}>
                <div className="tool-card-content">
                  <div className="tool-icon">📊</div>
                  <div className="tool-info">
                    <div className="tool-title">Tax Impact Analyzer</div>
                    <p className="tool-description">Plan your retirement taxes with confidence and optimize your withdrawal strategy for maximum tax efficiency.</p>
                    <span className="badge">Tax Optimization</span>
                  </div>
                </div>
              </div>

              <div className="tool-card healthcare" onClick={() => router.push('/apps/healthcare-cost?name=Healthcare%20Cost%20Calculator')}>
                <div className="tool-card-content">
                  <div className="tool-icon">🏥</div>
                  <div className="tool-info">
                    <div className="tool-title">Healthcare Cost Calculator</div>
                    <p className="tool-description">Plan for your retirement healthcare expenses with personalized projections based on your health profile, location, and lifestyle.</p>
                    <span className="badge">Personalized</span>
                  </div>
                </div>
              </div>

              <div className="tool-card activity" onClick={() => router.push('/apps/activity-budget?name=Activity%20Budget%20Planner')}>
                <div className="tool-card-content">
                  <div className="tool-icon">🚀</div>
                  <div className="tool-info">
                    <div className="tool-title">Activity Budget Planner</div>
                    <p className="tool-description">Design intentional activity budgets across the three retirement phases: Go-Go, Slow-Go, and No-Go years.</p>
                    <span className="badge">3-Phase Planning</span>
                  </div>
                </div>
              </div>

              <div className="tool-card social" onClick={() => router.push('/apps/social-security?name=Social%20Security%20Optimizer')}>
                <div className="tool-card-content">
                  <div className="tool-icon">💵</div>
                  <div className="tool-info">
                    <div className="tool-title">Social Security Optimizer</div>
                    <p className="tool-description">Maximize your lifetime Social Security benefits with data-driven insights and break-even analysis.</p>
                    <span className="badge">Data-Driven</span>
                  </div>
                </div>
              </div>

              <div className="tool-card pension" onClick={() => router.push('/apps/pension-analyzer?name=Pension%20vs%20Lumpsum%20Analyzer')}>
                <div className="tool-card-content">
                  <div className="tool-icon">⚖️</div>
                  <div className="tool-info">
                    <div className="tool-title">Pension vs Lumpsum Analyzer</div>
                    <p className="tool-description">Make informed pension election decisions with comprehensive analysis of your options and long-term projections.</p>
                    <span className="badge">Decision Support</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="stats-section">
              <div className="stat-card">
                <div className="stat-value">{apps.length}</div>
                <div className="stat-label">Planning Tools</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">AI</div>
                <div className="stat-label">Powered Insights</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">100%</div>
                <div className="stat-label">Free to Use</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">∞</div>
                <div className="stat-label">Possibilities</div>
              </div>
            </div>
          </div>

          <style>{`
            /* Inserted dashboard redesign styles (scoped to this component) */
            .dashboard-redesign { min-height: 100vh; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #e2e8f0; position: relative; overflow-x: hidden; }
            .background-particles { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
            .particle { position: absolute; background: radial-gradient(circle, rgba(96, 165, 250, 0.3) 0%, transparent 70%); border-radius: 50%; animation: float 20s infinite ease-in-out; }
            .particle:nth-child(1) { width: 300px; height: 300px; top: 10%; left: 10%; animation-delay: 0s; }
            .particle:nth-child(2) { width: 200px; height: 200px; top: 60%; left: 70%; animation-delay: 5s; }
            .particle:nth-child(3) { width: 250px; height: 250px; top: 30%; left: 80%; animation-delay: 10s; }
            @keyframes float { 0%,100%{ transform: translate(0,0) scale(1); opacity: .3 } 33%{ transform: translate(50px,-50px) scale(1.1); opacity:.5 } 66%{ transform: translate(-30px,30px) scale(.9); opacity:.4 } }
            .container{ max-width:1400px; margin:0 auto; padding:0 20px; position:relative; z-index:1; padding-top:40px; }
            .hero-section { margin-bottom:48px; text-align:center; }
            h1{ font-size:3rem; font-weight:800; margin-bottom:16px; background:linear-gradient(135deg,#ffffff 0%, #60a5fa 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:-0.02em }
            .subtitle{ font-size:1.25rem; color:#94a3b8; font-weight:500 }
            .tools-grid{ display:grid; grid-template-columns: repeat(auto-fit, minmax(500px,1fr)); gap:24px; margin-bottom:48px }
            .tool-card{ background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:32px; position:relative; overflow:hidden; cursor:pointer; transition: all .4s cubic-bezier(.4,0,.2,1) }
            .tool-card:hover{ transform: translateY(-8px) scale(1.02); border-color: rgba(255,255,255,0.3); box-shadow:0 20px 40px rgba(0,0,0,0.3) }
            .tool-card.income{ background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.1) 100%) }
            .tool-card.abroad{ background: linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(59,130,246,0.1) 100%) }
            .tool-card.tax{ background: linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(124,58,237,0.1) 100%) }
            .tool-card.healthcare{ background: linear-gradient(135deg, rgba(244,114,182,0.15) 0%, rgba(236,72,153,0.1) 100%) }
            .tool-card.activity{ background: linear-gradient(135deg, rgba(251,146,60,0.15) 0%, rgba(249,115,22,0.1) 100%) }
            .tool-card.social{ background: linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.1) 100%) }
            .tool-card.pension{ background: linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(147,51,234,0.1) 100%) }
            .tool-card-content{ position:relative; z-index:1; display:flex; align-items:flex-start; gap:20px }
            .tool-icon{ width:64px; height:64px; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:2rem; flex-shrink:0; transition:all .4s; box-shadow:0 4px 12px rgba(0,0,0,0.2) }
            .tool-card:hover .tool-icon{ transform: scale(1.1) rotate(5deg) }
            .tool-card.income .tool-icon { background: linear-gradient(135deg,#10b981 0%, #059669 100%) }
            .tool-card.abroad .tool-icon { background: linear-gradient(135deg,#60a5fa 0%, #3b82f6 100%) }
            .tool-card.tax .tool-icon { background: linear-gradient(135deg,#8b5cf6 0%, #7c3aed 100%) }
            .tool-card.healthcare .tool-icon { background: linear-gradient(135deg,#f472b6 0%, #ec4899 100%) }
            .tool-card.activity .tool-icon { background: linear-gradient(135deg,#fb923c 0%, #f97316 100%) }
            .tool-card.social .tool-icon { background: linear-gradient(135deg,#fbbf24 0%, #f59e0b 100%) }
            .tool-card.pension .tool-icon { background: linear-gradient(135deg,#a855f7 0%, #9333ea 100%) }
            .tool-info{ flex:1 }
            .tool-title{ font-size:1.5rem; font-weight:700; margin-bottom:8px; color:white }
            .tool-description{ color:#94a3b8; line-height:1.6; font-size:.95rem }
            .badge{ display:inline-block; background: rgba(96,165,250,0.2); color:#60a5fa; padding:4px 12px; border-radius:20px; font-size:.75rem; font-weight:600; margin-top:12px; border:1px solid rgba(96,165,250,0.3) }
            .stats-section{ display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:20px; margin-top:48px }
            .stat-card{ background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:24px; text-align:center; transition:all .3s }
            .stat-card:hover{ transform: translateY(-4px); border-color: rgba(255,255,255,0.2) }
            .stat-value{ font-size:2.5rem; font-weight:800; color:#60a5fa; margin-bottom:8px }
            .stat-label{ color:#94a3b8; font-size:.9rem; font-weight:500 }
            @media (max-width:768px){ .tools-grid{ grid-template-columns: 1fr } h1{ font-size:2rem } .tool-title{ font-size:1.25rem } }
          `}</style>
        </div>
      </main>
    </div>
  );
}


