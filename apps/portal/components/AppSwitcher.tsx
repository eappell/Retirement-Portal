"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  CalculatorIcon,
  HeartIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

interface App {
  id: string;
  name: string;
  icon: string;
  url: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator: CalculatorIcon,
  Heart: HeartIcon,
  Cube: CubeIcon,
};

export function AppSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentApp, setCurrentApp] = useState<App | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load apps from Firestore
  useEffect(() => {
    const loadApps = async () => {
      try {
        const appsRef = collection(db, "apps");
        const snapshot = await getDocs(appsRef);
        const loadedApps: App[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          loadedApps.push({
            id: data.id,
            name: data.name,
            icon: data.icon || "Cube",
            url: `/apps/${data.id}`,
          });
        });

        setApps(loadedApps);
      } catch (error) {
        console.error("Error loading apps:", error);
      } finally {
        setLoading(false);
      }
    };

    loadApps();
  }, []);

  // Determine current app from pathname
  useEffect(() => {
    const appMatch = pathname?.match(/\/apps\/([^/?]+)/);
    if (appMatch && apps.length > 0) {
      const appId = appMatch[1];
      const app = apps.find((a) => a.id === appId);
      setCurrentApp(app || null);
    } else {
      setCurrentApp(null);
    }
  }, [pathname, apps]);

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

  const CurrentIcon = currentApp ? ICON_MAP[currentApp.icon] || CalculatorIcon : CalculatorIcon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      >
        <CurrentIcon className="w-5 h-5 text-gray-700 dark:text-slate-300" />
        <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
          {currentApp ? currentApp.name : "Apps"}
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
          {loading ? (
            <div className="px-4 py-2 text-gray-500 dark:text-gray-400">
              Loading apps...
            </div>
          ) : apps.length === 0 ? (
            <div className="px-4 py-2 text-gray-500 dark:text-gray-400">
              No apps available
            </div>
          ) : (
            apps.map((app) => {
              const Icon = ICON_MAP[app.icon] || CalculatorIcon;
              const isActive = currentApp ? app.id === currentApp.id : false;

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
            })
          )}
        </div>
      )}
    </div>
  );
}
