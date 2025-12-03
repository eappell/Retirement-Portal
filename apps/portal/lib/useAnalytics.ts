import {useCallback} from "react";
import {httpsCallable} from "firebase/functions";
import {functions} from "@/lib/firebase";
import {useAuth} from "@/lib/auth";

export interface AnalyticsEvent {
  eventType: string;
  application: string;
  metadata?: Record<string, unknown>;
}

export const useAnalytics = () => {
  const {user} = useAuth();

  const trackEvent = useCallback(
    async (event: AnalyticsEvent) => {
      if (!user) {
        console.warn("Cannot track event: user not authenticated");
        return;
      }

      try {
        const trackEventFunction = httpsCallable(functions, "trackEvent");
        await trackEventFunction(event);
      } catch (error) {
        console.error("Error tracking event:", error);
        // Don't throw - analytics should not break the app
      }
    },
    [user]
  );

  return {trackEvent};
};
