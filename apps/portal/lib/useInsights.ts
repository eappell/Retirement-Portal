/**
 * useInsights Hook
 *
 * Provides cross-tool insights with automatic refresh on data changes.
 * Centralizes insight fetching logic for reuse across the portal.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './auth';
import { aggregateAllToolData } from './dataAggregationService';
import { analyzeCrossToolPatterns, getHighPriorityCount } from './crossToolAnalyzer';
import type { CrossToolInsight, AggregatedToolData } from './types/aggregatedToolData';

// Refresh intervals and thresholds
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
const MIN_REFRESH_INTERVAL_MS = 30 * 1000; // 30 seconds minimum between refreshes

interface UseInsightsResult {
  insights: CrossToolInsight[];
  aggregatedData: AggregatedToolData | null;
  isLoading: boolean;
  error: string | null;
  lastRefreshed: Date | null;
  highPriorityCount: number;
  dataCompleteness: number;
  refresh: () => Promise<void>;
}

export function useInsights(): UseInsightsResult {
  const { user } = useAuth();
  const [insights, setInsights] = useState<CrossToolInsight[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedToolData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const lastRefreshAttempt = useRef<number>(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    // Prevent too-frequent refreshes
    const now = Date.now();
    if (now - lastRefreshAttempt.current < MIN_REFRESH_INTERVAL_MS) {
      return;
    }
    lastRefreshAttempt.current = now;

    setIsLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const data = await aggregateAllToolData(token);
      const newInsights = analyzeCrossToolPatterns(data);

      setAggregatedData(data);
      setInsights(newInsights);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (user && !lastRefreshed) {
      refresh();
    }
  }, [user, lastRefreshed, refresh]);

  // Check for stale data
  useEffect(() => {
    if (!lastRefreshed) return;

    const checkStale = () => {
      const isStale = Date.now() - lastRefreshed.getTime() > STALE_THRESHOLD_MS;
      if (isStale) {
        refresh();
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkStale, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lastRefreshed, refresh]);

  // Listen for tool data changes
  useEffect(() => {
    const handleToolDataSaved = (event: MessageEvent) => {
      if (event.data?.type === 'TOOL_DATA_SAVED') {
        refresh();
      }
    };

    window.addEventListener('message', handleToolDataSaved);
    return () => window.removeEventListener('message', handleToolDataSaved);
  }, [refresh]);

  return {
    insights,
    aggregatedData,
    isLoading,
    error,
    lastRefreshed,
    highPriorityCount: getHighPriorityCount(insights),
    dataCompleteness: aggregatedData?.dataCompleteness || 0,
    refresh,
  };
}

/**
 * Check if insights should be refreshed based on last refresh time
 */
export function shouldRefreshInsights(lastRefreshed: Date | null): boolean {
  if (!lastRefreshed) return true;
  return Date.now() - lastRefreshed.getTime() > STALE_THRESHOLD_MS;
}

/**
 * Detect if there are new high-priority insights compared to previous
 */
export function hasNewHighPriorityInsights(
  previousInsights: CrossToolInsight[],
  currentInsights: CrossToolInsight[]
): boolean {
  const previousIds = new Set(
    previousInsights
      .filter((i) => i.priority === 'critical' || i.priority === 'high')
      .map((i) => i.id)
  );

  return currentInsights.some(
    (i) =>
      (i.priority === 'critical' || i.priority === 'high') &&
      !previousIds.has(i.id)
  );
}
