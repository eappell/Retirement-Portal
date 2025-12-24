"use client";

import React, {useEffect, useState} from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { AppIcon } from "./icon-map";
import { useTheme } from "@/lib/theme";

interface AppEntry {
  id: string;
  name: string;
  url: string;
  description?: string;
  icon?: any;
}

export default function AppsNav() {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const appsRef = collection(db, "apps");
        const snap = await getDocs(appsRef);
        const items: AppEntry[] = [];
        snap.forEach(doc => {
          const data = doc.data() as any;
          const id = data.id || doc.id;
          // skip portal itself if present
          if (id === 'portal') return;
          // skip entries that appear to point to the portal
          if (typeof data.url === 'string' && data.url.includes('/portal')) return;
          items.push({
            id,
            name: data.name || id,
            url: data.url || '',
            description: data.description || '',
            icon: data.icon || undefined,
          });
        });
        if (mounted) setApps(items.sort((a,b) => a.name.localeCompare(b.name)));
      } catch (e) {
        console.warn('Failed to load apps list', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <nav aria-label="Applications" className="hidden md:block w-56 shrink-0 h-screen relative">
      {/* Fixed full-height background panel that reaches the left edge of the browser */}
      <div className={`hidden md:block fixed left-0 top-0 h-screen w-56 pointer-events-none z-10 ${theme === 'light' ? 'bg-white border-r border-gray-100' : 'bg-slate-900 border-r border-slate-700'}`} />
      <div className={`h-full rounded-md relative z-20 ${theme === 'light' ? 'bg-white' : 'bg-slate-900'} border ${theme === 'light' ? 'border-gray-100' : 'border-slate-700'} p-3 sticky top-20`}> 
        <h3 className={`text-sm font-semibold mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-200'}`}>Applications</h3>
        <div className="flex flex-col gap-1">
          {loading && <div className="text-sm text-gray-400">Loading…</div>}
          {!loading && apps.length === 0 && (
            <div className="text-sm text-gray-400">No apps available</div>
          )}
          {apps.map(app => (
            <Link
              key={app.id}
              href={`/apps/${encodeURIComponent(app.id)}?name=${encodeURIComponent(app.name)}&url=${encodeURIComponent(app.url)}`}
              className={`flex items-center gap-3 px-2 py-2 rounded hover:bg-gray-100 ${theme === 'dark' ? 'hover:bg-slate-800' : ''}`}
            >
              <div className="w-8 h-8 flex items-center justify-center">
                <AppIcon icon={app.icon} className={`h-5 w-5 ${theme === 'light' ? 'text-gray-700' : 'text-gray-200'}`} />
              </div>
              <div className="text-sm truncate text-left">
                <div className={`${theme === 'light' ? 'text-gray-800' : 'text-gray-100'} font-medium`}>{app.name}</div>
                {app.description && <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{app.description}</div>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
