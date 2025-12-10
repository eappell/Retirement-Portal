// No direct AI SDK usage here; prefer forwarding to a dedicated Planner app if configured.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const { plan, result } = req.body || {};
  if (!plan || !result || !plan.person1) {
    return res.status(400).json({ error: 'Missing required plan or result data (need plan.person1 and result)' });
  }

  // per-request provider: body.aiProvider, query.ai_provider, or env fallback
  const provider = (req.body && req.body.aiProvider) || req.query.ai_provider || process.env.AI_PROVIDER || 'google';
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

  try {
    // Prefer forwarding to Planner if environment points to it (centralized AI handling)
    const targetApp = process.env.RETIREMENT_APP_URL || process.env.VERCEL_RETIREMENT_URL;
    if (targetApp) {
      const base = targetApp.replace(/\/$/, '');
      const resp = await fetch(`${base}/api/insights`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body) });
      const text = await resp.text();
      if (!resp.ok) {
        return res.status(resp.status).send(text);
      }
      try { const parsed = JSON.parse(text); if (parsed) return res.status(200).json(parsed); } catch(e) { return res.status(200).send(text); }
    }
    // If Planner not configured, return an informative message (or optionally fallback)
    return res.status(400).json({ error: 'Planner AI not configured. Set RETIREMENT_APP_URL or configure local SDKs in the portal.' });

    if (typeof text !== 'string') text = String(text);
    try { text = text.replace(/\n---\n/g, '\n<hr />\n'); } catch (e) { /* ignore */ }

    res.setHeader('Access-Control-Expose-Headers', 'X-AI-Provider');
    res.setHeader('X-AI-Provider', providerLower);
    return res.status(200).json({ text });
  } catch (err) {
    console.error('insights error', err);
    const fallback = `Overview:\nThis is a fallback response summarizing the plan for ${p1.name || 'Person 1'}.\n\nTips:\n1. Review asset allocation.\n2. Increase retirement savings by 1-3%.\n3. Revisit retirement age and Social Security timing.`;
    res.setHeader('Access-Control-Expose-Headers', 'X-AI-Provider');
    res.setHeader('X-AI-Provider', providerLower);
    return res.status(200).json({ text: fallback, _fallback: true });
  }
}
