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
    // If the remote returned HTML (e.g. Vercel "Authentication Required" page), surface a helpful error
    const contentType = resp.headers.get('content-type') || '';
    if (!resp.ok) {
      console.error('[insights-proxy] upstream error', resp.status, contentType, text.slice(0, 200));
      // If it's HTML, return a clear JSON error to guide configuration
      if (contentType.includes('text/html')) {
        return NextResponse.json({ error: 'Upstream authentication required or returned HTML. Ensure RETIREMENT_APP_URL and VERCEL_BYPASS_TOKEN are configured in the portal.' }, { status: 502 });
      }
      try {
        return NextResponse.json(JSON.parse(text), { status: resp.status });
      } catch (e) {
        return new Response(text, { status: resp.status });
      }
    }

    // Successful upstream response: try to parse JSON, otherwise return raw text
    try {
      const parsed = JSON.parse(text);
      // If upstream returned a fallback response, surface a helpful header and include diagnostics
      if (parsed && parsed._fallback) {
        const reason = parsed._fallbackReason || parsed._fallbackReason || null;
        if (reason) {
          console.warn('[insights-proxy] upstream returned fallback reason:', reason);
        }
        // Attach the upstream fallback reason to response JSON for client visibility (non-sensitive)
        parsed._upstreamFallbackReason = reason || null;
      }
      return NextResponse.json(parsed);
    } catch (e) {
      // If upstream returned HTML unexpectedly, surface guidance
      if (contentType.includes('text/html')) {
        console.warn('[insights-proxy] upstream returned HTML on 200; possible protection page');
        return NextResponse.json({ error: 'Upstream returned HTML. Check planner deployment protection and bypass token.' }, { status: 502 });
      }
      return new Response(text, { status: 200 });
    }
  } catch (err) {
    console.error('insights-proxy route error', err);
    return NextResponse.json({ error: 'proxy error' }, { status: 500 });
  }
}
