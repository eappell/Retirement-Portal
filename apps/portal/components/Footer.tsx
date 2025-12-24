"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/lib/theme";
import logoBlack from "../public/images/RetireWise-Logo-80h-black-tag.png";
import logoWhite from "../public/images/RetireWise-Logo-80h-white-tag.png";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function Footer() {
  const { theme } = useTheme();

  const src = theme === "light" ? logoBlack : logoWhite;

  // Make footer fixed and expose its height so pages (iframes) can avoid being obscured.
  // We set body padding-bottom to the footer's computed height and clean up on unmount.
  useEffect(() => {
    const el = document.getElementById('portal-footer');
    if (!el) return;
    const setPadding = () => {
      const h = el.offsetHeight;
      // set CSS variable and body padding
      document.documentElement.style.setProperty('--portal-footer-height', `${h}px`);
      document.body.style.paddingBottom = `${h}px`;
    };
    setPadding();
    const ro = new ResizeObserver(setPadding);
    ro.observe(el);
    // ensure a small timeout to allow fonts/images to load and affect size
    const t = setTimeout(setPadding, 1000);
    return () => {
      ro.disconnect();
      clearTimeout(t);
      document.documentElement.style.removeProperty('--portal-footer-height');
      // avoid removing unrelated padding if other code modified it: only clear if it matches our value
      if (document.body.style.paddingBottom) document.body.style.paddingBottom = "";
    };
  }, []);

  const bgColor = theme === 'light' ? '#f9f8f7' : '#001021';
  const borderColor = theme === 'light' ? '#e5e7eb' : '#334155';

  const [apps, setApps] = useState<{id:string;name:string;url:string}[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setAppsLoading(true);
        const appsRef = collection(db, "apps");
        const snap = await getDocs(appsRef);
        const items: {id:string;name:string;url:string}[] = [];
        snap.forEach(doc => {
          const data = doc.data() as any;
          const id = data.id || doc.id;
          if (id === 'portal') return;
          if (typeof data.url === 'string' && data.url.includes('/portal')) return;
          items.push({ id, name: data.name || id, url: data.url || '' });
        });
        if (mounted) setApps(items.sort((a,b)=>a.name.localeCompare(b.name)));
      } catch (e) {
        console.warn('Failed to load apps for footer', e);
      } finally {
        if (mounted) setAppsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <footer id="portal-footer" className="fixed left-0 right-0 bottom-0 z-40">
      <div className="py-3 footer-theme" style={{ ['--footer-bg' as any]: bgColor, ['--footer-border' as any]: borderColor }}>
        <div className="max-w-[1400px] mx-auto px-4 flex justify-start items-start gap-6">
          <div className="pl-2">
            <Link href="/dashboard" aria-label="Go to portal dashboard">
              <Image src={src} alt="RetireWise" height={80} priority className="w-auto object-contain" />
            </Link>
          </div>

          {/* Apps list shown in footer (names only), hidden on small screens; scrollable area to cap height */}
          <nav aria-label="Applications" className="hidden md:flex flex-col gap-1 mt-2 max-h-28 overflow-y-auto pr-2 footer-apps">
            {appsLoading && <span className="text-sm text-gray-400">Loading…</span>}
            {!appsLoading && apps.map((a) => (
              <Link
                key={a.id}
                href={`/apps/${encodeURIComponent(a.id)}?name=${encodeURIComponent(a.name)}&url=${encodeURIComponent(a.url)}`}
                className={`text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${theme === 'light' ? 'text-gray-700' : 'text-gray-200'}`}
              >
                {a.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
