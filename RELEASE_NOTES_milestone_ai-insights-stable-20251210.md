## Portal: AI Insights & Reporting: Stable release  Milestone 2025-12-10

### Summary
- Portal now prefers forwarding AI requests to Planner when configured.
- Added loop prevention and hop detection when forwarding /api/report to avoid infinite loops.
- Removed direct bundling of AI SDKs (no more local GenAI/Anthropic bundling) to prevent build warnings and runtime conflicts.
- Client now posts telemetry to `/api/report` instead of `/report` (fixes 404s).

### Fixes & Improvements
- `app/api/report/route.js`: Adds `X-Report-Source` when forwarding to the Portal's track URL and skips forward if incoming header indicates the Planner as origin.
- `app/api/insights/route.js` (proxy): forwards AI generation to Planner when `RETIREMENT_APP_URL` is set and returns `X-AI-Provider` header for diagnostics.
- Ensured Vercel config does not duplicate serverless function entries that cause runtime validation errors.

### Files / Key changes
- `app/api/report/route.js`  loop prevention and diagnostic forwarding logic.
- Client `hooks`  POST telemetry to `/api/report` (not `/report`).
- `app/api/insights/route.js`  proxy to Planner on `RETIREMENT_APP_URL`.

### Validation / Tests
- Verified via curl and `curl.exe` that the Portal proxy returns AI generated content and `X-AI-Provider: google` where applicable.
- Verified `api/report` returns expected behavior when forwarded from Planner (diagnostics and skip-redirect logic).

### Notes for Deployers
- Confirm `RETIREMENT_APP_URL` is set to point to your Planner host if you want Portal to forward AI requests.

### Next steps
- Optionally add a CI or Vercel healthcheck to validate that `/api/report` and `/api/insights` return expected diagnostics and non-fallback AI content.

---
This release is a draft. Tag: milestone/ai-insights-stable-20251210
