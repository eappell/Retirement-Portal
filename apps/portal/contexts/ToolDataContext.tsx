"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { loadAllToolData, saveToolData, loadToolData as fetchToolData, deleteToolData as removeToolData } from '@/lib/pocketbaseDataService';

// Define the shape of our data
interface ToolDataState {
  [toolId: string]: {
    data: Record<string, unknown>;
    created: string;
    id?: string;
  };
}

interface CachedToolDataPayload {
  userId: string;
  data: ToolDataState;
}

function isToolDataEntry(value: unknown): value is { data: Record<string, unknown>; created: string; id?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return !!obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data) && typeof obj.created === 'string';
}

function isToolDataState(value: unknown): value is ToolDataState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every((entry) => isToolDataEntry(entry));
}

function isCachedToolDataPayload(value: unknown): value is CachedToolDataPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.userId === 'string' && isToolDataState(obj.data);
}

interface ToolDataContextType {
  toolData: ToolDataState;
  isLoading: boolean;
  isInitialized: boolean;
  loadDataForTool: (toolId: string) => Promise<{ data: Record<string, unknown>; created: string; id?: string } | null>;
  saveDataForTool: (toolId: string, data: Record<string, unknown>) => Promise<{ id?: string; success: boolean }>;
  clearDataForTool: (toolId: string) => Promise<boolean>;
  refreshAllData: () => Promise<void>;
}

const ToolDataContext = createContext<ToolDataContextType | undefined>(undefined);

export function ToolDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const getToken = useCallback(async () => {
    // Try reliable auth object first
    if (auth.currentUser) {
      if (typeof auth.currentUser.getIdToken === 'function') {
        return auth.currentUser.getIdToken(true);
      }
    }
    // Fallback? user object from context is a spread copy, so no methods there.
    return "";
  }, []);

  const [toolData, setToolData] = useState<ToolDataState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const CACHE_KEY = 'retirewise_tool_data_cache';

  // Load cache only for the currently authenticated user.
  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      if (!saved) return;
      const parsed: unknown = JSON.parse(saved);

      // Backward compatibility with older cache shape (raw map) — ignore it for safety.
      if (isCachedToolDataPayload(parsed) && parsed.userId === user.uid) {
        setToolData(parsed.data);
      }
    } catch (e) {
      console.warn('Failed to load tool data cache from localStorage', e);
    }
  }, [user]);

  // Sync to localStorage whenever data changes
  useEffect(() => {
    try {
      if (!user) return;
      if (Object.keys(toolData).length > 0) {
        const payload: CachedToolDataPayload = {
          userId: user.uid,
          data: toolData,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      } else {
        localStorage.removeItem(CACHE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save tool data cache to localStorage', e);
    }
  }, [toolData, user]);

  // Load all data from API when user logs in
  const refreshAllData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      // Always clear in-memory + local cache before loading from PocketBase.
      setToolData({});
      localStorage.removeItem(CACHE_KEY);
      const token = await getToken();
      if (!token) return;

      const allData = await loadAllToolData(token);
      
      // Update state with fresh data
      setToolData(prev => ({
        ...prev,
        ...allData
      }));
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to load all tool data', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getToken]);

  // Initial load effect
  useEffect(() => {
    if (user && !isInitialized && !isLoading) {
      refreshAllData();
    } else if (!user) {
      // Clear data on logout
      setToolData({});
      localStorage.removeItem(CACHE_KEY);
      setIsInitialized(false);
    }
  }, [user, isInitialized, isLoading, refreshAllData]);

  const loadDataForTool = useCallback(async (toolId: string) => {
    // Return from cache if available
    if (toolData[toolId]) {
      return toolData[toolId];
    }
    
    // If not in cache, fallback to fetch (and update cache)
    if (!user) return null;
    
    try {
      const token = await getToken();
      if (!token) return null;

      const result = await fetchToolData(token, toolId);
      if (result) {
        setToolData(prev => ({
          ...prev,
          [toolId]: result
        }));
        return result;
      }
      return null;
    } catch (error) {
      console.error(`Failed to load data for ${toolId}`, error);
      return null;
    }
  }, [toolData, user, getToken]);

  const saveDataForTool = useCallback(async (toolId: string, data: Record<string, unknown>) => {
    // Optimistic update
    const tempId = 'temp_' + Date.now();
    const now = new Date().toISOString();
    
    setToolData(prev => ({
      ...prev,
      [toolId]: {
        data,
        created: now,
        id: prev[toolId]?.id || tempId
      }
    }));

    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const token = await getToken();
      if (!token) return { success: false, error: 'No token' };

      const result = await saveToolData(token, toolId, data);
      
      if (result && result.id) {
        // Update with real ID from server
        setToolData(prev => ({
          ...prev,
          [toolId]: {
            data,
            created: now,
            id: result.id
          }
        }));
        return { success: true, id: result.id };
      }
      return { success: false };
    } catch (error) {
      console.error(`Failed to save data for ${toolId}`, error);
      // Revert/Update error state could happen here, keeping simple for now
      return { success: false };
    }
  }, [user, getToken]);

  const clearDataForTool = useCallback(async (toolId: string) => {
    // Optimistically clear
    setToolData(prev => {
      const next = { ...prev };
      delete next[toolId];
      return next;
    });

    if (!user) return false;

    try {
      const token = await getToken();
      if (!token) return false;

      return await removeToolData(token, toolId);
    } catch (error) {
      console.error(`Failed to delete data for ${toolId}`, error);
      return false;
    }
  }, [user, getToken]);

  return (
    <ToolDataContext.Provider value={{ 
      toolData, 
      isLoading, 
      isInitialized,
      loadDataForTool, 
      saveDataForTool, 
      clearDataForTool,
      refreshAllData 
    }}>
      {children}
    </ToolDataContext.Provider>
  );
}

export function useToolData() {
  const context = useContext(ToolDataContext);
  if (context === undefined) {
    throw new Error('useToolData must be used within a ToolDataProvider');
  }
  return context;
}
