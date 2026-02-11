import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { aggregateAllToolData, buildDataSnapshotForAI } from "@/lib/dataAggregationService";
import { analyzeCrossToolPatterns, formatInsightsForAI } from "@/lib/crossToolAnalyzer";
import type { AggregatedToolData, CrossToolInsight } from "@/lib/types/aggregatedToolData";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

// Proxy URL for PocketBase data
const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'https://proxy.retirewise.now';

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  message: string;
  history?: Message[];
  userId?: string;
  authToken?: string;
}

interface EnhancedContext {
  dataSnapshot: string;
  crossToolInsights: CrossToolInsight[];
  analyzedTools: string[];
  aggregatedData: AggregatedToolData | null;
}

/**
 * Fetch user data from PocketBase via proxy and analyze for insights
 */
async function fetchEnhancedUserContext(authToken: string): Promise<EnhancedContext> {
  try {
    // Aggregate all tool data from PocketBase
    const aggregatedData = await aggregateAllToolData(authToken);

    // Analyze for cross-tool opportunities
    const crossToolInsights = analyzeCrossToolPatterns(aggregatedData);

    // Build human-readable snapshot for AI
    const dataSnapshot = buildDataSnapshotForAI(aggregatedData);

    // Get list of tools with data
    const analyzedTools = aggregatedData.toolsWithData.map(toolId => {
      const toolNames: Record<string, string> = {
        'income-estimator': 'Income Estimator',
        'ss-optimizer': 'Social Security Optimizer',
        'tax-analyzer': 'Tax Impact Analyzer',
        'healthcare-cost': 'Healthcare Cost Estimator',
        'retire-abroad': 'Retire Abroad',
        'state-relocator': 'State Relocator',
        'longevity-planner': 'Longevity Planner',
        'retirement-identity-builder': 'Identity Builder',
        'volunteer-matcher': 'Volunteer Matcher',
        'legacy-flow-visualizer': 'Legacy Visualizer',
        'gifting-planner': 'Gifting Planner',
        'digital-estate-manager': 'Digital Estate Manager',
      };
      return toolNames[toolId] || toolId;
    });

    return {
      dataSnapshot,
      crossToolInsights,
      analyzedTools,
      aggregatedData,
    };
  } catch (error) {
    console.error("Error fetching enhanced user context:", error);
    return {
      dataSnapshot: "",
      crossToolInsights: [],
      analyzedTools: [],
      aggregatedData: null,
    };
  }
}

/**
 * Fallback to Firestore for basic user profile data
 */
async function fetchUserProfileFromFirestore(userId: string): Promise<string> {
  try {
    const profileDoc = await getDoc(doc(db, "users", userId));

    if (!profileDoc.exists()) {
      return "";
    }

    const profileData = profileDoc.data();
    let snapshot = "\n## User Profile (from account):\n";
    snapshot += `- Age: ${profileData.age || "Not specified"}\n`;
    snapshot += `- Retirement Age Target: ${profileData.retirementAge || "Not specified"}\n`;
    snapshot += `- Location: ${profileData.location || "Not specified"}\n`;
    snapshot += `- Current Savings: ${profileData.currentSavings ? `$${profileData.currentSavings.toLocaleString()}` : "Not specified"}\n`;
    snapshot += `- Monthly Expenses: ${profileData.monthlyExpenses ? `$${profileData.monthlyExpenses.toLocaleString()}` : "Not specified"}\n`;

    return snapshot;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY environment variable is not set");
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please set OPENAI_API_KEY in your environment." },
        { status: 500 }
      );
    }

    const body: RequestBody = await request.json();
    const { message, history = [] } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get userId and authToken from request
    const userId = body.userId || request.headers.get("x-user-id");
    const authToken = body.authToken || request.headers.get("authorization")?.replace("Bearer ", "");

    // Fetch user's retirement data from PocketBase
    let enhancedContext: EnhancedContext = {
      dataSnapshot: "",
      crossToolInsights: [],
      analyzedTools: [],
      aggregatedData: null,
    };

    let userProfileContext = "";

    if (authToken) {
      // Primary path: Use PocketBase via proxy
      enhancedContext = await fetchEnhancedUserContext(authToken);
    }

    // Also fetch basic profile from Firestore
    if (userId) {
      userProfileContext = await fetchUserProfileFromFirestore(userId);
    }

    // Format cross-tool insights for the prompt
    const insightsContext = formatInsightsForAI(enhancedContext.crossToolInsights);

    // Build enhanced system prompt
    const systemPrompt = `You are RetireWise AI Coach, a proactive retirement planning advisor with access to comprehensive data from 12 planning tools.

YOUR ROLE:
1. PROACTIVELY identify optimization opportunities across tools before the user asks
2. Connect insights ACROSS tools (e.g., tax savings + relocation + healthcare)
3. Prioritize high-impact recommendations with specific dollar amounts
4. Reference specific data from the user's tools to personalize advice
5. Be data-driven but conversational and easy to understand

AVAILABLE TOOLS:
- Income Estimator: Retirement income sources and scenarios
- Social Security Optimizer: Claiming strategy optimization
- Tax Impact Analyzer: State/federal tax analysis
- Healthcare Cost Estimator: Lifetime healthcare projections
- Retire Abroad: International retirement options
- State Relocator: Domestic relocation analysis
- Longevity Planner: Lifespan and health planning
- Identity Builder: Retirement purpose and goals
- Volunteer Matcher: Community engagement opportunities
- Legacy Visualizer: Estate and inheritance planning
- Gifting Planner: Tax-advantaged giving strategies
- Estate Manager: Digital estate organization

${enhancedContext.dataSnapshot ? `\n${enhancedContext.dataSnapshot}` : ""}
${userProfileContext}

${insightsContext ? `\n${insightsContext}` : ""}

RESPONSE STYLE:
- Lead with the most impactful insight if relevant to the question
- Use specific numbers from their data (don't make up numbers)
- Explain connections between different tools and planning areas
- Provide clear, actionable next steps
- Be conversational but data-driven
- If data is limited, acknowledge it and suggest which tools to use

${enhancedContext.analyzedTools.length === 0 ? "\nNote: Limited user data available. When you don't have specific data, acknowledge this and offer to help them use the relevant tools to gather the information needed." : ""}`;

    // Build messages array for OpenAI
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (last 10 messages for context)
    const recentHistory = history.slice(-10);
    recentHistory.forEach((msg) => {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    });

    // Add current message
    messages.push({
      role: "user",
      content: message,
    });

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1000, // Increased for more detailed responses
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        { error: "Failed to get AI response" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content;

    if (!aiMessage) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: aiMessage,
      context: enhancedContext.analyzedTools,
      model: OPENAI_MODEL,
      insights: enhancedContext.crossToolInsights,
      dataCompleteness: enhancedContext.aggregatedData?.dataCompleteness || 0,
    });
  } catch (error) {
    console.error("Error in AI Coach API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
