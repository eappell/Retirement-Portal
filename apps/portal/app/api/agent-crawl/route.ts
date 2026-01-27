import { NextResponse } from 'next/server';

function allowedHostnamesFromEnv() {
  const raw = process.env.ALLOWED_CRAWL_DOMAINS || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const secretHeader = request.headers.get('x-agent-secret') || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const allowedSecret = process.env.AGENT_SECRET || process.env.VERCEL_PROTECTION_BYPASS || process.env.VERCEL_BYPASS_TOKEN;
    if (!allowedSecret || !secretHeader || secretHeader !== allowedSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const target = String(body?.target || '').trim();
    if (!target) return NextResponse.json({ ok: false, error: 'Missing target' }, { status: 400 });

    let targetUrl: URL;
    try {
      targetUrl = new URL(target);
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'Invalid URL' }, { status: 400 });
    }
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return NextResponse.json({ ok: false, error: 'Unsupported protocol' }, { status: 400 });
    }

    const allowed = allowedHostnamesFromEnv();
    const requestHost = new URL(request.url).hostname;
    // Default allow same-origin and RETIREMENT_APP_URL host if no explicit allowlist
    const retirementHost = (process.env.RETIREMENT_APP_URL && (() => { try { return new URL(process.env.RETIREMENT_APP_URL).hostname; } catch { return null; } })()) || null;
    const hostAllowed = allowed.length > 0
      ? allowed.includes(targetUrl.hostname)
      : (targetUrl.hostname === requestHost || (retirementHost && targetUrl.hostname === retirementHost));
    if (!hostAllowed) return NextResponse.json({ ok: false, error: 'Target not allowed' }, { status: 403 });

    const vipToken = process.env.VIP_TOKEN;
    if (!vipToken) return NextResponse.json({ ok: false, error: 'VIP_TOKEN not configured' }, { status: 500 });

    // Request VIP token/cookie from portal's own /api/vip
    const vipEndpoint = new URL('/api/vip', request.url);
    vipEndpoint.searchParams.set('token', vipToken);

    const vipResp = await fetch(vipEndpoint.toString());
    const setCookie = vipResp.headers.get('set-cookie') || '';
    let cookieHeader: string | null = null;
    if (setCookie) {
      const m = setCookie.match(/vip_session=([^;\s]+)/);
      if (m) cookieHeader = `vip_session=${m[1]}`;
    }

    const vipJson = await vipResp.json().catch(() => null);
    const idToken = vipJson?.idToken || vipJson?.token || vipJson?.id_token || null;

    const fetchHeaders: Record<string, string> = {
      'user-agent': 'portal-agent/1.0 (+https://retirement-portal.vercel.app)'
    };
    if (cookieHeader) fetchHeaders['cookie'] = cookieHeader;
    else if (idToken) fetchHeaders['authorization'] = `Bearer ${idToken}`;

    const resp = await fetch(targetUrl.toString(), { headers: fetchHeaders, redirect: 'follow' });
    const text = await resp.text().catch(() => '');

    const max = parseInt(process.env.AGENT_CRAWL_MAX_BODY || '200000', 10);
    const bodyOut = text.length > max ? text.slice(0, max) : text;

    const importantHeaders: Record<string, string> = {};
    const pick = ['content-type', 'content-length', 'content-encoding', 'cache-control', 'set-cookie'];
    for (const h of pick) {
      const v = resp.headers.get(h);
      if (v) importantHeaders[h] = v;
    }

    return NextResponse.json({ ok: true, status: resp.status, headers: importantHeaders, body: bodyOut });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
