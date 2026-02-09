/**
 * PocketBase Data Service for RetireWise Portal
 *
 * This service handles all data persistence via the PocketBase proxy.
 * It's used by the portal to save/load data on behalf of embedded tools.
 *
 * Tools communicate with the portal via postMessage, and the portal
 * uses this service to interact with PocketBase.
 */

// Proxy URL - configured via environment variable. 
// Defaults to localhost:3001 for local dev (where pocketbase-proxy runs).
// In production, set NEXT_PUBLIC_PROXY_URL to the deployed proxy server URL.
const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL ?? 'http://localhost:3001';

/**
 * Standardized tool IDs for PocketBase
 */
export const TOOL_IDS = {
  INCOME_ESTIMATOR: 'income-estimator',
  SOCIAL_SECURITY: 'ss-optimizer',
  TAX_IMPACT: 'tax-analyzer',
  HEALTHCARE: 'healthcare-cost',
  RETIRE_ABROAD: 'retire-abroad',
  STATE_RELOCATE: 'state-relocator',
  LONGEVITY: 'longevity-planner',
  IDENTITY_BUILDER: 'retirement-identity-builder', // Was 'identity-builder'
  VOLUNTEER: 'volunteer-matcher',
  LEGACY: 'legacy-flow-visualizer', // Was 'legacy-visualizer'
  GIFTING: 'gifting-planner',
  DIGITAL_ESTATE: 'digital-estate-manager', // Was 'estate-manager'
} as const;

export type ToolId = string; // Allow any string for flexibility

/**
 * Delete tool data via PocketBase proxy
 * 
 * @param authToken - Firebase auth token for validation
 * @param toolId - Tool identifier
 * @returns True if successful, false otherwise
 */
export async function deleteToolData(
  authToken: string,
  toolId: ToolId
): Promise<boolean> {
  if (!authToken) {
    console.warn('[PocketBase Service] No auth token provided');
    return false;
  }

  try {
    // Note: Calling the save endpoint with null data *might* be interpreted as a delete 
    // if the proxy supported it, but unrelated to that, we'll try to use a delete endpoint
    // assuming it will be added to the proxy soon.
    const response = await fetch(`${PROXY_URL}/api/tool-data/delete`, {
      method: 'POST', // or DELETE, but standardizing on POST for RPC-style if needed
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ toolId }),
    });

    if (!response.ok) {
       // If 404, maybe it means endpoint doesn't exist, or record doesn't exist.
       // For now, let's log and return false.
       if (response.status === 404) {
         console.warn('[PocketBase Service] Delete endpoint not found or record missing');
         return false;
       }
       return false;
    }
    
    return true;
  } catch (error) {
    console.error(`[PocketBase Service] Error deleting ${toolId}:`, error);
    return false;
  }
}

/**
 * Save tool data via PocketBase proxy
 *
 * @param authToken - Firebase auth token for validation
 * @param toolId - Tool identifier
 * @param data - Data to save
 * @returns Record ID if successful, null otherwise
 */
export async function saveToolData(
  authToken: string,
  toolId: ToolId,
  data: Record<string, unknown>
): Promise<{ id: string } | null> {
  if (!authToken) {
    console.warn('[PocketBase Service] No auth token provided');
    return null;
  }

  try {
    const response = await fetch(`${PROXY_URL}/api/tool-data/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toolId,
        data: removeUndefined(data),
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error(`[PocketBase Service] Save failed:`, result);
      return null;
    }

    return { id: result.id };
  } catch (error) {
    console.error(`[PocketBase Service] Error saving ${toolId}:`, error);
    return null;
  }
}

/**
 * Load tool data via PocketBase proxy
 *
 * @param authToken - Firebase auth token for validation
 * @param toolId - Tool identifier
 * @returns Tool data if found, null otherwise
 */
export async function loadToolData(
  authToken: string,
  toolId: ToolId
): Promise<{ data: Record<string, unknown>; created: string; id: string } | null> {
  if (!authToken) {
    console.warn('[PocketBase Service] No auth token provided');
    return null;
  }

  try {
    const response = await fetch(`${PROXY_URL}/api/tool-data/load?toolId=${encodeURIComponent(toolId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PocketBase Service] Load error: ${response.status}`, errorText);
      return null;
    }

    const result = await response.json();

    if (!result || !result.data) {
      return null;
    }

    return {
      data: result.data,
      created: result.created,
      id: result.id,
    };
  } catch (error) {
    console.error(`[PocketBase Service] Error loading ${toolId}:`, error);
    return null;
  }
}

/**
 * Load all tool data for the current user
 *
 * @param authToken - Firebase auth token
 * @returns Map of toolId to data
 */
export async function loadAllToolData(
  authToken: string
): Promise<Record<string, { data: Record<string, unknown>; created: string }>> {
  if (!authToken) {
    console.warn('[PocketBase Service] No auth token provided');
    return {};
  }

  try {
    console.log(`[PocketBase Service] Calling ${PROXY_URL}/api/tool-data/load-all`);
    const response = await fetch(`${PROXY_URL}/api/tool-data/load-all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PocketBase Service] Load all error: ${response.status}`, errorText);
      return {};
    }

    const result = await response.json();
    console.log('[PocketBase Service] Loaded data for tools:', Object.keys(result));
    return result;
  } catch (error) {
    console.error('[PocketBase Service] Error loading all data:', error);
    return {};
  }
}

/**
 * Recursively remove undefined values from an object
 * PocketBase doesn't allow undefined field values
 */
function removeUndefined(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  }

  return obj;
}
