# Agent Crawl API

Purpose
-------
Provide a secure server-side endpoint so external AI agents (which cannot run on your network) can request an authenticated crawl of site pages. The endpoint uses the portal's `VIP_TOKEN` and/or `vip_session` HMAC cookie to access pages as a VIP user and returns a truncated response to the caller.

Endpoint
--------
POST /api/agent-crawl

Request JSON
------------
{ "target": "https://retirement-portal.vercel.app/dashboard" }

Required header
---------------
- `x-agent-secret`: a shared secret string. The endpoint accepts one of these environment variables as the valid secret (in order of preference):
  - `AGENT_SECRET` (recommended, set specifically for this purpose)
  - `VIP_HMAC_SECRET` (reuse existing VIP cookie secret)
  - `VERCEL_PROTECTION_BYPASS` / `VERCEL_BYPASS_TOKEN` (existing values may work)

Environment variables to configure
----------------------------------
- `VIP_TOKEN` — must already be set (used by `/api/vip`).
- `VIP_HMAC_SECRET` — if you want to reuse the same secret for agent access.
- `AGENT_SECRET` — explicit secret for the agent endpoint (optional).
- `ALLOWED_CRAWL_DOMAINS` — comma-separated list of hostnames allowed to be crawled. If empty, defaults to same-origin and `RETIREMENT_APP_URL` host.
- `AGENT_CRAWL_MAX_BODY` — maximum body bytes to return (default 200000).

Example curl (using `VIP_HMAC_SECRET` as secret):

```bash
curl -X POST https://retirement-portal.vercel.app/api/agent-crawl \
  -H "Content-Type: application/json" \
  -H "x-agent-secret: $VIP_HMAC_SECRET" \
  -d '{"target":"https://retirement-portal.vercel.app/dashboard"}'
```

Notes & Security
----------------
- Keep the secret confidential. Treat it like any other production secret.
- Use `ALLOWED_CRAWL_DOMAINS` to restrict which hosts the endpoint will fetch. Do not leave it wide open in production.
- Consider adding rate-limiting and logging on the endpoint to prevent abuse.
- The endpoint returns a truncated body by default; if you need the full page, increase `AGENT_CRAWL_MAX_BODY` carefully.

Local agent alternative
-----------------------
If you prefer not to expose a server endpoint, you can run the included local script which performs the same steps from a machine that has network access:

```
node apps/portal/scripts/agent-crawl.js --token <VIP_TOKEN> --vip-url <VIP_ENDPOINT> --target <TARGET_URL> --out ./page.html
```

Deployment
----------
Set the chosen secret in your Vercel project/environment (for example `VIP_HMAC_SECRET` or `AGENT_SECRET`). If you set `ALLOWED_CRAWL_DOMAINS`, include the domains the AI will need to crawl (for example `retirement-portal.vercel.app,retirement-planner-ai.vercel.app`).
