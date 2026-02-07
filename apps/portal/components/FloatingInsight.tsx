"use client";

import { useState, useEffect } from "react";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { useTheme } from "@/lib/theme";
import type { CrossToolInsight } from "@/lib/types/aggregatedToolData";

interface FloatingInsightProps {
  onClick: () => void;
  insights?: CrossToolInsight[];
  hasInsight?: boolean;
}

export function FloatingInsight({
  onClick,
  insights = [],
  hasInsight = false,
}: FloatingInsightProps) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Calculate counts
  const highPriorityCount = insights.filter(
    (i) => i.priority === "critical" || i.priority === "high"
  ).length;
  const topInsight = insights[0];
  const hasHighPriorityInsights = highPriorityCount > 0;

  useEffect(() => {
    // Show the floating button after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Show pulse animation when there are new high-priority insights
    if (hasHighPriorityInsights || hasInsight) {
      const timer = setTimeout(() => {
        Promise.resolve().then(() => setShowPulse(true));
        setTimeout(() => setShowPulse(false), 5000);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [hasHighPriorityInsights, hasInsight]);

  if (!isVisible) return null;

  const priorityColors: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-[99998]"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      {/* Insight Preview Card */}
      {showPreview && topInsight && (
        <div
          className={`absolute bottom-16 right-0 w-72 rounded-xl shadow-xl p-4 mb-2 transition-all duration-200 ${
            theme === "dark" ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"
          }`}
        >
          {/* Priority Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded text-white ${
                priorityColors[topInsight.priority]
              }`}
            >
              {topInsight.priority.toUpperCase()}
            </span>
            <span
              className={`text-xs ${
                theme === "dark" ? "text-slate-400" : "text-gray-500"
              }`}
            >
              ${formatNumber(topInsight.potentialImpact)} impact
            </span>
          </div>

          {/* Title */}
          <h4
            className={`text-sm font-semibold mb-1 ${
              theme === "dark" ? "text-slate-100" : "text-gray-900"
            }`}
          >
            {topInsight.title}
          </h4>

          {/* Description */}
          <p
            className={`text-xs line-clamp-2 mb-3 ${
              theme === "dark" ? "text-slate-400" : "text-gray-600"
            }`}
          >
            {topInsight.description}
          </p>

          {/* CTA */}
          <p className="text-xs text-purple-500 font-medium">
            Click to learn more →
          </p>

          {/* Arrow pointing down */}
          <div
            className={`absolute -bottom-2 right-6 w-4 h-4 rotate-45 ${
              theme === "dark" ? "bg-slate-800 border-r border-b border-slate-700" : "bg-white border-r border-b border-gray-200"
            }`}
          />
        </div>
      )}

      {/* Main FAB Button */}
      <button
        type="button"
        onClick={onClick}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 group ${
          theme === "dark"
            ? "bg-gradient-to-br from-purple-600 to-blue-600"
            : "bg-gradient-to-br from-purple-500 to-blue-500"
        }`}
        aria-label="Open AI Coach"
        style={{
          boxShadow: showPulse
            ? "0 0 0 0 rgba(147, 51, 234, 0.7)"
            : "0 10px 25px rgba(0, 0, 0, 0.2)",
          animation: showPulse
            ? "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
            : "none",
        }}
      >
        <SparklesIcon className="w-7 h-7 text-white" />

        {/* Notification badge */}
        {highPriorityCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {highPriorityCount > 9 ? "9+" : highPriorityCount}
          </span>
        )}
      </button>

      {/* Tooltip (shown when no preview) */}
      {!showPreview && (
        <div
          className={`absolute bottom-full right-0 mb-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
            theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-800 text-white"
          }`}
          style={{ boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)" }}
        >
          {highPriorityCount > 0
            ? `${highPriorityCount} insight${highPriorityCount > 1 ? "s" : ""} available!`
            : "Ask AI Coach"}
          <div
            className={`absolute top-full right-4 w-2 h-2 rotate-45 ${
              theme === "dark" ? "bg-gray-900" : "bg-gray-800"
            }`}
            style={{ marginTop: "-4px" }}
          />
        </div>
      )}
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + "K";
  }
  return num.toLocaleString();
}
