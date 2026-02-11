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

  // Income + Retire Abroad (cost-of-living impact)
  insights.push(...analyzeIncomeAbroadImpact(data));

  // Tax + Retire Abroad (international tax implications)
  insights.push(...analyzeTaxAbroadImplications(data));

  // Income + Longevity (drawdown sustainability)
  insights.push(...analyzeIncomeDrawdownSustainability(data));

  // Social Security + Tax (Roth conversion & bracket management)
  insights.push(...analyzeSSTaxStrategy(data));

  // Identity + Volunteer (lifestyle alignment)
  insights.push(...analyzeIdentityVolunteerAlignment(data));

  // Digital Estate + Legacy (estate plan completeness)
  insights.push(...analyzeDigitalLegacyReadiness(data));

  // Income + Healthcare + Longevity (holistic retirement funding)
  insights.push(...analyzeHolisticRetirementFunding(data));

  // Location + Identity + Lifestyle (relocation lifestyle fit)
  insights.push(...analyzeLocationLifestyleFit(data));

  // Gifting + Income (charitable giving capacity)
  insights.push(...analyzeGiftingIncomeCapacity(data));

  // Estate + Tax (estate tax optimization)
  insights.push(...analyzeEstateTaxOptimization(data));

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
// NEW: Income + Retire Abroad (cost-of-living impact)
// ============================================

function analyzeIncomeAbroadImpact(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  if (!data.incomeEstimator || !data.retireAbroad) return insights;

  const totalIncome = data.incomeEstimator.totalAnnualIncome;
  const topCountry = data.retireAbroad.topCountry;
  const monthlyCostOfLiving = data.retireAbroad.monthlyCostOfLiving;
  const annualSavings = data.retireAbroad.annualSavingsVsCurrent;
  const qualityOfLife = data.retireAbroad.qualityOfLifeScore;

  if (topCountry && monthlyCostOfLiving > 0) {
    const annualCostAbroad = monthlyCostOfLiving * 12;
    const incomeAfterExpenses = totalIncome - annualCostAbroad;
    const surplusOrDeficit = incomeAfterExpenses > 0 ? 'surplus' : 'deficit';

    if (annualSavings > 5000) {
      const priority = determinePriority(annualSavings, 25000, 15000, 5000);

      insights.push({
        id: 'income-abroad-cost-of-living',
        type: 'income-abroad',
        priority,
        title: `Moving to ${topCountry} could free up $${formatNumber(annualSavings)}/year`,
        description: `Your retirement income of $${formatNumber(totalIncome)}/year goes much further in ${topCountry}, where the estimated cost of living is $${formatNumber(annualCostAbroad)}/year. This creates a $${formatNumber(Math.abs(incomeAfterExpenses))}/year ${surplusOrDeficit}${qualityOfLife >= 70 ? ` with a quality of life score of ${qualityOfLife}/100` : ''}.`,
        potentialImpact: annualSavings * 20,
        confidenceScore: 70,
        relatedTools: [TOOL_IDS.INCOME_ESTIMATOR as ToolId, TOOL_IDS.RETIRE_ABROAD as ToolId],
        actionItems: [
          `Compare your current US expenses to ${topCountry} cost of living`,
          'Factor in currency exchange risks and inflation differences',
          'Consider how Social Security and pension income transfer abroad',
          'Plan for healthcare coverage in your destination country',
          'Account for travel costs to visit family back home',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.INCOME_ESTIMATOR as ToolId, dataPoints: ['totalAnnualIncome'] },
          { toolId: TOOL_IDS.RETIRE_ABROAD as ToolId, dataPoints: ['topCountry', 'monthlyCostOfLiving', 'annualSavingsVsCurrent'] },
        ],
      });
    }

    // If income barely covers costs abroad, flag it
    if (totalIncome > 0 && annualCostAbroad > totalIncome * 0.85) {
      insights.push({
        id: 'income-abroad-tight-budget',
        type: 'income-abroad',
        priority: 'high',
        title: `Budget may be tight in ${topCountry} on current income`,
        description: `Your annual cost of living in ${topCountry} ($${formatNumber(annualCostAbroad)}) would consume ${Math.round((annualCostAbroad / totalIncome) * 100)}% of your retirement income ($${formatNumber(totalIncome)}). This leaves little room for emergencies, travel, or unexpected expenses.`,
        potentialImpact: annualCostAbroad - totalIncome,
        confidenceScore: 65,
        relatedTools: [TOOL_IDS.INCOME_ESTIMATOR as ToolId, TOOL_IDS.RETIRE_ABROAD as ToolId],
        actionItems: [
          'Look at lower-cost cities within your target country',
          'Explore ways to increase retirement income',
          'Build an emergency fund before relocating',
          'Consider part-time remote work possibilities',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.INCOME_ESTIMATOR as ToolId, dataPoints: ['totalAnnualIncome'] },
          { toolId: TOOL_IDS.RETIRE_ABROAD as ToolId, dataPoints: ['topCountry', 'monthlyCostOfLiving'] },
        ],
      });
    }
  }

  return insights;
}

// ============================================
// NEW: Tax + Retire Abroad (international tax implications)
// ============================================

function analyzeTaxAbroadImplications(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  if (!data.taxAnalyzer || !data.retireAbroad) return insights;

  const currentState = data.taxAnalyzer.currentState;
  const totalTax = data.taxAnalyzer.totalAnnualTax || (data.taxAnalyzer.annualStateTax + data.taxAnalyzer.annualFederalTax);
  const topCountry = data.retireAbroad.topCountry;
  const annualSavings = data.retireAbroad.annualSavingsVsCurrent;
  const isHighTaxState = HIGH_TAX_STATES.includes(currentState);

  if (topCountry && totalTax > 10000) {
    const stateTaxSaved = isHighTaxState ? data.taxAnalyzer.annualStateTax : 0;
    const combinedSavings = annualSavings + stateTaxSaved;

    if (combinedSavings > 10000) {
      insights.push({
        id: 'tax-abroad-combined',
        type: 'tax-abroad',
        priority: determinePriority(combinedSavings, 40000, 25000, 10000),
        title: `Moving abroad could eliminate $${formatNumber(stateTaxSaved)}/year in state taxes`,
        description: `By moving from ${currentState} to ${topCountry}, you would no longer owe state income tax ($${formatNumber(data.taxAnalyzer.annualStateTax)}/year). Combined with lower cost of living savings of $${formatNumber(annualSavings)}/year, the total financial benefit could be $${formatNumber(combinedSavings)}/year. Note: US citizens still owe federal taxes on worldwide income, but Foreign Earned Income Exclusion and tax treaties may apply.`,
        potentialImpact: combinedSavings * 15,
        confidenceScore: 60,
        relatedTools: [TOOL_IDS.TAX_IMPACT as ToolId, TOOL_IDS.RETIRE_ABROAD as ToolId],
        actionItems: [
          'Research US-' + topCountry + ' tax treaty provisions',
          'Understand FBAR and FATCA reporting requirements for Americans abroad',
          'Consult an international tax specialist',
          'Consider Foreign Tax Credit to avoid double taxation',
          'Plan for Social Security taxation while abroad',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.TAX_IMPACT as ToolId, dataPoints: ['currentState', 'annualStateTax', 'totalAnnualTax'] },
          { toolId: TOOL_IDS.RETIRE_ABROAD as ToolId, dataPoints: ['topCountry', 'annualSavingsVsCurrent'] },
        ],
      });
    }
  }

  return insights;
}

// ============================================
// NEW: Income + Longevity (drawdown sustainability)
// ============================================

function analyzeIncomeDrawdownSustainability(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  if (!data.incomeEstimator || !data.longevityPlanner) return insights;

  const totalIncome = data.incomeEstimator.totalAnnualIncome;
  const investmentIncome = data.incomeEstimator.investmentIncome;
  const planningHorizon = data.longevityPlanner.planningHorizon;
  const projectedLifespan = data.longevityPlanner.projectedLifespan;

  // If investment income is a large portion of total, drawdown risk matters
  if (investmentIncome > 0 && totalIncome > 0) {
    const investmentPortion = investmentIncome / totalIncome;
    const lifetimeInvestmentNeeded = investmentIncome * planningHorizon;

    if (investmentPortion > 0.3 && planningHorizon > 20) {
      insights.push({
        id: 'income-longevity-drawdown',
        type: 'income-longevity',
        priority: investmentPortion > 0.5 ? 'high' : 'medium',
        title: `${Math.round(investmentPortion * 100)}% of income relies on investments over ${planningHorizon} years`,
        description: `You depend on $${formatNumber(investmentIncome)}/year from investments, which represents ${Math.round(investmentPortion * 100)}% of your income. Over your ${planningHorizon}-year planning horizon (to age ${projectedLifespan}), you'll need approximately $${formatNumber(lifetimeInvestmentNeeded)} from investments alone. A sustainable withdrawal rate (3-4%) is critical to avoid outliving your savings.`,
        potentialImpact: lifetimeInvestmentNeeded,
        confidenceScore: 75,
        relatedTools: [TOOL_IDS.INCOME_ESTIMATOR as ToolId, TOOL_IDS.LONGEVITY as ToolId],
        actionItems: [
          'Review your current withdrawal rate against the 4% rule',
          'Consider annuities to guarantee a portion of income',
          'Adjust asset allocation for longevity risk',
          'Build a cash buffer for market downturns (bucket strategy)',
          'Re-evaluate spending if markets decline significantly',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.INCOME_ESTIMATOR as ToolId, dataPoints: ['totalAnnualIncome', 'investmentIncome'] },
          { toolId: TOOL_IDS.LONGEVITY as ToolId, dataPoints: ['planningHorizon', 'projectedLifespan'] },
        ],
      });
    }
  }

  // Low total income relative to long planning horizon
  if (totalIncome > 0 && totalIncome < 40000 && planningHorizon > 25) {
    insights.push({
      id: 'income-longevity-low-income',
      type: 'income-longevity',
      priority: 'high',
      title: `$${formatNumber(totalIncome)}/year may be stretched thin over ${planningHorizon} years`,
      description: `Your projected retirement income of $${formatNumber(totalIncome)}/year needs to sustain you for ${planningHorizon} years. With inflation averaging 3%, your purchasing power will decrease by roughly half over 25 years. Consider strategies to supplement income or reduce expenses.`,
      potentialImpact: totalIncome * planningHorizon * 0.3, // inflation impact estimate
      confidenceScore: 70,
      relatedTools: [TOOL_IDS.INCOME_ESTIMATOR as ToolId, TOOL_IDS.LONGEVITY as ToolId],
      actionItems: [
        'Explore retiring abroad for lower cost of living',
        'Use Social Security Optimizer to maximize benefits',
        'Consider relocating to a tax-friendly state',
        'Look into part-time work in early retirement years',
      ],
      dataUsed: [
        { toolId: TOOL_IDS.INCOME_ESTIMATOR as ToolId, dataPoints: ['totalAnnualIncome'] },
        { toolId: TOOL_IDS.LONGEVITY as ToolId, dataPoints: ['planningHorizon'] },
      ],
    });
  }

  return insights;
}

// ============================================
// NEW: Social Security + Tax (Roth conversion & bracket management)
// ============================================

function analyzeSSTaxStrategy(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  if (!data.ssOptimizer || !data.taxAnalyzer) return insights;

  const currentClaimAge = data.ssOptimizer.currentClaimAge;
  const monthlyBenefit = data.ssOptimizer.monthlyBenefitAtCurrent;
  const annualSSIncome = monthlyBenefit * 12;
  const effectiveTaxRate = data.taxAnalyzer.effectiveTaxRate;
  const federalTax = data.taxAnalyzer.annualFederalTax;

  // SS income bracket management — if SS + other income pushes tax rate up
  if (annualSSIncome > 25000 && effectiveTaxRate > 15) {
    insights.push({
      id: 'ss-tax-bracket-management',
      type: 'ss-tax',
      priority: 'medium',
      title: 'Social Security may increase your tax bracket',
      description: `Your estimated Social Security of $${formatNumber(annualSSIncome)}/year combined with other income puts your effective tax rate at ${effectiveTaxRate}%. Up to 85% of Social Security benefits can be taxable. Consider Roth conversions before claiming SS to reduce future tax burden, or plan withdrawals strategically across tax-deferred and tax-free accounts.`,
      potentialImpact: annualSSIncome * 0.85 * (effectiveTaxRate / 100) * 15,
      confidenceScore: 70,
      relatedTools: [TOOL_IDS.SOCIAL_SECURITY as ToolId, TOOL_IDS.TAX_IMPACT as ToolId],
      actionItems: [
        'Consider Roth conversions in years before you claim Social Security',
        'Coordinate withdrawal strategy across 401(k), IRA, and Roth accounts',
        'Model the tax impact of different claiming ages',
        'Plan for Required Minimum Distributions (RMDs) at age 73+',
        'Consider qualified charitable distributions (QCDs) from IRAs',
      ],
      dataUsed: [
        { toolId: TOOL_IDS.SOCIAL_SECURITY as ToolId, dataPoints: ['currentClaimAge', 'monthlyBenefitAtCurrent'] },
        { toolId: TOOL_IDS.TAX_IMPACT as ToolId, dataPoints: ['effectiveTaxRate', 'annualFederalTax'] },
      ],
    });
  }

  // Delaying SS claim could allow Roth conversions in lower brackets
  if (currentClaimAge <= 65 && federalTax > 5000) {
    const yearsToDelay = 70 - currentClaimAge;
    const conversionWindow = yearsToDelay;

    if (conversionWindow >= 3) {
      insights.push({
        id: 'ss-tax-roth-conversion-window',
        type: 'ss-tax',
        priority: 'medium',
        title: `${conversionWindow}-year Roth conversion window before claiming SS`,
        description: `If you delay Social Security from ${currentClaimAge} to 70, you have a ${conversionWindow}-year window with lower income to do Roth conversions at reduced tax rates. This can significantly reduce your lifetime tax burden and eliminate RMD headaches later.`,
        potentialImpact: federalTax * conversionWindow * 0.3,
        confidenceScore: 65,
        relatedTools: [TOOL_IDS.SOCIAL_SECURITY as ToolId, TOOL_IDS.TAX_IMPACT as ToolId],
        actionItems: [
          'Calculate how much to convert each year to stay in current bracket',
          'Consider partial Roth conversions to fill lower brackets',
          'Factor in ACA subsidy cliffs if on marketplace insurance',
          'Coordinate with your tax advisor for optimal conversion amounts',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.SOCIAL_SECURITY as ToolId, dataPoints: ['currentClaimAge'] },
          { toolId: TOOL_IDS.TAX_IMPACT as ToolId, dataPoints: ['annualFederalTax'] },
        ],
      });
    }
  }

  return insights;
}

// ============================================
// NEW: Identity + Volunteer (lifestyle alignment)
// ============================================

function analyzeIdentityVolunteerAlignment(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  if (!data.identityBuilder || !data.volunteerMatcher) return insights;

  const purposeScore = data.identityBuilder.purposeScore;
  const weeklyHours = data.volunteerMatcher.weeklyHoursCommitted;
  const matchedOpportunities = data.volunteerMatcher.matchedOpportunities;
  const goals = data.identityBuilder.retirementGoals;
  const skills = data.volunteerMatcher.skillsToShare;

  // Good alignment between identity goals and volunteer engagement
  if (purposeScore > 60 && weeklyHours > 0 && matchedOpportunities > 0) {
    insights.push({
      id: 'identity-volunteer-aligned',
      type: 'identity-volunteer',
      priority: 'low',
      title: 'Your volunteer work aligns well with retirement goals',
      description: `Your purpose score of ${purposeScore}/100 combined with ${weeklyHours} hours/week of volunteering shows strong alignment between your retirement identity and community engagement. Research shows retirees with purpose score above 60 report significantly higher life satisfaction.${skills.length > 0 ? ` Your skills in ${skills.slice(0, 3).join(', ')} are making an impact.` : ''}`,
      potentialImpact: 0,
      confidenceScore: 80,
      relatedTools: [TOOL_IDS.IDENTITY_BUILDER as ToolId, TOOL_IDS.VOLUNTEER as ToolId],
      actionItems: [
        'Continue building on your current volunteer commitments',
        'Consider mentoring roles that leverage your expertise',
        'Look for volunteer opportunities when traveling or abroad',
        'Document your impact for personal fulfillment tracking',
      ],
      dataUsed: [
        { toolId: TOOL_IDS.IDENTITY_BUILDER as ToolId, dataPoints: ['purposeScore', 'retirementGoals'] },
        { toolId: TOOL_IDS.VOLUNTEER as ToolId, dataPoints: ['weeklyHoursCommitted', 'matchedOpportunities'] },
      ],
    });
  }

  // High purpose score but no volunteer engagement
  if (purposeScore > 50 && weeklyHours === 0 && matchedOpportunities > 0) {
    insights.push({
      id: 'identity-volunteer-opportunity',
      type: 'identity-volunteer',
      priority: 'medium',
      title: `${matchedOpportunities} volunteer matches found for your interests`,
      description: `Your Identity Builder shows clear retirement goals${goals.length > 0 ? ` including "${goals[0]}"` : ''}, and the Volunteer Matcher found ${matchedOpportunities} opportunities matching your profile. Getting involved can boost life satisfaction, maintain social connections, and give structure to your weeks.`,
      potentialImpact: 0,
      confidenceScore: 75,
      relatedTools: [TOOL_IDS.IDENTITY_BUILDER as ToolId, TOOL_IDS.VOLUNTEER as ToolId],
      actionItems: [
        'Review your matched volunteer opportunities',
        'Start with a small weekly commitment (2-4 hours)',
        'Choose activities aligned with your top retirement priorities',
        'Consider skills-based volunteering for maximum impact',
      ],
      dataUsed: [
        { toolId: TOOL_IDS.IDENTITY_BUILDER as ToolId, dataPoints: ['purposeScore', 'retirementGoals'] },
        { toolId: TOOL_IDS.VOLUNTEER as ToolId, dataPoints: ['matchedOpportunities', 'weeklyHoursCommitted'] },
      ],
    });
  }

  return insights;
}

// ============================================
// NEW: Digital Estate + Legacy (estate plan completeness)
// ============================================

function analyzeDigitalLegacyReadiness(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  if (!data.estateManager && !data.legacyVisualizer) return insights;

  // Has legacy plan but no digital estate
  if (data.legacyVisualizer && !data.estateManager) {
    const estateValue = data.legacyVisualizer.totalEstateValue;
    if (estateValue > 100000) {
      insights.push({
        id: 'digital-legacy-missing-digital',
        type: 'digital-legacy',
        priority: 'medium',
        title: 'Your digital estate needs attention',
        description: `You have a legacy plan covering $${formatNumber(estateValue)} in assets, but haven't documented your digital estate. Digital accounts (banking, investments, social media, email, subscriptions) are increasingly important for heirs to manage. Without documentation, beneficiaries may struggle to access or close accounts.`,
        potentialImpact: estateValue * 0.02,
        confidenceScore: 80,
        relatedTools: [TOOL_IDS.LEGACY as ToolId, TOOL_IDS.DIGITAL_ESTATE as ToolId],
        actionItems: [
          'Use the Digital Estate Manager to inventory online accounts',
          'Document login credentials securely',
          'Designate a digital executor',
          'Review social media legacy settings',
          'Set up trusted contacts for major platforms',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.LEGACY as ToolId, dataPoints: ['totalEstateValue'] },
        ],
      });
    }
  }

  // Has both — check completeness
  if (data.estateManager && data.legacyVisualizer) {
    const digitalAssets = data.estateManager.digitalAssetsCount;
    const docsUploaded = data.estateManager.documentsUploaded;
    const estatePlanComplete = data.legacyVisualizer.estatePlanComplete;

    if (digitalAssets < 5 && !estatePlanComplete) {
      insights.push({
        id: 'digital-legacy-incomplete',
        type: 'digital-legacy',
        priority: 'medium',
        title: 'Both your legacy and digital estate plans need completion',
        description: `Your estate plan is incomplete, and you've only documented ${digitalAssets} digital assets with ${docsUploaded} documents uploaded. Consider this a priority — comprehensive estate planning reduces stress for loved ones and can prevent costly probate issues.`,
        potentialImpact: data.legacyVisualizer.totalEstateValue * 0.05,
        confidenceScore: 75,
        relatedTools: [TOOL_IDS.LEGACY as ToolId, TOOL_IDS.DIGITAL_ESTATE as ToolId],
        actionItems: [
          'Complete your estate plan checklist in Legacy Visualizer',
          'Add remaining digital accounts to Digital Estate Manager',
          'Upload key documents (will, trust, power of attorney)',
          'Review and update beneficiary designations',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.LEGACY as ToolId, dataPoints: ['estatePlanComplete', 'totalEstateValue'] },
          { toolId: TOOL_IDS.DIGITAL_ESTATE as ToolId, dataPoints: ['digitalAssetsCount', 'documentsUploaded'] },
        ],
      });
    }

    if (digitalAssets >= 10 && estatePlanComplete) {
      insights.push({
        id: 'digital-legacy-well-prepared',
        type: 'digital-legacy',
        priority: 'low',
        title: 'Your estate and digital plans are well-organized',
        description: `Great work! You've documented ${digitalAssets} digital assets, uploaded ${docsUploaded} documents, and your estate plan is marked as complete. Consider reviewing annually to keep everything current.`,
        potentialImpact: 0,
        confidenceScore: 90,
        relatedTools: [TOOL_IDS.LEGACY as ToolId, TOOL_IDS.DIGITAL_ESTATE as ToolId],
        actionItems: [
          'Schedule an annual review of all estate documents',
          'Update digital accounts as you add or close services',
          'Confirm beneficiaries are still accurate',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.LEGACY as ToolId, dataPoints: ['estatePlanComplete'] },
          { toolId: TOOL_IDS.DIGITAL_ESTATE as ToolId, dataPoints: ['digitalAssetsCount', 'documentsUploaded'] },
        ],
      });
    }
  }

  return insights;
}

// ============================================
// NEW: Income + Healthcare + Longevity (holistic retirement funding)
// ============================================

function analyzeHolisticRetirementFunding(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  // Need at least 2 of the 3 data sources
  const has = [!!data.incomeEstimator, !!data.healthcareCost, !!data.longevityPlanner];
  if (has.filter(Boolean).length < 2) return insights;

  if (data.incomeEstimator && data.healthcareCost && data.longevityPlanner) {
    const totalIncome = data.incomeEstimator.totalAnnualIncome;
    const annualHealthcare = (data.healthcareCost.monthlyPremium * 12) + data.healthcareCost.annualOutOfPocket;
    const planningHorizon = data.longevityPlanner.planningHorizon;
    const healthcarePortion = annualHealthcare / totalIncome;

    if (healthcarePortion > 0.2 && planningHorizon > 15) {
      const lifetimeHealthcareTotal = annualHealthcare * planningHorizon;
      const lifetimeIncomeTotal = totalIncome * planningHorizon;

      insights.push({
        id: 'holistic-healthcare-burden',
        type: 'holistic-income',
        priority: determinePriority(healthcarePortion * 100, 40, 30, 20),
        title: `Healthcare consumes ${Math.round(healthcarePortion * 100)}% of your retirement income`,
        description: `At $${formatNumber(annualHealthcare)}/year, healthcare takes ${Math.round(healthcarePortion * 100)}% of your $${formatNumber(totalIncome)} annual income. Over ${planningHorizon} years, that's $${formatNumber(lifetimeHealthcareTotal)} of your $${formatNumber(lifetimeIncomeTotal)} total income going to healthcare. Consider strategies to reduce this burden.`,
        potentialImpact: lifetimeHealthcareTotal,
        confidenceScore: 75,
        relatedTools: [
          TOOL_IDS.INCOME_ESTIMATOR as ToolId,
          TOOL_IDS.HEALTHCARE as ToolId,
          TOOL_IDS.LONGEVITY as ToolId,
        ],
        actionItems: [
          'Compare Medicare Advantage vs Medigap plans for cost savings',
          'Maximize HSA contributions before Medicare eligibility',
          'Consider retiring abroad where healthcare costs less',
          'Investigate long-term care insurance while premiums are lower',
          'Build a dedicated healthcare reserve fund',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.INCOME_ESTIMATOR as ToolId, dataPoints: ['totalAnnualIncome'] },
          { toolId: TOOL_IDS.HEALTHCARE as ToolId, dataPoints: ['monthlyPremium', 'annualOutOfPocket'] },
          { toolId: TOOL_IDS.LONGEVITY as ToolId, dataPoints: ['planningHorizon'] },
        ],
      });
    }
  }

  return insights;
}

// ============================================
// NEW: Location + Identity + Lifestyle (relocation lifestyle fit)
// ============================================

function analyzeLocationLifestyleFit(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  // Check abroad + identity fit
  if (data.retireAbroad && data.identityBuilder) {
    const topCountry = data.retireAbroad.topCountry;
    const qualityOfLife = data.retireAbroad.qualityOfLifeScore;
    const goals = data.identityBuilder.retirementGoals;
    const activities = data.identityBuilder.activityPreferences;

    if (topCountry && qualityOfLife > 0) {
      // Check if volunteering is a goal but abroad may limit options
      if (data.volunteerMatcher && data.volunteerMatcher.weeklyHoursCommitted > 5) {
        insights.push({
          id: 'location-volunteer-abroad',
          type: 'location-lifestyle',
          priority: 'medium',
          title: `Plan volunteer activities before moving to ${topCountry}`,
          description: `You currently commit ${data.volunteerMatcher.weeklyHoursCommitted} hours/week to volunteering, which is an important part of your retirement identity. Moving to ${topCountry} will require finding new volunteer opportunities. Research NGOs, expat community groups, and international organizations in your destination.`,
          potentialImpact: 0,
          confidenceScore: 65,
          relatedTools: [
            TOOL_IDS.RETIRE_ABROAD as ToolId,
            TOOL_IDS.IDENTITY_BUILDER as ToolId,
            TOOL_IDS.VOLUNTEER as ToolId,
          ],
          actionItems: [
            `Research volunteer organizations in ${topCountry}`,
            'Connect with expat communities online before moving',
            'Consider remote volunteering with US-based organizations',
            'Look into teaching English or skills-sharing programs',
          ],
          dataUsed: [
            { toolId: TOOL_IDS.RETIRE_ABROAD as ToolId, dataPoints: ['topCountry'] },
            { toolId: TOOL_IDS.VOLUNTEER as ToolId, dataPoints: ['weeklyHoursCommitted'] },
            { toolId: TOOL_IDS.IDENTITY_BUILDER as ToolId, dataPoints: ['retirementGoals'] },
          ],
        });
      }

      // Lifestyle quality insight
      if (qualityOfLife >= 70 && goals.length > 0) {
        insights.push({
          id: 'location-lifestyle-quality',
          type: 'location-lifestyle',
          priority: 'low',
          title: `${topCountry} scores well for your lifestyle goals`,
          description: `${topCountry} has a quality of life score of ${qualityOfLife}/100, which aligns well with your retirement priorities${goals.length > 0 ? ` including "${goals[0]}"` : ''}. Consider how the local culture, climate, and community support your vision for retirement.`,
          potentialImpact: 0,
          confidenceScore: 60,
          relatedTools: [TOOL_IDS.RETIRE_ABROAD as ToolId, TOOL_IDS.IDENTITY_BUILDER as ToolId],
          actionItems: [
            `Visit ${topCountry} for an extended trial stay (1-3 months)`,
            'Connect with expat communities to understand daily life',
            'Research activity and hobby availability',
            'Consider language and cultural adjustment factors',
          ],
          dataUsed: [
            { toolId: TOOL_IDS.RETIRE_ABROAD as ToolId, dataPoints: ['topCountry', 'qualityOfLifeScore'] },
            { toolId: TOOL_IDS.IDENTITY_BUILDER as ToolId, dataPoints: ['retirementGoals'] },
          ],
        });
      }
    }
  }

  // State relocation + identity fit
  if (data.stateRelocator && data.identityBuilder && data.stateRelocator.topRecommendation) {
    const targetState = data.stateRelocator.topRecommendation;
    const activities = data.identityBuilder.activityPreferences;

    if (activities.length > 0) {
      insights.push({
        id: 'state-lifestyle-fit',
        type: 'location-lifestyle',
        priority: 'low',
        title: `Consider if ${targetState} supports your lifestyle preferences`,
        description: `Your top relocation match is ${targetState} for financial reasons, but also consider whether it supports your activity preferences: ${activities.slice(0, 3).join(', ')}. The best retirement location balances financial benefits with lifestyle satisfaction.`,
        potentialImpact: 0,
        confidenceScore: 60,
        relatedTools: [TOOL_IDS.STATE_RELOCATE as ToolId, TOOL_IDS.IDENTITY_BUILDER as ToolId],
        actionItems: [
          `Research recreational and cultural offerings in ${targetState}`,
          'Visit potential cities or towns before committing',
          'Connect with local retirement communities',
          'Consider proximity to family and healthcare facilities',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.STATE_RELOCATE as ToolId, dataPoints: ['topRecommendation'] },
          { toolId: TOOL_IDS.IDENTITY_BUILDER as ToolId, dataPoints: ['activityPreferences'] },
        ],
      });
    }
  }

  return insights;
}

// ============================================
// NEW: Gifting + Income (charitable giving capacity)
// ============================================

function analyzeGiftingIncomeCapacity(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  if (!data.giftingPlanner || !data.incomeEstimator) return insights;

  const totalIncome = data.incomeEstimator.totalAnnualIncome;
  const giftBudget = data.giftingPlanner.annualGiftBudget;
  const recipientCount = data.giftingPlanner.recipientCount;
  const education529 = data.giftingPlanner.educationFunds529;

  if (totalIncome > 0 && giftBudget > 0) {
    const giftingPortion = giftBudget / totalIncome;

    // High gifting relative to income
    if (giftingPortion > 0.15) {
      insights.push({
        id: 'gifting-income-high-ratio',
        type: 'gifting-income',
        priority: 'medium',
        title: `Gifting represents ${Math.round(giftingPortion * 100)}% of your retirement income`,
        description: `You're planning to gift $${formatNumber(giftBudget)}/year to ${recipientCount} recipients from a $${formatNumber(totalIncome)}/year income. While generous, make sure this is sustainable over your planning horizon. Consider frontloading gifts in early retirement when you may have more financial flexibility.`,
        potentialImpact: giftBudget * 10,
        confidenceScore: 70,
        relatedTools: [TOOL_IDS.GIFTING as ToolId, TOOL_IDS.INCOME_ESTIMATOR as ToolId],
        actionItems: [
          'Stress-test your budget with gifting factored in',
          'Consider 529 superfunding for education gifts',
          'Use IRA qualified charitable distributions (QCDs) after 70½',
          'Ensure gifting doesn\'t jeopardize your own longevity needs',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.GIFTING as ToolId, dataPoints: ['annualGiftBudget', 'recipientCount'] },
          { toolId: TOOL_IDS.INCOME_ESTIMATOR as ToolId, dataPoints: ['totalAnnualIncome'] },
        ],
      });
    }

    // Has income and 529 plans — tax benefit reminder
    if (education529 > 0) {
      insights.push({
        id: 'gifting-income-529-benefit',
        type: 'gifting-income',
        priority: 'low',
        title: `$${formatNumber(education529)} in 529 plans reduces your taxable estate`,
        description: `Your 529 education fund contributions of $${formatNumber(education529)} not only support education but also reduce your taxable estate. You can superfund 529 plans with 5 years of annual exclusion gifts up front ($${formatNumber(18000 * 5)} per beneficiary) to maximize estate tax savings.`,
        potentialImpact: education529 * 0.4,
        confidenceScore: 70,
        relatedTools: [TOOL_IDS.GIFTING as ToolId, TOOL_IDS.INCOME_ESTIMATOR as ToolId],
        actionItems: [
          'Consider superfunding 529 plans for grandchildren',
          'Review 529 state tax deduction eligibility',
          'Explore direct education expense payments (unlimited exclusion)',
          'Coordinate with overall estate planning strategy',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.GIFTING as ToolId, dataPoints: ['educationFunds529'] },
          { toolId: TOOL_IDS.INCOME_ESTIMATOR as ToolId, dataPoints: ['totalAnnualIncome'] },
        ],
      });
    }
  }

  return insights;
}

// ============================================
// NEW: Estate + Tax (estate tax optimization)
// ============================================

function analyzeEstateTaxOptimization(data: AggregatedToolData): CrossToolInsight[] {
  const insights: CrossToolInsight[] = [];

  if (!data.legacyVisualizer || !data.taxAnalyzer) return insights;

  const estateValue = data.legacyVisualizer.totalEstateValue;
  const charitableGiving = data.legacyVisualizer.charitableGivingPlanned;
  const effectiveTaxRate = data.taxAnalyzer.effectiveTaxRate;

  // Large estate with tax implications
  // 2024 federal estate tax exemption is ~$13.61M
  if (estateValue > 5000000) {
    const potentialEstateTax = estateValue > 13610000
      ? (estateValue - 13610000) * 0.4
      : 0;

    if (potentialEstateTax > 0) {
      insights.push({
        id: 'estate-tax-exposure',
        type: 'estate-tax',
        priority: 'critical',
        title: `Potential $${formatNumber(potentialEstateTax)} in estate taxes`,
        description: `Your estate of $${formatNumber(estateValue)} exceeds the federal exemption of $13.61M. Without planning, approximately $${formatNumber(potentialEstateTax)} could go to estate taxes (40% rate on excess). Strategic gifting, trusts, and charitable planning can significantly reduce this exposure.`,
        potentialImpact: potentialEstateTax,
        confidenceScore: 75,
        relatedTools: [TOOL_IDS.LEGACY as ToolId, TOOL_IDS.TAX_IMPACT as ToolId],
        actionItems: [
          'Consult an estate planning attorney immediately',
          'Maximize annual gift exclusions to reduce estate value',
          'Consider irrevocable life insurance trusts (ILITs)',
          'Explore charitable remainder trusts (CRTs)',
          'Review the sunset of current exemption levels (after 2025)',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.LEGACY as ToolId, dataPoints: ['totalEstateValue'] },
          { toolId: TOOL_IDS.TAX_IMPACT as ToolId, dataPoints: ['effectiveTaxRate'] },
        ],
      });
    }

    // Charitable giving as estate reduction strategy
    if (charitableGiving > 0 && estateValue > 5000000) {
      const taxBenefit = charitableGiving * (effectiveTaxRate / 100);

      insights.push({
        id: 'estate-charitable-strategy',
        type: 'estate-tax',
        priority: 'medium',
        title: `Charitable giving of $${formatNumber(charitableGiving)} provides dual tax benefit`,
        description: `Your planned charitable giving of $${formatNumber(charitableGiving)} not only reduces your estate value but also generates an income tax deduction worth approximately $${formatNumber(taxBenefit)}/year at your ${effectiveTaxRate}% effective rate. Consider donor-advised funds or charitable remainder trusts for maximum flexibility.`,
        potentialImpact: taxBenefit * 10 + charitableGiving * 0.4,
        confidenceScore: 70,
        relatedTools: [TOOL_IDS.LEGACY as ToolId, TOOL_IDS.TAX_IMPACT as ToolId, TOOL_IDS.GIFTING as ToolId],
        actionItems: [
          'Set up a donor-advised fund for strategic timing of deductions',
          'Consider donating appreciated assets instead of cash',
          'Explore qualified charitable distributions from IRAs',
          'Review charitable remainder trust options',
        ],
        dataUsed: [
          { toolId: TOOL_IDS.LEGACY as ToolId, dataPoints: ['charitableGivingPlanned', 'totalEstateValue'] },
          { toolId: TOOL_IDS.TAX_IMPACT as ToolId, dataPoints: ['effectiveTaxRate'] },
        ],
      });
    }
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

  for (const insight of insights.slice(0, 10)) { // Top 10 for AI context
    lines.push(`### [${insight.priority.toUpperCase()}] ${insight.title}`);
    lines.push(`- Potential Impact: $${formatNumber(insight.potentialImpact)}`);
    lines.push(`- Tools: ${insight.relatedTools.join(', ')}`);
    lines.push(`- ${insight.description}`);
    if (insight.actionItems.length > 0) {
      lines.push(`- Key Actions: ${insight.actionItems.slice(0, 3).join('; ')}`);
    }
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
