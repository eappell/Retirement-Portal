import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function base64UrlToBase64(input: string) {
  // convert base64url to base64
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  // pad
  while (input.length % 4 !== 0) input += '=';
  return input;
}

function base64UrlDecodeToJson(input: string) {
  const b64 = base64UrlToBase64(input);
  const buf = Buffer.from(b64, 'base64');
  return JSON.parse(buf.toString('utf8'));
}

export function middleware(req: NextRequest) {
  try {
    const secret = process.env.VIP_HMAC_SECRET;
    if (!secret) return NextResponse.next();

    const cookie = req.cookies.get('vip_session')?.value;
    if (!cookie) return NextResponse.next();

    const parts = cookie.split('.');
    if (parts.length !== 2) return NextResponse.next();
    const [payloadB64, sigB64url] = parts;

    const expectedHmac = crypto.createHmac('sha256', secret).update(payloadB64).digest();
    const expectedSigB64 = expectedHmac.toString('base64');
    const expectedSigB64url = expectedSigB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // timing-safe compare
    const a = Buffer.from(base64UrlToBase64(sigB64url), 'base64');
    const b = Buffer.from(base64UrlToBase64(expectedSigB64url), 'base64');
    if (a.length !== b.length) return NextResponse.next();
    if (!crypto.timingSafeEqual(a, b)) return NextResponse.next();

    const payload = base64UrlDecodeToJson(payloadB64) as any;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return NextResponse.next();

    const uid = typeof payload.uid === 'string' ? payload.uid : '';

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-vip-uid', uid);
    // Forward a portal-friendly user id and tier so server APIs can treat
    // VIP traffic as a paid user without depending on firebase-admin.
    requestHeaders.set('x-portal-user-id', uid);
    requestHeaders.set('x-portal-user-tier', 'paid');
    // Also include a compact JSON user blob for convenience in backend handlers
    try {
      requestHeaders.set('x-portal-user', JSON.stringify({ uid, tier: 'paid' }));
    } catch (e) {
      // ignore JSON errors
    }

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    try {
      // Also put the uid on the response for easier verification in tests
      res.headers.set('x-vip-uid', uid);
      res.headers.set('x-vip-auth', '1');
      res.headers.set('x-portal-user-id', uid);
      res.headers.set('x-portal-user-tier', 'paid');
    } catch (e) {
      /* ignore */
    }
    return res;
  } catch (err) {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!api/vip).*)'],
};
