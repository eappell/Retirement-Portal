"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  XMarkIcon,
  SparklesIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  BoltIcon,
  ClockIcon,
  CalendarIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  ArrowTopRightOnSquareIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { useUserTier } from "@/lib/useUserTier";
import { useToolData } from "@/contexts/ToolDataContext";
import { loadToolData, saveToolData, TOOL_IDS } from "@/lib/pocketbaseDataService";
import type { OrchestratorPlan, OrchestratorResponse } from "@/lib/types/orchestratorTypes";

interface OrchestratorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CachedOrchestratorPlan {
  userId: string;
  plan: OrchestratorPlan;
  tierUsed: string;
  tokensUsed?: { input: number; output: number };
  cachedAt: string;
  dataSignature: string;
}

const ORCHESTRATOR_CACHE_KEY = "retirewise_orchestrator_plan_v1";
const ORCHESTRATOR_STALE_MS = 24 * 60 * 60 * 1000;
const ORCHESTRATOR_PLAN_UPDATED_EVENT = "orchestrator-plan-updated";
const TOOL_ROUTE_ALIASES: Record<string, string> = {
  "monthly-retirement-income": "income-estimator",
  "state-relocator": "state-relocate",
  "state-relocate": "state-relocate",
  "identity-builder": "Retirement-Identity-Builder",
  "retirement-identity-builder": "Retirement-Identity-Builder",
  "legacy-visualizer": "legacy-flow-visualizer",
  "estate-manager": "digital-estate-manager",
  "ss-optimizer": "social-security-optimizer",
  "volunteer-matcher": "volunteer-purpose",
  "volunteer-purpose-matchmaker": "volunteer-purpose",
  "volunteer-purpose": "volunteer-purpose",
  "healthcare-cost-calculator": "healthcare-cost",
  "healthcare-cost-simulator": "healthcare-cost",
  "healthcare-cost-estimator": "healthcare-cost",
};
const TOOL_LABELS: Record<string, string> = {
  "income-estimator": "Income Estimator",
  "ss-optimizer": "Social Security Optimizer",
  "social-security": "Social Security Optimizer",
  "social-security-optimizer": "Social Security Optimizer",
  "tax-analyzer": "Tax Impact Analyzer",
  "tax-impact-analyzer": "Tax Impact Analyzer",
  "healthcare-cost": "Healthcare Cost Calculator",
  "healthcare-cost-estimator": "Healthcare Cost Calculator",
  "retire-abroad": "Retire Abroad",
  "state-relocate": "State Relocator",
  "state-relocator": "State Relocator",
  "longevity-planner": "Longevity & Drawdown Planner",
  "Retirement-Identity-Builder": "Retirement Identity Builder",
  "retirement-identity-builder": "Retirement Identity Builder",
  "volunteer-purpose": "Volunteer Purpose Matchmaker",
  "volunteer-matcher": "Volunteer Purpose Matchmaker",
  "legacy-flow-visualizer": "Legacy Flow Visualizer",
  "gifting-planner": "Gifting Strategy Planner",
  "digital-estate-manager": "Digital Estate Manager",
};

function normalizeToolToken(tool: string): string {
  return tool.trim().toLowerCase().replace(/\s+/g, "-");
}

function resolveToolLink(tool: string): { href: string; label: string } | null {
  const rawTool = tool.trim();
  const token = normalizeToolToken(rawTool);
  // Prefer the exact app/tool id first; use aliases only for legacy names.
  const resolvedFromAlias = TOOL_ROUTE_ALIASES[token];
  const looksLikeAppId = /^[A-Za-z0-9-]+$/.test(rawTool);
  const resolvedAppId = resolvedFromAlias || (looksLikeAppId ? rawTool : token);
  if (!resolvedAppId) return null;
  return {
    href: `/apps/${resolvedAppId}`,
    label: TOOL_LABELS[resolvedAppId] || TOOL_LABELS[token] || rawTool,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function severityLabelClass(severity: string): string {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  return "info";
}

function buildPrintablePlanHtml(plan: OrchestratorPlan): string {
  const priorities = plan.topPriorities.map((p) => `<span class="pill">${escapeHtml(p)}</span>`).join("");
  const warnings = plan.warnings
    .map((w) => {
      const related = w.relatedTools?.length
        ? `<p class="related">Related tools: ${w.relatedTools.map((t) => escapeHtml(t)).join(", ")}</p>`
        : "";
      return `
        <article class="warning ${severityLabelClass(w.severity)}">
          <div class="warning-head">
            <span class="badge ${severityLabelClass(w.severity)}">${escapeHtml(w.severity.toUpperCase())}</span>
            <h3>${escapeHtml(w.title)}</h3>
          </div>
          <p>${escapeHtml(w.description)}</p>
          <p><strong>Action:</strong> ${escapeHtml(w.actionRequired)}</p>
          ${related}
        </article>
      `;
    })
    .join("");

  const sections = plan.sections
    .map((s) => {
      const details = s.details.map((d) => `<li>${escapeHtml(d)}</li>`).join("");
      const recs = s.recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join("");
      const tools = s.relatedTools?.length
        ? `<p class="related">Related tools: ${s.relatedTools.map((t) => escapeHtml(t)).join(", ")}</p>`
        : "";
      return `
        <section class="card section">
          <div class="section-head">
            <h3>${escapeHtml(s.title)}</h3>
            <span class="meta">${escapeHtml(s.priority)} priority • ${escapeHtml(s.confidence)} confidence</span>
          </div>
          <p>${escapeHtml(s.summary)}</p>
          ${details ? `<h4>Key Findings</h4><ul>${details}</ul>` : ""}
          ${recs ? `<h4>Recommendations</h4><ul>${recs}</ul>` : ""}
          ${tools}
        </section>
      `;
    })
    .join("");

  const synergies = plan.synergies
    .map(
      (s) => `
        <article class="card mini">
          <h4>${escapeHtml(s.title)}</h4>
          <p>${escapeHtml(s.description)}</p>
          <p class="meta">${escapeHtml((s.tools || []).join(", "))}</p>
          ${s.potentialImpact ? `<p class="impact">${escapeHtml(s.potentialImpact)}</p>` : ""}
        </article>
      `
    )
    .join("");

  const renderActions = (title: string, items: string[]) => {
    if (!items.length) return "";
    return `
      <div class="card action-col">
        <h4>${escapeHtml(title)}</h4>
        <ol>
          ${items.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}
        </ol>
      </div>
    `;
  };

  const missingData = plan.missingDataSuggestions
    .map(
      (m) => `
        <article class="card mini">
          <h4>${escapeHtml(m.tool)}</h4>
          <p>${escapeHtml(m.reason)}</p>
          ${m.toolId ? `<p class="meta">Tool ID: ${escapeHtml(m.toolId)}</p>` : ""}
        </article>
      `
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Unified Retirement Plan</title>
    <style>
      :root {
        --indigo: #4f46e5;
        --slate-900: #0f172a;
        --slate-700: #334155;
        --slate-500: #64748b;
        --slate-200: #e2e8f0;
        --slate-100: #f1f5f9;
        --white: #ffffff;
        --green: #10b981;
        --amber: #f59e0b;
        --red: #ef4444;
        --blue: #3b82f6;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: var(--slate-900);
        background: var(--slate-100);
      }
      .page {
        max-width: 980px;
        margin: 0 auto;
        padding: 28px;
      }
      .hero {
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 65%, #6366f1 100%);
        color: var(--white);
        padding: 24px;
        border-radius: 18px;
      }
      .hero-top { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
      .hero h1 { margin: 0 0 8px 0; font-size: 28px; }
      .hero p { margin: 0; opacity: 0.95; }
      .score {
        min-width: 120px;
        text-align: center;
        background: rgba(255,255,255,0.16);
        border: 1px solid rgba(255,255,255,0.28);
        border-radius: 14px;
        padding: 10px 12px;
      }
      .score-value { font-size: 36px; line-height: 1; font-weight: 800; margin: 0 0 4px 0; }
      .score-label { margin: 0; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; opacity: 0.9; }
      .meta-row {
        margin-top: 14px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .pill {
        background: rgba(255,255,255,0.18);
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 12px;
      }
      .section-title {
        margin: 22px 0 10px;
        font-size: 16px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--slate-700);
      }
      .card {
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: 14px;
        padding: 14px;
        margin-bottom: 10px;
      }
      .warning.critical { border-left: 6px solid var(--red); }
      .warning.warning { border-left: 6px solid var(--amber); }
      .warning.info { border-left: 6px solid var(--blue); }
      .warning-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
      .warning-head h3 { margin: 0; font-size: 16px; }
      .badge {
        color: var(--white);
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 700;
      }
      .badge.critical { background: var(--red); }
      .badge.warning { background: var(--amber); color: #111827; }
      .badge.info { background: var(--blue); }
      .section-head { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
      .section-head h3 { margin: 0; font-size: 18px; }
      .section h4 { margin: 12px 0 6px; font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--slate-500); }
      .section ul, .action-col ol { margin: 0; padding-left: 20px; }
      .section li, .action-col li { margin: 4px 0; }
      .meta { color: var(--slate-500); font-size: 12px; }
      .related { margin-top: 8px; color: var(--slate-500); font-size: 12px; }
      .grid-two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .grid-three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .mini h4 { margin: 0 0 6px; }
      .impact { color: var(--green); font-weight: 700; margin: 8px 0 0; }
      .footer { margin-top: 18px; color: var(--slate-500); font-size: 12px; text-align: center; }
      @media (max-width: 760px) {
        .hero-top { display: block; }
        .score { margin-top: 12px; width: 100%; }
        .grid-two, .grid-three { grid-template-columns: 1fr; }
      }
      @media print {
        body { background: var(--white); }
        .page { max-width: none; padding: 0; }
        .card, .hero { break-inside: avoid; }
        .section-title { break-after: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <header class="hero">
        <div class="hero-top">
          <div>
            <h1>Unified Retirement Plan</h1>
            <p>${escapeHtml(plan.executiveSummary)}</p>
          </div>
          <div class="score">
            <p class="score-value">${plan.retirementReadinessScore}</p>
            <p class="score-label">Readiness Score</p>
          </div>
        </div>
        <div class="meta-row">
          <span class="pill">${plan.dataCompleteness}% data coverage</span>
          <span class="pill">${plan.toolsAnalyzed.length} tools analyzed</span>
          <span class="pill">Generated ${escapeHtml(new Date(plan.generatedAt).toLocaleString())}</span>
          <span class="pill">${escapeHtml(plan.modelUsed)}</span>
        </div>
        ${priorities ? `<div class="meta-row">${priorities}</div>` : ""}
      </header>

      ${warnings ? `<h2 class="section-title">Alerts</h2>${warnings}` : ""}
      ${sections ? `<h2 class="section-title">Plan Details</h2>${sections}` : ""}
      ${synergies ? `<h2 class="section-title">Cross-Tool Synergies</h2><div class="grid-two">${synergies}</div>` : ""}
      <h2 class="section-title">Action Plan</h2>
      <div class="grid-three">
        ${renderActions("Do Now", plan.immediateActions)}
        ${renderActions("1-6 Months", plan.shortTermActions)}
        ${renderActions("6+ Months", plan.longTermActions)}
      </div>
      ${missingData ? `<h2 class="section-title">Improve Your Plan</h2><div class="grid-two">${missingData}</div>` : ""}
      <p class="footer">RetireWise Unified Retirement Plan</p>
    </div>
  </body>
</html>`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function Orchestrator({ isOpen, onClose }: OrchestratorProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { tier } = useUserTier();
  const { toolData } = useToolData();
  const [plan, setPlan] = useState<OrchestratorPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [tierUsed, setTierUsed] = useState<string>("");
  const [tokensUsed, setTokensUsed] = useState<{ input: number; output: number } | undefined>();
  const [planCachedAt, setPlanCachedAt] = useState<string | null>(null);
  const [planDataSignature, setPlanDataSignature] = useState<string | null>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const pocketBaseLoadAttemptedForUserRef = useRef<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const dataSignature = useMemo(
    () => hashString(stableStringify(toolData || {})),
    [toolData]
  );

  const staleReasons = useMemo(() => {
    if (!plan || !planCachedAt || !planDataSignature) return [];
    const reasons: string[] = [];
    const age = Date.now() - Date.parse(planCachedAt);
    if (isFinite(age) && age > ORCHESTRATOR_STALE_MS) {
      reasons.push("This plan is over 24 hours old.");
    }
    if (planDataSignature !== dataSignature) {
      reasons.push("Your planning data has changed since this plan was generated.");
    }
    return reasons;
  }, [plan, planCachedAt, planDataSignature, dataSignature]);

  const persistPlanCache = useCallback(
    async (nextPlan: OrchestratorPlan, nextTierUsed: string, nextTokensUsed?: { input: number; output: number }) => {
      if (!user || typeof window === "undefined") return;
      const payload: CachedOrchestratorPlan = {
        userId: user.uid,
        plan: nextPlan,
        tierUsed: nextTierUsed,
        tokensUsed: nextTokensUsed,
        cachedAt: new Date().toISOString(),
        dataSignature,
      };
      localStorage.setItem(ORCHESTRATOR_CACHE_KEY, JSON.stringify(payload));
      setPlanCachedAt(payload.cachedAt);
      setPlanDataSignature(payload.dataSignature);

      window.dispatchEvent(new CustomEvent(ORCHESTRATOR_PLAN_UPDATED_EVENT, {
        detail: {
          score: nextPlan.retirementReadinessScore,
          cachedAt: payload.cachedAt,
        },
      }));

      if (!auth.currentUser) return;
      try {
        const token = await auth.currentUser.getIdToken();
        await saveToolData(token, TOOL_IDS.ORCHESTRATOR_PLAN, {
          userId: user.uid,
          plan: nextPlan,
          tierUsed: nextTierUsed,
          tokensUsed: nextTokensUsed,
          cachedAt: payload.cachedAt,
          dataSignature: payload.dataSignature,
        });
      } catch (e) {
        console.warn("[Orchestrator] Failed to save plan to PocketBase:", e);
      }
    },
    [user, dataSignature]
  );

  useEffect(() => {
    if (!isOpen || !user || typeof window === "undefined") return;

    const applyCachedPlan = (cached: CachedOrchestratorPlan) => {
      if (cached.userId !== user.uid || !cached.plan) return;
      setPlan(cached.plan);
      setTierUsed(cached.tierUsed || "");
      setTokensUsed(cached.tokensUsed);
      setPlanCachedAt(cached.cachedAt || cached.plan.generatedAt || new Date().toISOString());
      setPlanDataSignature(cached.dataSignature || "");
      setError(null);
      if (cached.plan.sections.length > 0) {
        setExpandedSections(new Set(cached.plan.sections.slice(0, 2).map((s) => s.id)));
      }
    };

    const raw = localStorage.getItem(ORCHESTRATOR_CACHE_KEY);
    let localCachedAtMs = 0;
    if (raw) {
      try {
        const cached = JSON.parse(raw) as CachedOrchestratorPlan;
        localCachedAtMs = Date.parse(cached.cachedAt || cached.plan?.generatedAt || "");
        applyCachedPlan(cached);
      } catch (e) {
        console.warn("[Orchestrator] Failed to read cached plan:", e);
      }
    }

    if (pocketBaseLoadAttemptedForUserRef.current === user.uid) {
      return;
    }
    pocketBaseLoadAttemptedForUserRef.current = user.uid;

    const loadFromPocketBase = async () => {
      if (!auth.currentUser) return;
      try {
        const token = await auth.currentUser.getIdToken();
        const result = await loadToolData(token, TOOL_IDS.ORCHESTRATOR_PLAN);
        if (!result?.data) return;
        const pbData = result.data as Record<string, unknown>;
        const pbPlan = pbData.plan as OrchestratorPlan | undefined;
        if (!pbPlan) return;

        const pbCached: CachedOrchestratorPlan = {
          userId: (pbData.userId as string) || user.uid,
          plan: pbPlan,
          tierUsed: (pbData.tierUsed as string) || "",
          tokensUsed: pbData.tokensUsed as { input: number; output: number } | undefined,
          cachedAt: (pbData.cachedAt as string) || result.created || pbPlan.generatedAt || new Date().toISOString(),
          dataSignature: (pbData.dataSignature as string) || "",
        };

        const pbCachedAt = Date.parse(pbCached.cachedAt || "");
        const shouldApplyPocketBase =
          !raw || (!isNaN(pbCachedAt) && pbCachedAt > localCachedAtMs);

        if (shouldApplyPocketBase) {
          applyCachedPlan(pbCached);
          localStorage.setItem(ORCHESTRATOR_CACHE_KEY, JSON.stringify(pbCached));
        }
      } catch (e) {
        console.warn("[Orchestrator] Failed to load plan from PocketBase:", e);
      }
    };

    void loadFromPocketBase();
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) {
      pocketBaseLoadAttemptedForUserRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || !plan) return;
    window.dispatchEvent(new CustomEvent(ORCHESTRATOR_PLAN_UPDATED_EVENT, {
      detail: {
        score: plan.retirementReadinessScore,
        cachedAt: planCachedAt || plan.generatedAt,
      },
    }));
  }, [plan, planCachedAt]);

  const generatePlan = useCallback(async () => {
    if (!user || !auth.currentUser) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          authToken: token,
          tier: tier === "paid" || tier === "admin" ? "paid" : "free",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate plan");
      }

      const data: OrchestratorResponse = await response.json();
      setPlan(data.plan);
      setTierUsed(data.tierUsed);
      setTokensUsed(data.tokensUsed);
      void persistPlanCache(data.plan, data.tierUsed, data.tokensUsed);
      // Auto-expand first two sections
      if (data.plan.sections.length > 0) {
        setExpandedSections(new Set(data.plan.sections.slice(0, 2).map(s => s.id)));
      }
    } catch (err) {
      console.error("Orchestrator error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [user, tier, persistPlanCache]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const returnToTop = useCallback(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const printPlan = useCallback(() => {
    if (typeof window === "undefined" || !plan) return;
    const printWindow = window.open("", "_blank", "width=1100,height=850");
    if (!printWindow) return;
    const html = buildPrintablePlanHtml(plan);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    const doPrint = () => {
      try {
        printWindow.print();
      } catch {
        // no-op
      }
    };
    printWindow.onload = doPrint;
    setTimeout(doPrint, 300);
  }, [plan]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container || !isOpen) return;

    const handleScroll = () => {
      setShowScrollToTop(container.scrollTop > container.clientHeight);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isOpen, plan]);

  if (!isOpen) return null;

  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-slate-900" : "bg-gray-50";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const borderClass = isDark ? "border-slate-700" : "border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-600";
  const hoverBg = isDark ? "hover:bg-slate-700" : "hover:bg-gray-50";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity z-[100000]"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        onClick={onClose}
      />

      {/* Full-screen Panel */}
      <div
        className={`fixed inset-0 z-[100001] flex flex-col ${bgClass} overflow-hidden`}
        style={{ animation: "fadeIn 0.3s ease-out" }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${borderClass} ${cardBg}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${textPrimary}`}>
                Unified Retirement Plan
              </h1>
              <p className={`text-sm ${textSecondary}`}>
                AI-powered analysis across all your planning tools
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {tierUsed && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                tierUsed === 'paid'
                  ? 'bg-purple-100 text-purple-900 dark:bg-purple-900/35 dark:text-purple-100'
                  : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-100'
              }`}>
                {tierUsed === 'paid' ? 'Claude Sonnet' : 'Gemini Flash'}
              </span>
            )}
            {plan && !isLoading && (
              <button
                onClick={printPlan}
                className={`p-2 rounded-lg ${hoverBg} ${textPrimary} print:hidden`}
                aria-label="Print Plan"
                title="Print Plan"
              >
                <PrinterIcon className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${hoverBg} ${textPrimary}`}
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          {!plan && !isLoading && !error && (
            <EmptyState
              onGenerate={generatePlan}
              isDark={isDark}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              tier={tier}
            />
          )}

          {isLoading && (
            <LoadingState isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} />
          )}

          {error && (
            <ErrorState
              error={error}
              onRetry={generatePlan}
              isDark={isDark}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          )}

          {plan && !isLoading && (
            <PlanView
              plan={plan}
              staleReasons={staleReasons}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              onRegenerate={generatePlan}
              isDark={isDark}
              cardBg={cardBg}
              borderClass={borderClass}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              hoverBg={hoverBg}
            />
          )}
        </div>

        {plan && showScrollToTop && (
          <button
            onClick={returnToTop}
            className="fixed bottom-6 right-6 z-[100002] p-3 text-white rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 print:hidden hover:scale-110"
            aria-label="Scroll to top"
            title="Return to top"
            style={{ backgroundColor: "#4f46e5", boxShadow: "0 6px 18px rgba(79,70,229,0.18)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

/* ============================================
   Sub-components
   ============================================ */

function EmptyState({
  onGenerate,
  isDark,
  textPrimary,
  textSecondary,
  tier,
}: {
  onGenerate: () => void;
  isDark: boolean;
  textPrimary: string;
  textSecondary: string;
  tier: string | null;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-lg px-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl">
          <SparklesIcon className="w-10 h-10 text-white" />
        </div>
        <h2 className={`text-2xl font-bold ${textPrimary} mb-3`}>
          Generate Your Unified Retirement Plan
        </h2>
        <p className={`${textSecondary} mb-2`}>
          The Orchestrator Agent analyzes data from all your planning tools and creates
          a comprehensive, cross-referenced retirement plan with actionable recommendations.
        </p>
        <p className={`text-sm ${textSecondary} mb-8`}>
          {tier === 'paid' || tier === 'admin'
            ? 'Using Claude Sonnet for premium analysis'
            : 'Using Gemini Flash — upgrade to paid for deeper Claude Sonnet analysis'}
        </p>

        <div className={`grid grid-cols-3 gap-4 mb-8 text-center ${textSecondary}`}>
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-2">
              <BoltIcon className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-xs font-medium">Cross-Tool Synergies</p>
          </div>
          <div>
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-2">
              <ShieldCheckIcon className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-xs font-medium">Risk Detection</p>
          </div>
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
              <LightBulbIcon className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xs font-medium">Action Plan</p>
          </div>
        </div>

        <button
          onClick={onGenerate}
          className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          Generate My Plan
        </button>
      </div>
    </div>
  );
}

function LoadingState({
  isDark,
  textPrimary,
  textSecondary,
}: {
  isDark: boolean;
  textPrimary: string;
  textSecondary: string;
}) {
  const steps = [
    "Aggregating data from all tools...",
    "Analyzing cross-tool patterns...",
    "Identifying optimization opportunities...",
    "Building your unified plan...",
  ];

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl animate-pulse">
          <SparklesIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className={`text-xl font-bold ${textPrimary} mb-6`}>
          Building Your Unified Plan
        </h2>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className={`flex items-center gap-3 ${textSecondary}`}>
              <ArrowPathIcon
                className="w-4 h-4 animate-spin text-indigo-500"
                style={{ animationDelay: `${i * 200}ms` }}
              />
              <span className="text-sm">{step}</span>
            </div>
          ))}
        </div>
        <p className={`text-xs ${textSecondary} mt-6`}>
          This may take 30-40 seconds...
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
  isDark,
  textPrimary,
  textSecondary,
}: {
  error: string;
  onRetry: () => void;
  isDark: boolean;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
        </div>
        <h2 className={`text-xl font-bold ${textPrimary} mb-3`}>
          Unable to Generate Plan
        </h2>
        <p className={`${textSecondary} mb-6 text-sm`}>{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

function PlanView({
  plan,
  staleReasons,
  expandedSections,
  toggleSection,
  onRegenerate,
  isDark,
  cardBg,
  borderClass,
  textPrimary,
  textSecondary,
  hoverBg,
}: {
  plan: OrchestratorPlan;
  staleReasons: string[];
  expandedSections: Set<string>;
  toggleSection: (id: string) => void;
  onRegenerate: () => void;
  isDark: boolean;
  cardBg: string;
  borderClass: string;
  textPrimary: string;
  textSecondary: string;
  hoverBg: string;
}) {
  const scoreColor = plan.retirementReadinessScore >= 80
    ? "text-green-500"
    : plan.retirementReadinessScore >= 60
    ? "text-blue-500"
    : plan.retirementReadinessScore >= 40
    ? "text-yellow-500"
    : "text-red-500";

  const scoreBg = plan.retirementReadinessScore >= 80
    ? "from-green-500 to-emerald-600"
    : plan.retirementReadinessScore >= 60
    ? "from-blue-500 to-indigo-600"
    : plan.retirementReadinessScore >= 40
    ? "from-yellow-500 to-orange-600"
    : "from-red-500 to-rose-600";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {staleReasons.length > 0 && (
        <div className={`rounded-xl border p-4 ${isDark ? "bg-amber-900/20 border-amber-800" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-sm font-semibold ${textPrimary}`}>Plan may be outdated</p>
              <ul className={`mt-1 text-xs space-y-1 ${textSecondary}`}>
                {staleReasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition-all"
            >
              <ArrowPathIcon className="w-3 h-3" />
              Regenerate Plan
            </button>
          </div>
        </div>
      )}

      {/* Executive Summary Card */}
      <div className={`${cardBg} rounded-2xl border ${borderClass} p-6 shadow-sm`}>
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Score */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${scoreBg} flex items-center justify-center shadow-lg`}>
              <span className="text-3xl font-bold text-white">{plan.retirementReadinessScore}</span>
            </div>
            <p className={`text-xs font-medium ${textSecondary} mt-2`}>Readiness Score</p>
          </div>

          {/* Summary */}
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${textPrimary} mb-2`}>Executive Summary</h2>
            <p className={`${textSecondary} text-sm mb-4`}>{plan.executiveSummary}</p>

            {/* Top Priorities */}
            {plan.topPriorities.length > 0 && (
              <div>
                <p className={`text-xs font-semibold ${textPrimary} mb-2 uppercase tracking-wider`}>
                  Top Priorities
                </p>
                <div className="flex flex-wrap gap-2">
                  {plan.topPriorities.map((p, i) => (
                    <span
                      key={i}
                      className={`text-xs px-3 py-1 rounded-full ${
                        isDark ? "bg-indigo-900/30 text-indigo-300" : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <p className={`text-xs ${textSecondary}`}>
              {plan.dataCompleteness}% data coverage
            </p>
            <p className={`text-xs ${textSecondary}`}>
              {plan.toolsAnalyzed.length} tools analyzed
            </p>
            <button
              onClick={onRegenerate}
              className={`flex items-center gap-1 text-xs px-3 py-1 rounded-lg mt-2 ${
                isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"
              } hover:opacity-80 transition-opacity`}
            >
              <ArrowPathIcon className="w-3 h-3" />
              Regenerate
            </button>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {plan.warnings.length > 0 && (
        <div className="space-y-3">
          {plan.warnings.map((warning) => {
            const severityConfig = {
              critical: {
                bg: isDark ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200",
                icon: <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />,
                label: "bg-red-500 text-white",
              },
              warning: {
                bg: isDark ? "bg-yellow-900/20 border-yellow-800" : "bg-yellow-50 border-yellow-200",
                icon: <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />,
                label: "bg-yellow-500 text-gray-900",
              },
              info: {
                bg: isDark ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200",
                icon: <InformationCircleIcon className="w-5 h-5 text-blue-500" />,
                label: "bg-blue-500 text-white",
              },
	            };
	            const config = severityConfig[warning.severity];
              const relatedToolLinks = warning.relatedTools
                .map((tool) => resolveToolLink(tool))
                .filter((link): link is { href: string; label: string } => !!link)
                .filter((link, index, arr) => arr.findIndex((item) => item.href === link.href) === index);

	            return (
	              <div key={warning.id} className={`rounded-xl border p-4 ${config.bg}`}>
	                <div className="flex items-start gap-3">
                  {config.icon}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${config.label}`}>
                        {warning.severity.toUpperCase()}
                      </span>
                      <h4 className={`text-sm font-semibold ${textPrimary}`}>{warning.title}</h4>
                    </div>
                    <p className={`text-xs ${textSecondary} mb-1`}>{warning.description}</p>
	                    <p className={`text-xs font-medium ${textPrimary}`}>
	                      Action: {warning.actionRequired}
	                    </p>
                      {relatedToolLinks.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {relatedToolLinks.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                                isDark
                                  ? "bg-slate-800/60 border-slate-600 text-slate-200 hover:bg-slate-700"
                                  : "bg-white/80 border-slate-300 text-slate-700 hover:bg-white"
                              }`}
                              title={`Open ${link.label}`}
                            >
                              <span>{link.label}</span>
                              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            </Link>
                          ))}
                        </div>
                      )}
	                  </div>
	                </div>
	              </div>
	            );
          })}
        </div>
      )}

      {/* Plan Sections */}
      <div className="space-y-3">
        {plan.sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const priorityDot = {
            critical: "bg-red-500",
            high: "bg-orange-500",
            medium: "bg-yellow-500",
            low: "bg-blue-400",
          };

          return (
            <div key={section.id} className={`${cardBg} rounded-xl border ${borderClass} overflow-hidden shadow-sm`}>
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between p-4 ${hoverBg} transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${priorityDot[section.priority]}`} />
                  <h3 className={`text-sm font-semibold ${textPrimary}`}>{section.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"
                  }`}>
                    {section.confidence} confidence
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUpIcon className={`w-5 h-5 ${textSecondary}`} />
                ) : (
                  <ChevronDownIcon className={`w-5 h-5 ${textSecondary}`} />
                )}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className={`px-4 pb-4 border-t ${borderClass}`}>
                  <p className={`text-sm ${textSecondary} mt-3 mb-4`}>{section.summary}</p>

                  {/* Details */}
                  {section.details.length > 0 && (
                    <div className="mb-4">
                      <p className={`text-xs font-semibold ${textPrimary} mb-2 uppercase tracking-wider`}>
                        Key Findings
                      </p>
                      <ul className="space-y-1">
                        {section.details.map((detail, i) => (
                          <li key={i} className={`text-sm ${textSecondary} flex items-start gap-2`}>
                            <span className="text-indigo-500 mt-1">&#8226;</span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {section.recommendations.length > 0 && (
                    <div className={`rounded-lg p-3 ${isDark ? "bg-indigo-900/20" : "bg-indigo-50"}`}>
                      <p className={`text-xs font-semibold mb-2 ${isDark ? "text-indigo-300" : "text-indigo-700"} uppercase tracking-wider`}>
                        Recommendations
                      </p>
                      <ul className="space-y-1">
                        {section.recommendations.map((rec, i) => (
                          <li key={i} className={`text-sm flex items-start gap-2 ${isDark ? "text-indigo-200" : "text-indigo-800"}`}>
                            <CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

	                  {/* Related Tools */}
	                  {section.relatedTools.length > 0 && (
	                    <div className="flex flex-wrap gap-1 mt-3">
	                      {section.relatedTools.map((tool) => {
                          const link = resolveToolLink(tool);
                          if (!link) {
                            return (
                              <span
                                key={tool}
                                className={`text-xs px-2 py-0.5 rounded ${
                                  isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {tool}
                              </span>
                            );
                          }

                          return (
                            <Link
                              key={`${section.id}-${link.href}`}
                              href={link.href}
                              className={`text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 border transition-colors ${
                                isDark
                                  ? "bg-slate-700/70 border-slate-600 text-slate-200 hover:bg-slate-600"
                                  : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-white"
                              }`}
                              title={`Open ${link.label}`}
                            >
                              <span>{link.label}</span>
                              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            </Link>
                          );
                        })}
	                    </div>
	                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cross-Tool Synergies */}
      {plan.synergies.length > 0 && (
        <div className={`${cardBg} rounded-2xl border ${borderClass} p-6 shadow-sm`}>
          <h3 className={`text-base font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
            <BoltIcon className="w-5 h-5 text-indigo-500" />
            Cross-Tool Synergies
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plan.synergies.map((synergy, i) => (
              <div
                key={i}
                className={`rounded-xl border ${borderClass} p-4 ${
                  isDark ? "bg-slate-700/50" : "bg-gray-50"
                }`}
              >
                <h4 className={`text-sm font-semibold ${textPrimary} mb-1`}>{synergy.title}</h4>
                <p className={`text-xs ${textSecondary} mb-2`}>{synergy.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {synergy.tools.map((tool) => (
                      <span
                        key={tool}
                        className={`text-xs px-2 py-0.5 rounded ${
                          isDark ? "bg-indigo-900/30 text-indigo-300" : "bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                  {synergy.potentialImpact && (
                    <span className={`text-xs font-semibold ${isDark ? "text-green-400" : "text-green-600"}`}>
                      {synergy.potentialImpact}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Plan */}
      <div className={`${cardBg} rounded-2xl border ${borderClass} p-6 shadow-sm`}>
        <h3 className={`text-base font-bold ${textPrimary} mb-4`}>Action Plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Immediate */}
          {plan.immediateActions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BoltIcon className="w-4 h-4 text-red-500" />
                <p className={`text-xs font-semibold ${textPrimary} uppercase tracking-wider`}>
                  Do Now
                </p>
              </div>
              <ul className="space-y-2">
                {plan.immediateActions.map((action, i) => (
                  <li key={i} className={`text-sm ${textSecondary} flex items-start gap-2`}>
                    <span className="text-red-500 font-bold text-xs mt-0.5">{i + 1}</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Short Term */}
          {plan.shortTermActions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon className="w-4 h-4 text-yellow-500" />
                <p className={`text-xs font-semibold ${textPrimary} uppercase tracking-wider`}>
                  1-6 Months
                </p>
              </div>
              <ul className="space-y-2">
                {plan.shortTermActions.map((action, i) => (
                  <li key={i} className={`text-sm ${textSecondary} flex items-start gap-2`}>
                    <span className="text-yellow-500 font-bold text-xs mt-0.5">{i + 1}</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Long Term */}
          {plan.longTermActions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="w-4 h-4 text-blue-500" />
                <p className={`text-xs font-semibold ${textPrimary} uppercase tracking-wider`}>
                  6+ Months
                </p>
              </div>
              <ul className="space-y-2">
                {plan.longTermActions.map((action, i) => (
                  <li key={i} className={`text-sm ${textSecondary} flex items-start gap-2`}>
                    <span className="text-blue-500 font-bold text-xs mt-0.5">{i + 1}</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Missing Data Suggestions */}
      {plan.missingDataSuggestions.length > 0 && (
        <div className={`${cardBg} rounded-2xl border ${borderClass} p-6 shadow-sm`}>
          <h3 className={`text-base font-bold ${textPrimary} mb-3 flex items-center gap-2`}>
            <LightBulbIcon className="w-5 h-5 text-yellow-500" />
            Improve Your Plan
          </h3>
          <p className={`text-sm ${textSecondary} mb-4`}>
            Use these tools to provide more data for a more comprehensive analysis:
          </p>
	          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
	            {plan.missingDataSuggestions.map((suggestion, i) => {
                const link = resolveToolLink(suggestion.toolId || suggestion.tool);
                return (
                  <div
                    key={i}
                    className={`rounded-lg border ${borderClass} p-3 ${
                      isDark ? "bg-slate-700/50" : "bg-gray-50"
                    }`}
                  >
                    <p className={`text-sm font-medium ${textPrimary}`}>{suggestion.tool}</p>
                    <p className={`text-xs ${textSecondary} mt-1`}>{suggestion.reason}</p>
                    {link && (
                      <Link
                        href={link.href}
                        className={`inline-flex items-center gap-1 text-xs mt-2 ${
                          isDark ? "text-indigo-300 hover:text-indigo-200" : "text-indigo-700 hover:text-indigo-800"
                        } underline underline-offset-2`}
                        title={`Open ${link.label}`}
                      >
                        Open {link.label}
                        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                );
              })}
	          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`text-center py-4 ${textSecondary}`}>
        <p className="text-xs">
          Generated {new Date(plan.generatedAt).toLocaleString()} using {plan.modelUsed}
        </p>
      </div>
    </div>
  );
}
