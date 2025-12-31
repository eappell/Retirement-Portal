"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/lib/auth";
import { useUserTier } from "@/lib/useUserTier";
import { useTheme } from "@/lib/theme";
import { auth } from "@/lib/firebase";
import { ToolbarButton } from "./SecondaryToolbar";

interface IFrameWrapperProps {
  appId: string;
  appName: string;
  appUrl: string;
  description?: string;
}

export function IFrameWrapper({
  appId,
  appName,
  appUrl,
  description,
}: IFrameWrapperProps) {
  const { user } = useAuth();
  const { tier } = useUserTier();
  const { theme } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messageLogRef = useRef<{ last: string | null; count: number; ts: number; suppressed?: boolean }>({ last: null, count: 0, ts: 0 });
  const lastAppliedRefGlobal = useRef<number>(0);
  const updateCountRefGlobal = useRef<number>(0);
  const lastUpdateTsRefGlobal = useRef<number>(0);
  // Rate limit / mute gate for frequent height messages to stop flooding
  const heightRateRef = useRef<{ count: number; ts: number; mutedUntil: number }>({ count: 0, ts: 0, mutedUntil: 0 });
  // Global message flood protector
  const globalMsgRef = useRef<{ count: number; ts: number; mutedUntil: number }>({ count: 0, ts: Date.now(), mutedUntil: 0 });
  // Track message counts by sender/origin to help identify flood sources
  const originCountsRef = useRef<Map<string, number>>(new Map());

  // Track base applied height (without extra padding) and current applied (with padding) so the UI control can reapply instantly
  const baseAppliedRef = useRef<number>(0);
  const currentAppliedRef = useRef<number>(0);
  const extraPaddingRef = useRef<number>(0);

  // Diagnostic toggles: set these on window for debugging
  (window as any).__portal_unmute_resize = (window as any).__portal_unmute_resize || false;
  (window as any).__portal_force_unmute = (window as any).__portal_force_unmute || false;

  // Whitelist valid portal <-> iframe contract message types to avoid processing extension/devtools noise
  const ALLOWED_MESSAGE_TYPES = new Set([
    'IFRAME_HEIGHT', 'CONTENT_HEIGHT', 'IFRAME_HEIGHT_APPLIED', 'REQUEST_CONTENT_HEIGHT',
    'REQUEST_THEME', 'THEME_CHANGE', 'AUTH_TOKEN', 'USER_ROLE_UPDATE', 'USER_PROFILE_UPDATE', 'REQUEST_AUTH', 'REQUEST_ROLE',
    'REQUEST_APP_STATE', 'APP_STATE_UPDATE', 'APP_STATE_RESTORE', 'TOOLBAR_BUTTONS', 'TOOLBAR_BUTTON_ACTION', 'TOOLBAR_BUTTON_STATE', 'NAVIGATE',
    'REQUEST_INSIGHTS', 'REQUEST_INSIGHTS_RESPONSE', 'GET_SCENARIOS', 'GET_SCENARIOS_RESPONSE', 'INSIGHTS_RESPONSE', 'APP_DATA_TRANSFER',
    'REQUEST_HEALTHCARE_DATA', 'HEALTHCARE_DATA_RESPONSE'
  ] as const);

  const router = useRouter();
  const [authToken, setAuthToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [toolbarButtons, setToolbarButtons] = useState<ToolbarButton[]>([]);

  // Per-iframe extra padding (px). Allows manual tuning when an app's footer or sticky controls are clipped.
  const [extraPadding, setExtraPadding] = useState<number>(0);
  const [showPaddingControls, setShowPaddingControls] = useState<boolean>(false);
  const [isForcingFit, setIsForcingFit] = useState<boolean>(false);

  const forceFit = () => {
    try {
      if (!iframeRef.current) return;
      setIsForcingFit(true);
      // Ask the child for the bottom-most element position
      iframeRef.current.contentWindow?.postMessage({ type: 'REQUEST_BOTTOM_ELEMENT' }, '*');
      // safety timeout in case the child doesn't respond
      setTimeout(() => setIsForcingFit(false), 5000);
    } catch (e) {
      setIsForcingFit(false);
    }
  };

  // Reset height tracking refs when appId changes (e.g., switching apps via dropdown)
  useEffect(() => {
    // Reset all height-related refs so the new app can report its own height
    baseAppliedRef.current = 0;
    currentAppliedRef.current = 0;
    lastAppliedRefGlobal.current = 0;
    updateCountRefGlobal.current = 0;
    lastUpdateTsRefGlobal.current = 0;
    heightRateRef.current = { count: 0, ts: 0, mutedUntil: 0 };
    globalMsgRef.current = { count: 0, ts: Date.now(), mutedUntil: 0 };
    originCountsRef.current.clear();
    
    // Reset iframe height style to allow new app to set its own height
    if (iframeRef.current) {
      iframeRef.current.style.removeProperty('height');
      iframeRef.current.style.removeProperty('min-height');
    }
    
    console.log('[IFrameWrapper] Reset height tracking for new app:', appId);
  }, [appId]);

  // Request height from iframe on mount and after delays (handles direct URL and dropdown navigation)
  useEffect(() => {
    const requestHeight = () => {
      if (iframeRef.current?.contentWindow) {
        console.log('[IFrameWrapper] Requesting content height from iframe');
        iframeRef.current.contentWindow.postMessage({ type: 'REQUEST_CONTENT_HEIGHT' }, '*');
      }
    };

    // Request at various intervals to catch the app when it's ready
    const t1 = setTimeout(requestHeight, 500);
    const t2 = setTimeout(requestHeight, 1000);
    const t3 = setTimeout(requestHeight, 2000);
    const t4 = setTimeout(requestHeight, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [appId]);

  // Load persisted value for this app
  useEffect(() => {
    try {
      const key = `iframeExtraPadding:${appId}`;
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const n = Number(raw);
        if (!isNaN(n)) {
          setExtraPadding(n);
          extraPaddingRef.current = n;
        }
      }
    } catch (e) {}
  }, [appId]);

  // Persist when changed and update ref
  useEffect(() => {
    try {
      const key = `iframeExtraPadding:${appId}`;
      localStorage.setItem(key, String(extraPadding));
      extraPaddingRef.current = extraPadding;
    } catch (e) {}
  }, [appId, extraPadding]);

  // When extraPadding changes, immediately reapply height if we've previously applied one
  useEffect(() => {
    try {
      const base = baseAppliedRef.current;
      if (!base || !iframeRef.current) return;
      const newFinal = Math.max(0, Math.ceil(base + (Number(extraPaddingRef.current) || 0)));
      iframeRef.current.style.setProperty('height', `${newFinal}px`, 'important');
      iframeRef.current.style.minHeight = `${newFinal}px`;
      currentAppliedRef.current = newFinal;
      // Inform child about the applied height so it can decide whether to request more
      iframeRef.current.contentWindow?.postMessage({ type: 'IFRAME_HEIGHT_APPLIED', height: newFinal }, '*');
      console.log('[IFrameWrapper] Reapplied height due to extraPadding change:', newFinal, 'extraPadding:', extraPaddingRef.current);
    } catch (e) {}
  }, [extraPadding]);

  useEffect(() => {
    const getAuthToken = async () => {
      try {
        if (user && auth.currentUser) {
          const token = await auth.currentUser.getIdToken(true);
          setAuthToken(token);
          setLoading(false);

          // Send token and theme to iframe when it's ready
          if (iframeRef.current) {
            iframeRef.current.onload = () => {
              iframeRef.current?.contentWindow?.postMessage(
                {
                  type: "AUTH_TOKEN",
                  token,
                  userId: user.uid,
                  email: user.email,
                  name: user.displayName || null,
                  tier: tier || user.tier || "free",
                  dob: user.dob || null,
                  retirementAge: user.retirementAge || null,
                  currentAnnualIncome: user.currentAnnualIncome || null,
                  filingStatus: user.filingStatus || null,
                  spouseDob: user.spouseDob || null,
                  spouseName: user.spouseName || null,
                  lifeExpectancy: user.lifeExpectancy || null,
                  currentState: user.currentState || null,
                  retirementState: user.retirementState || null,
                },
                "*"
              );
              // Also send the current theme
              iframeRef.current?.contentWindow?.postMessage(
                {
                  type: "THEME_CHANGE",
                  theme: theme,
                },
                "*"
              );
              // Request content height from the iframe after it loads
              setTimeout(() => {
                iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_CONTENT_HEIGHT' }, '*');
              }, 500);
              // Request again after a longer delay for slower-loading apps
              setTimeout(() => {
                iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_CONTENT_HEIGHT' }, '*');
              }, 1500);
            };
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get auth token");
        setLoading(false);
      }
    };

    getAuthToken();
  }, [user]);

  // Send role updates to iframe when our resolved tier changes
  useEffect(() => {
    if (iframeRef.current && !loading) {
      const role = tier || user?.tier || "free";
      iframeRef.current.contentWindow?.postMessage(
        {
          type: "USER_ROLE_UPDATE",
          role,
          name: user?.displayName || null,
          dob: user?.dob || null,
          retirementAge: user?.retirementAge || null,
          currentAnnualIncome: user?.currentAnnualIncome || null,
          filingStatus: user?.filingStatus || null,
          spouseDob: user?.spouseDob || null,
          spouseName: user?.spouseName || null,
          lifeExpectancy: user?.lifeExpectancy || null,
          currentState: user?.currentState || null,
          retirementState: user?.retirementState || null,
        },
        "*"
      );
    }
  }, [tier, user, loading]);

  // Send explicit profile updates to iframe when any profile field changes
  useEffect(() => {
    if (iframeRef.current && !loading) {
      const dob = user?.dob || null;
      const retirementAge = user?.retirementAge || null;
      const currentAnnualIncome = user?.currentAnnualIncome || null;
      const filingStatus = user?.filingStatus || null;
      const spouseDob = user?.spouseDob || null;
      const spouseName = user?.spouseName || null;
      const lifeExpectancy = user?.lifeExpectancy || null;
      const currentState = user?.currentState || null;
      const retirementState = user?.retirementState || null;
      iframeRef.current.contentWindow?.postMessage(
        {
          type: 'USER_PROFILE_UPDATE',
          dob,
          retirementAge,
          currentAnnualIncome,
          filingStatus,
          spouseDob,
          spouseName,
          lifeExpectancy,
          currentState,
          retirementState,
        },
        '*'
      );
    }
  }, [user?.dob, user?.retirementAge, user?.currentAnnualIncome, user?.filingStatus, user?.spouseDob, user?.spouseName, user?.lifeExpectancy, user?.currentState, user?.retirementState, loading]);

  // Listen for storage events (other windows) and forward role changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      // Forward known app keys to the iframe so embedded apps can restore state
      const forwardKeys = ["userRole", "selectedCountries", "monthlyBudget", "yearsAbroad", "priorityWeights"];
      if (forwardKeys.includes(e.key || '')) {
        const payloadKey = e.key === 'userRole' ? 'role' : e.key;
        const value = e.newValue;
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            {
              type: 'APP_STATE_UPDATE',
              payload: {
                [payloadKey as string]: value,
              },
            },
            '*'
          );
        }
      }
      if (e.key === "portalUser") {
        try {
          const parsed = JSON.parse(e.newValue || 'null');
          if (iframeRef.current) {
            iframeRef.current.contentWindow?.postMessage(
              {
                type: 'USER_PROFILE_UPDATE',                name: parsed?.name || parsed?.displayName || null,                dob: parsed?.dob || null,
                retirementAge: parsed?.retirementAge || null,
                currentAnnualIncome: parsed?.currentAnnualIncome || null,
                filingStatus: parsed?.filingStatus || null,
                spouseDob: parsed?.spouseDob || null,
                spouseName: parsed?.spouseName || null,
                lifeExpectancy: parsed?.lifeExpectancy || null,
                currentState: parsed?.currentState || null,
                retirementState: parsed?.retirementState || null,
              },
              '*'
            );
          }
        } catch (err) {
          // ignore parse errors
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Send theme changes to iframe
  useEffect(() => {
    if (iframeRef.current && !loading) {
      console.log('[IFrameWrapper] Sending THEME_CHANGE:', theme);
      iframeRef.current.contentWindow?.postMessage(
        {
          type: "THEME_CHANGE",
          theme: theme,
        },
        "*"
      );
    }
  }, [theme, loading]);

  // Listen for IFRAME_HEIGHT messages from iframe and resize the iframe element accordingly
  useEffect(() => {
    const STABILIZE_MAX_ATTEMPTS = 4;
    const STABILIZE_BASE_DELAY = 200; // ms
    const MIN_DELTA = 16; // px tolerance

    const stabilizer = {
      active: false,
      attempts: 0,
      applied: 0,
      timerId: null as any,
      stopped: false,
      lastMeasured: 0,
    };

    const scheduleRequestContent = (delay = STABILIZE_BASE_DELAY) => {
      if (stabilizer.timerId) clearTimeout(stabilizer.timerId);
      stabilizer.timerId = setTimeout(() => {
        try {
          iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_CONTENT_HEIGHT' }, '*');
        } catch (e) {}
      }, delay);
    };

    // Helper: relax ancestors that are clipping the iframe if their rect height is smaller than the target height.
    const relaxAncestorsIfClipping = (targetHeight: number) => {
      try {
        let el: HTMLElement | null = iframeRef.current as HTMLElement | null;
        const changedAncestors: Array<{ tag: string; oldOverflow?: string; oldMinHeight?: string; rectHeight?: number }> = [];
        while (el && el.parentElement) {
          const parent = el.parentElement as HTMLElement | null;
          if (!parent) break;
          try {
            const cs = getComputedStyle(parent);
            const rect = parent.getBoundingClientRect();
            const rectH = Math.round(rect.height || 0);
            if ((cs.overflow === 'hidden' || cs.overflow === 'clip') && rectH < targetHeight) {
              changedAncestors.push({ tag: parent.tagName, oldOverflow: cs.overflow, oldMinHeight: parent.style.minHeight, rectHeight: rectH });
              parent.style.setProperty('overflow', 'visible', 'important');
              parent.style.setProperty('min-height', `${targetHeight}px`, 'important');
              console.debug('[IFrameWrapper] Relaxed ancestor overflow for iframe visibility:', parent.tagName, 'wasOverflow:', cs.overflow, 'wasHeight:', rectH);
            }
          } catch (e) {}
          el = parent;
        }
        if (changedAncestors.length) console.log('[IFrameWrapper] Updated ancestors to prevent clipping:', changedAncestors);
        return changedAncestors.length > 0;
      } catch (e) { return false; }
    };

    const clearStabilizer = () => {
      stabilizer.active = false;
      stabilizer.attempts = 0;
      stabilizer.applied = 0;
      if (stabilizer.timerId) {
        clearTimeout(stabilizer.timerId);
        stabilizer.timerId = null;
      }
    };

    const handleIframeHeightMessage = (event: MessageEvent) => {
      try {
        // Global flood protection
        const now = Date.now();
        if (!(window as any).__portal_force_unmute) {
          if (now - globalMsgRef.current.ts > 10000) {
            globalMsgRef.current.count = 1;
            globalMsgRef.current.ts = now;
          } else {
            globalMsgRef.current.count = (globalMsgRef.current.count || 0) + 1;
            // track counts by origin/source for diagnostics
            try {
              const origin = event.origin || event.data?.source || 'unknown';
              originCountsRef.current.set(origin, (originCountsRef.current.get(origin) || 0) + 1);
            } catch (e) {}
            if (globalMsgRef.current.count > 400) {
              globalMsgRef.current.mutedUntil = now + 20000;
              console.warn('[IFrameWrapper] Global message flood detected — muting non-critical message processing for 20s');
              try {
                // Pause resize handling immediately and ask iframe to pause too
                (window as any).__portal_pause_resizing = true;
                iframeRef.current?.contentWindow?.postMessage({ type: 'STABILIZE_STOP', duration: 20000 }, '*');
                // log top offenders
                const arr = Array.from(originCountsRef.current.entries()).sort((a,b) => b[1]-a[1]).slice(0,5);
                console.warn('[IFrameWrapper] Top message senders:', arr);
                console.warn('[IFrameWrapper] Paused resize handling. To resume manually run: window.__portal_pause_resizing = false');
              } catch (e) {}
            }
          }
          if (globalMsgRef.current.mutedUntil && now < globalMsgRef.current.mutedUntil) {
            // while globally muted, ignore height/content messages only
            const msgType = event.data?.type;
            if (msgType === 'IFRAME_HEIGHT' || msgType === 'CONTENT_HEIGHT') return;
          }
        }

        // Throttle / mute gate for height messages specifically
        const msgType = event.data?.type;
        if (msgType === 'IFRAME_HEIGHT' || msgType === 'CONTENT_HEIGHT') {
          if (!(window as any).__portal_unmute_resize) {
            if (heightRateRef.current.mutedUntil && now < heightRateRef.current.mutedUntil) {
              // currently muted
              return;
            }
            if (now - heightRateRef.current.ts > 5000) {
              heightRateRef.current.count = 1;
              heightRateRef.current.ts = now;
            } else {
              heightRateRef.current.count = (heightRateRef.current.count || 0) + 1;
              // if more than 30 messages in 5s, mute for 10s
              if (heightRateRef.current.count > 30) {
                heightRateRef.current.mutedUntil = now + 10000;
                console.warn('[IFrameWrapper] Muting frequent height messages for 10s');
                // Ask the iframe to pause sending height updates for a short interval as well
                try { iframeRef.current?.contentWindow?.postMessage({ type: 'STABILIZE_STOP', duration: 10000 }, '*'); } catch (e) {}
                return;
              }
            }
          }
        }

        if (event.data?.type === 'IFRAME_HEIGHT') {
          const h = Number(event.data.height || 0);
          if (!isFinite(h) || h <= 0) return;
          const min = 300;
          const max = 10000;
          const clamped = Math.max(min, Math.min(max, Math.round(h)));

          // If stabilizer has been stopped (giving up), ignore further requests
          if (stabilizer.stopped) return;

          // If currently stabilizing and the incoming request isn't larger than what we've already applied, ignore it
          if (stabilizer.active && clamped + 24 <= stabilizer.applied) {
            return;
          }

          // If the incoming measurement is very close to the already applied height,
          // it's likely the iframe echoed back the portal-applied height — ignore to avoid incremental growth
          // Slightly larger buffer to ensure footers and small sticky elements are not clipped
          const buffer = 36;
          if (stabilizer.active && Math.abs(clamped - stabilizer.applied) <= buffer) {
            console.debug('[IFrameWrapper] Ignoring echoed height close to applied:', clamped, 'applied:', stabilizer.applied);
            return;
          }

          const applied = clamped + buffer;
          // store base/applied refs so padding control can reapply later
          baseAppliedRef.current = applied;
          const finalApplied = applied + (Number(extraPaddingRef.current) || 0);

          // Diagnostics once per apply
          try {
            const diagnostics: any[] = [];
            let el: HTMLElement | null = iframeRef.current as HTMLElement | null;
            while (el) {
              const cs = getComputedStyle(el);
              diagnostics.push({ tag: el.tagName, id: el.id || null, class: el.className || null, computedHeight: cs.height, overflow: cs.overflow, maxHeight: cs.maxHeight, display: cs.display });
              el = el.parentElement;
            }
            console.log('[IFrameWrapper] Ancestor diagnostics:', diagnostics);
          } catch (e) {}

          // Apply with priority
          try {
            iframeRef.current!.style.setProperty('height', `${finalApplied}px`, 'important');
            iframeRef.current!.style.minHeight = `${finalApplied}px`;
            iframeRef.current!.style.overflow = 'hidden';
            iframeRef.current!.style.display = 'block';
            iframeRef.current!.classList.remove('flex-1');
            iframeRef.current!.classList.add('flex-none');
            try { iframeRef.current!.setAttribute('scrolling', 'no'); } catch (e) {}

            // Defensive: ensure no ancestor is clipping the iframe; use helper to relax if needed
            try {
              relaxAncestorsIfClipping(finalApplied);
            } catch (e) {}

          } catch (e) {}

          stabilizer.active = true;
          stabilizer.attempts = 0;
          stabilizer.applied = finalApplied;
          currentAppliedRef.current = finalApplied;
          baseAppliedRef.current = applied;

          // Inform iframe of the final applied height
          iframeRef.current?.contentWindow?.postMessage({ type: 'IFRAME_HEIGHT_APPLIED', height: finalApplied }, '*');
          scheduleRequestContent(STABILIZE_BASE_DELAY);

          console.log('[IFrameWrapper] Applied height to iframe (important):', finalApplied, 'buffer:', buffer, 'extraPadding:', extraPaddingRef.current);
        }

        if (event.data?.type === 'CONTENT_HEIGHT') {
          const measured = Number(event.data.height || 0);
          if (!isFinite(measured) || measured <= 0) return;
          const DEFAULT_BUFFER = 36;
          let buffer = DEFAULT_BUFFER;
          if (typeof event.data?.suggestedBuffer === 'number' || !isNaN(Number(event.data?.suggestedBuffer))) {
            const sb = Number(event.data.suggestedBuffer || 0);
            // Offer suggestion to the user by pre-filling padding if it's larger than current
            if ((Number(extraPaddingRef.current) || 0) < sb) {
              setExtraPadding(sb);
              console.debug('[IFrameWrapper] Prefilled extraPadding from child suggestedBuffer:', sb);
            }

            // Use either default buffer or suggested + safety margin, whichever is larger
            buffer = Math.max(DEFAULT_BUFFER, Math.ceil(sb + 12));
            console.debug('[IFrameWrapper] Using suggestedBuffer from child:', sb, 'buffer used:', buffer);
          }
          const desired = Math.round(measured + buffer);

          // Determine the currently applied height (could have been applied earlier or via other UI action)
          const currentApplied = currentAppliedRef.current || (iframeRef.current ? Math.round(parseFloat(getComputedStyle(iframeRef.current).height) || 0) : 0);

          // If not currently stabilizing, allow CONTENT_HEIGHT to increase the iframe if needed
          if (!stabilizer.active) {
            if (desired > currentApplied + MIN_DELTA) {
              try {
                const finalDesired = desired + (Number(extraPaddingRef.current) || 0);
                baseAppliedRef.current = desired;
                currentAppliedRef.current = finalDesired;
                iframeRef.current!.style.setProperty('height', `${finalDesired}px`, 'important');
                iframeRef.current!.style.minHeight = `${finalDesired}px`;
                iframeRef.current!.contentWindow?.postMessage({ type: 'IFRAME_HEIGHT_APPLIED', height: finalDesired }, '*');
                stabilizer.active = true;
                stabilizer.attempts = 0;
                stabilizer.applied = finalDesired;
                scheduleRequestContent(STABILIZE_BASE_DELAY);
                console.log('[IFrameWrapper] Applied CONTENT_HEIGHT (unsolicited) -> final:', finalDesired, 'buffer:', buffer, 'extraPadding:', extraPaddingRef.current);
              } catch (e) {}
            } else {
              console.debug('[IFrameWrapper] CONTENT_HEIGHT received but not larger than current applied; ignoring', desired, currentApplied);
            }
            return;
          }

          // Track last measured
          stabilizer.lastMeasured = measured;

          // If content has grown meaningfully beyond current applied height, try once more
          if (desired > stabilizer.applied + MIN_DELTA && stabilizer.attempts < STABILIZE_MAX_ATTEMPTS) {
            // Oscillation detection: if we've already tried and the child's measured height hasn't changed,
            // request bottom-element diagnostics and attempt ancestor relaxation instead of blindly increasing.
            if (stabilizer.attempts > 0 && Math.abs(measured - stabilizer.lastMeasured) <= 1) {
              console.warn('[IFrameWrapper] Measurement stagnant despite increases — requesting bottom-element diagnostics and trying to relax clipping ancestors');
              try { iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_BOTTOM_ELEMENT' }, '*'); } catch (e) {}
              const finalDesired = desired + (Number(extraPaddingRef.current) || 0);
              const relaxed = relaxAncestorsIfClipping(finalDesired);
              if (relaxed) {
                try {
                  baseAppliedRef.current = desired;
                  currentAppliedRef.current = finalDesired;
                  iframeRef.current!.style.setProperty('height', `${finalDesired}px`, 'important');
                  iframeRef.current!.style.minHeight = `${finalDesired}px`;
                  iframeRef.current!.contentWindow?.postMessage({ type: 'IFRAME_HEIGHT_APPLIED', height: finalDesired }, '*');
                  stabilizer.applied = finalDesired;
                  stabilizer.attempts++;
                  const delay = STABILIZE_BASE_DELAY * Math.pow(2, stabilizer.attempts);
                  scheduleRequestContent(delay);
                  console.log('[IFrameWrapper] Applied after relaxing ancestors -> final:', finalDesired, 'attempt:', stabilizer.attempts, 'extraPadding:', extraPaddingRef.current);
                } catch (e) {
                  clearStabilizer();
                }
                return;
              } else {
                // Nothing to relax; stop stabilizer to avoid runaway growth and request manual inspection
                try { iframeRef.current?.contentWindow?.postMessage({ type: 'STABILIZE_STOP', duration: 15000 }, '*'); } catch (e) {}
                stabilizer.stopped = true;
                clearStabilizer();
                console.warn('[IFrameWrapper] Measurement stagnant and no clipping ancestors found — stopping stabilizer and requesting manual inspection');
                return;
              }
            }
            stabilizer.attempts++;
            // increase and re-request after exponential backoff
            try {
              // include any extra padding when applying the desired height
              const finalDesired = desired + (Number(extraPaddingRef.current) || 0);
              baseAppliedRef.current = desired;
              currentAppliedRef.current = finalDesired;

              iframeRef.current!.style.setProperty('height', `${finalDesired}px`, 'important');
              iframeRef.current!.style.minHeight = `${finalDesired}px`;
              iframeRef.current!.contentWindow?.postMessage({ type: 'IFRAME_HEIGHT_APPLIED', height: finalDesired }, '*');
              stabilizer.applied = finalDesired;
              const delay = STABILIZE_BASE_DELAY * Math.pow(2, stabilizer.attempts);
              scheduleRequestContent(delay);
              console.log('[IFrameWrapper] Increased iframe to measured desired height:', desired, 'final:', finalDesired, 'attempt:', stabilizer.attempts, 'extraPadding:', extraPaddingRef.current);
            } catch (e) {
              clearStabilizer();
            }
          } else if (desired > stabilizer.applied + MIN_DELTA && stabilizer.attempts >= STABILIZE_MAX_ATTEMPTS) {
            // Exceeded attempts and content still grows — cap to a safe maximum and stop
            const FINAL_MAX = 8000;
            const final = Math.min(desired, FINAL_MAX);
            try {
              iframeRef.current!.style.setProperty('height', `${final}px`, 'important');
              iframeRef.current!.style.minHeight = `${final}px`;
              iframeRef.current!.contentWindow?.postMessage({ type: 'IFRAME_HEIGHT_APPLIED', height: final }, '*');
              console.warn('[IFrameWrapper] Stabilizer gave up after repeated increases; capping to', final);
              // Ask the child to pause sending for a short interval to avoid continuous growth
              try { iframeRef.current?.contentWindow?.postMessage({ type: 'STABILIZE_STOP', duration: 15000 }, '*'); } catch (e) {}
            } catch (e) {}
            stabilizer.stopped = true;
            clearStabilizer();
          } else {
            // measurement within tolerance or we've exhausted attempts
            console.log('[IFrameWrapper] Stabilized; final height:', stabilizer.applied, 'measured:', measured);
            clearStabilizer();
          }
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('message', handleIframeHeightMessage);
    return () => {
      window.removeEventListener('message', handleIframeHeightMessage);
      clearStabilizer();
    };
  }, []);

  // Listen for toolbar button messages and app-to-app messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const d = event?.data;
      // Quietly ignore empty / non-object / devtools messages
      if (!d) return;
      if (typeof d === 'string') {
        if (d.includes('react-devtools') || d.includes('__REACT_DEVTOOLS_GLOBAL_HOOK__')) return;
      }
      if (typeof d === 'object') {
        // nested devtools payloads
        if (typeof (d as any).source === 'string' && (d as any).source.startsWith('react-devtools')) return;
        if (typeof (d as any).payload === 'object' && typeof (d as any).payload?.source === 'string' && (d as any).payload.source.startsWith('react-devtools')) return;
      }
      // Only handle messages that conform to our contract (must have a 'type')
      if (!d.type) return;
      // Only accept known, whitelisted message types to avoid noisy extension/devtools messages
      if (typeof d.type === 'string' && !ALLOWED_MESSAGE_TYPES.has(d.type)) return;

      // Simple spam suppression so the console doesn't get flooded by repeated messages
      try {
        const sig = `${d.type}::${d.source || d.payload?.source || ''}::${String(d.action || '')}`;
        const now = Date.now();
        const ref = messageLogRef.current;
        if (ref.last === sig) {
          ref.count = (ref.count || 0) + 1;
          if (now - ref.ts > 10000) {
            // reset window
            ref.count = 1;
            ref.ts = now;
            ref.suppressed = false;
          } else {
            // if repeated too often, suppress further logs
            if (ref.count > 25) {
              if (!ref.suppressed) {
                console.warn('[IFrameWrapper] Suppressing repeated messages of type', d.type);
                ref.suppressed = true;
              }
              return;
            }
          }
        } else {
          ref.last = sig;
          ref.count = 1;
          ref.ts = now;
          ref.suppressed = false;
        }
      } catch (e) {
        // ignore suppression errors
      }

      console.log("IFrameWrapper received message:", d);
      // In production, verify the origin
      
      // If iframe requests current theme, reply with the portal theme
      if (d?.type === "REQUEST_THEME") {
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            {
              type: "THEME_CHANGE",
              theme,
            },
            "*"
          );
        }
        return;
      }

      // Allow iframe to explicitly request current auth/token/role after it has attached listeners
      if (event.data?.type === "REQUEST_AUTH") {
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            {
              type: "AUTH_TOKEN",
              token: authToken,
              userId: user?.uid,
              email: user?.email,
              tier: tier || user?.tier || "free",
            },
            "*"
          );
        }
        return;
      }

      // Allow iframe to explicitly request the current role only
      if (event.data?.type === "REQUEST_ROLE") {
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            {
              type: "USER_ROLE_UPDATE",
              role: tier || user?.tier || "free",
            },
            "*"
          );
        }
        return;
      }
      // Request the current profile only
      if (event.data?.type === "REQUEST_PROFILE") {
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            {
              type: "USER_PROFILE_UPDATE",
              dob: user?.dob || null,
              retirementAge: user?.retirementAge || null,
              currentAnnualIncome: user?.currentAnnualIncome || null,
            },
            "*"
          );
        }
        return;
      }

      // Allow iframe to request saved app state (selected countries, retirement data)
      if (event.data?.type === 'REQUEST_APP_STATE') {
        try {
          const stored = {
            selectedCountries: localStorage.getItem('selectedCountries') ? JSON.parse(localStorage.getItem('selectedCountries') as string) : undefined,
            monthlyBudget: localStorage.getItem('monthlyBudget') || undefined,
            yearsAbroad: localStorage.getItem('yearsAbroad') || undefined,
            priorityWeights: localStorage.getItem('priorityWeights') ? JSON.parse(localStorage.getItem('priorityWeights') as string) : undefined,
          };
          if (iframeRef.current) {
            iframeRef.current.contentWindow?.postMessage({ type: 'APP_STATE_RESTORE', payload: stored }, '*');
          }
        } catch (e) {
          console.warn('[IFrameWrapper] Failed to respond to REQUEST_APP_STATE', e);
        }
        return;
      }

      // Child reports measured content height when explicitly requested
      if (event.data?.type === 'CONTENT_HEIGHT') {
        try {
          const measured = Number(event.data.height || 0);
          if (!isFinite(measured) || measured <= 0) return;
          const buffer = 24;
          const desired = Math.round(measured + buffer);

          if (iframeRef.current) {
            const current = Number((iframeRef.current.style.height || '').replace('px','')) || 0;
            const MIN_DELTA = 16; // require meaningful delta to avoid ping-pong
            const now = Date.now();

            if (desired > current + MIN_DELTA) {
              if (now - lastUpdateTsRefGlobal.current < 500) {
                updateCountRefGlobal.current = (updateCountRefGlobal.current || 0) + 1;
              } else {
                updateCountRefGlobal.current = 1;
              }
              lastUpdateTsRefGlobal.current = now;
              if (updateCountRefGlobal.current > 6) {
                console.warn('[IFrameWrapper] Stopping auto-resize after repeated attempts');
                return;
              }

              iframeRef.current.style.setProperty('height', `${desired}px`, 'important');
              iframeRef.current.style.minHeight = `${desired}px`;
              iframeRef.current.contentWindow?.postMessage({ type: 'IFRAME_HEIGHT_APPLIED', height: desired }, '*');
              lastAppliedRefGlobal.current = desired;
              console.log('[IFrameWrapper] Updated iframe to measured height:', desired, 'measured:', measured, 'current:', current);
            } else {
              if (Math.abs(desired - current) > 0) {
                console.log('[IFrameWrapper] Measured content height within tolerance; no update:', measured, 'current:', current);
              }
            }
          }
        } catch (e) {
          // ignore
        }
        return;
      }

      // Handle bottom element diagnostics & force-fit replies
      if (event.data?.type === 'BOTTOM_ELEMENT_POSITION') {
        try {
          const bottom = Number(event.data.bottom || 0);
          if (!isFinite(bottom) || bottom <= 0) return;
          const sb = Number(event.data.suggestedBuffer || 0);

          // Log element info and child metrics when provided
          if (event.data.elementInfo) console.log('[IFrameWrapper] Bottom element info:', event.data.elementInfo);
          if (event.data.childMetrics) console.log('[IFrameWrapper] Child metrics:', event.data.childMetrics);

          // Diagnostics: log iframe bounding rect and ancestors' bounding rects
          try {
            const iframeRect = iframeRef.current?.getBoundingClientRect();
            console.log('[IFrameWrapper] Iframe bounding rect:', iframeRect);
            let el: HTMLElement | null = iframeRef.current as HTMLElement | null;
            const ancRects: any[] = [];
            while (el) {
              try {
                const cs = getComputedStyle(el);
                ancRects.push({ tag: el.tagName, rect: el.getBoundingClientRect(), computedHeight: cs.height, overflow: cs.overflow });
              } catch (e) {}
              el = el.parentElement;
            }
            console.log('[IFrameWrapper] Ancestor bounding rects:', ancRects);
          } catch (e) {}

          // If user requested force-fit we have state flag set; otherwise just log
          if (isForcingFit) {
            const DEFAULT_BUFFER = 36;
            const buffer = Math.max(DEFAULT_BUFFER, Math.ceil(sb + 12));
            const final = Math.ceil(bottom + buffer + (Number(extraPaddingRef.current) || 0));
            try {
              baseAppliedRef.current = bottom;
              currentAppliedRef.current = final;
              iframeRef.current!.style.setProperty('height', `${final}px`, 'important');
              iframeRef.current!.style.minHeight = `${final}px`;
              iframeRef.current!.contentWindow?.postMessage({ type: 'IFRAME_HEIGHT_APPLIED', height: final }, '*');
              // Schedule a sanity re-check of content height after the forced fit
              setTimeout(() => {
                try { iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_CONTENT_HEIGHT' }, '*'); } catch (e) {}
              }, 200);
              console.log('[IFrameWrapper] Forced fit applied -> bottom:', bottom, 'final:', final, 'buffer:', buffer, 'extraPadding:', extraPaddingRef.current);
            } catch (e) {}
            setIsForcingFit(false);
          }
        } catch (e) {}
      }

      if (event.data?.type === 'HIGHLIGHT_DONE') {
        try {
          if (event.data.elementInfo) console.log('[IFrameWrapper] Child highlighted element:', event.data.elementInfo);
          if (event.data.childMetrics) console.log('[IFrameWrapper] Child metrics (highlight):', event.data.childMetrics);
          console.log('[IFrameWrapper] Highlight completed on child element:', event.data.elementInfo);
        } catch (e) {}
      }

      // Persist app state updates coming from embedded apps
      if (event.data?.type === 'APP_STATE_UPDATE') {
        try {
          const payload = event.data.payload || {};
          if (payload.selectedCountries) {
            try { localStorage.setItem('selectedCountries', JSON.stringify(payload.selectedCountries)); } catch (e) {}
          }
          if (payload.monthlyBudget) {
            try { localStorage.setItem('monthlyBudget', payload.monthlyBudget); } catch (e) {}
          }
          if (payload.yearsAbroad) {
            try { localStorage.setItem('yearsAbroad', payload.yearsAbroad); } catch (e) {}
          }
          if (payload.priorityWeights) {
            try { localStorage.setItem('priorityWeights', JSON.stringify(payload.priorityWeights)); } catch (e) {}
          }
        } catch (e) {
          console.warn('[IFrameWrapper] Failed to persist APP_STATE_UPDATE', e);
        }
        return;
      }

      // Removed SAVE_HEALTHCARE_DATA and REQUEST_HEALTHCARE_DATA handlers to disable automatic
      // cross-app healthcare data transfers. This feature caused user scenarios to be overwritten.
      
      // Handle cross-app data transfer requests - be conservative when routing potentially sensitive data
      if (event.data?.type === "APP_DATA_TRANSFER") {
        console.log("[Portal] Routing data transfer:", {
          from: event.data.sourceApp,
          to: event.data.targetApp,
          dataType: event.data.dataType,
        });

        // Sanity check: prevent accidental forwarding of full scenarios state or other large payloads
        const data = event.data || {};
        const payload = data.data || {};
        const suspiciousKeys = ['scenarios', 'scenariosState', 'activeScenarioId'];
        for (const k of suspiciousKeys) {
          if (Object.prototype.hasOwnProperty.call(payload, k)) {
            console.warn(`[Portal] Ignoring APP_DATA_TRANSFER with suspicious payload key: ${k}`);
            return; // Drop message to avoid overwriting app state
          }
        }

        // Only whitelist healthcare cost transfers for now; other app data types should be filtered and approved
        if (data.dataType && data.dataType !== 'HEALTHCARE_COSTS') {
          console.log('[Portal] APP_DATA_TRANSFER ignored - unsupported dataType', data.dataType);
          return;
        }

        // Forward the message to the current iframe
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(event.data, "*");
        }
        return;
      }
      
      // Handle GET_SCENARIOS request - forward to retirement planner iframe
      if (event.data?.type === "GET_SCENARIOS") {
        console.log("[Portal] Forwarding GET_SCENARIOS request");
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(event.data, "*");
        }
        return;
      }

      // Handle AI insights request from embedded app: proxy via portal server
      if (event.data?.type === 'REQUEST_INSIGHTS') {
        const { requestId, plan, result } = event.data;
        (async () => {
            try {
            // Call portal server proxy which enforces role and uses bypass token
            const resp = await fetch('/api/insights-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ plan, result }),
            });
            const json = await resp.json();
            // If upstream returned a clearly identified fallback, try to use portal's own AI endpoint as a fallback
            if (json && (json._upstreamFallbackReason || json.error)) {
              try {
                const fallbackResp = await fetch('/api/insights', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ plan, result }),
                });
                const fallbackJson = await fallbackResp.json().catch(() => null);
                // prefer fallbackJson.text if present, otherwise keep original json
                if (fallbackJson && (fallbackJson.text || !json.text)) {
                  json.text = fallbackJson.text || json.text;
                  json._aiProvider = fallbackJson._aiProvider || fallbackJson.aiProvider || json._aiProvider;
                }
              } catch (e) {
                console.warn('[Portal] fallback to /api/insights failed', e);
              }
            }
            // Forward response back to iframe
            if (iframeRef.current) {
              iframeRef.current.contentWindow?.postMessage(
                {
                  type: 'INSIGHTS_RESPONSE',
                  requestId,
                  text: json.text || json || null,
                  upstreamFallbackReason: json._upstreamFallbackReason || null,
                  provider: json._aiProvider || json.provider || null,
                },
                '*'
              );
            }
          } catch (err: any) {
            console.error('Portal insights proxy error', err);
            if (iframeRef.current) {
              iframeRef.current.contentWindow?.postMessage(
                {
                  type: 'INSIGHTS_RESPONSE',
                  requestId,
                  error: String(err),
                },
                '*'
              );
            }
          }
        })();
        return;
      }
      
      // Handle GET_SCENARIOS_RESPONSE - forward back to requesting iframe
      if (event.data?.type === "GET_SCENARIOS_RESPONSE") {
        console.log("[Portal] Forwarding GET_SCENARIOS_RESPONSE to iframe");
        // Forward back to the iframe (which sent the original GET_SCENARIOS request)
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(event.data, "*");
        }
        return;
      }
      
      if (event.data?.type === "TOOLBAR_BUTTONS") {
        console.log("Received TOOLBAR_BUTTONS, count:", event.data.buttons?.length);
        // Allow all buttons including print
        const filteredButtons = event.data.buttons || [];
        setToolbarButtons(filteredButtons);
      } else if (event.data?.type === "TOOLBAR_BUTTON_ACTION") {
        // Forward button actions back to iframe if needed
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            {
              type: "TOOLBAR_BUTTON_CLICKED",
              buttonId: event.data.buttonId,
            },
            "*"
          );
        }
      } else if (event.data?.type === 'TOOLBAR_BUTTON_STATE') {
        // Update a specific toolbar button's icon/state (e.g., show spinner while loading)
        const buttonId = event.data.buttonId;
        const state = event.data.state; // 'loading' | 'idle' | 'error'
        try {
          const btn = document.querySelector(`button[data-button-id="${buttonId}"]`);
          if (btn) {
            const iconContainer = btn.querySelector('div');
            const orig = btn.getAttribute('data-orig-icon-html') || '';
            if (state === 'loading') {
              // spinner SVG
              const spinner = `<svg class="animate-spin h-[26px] w-[26px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>`;
              if (iconContainer) {
                iconContainer.innerHTML = spinner;
                // Ensure spinner color is visible in dark mode (download button uses darker spinner in light mode)
                const svg = iconContainer.querySelector('svg');
                if (svg) {
                  const isDark = document.documentElement.classList.contains('dark');
                  svg.style.color = isDark ? '#FEFCFD' : (buttonId === 'download_pdf' ? '#111827' : '#46494c');
                }
              } else {
                // replace button text
                btn.innerHTML = spinner;
                const svg = btn.querySelector('svg');
                if (svg) {
                  const isDark = document.documentElement.classList.contains('dark');
                  svg.style.color = isDark ? '#FEFCFD' : (buttonId === 'download_pdf' ? '#111827' : '#46494c');
                }
              }
              btn.setAttribute('disabled', 'true');
              btn.setAttribute('aria-busy', 'true');
            } else {
              // restore original icon
              if (iconContainer) {
                iconContainer.innerHTML = orig;
                // Re-apply color and reattach theme observer so restored SVG matches theme
                const svg = iconContainer.querySelector('svg');
                if (svg) {
                  const isDark = document.documentElement.classList.contains('dark');
                  svg.style.color = isDark ? '#FEFCFD' : (buttonId === 'download_pdf' ? '#111827' : '#46494c');
                  const observer = new MutationObserver(() => {
                    const dark = document.documentElement.classList.contains('dark');
                    svg.style.color = dark ? '#FEFCFD' : (buttonId === 'download_pdf' ? '#111827' : '#46494c');
                  });
                  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
                }
              } else if (orig) {
                btn.innerHTML = orig;
                const svg = btn.querySelector('svg');
                if (svg) {
                  const isDark = document.documentElement.classList.contains('dark');
                  svg.style.color = isDark ? '#FEFCFD' : (buttonId === 'download_pdf' ? '#111827' : '#46494c');
                  const observer = new MutationObserver(() => {
                    const dark = document.documentElement.classList.contains('dark');
                    svg.style.color = dark ? '#FEFCFD' : (buttonId === 'download_pdf' ? '#111827' : '#46494c');
                  });
                  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
                }
              }
              btn.removeAttribute('disabled');
              btn.removeAttribute('aria-busy');
            }
          }
        } catch (e) { /* ignore */ }
      }
      // Allow iframe to request portal navigation
      if (event.data?.type === 'NAVIGATE' && event.data?.path) {
        try {
          // Use Next router to navigate within the portal
          router.push(event.data.path);
        } catch (e) {
          console.warn('[IFrameWrapper] Failed to navigate to', event.data.path, e);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Render toolbar buttons when config or theme changes
  useEffect(() => {
    const placeholder = document.getElementById("app-toolbar-placeholder");
    if (!placeholder) return;

    placeholder.innerHTML = "";
    toolbarButtons.forEach((button: ToolbarButton) => {
      const buttonEl = document.createElement("div");
      buttonEl.className = "group relative inline-flex";

      const btn = document.createElement("button");
      
      // Explicitly handle colors based on theme state, bypassing CSS dark mode issues
      // Check both context theme and DOM class to be sure
      const isDark = theme === 'dark' || document.documentElement.classList.contains('dark');
      
      // Base classes
      let className = "inline-flex items-center justify-center p-2 rounded-md transition-colors ";
      
      if (isDark) {
        className += "!text-gray-50 hover:!bg-gray-100 hover:!text-gray-900";
      } else {
        // Light mode - force specific colors
        const textColor = button.id === 'download_pdf' ? '!text-gray-900' : '!text-[#4B5563]';
        className += `${textColor} hover:!bg-[#4B5563] hover:!text-white`;
      }
      
      btn.className = className;
      
      btn.setAttribute("aria-label", button.label);
      btn.title = button.id === 'download_pdf' ? 'Download PDF' : (button.tooltip || button.label);
      btn.setAttribute('data-button-id', button.id);

      if (button.icon.trim().startsWith("<svg")) {
        const iconContainer = document.createElement("div");
        iconContainer.innerHTML = button.icon;
        iconContainer.className = "h-[26px] w-[26px]";
        btn.setAttribute('data-orig-icon-html', iconContainer.innerHTML || '');
        btn.appendChild(iconContainer);
      } else {
        btn.textContent = button.icon;
        btn.className += " text-[26px]";
        btn.setAttribute('data-orig-icon-html', button.icon);
      }

      btn.addEventListener("click", () => {
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            {
              type: "TOOLBAR_BUTTON_CLICKED",
              buttonId: button.id,
            },
            "*"
          );
        }
      });

      buttonEl.appendChild(btn);

      const tooltipText = button.id === 'download_pdf' ? 'Download PDF' : (button.tooltip || button.label);
      if (tooltipText) {
        const tooltip = document.createElement("span");
        const tooltipBg = isDark ? "bg-slate-700" : "bg-gray-800";
        tooltip.className =
          `absolute top-full mt-2 left-1/2 transform -translate-x-1/2 ${tooltipBg} text-white text-xs rounded py-1 px-2 whitespace-nowrap z-40 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-none pointer-events-none`;
        tooltip.textContent = tooltipText;
        buttonEl.appendChild(tooltip);
      }

      placeholder.appendChild(buttonEl);
    });
  }, [toolbarButtons, theme]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading {appName}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Error loading application</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <iframe
        key={appUrl}
        ref={iframeRef}
        src={appUrl}
        title={appName}
        className="w-full border-0 block"
        style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
        scrolling="no"
        onLoad={() => {
          console.log('[IFrameWrapper] iframe onLoad fired for:', appUrl);
          // Request height immediately on load
          setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_CONTENT_HEIGHT' }, '*');
          }, 100);
          setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_CONTENT_HEIGHT' }, '*');
          }, 500);
          setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_CONTENT_HEIGHT' }, '*');
          }, 1500);
        }}
        allow="camera;microphone;geolocation"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation allow-downloads"
      />
    </div>
  );
}
