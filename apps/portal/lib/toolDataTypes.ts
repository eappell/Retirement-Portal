/**
 * TypeScript Type Definitions for Tool Data
 * 
 * These interfaces ensure type safety when saving and retrieving
 * data from Firebase across all retirement planning tools.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Base interface that all tool data extends
 */
export interface BaseToolData {
  userId: string;
  toolId: string;
  timestamp: Timestamp;
  version: string;
  notes?: string;
}

/**
 * Income Estimator Tool Data
 * This tool saves ALL scenarios, not just one calculation
 */
export interface IncomeEstimatorData extends BaseToolData {
  toolId: 'income-estimator';
  
  // All saved scenarios
  scenarios: Record<string, {
    id: string;
    name: string;
    plan: any; // Full RetirementPlan object from the app
    aiInsight?: string;
  }>;
  
  // Currently active scenario ID
  activeScenarioId: string | null;
  
  // App settings
  appSettings?: {
    assetAssumptionDefaults?: {
      stockMean?: number;
      stockStd?: number;
      bondMean?: number;
      bondStd?: number;
      useFatTails?: boolean;
      fatTailDf?: number;
    };
  };
}

/**
 * Social Security Optimizer Tool Data
 */
export interface SocialSecurityData extends BaseToolData {
  toolId: 'social-security-optimizer';
  
  // Primary beneficiary
  claimAge: number;
  estimatedBenefit: number;
  fullRetirementAge: number;
  birthYear: number;
  
  // Optimization results
  optimizationPotential?: number;
  optimalClaimAge?: number;
  lifetimeValue?: number;
  
  // Spousal benefits
  hasSpouse?: boolean;
  spouseClaimAge?: number;
  spouseBenefit?: number;
  spousalStrategy?: string;
}

/**
 * Tax Impact Analyzer Tool Data
 */
export interface TaxImpactData extends BaseToolData {
  toolId: 'tax-impact-analyzer';
  
  // Current situation
  currentState: string;
  filingStatus: 'single' | 'married-joint' | 'married-separate' | 'head-of-household';
  adjustedGrossIncome: number;
  
  // Tax calculations
  federalTax: number;
  stateTax: number;
  effectiveTaxRate: number;
  
  // Recommendations
  potentialSavings?: number;
  recommendedStates?: string[];
  savingsByState?: Record<string, number>;
}

/**
 * Healthcare Cost Estimator Tool Data
 */
export interface HealthcareCostData extends BaseToolData {
  toolId: 'healthcare-cost-estimator';
  
  // Demographics
  age: number;
  gender?: 'male' | 'female' | 'other';
  zipCode?: string;
  
  // Plan details
  planType: 'medicare' | 'aca' | 'private' | 'employer';
  monthlyPremium: number;
  annualDeductible?: number;
  outOfPocketMax?: number;
  
  // HSA
  hasHSA?: boolean;
  hsaBalance?: number;
  hsaContributions?: number;
  
  // Projections
  lifetimeHealthcareCost?: number;
  yearsUntilMedicare?: number;
}

/**
 * Retire Abroad Tool Data
 */
export interface RetireAbroadData extends BaseToolData {
  toolId: 'retire-abroad';
  
  // Location
  country: string;
  city?: string;
  
  // Cost comparisons
  currentCostOfLiving: number;
  targetCostOfLiving: number;
  monthlySavings: number;
  annualSavings: number;
  
  // Quality of life scores (0-100)
  qualityOfLifeScore?: number;
  safetyScore?: number;
  healthcareQualityScore?: number;
  climateScore?: number;
  
  // Visa/legal
  visaType?: string;
  visaCost?: number;
}

/**
 * Pension vs Lump Sum Tool Data
 */
export interface PensionLumpSumData extends BaseToolData {
  toolId: 'pension-vs-lumpsum';
  
  // Pension option
  monthlyPension: number;
  annualPension: number;
  hasCOLA?: boolean;
  colaRate?: number;
  
  // Lump sum option
  lumpSumAmount: number;
  assumedReturnRate: number;
  
  // Analysis
  breakEvenAge?: number;
  lifetimeValuePension?: number;
  lifetimeValueLumpSum?: number;
  recommendation?: 'pension' | 'lump-sum' | 'partial';
  
  // Personal factors
  currentAge: number;
  lifeExpectancy?: number;
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
}

/**
 * Retirement Age Calculator Tool Data
 */
export interface RetirementAgeData extends BaseToolData {
  toolId: 'retirement-age-calculator';
  
  // Current situation
  currentAge: number;
  currentSavings: number;
  monthlyContributions: number;
  
  // Goals
  targetAge: number;
  desiredMonthlyIncome: number;
  
  // Calculations
  projectedSavings?: number;
  estimatedShortfall?: number;
  recommendedAge?: number;
  confidenceLevel?: number;
}

/**
 * Savings Goal Calculator Tool Data
 */
export interface SavingsGoalData extends BaseToolData {
  toolId: 'savings-goal-calculator';
  
  // Current state
  currentSavings: number;
  currentAge: number;
  
  // Target
  targetAmount: number;
  targetAge: number;
  
  // Contributions
  monthlyContributions: number;
  annualRaise?: number;
  employerMatch?: number;
  
  // Assumptions
  returnRate: number;
  inflationRate: number;
  
  // Results
  projectedAmount?: number;
  shortfall?: number;
  requiredMonthlyContribution?: number;
}

/**
 * Withdrawal Strategy Tool Data
 */
export interface WithdrawalStrategyData extends BaseToolData {
  toolId: 'withdrawal-strategy';
  
  // Portfolio
  totalPortfolio: number;
  stockAllocation: number;
  bondAllocation: number;
  cashAllocation: number;
  
  // Withdrawal plan
  withdrawalRate: number;
  annualWithdrawal: number;
  inflationAdjusted?: boolean;
  
  // Results
  portfolioLifespan?: number;
  probabilityOfSuccess?: number;
  recommendedRate?: number;
  strategy?: 'fixed-percentage' | 'fixed-dollar' | 'dynamic' | 'floor-ceiling';
}

/**
 * Legacy Planning Tool Data
 */
export interface LegacyPlanningData extends BaseToolData {
  toolId: 'legacy-planning';
  
  // Goals
  targetLegacyAmount: number;
  beneficiaries: number;
  
  // Current estate
  totalAssets: number;
  realEstate?: number;
  investments?: number;
  cashSavings?: number;
  otherAssets?: number;
  
  // Liabilities
  totalLiabilities?: number;
  mortgage?: number;
  otherDebts?: number;
  
  // Tax planning
  estateTaxEstimate?: number;
  giftsGiven?: number;
  trustsEstablished?: boolean;
  
  // Projections
  projectedLegacy?: number;
  gap?: number;
}

/**
 * Activity Budget Tool Data
 */
export interface ActivityBudgetData extends BaseToolData {
  toolId: 'activity-budget';
  
  // Budget categories
  travel: number;
  hobbies: number;
  entertainment: number;
  dining: number;
  giftsCharity: number;
  education: number;
  other: number;
  
  // Totals
  totalMonthly: number;
  totalAnnual: number;
  
  // Planning
  plannedTrips?: number;
  majorPurchases?: string[];
}

/**
 * Investment Allocation Tool Data
 */
export interface InvestmentAllocationData extends BaseToolData {
  toolId: 'investment-allocation';
  
  // Current allocation
  stocks: number;
  bonds: number;
  cash: number;
  realEstate?: number;
  commodities?: number;
  crypto?: number;
  
  // Risk profile
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  yearsToRetirement: number;
  
  // Recommendations
  recommendedStocks?: number;
  recommendedBonds?: number;
  recommendedCash?: number;
  rebalanceNeeded?: boolean;
  
  // Performance
  expectedReturn?: number;
  expectedVolatility?: number;
}

/**
 * Union type of all tool data types
 */
export type AnyToolData = 
  | IncomeEstimatorData
  | SocialSecurityData
  | TaxImpactData
  | HealthcareCostData
  | RetireAbroadData
  | PensionLumpSumData
  | RetirementAgeData
  | SavingsGoalData
  | WithdrawalStrategyData
  | LegacyPlanningData
  | ActivityBudgetData
  | InvestmentAllocationData;

/**
 * Type guard to check if data matches a specific tool type
 */
export function isToolData<T extends AnyToolData>(
  data: unknown,
  toolId: T['toolId']
): data is T {
  return (
    typeof data === 'object' &&
    data !== null &&
    'toolId' in data &&
    data.toolId === toolId
  );
}
