// Proactive Insights Analyzer
// Analyzes user data to detect optimization opportunities

interface InsightOpportunity {
  id: string;
  type: "social-security" | "tax" | "healthcare" | "relocation" | "income" | "general";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  potentialImpact: number;
  actionItems: string[];
  relatedTools: string[];
}

interface UserRetirementData {
  age?: number;
  retirementAge?: number;
  currentSavings?: number;
  monthlyExpenses?: number;
  toolData?: {
    income?: {
      totalIncome?: number;
      socialSecurity?: number;
    };
    socialSecurity?: {
      claimAge?: number;
      estimatedBenefit?: number;
      optimizationPotential?: number;
    };
    tax?: {
      currentState?: string;
      estimatedTaxRate?: number;
      potentialSavings?: number;
    };
    healthcare?: {
      monthlyPremium?: number;
      outOfPocket?: number;
      hsaBalance?: number;
    };
  };
}

export function analyzeUserData(userData: UserRetirementData): InsightOpportunity[] {
  const insights: InsightOpportunity[] = [];

  // Social Security Optimization
  if (userData.toolData?.socialSecurity) {
    const { claimAge, optimizationPotential } = userData.toolData.socialSecurity;
    
    if (claimAge && claimAge < 70 && optimizationPotential && optimizationPotential > 50000) {
      insights.push({
        id: "ss-delay-claiming",
        type: "social-security",
        priority: "high",
        title: "Delay Social Security Claiming",
        description: `By waiting to claim Social Security until age 70, you could increase your lifetime benefits by approximately $${formatNumber(optimizationPotential)}.`,
        potentialImpact: optimizationPotential,
        actionItems: [
          "Review your current Social Security claiming strategy",
          "Calculate break-even age for delayed claiming",
          "Consider your longevity and health factors",
          "Use the Social Security Optimizer tool for detailed analysis",
        ],
        relatedTools: ["social-security", "income-estimator"],
      });
    }
  }

  // Tax Optimization through Relocation
  if (userData.toolData?.tax) {
    const { currentState, potentialSavings } = userData.toolData.tax;
    
    if (potentialSavings && potentialSavings > 5000) {
      const highTaxStates = ["CA", "NY", "NJ", "IL", "MA"];
      if (currentState && highTaxStates.includes(currentState)) {
        insights.push({
          id: "tax-relocation",
          type: "tax",
          priority: "high",
          title: "Consider Tax-Friendly Relocation",
          description: `Relocating to a tax-friendly state could save you approximately $${formatNumber(potentialSavings)} per year in state taxes.`,
          potentialImpact: potentialSavings * 20, // 20-year impact
          actionItems: [
            "Research tax-friendly states (FL, TX, NV, WA, etc.)",
            "Compare cost of living differences",
            "Use the Retire Abroad tool to explore options",
            "Consider proximity to family and healthcare",
          ],
          relatedTools: ["tax-impact-analyzer", "retire-abroad"],
        });
      }
    }
  }

  // Healthcare Cost Optimization
  if (userData.toolData?.healthcare) {
    const { monthlyPremium, hsaBalance } = userData.toolData.healthcare;
    
    if (monthlyPremium && monthlyPremium > 1000) {
      insights.push({
        id: "healthcare-optimization",
        type: "healthcare",
        priority: "medium",
        title: "Review Healthcare Plan Options",
        description: `Your current healthcare premium of $${formatNumber(monthlyPremium)}/month is higher than average. You may be able to reduce costs.`,
        potentialImpact: (monthlyPremium - 800) * 12 * 10, // 10-year savings
        actionItems: [
          "Compare Medicare Advantage vs. Medigap plans",
          "Review prescription drug coverage options",
          "Consider high-deductible plans with HSA",
          "Check if you qualify for subsidies",
        ],
        relatedTools: ["healthcare-cost"],
      });
    }

    if (!hsaBalance || hsaBalance < 10000) {
      insights.push({
        id: "hsa-contribution",
        type: "healthcare",
        priority: "medium",
        title: "Maximize HSA Contributions",
        description: "Increasing your HSA contributions can provide triple tax advantages and help cover future healthcare costs.",
        potentialImpact: 15000, // Estimated tax savings over time
        actionItems: [
          "Maximize annual HSA contributions",
          "Invest HSA funds for long-term growth",
          "Save receipts to reimburse yourself later",
          "Use HSA as a retirement healthcare fund",
        ],
        relatedTools: ["healthcare-cost", "tax-impact-analyzer"],
      });
    }
  }

  // Income Gap Analysis
  if (userData.currentSavings && userData.monthlyExpenses && userData.retirementAge && userData.age) {
    const yearsToRetirement = userData.retirementAge - userData.age;
    const yearsInRetirement = 90 - userData.retirementAge; // Assume living to 90
    const totalNeeded = userData.monthlyExpenses * 12 * yearsInRetirement;
    const projectedShortfall = totalNeeded - userData.currentSavings;

    if (projectedShortfall > 100000) {
      insights.push({
        id: "income-gap",
        type: "income",
        priority: "high",
        title: "Address Retirement Income Gap",
        description: `Based on your current savings and expenses, you may have a shortfall of approximately $${formatNumber(projectedShortfall)} in retirement.`,
        potentialImpact: projectedShortfall,
        actionItems: [
          `Increase savings rate over the next ${yearsToRetirement} years`,
          "Review and optimize investment allocation",
          "Consider working part-time in early retirement",
          "Explore ways to reduce retirement expenses",
        ],
        relatedTools: ["income-estimator", "tax-impact-analyzer"],
      });
    }
  }

  // General Retirement Planning
  if (!userData.toolData?.income && !userData.toolData?.socialSecurity) {
    insights.push({
      id: "get-started",
      type: "general",
      priority: "high",
      title: "Complete Your Retirement Profile",
      description: "Start by using our key planning tools to get a comprehensive view of your retirement readiness.",
      potentialImpact: 0,
      actionItems: [
        "Use the Income Estimator to project retirement income",
        "Optimize your Social Security claiming strategy",
        "Analyze tax implications in retirement",
        "Estimate healthcare costs",
      ],
      relatedTools: ["income-estimator", "social-security", "tax-impact-analyzer", "healthcare-cost"],
    });
  }

  // Sort by priority and impact
  insights.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.potentialImpact - a.potentialImpact;
  });

  return insights;
}

export function hasNewInsights(
  previousInsights: InsightOpportunity[],
  currentInsights: InsightOpportunity[]
): boolean {
  if (previousInsights.length === 0 && currentInsights.length > 0) {
    return true;
  }

  // Check if there are any high-priority insights that weren't there before
  const newHighPriorityInsights = currentInsights.filter(
    (current) =>
      current.priority === "high" &&
      !previousInsights.some((prev) => prev.id === current.id)
  );

  return newHighPriorityInsights.length > 0;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(num);
}

export function getTopInsight(insights: InsightOpportunity[]): InsightOpportunity | null {
  return insights.length > 0 ? insights[0] : null;
}
