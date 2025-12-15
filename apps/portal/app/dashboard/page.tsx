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
              {apps.length === 0 && !loadingApps && (
                <div className="text-center text-gray-500">No apps available</div>
              )}

              {apps.map((app) => (
                <div
                  key={app.id}
                  data-app-id={app.id}
                  className={`tool-card ${app.id}`}
                  onClick={() => {
                    handleAppClick(app);
                    router.push(`/apps/${app.id}?name=${encodeURIComponent(app.name)}`);
                  }}
                >
                  <div className="tool-card-content">
                    <div className="tool-icon" style={app.gradient ? { background: app.gradient } : undefined}>
                      <AppIcon icon={app.icon} className="w-12 h-12 text-white" />
                    </div>
                    <div className="tool-info">
                      <div className="tool-title">{app.name}</div>
                      <p className="tool-description">{app.description}</p>
                      {app.freeAllowed && <span className="badge">Free</span>}
                    </div>
                  </div>
                </div>
              ))}
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
            /* Theme-aware variables (default = dark theme) */
            .dashboard-redesign {
              --bg: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
              --text: #e2e8f0;
              --muted: #94a3b8;
              --card-bg: rgba(255,255,255,0.05);
              --card-border: rgba(255,255,255,0.1);
              --title-gradient: linear-gradient(135deg,#ffffff 0%, #60a5fa 100%);
              --accent: #60a5fa;
              min-height: 100vh;
              background: var(--bg);
              color: var(--text);
              position: relative;
              overflow-x: hidden;
            }

            /* Light theme overrides */
            .light .dashboard-redesign {
              --bg: linear-gradient(to bottom right, #E8E3DF, #BFCDE0);
              --text: #0f172a;
              --muted: #475569;
              --card-bg: rgba(255,255,255,0.8);
              --card-border: rgba(15,23,42,0.05);
              --title-gradient: linear-gradient(135deg,#0B5394 0%, #60a5fa 100%);
              --accent: #0B5394;
            }

            .background-particles { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
            .particle { position: absolute; background: radial-gradient(circle, rgba(96, 165, 250, 0.3) 0%, transparent 70%); border-radius: 50%; animation: float 20s infinite ease-in-out; }
            .particle:nth-child(1) { width: 300px; height: 300px; top: 10%; left: 10%; animation-delay: 0s; }
            .particle:nth-child(2) { width: 200px; height: 200px; top: 60%; left: 70%; animation-delay: 5s; }
            .particle:nth-child(3) { width: 250px; height: 250px; top: 30%; left: 80%; animation-delay: 10s; }
            @keyframes float { 0%,100%{ transform: translate(0,0) scale(1); opacity: .3 } 33%{ transform: translate(50px,-50px) scale(1.1); opacity:.5 } 66%{ transform: translate(-30px,30px) scale(.9); opacity:.4 } }
            .container{ max-width:1400px; margin:0 auto; padding:0 20px; position:relative; z-index:1; padding-top:40px; }
            .hero-section { margin-bottom:48px; text-align:center; }
            h1{ font-size:3rem; font-weight:800; margin-bottom:16px; background:var(--title-gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:-0.02em }
            .subtitle{ font-size:1.25rem; color:var(--muted); font-weight:500 }
            .tools-grid{ display:grid; grid-template-columns: repeat(2, minmax(320px,1fr)); gap:32px; margin-bottom:48px }
            .tool-card{ background: var(--card-bg); backdrop-filter: blur(10px); border:1px solid var(--card-border); border-radius:24px; padding:28px; min-height:150px; position:relative; overflow:hidden; cursor:pointer; transition: transform .28s cubic-bezier(.4,0,.2,1), box-shadow .28s }
            .tool-card:hover{ transform: translateY(-6px) scale(1.03); border-color: rgba(0,0,0,0.08); box-shadow:0 18px 40px rgba(0,0,0,0.12) }
            .tool-card.income{ background: linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(5,150,105,0.04) 100%) }
            .tool-card.abroad{ background: linear-gradient(135deg, rgba(96,165,250,0.06) 0%, rgba(59,130,246,0.04) 100%) }
            .tool-card.tax{ background: linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(124,58,237,0.04) 100%) }
            .tool-card.healthcare{ background: linear-gradient(135deg, rgba(244,114,182,0.06) 0%, rgba(236,72,153,0.04) 100%) }
            .tool-card.activity{ background: linear-gradient(135deg, rgba(251,146,60,0.06) 0%, rgba(249,115,22,0.04) 100%) }
            .tool-card.social{ background: linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(245,158,11,0.04) 100%) }
            .tool-card.pension{ background: linear-gradient(135deg, rgba(168,85,247,0.06) 0%, rgba(147,51,234,0.04) 100%) }
            .tool-card-content{ position:relative; z-index:1; display:flex; align-items:center; gap:24px; flex-wrap:nowrap }
            .tool-icon{ width:88px; height:88px; border-radius:18px; display:flex; align-items:center; justify-content:center; font-size:2.5rem; flex:0 0 88px; transition:all .3s; box-shadow:0 6px 20px rgba(0,0,0,0.08); overflow:hidden }
            .tool-card:hover .tool-icon{ transform: scale(1.05) rotate(3deg) }
            .tool-card.income .tool-icon { background: linear-gradient(135deg,#10b981 0%, #059669 100%) }
            .tool-card.abroad .tool-icon { background: linear-gradient(135deg,#60a5fa 0%, #3b82f6 100%) }
            .tool-card.tax .tool-icon { background: linear-gradient(135deg,#8b5cf6 0%, #7c3aed 100%) }
            .tool-card.healthcare .tool-icon { background: linear-gradient(135deg,#f472b6 0%, #ec4899 100%) }
            .tool-card.activity .tool-icon { background: linear-gradient(135deg,#fb923c 0%, #f97316 100%) }
            .tool-card.social .tool-icon { background: linear-gradient(135deg,#fbbf24 0%, #f59e0b 100%) }
            .tool-card.pension .tool-icon { background: linear-gradient(135deg,#a855f7 0%, #9333ea 100%) }
            .tool-info{ flex:1; min-width:0 }
            .tool-title{ font-size:1.75rem; font-weight:800; margin-bottom:8px; color:var(--text) }
            .tool-description{ color:var(--muted); line-height:1.6; font-size:1rem }
            .badge{ display:inline-block; background: rgba(96,165,250,0.14); color:var(--accent); padding:6px 14px; border-radius:18px; font-size:.78rem; font-weight:700; margin-top:12px; border:1px solid rgba(96,165,250,0.18) }
-            .stats-section{ display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:20px; margin-top:48px }
-            .stat-card{ background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:24px; text-align:center; transition:all .3s }
            .stat-card:hover{ transform: translateY(-4px); border-color: rgba(0,0,0,0.08) }
            .stat-value{ font-size:2.5rem; font-weight:800; color:var(--accent); margin-bottom:8px }
            .stat-label{ color:var(--muted); font-size:.9rem; font-weight:500 }
+            .tool-card{ background: var(--card-bg); backdrop-filter: blur(10px); border:1px solid var(--card-border); border-radius:20px; padding:32px; position:relative; overflow:hidden; cursor:pointer; transition: all .4s cubic-bezier(.4,0,.2,1) }
+            .tool-card:hover{ transform: translateY(-8px) scale(1.02); border-color: rgba(0,0,0,0.08); box-shadow:0 20px 40px rgba(0,0,0,0.05) }
+            .tool-card.income{ background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.06) 100%) }
+            .tool-card.abroad{ background: linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(59,130,246,0.06) 100%) }
+            .tool-card.tax{ background: linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(124,58,237,0.06) 100%) }
+            .tool-card.healthcare{ background: linear-gradient(135deg, rgba(244,114,182,0.08) 0%, rgba(236,72,153,0.06) 100%) }
+            .tool-card.activity{ background: linear-gradient(135deg, rgba(251,146,60,0.08) 0%, rgba(249,115,22,0.06) 100%) }
+            .tool-card.social{ background: linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.06) 100%) }
+            .tool-card.pension{ background: linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(147,51,234,0.06) 100%) }
+            .tool-card-content{ position:relative; z-index:1; display:flex; align-items:flex-start; gap:20px }
+            .tool-icon{ width:64px; height:64px; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:2rem; flex-shrink:0; transition:all .4s; box-shadow:0 4px 12px rgba(0,0,0,0.06) }
+            .tool-card:hover .tool-icon{ transform: scale(1.1) rotate(5deg) }
+            .tool-card.income .tool-icon { background: linear-gradient(135deg,#10b981 0%, #059669 100%) }
+            .tool-card.abroad .tool-icon { background: linear-gradient(135deg,#60a5fa 0%, #3b82f6 100%) }
+            .tool-card.tax .tool-icon { background: linear-gradient(135deg,#8b5cf6 0%, #7c3aed 100%) }
+            .tool-card.healthcare .tool-icon { background: linear-gradient(135deg,#f472b6 0%, #ec4899 100%) }
+            .tool-card.activity .tool-icon { background: linear-gradient(135deg,#fb923c 0%, #f97316 100%) }
+            .tool-card.social .tool-icon { background: linear-gradient(135deg,#fbbf24 0%, #f59e0b 100%) }
+            .tool-card.pension .tool-icon { background: linear-gradient(135deg,#a855f7 0%, #9333ea 100%) }
+            .tool-info{ flex:1 }
+            .tool-title{ font-size:1.5rem; font-weight:700; margin-bottom:8px; color:var(--text) }
+            .tool-description{ color:var(--muted); line-height:1.6; font-size:.95rem }
+            .badge{ display:inline-block; background: rgba(96,165,250,0.12); color:var(--accent); padding:4px 12px; border-radius:20px; font-size:.75rem; font-weight:600; margin-top:12px; border:1px solid rgba(96,165,250,0.18) }
+            .stats-section{ display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:20px; margin-top:48px }
+            .stat-card{ background: var(--card-bg); backdrop-filter: blur(6px); border:1px solid var(--card-border); border-radius:16px; padding:24px; text-align:center; transition:all .3s }
+            .stat-card:hover{ transform: translateY(-4px); border-color: rgba(0,0,0,0.08) }
+            .stat-value{ font-size:2.5rem; font-weight:800; color:var(--accent); margin-bottom:8px }
+            .stat-label{ color:var(--muted); font-size:.9rem; font-weight:500 }
             @media (max-width:1024px){ .tools-grid{ grid-template-columns: 1fr } h1{ font-size:2rem } .tool-title{ font-size:1.25rem } .tool-icon{ width:72px; height:72px } }
           `}</style>
        </div>
      </main>
    </div>
  );
}


