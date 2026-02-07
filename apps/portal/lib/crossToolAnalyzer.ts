/**
 * Cross-Tool Pattern Analyzer
 *
 * Detects optimization opportunities by analyzing data across multiple tools.
 * Generates prioritized insights with specific dollar impacts.
 */

import type {
  AggregatedToolData,
  CrossToolInsight,
  InsightPriority,
  ToolId,
} from './types/aggregatedToolData';
import { TOOL_IDS } from './types/aggregatedToolData';

// High-tax states where relocation can provide significant savings
const HIGH_TAX_STATES = ['CA', 'NY', 'NJ', 'CT', 'IL', 'MA', 'MN', 'OR', 'VT', 'HI'];

// No income tax states
const NO_INCOME_TAX_STATES = ['FL', 'TX', 'NV', 'WA', 'WY', 'SD', 'TN', 'NH', 'AK'];

/**
 * Analyze aggregated data to detect cross-tool optimization opportunities
 */
export function analyzeCrossToolPatterns(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  console.log('[CrossToolAnalyzer] Analyzing data from tools:', data.toolsWithData);
  console.log('[CrossToolAnalyzer] Data completeness:', data.dataCompleteness + '%');

  // Only analyze if we have data from at least 2 tools
  if (data.toolsWithData.length < 2) {
    console.log('[CrossToolAnalyzer] Less than 2 tools with data, returning general insights only');
    // Still return general insights if only one tool
    insights.push(...analyzeGeneralPlanning(data));
    return sortInsights(insights);
  }

  // Tax + Relocation Synergy
  insights.push(...analyzeTaxRelocationOpportunity(data));

  // Healthcare + International Relocation
  insights.push(...analyzeHealthcareLocationOpportunity(data));

  // Income Gap Detection
  insights.push(...analyzeIncomeGapRisk(data));

  // Social Security + Longevity Optimization
  insights.push(...analyzeSocialSecurityTiming(data));

  // Estate + Gifting Coordination
  insights.push(...analyzeEstateGiftingStrategy(data));

  // Longevity + Healthcare Cost Projection
  insights.push(...analyzeLongevityHealthcareCosts(data));

  // General planning insights
  insights.push(...analyzeGeneralPlanning(data));

  return sortInsights(insights);
}

// ============================================
// Pattern Detection Functions
// ============================================

function analyzeTaxRelocationOpportunity(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  // Need tax data and either state relocator or retire abroad
  if (!data.taxAnalyzer) return insights;

  const currentState = data.taxAnalyzer.currentState;
  const isHighTaxState = HIGH_TAX_STATES.includes(currentState);
  const annualStateTax = data.taxAnalyzer.annualStateTax;

  // Check State Relocator synergy
  if (data.stateRelocator && data.stateRelocator.topRecommendation) {
    const targetState = data.stateRelocator.topRecommendation;
    const potentialSavings = data.stateRelocator.annualTaxSavings ||
      data.taxAnalyzer.potentialSavingsByState[targetState] || 0;

    if (potentialSavings > 5000) {
      const priority = determinePriority(potentialSavings, 15000, 10000, 5000);
      const lifetimeImpact = potentialSavings * 20; // 20-year projection

      insights.push({
        id: 'tax-relocation-synergy',
        type: 'tax-location',
        priority,
        title: `Moving to ${targetState} could save $${formatNumber(potentialSavings)}/year`,
        description: `Your Tax Analyzer shows you're paying $${formatNumber(annualStateTax)}/year in ${currentState} state taxes. Combined with your State Relocator analysis, ${targetState} aligns with your preferences and offers significant tax savings.`,
        potentialImpact: lifetimeImpact,
        confidenceScore: 85,
        relatedTools: [TOOL_IDS.TAX_IMPACT as ToolId, TOOL_IDS.STATE_RELOCATE as ToolId],
        actionItems: [
          `Review detailed comparison for ${targetState} in State Relocator`,
          'Use Tax Analyzer to model the specific tax impact',
          'Consider cost of living differences',
          'Plan timing around any existing commitments',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.TAX_IMPACT as ToolId, dataPoints: ['currentState', 'annualStateTax'] },
          { toolId: TOOL_IDS.STATE_RELOCATE as ToolId, dataPoints: ['topRecommendation', 'annualTaxSavings'] },
        ],
      });
    }
  }

  // High tax state without relocation plans
  if (isHighTaxState && !data.stateRelocator && annualStateTax > 10000) {
    insights.push({
      id: 'tax-relocation-opportunity',
      type: 'tax-location',
      priority: 'medium',
      title: `Consider tax-friendly states to reduce $${formatNumber(annualStateTax)}/year burden`,
      description: `You're currently in ${currentState}, a high-tax state. Many retirees save significantly by relocating to states with no income tax like FL, TX, or NV.`,
      potentialImpact: annualStateTax * 15, // 15-year savings estimate
      confidenceScore: 70,
      relatedTools: [TOOL_IDS.TAX_IMPACT as ToolId],
      actionItems: [
        'Explore the State Relocator tool to compare options',
        'Consider family and lifestyle factors',
        'Research cost of living differences',
      ],
      dataUsed: [
        { toolId: TOOL_IDS.TAX_IMPACT as ToolId, dataPoints: ['currentState', 'annualStateTax'] },
      ],
    });
  }

  return insights;
}

function analyzeHealthcareLocationOpportunity(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  if (!data.healthcareCost || !data.retireAbroad) return insights;

  const usHealthcareCost = data.healthcareCost.monthlyPremium * 12 + data.healthcareCost.annualOutOfPocket;
  const abroadSavings = data.retireAbroad.annualSavingsVsCurrent;
  const healthcareScore = data.retireAbroad.healthcareScore;
  const topCountry = data.retireAbroad.topCountry;

  if (topCountry && abroadSavings > 10000 && healthcareScore >= 70) {
    const priority = determinePriority(abroadSavings, 30000, 20000, 10000);

    insights.push({
      id: 'healthcare-abroad-opportunity',
      type: 'healthcare-location',
      priority,
      title: `${topCountry} offers quality healthcare at lower cost`,
      description: `Your Retire Abroad analysis shows ${topCountry} has a healthcare score of ${healthcareScore}/100 with potential annual savings of $${formatNumber(abroadSavings)}. Your current US healthcare costs are $${formatNumber(usHealthcareCost)}/year.`,
      potentialImpact: abroadSavings * 20, // 20-year projection
      confidenceScore: 65,
      relatedTools: [TOOL_IDS.HEALTHCARE as ToolId, TOOL_IDS.RETIRE_ABROAD as ToolId],
      actionItems: [
        `Research healthcare systems in ${topCountry}`,
        'Compare Medicare costs vs international health insurance',
        'Consider visa requirements for healthcare access',
        'Factor in travel costs for family visits',
      ],
      dataUsed: [
        { toolId: TOOL_IDS.HEALTHCARE as ToolId, dataPoints: ['monthlyPremium', 'annualOutOfPocket'] },
        { toolId: TOOL_IDS.RETIRE_ABROAD as ToolId, dataPoints: ['topCountry', 'healthcareScore', 'annualSavingsVsCurrent'] },
      ],
    });
  }

  return insights;
}

function analyzeIncomeGapRisk(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  // Need income data and either longevity or SS data
  if (!data.incomeEstimator) return insights;

  const totalIncome = data.incomeEstimator.totalAnnualIncome;
  const planningHorizon = data.longevityPlanner?.planningHorizon || 25;
  const projectedLifespan = data.longevityPlanner?.projectedLifespan || 85;

  // Check Social Security optimization potential
  if (data.ssOptimizer) {
    const ssOptPotential = data.ssOptimizer.lifetimeOptimizationPotential;
    const currentClaimAge = data.ssOptimizer.currentClaimAge;

    if (ssOptPotential > 50000 && currentClaimAge < 70) {
      const priority = determinePriority(ssOptPotential, 100000, 75000, 50000);

      insights.push({
        id: 'income-ss-optimization',
        type: 'income-gap',
        priority,
        title: `Optimize SS claiming for $${formatNumber(ssOptPotential)} lifetime benefit`,
        description: `Based on your Income Estimator data and Social Security analysis, delaying your claim from age ${currentClaimAge} to 70 could increase your lifetime benefits significantly. This is especially impactful with a ${planningHorizon}-year planning horizon.`,
        potentialImpact: ssOptPotential,
        confidenceScore: 80,
        relatedTools: [TOOL_IDS.INCOME_ESTIMATOR as ToolId, TOOL_IDS.SOCIAL_SECURITY as ToolId],
        actionItems: [
          'Review SS Optimizer claiming scenarios',
          'Calculate break-even age for delayed claiming',
          'Consider spousal strategies if applicable',
          'Factor in longevity expectations',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.INCOME_ESTIMATOR as ToolId, dataPoints: ['totalAnnualIncome'] },
          { toolId: TOOL_IDS.SOCIAL_SECURITY as ToolId, dataPoints: ['currentClaimAge', 'lifetimeOptimizationPotential'] },
        ],
      });
    }
  }

  return insights;
}

function analyzeSocialSecurityTiming(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  if (!data.ssOptimizer || !data.longevityPlanner) return insights;

  const currentClaimAge = data.ssOptimizer.currentClaimAge;
  const projectedLifespan = data.longevityPlanner.projectedLifespan;
  const optPotential = data.ssOptimizer.lifetimeOptimizationPotential;

  // If user plans to claim early but has high longevity projection
  if (currentClaimAge < 67 && projectedLifespan > 85 && optPotential > 30000) {
    insights.push({
      id: 'ss-longevity-mismatch',
      type: 'ss-timing',
      priority: 'high',
      title: 'Early SS claiming may cost you with your longevity projection',
      description: `You're planning to claim Social Security at ${currentClaimAge}, but your Longevity Planner projects living to ${projectedLifespan}. With ${projectedLifespan - currentClaimAge} years of benefits, delaying could add $${formatNumber(optPotential)} to your lifetime income.`,
      potentialImpact: optPotential,
      confidenceScore: 75,
      relatedTools: [TOOL_IDS.SOCIAL_SECURITY as ToolId, TOOL_IDS.LONGEVITY as ToolId],
      actionItems: [
        'Review claiming age scenarios in SS Optimizer',
        'Consider bridge income sources to delay claiming',
        'Factor in health status and family history',
        'Evaluate spousal benefits timing',
      ],
      dataUsed: [
        { toolId: TOOL_IDS.SOCIAL_SECURITY as ToolId, dataPoints: ['currentClaimAge', 'lifetimeOptimizationPotential'] },
        { toolId: TOOL_IDS.LONGEVITY as ToolId, dataPoints: ['projectedLifespan'] },
      ],
    });
  }

  return insights;
}

function analyzeEstateGiftingStrategy(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  if (!data.legacyVisualizer) return insights;

  const estateValue = data.legacyVisualizer.totalEstateValue;
  const beneficiaries = data.legacyVisualizer.beneficiaries;

  // Large estate with gifting opportunity
  if (estateValue > 1000000 && data.giftingPlanner) {
    const annualGiftBudget = data.giftingPlanner.annualGiftBudget;
    const taxAdvantagedGifts = data.giftingPlanner.taxAdvantagedGifts;

    // 2024 annual gift exclusion is $18,000 per person
    const maxAnnualGifting = beneficiaries * 18000;
    const giftingPotential = maxAnnualGifting - annualGiftBudget;

    if (giftingPotential > 20000) {
      insights.push({
        id: 'estate-gifting-optimization',
        type: 'estate-gifting',
        priority: 'medium',
        title: `Increase annual gifting by $${formatNumber(giftingPotential)} tax-free`,
        description: `Your estate is valued at $${formatNumber(estateValue)} with ${beneficiaries} beneficiaries. You could gift up to $${formatNumber(maxAnnualGifting)} annually tax-free (${beneficiaries} × $18,000), reducing estate tax exposure while helping family now.`,
        potentialImpact: giftingPotential * 10, // 10-year projection
        confidenceScore: 80,
        relatedTools: [TOOL_IDS.LEGACY as ToolId, TOOL_IDS.GIFTING as ToolId],
        actionItems: [
          'Review gifting strategies in Gifting Planner',
          'Consider 529 contributions for education',
          'Evaluate direct payment of medical/education expenses',
          'Consult with estate planning attorney',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.LEGACY as ToolId, dataPoints: ['totalEstateValue', 'beneficiaries'] },
          { toolId: TOOL_IDS.GIFTING as ToolId, dataPoints: ['annualGiftBudget'] },
        ],
      });
    }
  }

  // Large estate without gifting plan
  if (estateValue > 1000000 && !data.giftingPlanner) {
    insights.push({
      id: 'estate-needs-gifting-plan',
      type: 'estate-gifting',
      priority: 'medium',
      title: 'Consider a gifting strategy for your $' + formatNumber(estateValue) + ' estate',
      description: `With an estate valued over $1M, strategic gifting can reduce future estate taxes while providing for family members now. The annual gift exclusion allows tax-free transfers.`,
      potentialImpact: estateValue * 0.1, // Rough 10% estate tax savings estimate
      confidenceScore: 60,
      relatedTools: [TOOL_IDS.LEGACY as ToolId],
      actionItems: [
        'Explore the Gifting Planner tool',
        'Identify beneficiaries and their needs',
        'Consider timing of large gifts',
        'Review estate plan with attorney',
      ],
      dataUsed: [
        { toolId: TOOL_IDS.LEGACY as ToolId, dataPoints: ['totalEstateValue'] },
      ],
    });
  }

  return insights;
}

function analyzeLongevityHealthcareCosts(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  if (!data.longevityPlanner || !data.healthcareCost) return insights;

  const projectedLifespan = data.longevityPlanner.projectedLifespan;
  const planningHorizon = data.longevityPlanner.planningHorizon;
  const annualHealthcare = (data.healthcareCost.monthlyPremium * 12) + data.healthcareCost.annualOutOfPocket;
  const hsaBalance = data.healthcareCost.hsaBalance;

  // Project lifetime healthcare costs
  const lifetimeHealthcareCost = annualHealthcare * planningHorizon;

  // Low HSA relative to projected costs
  if (hsaBalance < 20000 && lifetimeHealthcareCost > 200000) {
    const hsaMaxContribution = 8300; // 2024 family limit with catch-up
    const yearsToRetire = Math.max(0, 65 - (projectedLifespan - planningHorizon));
    const potentialHSAGrowth = hsaMaxContribution * Math.min(yearsToRetire, 10);

    insights.push({
      id: 'longevity-healthcare-funding',
      type: 'longevity-healthcare',
      priority: 'medium',
      title: `Plan for $${formatNumber(lifetimeHealthcareCost)} in lifetime healthcare costs`,
      description: `With a ${planningHorizon}-year planning horizon and current healthcare costs of $${formatNumber(annualHealthcare)}/year, you'll need significant healthcare funding. Your HSA balance of $${formatNumber(hsaBalance)} is a start, but maximizing contributions could add $${formatNumber(potentialHSAGrowth)} in tax-advantaged healthcare savings.`,
      potentialImpact: potentialHSAGrowth * 0.3, // Tax savings estimate
      confidenceScore: 70,
      relatedTools: [TOOL_IDS.LONGEVITY as ToolId, TOOL_IDS.HEALTHCARE as ToolId],
      actionItems: [
        'Maximize HSA contributions annually',
        'Invest HSA funds for long-term growth',
        'Keep receipts for future tax-free reimbursement',
        'Consider long-term care insurance options',
      ],
      dataUsed: [
        { toolId: TOOL_IDS.LONGEVITY as ToolId, dataPoints: ['planningHorizon', 'projectedLifespan'] },
        { toolId: TOOL_IDS.HEALTHCARE as ToolId, dataPoints: ['monthlyPremium', 'annualOutOfPocket', 'hsaBalance'] },
      ],
    });
  }

  return insights;
}

function analyzeGeneralPlanning(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  // Suggest completing profile if less than 50% complete
  if (data.dataCompleteness < 50) {
    const missingCount = 12 - data.toolsWithData.length;

    insights.push({
      id: 'complete-profile',
      type: 'general-planning',
      priority: 'low',
      title: `Complete your retirement profile (${data.dataCompleteness}% done)`,
      description: `You've used ${data.toolsWithData.length} of 12 planning tools. Using more tools helps the AI Coach identify cross-tool optimization opportunities and give you better recommendations.`,
      potentialImpact: 0,
      confidenceScore: 100,
      relatedTools: [],
      actionItems: [
        'Try the Income Estimator to project retirement income',
        'Use Social Security Optimizer for claiming strategy',
        'Explore tax planning with Tax Impact Analyzer',
        'Estimate healthcare costs with Healthcare Cost tool',
      ],
      dataUsed: [],
    });
  }

  return insights;
}

// ============================================
// Helper Functions
// ============================================

function determinePriority(
  value: number,
  criticalThreshold: number,
  highThreshold: number,
  mediumThreshold: number
): InsightPriority {
  if (value >= criticalThreshold) return 'critical';
  if (value >= highThreshold) return 'high';
  if (value >= mediumThreshold) return 'medium';
  return 'low';
}

function sortInsights(insights: CrossToolInsight[]): CrossToolInsight[] {
  const priorityWeight: Record<InsightPriority, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return insights.sort((a, b) => {
    const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.potentialImpact - a.potentialImpact;
  });
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format insights for AI prompt context
 */
export function formatInsightsForAI(insights: CrossToolInsight[]): string {
  if (insights.length === 0) {
    return 'No cross-tool optimization opportunities detected yet. More data from additional tools would help identify opportunities.';
  }

  const lines: string[] = ['## Cross-Tool Optimization Opportunities', ''];

  for (const insight of insights.slice(0, 5)) { // Top 5 for AI context
    lines.push(`### [${insight.priority.toUpperCase()}] ${insight.title}`);
    lines.push(`- Potential Impact: $${formatNumber(insight.potentialImpact)}`);
    lines.push(`- Tools: ${insight.relatedTools.join(', ')}`);
    lines.push(`- ${insight.description}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get count of high-priority insights for badge display
 */
export function getHighPriorityCount(insights: CrossToolInsight[]): number {
  return insights.filter(i => i.priority === 'critical' || i.priority === 'high').length;
}
