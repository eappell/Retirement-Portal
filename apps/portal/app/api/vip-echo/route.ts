import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const headersObj: Record<string, string> = {};
    for (const [k, v] of request.headers.entries()) headersObj[k] = v;

    const vipUid = request.headers.get('x-vip-uid') || null;

    // parse cookies into an object
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies: Record<string, string> = {};
    if (cookieHeader) {
      for (const part of cookieHeader.split(';')) {
        const [k, ...rest] = part.trim().split('=');
        if (!k) continue;
        cookies[k] = rest.join('=');
      }
    }

    return NextResponse.json({ ok: true, vipUid, headers: headersObj, cookies });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
