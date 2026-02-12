import { NextRequest, NextResponse } from 'next/server';
import { aggregateAllToolData } from '@/lib/dataAggregationService';
import { analyzeCrossToolPatterns } from '@/lib/crossToolAnalyzer';
import { buildOrchestratorPrompt } from './systemPrompt';
import type { OrchestratorPlan, OrchestratorResponse } from '@/lib/types/orchestratorTypes';
import type { AggregatedToolData } from '@/lib/types/aggregatedToolData';

// API keys
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY?.trim();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();

// Models
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
];

interface RequestBody {
  userId?: string;
  authToken?: string;
  focusAreas?: string[];
  tier?: 'free' | 'paid';
}

/**
 * Call Gemini Flash API (free tier)
 */
async function callGeminiWithModel(
  prompt: string,
  dataSnapshot: string,
  model: string,
  forceJsonResponse: boolean = true
): Promise<{ text: string; tokensUsed?: { input: number; output: number }; modelUsed: string }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt + '\n\n' + dataSnapshot }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          ...(forceJsonResponse ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData?.error?.message ||
      errorData?.message ||
      'Unknown Gemini error';
    const shouldRetryWithoutJsonMode =
      forceJsonResponse &&
      (message.toLowerCase().includes('responsemimetype') ||
        message.toLowerCase().includes('mime') ||
        message.toLowerCase().includes('json'));

    if (shouldRetryWithoutJsonMode) {
      console.warn(`[orchestrator] Gemini model (${model}) rejected JSON response mode, retrying without responseMimeType...`);
      return callGeminiWithModel(prompt, dataSnapshot, model, false);
    }

    console.error(`Gemini API error (${model}):`, errorData);
    throw new Error(`Gemini API error (${model}): ${response.status} ${message}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const usage = data.usageMetadata;

  if (!text) {
    throw new Error('No response from Gemini');
  }

  return {
    text,
    tokensUsed: usage ? {
      input: usage.promptTokenCount || 0,
      output: usage.candidatesTokenCount || 0,
    } : undefined,
    modelUsed: model,
  };
}

function shouldRetryGeminiWithAnotherModel(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('model') ||
    message.includes('not found') ||
    message.includes('unsupported') ||
    message.includes('retired') ||
    message.includes('invalid value')
  );
}

async function callGemini(
  prompt: string,
  dataSnapshot: string
): Promise<{ text: string; tokensUsed?: { input: number; output: number }; modelUsed: string }> {
  const modelsToTry = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS].filter((m, i, arr) => !!m && arr.indexOf(m) === i);
  let lastError: unknown;

  for (let i = 0; i < modelsToTry.length; i += 1) {
    const model = modelsToTry[i];
    try {
      return await callGeminiWithModel(prompt, dataSnapshot, model);
    } catch (error) {
      lastError = error;
      const isLastModel = i === modelsToTry.length - 1;
      if (isLastModel || !shouldRetryGeminiWithAnotherModel(error)) {
        throw error;
      }
      console.warn(`[orchestrator] Gemini model failed (${model}), trying fallback model...`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini API call failed');
}

/**
 * Call Claude Sonnet API (paid tier)
 */
async function callClaude(prompt: string, dataSnapshot: string): Promise<{ text: string; tokensUsed?: { input: number; output: number } }> {
  if (!CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt + '\n\n' + dataSnapshot,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Claude API error:', errorData);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;

  if (!text) {
    throw new Error('No response from Claude');
  }

  return {
    text,
    tokensUsed: {
      input: data.usage?.input_tokens || 0,
      output: data.usage?.output_tokens || 0,
    },
  };
}

function isClaudeAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Claude API error: 401') || message.includes('Claude API error: 403');
}

/**
 * Parse the LLM response into an OrchestratorPlan
 */
function parsePlanResponse(
  rawText: string,
  aggregatedData: AggregatedToolData,
  model: string
): OrchestratorPlan {
  // Strip markdown code blocks if present
  let cleanText = rawText.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.slice(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.slice(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.slice(0, -3);
  }
  cleanText = cleanText.trim();

  const parsed = JSON.parse(cleanText);

  return {
    id: `plan-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    modelUsed: model,
    dataCompleteness: aggregatedData.dataCompleteness,
    toolsAnalyzed: aggregatedData.toolsWithData,
    executiveSummary: parsed.executiveSummary || 'Unable to generate summary.',
    retirementReadinessScore: parsed.retirementReadinessScore || 0,
    topPriorities: parsed.topPriorities || [],
    sections: (parsed.sections || []).map((s: any, i: number) => ({
      id: s.id || `section-${i}`,
      title: s.title || 'Untitled Section',
      icon: s.icon || 'SparklesIcon',
      summary: s.summary || '',
      details: s.details || [],
      recommendations: s.recommendations || [],
      relatedTools: s.relatedTools || [],
      confidence: s.confidence || 'medium',
      priority: s.priority || 'medium',
    })),
    warnings: (parsed.warnings || []).map((w: any, i: number) => ({
      id: w.id || `warning-${i}`,
      severity: w.severity || 'info',
      title: w.title || 'Notice',
      description: w.description || '',
      actionRequired: w.actionRequired || '',
      relatedTools: w.relatedTools || [],
    })),
    synergies: (parsed.synergies || []).map((s: any) => ({
      title: s.title || '',
      description: s.description || '',
      tools: s.tools || [],
      potentialImpact: s.potentialImpact || '',
    })),
    immediateActions: parsed.immediateActions || [],
    shortTermActions: parsed.shortTermActions || [],
    longTermActions: parsed.longTermActions || [],
    missingDataSuggestions: (parsed.missingDataSuggestions || []).map((m: any) => ({
      tool: m.tool || '',
      toolId: m.toolId || '',
      reason: m.reason || '',
    })),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { focusAreas } = body;

    // Get auth token
    const authToken = body.authToken || request.headers.get('authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Determine tier — default to free
    const tier = body.tier || 'free';

    // Validate API key availability
    if (tier === 'paid' && !CLAUDE_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API not configured for paid tier' },
        { status: 500 }
      );
    }
    if (tier === 'free' && !GEMINI_API_KEY) {
      // Fall back to Claude if Gemini isn't configured but Claude is
      if (!CLAUDE_API_KEY) {
        return NextResponse.json(
          { error: 'No AI provider configured' },
          { status: 500 }
        );
      }
    }

    // Aggregate all tool data
    const aggregatedData = await aggregateAllToolData(authToken);

    // Check minimum data
    if (aggregatedData.toolsWithData.length === 0) {
      return NextResponse.json(
        {
          error: 'No tool data available. Please use at least one planning tool before generating a unified plan.',
          missingDataSuggestions: [
            { tool: 'Income Estimator', toolId: 'income-estimator', reason: 'Start by projecting your retirement income sources' },
            { tool: 'Social Security Optimizer', toolId: 'ss-optimizer', reason: 'Optimize your Social Security claiming strategy' },
            { tool: 'Tax Impact Analyzer', toolId: 'tax-analyzer', reason: 'Understand your retirement tax situation' },
          ],
        },
        { status: 400 }
      );
    }

    // Analyze cross-tool patterns
    const insights = analyzeCrossToolPatterns(aggregatedData);

    // Build the system prompt
    const prompt = buildOrchestratorPrompt(aggregatedData, insights, focusAreas);

    // Call the appropriate LLM
    let result: { text: string; tokensUsed?: { input: number; output: number }; modelUsed?: string };
    let modelUsed: string;
    let actualTier = tier;

    if (tier === 'paid' && CLAUDE_API_KEY) {
      try {
        result = await callClaude(prompt, '');
        modelUsed = CLAUDE_MODEL;
      } catch (error) {
        if (GEMINI_API_KEY && isClaudeAuthError(error)) {
          console.warn('[orchestrator] Claude auth failed for paid tier, falling back to Gemini.');
          result = await callGemini(prompt, '');
          modelUsed = result.modelUsed || GEMINI_MODEL;
          actualTier = 'free';
        } else {
          throw error;
        }
      }
    } else if (GEMINI_API_KEY) {
      result = await callGemini(prompt, '');
      modelUsed = result.modelUsed || GEMINI_MODEL;
    } else {
      // Fallback to Claude if available
      result = await callClaude(prompt, '');
      modelUsed = CLAUDE_MODEL;
      actualTier = 'paid';
    }

    // Parse the response
    let plan: OrchestratorPlan;
    try {
      plan = parsePlanResponse(result.text, aggregatedData, modelUsed);
    } catch (parseError) {
      console.error('Error parsing orchestrator response:', parseError);
      console.error('Raw response:', result.text.substring(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    const response: OrchestratorResponse = {
      plan,
      cached: false,
      tierUsed: actualTier as 'free' | 'paid',
      tokensUsed: result.tokensUsed,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in Orchestrator API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
