"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { loadAllToolData, saveToolData, loadToolData as fetchToolData, deleteToolData as removeToolData } from '@/lib/pocketbaseDataService';

// Define the shape of our data
interface ToolDataState {
  [toolId: string]: {
    data: any;
    created: string;
    id?: string;
  };
}

interface ToolDataContextType {
  toolData: ToolDataState;
  isLoading: boolean;
  loadDataForTool: (toolId: string) => Promise<{ data: any; created: string; id?: string } | null>;
  saveDataForTool: (toolId: string, data: any) => Promise<{ id?: string; success: boolean }>;
  clearDataForTool: (toolId: string) => Promise<boolean>;
  refreshAllData: () => Promise<void>;
}

const ToolDataContext = createContext<ToolDataContextType | undefined>(undefined);

export function ToolDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const getToken = useCallback(async () => {
    if (!user) return "";
    return user.getIdToken(true);
  }, [user]);

  const [toolData, setToolData] = useState<ToolDataState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('retirewise_tool_data_cache');
      if (saved) {
        setToolData(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load tool data cache from localStorage', e);
    }
  }, []);

  // Sync to localStorage whenever data changes
  useEffect(() => {
    try {
      if (Object.keys(toolData).length > 0) {
        localStorage.setItem('retirewise_tool_data_cache', JSON.stringify(toolData));
      }
    } catch (e) {
      console.warn('Failed to save tool data cache to localStorage', e);
    }
  }, [toolData]);

  // Load all data from API when user logs in
  const refreshAllData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
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
      localStorage.removeItem('retirewise_tool_data_cache');
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

  const saveDataForTool = useCallback(async (toolId: string, data: any) => {
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
