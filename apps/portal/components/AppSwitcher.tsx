"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  CalculatorIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

interface App {
  id: string;
  name: string;
  icon: string;
  url: string;
}

const REGISTERED_APPS: App[] = [
  {
    id: "retirement-planner",
    name: "Retirement Planner",
    icon: "Calculator",
    url: "/apps/retirement-planner",
  },
  {
    id: "healthcare-cost",
    name: "Healthcare Cost Estimator",
    icon: "Heart",
    url: "/apps/healthcare-cost",
  },
];

const ICON_MAP: Record<string, any> = {
  Calculator: CalculatorIcon,
  Heart: HeartIcon,
};

export function AppSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentApp, setCurrentApp] = useState<App | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determine current app from pathname
  useEffect(() => {
    const appMatch = pathname?.match(/\/apps\/([^/?]+)/);
    if (appMatch) {
      const appId = appMatch[1];
      const app = REGISTERED_APPS.find((a) => a.id === appId);
      setCurrentApp(app || null);
    } else {
      setCurrentApp(null);
    }
  }, [pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAppSelect = (app: App) => {
    router.push(app.url);
    setIsOpen(false);
  };

  // Don't show if not on an app page
  if (!currentApp) {
    return null;
  }

  const CurrentIcon = ICON_MAP[currentApp.icon] || CalculatorIcon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      >
        <CurrentIcon className="w-5 h-5 text-gray-700 dark:text-slate-300" />
        <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
          {currentApp.name}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
            Switch App
          </div>
          {REGISTERED_APPS.map((app) => {
            const Icon = ICON_MAP[app.icon] || CalculatorIcon;
            const isActive = app.id === currentApp.id;

            return (
              <button
                key={app.id}
                onClick={() => handleAppSelect(app)}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                  isActive ? "bg-blue-50 dark:bg-slate-700" : ""
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-slate-400"
                  }`}
                />
                <div className="flex-1 text-left">
                  <div
                    className={`text-sm font-medium ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-900 dark:text-slate-100"
                    }`}
                  >
                    {app.name}
                  </div>
                </div>
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
