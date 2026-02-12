/**
 * Orchestrator Agent Types
 *
 * Types for the Unified Retirement Plan Orchestrator Agent
 * that synthesizes data from all 12 tools into a cohesive plan.
 */

export interface OrchestratorSection {
  id: string;
  title: string;
  icon: string; // Heroicon name
  summary: string;
  details: string[];
  recommendations: string[];
  relatedTools: string[];
  confidence: 'high' | 'medium' | 'low';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface OrchestratorWarning {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  actionRequired: string;
  relatedTools: string[];
}

export interface OrchestratorPlan {
  id: string;
  generatedAt: string;
  modelUsed: string;
  dataCompleteness: number;
  toolsAnalyzed: string[];

  // Executive summary
  executiveSummary: string;
  retirementReadinessScore: number; // 0-100
  topPriorities: string[];

  // Plan sections
  sections: OrchestratorSection[];

  // Warnings and alerts
  warnings: OrchestratorWarning[];

  // Cross-tool synergies
  synergies: Array<{
    title: string;
    description: string;
    tools: string[];
    potentialImpact: string;
  }>;

  // Action plan
  immediateActions: string[];
  shortTermActions: string[]; // 1-6 months
  longTermActions: string[]; // 6+ months

  // Missing data recommendations
  missingDataSuggestions: Array<{
    tool: string;
    toolId: string;
    reason: string;
  }>;
}

export interface OrchestratorRequest {
  userId: string;
  authToken: string;
  focusAreas?: string[]; // Optional specific areas to focus on
  previousPlanId?: string; // For delta analysis
}

export interface OrchestratorResponse {
  plan: OrchestratorPlan;
  cached: boolean;
  tierUsed: 'free' | 'paid';
  tokensUsed?: {
    input: number;
    output: number;
  };
}
