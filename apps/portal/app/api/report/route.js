import { NextResponse } from 'next/server';

// Portal /api/report — Forwards report events to the centralised PocketBase
// Proxy's /api/report endpoint.  Falls back to the old PORTAL_TRACK_URL
// forwarding if the proxy isn't configured.

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:3001';

export async function POST(req) {
  const body = await req.json().catch(() => null);

  // Forward auth token if present
  const authToken = (body && (body.authToken || body._authToken)) ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  // If we have an auth token, route through the proxy (centralised)
  if (authToken) {
    try {
      const targetUrl = `${PROXY_URL.replace(/\/$/, '')}/api/report`;
      const resp = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });
      const text = await resp.text();
      if (!resp.ok) {
        console.error('[report] proxy error', resp.status, text.slice(0, 200));
        // Fall through to legacy forwarding below
      } else {
        try {
          return NextResponse.json(JSON.parse(text));
        } catch {
          return new Response(text, { status: 200 });
        }
      }
    } catch (err) {
      console.warn('[report] proxy call failed, falling back to direct forwarding', err);
    }
  }

  // Legacy fallback: forward directly to PORTAL_TRACK_URL
  let trackUrl = process.env.PORTAL_TRACK_URL;
  if (trackUrl && !trackUrl.endsWith('/api/report')) {
    if (trackUrl.endsWith('/report')) {
      trackUrl = trackUrl.replace(/\/report$/, '/api/report');
    } else {
      const base = trackUrl.replace(/\/$/, '');
      trackUrl = `${base}/api/report`;
    }
  }
  if (!trackUrl) {
    return new Response(JSON.stringify({ ok: true, warning: 'PORTAL_TRACK_URL not configured; skipping portal forwarding', forwarded: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const incomingSource = req.headers.get('x-report-source');
    if (incomingSource === 'retirement-planner') {
      return new Response(JSON.stringify({ ok: true, forwarded: false, reason: 'received from planner' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const resp = await fetch(trackUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Report-Source': 'retire-portal' }, body: JSON.stringify(body) });
    const text = await resp.text();
    if (!resp.ok) return new Response(text, { status: resp.status });
    try { return new Response(JSON.stringify(JSON.parse(text)), { status: 200, headers: { 'Content-Type': 'application/json' } }); } catch { return new Response(text, { status: 200 }); }
  } catch (err) {
    console.error('report route error', err);
    return new Response(JSON.stringify({ error: 'Report forwarding failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
