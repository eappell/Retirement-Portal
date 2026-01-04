"use client";

import { useState, useEffect } from "react";
import { ArrowUpIcon } from "@heroicons/react/24/solid";

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [iframeScrolled, setIframeScrolled] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when scrolled down more than one viewport height
      setIsVisible(window.scrollY > window.innerHeight);
    };

    // Check initial position
    toggleVisibility();

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  // Listen for embedded iframe scroll messages so the portal button can appear
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        if (e?.data?.type === 'IFRAME_SCROLL') {
          console.log('[ScrollToTopButton] received IFRAME_SCROLL, scrolled:', !!e.data.scrolled, 'from', e.origin || 'unknown')
          const userScrolled = !!e.data.userScrolled
          const scrollable = !!e.data.scrolled
          console.log('[ScrollToTopButton] received IFRAME_SCROLL, scrollable:', scrollable, 'userScrolled:', userScrolled, 'from', e.origin || 'unknown')
          // Only consider the iframe as "scrolled" when the user has scrolled inside it
          setIframeScrolled(userScrolled || scrollable)
        }
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const scrollToTop = () => {
    // Smooth-scroll the portal window
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      try { document.documentElement.scrollTop = 0 } catch (e) {}
    }

    // Also smooth-scroll the main content area if present (portal layout)
    try {
      const main = document.querySelector('main') as HTMLElement | null
      if (main) main.scrollTo?.({ top: 0, behavior: 'smooth' } as any)
    } catch (e) {}

    // Tell the embedded iframe to scroll smoothly as well
    try {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement | null
      console.log('[ScrollToTopButton] clicking portal button; iframe found:', !!iframe)
      if (iframe && iframe.contentWindow) {
        console.log('[ScrollToTopButton] posting SCROLL_TO_TOP to iframe contentWindow', iframe.src)
        iframe.contentWindow.postMessage({ type: 'SCROLL_TO_TOP', from: 'portal', smooth: true }, '*')
      } else {
        console.warn('[ScrollToTopButton] No iframe contentWindow available to postMessage')
      }
    } catch (e) {
      console.error('[ScrollToTopButton] Error posting SCROLL_TO_TOP to iframe', e)
    }
  };

  if (!isVisible && !iframeScrolled) return null;
  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-[9999] p-3 text-white rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 print:hidden hover:scale-110"
      aria-label="Scroll to top"
      title="Return to top"
      style={{ backgroundColor: '#4f46e5', boxShadow: '0 6px 18px rgba(79,70,229,0.18)' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  )
}
