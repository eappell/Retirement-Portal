"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
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
  const { theme } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement>(null);
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

          // Send token to iframe when it's ready
          if (iframeRef.current) {
            iframeRef.current.onload = () => {
              iframeRef.current?.contentWindow?.postMessage(
                {
                  type: "AUTH_TOKEN",
                  token,
                  userId: user.uid,
                  email: user.email,
                  tier: user.tier || "free",
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
      
      // Handle cross-app data transfer requests
      if (event.data?.type === "APP_DATA_TRANSFER") {
        console.log("[Portal] Routing data transfer:", {
          from: event.data.sourceApp,
          to: event.data.targetApp,
          dataType: event.data.dataType,
        });
        
        // Forward the message to all iframes (they'll filter by targetApp)
        // In a multi-iframe setup, you'd need to track which iframe is which app
        // For now, broadcast to the current iframe
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
      
      // Handle GET_SCENARIOS_RESPONSE - forward back to requesting iframe
      if (event.data?.type === "GET_SCENARIOS_RESPONSE") {
        console.log("[Portal] Forwarding GET_SCENARIOS_RESPONSE");
        // In a multi-iframe scenario, we'd route this to the healthcare cost iframe
        // For now, it will be received by the healthcare cost app since it sent the request
        window.postMessage(event.data, "*");
        return;
      }
      
      if (event.data?.type === "TOOLBAR_BUTTONS") {
        console.log("Received TOOLBAR_BUTTONS, count:", event.data.buttons?.length);
        setToolbarButtons(event.data.buttons || []);
        // Inject buttons into the app header placeholder
        const placeholder = document.getElementById("app-toolbar-placeholder");
        if (placeholder) {
          placeholder.innerHTML = "";
          event.data.buttons?.forEach((button: ToolbarButton) => {
            const buttonEl = document.createElement("div");
            buttonEl.className = "group relative inline-flex";

            const btn = document.createElement("button");
            btn.className =
              "inline-flex items-center justify-center p-2 rounded-md transition-colors";
            btn.style.color = "#46494c";
            btn.setAttribute("aria-label", button.label);
            btn.title = button.tooltip || button.label;

            // Add icon - support both SVG strings and emoji
            if (button.icon.trim().startsWith("<svg")) {
              // SVG icon - render directly
              const iconContainer = document.createElement("div");
              iconContainer.innerHTML = button.icon;
              iconContainer.className = "h-5 w-5";
              // Apply color to SVG element
              const svg = iconContainer.querySelector("svg");
              if (svg) {
                // Set initial color based on theme
                const isDark = document.documentElement.classList.contains("dark");
                svg.style.color = isDark ? "#FEFCFD" : "#46494c";
                
                // Watch for theme changes
                const observer = new MutationObserver(() => {
                  const isDark = document.documentElement.classList.contains("dark");
                  svg.style.color = isDark ? "#FEFCFD" : "#46494c";
                });
                observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
              }
              btn.appendChild(iconContainer);
            } else {
              // Emoji or other text icon
              btn.textContent = button.icon;
              btn.className += " text-lg";
            }

            // Add click handler
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

            // Add tooltip if provided
            if (button.tooltip) {
              const tooltip = document.createElement("span");
              tooltip.className =
                "absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-slate-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-40 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-none pointer-events-none";
              tooltip.textContent = button.tooltip;
              buttonEl.appendChild(tooltip);
            }

            placeholder.appendChild(buttonEl);
          });
        }
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
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation"
      />
    </div>
  );
}
