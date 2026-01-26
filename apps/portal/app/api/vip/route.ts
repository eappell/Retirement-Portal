import { NextResponse } from 'next/server';
import fs from 'fs';

// VIP route: mints a short-lived Firebase custom token for automated VIP access
// Requires environment vars:
// - VIP_TOKEN: shared secret to gate access
// - FIREBASE_SERVICE_ACCOUNT_JSON (JSON string) or FIREBASE_SERVICE_ACCOUNT_PATH (file path)

let adminInitialized = false;
let admin: any = null;

function initAdminIfNeeded() {
  if (adminInitialized) return;
  try {
    // Use eval to avoid bundlers statically resolving firebase-admin at build time
    // eslint-disable-next-line no-eval
    admin = eval("require('firebase-admin')");
  } catch (err) {
    console.warn('firebase-admin not available:', err);
    return;
  }

  // Load service account
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  let serviceAccount: any = null;
  try {
    if (saJson) {
      serviceAccount = JSON.parse(saJson);
    } else if (saPath && fs.existsSync(saPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Failed to parse service account JSON for VIP route:', err);
  }

  if (serviceAccount) {
    try {
      if (!admin.apps?.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      }
      adminInitialized = true;
    } catch (err) {
      console.warn('Failed to initialize firebase-admin:', err);
    }
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token') || '';

    const vipToken = process.env.VIP_TOKEN || '';
    const nodeEnv = process.env.NODE_ENV || 'development';

    const allowed = nodeEnv !== 'production' ? true : (vipToken && token === vipToken);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Try to initialize firebase-admin
    initAdminIfNeeded();

    if (!adminInitialized) {
      return NextResponse.json({ ok: false, error: 'FIREBASE service account not configured on server' }, { status: 501 });
    }

    // Create a deterministic VIP uid or allow client to request a specific uid param
    const requestedUid = url.searchParams.get('uid');
    const uid = requestedUid || `vip-${Date.now()}`;

    // Mint a custom token with minimal claims
    const additionalClaims = { tier: 'paid', vip: true };
    const customToken = await admin.auth().createCustomToken(uid, additionalClaims);

    // Audit log to Firestore if available
    try {
      const db = admin.firestore();
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      await db.collection('vip_audit').add({
        uid,
        issuedAt: admin.firestore.FieldValue.serverTimestamp(),
        requesterIp: ip,
        via: 'vip_endpoint',
      });
    } catch (err) {
      console.warn('Failed to write VIP audit log:', err);
    }

    return NextResponse.json({ ok: true, token: customToken });
  } catch (err) {
    console.error('VIP route error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
