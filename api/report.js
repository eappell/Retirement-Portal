export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const trackUrl = process.env.PORTAL_TRACK_URL;
  if (!trackUrl) {
    return res.status(200).json({ ok: true, warning: 'PORTAL_TRACK_URL not configured; skipping portal forwarding', forwarded: false });
  }

  try {
    const resp = await fetch(trackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const text = await resp.text();
    if (!resp.ok) return res.status(resp.status).send(text);
    // attempt to return parsed JSON when possible
    try { return res.status(200).json(JSON.parse(text)); } catch (e) { return res.status(200).send(text); }
  } catch (err) {
    console.error('report forward error', err);
    return res.status(500).json({ error: 'Report forwarding failed' });
  }
}
