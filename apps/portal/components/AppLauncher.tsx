"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useTheme } from "@/lib/theme";
import { AppIcon } from "./icon-map";

interface App {
  id: string;
  name: string;
  icon: string;
  description?: string;
  disabled?: boolean;
}

// Grid icon with 9 colorful squares (3x3)
function GridIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      className={className}
    >
      {/* Row 1 */}
      <rect x="3" y="3" width="4.5" height="4.5" rx="1" fill="#EF4444" /> {/* Red */}
      <rect x="9.75" y="3" width="4.5" height="4.5" rx="1" fill="#F59E0B" /> {/* Amber */}
      <rect x="16.5" y="3" width="4.5" height="4.5" rx="1" fill="#10B981" /> {/* Emerald */}
      {/* Row 2 */}
      <rect x="3" y="9.75" width="4.5" height="4.5" rx="1" fill="#3B82F6" /> {/* Blue */}
      <rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1" fill="#8B5CF6" /> {/* Violet */}
      <rect x="16.5" y="9.75" width="4.5" height="4.5" rx="1" fill="#EC4899" /> {/* Pink */}
      {/* Row 3 */}
      <rect x="3" y="16.5" width="4.5" height="4.5" rx="1" fill="#06B6D4" /> {/* Cyan */}
      <rect x="9.75" y="16.5" width="4.5" height="4.5" rx="1" fill="#84CC16" /> {/* Lime */}
      <rect x="16.5" y="16.5" width="4.5" height="4.5" rx="1" fill="#F97316" /> {/* Orange */}
    </svg>
  );
}

export function AppLauncher() {
  const router = useRouter();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load apps from Firestore
  useEffect(() => {
    const loadApps = async () => {
      try {
        const appsRef = collection(db, "apps");
        const snapshot = await getDocs(appsRef);
        const loadedApps: App[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.disabled) {
            loadedApps.push({
              id: data.id,
              name: data.name,
              icon: data.icon || "Cube",
              description: data.description,
              disabled: data.disabled,
            });
          }
        });

        // Sort alphabetically by name
        loadedApps.sort((a, b) => a.name.localeCompare(b.name));
        setApps(loadedApps);
      } catch (error) {
        console.error("Error loading apps:", error);
      } finally {
        setLoading(false);
      }
    };

    loadApps();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // use capture so we catch the event before other handlers stopPropagation
      document.addEventListener("pointerdown", handlePointerDown, true);
    }

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleAppClick = (appId: string) => {
    setIsOpen(false);
    router.push(`/apps/${appId}`);
  };

  const iconColor = theme === "light" ? "text-gray-600 hover:text-gray-900" : "text-gray-400 hover:text-gray-100";
  const menuBg = theme === "light" ? "bg-white" : "bg-slate-800";
  const menuBorder = theme === "light" ? "border-gray-200" : "border-slate-700";
  const itemHover = theme === "light" ? "hover:bg-gray-100" : "hover:bg-slate-700";
  const textPrimary = theme === "light" ? "text-gray-900" : "text-gray-100";
  const textSecondary = theme === "light" ? "text-gray-500" : "text-gray-400";

  return (
    <div ref={menuRef} className="relative">
      {/* Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors ${iconColor} ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-slate-700'} cursor-pointer`}
        title="Open app launcher"
        aria-label="Open app launcher"
        aria-expanded={isOpen}
      >
        <GridIcon className="h-8 w-8" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={`absolute left-0 top-full mt-2 w-80 ${menuBg} rounded-xl shadow-2xl border ${menuBorder} overflow-hidden z-[100]`}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header */}
          <div className={`px-4 py-3 border-b ${menuBorder}`}>
            <h3 className={`font-semibold ${textPrimary}`}>Apps</h3>
          </div>

          {/* App Grid */}
          <div className="p-3 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : apps.length === 0 ? (
              <div className={`text-center py-8 ${textSecondary}`}>
                No apps available
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {apps.map((app, index) => {
                  // First row (index < 3) shows tooltip below, rest show above
                  const isTopRow = index < 3;
                  return (
                    <div key={app.id} className="relative group">
                      <button
                        onClick={() => handleAppClick(app.id)}
                        className={`flex flex-col items-center p-3 rounded-lg ${itemHover} transition-colors cursor-pointer w-full`}
                        role="menuitem"
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${theme === 'light' ? 'bg-indigo-100' : 'bg-indigo-900/30'}`}>
                          <AppIcon icon={app.icon} className={`h-6 w-6 ${theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'}`} />
                        </div>
                        <span className={`text-xs text-center ${textPrimary} line-clamp-2 leading-tight`}>
                          {app.name}
                        </span>
                      </button>
                      {/* Tooltip - below for top row, above for others */}
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-[90px] text-center ${isTopRow ? 'top-full mt-1' : 'bottom-full mb-1'}`}
                        style={
                          theme === 'light'
                            ? { backgroundColor: '#111827', color: '#ffffff' }
                            : { backgroundColor: '#ffffff', color: '#0b1220' }
                        }
                      >
                        {app.name}
                        <div
                          className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent`}
                          style={
                            isTopRow
                              ? (theme === 'light' ? { borderBottomColor: '#111827' } : { borderBottomColor: '#ffffff' })
                              : (theme === 'light' ? { borderTopColor: '#111827' } : { borderTopColor: '#ffffff' })
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`px-4 py-3 border-t ${menuBorder}`}>
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/dashboard");
              }}
              className={`w-full text-center text-sm ${theme === 'light' ? 'text-indigo-600 hover:text-indigo-800' : 'text-indigo-400 hover:text-indigo-300'} font-medium cursor-pointer`}
            >
              View all apps →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
