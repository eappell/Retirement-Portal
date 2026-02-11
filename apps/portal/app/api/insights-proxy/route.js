import { NextResponse } from 'next/server';

// Portal /api/insights-proxy — premium-gated proxy that forwards to the
// centralised PocketBase Proxy's /api/insights endpoint.

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:3001';

export async function POST(req) {
  try {
    const body = await req.json();

    // Tier check — only admin/premium/paid users may call insights
    const tierHeader = (req.headers.get('x-portal-user-tier') || '').toLowerCase();
    const tierFromBody = (body && body._userTier) ? String(body._userTier).toLowerCase() : '';
    const tier = tierHeader || tierFromBody || 'free';

    if (!['admin', 'premium', 'paid'].includes(tier)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Forward auth token so the proxy can validate the user
    const authToken = body.authToken || body._authToken || req.headers.get('authorization')?.replace('Bearer ', '');

    if (!authToken) {
      return NextResponse.json(
        { error: 'Missing auth token — include authToken in body or Authorization header' },
        { status: 401 }
      );
    }

    const targetUrl = `${PROXY_URL.replace(/\/$/, '')}/api/insights`;

    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ plan: body.plan, result: body.result, aiProvider: body.aiProvider }),
    });

    const text = await resp.text();
    const contentType = resp.headers.get('content-type') || '';

    if (!resp.ok) {
      console.error('[insights-proxy] proxy error', resp.status, contentType, text.slice(0, 200));
      if (contentType.includes('text/html')) {
        return NextResponse.json(
          { error: 'Proxy returned HTML — check NEXT_PUBLIC_PROXY_URL config' },
          { status: 502 }
        );
      }
      try {
        return NextResponse.json(JSON.parse(text), { status: resp.status });
      } catch {
        return new Response(text, { status: resp.status });
      }
    }

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch {
      return new Response(text, { status: 200 });
    }
  } catch (err) {
    console.error('insights-proxy route error', err);
    return NextResponse.json({ error: 'proxy error' }, { status: 500 });
  }
}
