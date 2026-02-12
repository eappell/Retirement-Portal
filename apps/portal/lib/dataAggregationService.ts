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
 * Aggregate all tool data from PocketBase into a normalized structure.
 * Accepts optional pre-loaded data (e.g. from ToolDataContext cache) to avoid
 * a redundant proxy call.
 */
export async function aggregateAllToolData(
  authToken: string,
  cachedToolData?: Record<string, { data: Record<string, unknown>; created: string }>
): Promise<AggregatedToolData> {
  let rawData: RawToolDataMap = {};

  if (cachedToolData && Object.keys(cachedToolData).length > 0) {
    console.log('[DataAggregation] Using cached tool data:', Object.keys(cachedToolData));
    rawData = cachedToolData;
  } else {
    try {
      console.log('[DataAggregation] Fetching data from proxy...');
      rawData = await loadAllToolData(authToken);
      console.log('[DataAggregation] Raw data received:', Object.keys(rawData));
    } catch (error) {
      console.error('[DataAggregation] Failed to load tool data from proxy:', error);
      // Return empty aggregated data if proxy is unavailable
    }
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
  const incomeAliases = [
    TOOL_IDS.INCOME_ESTIMATOR,
    'monthly-retirement-income',
    'monthly-retirement-income-ai',
    'monthly-retirement-income-estimator',
    'monthly-retirement-income-estimator-v1',
  ];
  const incomeCandidates = incomeAliases
    .map((id) => rawData[id])
    .filter((r): r is RawToolDataMap[string] => !!r?.data);
  const record = incomeCandidates.sort((a, b) => {
    const ta = Date.parse(a.created || '');
    const tb = Date.parse(b.created || '');
    return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
  })[0];
  if (!record?.data) return undefined;

  const data = record.data as Record<string, unknown>;
  toolsWithData.push(TOOL_IDS.INCOME_ESTIMATOR as ToolId);
  lastUpdated[TOOL_IDS.INCOME_ESTIMATOR] = record.created;

  const scenarioBundle = extractScenarioBundle(data);
  const derived = deriveIncomeFromScenarioBundle(scenarioBundle);

  const flatTotalAnnualIncome = toNumber(data.totalIncome) || toNumber(data.totalAnnualIncome) || 0;
  const flatSocialSecurityIncome = toNumber(data.socialSecurity) || toNumber(data.socialSecurityIncome) || 0;
  const flatPensionIncome = toNumber(data.pension) || toNumber(data.pensionIncome) || 0;
  const flatInvestmentIncome = toNumber(data.investments) || toNumber(data.investmentIncome) || 0;
  const flatOtherIncome = toNumber(data.otherIncome) || 0;

  return {
    totalAnnualIncome: flatTotalAnnualIncome > 0 ? flatTotalAnnualIncome : derived.totalAnnualIncome,
    socialSecurityIncome: flatSocialSecurityIncome > 0 ? flatSocialSecurityIncome : derived.socialSecurityIncome,
    pensionIncome: flatPensionIncome > 0 ? flatPensionIncome : derived.pensionIncome,
    investmentIncome: flatInvestmentIncome > 0 ? flatInvestmentIncome : derived.investmentIncome,
    otherIncome: flatOtherIncome > 0 ? flatOtherIncome : derived.otherIncome,
    scenarios: derived.scenarios,
    activeScenarioId: scenarioBundle.activeScenarioId || toString(data.activeScenario) || toString(data.activeScenarioId),
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
  const summary = asRecord(data.summary) || {};
  const results = asRecord(data.results) || {};
  const optimalStrategy = asRecord(results.optimalStrategy) || {};

  const derivedClaimAge =
    toNumber(summary.optimalClaimingAge) ||
    toNumber(optimalStrategy.claimingAge) ||
    toNumber(optimalStrategy.person1ClaimingAge);

  const derivedMonthlyBenefit =
    toNumber(summary.estimatedMonthlyBenefit) ||
    toNumber(optimalStrategy.monthlyBenefit) ||
    toNumber(optimalStrategy.combinedMonthlyBenefit);

  const lifetimePotentialFromScenarios = (() => {
    const scenarios = Array.isArray(results.allScenarios) ? results.allScenarios : [];
    if (scenarios.length === 0) return undefined;
    const normalized = scenarios
      .map((s) => asRecord(s))
      .filter((s): s is Record<string, unknown> => !!s);
    if (normalized.length === 0) return undefined;

    const best = normalized.reduce((max, s) => {
      const value = toNumber(s.lifetimeBenefitToLifeExpectancy) || 0;
      return value > max ? value : max;
    }, 0);
    const worst = normalized.reduce((min, s) => {
      const value = toNumber(s.lifetimeBenefitToLifeExpectancy) || 0;
      return value < min ? value : min;
    }, Number.POSITIVE_INFINITY);

    if (!isFinite(best) || !isFinite(worst) || best <= 0 || worst === Number.POSITIVE_INFINITY) {
      return undefined;
    }
    return Math.max(0, best - worst);
  })();

  toolsWithData.push(TOOL_IDS.SOCIAL_SECURITY as ToolId);
  lastUpdated[TOOL_IDS.SOCIAL_SECURITY] = record.created;

  return {
    currentClaimAge: toNumber(data.claimAge) || toNumber(data.currentClaimAge) || derivedClaimAge || 62,
    optimalClaimAge: toNumber(data.optimalClaimAge) || derivedClaimAge || 70,
    monthlyBenefitAtCurrent: toNumber(data.estimatedBenefit) || toNumber(data.monthlyBenefitAtCurrent) || derivedMonthlyBenefit || 0,
    monthlyBenefitAtOptimal: toNumber(data.monthlyBenefitAtOptimal) || derivedMonthlyBenefit || 0,
    lifetimeOptimizationPotential:
      toNumber(data.optimizationPotential) ||
      toNumber(data.lifetimeOptimizationPotential) ||
      lifetimePotentialFromScenarios ||
      0,
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
  const summary = asRecord(data.summary) || {};
  const taxSituation = asRecord(data.taxSituation) || {};
  const projections = Array.isArray(data.projections) ? data.projections : [];

  const projectionAverages = (() => {
    const normalized = projections
      .map((p) => asRecord(p))
      .filter((p): p is Record<string, unknown> => !!p);
    if (normalized.length === 0) {
      return undefined;
    }

    const totals = normalized.reduce(
      (acc, p) => {
        acc.federal += toNumber(p.federalTax) || 0;
        acc.state += toNumber(p.stateTax) || 0;
        acc.effective += toNumber(p.effectiveRate) || 0;
        return acc;
      },
      { federal: 0, state: 0, effective: 0 }
    );

    return {
      avgFederalTax: totals.federal / normalized.length,
      avgStateTax: totals.state / normalized.length,
      avgEffectiveRate: totals.effective / normalized.length,
    };
  })();

  const effectiveRateFromData =
    toNumber(data.effectiveTaxRate) ||
    toNumber(summary.avgEffectiveRate) ||
    toNumber(data.effectiveRate) ||
    projectionAverages?.avgEffectiveRate ||
    0;
  const normalizedEffectiveRate = effectiveRateFromData > 0 && effectiveRateFromData <= 1
    ? effectiveRateFromData * 100
    : effectiveRateFromData;

  const annualFederalTax =
    toNumber(data.federalTax) ||
    toNumber(data.annualFederalTax) ||
    toNumber(summary.avgFederalTax) ||
    projectionAverages?.avgFederalTax ||
    0;
  const annualStateTax =
    toNumber(data.annualTax) ||
    toNumber(data.annualStateTax) ||
    toNumber(data.stateTax) ||
    toNumber(summary.avgStateTax) ||
    projectionAverages?.avgStateTax ||
    0;
  const totalAnnualTax =
    toNumber(data.totalTax) ||
    toNumber(data.totalAnnualTax) ||
    (annualFederalTax + annualStateTax);

  toolsWithData.push(TOOL_IDS.TAX_IMPACT as ToolId);
  lastUpdated[TOOL_IDS.TAX_IMPACT] = record.created;

  return {
    currentState:
      toString(data.state) ||
      toString(data.currentState) ||
      toString(summary.currentState) ||
      toString(taxSituation.state) ||
      '',
    effectiveTaxRate: normalizedEffectiveRate,
    annualStateTax,
    annualFederalTax,
    totalAnnualTax,
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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function extractScenarioBundle(data: Record<string, unknown>): {
  scenarios: Record<string, unknown>;
  activeScenarioId?: string;
} {
  const directScenarios = asRecord(data.scenarios);
  const wrappedState = asRecord(data.scenariosState);
  const wrappedScenarios = wrappedState ? asRecord(wrappedState.scenarios) : undefined;
  const scenarios = directScenarios || wrappedScenarios || {};

  const activeScenarioId =
    toString(data.activeScenarioId) ||
    toString(data.activeScenario) ||
    (wrappedState ? toString(wrappedState.activeScenarioId) : undefined);

  return { scenarios, activeScenarioId };
}

function deriveIncomeFromScenarioBundle(bundle: {
  scenarios: Record<string, unknown>;
  activeScenarioId?: string;
}): {
  totalAnnualIncome: number;
  socialSecurityIncome: number;
  pensionIncome: number;
  investmentIncome: number;
  otherIncome: number;
  scenarios?: IncomeEstimatorData['scenarios'];
} {
  const entries = Object.entries(bundle.scenarios);
  if (entries.length === 0) {
    return {
      totalAnnualIncome: 0,
      socialSecurityIncome: 0,
      pensionIncome: 0,
      investmentIncome: 0,
      otherIncome: 0,
    };
  }

  const derivedScenarios = entries.map(([id, rawScenario]) => {
    const scenario = asRecord(rawScenario) || {};
    const plan = asRecord(scenario.plan) || scenario;

    const retirementAccounts = Array.isArray(plan.retirementAccounts) ? plan.retirementAccounts : [];
    const investmentAccounts = Array.isArray(plan.investmentAccounts) ? plan.investmentAccounts : [];
    const pensions = Array.isArray(plan.pensions) ? plan.pensions : [];
    const otherIncomes = Array.isArray(plan.otherIncomes) ? plan.otherIncomes : [];
    const annuities = Array.isArray(plan.annuities) ? plan.annuities : [];

    const socialSecurity = asRecord(plan.socialSecurity) || {};
    const socialSecurityIncome =
      (toNumber(socialSecurity.person1EstimatedBenefit) || 0) +
      (toNumber(socialSecurity.person2EstimatedBenefit) || 0);

    const pensionIncome = pensions.reduce((sum, item) => {
      const pension = asRecord(item) || {};
      const payoutType = toString(pension.payoutType) || 'monthly';
      if (payoutType === 'lump') return sum;
      const monthly = toNumber(pension.monthlyBenefit) || 0;
      const annual = toNumber(pension.annualBenefit) || (monthly * 12);
      return sum + annual;
    }, 0);

    const otherIncome = otherIncomes.reduce((sum, item) => {
      const income = asRecord(item) || {};
      return sum + ((toNumber(income.annualAmount) || 0) + ((toNumber(income.monthlyAmount) || 0) * 12));
    }, 0);

    const annuityIncome = annuities.reduce((sum, item) => {
      const annuity = asRecord(item) || {};
      const amount = toNumber(annuity.pmtAmount) || toNumber(annuity.monthlyAmount) || 0;
      const frequency = toString(annuity.pmtFrequency) || 'monthly';
      if (frequency === 'annual') return sum + amount;
      if (frequency === 'quarterly') return sum + (amount * 4);
      return sum + (amount * 12);
    }, 0);

    const investmentBalance =
      investmentAccounts.reduce((sum, item) => sum + (toNumber(asRecord(item)?.balance) || 0), 0) +
      retirementAccounts.reduce((sum, item) => sum + (toNumber(asRecord(item)?.balance) || 0), 0);

    const investmentIncome = 0;
    const totalIncome = socialSecurityIncome + pensionIncome + otherIncome + annuityIncome + investmentIncome;

    return {
      id,
      name: toString(scenario.name) || id,
      totalIncome,
      netWorth: investmentBalance,
      socialSecurityIncome,
      pensionIncome,
      investmentIncome,
      otherIncome: otherIncome + annuityIncome,
    };
  });

  const activeScenario =
    (bundle.activeScenarioId ? derivedScenarios.find((s) => s.id === bundle.activeScenarioId) : undefined) ||
    derivedScenarios[0];

  return {
    totalAnnualIncome: activeScenario?.totalIncome || 0,
    socialSecurityIncome: activeScenario?.socialSecurityIncome || 0,
    pensionIncome: activeScenario?.pensionIncome || 0,
    investmentIncome: activeScenario?.investmentIncome || 0,
    otherIncome: activeScenario?.otherIncome || 0,
    scenarios: derivedScenarios.map((s) => ({
      id: s.id,
      name: s.name,
      totalIncome: s.totalIncome,
      netWorth: s.netWorth,
    })),
  };
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
    const activeScenario =
      (data.incomeEstimator.activeScenarioId
        ? data.incomeEstimator.scenarios?.find((s) => s.id === data.incomeEstimator?.activeScenarioId)
        : undefined) || data.incomeEstimator.scenarios?.[0];
    if (activeScenario?.netWorth && activeScenario.netWorth > 0) {
      lines.push(`- Estimated Investable Assets (active scenario): $${formatNumber(activeScenario.netWorth)}`);
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
    lines.push(`- Estate Plan Complete: ${data.legacyVisualizer.estatePlanComplete ? 'Yes' : 'No'}`);
    lines.push('');
  }

  if (data.identityBuilder) {
    lines.push('### Retirement Identity');
    lines.push(`- Purpose Score: ${data.identityBuilder.purposeScore}/100`);
    if (data.identityBuilder.retirementGoals.length > 0) {
      lines.push(`- Retirement Goals: ${data.identityBuilder.retirementGoals.join(', ')}`);
    }
    if (data.identityBuilder.activityPreferences.length > 0) {
      lines.push(`- Activity Preferences: ${data.identityBuilder.activityPreferences.join(', ')}`);
    }
    if (data.identityBuilder.topPriorities && data.identityBuilder.topPriorities.length > 0) {
      lines.push(`- Top Priorities: ${data.identityBuilder.topPriorities.join(', ')}`);
    }
    lines.push('');
  }

  if (data.volunteerMatcher) {
    lines.push('### Volunteering');
    lines.push(`- Matched Opportunities: ${data.volunteerMatcher.matchedOpportunities}`);
    lines.push(`- Weekly Hours Committed: ${data.volunteerMatcher.weeklyHoursCommitted}`);
    if (data.volunteerMatcher.skillsToShare.length > 0) {
      lines.push(`- Skills to Share: ${data.volunteerMatcher.skillsToShare.join(', ')}`);
    }
    if (data.volunteerMatcher.interestAreas && data.volunteerMatcher.interestAreas.length > 0) {
      lines.push(`- Interest Areas: ${data.volunteerMatcher.interestAreas.join(', ')}`);
    }
    lines.push('');
  }

  if (data.giftingPlanner) {
    lines.push('### Gifting Strategy');
    lines.push(`- Annual Gift Budget: $${formatNumber(data.giftingPlanner.annualGiftBudget)}`);
    lines.push(`- Tax-Advantaged Gifts: $${formatNumber(data.giftingPlanner.taxAdvantagedGifts)}`);
    if (data.giftingPlanner.educationFunds529 > 0) {
      lines.push(`- 529 Education Funds: $${formatNumber(data.giftingPlanner.educationFunds529)}`);
    }
    lines.push(`- Recipient Count: ${data.giftingPlanner.recipientCount}`);
    lines.push('');
  }

  if (data.estateManager) {
    lines.push('### Digital Estate');
    lines.push(`- Digital Assets Documented: ${data.estateManager.digitalAssetsCount}`);
    lines.push(`- Documents Uploaded: ${data.estateManager.documentsUploaded}`);
    lines.push(`- Passwords Stored: ${data.estateManager.passwordsStored}`);
    lines.push('');
  }

  return lines.join('\n');
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(num);
}
