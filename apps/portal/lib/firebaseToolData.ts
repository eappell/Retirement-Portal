/**
 * Shared Firebase Utilities for RetireWise Tools
 * 
 * This library provides standardized functions for saving and retrieving
 * user data across all retirement planning tools.
 * 
 * Usage:
 * ```typescript
 * import { saveToolData, getLatestToolData } from '@/lib/firebaseToolData';
 * 
 * // Save data
 * await saveToolData(userId, 'income-estimator', {
 *   totalIncome: 75000,
 *   socialSecurity: 32000,
 *   // ... other fields
 * });
 * 
 * // Retrieve data
 * const data = await getLatestToolData(userId, 'income-estimator');
 * ```
 */

import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

/**
 * Standardized tool IDs
 */
export const TOOL_IDS = {
  INCOME_ESTIMATOR: 'income-estimator',
  SOCIAL_SECURITY: 'social-security-optimizer',
  TAX_IMPACT: 'tax-impact-analyzer',
  HEALTHCARE: 'healthcare-cost-estimator',
  RETIRE_ABROAD: 'retire-abroad',
  PENSION_LUMPSUM: 'pension-vs-lumpsum',
  RETIREMENT_AGE: 'retirement-age-calculator',
  SAVINGS_GOAL: 'savings-goal-calculator',
  WITHDRAWAL_STRATEGY: 'withdrawal-strategy',
  LEGACY_PLANNING: 'legacy-planning',
  ACTIVITY_BUDGET: 'activity-budget',
  INVESTMENT_ALLOCATION: 'investment-allocation',
} as const;

export type ToolId = typeof TOOL_IDS[keyof typeof TOOL_IDS];

/**
 * Base interface for all tool data
 */
export interface BaseToolData {
  userId: string;
  toolId: ToolId;
  timestamp: Timestamp;
  version: string;
  notes?: string;
}

/**
 * Save user data from a tool to Firestore
 * 
 * @param userId - Firebase Auth UID
 * @param toolId - Standardized tool identifier
 * @param data - Tool-specific data object
 * @param version - Schema version (default: "1.0")
 * @returns Document ID of the saved data
 */
export async function saveToolData(
  userId: string,
  toolId: ToolId,
  data: Record<string, unknown>,
  version: string = '1.0'
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'userToolData'), {
      userId,
      toolId,
      timestamp: serverTimestamp(),
      version,
      ...data,
    });
    
    console.log(`✓ Saved ${toolId} data for user ${userId}`);
    return docRef.id;
  } catch (error) {
    console.error(`✗ Error saving ${toolId} data:`, error);
    throw new Error(`Failed to save tool data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the most recent data for a specific tool and user
 * 
 * @param userId - Firebase Auth UID
 * @param toolId - Standardized tool identifier
 * @returns Latest tool data or null if not found
 */
export async function getLatestToolData<T = Record<string, unknown>>(
  userId: string,
  toolId: ToolId
): Promise<T | null> {
  try {
    const q = query(
      collection(db, 'userToolData'),
      where('userId', '==', userId),
      where('toolId', '==', toolId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log(`No data found for ${toolId} and user ${userId}`);
      return null;
    }
    
    return snapshot.docs[0].data() as T;
  } catch (error) {
    console.error(`Error retrieving ${toolId} data:`, error);
    throw new Error(`Failed to retrieve tool data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all historical data for a specific tool and user
 * 
 * @param userId - Firebase Auth UID
 * @param toolId - Standardized tool identifier
 * @param maxResults - Maximum number of results to return (default: 10)
 * @returns Array of tool data, newest first
 */
export async function getToolDataHistory<T = Record<string, unknown>>(
  userId: string,
  toolId: ToolId,
  maxResults: number = 10
): Promise<T[]> {
  try {
    const q = query(
      collection(db, 'userToolData'),
      where('userId', '==', userId),
      where('toolId', '==', toolId),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.data() as T);
  } catch (error) {
    console.error(`Error retrieving ${toolId} history:`, error);
    throw new Error(`Failed to retrieve tool history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all tool data for a user (across all tools)
 * Useful for comprehensive analysis
 * 
 * @param userId - Firebase Auth UID
 * @returns Object mapping tool IDs to their latest data
 */
export async function getAllUserToolData(
  userId: string
): Promise<Record<string, unknown>> {
  try {
    const toolData: Record<string, unknown> = {};
    
    // Query for all user's data
    const q = query(
      collection(db, 'userToolData'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    // Group by toolId and keep only the latest entry for each tool
    const seen = new Set<string>();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const toolId = data.toolId as string;
      
      if (!seen.has(toolId)) {
        toolData[toolId] = data;
        seen.add(toolId);
      }
    });
    
    return toolData;
  } catch (error) {
    console.error('Error retrieving all user tool data:', error);
    throw new Error(`Failed to retrieve user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if user has data for a specific tool
 * 
 * @param userId - Firebase Auth UID
 * @param toolId - Standardized tool identifier
 * @returns true if data exists, false otherwise
 */
export async function hasToolData(
  userId: string,
  toolId: ToolId
): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'userToolData'),
      where('userId', '==', userId),
      where('toolId', '==', toolId),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error(`Error checking ${toolId} data:`, error);
    return false;
  }
}

/**
 * Debounced save function factory
 * Use this to avoid saving on every keystroke
 * 
 * @param delay - Delay in milliseconds (default: 1000)
 * @returns Debounced save function
 * 
 * @example
 * const debouncedSave = createDebouncedSave(2000);
 * // Call multiple times, only the last call within 2s will execute
 * debouncedSave(userId, toolId, data);
 */
export function createDebouncedSave(delay: number = 1000) {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return async (
    userId: string,
    toolId: ToolId,
    data: Record<string, unknown>
  ): Promise<void> => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          await saveToolData(userId, toolId, data);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

/**
 * Validate required fields for tool data
 * 
 * @param data - Data object to validate
 * @param requiredFields - Array of required field names
 * @returns true if valid, throws error if invalid
 */
export function validateToolData(
  data: Record<string, unknown>,
  requiredFields: string[]
): boolean {
  const missingFields = requiredFields.filter(field => !(field in data));
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  return true;
}
