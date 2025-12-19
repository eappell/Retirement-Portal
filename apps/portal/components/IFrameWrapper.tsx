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
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [toolbarButtons, setToolbarButtons] = useState<ToolbarButton[]>([]);

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
                  tier: tier || user.tier || "free",
                  dob: user.dob || null,
                  retirementAge: user.retirementAge || null,
                  currentAnnualIncome: user.currentAnnualIncome || null,
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
          dob: user?.dob || null,
          retirementAge: user?.retirementAge || null,
          currentAnnualIncome: user?.currentAnnualIncome || null,
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
      iframeRef.current.contentWindow?.postMessage(
        {
          type: 'USER_PROFILE_UPDATE',
          dob,
          retirementAge,
          currentAnnualIncome,
        },
        '*'
      );
    }
  }, [user?.dob, user?.retirementAge, user?.currentAnnualIncome, loading]);

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
                type: 'USER_PROFILE_UPDATE',
                dob: parsed?.dob || null,
                retirementAge: parsed?.retirementAge || null,
                currentAnnualIncome: parsed?.currentAnnualIncome || null,
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

  // Listen for toolbar button messages and app-to-app messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("IFrameWrapper received message:", event.data);
      // In production, verify the origin
      
      // If iframe requests current theme, reply with the portal theme
      if (event.data?.type === "REQUEST_THEME") {
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
            const iconContainer = btn.querySelector('div.h-5.w-5');
            const orig = btn.getAttribute('data-orig-icon-html') || '';
            if (state === 'loading') {
              // spinner SVG
              const spinner = `<svg class="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>`;
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
      const isDark = theme === 'dark';
      
      // Base classes
      let className = "inline-flex items-center justify-center p-2 rounded-md transition-colors ";
      
      if (isDark) {
        className += "text-gray-50 hover:bg-gray-100 hover:text-gray-900";
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
        iconContainer.className = "h-5 w-5";
        btn.setAttribute('data-orig-icon-html', iconContainer.innerHTML || '');
        btn.appendChild(iconContainer);
      } else {
        btn.textContent = button.icon;
        btn.className += " text-lg";
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
    <div className="flex flex-col h-full">
      <iframe
        ref={iframeRef}
        src={appUrl}
        title={appName}
        className="flex-1 w-full border-0"
        allow="camera;microphone;geolocation"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation allow-downloads"
      />
    </div>
  );
}
