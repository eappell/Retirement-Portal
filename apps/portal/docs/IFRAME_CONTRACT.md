IFRAME Message Contract

This document describes the messaging contract between the RetireWise portal and embedded child apps (iframes).

Messages sent from Portal -> Iframe

- AUTH_TOKEN
  - type: "AUTH_TOKEN"
  - payload:
    - token: string (Firebase ID token)
    - userId: string
    - email: string | null
    - tier: string ("free" | "paid" | "admin")
    - dob: string | null (ISO date string)
    - retirementAge: number | null
    - currentAnnualIncome: number | null
  - Sent when the iframe loads with current auth token and role.

- USER_ROLE_UPDATE
  - type: "USER_ROLE_UPDATE"
  - payload:
    - role: string | null (new role, e.g. "free", "paid", "admin")
  - Also includes (optionally) the user's profile fields:
    - dob: string | null
    - retirementAge: number | null
    - currentAnnualIncome: number | null
  - Sent whenever the portal detects a change in the resolved role (login, logout, subscription update) or when `localStorage.userRole` changes.

- THEME_CHANGE
  - type: "THEME_CHANGE"
  - payload:
    - theme: string ("light" | "dark")
  - Sent when the portal theme changes or on request.

Messages sent from Iframe -> Portal

- REQUEST_THEME
  - type: "REQUEST_THEME"
  - Used to request the current portal theme.

- SAVE_HEALTHCARE_DATA
  - type: "SAVE_HEALTHCARE_DATA"
  - payload: { ... } - portal will persist to localStorage for cross-app transfer

- REQUEST_HEALTHCARE_DATA
  - REQUEST_PROFILE
    - type: "REQUEST_PROFILE"
    - Request the portal to respond with the current user profile via `USER_PROFILE_UPDATE`.
  - type: "REQUEST_HEALTHCARE_DATA"
  - portal will respond with `HEALTHCARE_DATA_RESPONSE` if present

Sample iframe listener (child app)

```js
// Run in the iframe (child app) to react to portal messages
window.addEventListener('message', (ev) => {
  const data = ev.data || {};
  switch (data.type) {
    case 'AUTH_TOKEN':
      // Save token for API calls
      window.__PORTAL_AUTH = { token: data.token, userId: data.userId, email: data.email };
      // Use data.tier to enable/disable premium features
      handleRoleChange(data.tier);
      break;
    case 'USER_ROLE_UPDATE':
        handleRoleChange(data.role);
        // apply other profile fields if present
        if (data.dob || data.retirementAge || data.currentAnnualIncome) {
          applyProfile({ dob: data.dob, retirementAge: data.retirementAge, currentAnnualIncome: data.currentAnnualIncome });
        }
      break;
    case 'THEME_CHANGE':
      applyTheme(data.theme);
      break;
    case 'HEALTHCARE_DATA_RESPONSE':
      // handle cross-app data
      break;
    case 'USER_PROFILE_UPDATE':
      if (data.dob || data.retirementAge || data.currentAnnualIncome) {
        applyProfile({ dob: data.dob, retirementAge: data.retirementAge, currentAnnualIncome: data.currentAnnualIncome });
      }
      break;
    // other message types...
  }
});

function handleRoleChange(role) {
  // Example: show/hide premium features
  if (role === 'paid' || role === 'admin') {
    enablePremiumFeatures();
  } else {
    disablePremiumFeatures();
  }
}
```

  Handshake: requesting auth/role from the portal

  If your iframe attaches its `message` listener after the portal posts initial messages, it may miss the `AUTH_TOKEN` or `USER_ROLE_UPDATE`. To avoid missed messages, send a one-time request to the parent asking for the current auth/role. Example boot handshake:

  ```js
  if (window.self !== window.top) {
    // Ask parent and top for the current auth token and role
    try {
      window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
      window.parent.postMessage({ type: 'REQUEST_ROLE' }, '*');
    } catch (e) {
      // cross-origin parents may throw — ignore
    }

    // Optional: retry once after a short delay to handle timing
    setTimeout(() => {
      try {
        window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
        window.parent.postMessage({ type: 'REQUEST_ROLE' }, '*');
      } catch (e) {}
    }, 300);
  }
  ```

  The portal will respond with `AUTH_TOKEN` and/or `USER_ROLE_UPDATE` when it receives these requests.

Reading role from localStorage

- The portal writes `localStorage.userRole` on auth and tier changes.
- If your iframe runs on the same site/origin, it can read `localStorage.userRole` directly.
- If your iframe is cross-origin, rely on the `AUTH_TOKEN` and `USER_ROLE_UPDATE` messages.

Security

- In production, child apps should validate message origin and verify tokens server-side where appropriate.
- Treat the postMessage channel as untrusted input and validate payloads.

