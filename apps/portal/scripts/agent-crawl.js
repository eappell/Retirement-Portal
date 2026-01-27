#!/usr/bin/env node
/*
  Simple agent script to obtain VIP auth and crawl a target URL.

  Usage:
    node scripts/agent-crawl.js --token <VIP_TOKEN> --target <URL> [--vip-url <VIP_ENDPOINT>] [--out <file>]

  Environment:
    VIP_TOKEN can be provided via `--token` or the `VIP_TOKEN` env var.
    By default `--vip-url` is https://retirement-portal.vercel.app/api/vip
*/

const fs = require('fs');

function argvVal(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1];
}

const vipUrl = argvVal('--vip-url') || process.env.VIP_URL || 'https://retirement-portal.vercel.app/api/vip';
const token = argvVal('--token') || process.env.VIP_TOKEN;
const target = argvVal('--target');
const out = argvVal('--out') || null;

if (!token) {
  console.error('Missing VIP token. Provide --token or set VIP_TOKEN env var.');
  process.exit(2);
}
if (!target) {
  console.error('Missing target URL. Provide --target <URL>');
  process.exit(2);
}

async function main() {
  try {
    console.log('Requesting VIP endpoint:', vipUrl);
    const vipResp = await fetch(`${vipUrl}?token=${encodeURIComponent(token)}`);

    const setCookieHeader = vipResp.headers.get('set-cookie') || '';
    let vipSessionCookie = null;
    if (setCookieHeader) {
      const m = setCookieHeader.match(/vip_session=([^;\s]+)/);
      if (m) vipSessionCookie = `vip_session=${m[1]}`;
    }

    const vipJson = await vipResp.json().catch(() => null);
    // some debug responses include a cookie string in the body
    if (!vipSessionCookie && vipJson) {
      const cs = vipJson.cookieString || vipJson.cookie || vipJson.setCookie || null;
      if (cs) {
        const m = String(cs).match(/vip_session=([^;\s]+)/);
        if (m) vipSessionCookie = `vip_session=${m[1]}`;
      }
    }

    // fallback to idToken if provided
    const idToken = vipJson?.idToken || vipJson?.token || vipJson?.id_token || null;

    console.log('Have vip_session cookie:', !!vipSessionCookie, 'Have idToken:', !!idToken);

    const headers = {};
    if (vipSessionCookie) headers['cookie'] = vipSessionCookie;
    if (idToken) headers['authorization'] = `Bearer ${idToken}`;

    console.log('Fetching target:', target);
    const resp = await fetch(target, { headers, redirect: 'follow' });
    const text = await resp.text();

    console.log('Target status:', resp.status, resp.statusText);
    if (out) {
      await fs.promises.writeFile(out, text, 'utf8');
      console.log('Saved response to', out);
    } else {
      console.log('--- Response (truncated) ---');
      console.log(text.slice(0, 2000));
      console.log('--- End ---');
    }
  } catch (err) {
    console.error('Agent error:', err);
    process.exit(1);
  }
}

main();
