"use client";

import { useState, useEffect } from "react";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { useTheme } from "@/lib/theme";

interface FloatingInsightProps {
  onClick: () => void;
  hasInsight?: boolean;
}

export function FloatingInsight({ onClick, hasInsight = false }: FloatingInsightProps) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    // Show the floating button after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Show pulse animation when there's a new insight
    if (hasInsight) {
      const timer = setTimeout(() => {
        Promise.resolve().then(() => setShowPulse(true));
        setTimeout(() => setShowPulse(false), 5000);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [hasInsight]);

  if (!isVisible) return null;

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-[99998] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 group ${
        theme === "dark"
          ? "bg-gradient-to-br from-purple-600 to-blue-600"
          : "bg-gradient-to-br from-purple-500 to-blue-500"
      }`}
      aria-label="Open AI Coach"
      style={{
        boxShadow: showPulse
          ? "0 0 0 0 rgba(147, 51, 234, 0.7)"
          : "0 10px 25px rgba(0, 0, 0, 0.2)",
        animation: showPulse ? "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none",
      }}
    >
      <SparklesIcon className="w-7 h-7 text-white" />
      
      {/* Notification badge */}
      {hasInsight && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          1
        </span>
      )}

      {/* Tooltip */}
      <div
        className={`absolute bottom-full right-0 mb-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
          theme === "dark"
            ? "bg-gray-900 text-white"
            : "bg-gray-800 text-white"
        }`}
        style={{ boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)" }}
      >
        {hasInsight ? "New insight available!" : "Ask AI Coach"}
        <div
          className={`absolute top-full right-4 w-2 h-2 rotate-45 ${
            theme === "dark" ? "bg-gray-900" : "bg-gray-800"
          }`}
          style={{ marginTop: "-4px" }}
        />
      </div>
    </button>
  );
}
