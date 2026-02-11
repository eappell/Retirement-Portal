// Portal /api/insights — Forwards retirement plan analysis requests to the
// centralised PocketBase Proxy which now hosts the AI insights endpoint.

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:3001';

export async function POST(req) {
  try {
    const body = await req.json();
    const { plan, result } = body || {};
    if (!plan || !result || !plan.person1) {
      return new Response(
        JSON.stringify({ error: 'Missing required plan or result data (need plan.person1 and result)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Forward auth token from the request so the proxy can validate the user
    const authToken = body.authToken || body._authToken || req.headers.get('authorization')?.replace('Bearer ', '');

    if (!authToken) {
      return new Response(
        JSON.stringify({ error: 'Missing auth token — include authToken in body or Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const targetUrl = `${PROXY_URL.replace(/\/$/, '')}/api/insights`;

    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ plan, result, aiProvider: body.aiProvider }),
    });

    const text = await resp.text();
    const contentType = resp.headers.get('content-type') || '';

    if (!resp.ok) {
      console.error('[insights] proxy error', resp.status, contentType, text.slice(0, 200));
      if (contentType.includes('text/html')) {
        return new Response(
          JSON.stringify({ error: 'Proxy returned HTML — check NEXT_PUBLIC_PROXY_URL config' }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(text, { status: resp.status, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      const parsed = JSON.parse(text);
      const providerHeader = resp.headers.get('x-ai-provider') || '';
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-AI-Provider': providerHeader,
          'Access-Control-Expose-Headers': 'X-AI-Provider',
        },
      });
    } catch {
      return new Response(text, { status: 200 });
    }
  } catch (err) {
    console.error('[insights] route error', err);
    const fallback = `Overview:\nFallback response — the proxy may be unavailable.\n\nTips:\n1. Review asset allocation.\n2. Increase retirement savings by 1-3%.\n3. Revisit retirement age and Social Security timing.`;
    return new Response(
      JSON.stringify({ text: fallback, _fallback: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
