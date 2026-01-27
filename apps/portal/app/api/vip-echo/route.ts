import { NextResponse } from 'next/server';
import crypto from 'crypto';

function base64UrlToBase64(input: string) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4 !== 0) input += '=';
  return input;
}

function verifyVipSession(cookieValue: string | undefined) {
  if (!cookieValue) return null;
  try {
    const parts = cookieValue.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64url, sigB64url] = parts;
    const secret = process.env.VIP_HMAC_SECRET;
    if (!secret) return null;

    const expected = crypto.createHmac('sha256', secret).update(payloadB64url).digest();
    const expectedB64 = expected.toString('base64');
    const expectedB64url = expectedB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const a = Buffer.from(base64UrlToBase64(sigB64url), 'base64');
    const b = Buffer.from(base64UrlToBase64(expectedB64url), 'base64');
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    const payloadJson = Buffer.from(base64UrlToBase64(payloadB64url), 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson) as any;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return null;
    return typeof payload.uid === 'string' ? payload.uid : null;
  } catch (e) {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const headersObj: Record<string, string> = {};
    for (const [k, v] of request.headers.entries()) headersObj[k] = v;

    // Attempt to verify vip_session cookie server-side as a fallback
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies: Record<string, string> = {};
    if (cookieHeader) {
      for (const part of cookieHeader.split(';')) {
        const [k, ...rest] = part.trim().split('=');
        if (!k) continue;
        cookies[k] = rest.join('=');
      }
    }

    const vipUidFromHeader = request.headers.get('x-vip-uid') || null;
    const vipUidFromCookie = verifyVipSession(cookies['vip_session']);
    const vipUid = vipUidFromHeader || vipUidFromCookie || null;

    return NextResponse.json({ ok: true, vipUid, headers: headersObj, cookies });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
