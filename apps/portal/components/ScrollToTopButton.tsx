"use client";

import { useState, useEffect } from "react";
import { ArrowUpIcon } from "@heroicons/react/24/solid";

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [iframeScrolled, setIframeScrolled] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when scrolled down more than 300px
      setIsVisible(window.scrollY > 300);
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
          setIframeScrolled(!!e.data.scrolled)
        }
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    // Also try to tell any embedded iframe to scroll its own content to top
    try {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement | null
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'SCROLL_TO_TOP' }, '*')
      }
    } catch (e) {
      // ignore
    }
  };

  if (!isVisible && !iframeScrolled) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      aria-label="Scroll to top"
      title="Return to top"
    >
      <ArrowUpIcon className="w-6 h-6" />
    </button>
  );
}
