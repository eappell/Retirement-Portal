import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

function parseServiceAccountEnv() {
  let serviceAccount: any = null;
  let parseError: string | null = null;
  function errStack(e: any) {
    try {
      return e && (e.stack ? e.stack : String(e));
    } catch (_) {
      return String(e);
    }
  }
  try {
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (saJson) {
      try {
        serviceAccount = JSON.parse(saJson);
      } catch (err1) {
        try {
          serviceAccount = JSON.parse(saJson.replace(/\\n/g, '\n'));
          parseError = null;
        } catch (err2) {
          try {
            const decoded = Buffer.from(saJson, 'base64').toString('utf8');
            serviceAccount = JSON.parse(decoded);
            parseError = null;
          } catch (err3) {
            parseError = errStack(err1) + '\n' + errStack(err2) + '\n' + errStack(err3);
          }
        }
      }
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
      } catch (e) {
        parseError = errStack(e);
      }
    }
  } catch (e) {
    parseError = errStack(e);
  }
  return { serviceAccount, parseError };
}

function base64UrlEncode(input: Buffer | string) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function tryFallbackSignCustomToken(serviceAccount: any, uid: string, additionalClaims: any) {
  try {
    if (!serviceAccount || !serviceAccount.private_key || !serviceAccount.client_email) return null;
    const privateKeyPem = serviceAccount.private_key as string;
    const clientEmail = serviceAccount.client_email as string;
    const now = Math.floor(Date.now() / 1000);

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload: any = {
      iss: clientEmail,
      sub: clientEmail,
      aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
      iat: now,
      exp: now + 60 * 60,
      uid,
      claims: additionalClaims || {},
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();
    const signature = signer.sign(privateKeyPem);
    const encodedSig = base64UrlEncode(signature);
    const jwt = `${signingInput}.${encodedSig}`;
    return jwt;
  } catch (err) {
    console.warn('Fallback custom token signing failed:', err);
    return null;
  }
}

function createVipSessionCookie(uid: string, maxAgeSeconds = 14 * 24 * 60 * 60) {
  try {
    const secret = process.env.VIP_HMAC_SECRET;
    if (!secret) return null;
    const now = Math.floor(Date.now() / 1000);
    const payload = { uid, iat: now, exp: now + maxAgeSeconds };
    const payloadB64 = base64UrlEncode(JSON.stringify(payload));
    const hmac = crypto.createHmac('sha256', secret).update(payloadB64).digest();
    const sig = base64UrlEncode(hmac);
    const cookieVal = `${payloadB64}.${sig}`;
    const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
    const cookie = `vip_session=${cookieVal}; Path=/; HttpOnly; ${secureFlag}SameSite=Strict; Max-Age=${maxAgeSeconds}`;
    return cookie;
  } catch (e) {
    console.warn('Failed to create VIP session cookie:', e);
    return null;
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
      // Also try parsing the service account env so debug output shows parse results even
      // when `firebase-admin` failed to require due to missing transitive deps.
      try {
        const parsed = parseServiceAccountEnv();
        serviceAccountParsed = !!parsed.serviceAccount;
        serviceAccountParseError = parsed.parseError;
        serviceAccountInfo = parsed.serviceAccount ? {
          project_id: parsed.serviceAccount.project_id,
          client_email: parsed.serviceAccount.client_email,
        } : null;
      } catch (e) {
        /* ignore */
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
      // Attempt a lightweight fallback: sign a Firebase custom token directly with the
      // service account private key (avoids requiring `firebase-admin` and its transitive deps).
      try {
        // Re-parse service account env here (same heuristics as initAdminIfNeeded)
        let serviceAccount: any = null;
        const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        try {
          if (saJson) {
            try { serviceAccount = JSON.parse(saJson); } catch (e1) {
              try { serviceAccount = JSON.parse(saJson.replace(/\\n/g, '\n')); } catch (e2) {
                try { serviceAccount = JSON.parse(Buffer.from(saJson, 'base64').toString('utf8')); } catch (e3) { /* ignore */ }
              }
            }
          } else if (saPath && fs.existsSync(saPath)) {
            serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
          }
        } catch (e) { /* ignore */ }

        if (serviceAccount && serviceAccount.private_key && serviceAccount.client_email) {
          const requestedUid = url.searchParams.get('uid');
          const uid = requestedUid || `vip-${Date.now()}`;
          const additionalClaims = { tier: 'paid', vip: true };
          const fallbackToken = await tryFallbackSignCustomToken(serviceAccount, uid, additionalClaims);
          // If we created a token, try to exchange it for an ID token so JS-less clients can still use it
          let idToken: string | null = null;
          try {
            const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
            if (fallbackToken && apiKey) {
              const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: fallbackToken, returnSecureToken: true }),
              });
              if (resp.ok) {
                const body = await resp.json();
                idToken = body.idToken || null;
              }
            }
          } catch (e) { /* ignore */ }

          const body = { ok: true, token: fallbackToken, idToken, fallback: true };
          const res = NextResponse.json(body);
          try {
            const cookie = createVipSessionCookie(uid, Math.floor((14 * 24 * 60 * 60)));
            if (cookie) {
              res.headers.set('Set-Cookie', cookie);
              (body as any).cookieSet = true;
            } else {
              (body as any).cookieSet = false;
            }
          } catch (e) {
            /* ignore */
          }
          // Return the response (body may have cookieSet)
          return res;
        }
      } catch (e) { /* ignore */ }

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
