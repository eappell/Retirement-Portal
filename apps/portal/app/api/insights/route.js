import { generateWithClaude, generateWithGoogle } from '../../../../../lib/ai.js';

export async function POST(req) {
  try {
    const body = await req.json();
    const { plan, result } = body || {};
    if (!plan || !result || !plan.person1) {
      return new Response(JSON.stringify({ error: 'Missing required plan or result data (need plan.person1 and result)' }), { status: 400 });
    }

    const provider = (body && body.aiProvider) || new URL(req.url).searchParams.get('ai_provider') || process.env.AI_PROVIDER || 'google';
    const providerLower = String(provider).toLowerCase();

    const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

    const totalInvestments = ([...(plan.retirementAccounts || []), ...(plan.investmentAccounts || [])]).reduce((s, a) => s + (a.balance || 0), 0);
    const planType = plan.planType || 'Unknown';
    const state = plan.state || 'Unknown';
    const inflationRate = plan.inflationRate ?? 'Unknown';
    const avgReturn = plan.avgReturn ?? 'Unknown';
    const p1 = plan.person1 || {};
    const p2 = plan.person2 || {};

    const planSummary = `A user is planning for retirement with the following details:\n- Planning for: ${planType}\n- State: ${state}\n- Inflation: ${inflationRate}%\n- Avg return: ${avgReturn}%\n\nPeople:\n- ${p1.name || 'Person 1'}: age ${p1.currentAge ?? 'Unknown'}, retires ${p1.retirementAge ?? 'Unknown'}\n${planType === 'Couple' ? `- ${p2.name || 'Person 2'}: age ${p2.currentAge ?? 'Unknown'}, retires ${p2.retirementAge ?? 'Unknown'}\n` : ''}\nFinancials:\n- Total investments: ${formatCurrency(totalInvestments)}\n- Avg monthly net income (today): ${formatCurrency(result.avgMonthlyNetIncomeToday || 0)}\n- Net worth at end: ${formatCurrency(result.netWorthAtEnd || 0)}\n`;

    const prompt = `You are a friendly financial advisor. Read the plan summary and give a short Overview and three Actionable Tips in Markdown.\n\n${planSummary}`;

    // If the Planner app is configured, prefer forwarding to it so AI calls are centralized.
    const targetApp = process.env.RETIREMENT_APP_URL || process.env.VERCEL_RETIREMENT_URL;
    if (targetApp) {
      const bypass = process.env.VERCEL_BYPASS_TOKEN || process.env.VERCEL_PROTECTION_BYPASS;
      const base = targetApp.replace(/\/$/, '');
      const targetUrl = bypass ? `${base}/api/insights?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${bypass}` : `${base}/api/insights`;
      const upstreamResp = await fetch(targetUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const ttext = await upstreamResp.text();
      const contentType = upstreamResp.headers.get('content-type') || '';
      if (!upstreamResp.ok) {
        console.error('[insights route] upstream error', upstreamResp.status, contentType, ttext.slice(0, 200));
        try { return new Response(ttext, { status: upstreamResp.status, headers: { 'Content-Type': contentType || 'application/json' } }); } catch (e) { return new Response(JSON.stringify({ error: 'Upstream error' }), { status: 502 }); }
      }
      try { return new Response(JSON.stringify(JSON.parse(ttext)), { status: 200, headers: { 'Content-Type': 'application/json', 'X-AI-Provider': providerLower } }); } catch (e) { return new Response(ttext, { status: 200 }); }
    }

    // Fall back to running locally in the Portal if Planner is not configured.
    let text;
    if (providerLower === 'claude') {
      const claudePrompt = `Human: Please read the following retirement plan summary and provide a short Overview and three Actionable Tips in Markdown.\n\n${planSummary}\n\nAssistant:`;
      text = await generateWithClaude(claudePrompt);
    } else {
      text = await generateWithGoogle(prompt);
    }

    if (typeof text !== 'string') text = String(text);
    try { text = text.replace(/\n---\n/g, '\n<hr />\n'); } catch (e) { /* ignore */ }

    return new Response(JSON.stringify({ text }), { status: 200, headers: { 'Content-Type': 'application/json', 'X-AI-Provider': providerLower, 'Access-Control-Expose-Headers': 'X-AI-Provider' } });
  } catch (err) {
    console.error('insights route error', err);
    const fallback = `Overview:\nThis is a fallback response summarizing the plan.\n\nTips:\n1. Review asset allocation.\n2. Increase retirement savings by 1-3%.\n3. Revisit retirement age and Social Security timing.`;
    return new Response(JSON.stringify({ text: fallback, _fallback: true }), { status: 200, headers: { 'Content-Type': 'application/json', 'X-AI-Provider': (process.env.AI_PROVIDER || 'google') } });
  }
}
