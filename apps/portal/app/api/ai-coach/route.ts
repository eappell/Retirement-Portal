import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  message: string;
  history?: Message[];
  userId?: string;
}

async function fetchUserRetirementData(userId: string) {
  try {
    const profileDoc = await getDoc(doc(db, "users", userId));
    
    if (!profileDoc.exists()) {
      return null;
    }

    const profileData = profileDoc.data();
    const context: string[] = [];
    let dataSnapshot = "";

    // Build a comprehensive data snapshot for the AI
    dataSnapshot += `\nUser Profile:\n`;
    dataSnapshot += `- Age: ${profileData.age || "Not specified"}\n`;
    dataSnapshot += `- Retirement Age Target: ${profileData.retirementAge || "Not specified"}\n`;
    dataSnapshot += `- Location: ${profileData.location || "Not specified"}\n`;
    dataSnapshot += `- Current Savings: ${profileData.currentSavings ? `$${profileData.currentSavings.toLocaleString()}` : "Not specified"}\n`;
    dataSnapshot += `- Monthly Expenses: ${profileData.monthlyExpenses ? `$${profileData.monthlyExpenses.toLocaleString()}` : "Not specified"}\n`;

    // Fetch tool-specific data
    try {
      // Income data
      const incomeQuery = query(
        collection(db, "userToolData"),
        where("userId", "==", userId),
        where("toolId", "==", "income-estimator"),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const incomeSnap = await getDocs(incomeQuery);
      if (!incomeSnap.empty) {
        const incomeData = incomeSnap.docs[0].data();
        context.push("Income Estimator");
        dataSnapshot += `\nIncome Sources:\n`;
        dataSnapshot += `- Total Retirement Income: $${(incomeData.totalIncome || 0).toLocaleString()}/year\n`;
        dataSnapshot += `- Social Security: $${(incomeData.socialSecurity || 0).toLocaleString()}/year\n`;
        dataSnapshot += `- Pension: $${(incomeData.pension || 0).toLocaleString()}/year\n`;
        dataSnapshot += `- Investments: $${(incomeData.investments || 0).toLocaleString()}/year\n`;
      }
    } catch (e) {
      // Silent fail
    }

    try {
      // Social Security data
      const ssQuery = query(
        collection(db, "userToolData"),
        where("userId", "==", userId),
        where("toolId", "==", "social-security"),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const ssSnap = await getDocs(ssQuery);
      if (!ssSnap.empty) {
        const ssData = ssSnap.docs[0].data();
        context.push("Social Security Optimizer");
        dataSnapshot += `\nSocial Security:\n`;
        dataSnapshot += `- Current Claim Age Plan: ${ssData.claimAge || "Not set"}\n`;
        dataSnapshot += `- Estimated Benefit: $${(ssData.estimatedBenefit || 0).toLocaleString()}/year\n`;
        dataSnapshot += `- Optimization Potential: $${(ssData.optimizationPotential || 0).toLocaleString()} lifetime\n`;
      }
    } catch (e) {
      // Silent fail
    }

    try {
      // Tax data
      const taxQuery = query(
        collection(db, "userToolData"),
        where("userId", "==", userId),
        where("toolId", "==", "tax-impact-analyzer"),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const taxSnap = await getDocs(taxQuery);
      if (!taxSnap.empty) {
        const taxData = taxSnap.docs[0].data();
        context.push("Tax Impact Analyzer");
        dataSnapshot += `\nTax Information:\n`;
        dataSnapshot += `- Current State: ${taxData.state || "Not specified"}\n`;
        dataSnapshot += `- Effective Tax Rate: ${taxData.effectiveTaxRate || 0}%\n`;
        dataSnapshot += `- Annual Tax Burden: $${(taxData.annualTax || 0).toLocaleString()}\n`;
        dataSnapshot += `- Potential Savings (relocation): $${(taxData.potentialSavings || 0).toLocaleString()}/year\n`;
      }
    } catch (e) {
      // Silent fail
    }

    try {
      // Healthcare data
      const healthQuery = query(
        collection(db, "userToolData"),
        where("userId", "==", userId),
        where("toolId", "==", "healthcare-cost"),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const healthSnap = await getDocs(healthQuery);
      if (!healthSnap.empty) {
        const healthData = healthSnap.docs[0].data();
        context.push("Healthcare Cost Estimator");
        dataSnapshot += `\nHealthcare:\n`;
        dataSnapshot += `- Monthly Premium: $${(healthData.monthlyPremium || 0).toLocaleString()}\n`;
        dataSnapshot += `- Annual Out-of-Pocket: $${(healthData.outOfPocket || 0).toLocaleString()}\n`;
        dataSnapshot += `- HSA Balance: $${(healthData.hsaBalance || 0).toLocaleString()}\n`;
      }
    } catch (e) {
      // Silent fail
    }

    return { dataSnapshot, context };
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
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

    // Get userId from request body or headers
    const userId = body.userId || request.headers.get("x-user-id");

    // Fetch user's retirement data
    let userDataContext = "";
    let analyzedTools: string[] = [];
    
    if (userId) {
      const userData = await fetchUserRetirementData(userId);
      if (userData) {
        userDataContext = userData.dataSnapshot;
        analyzedTools = userData.context;
      }
    }

    // Build conversation context
    const systemPrompt = `You are RetireWise AI Coach, a knowledgeable and empathetic retirement planning advisor. You help users understand their retirement plans by:

1. Analyzing data across multiple retirement planning tools (Income Estimator, Social Security Optimizer, Tax Impact Analyzer, Healthcare Cost Estimator, etc.)
2. Providing personalized, actionable recommendations based on their specific situation
3. Breaking down complex financial concepts into easy-to-understand language
4. Offering specific dollar amounts and timeframes when possible
5. Connecting insights across different areas (e.g., how Social Security optimization affects tax planning)

Key traits:
- Professional yet warm and approachable
- Data-driven but not overwhelming
- Focused on actionable next steps
- Honest about limitations and when professional advice is needed
- Proactive in identifying opportunities the user might miss

${userDataContext ? `\nCURRENT USER DATA:${userDataContext}\n\nUse this data to provide personalized advice. Reference specific numbers and tool insights when relevant.` : "\nNote: Limited user data available. When you don't have specific data, acknowledge this and offer to help them use the relevant tools to gather the information needed."}

Always be specific with recommendations and explain the reasoning behind your advice.`;

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
        max_tokens: 800,
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
      context: analyzedTools,
      model: OPENAI_MODEL,
    });
  } catch (error) {
    console.error("Error in AI Coach API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
