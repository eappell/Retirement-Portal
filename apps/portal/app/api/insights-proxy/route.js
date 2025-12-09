import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();

    // Try to get tier from headers or cookies forwarded by portal auth
    const tierHeader = (req.headers.get('x-portal-user-tier') || '').toLowerCase();
    const tierFromBody = (body && body._userTier) ? String(body._userTier).toLowerCase() : '';
    const tier = tierHeader || tierFromBody || 'free';

    if (!['admin', 'premium', 'paid'].includes(tier)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetApp = process.env.RETIREMENT_APP_URL || process.env.VERCEL_RETIREMENT_URL;
    if (!targetApp) return NextResponse.json({ error: 'RETIREMENT_APP_URL not configured' }, { status: 500 });

    const bypass = process.env.VERCEL_BYPASS_TOKEN || process.env.VERCEL_PROTECTION_BYPASS;
    const targetBase = targetApp.replace(/\/$/, '');
    const targetUrl = bypass ? `${targetBase}/api/insights?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${bypass}` : `${targetBase}/api/insights`;

    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    if (!resp.ok) return new Response(text, { status: resp.status });
    try { return NextResponse.json(JSON.parse(text)); } catch (e) { return new Response(text, { status: 200 }); }
  } catch (err) {
    console.error('insights-proxy route error', err);
    return NextResponse.json({ error: 'proxy error' }, { status: 500 });
  }
}
