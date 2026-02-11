/**
 * Aggregated Tool Data Types
 *
 * Normalized data structures for cross-tool analysis.
 * Each tool's raw data is transformed into these standardized interfaces.
 */

// Tool ID constants matching pocketbaseDataService.ts
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

export type ToolId = (typeof TOOL_IDS)[keyof typeof TOOL_IDS];

// ============================================
// Individual Tool Data Interfaces
// ============================================

export interface IncomeEstimatorData {
  totalAnnualIncome: number;
  socialSecurityIncome: number;
  pensionIncome: number;
  investmentIncome: number;
  otherIncome: number;
  scenarios?: Array<{
    id: string;
    name: string;
    totalIncome: number;
    netWorth?: number;
  }>;
  activeScenarioId?: string;
}

export interface SSOptimizerData {
  currentClaimAge: number;
  optimalClaimAge: number;
  monthlyBenefitAtCurrent: number;
  monthlyBenefitAtOptimal: number;
  lifetimeOptimizationPotential: number;
  spousalStrategy?: string;
  spousalBenefit?: number;
}

export interface TaxAnalyzerData {
  currentState: string;
  effectiveTaxRate: number;
  annualStateTax: number;
  annualFederalTax: number;
  totalAnnualTax: number;
  potentialSavingsByState: Record<string, number>;
}

export interface HealthcareCostData {
  monthlyPremium: number;
  annualOutOfPocket: number;
  lifetimeProjectedCost: number;
  hsaBalance: number;
  medicareEligibleAge: number;
  currentPlanType?: string;
}

export interface RetireAbroadData {
  consideredCountries: string[];
  topCountry?: string;
  monthlyCostOfLiving: number;
  annualSavingsVsCurrent: number;
  healthcareScore: number; // 0-100
  qualityOfLifeScore: number; // 0-100
  visaRequirements?: string;
}

export interface StateRelocatorData {
  currentState: string;
  targetStates: string[];
  topRecommendation?: string;
  annualTaxSavings: number;
  costOfLivingDelta: number; // percentage difference
  recommendationScore?: number;
  recommendationReasons?: string[];
  moveDate?: string;
  isRetired?: boolean;
}

export interface LongevityPlannerData {
  projectedLifespan: number;
  healthScore: number; // 0-100
  planningHorizon: number; // years
  longevityFactors?: string[];
}

export interface IdentityBuilderData {
  retirementGoals: string[];
  activityPreferences: string[];
  purposeScore: number; // 0-100
  topPriorities?: string[];
}

export interface VolunteerMatcherData {
  matchedOpportunities: number;
  weeklyHoursCommitted: number;
  skillsToShare: string[];
  interestAreas?: string[];
}

export interface LegacyVisualizerData {
  totalEstateValue: number;
  beneficiaries: number;
  charitableGivingPlanned: number;
  estatePlanComplete: boolean;
}

export interface GiftingPlannerData {
  annualGiftBudget: number;
  taxAdvantagedGifts: number;
  educationFunds529: number;
  recipientCount: number;
}

export interface EstateManagerData {
  digitalAssetsCount: number;
  documentsUploaded: number;
  passwordsStored: number;
  lastUpdated: string;
}

// ============================================
// Aggregated Data Structure
// ============================================

export interface AggregatedToolData {
  // Financial Planning
  incomeEstimator?: IncomeEstimatorData;
  ssOptimizer?: SSOptimizerData;
  taxAnalyzer?: TaxAnalyzerData;
  healthcareCost?: HealthcareCostData;

  // Location Planning
  retireAbroad?: RetireAbroadData;
  stateRelocator?: StateRelocatorData;

  // Lifestyle & Longevity
  longevityPlanner?: LongevityPlannerData;
  identityBuilder?: IdentityBuilderData;
  volunteerMatcher?: VolunteerMatcherData;

  // Legacy & Estate
  legacyVisualizer?: LegacyVisualizerData;
  giftingPlanner?: GiftingPlannerData;
  estateManager?: EstateManagerData;

  // Metadata
  toolsWithData: ToolId[];
  dataCompleteness: number; // 0-100 percentage
  lastUpdated: Record<ToolId, string>;
  lastRefreshed: string;
}

// ============================================
// Cross-Tool Insight Types
// ============================================

export type InsightType =
  | 'tax-location'
  | 'healthcare-location'
  | 'income-gap'
  | 'ss-timing'
  | 'estate-gifting'
  | 'longevity-healthcare'
  | 'lifestyle-budget'
  | 'general-planning'
  | 'income-abroad'
  | 'tax-abroad'
  | 'income-longevity'
  | 'ss-tax'
  | 'identity-volunteer'
  | 'digital-legacy'
  | 'healthcare-abroad'
  | 'holistic-income'
  | 'location-lifestyle'
  | 'gifting-income'
  | 'estate-tax';

export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';

export interface CrossToolInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  potentialImpact: number; // in dollars
  confidenceScore: number; // 0-100
  relatedTools: ToolId[];
  actionItems: string[];
  dataUsed: Array<{
    toolId: ToolId;
    dataPoints: string[];
  }>;
}

// ============================================
// Raw PocketBase Response Types
// ============================================

export interface RawToolDataRecord {
  data: Record<string, unknown>;
  created: string;
  id?: string;
}

export type RawToolDataMap = Record<string, RawToolDataRecord>;
