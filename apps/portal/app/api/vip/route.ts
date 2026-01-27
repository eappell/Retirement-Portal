import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// VIP route: mints a short-lived Firebase custom token for automated VIP access
// Requires environment vars:
// - VIP_TOKEN: shared secret to gate access
// - FIREBASE_SERVICE_ACCOUNT_JSON (JSON string) or FIREBASE_SERVICE_ACCOUNT_PATH (file path)

let adminInitialized = false;
let admin: any = null;
let adminRequireError: any = null;
let serviceAccountParsed = false;
let serviceAccountInfo: any = null;
let serviceAccountParseError: any = null;
let adminInitError: any = null;

function initAdminIfNeeded() {
  if (adminInitialized) return;
  try {
    // Ensure google-auth-library is included in the server bundle before loading firebase-admin
    try {
      // eslint-disable-next-line no-eval
      eval("require('google-auth-library')");
    } catch (e) {
      // ignore — presence will be validated later
    }
    // Use eval to avoid bundlers statically resolving firebase-admin at build time
    // eslint-disable-next-line no-eval
    admin = eval("require('firebase-admin')");
  } catch (err) {
    const _err: any = err;
    adminRequireError = String(_err && _err.stack ? _err.stack : _err);
    console.warn('firebase-admin not available:', err);
    return;
  }

  // Load service account
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  let serviceAccount: any = null;
  try {
    if (saJson) {
      // Support three common ways the JSON may be provided in environment vars:
      // 1) Raw JSON string
      // 2) Newline-escaped JSON (contains literal "\\n")
      // 3) Base64-encoded JSON
      try {
        serviceAccount = JSON.parse(saJson);
      } catch (err1) {
        const _e1: any = err1;
        serviceAccountParseError = String(_e1 && _e1.stack ? _e1.stack : _e1);
        try {
          // Try replacing escaped newlines
          const replaced = saJson.replace(/\\n/g, '\n');
          serviceAccount = JSON.parse(replaced);
          serviceAccountParseError = null;
        } catch (err2) {
          const _e2: any = err2;
          serviceAccountParseError = serviceAccountParseError + '\n' + String(_e2 && _e2.stack ? _e2.stack : _e2);
          try {
            // Try base64 decode
            const decoded = Buffer.from(saJson, 'base64').toString('utf8');
            serviceAccount = JSON.parse(decoded);
            serviceAccountParseError = null;
          } catch (err3) {
            const _e3: any = err3;
            serviceAccountParseError = serviceAccountParseError + '\n' + String(_e3 && _e3.stack ? _e3.stack : _e3);
            console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON using JSON, escaped-newlines, or base64 methods');
          }
        }
      }
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
      serviceAccountParsed = true;
      try {
        serviceAccountInfo = {
          project_id: serviceAccount.project_id,
          client_email: serviceAccount.client_email,
        };
      } catch (e) {
        serviceAccountInfo = null;
      }
    } catch (err) {
      const _errAny: any = err;
      adminInitError = String(_errAny && _errAny.stack ? _errAny.stack : _errAny);
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

    // Production-only debug: allow returning environment diagnostics when explicitly requested
    // Usage: /api/vip?token=...&debug=1
    if (token === vipToken && url.searchParams.get('debug') === '1') {
      // Ensure we attempt initialization so diagnostics reflect parsing/init results
      try {
        initAdminIfNeeded();
      } catch (e) {
        /* ignore - diagnostics will capture require/init errors */
      }
      const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      const resolved = saPath ? path.resolve(saPath) : null;
      const exists = saPath ? fs.existsSync(saPath) : false;
      const nmPath = path.resolve(process.cwd(), 'node_modules', 'firebase-admin');
      const nmExists = fs.existsSync(nmPath);
      let nmVersion: string | null = null;
      try {
        const pj = path.join(nmPath, 'package.json');
        if (fs.existsSync(pj)) nmVersion = JSON.parse(fs.readFileSync(pj, 'utf8')).version;
      } catch (e) {
        /* ignore */
      }
      return NextResponse.json({
        ok: false,
        diagnostic: {
          cwd: process.cwd(),
          triedPath: saPath || null,
          resolvedPath: resolved,
          pathExists: exists,
          hasSaJsonEnv: !!saJson,
          nodeModuleFirebaseAdminExists: nmExists,
          firebaseAdminVersion: nmVersion,
          adminRequireError: adminRequireError || null,
          serviceAccountParsed: serviceAccountParsed || false,
          serviceAccountParseError: serviceAccountParseError || null,
          serviceAccountInfo: serviceAccountInfo || null,
          adminInitError: adminInitError || null,
        },
      });
    }

    // Try to initialize firebase-admin
    initAdminIfNeeded();

    if (!adminInitialized) {
      // Provide safe diagnostics in non-production to help local debugging
      const nodeEnv = process.env.NODE_ENV || 'development';
      if (nodeEnv !== 'production') {
        const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        const resolved = saPath ? path.resolve(saPath) : null;
        const exists = saPath ? fs.existsSync(saPath) : false;
        const nmExists = fs.existsSync(path.resolve(process.cwd(), 'node_modules', 'firebase-admin'));
        const requireErr = adminRequireError || null;
        return NextResponse.json({
          ok: false,
          error: 'FIREBASE service account not configured on server',
          diagnostic: {
            cwd: process.cwd(),
            triedPath: saPath || null,
            resolvedPath: resolved,
            pathExists: exists,
            hasSaJsonEnv: !!saJson,
            nodeModuleFirebaseAdminExists: nmExists,
            adminRequireError: requireErr,
          },
        }, { status: 501 });
      }
      return NextResponse.json({ ok: false, error: 'FIREBASE service account not configured on server' }, { status: 501 });
    }

    // Create a deterministic VIP uid or allow client to request a specific uid param
    const requestedUid = url.searchParams.get('uid');
    const uid = requestedUid || `vip-${Date.now()}`;

    // Mint a custom token with minimal claims
    const additionalClaims = { tier: 'paid', vip: true };
    const customToken = await admin.auth().createCustomToken(uid, additionalClaims);

    // Attempt to exchange the custom token for an ID token and create a session cookie
    let sessionCreated = false;
    try {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
      if (apiKey) {
        const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: customToken, returnSecureToken: true }),
        });
        if (resp.ok) {
          const body = await resp.json();
          const idToken = body.idToken;
          const expiresInSeconds = parseInt(body.expiresIn || '3600', 10);
          // session cookie expiry capped at 14 days per Firebase recommendations
          const maxSessionMs = 14 * 24 * 60 * 60 * 1000;
          const sessionExpiryMs = Math.min(expiresInSeconds * 1000, maxSessionMs);
          const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn: sessionExpiryMs });

          // Set HttpOnly cookie. Only include `Secure` in production so local http dev works.
          const maxAge = Math.floor(sessionExpiryMs / 1000);
          const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
          const cookie = `session=${sessionCookie}; Path=/; HttpOnly; ${secureFlag}SameSite=Strict; Max-Age=${maxAge}`;

          // Audit log to Firestore if available (include cookie flag)
          try {
            const db = admin.firestore();
            const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
            await db.collection('vip_audit').add({
              uid,
              issuedAt: admin.firestore.FieldValue.serverTimestamp(),
              requesterIp: ip,
              via: 'vip_endpoint',
              sessionCookie: true,
            });
          } catch (err) {
            console.warn('Failed to write VIP audit log:', err);
          }

          const res = NextResponse.json({ ok: true, cookieSet: true });
          res.headers.set('Set-Cookie', cookie);
          return res;
        }
      }
    } catch (err) {
      console.warn('Failed to create session cookie for VIP:', err);
    }

    // Audit log to Firestore if available (no cookie)
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

    // Fallback: return the custom token so JS-capable agents can sign in
    return NextResponse.json({ ok: true, token: customToken });
  } catch (err) {
    console.error('VIP route error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
