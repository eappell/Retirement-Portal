"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./auth";
import { db } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

interface ToolData {
  income?: {
    totalIncome?: number;
    socialSecurity?: number;
    pension?: number;
    investments?: number;
    lastUpdated?: Date;
  };
  socialSecurity?: {
    claimAge?: number;
    estimatedBenefit?: number;
    optimizationPotential?: number;
    lastUpdated?: Date;
  };
  tax?: {
    currentState?: string;
    estimatedTaxRate?: number;
    potentialSavings?: number;
    lastUpdated?: Date;
  };
  healthcare?: {
    monthlyPremium?: number;
    outOfPocket?: number;
    hsaBalance?: number;
    lastUpdated?: Date;
  };
  location?: {
    currentLocation?: string;
    consideringRelocation?: boolean;
    potentialSavings?: number;
    lastUpdated?: Date;
  };
}

interface UserRetirementData {
  // Profile data
  age?: number;
  retirementAge?: number;
  location?: string;
  
  // Financial data
  currentSavings?: number;
  monthlyExpenses?: number;
  estimatedIncome?: number;
  
  // Tool usage tracking
  toolsUsed?: string[];
  lastUpdated?: Date;
  
  // Tool-specific data
  toolData?: ToolData;
  
  // Aggregated insights
  projectedShortfall?: number;
  confidenceScore?: number;
  topOpportunities?: Array<{
    type: string;
    impact: number;
    description: string;
  }>;
}

interface RetirementContextType {
  userData: UserRetirementData | null;
  loading: boolean;
  refreshData: () => Promise<void>;
  updateUserData: (data: Partial<UserRetirementData>) => Promise<void>;
}

const RetirementContext = createContext<RetirementContextType | undefined>(undefined);

export function RetirementProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserRetirementData | null>(null);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateConfidenceScore = (toolData: ToolData): number => {
    let score = 0;
    let maxScore = 0;

    // Award points for each data source available
    if (toolData.income) { score += 25; }
    if (toolData.socialSecurity) { score += 25; }
    if (toolData.tax) { score += 20; }
    if (toolData.healthcare) { score += 15; }
    if (toolData.location) { score += 15; }
    
    maxScore = 100;

    return Math.round((score / maxScore) * 100);
  };

  const refreshData = async () => {
    if (!user || user.isAnonymous) {
      setUserData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch user profile data
      const profileDoc = await getDoc(doc(db, "users", user.uid));
      
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        
        // Fetch tool-specific data from various collections
        const toolData: ToolData = {};
        
        // Fetch income data (from income-estimator tool)
        try {
          const incomeQuery = query(
            collection(db, "userToolData"),
            where("userId", "==", user.uid),
            where("toolId", "==", "income-estimator"),
            orderBy("timestamp", "desc"),
            limit(1)
          );
          const incomeSnap = await getDocs(incomeQuery);
          if (!incomeSnap.empty) {
            const incomeData = incomeSnap.docs[0].data();
            toolData.income = {
              totalIncome: incomeData.totalIncome,
              socialSecurity: incomeData.socialSecurity,
              pension: incomeData.pension,
              investments: incomeData.investments,
              lastUpdated: incomeData.timestamp?.toDate(),
            };
          }
        } catch (error) {
          // No data found or error
        }

        // Fetch Social Security optimization data
        try {
          const ssQuery = query(
            collection(db, "userToolData"),
            where("userId", "==", user.uid),
            where("toolId", "==", "social-security"),
            orderBy("timestamp", "desc"),
            limit(1)
          );
          const ssSnap = await getDocs(ssQuery);
          if (!ssSnap.empty) {
            const ssData = ssSnap.docs[0].data();
            toolData.socialSecurity = {
              claimAge: ssData.claimAge,
              estimatedBenefit: ssData.estimatedBenefit,
              optimizationPotential: ssData.optimizationPotential,
              lastUpdated: ssData.timestamp?.toDate(),
            };
          }
        } catch (error) {
          // No data found or error
        }

        // Fetch tax data
        try {
          const taxQuery = query(
            collection(db, "userToolData"),
            where("userId", "==", user.uid),
            where("toolId", "==", "tax-impact-analyzer"),
            orderBy("timestamp", "desc"),
            limit(1)
          );
          const taxSnap = await getDocs(taxQuery);
          if (!taxSnap.empty) {
            const taxData = taxSnap.docs[0].data();
            toolData.tax = {
              currentState: taxData.state,
              estimatedTaxRate: taxData.effectiveTaxRate,
              potentialSavings: taxData.potentialSavings,
              lastUpdated: taxData.timestamp?.toDate(),
            };
          }
        } catch (error) {
          // No data found or error
        }

        // Fetch healthcare data
        try {
          const healthQuery = query(
            collection(db, "userToolData"),
            where("userId", "==", user.uid),
            where("toolId", "==", "healthcare-cost"),
            orderBy("timestamp", "desc"),
            limit(1)
          );
          const healthSnap = await getDocs(healthQuery);
          if (!healthSnap.empty) {
            const healthData = healthSnap.docs[0].data();
            toolData.healthcare = {
              monthlyPremium: healthData.monthlyPremium,
              outOfPocket: healthData.outOfPocket,
              hsaBalance: healthData.hsaBalance,
              lastUpdated: healthData.timestamp?.toDate(),
            };
          }
        } catch (error) {
          // No data found or error
        }

        // Calculate aggregated insights
        const opportunities = [];
        
        // Check Social Security optimization
        if (toolData.socialSecurity?.optimizationPotential && toolData.socialSecurity.optimizationPotential > 50000) {
          opportunities.push({
            type: "social-security",
            impact: toolData.socialSecurity.optimizationPotential,
            description: `Optimize Social Security claiming strategy for ${formatCurrency(toolData.socialSecurity.optimizationPotential)} lifetime benefit increase`,
          });
        }

        // Check tax optimization
        if (toolData.tax?.potentialSavings && toolData.tax.potentialSavings > 5000) {
          opportunities.push({
            type: "tax",
            impact: toolData.tax.potentialSavings,
            description: `Consider relocating to reduce annual taxes by ${formatCurrency(toolData.tax.potentialSavings)}`,
          });
        }

        // Check healthcare costs
        if (toolData.healthcare?.monthlyPremium && toolData.healthcare.monthlyPremium > 1000) {
          opportunities.push({
            type: "healthcare",
            impact: (toolData.healthcare.monthlyPremium - 800) * 12,
            description: `Review healthcare plans to potentially save ${formatCurrency((toolData.healthcare.monthlyPremium - 800) * 12)}/year`,
          });
        }

        // Sort opportunities by impact
        opportunities.sort((a, b) => b.impact - a.impact);
        
        setUserData({
          age: profileData.age,
          retirementAge: profileData.retirementAge,
          location: profileData.location,
          currentSavings: profileData.currentSavings,
          monthlyExpenses: profileData.monthlyExpenses,
          estimatedIncome: profileData.estimatedIncome,
          toolsUsed: profileData.toolsUsed || [],
          lastUpdated: profileData.lastUpdated?.toDate() || new Date(),
          toolData,
          topOpportunities: opportunities.slice(0, 3),
          confidenceScore: calculateConfidenceScore(toolData),
        });
      } else {
        setUserData(null);
      }
    } catch (error) {
      console.error("Error loading retirement data:", error);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = async (data: Partial<UserRetirementData>) => {
    if (!user || user.isAnonymous) return;

    try {
      // TODO: Update user data in Firestore
      // For now, just update local state
      setUserData((prev) => ({
        ...prev,
        ...data,
        lastUpdated: new Date(),
      } as UserRetirementData));
    } catch (error) {
      console.error("Error updating retirement data:", error);
    }
  };

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <RetirementContext.Provider value={{ userData, loading, refreshData, updateUserData }}>
      {children}
    </RetirementContext.Provider>
  );
}

export function useRetirementData() {
  const context = useContext(RetirementContext);
  if (context === undefined) {
    throw new Error("useRetirementData must be used within a RetirementProvider");
  }
  return context;
}
