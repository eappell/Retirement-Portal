/**
 * Data Aggregation Service
 *
 * Fetches data from all tools via PocketBase proxy and transforms
 * it into a normalized structure for cross-tool analysis.
 */

import { loadAllToolData, TOOL_IDS } from './pocketbaseDataService';
import type {
  AggregatedToolData,
  IncomeEstimatorData,
  SSOptimizerData,
  TaxAnalyzerData,
  HealthcareCostData,
  RetireAbroadData,
  StateRelocatorData,
  LongevityPlannerData,
  IdentityBuilderData,
  VolunteerMatcherData,
  LegacyVisualizerData,
  GiftingPlannerData,
  EstateManagerData,
  ToolId,
  RawToolDataMap,
} from './types/aggregatedToolData';

const TOTAL_TOOLS = 12;

/**
 * Aggregate all tool data from PocketBase into a normalized structure
 */
export async function aggregateAllToolData(
  authToken: string
): Promise<AggregatedToolData> {
  let rawData: RawToolDataMap = {};

  try {
    console.log('[DataAggregation] Fetching data from proxy...');
    rawData = await loadAllToolData(authToken);
    console.log('[DataAggregation] Raw data received:', Object.keys(rawData));
  } catch (error) {
    console.error('[DataAggregation] Failed to load tool data from proxy:', error);
    // Return empty aggregated data if proxy is unavailable
  }

  const toolsWithData: ToolId[] = [];
  const lastUpdated: Record<string, string> = {};

  // Transform each tool's data
  const incomeEstimator = transformIncomeEstimator(rawData, toolsWithData, lastUpdated);
  const ssOptimizer = transformSSOptimizer(rawData, toolsWithData, lastUpdated);
  const taxAnalyzer = transformTaxAnalyzer(rawData, toolsWithData, lastUpdated);
  const healthcareCost = transformHealthcareCost(rawData, toolsWithData, lastUpdated);
  const retireAbroad = transformRetireAbroad(rawData, toolsWithData, lastUpdated);
  const stateRelocator = transformStateRelocator(rawData, toolsWithData, lastUpdated);
  const longevityPlanner = transformLongevityPlanner(rawData, toolsWithData, lastUpdated);
  const identityBuilder = transformIdentityBuilder(rawData, toolsWithData, lastUpdated);
  const volunteerMatcher = transformVolunteerMatcher(rawData, toolsWithData, lastUpdated);
  const legacyVisualizer = transformLegacyVisualizer(rawData, toolsWithData, lastUpdated);
  const giftingPlanner = transformGiftingPlanner(rawData, toolsWithData, lastUpdated);
  const estateManager = transformEstateManager(rawData, toolsWithData, lastUpdated);

  // Calculate data completeness
  const dataCompleteness = Math.round((toolsWithData.length / TOTAL_TOOLS) * 100);

  return {
    incomeEstimator,
    ssOptimizer,
    taxAnalyzer,
    healthcareCost,
    retireAbroad,
    stateRelocator,
    longevityPlanner,
    identityBuilder,
    volunteerMatcher,
    legacyVisualizer,
    giftingPlanner,
    estateManager,
    toolsWithData: toolsWithData as ToolId[],
    dataCompleteness,
    lastUpdated: lastUpdated as Record<ToolId, string>,
    lastRefreshed: new Date().toISOString(),
  };
}

// ============================================
// Transform Functions for Each Tool
// ============================================

function transformIncomeEstimator(
  rawData: RawToolDataMap,
  toolsWithData: ToolId[],
  lastUpdated: Record<string, string>
): IncomeEstimatorData | undefined {
  const record = rawData[TOOL_IDS.INCOME_ESTIMATOR];
  if (!record?.data) return undefined;

  const data = record.data as Record<string, unknown>;
  toolsWithData.push(TOOL_IDS.INCOME_ESTIMATOR as ToolId);
  lastUpdated[TOOL_IDS.INCOME_ESTIMATOR] = record.created;

  return {
    totalAnnualIncome: toNumber(data.totalIncome) || toNumber(data.totalAnnualIncome) || 0,
    socialSecurityIncome: toNumber(data.socialSecurity) || toNumber(data.socialSecurityIncome) || 0,
    pensionIncome: toNumber(data.pension) || toNumber(data.pensionIncome) || 0,
    investmentIncome: toNumber(data.investments) || toNumber(data.investmentIncome) || 0,
    otherIncome: toNumber(data.otherIncome) || 0,
    scenarios: Array.isArray(data.scenarios) ? data.scenarios as IncomeEstimatorData['scenarios'] : undefined,
    activeScenarioId: toString(data.activeScenario) || toString(data.activeScenarioId),
  };
}

function transformSSOptimizer(
  rawData: RawToolDataMap,
  toolsWithData: ToolId[],
  lastUpdated: Record<string, string>
): SSOptimizerData | undefined {
  const record = rawData[TOOL_IDS.SOCIAL_SECURITY];
  if (!record?.data) return undefined;

  const data = record.data as Record<string, unknown>;
  toolsWithData.push(TOOL_IDS.SOCIAL_SECURITY as ToolId);
  lastUpdated[TOOL_IDS.SOCIAL_SECURITY] = record.created;

  return {
    currentClaimAge: toNumber(data.claimAge) || toNumber(data.currentClaimAge) || 62,
    optimalClaimAge: toNumber(data.optimalClaimAge) || 70,
    monthlyBenefitAtCurrent: toNumber(data.estimatedBenefit) || toNumber(data.monthlyBenefitAtCurrent) || 0,
    monthlyBenefitAtOptimal: toNumber(data.monthlyBenefitAtOptimal) || 0,
    lifetimeOptimizationPotential: toNumber(data.optimizationPotential) || toNumber(data.lifetimeOptimizationPotential) || 0,
    spousalStrategy: toString(data.spousalStrategy),
    spousalBenefit: toNumber(data.spousalBenefit),
  };
}

function transformTaxAnalyzer(
  rawData: RawToolDataMap,
  toolsWithData: ToolId[],
  lastUpdated: Record<string, string>
): TaxAnalyzerData | undefined {
  const record = rawData[TOOL_IDS.TAX_IMPACT];
  if (!record?.data) return undefined;

  const data = record.data as Record<string, unknown>;
  toolsWithData.push(TOOL_IDS.TAX_IMPACT as ToolId);
  lastUpdated[TOOL_IDS.TAX_IMPACT] = record.created;

  return {
    currentState: toString(data.state) || toString(data.currentState) || '',
    effectiveTaxRate: toNumber(data.effectiveTaxRate) || 0,
    annualStateTax: toNumber(data.annualTax) || toNumber(data.annualStateTax) || 0,
    annualFederalTax: toNumber(data.federalTax) || toNumber(data.annualFederalTax) || 0,
    totalAnnualTax: toNumber(data.totalTax) || toNumber(data.totalAnnualTax) || 0,
    potentialSavingsByState: (data.potentialSavings as Record<string, number>) ||
      (data.potentialSavingsByState as Record<string, number>) || {},
  };
}

function transformHealthcareCost(
  rawData: RawToolDataMap,
  toolsWithData: ToolId[],
  lastUpdated: Record<string, string>
): HealthcareCostData | undefined {
  const record = rawData[TOOL_IDS.HEALTHCARE];
  if (!record?.data) return undefined;

  const data = record.data as Record<string, unknown>;
  toolsWithData.push(TOOL_IDS.HEALTHCARE as ToolId);
  lastUpdated[TOOL_IDS.HEALTHCARE] = record.created;

  return {
    monthlyPremium: toNumber(data.monthlyPremium) || 0,
    annualOutOfPocket: toNumber(data.outOfPocket) || toNumber(data.annualOutOfPocket) || 0,
    lifetimeProjectedCost: toNumber(data.lifetimeProjectedCost) || toNumber(data.lifetimeCost) || 0,
    hsaBalance: toNumber(data.hsaBalance) || 0,
    medicareEligibleAge: toNumber(data.medicareAge) || toNumber(data.medicareEligibleAge) || 65,
    currentPlanType: toString(data.planType) || toString(data.currentPlanType),
  };
}

function transformRetireAbroad(
  rawData: RawToolDataMap,
  toolsWithData: ToolId[],
  lastUpdated: Record<string, string>
): RetireAbroadData | undefined {
  const record = rawData[TOOL_IDS.RETIRE_ABROAD];
  if (!record?.data) return undefined;

  const data = record.data as Record<string, unknown>;
  toolsWithData.push(TOOL_IDS.RETIRE_ABROAD as ToolId);
  lastUpdated[TOOL_IDS.RETIRE_ABROAD] = record.created;

  return {
    consideredCountries: toStringArray(data.consideredCountries) || toStringArray(data.countries) || [],
    topCountry: toString(data.topCountry) || toString(data.selectedCountry),
    monthlyCostOfLiving: toNumber(data.monthlyCostOfLiving) || toNumber(data.costOfLiving) || 0,
    annualSavingsVsCurrent: toNumber(data.annualSavings) || toNumber(data.annualSavingsVsCurrent) || 0,
    healthcareScore: toNumber(data.healthcareScore) || 0,
    qualityOfLifeScore: toNumber(data.qualityOfLifeScore) || toNumber(data.qolScore) || 0,
    visaRequirements: toString(data.visaRequirements) || toString(data.visa),
  };
}

function transformStateRelocator(
  rawData: RawToolDataMap,
  toolsWithData: ToolId[],
  lastUpdated: Record<string, string>
): StateRelocatorData | undefined {
  const record = rawData[TOOL_IDS.STATE_RELOCATE];
  if (!record?.data) return undefined;

  const data = record.data as Record<string, unknown>;
  toolsWithData.push(TOOL_IDS.STATE_RELOCATE as ToolId);
  lastUpdated[TOOL_IDS.STATE_RELOCATE] = record.created;

  // Handle nested formData structure from State-Relocate app
  const formData = (data.formData as Record<string, unknown>) || data;
  const recommendedState = (data.recommendedState as Record<string, unknown>) || {};
  const summary = (data.summary as Record<string, unknown>) || {};

  return {
    currentState: toString(formData.currentState) || toString(summary.currentState) || '',
    targetStates: toStringArray(formData.targetStates) || toStringArray(summary.targetStates) || [],
    topRecommendation: toString(recommendedState.targetState) || toString(summary.topRecommendation),
    annualTaxSavings: toNumber(recommendedState.annualSavings) || 0,
    costOfLivingDelta: toNumber(recommendedState.costOfLivingDiff) || 0,
    recommendationScore: toNumber(recommendedState.recommendationScore),
    recommendationReasons: toStringArray(recommendedState.recommendationReasons),
    moveDate: toString(formData.moveDate) || toString(summary.moveDate),
    isRetired: formData.employmentStatus === 'retired' || formData.planningRetirement === 'yes',
  };
}

function transformLongevityPlanner(
  rawData: RawToolDataMap,
  toolsWithData: ToolId[],
  lastUpdated: Record<string, string>
): LongevityPlannerData | undefined {
  const record = rawData[TOOL_IDS.LONGEVITY];
  if (!record?.data) return undefined;

  const data = record.data as Record<string, unknown>;
  toolsWithData.push(TOOL_IDS.LONGEVITY as ToolId);
  lastUpdated[TOOL_IDS.LONGEVITY] = record.created;

  return {
    projectedLifespan: toNumber(data.projectedLifespan) || toNumber(data.lifeExpectancy) || 85,
    healthScore: toNumber(data.healthScore) || 0,
    planningHorizon: toNumber(data.planningHorizon) || toNumber(data.horizon) || 25,
    longevityFactors: toStringArray(data.longevityFactors) || toStringArray(data.factors),
  };
}

function transformIdentityBuilder(
  rawData: RawToolDataMap,
  toolsWithData: ToolId[],
  lastUpdated: Record<string, string>
): IdentityBuilderData | undefined {
  const record = rawData[TOOL_IDS.IDENTITY_BUILDER];
  if (!record?.data) return undefined;

  const data = record.data as Record<string, unknown>;
  toolsWithData.push(TOOL_IDS.IDENTITY_BUILDER as ToolId);
  lastUpdated[TOOL_IDS.IDENTITY_BUILDER] = record.created;

  return {
    retirementGoals: toStringArray(data.retirementGoals) || toStringArray(data.goals) || [],
    activityPreferences: toStringArray(data.activityPreferences) || toStringArray(data.activities) || [],
    purposeScore: toNumber(data.purposeScore) || 0,
    topPriorities: toStringArray(data.topPriorities) || toStringArray(data.priorities),
  };
}

function transformVolunteerMatcher(
  rawData: RawToolDataMap,
  toolsWithData: ToolId[],
  lastUpdated: Record<string, string>
): VolunteerMatcherData | undefined {
  const record = rawData[TOOL_IDS.VOLUNTEER];
  if (!record?.data) return undefined;

  const data = record.data as Record<string, unknown>;
  toolsWithData.push(TOOL_IDS.VOLUNTEER as ToolId);
  lastUpdated[TOOL_IDS.VOLUNTEER] = record.created;

  return {
    matchedOpportunities: toNumber(data.matchedOpportunities) || toNumber(data.matches) || 0,
    weeklyHoursCommitted: toNumber(data.weeklyHours) || toNumber(data.weeklyHoursCommitted) || 0,
    skillsToShare: toStringArray(data.skills) || toStringArray(data.skillsToShare) || [],
    interestAreas: toStringArray(data.interests) || toStringArray(data.interestAreas),
  };
}

function transformLegacyVisualizer(
  rawData: RawToolDataMap,
  toolsWithData: ToolId[],
  lastUpdated: Record<string, string>
): LegacyVisualizerData | undefined {
  const record = rawData[TOOL_IDS.LEGACY];
  if (!record?.data) return undefined;

  const data = record.data as Record<string, unknown>;
  toolsWithData.push(TOOL_IDS.LEGACY as ToolId);
  lastUpdated[TOOL_IDS.LEGACY] = record.created;

  return {
    totalEstateValue: toNumber(data.totalEstateValue) || toNumber(data.estateValue) || 0,
    beneficiaries: toNumber(data.beneficiaries) || toNumber(data.beneficiaryCount) || 0,
    charitableGivingPlanned: toNumber(data.charitableGiving) || toNumber(data.charitableGivingPlanned) || 0,
    estatePlanComplete: Boolean(data.estatePlanComplete) || Boolean(data.planComplete),
  };
}

function transformGiftingPlanner(
  rawData: RawToolDataMap,
  toolsWithData: ToolId[],
  lastUpdated: Record<string, string>
): GiftingPlannerData | undefined {
  const record = rawData[TOOL_IDS.GIFTING];
  if (!record?.data) return undefined;

  const data = record.data as Record<string, unknown>;
  toolsWithData.push(TOOL_IDS.GIFTING as ToolId);
  lastUpdated[TOOL_IDS.GIFTING] = record.created;

  return {
    annualGiftBudget: toNumber(data.annualGiftBudget) || toNumber(data.giftBudget) || 0,
    taxAdvantagedGifts: toNumber(data.taxAdvantagedGifts) || 0,
    educationFunds529: toNumber(data.educationFunds) || toNumber(data.educationFunds529) || 0,
    recipientCount: toNumber(data.recipients) || toNumber(data.recipientCount) || 0,
  };
}

function transformEstateManager(
  rawData: RawToolDataMap,
  toolsWithData: ToolId[],
  lastUpdated: Record<string, string>
): EstateManagerData | undefined {
  const record = rawData[TOOL_IDS.DIGITAL_ESTATE];
  if (!record?.data) return undefined;

  const data = record.data as Record<string, unknown>;
  toolsWithData.push(TOOL_IDS.DIGITAL_ESTATE as ToolId);
  lastUpdated[TOOL_IDS.DIGITAL_ESTATE] = record.created;

  return {
    digitalAssetsCount: toNumber(data.digitalAssets) || toNumber(data.digitalAssetsCount) || 0,
    documentsUploaded: toNumber(data.documents) || toNumber(data.documentsUploaded) || 0,
    passwordsStored: toNumber(data.passwords) || toNumber(data.passwordsStored) || 0,
    lastUpdated: toString(data.lastUpdated) || record.created,
  };
}

// ============================================
// Helper Functions
// ============================================

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[,$]/g, ''));
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function toString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  return undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return undefined;
}

/**
 * Build a human-readable data snapshot for AI prompts
 */
export function buildDataSnapshotForAI(data: AggregatedToolData): string {
  const lines: string[] = [];
  lines.push(`## User Retirement Data (${data.dataCompleteness}% complete)`);
  lines.push('');

  if (data.incomeEstimator) {
    lines.push('### Income Sources');
    lines.push(`- Total Annual Income: $${formatNumber(data.incomeEstimator.totalAnnualIncome)}`);
    if (data.incomeEstimator.socialSecurityIncome > 0) {
      lines.push(`- Social Security: $${formatNumber(data.incomeEstimator.socialSecurityIncome)}/year`);
    }
    if (data.incomeEstimator.pensionIncome > 0) {
      lines.push(`- Pension: $${formatNumber(data.incomeEstimator.pensionIncome)}/year`);
    }
    if (data.incomeEstimator.investmentIncome > 0) {
      lines.push(`- Investments: $${formatNumber(data.incomeEstimator.investmentIncome)}/year`);
    }
    lines.push('');
  }

  if (data.ssOptimizer) {
    lines.push('### Social Security');
    lines.push(`- Current Claim Age Plan: ${data.ssOptimizer.currentClaimAge}`);
    lines.push(`- Optimal Claim Age: ${data.ssOptimizer.optimalClaimAge}`);
    lines.push(`- Monthly Benefit at Current Age: $${formatNumber(data.ssOptimizer.monthlyBenefitAtCurrent)}`);
    if (data.ssOptimizer.lifetimeOptimizationPotential > 0) {
      lines.push(`- Optimization Potential: $${formatNumber(data.ssOptimizer.lifetimeOptimizationPotential)} lifetime`);
    }
    lines.push('');
  }

  if (data.taxAnalyzer) {
    lines.push('### Tax Information');
    lines.push(`- Current State: ${data.taxAnalyzer.currentState}`);
    lines.push(`- Effective Tax Rate: ${data.taxAnalyzer.effectiveTaxRate}%`);
    lines.push(`- Annual State Tax: $${formatNumber(data.taxAnalyzer.annualStateTax)}`);
    lines.push(`- Annual Federal Tax: $${formatNumber(data.taxAnalyzer.annualFederalTax)}`);
    lines.push('');
  }

  if (data.healthcareCost) {
    lines.push('### Healthcare');
    lines.push(`- Monthly Premium: $${formatNumber(data.healthcareCost.monthlyPremium)}`);
    lines.push(`- Annual Out-of-Pocket: $${formatNumber(data.healthcareCost.annualOutOfPocket)}`);
    if (data.healthcareCost.hsaBalance > 0) {
      lines.push(`- HSA Balance: $${formatNumber(data.healthcareCost.hsaBalance)}`);
    }
    lines.push('');
  }

  if (data.stateRelocator) {
    lines.push('### Relocation Planning');
    lines.push(`- Current State: ${data.stateRelocator.currentState}`);
    if (data.stateRelocator.targetStates.length > 0) {
      lines.push(`- Considering: ${data.stateRelocator.targetStates.join(', ')}`);
    }
    if (data.stateRelocator.topRecommendation) {
      lines.push(`- Top Recommendation: ${data.stateRelocator.topRecommendation}`);
      lines.push(`- Annual Tax Savings: $${formatNumber(data.stateRelocator.annualTaxSavings)}`);
    }
    lines.push('');
  }

  if (data.retireAbroad) {
    lines.push('### International Options');
    if (data.retireAbroad.topCountry) {
      lines.push(`- Top Country: ${data.retireAbroad.topCountry}`);
      lines.push(`- Annual Savings vs US: $${formatNumber(data.retireAbroad.annualSavingsVsCurrent)}`);
      lines.push(`- Healthcare Score: ${data.retireAbroad.healthcareScore}/100`);
    }
    lines.push('');
  }

  if (data.longevityPlanner) {
    lines.push('### Longevity Planning');
    lines.push(`- Projected Lifespan: ${data.longevityPlanner.projectedLifespan} years`);
    lines.push(`- Planning Horizon: ${data.longevityPlanner.planningHorizon} years`);
    lines.push('');
  }

  if (data.legacyVisualizer) {
    lines.push('### Estate & Legacy');
    lines.push(`- Total Estate Value: $${formatNumber(data.legacyVisualizer.totalEstateValue)}`);
    lines.push(`- Beneficiaries: ${data.legacyVisualizer.beneficiaries}`);
    if (data.legacyVisualizer.charitableGivingPlanned > 0) {
      lines.push(`- Charitable Giving Planned: $${formatNumber(data.legacyVisualizer.charitableGivingPlanned)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(num);
}
