export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  // Try to infer user tier from headers or cookies set by the portal auth
  const headerTier = (req.headers['x-portal-user-tier'] || req.headers['x-user-tier'] || '').toString().toLowerCase();
  const cookieTier = (req.cookies && req.cookies.tier) ? req.cookies.tier.toString().toLowerCase() : '';
  const bodyTier = (req.body && req.body._userTier) ? String(req.body._userTier).toLowerCase() : '';
  const tier = headerTier || cookieTier || bodyTier || 'free';

  // Only allow admin/paid/premium roles to request insights through the portal proxy
  if (!['admin', 'premium', 'paid'].includes(tier)) {
    return res.status(403).json({ error: 'Forbidden: insufficient role for AI insights' });
  }

  // Forward the request to the deployed planner's /api/insights endpoint.
  // Use a server-side bypass token to access protected Vercel deployments.
  const targetApp = process.env.RETIREMENT_APP_URL || process.env.VERCEL_RETIREMENT_URL;
  if (!targetApp) return res.status(500).json({ error: 'RETIREMENT_APP_URL not configured' });

  const bypass = process.env.VERCEL_BYPASS_TOKEN || process.env.VERCEL_PROTECTION_BYPASS;
  const targetBase = targetApp.replace(/\/$/, '');
  const targetUrl = bypass ? `${targetBase}/api/insights?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${bypass}` : `${targetBase}/api/insights`;

  try {
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const text = await resp.text();
    if (!resp.ok) return res.status(resp.status).send(text);
    try { return res.status(200).json(JSON.parse(text)); } catch (e) { return res.status(200).send(text); }
  } catch (err) {
    console.error('portal insights proxy error', err);
    return res.status(500).json({ error: 'portal proxy failed' });
  }
}
