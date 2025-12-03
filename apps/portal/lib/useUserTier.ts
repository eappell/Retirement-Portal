import {useEffect, useState} from "react";
import {httpsCallable} from "firebase/functions";
import {functions} from "@/lib/firebase";
import {useAuth} from "@/lib/auth";

export const useUserTier = () => {
  const {user, loading: authLoading} = useAuth();
  const [tier, setTier] = useState<"free" | "paid" | "admin" | null>(null);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(authLoading);
      return;
    }

    const fetchTier = async () => {
      try {
        const getUserTierFunction = httpsCallable(functions, "getUserTier");
        const result = await getUserTierFunction({});
        const data = result.data as {tier: string; subscriptionExpiry: string | null};

        setTier((data.tier as "free" | "paid" | "admin") || "free");
        setSubscriptionExpiry(data.subscriptionExpiry || null);
      } catch (err) {
        console.error("Error fetching user tier:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch tier");
        // Set default to free on error
        setTier("free");
        setSubscriptionExpiry(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTier();
  }, [user, authLoading]);

  return {tier, subscriptionExpiry, loading, error};
};
