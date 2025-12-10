import { NextResponse } from 'next/server';

export async function POST(req) {
  const body = await req.json().catch(() => null);
  let trackUrl = process.env.PORTAL_TRACK_URL;
  // Normalize common mistakes by ensuring the forwarding URL points at /api/report
  if (trackUrl && !trackUrl.endsWith('/api/report')) {
    // If it ends with /report but not /api/report, replace with /api/report
    if (trackUrl.endsWith('/report')) {
      trackUrl = trackUrl.replace(/\/report$/, '/api/report');
    } else {
      // Otherwise, append /api/report (handle trailing slash)
      const base = trackUrl.replace(/\/$/, '');
      trackUrl = `${base}/api/report`;
    }
  }
  if (!trackUrl) {
    return new Response(JSON.stringify({ ok: true, warning: 'PORTAL_TRACK_URL not configured; skipping portal forwarding', forwarded: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // If this request already came from the planner, avoid forwarding back to it to prevent loops.
    const incomingSource = req.headers.get('x-report-source');
    if (incomingSource === 'retirement-planner') {
      console.warn('[report] received forwarded request from planner; not forwarding to avoid loop');
      return new Response(JSON.stringify({ ok: true, forwarded: false, reason: 'received from planner' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    console.log('[report] forwarding to', trackUrl, 'body=', body);
    const resp = await fetch(trackUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Report-Source': 'retire-portal' }, body: JSON.stringify(body) });
    const text = await resp.text();
    console.log('[report] remote responded', resp.status, text);
    if (!resp.ok) return new Response(text, { status: resp.status });
    try { return new Response(JSON.stringify(JSON.parse(text)), { status: 200, headers: { 'Content-Type': 'application/json' } }); } catch (e) { return new Response(text, { status: 200 }); }
  } catch (err) {
    console.error('report route error', err);
    return new Response(JSON.stringify({ error: 'Report forwarding failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
