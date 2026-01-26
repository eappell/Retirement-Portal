import { NextResponse } from 'next/server';

// Simple VIP validation route.
// Usage: GET /api/vip?token=SECRET
// Validates server-side `VIP_TOKEN` env var. In non-production, token may be omitted.

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token') || '';

    const vipToken = process.env.VIP_TOKEN || '';
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Allow in development without token
    const allowed = nodeEnv !== 'production' ? true : (vipToken && token === vipToken);

    if (!allowed) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Return a compact paid-user payload to store in localStorage
    const payload = {
      userId: 'vip-user',
      email: 'vip@example.com',
      tier: 'paid',
      name: 'VIP User',
    };

    return NextResponse.json({ ok: true, user: payload });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
