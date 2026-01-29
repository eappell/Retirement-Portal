# Portal ↔ Tool Message Passing Architecture

## Overview

The Retire Portal embeds retirement planning tools in iframes and communicates with them via the `window.postMessage` API. For Firebase integration, the portal must send configuration and authentication data to embedded tools.

## Message Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     RETIRE PORTAL                            │
│  (localhost:3000)                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  IFrameWrapper Component                             │  │
│  │  - Loads tool in iframe                             │  │
│  │  - Sends messages to embedded tool                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│              postMessage to iframe.contentWindow            │
│                          ↓                                  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              │ Messages Sent:
                              │ - FIREBASE_CONFIG
                              │ - AUTH_TOKEN
                              │ - THEME_CHANGE
                              │ - TOOLBAR_BUTTON_CLICKED
                              │ - REQUEST_CONTENT_HEIGHT
                              │
                              ↓
┌─────────────────────────────┴───────────────────────────────┐
│               EMBEDDED TOOL (in iframe)                      │
│  (localhost:5173 or localhost:3001)                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  setupPortalListener() or window.addEventListener   │  │
│  │  - Receives messages from portal                     │  │
│  │  - Initializes Firebase                             │  │
│  │  - Loads user data                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                          ↑                                  │
│              window.addEventListener('message')             │
│                          ↑                                  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              │ Messages Sent Back:
                              │ - REQUEST_AUTH
                              │ - REQUEST_FIREBASE_CONFIG
                              │ - REQUEST_THEME
                              │ - IFRAME_HEIGHT
                              │ - TOOLBAR_BUTTONS
                              │
                              ↑
┌─────────────────────────────┴───────────────────────────────┐
│                     PORTAL LISTENS                           │
└─────────────────────────────────────────────────────────────┘
```

## Critical Messages for Firebase Integration

### 1. FIREBASE_CONFIG (Portal → Tool)

**Sent by:** `IFrameWrapper.tsx`  
**When:** 
- On iframe `onload` event
- In response to `REQUEST_FIREBASE_CONFIG` message

**Structure:**
```typescript
{
  type: 'FIREBASE_CONFIG',
  config: {
    apiKey: string,
    authDomain: string,
    projectId: string,
    storageBucket: string,
    messagingSenderId: string,
    appId: string,
    measurementId: string
  }
}
```

**Tool receives via:**
```typescript
// In firebaseToolData.ts setupPortalListener()
if (event.data?.type === 'FIREBASE_CONFIG') {
  await initializeFirebase(event.data.config);
}
```

### 2. AUTH_TOKEN (Portal → Tool)

**Sent by:** `IFrameWrapper.tsx`  
**When:**
- After FIREBASE_CONFIG on iframe `onload`
- In response to `REQUEST_AUTH` message

**Structure:**
```typescript
{
  type: 'AUTH_TOKEN',
  userId: string,        // Primary field to use
  uid: string,          // Backup (same value)
  email: string,
  tier: 'free' | 'premium',
  token: string         // Firebase auth token
}
```

**Tool receives via:**
```typescript
// In firebaseToolData.ts setupPortalListener()
if (event.data?.type === 'AUTH_TOKEN') {
  const userId = event.data.userId || event.data.uid;
  const savedData = await getLatestScenarios(userId);
  onDataReceived(userId, savedData?.scenariosState, savedData?.appSettings);
}
```

### 3. REQUEST_AUTH (Tool → Portal)

**Sent by:** Tool's `setupPortalListener()` or component mount  
**When:** Tool initializes and needs auth data

**Structure:**
```typescript
{
  type: 'REQUEST_AUTH'
}
```

**Sent via:**
```typescript
window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
```

### 4. REQUEST_FIREBASE_CONFIG (Tool → Portal)

**Sent by:** Tool's `setupPortalListener()` or component mount  
**When:** Tool initializes and needs Firebase config

**Structure:**
```typescript
{
  type: 'REQUEST_FIREBASE_CONFIG'
}
```

**Sent via:**
```typescript
window.parent.postMessage({ type: 'REQUEST_FIREBASE_CONFIG' }, '*');
```

## Code Locations

### Portal Side: Sending Messages

**File:** `apps/portal/components/IFrameWrapper.tsx`

**Key sections:**

```typescript
// Line ~270: On iframe load
iframe.onload = () => {
  // Send Firebase config
  iframe.contentWindow?.postMessage({
    type: 'FIREBASE_CONFIG',
    config: firebaseConfig
  }, '*');
  
  // Send auth token
  iframe.contentWindow?.postMessage({
    type: 'AUTH_TOKEN',
    userId: cleanUserId,
    uid: cleanUserId,
    email: user.email,
    tier: tier,
    token: token
  }, '*');
};

// Line ~859: Respond to REQUEST_AUTH
if (event.data?.type === 'REQUEST_AUTH') {
  iframe.contentWindow?.postMessage({
    type: 'FIREBASE_CONFIG',
    config: firebaseConfig
  }, '*');
  
  iframe.contentWindow?.postMessage({
    type: 'AUTH_TOKEN',
    userId: cleanUserId,
    uid: cleanUserId,
    email: user.email,
    tier: tier,
    token: token
  }, '*');
}
```

### Tool Side: Receiving Messages

**File:** `Retirement-Planner-AI/services/firebaseToolData.ts`

**Key function:** `setupPortalListener()`

```typescript
export function setupPortalListener(
  onDataReceived: (userId: string, scenariosState: any, appSettings: any) => void
): () => void {
  let currentUserId: string | null = null;
  
  const handleMessage = async (event: MessageEvent) => {
    const data = event.data || {};
    
    // Receive Firebase config from portal
    if (data.type === 'FIREBASE_CONFIG') {
      await initializeFirebase(data.config);
    }
    
    // Receive user authentication  
    if (data.type === 'AUTH_TOKEN') {
      const userId = data.userId || data.uid;
      if (userId) {
        currentUserId = userId;
        
        // Load scenarios from Firebase when user logs in
        if (isFirebaseReady()) {
          const savedData = await getLatestScenarios(userId);
          // Always call callback to signal Firebase check is complete
          onDataReceived(
            userId,
            savedData?.scenariosState || null,
            savedData?.appSettings || null
          );
        }
      }
    }
  };
  
  window.addEventListener('message', handleMessage);
  
  // Request Firebase config and auth from portal
  if (window.self !== window.top) {
    window.parent.postMessage({ type: 'REQUEST_FIREBASE_CONFIG' }, '*');
    window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
  }
  
  return () => {
    window.removeEventListener('message', handleMessage);
  };
}
```

## Message Timing & Order

### Ideal Flow (What Should Happen)

1. **Tool iframe loads**
2. Tool sends `REQUEST_FIREBASE_CONFIG` and `REQUEST_AUTH` to portal
3. Portal receives requests
4. Portal sends `FIREBASE_CONFIG` message
5. Tool receives config, calls `initializeFirebase()`
6. Portal sends `AUTH_TOKEN` message
7. Tool receives auth, extracts `userId`
8. Tool calls `getLatestScenarios(userId)` to load from Firebase
9. Tool calls `onDataReceived()` callback with loaded data (or null)
10. App component receives loaded data, updates state
11. **Now** auto-save is enabled (after initial load complete)

### Current Issue (What's Happening)

1. ✅ Tool iframe loads
2. ✅ Tool sends `REQUEST_FIREBASE_CONFIG` and `REQUEST_AUTH`
3. ✅ Portal sends `FIREBASE_CONFIG` and `AUTH_TOKEN`
4. ✅ Tool initializes Firebase
5. ❓ Tool queries Firebase for saved data
6. ❓ Query returns... something? nothing? not being called?
7. ❓ Callback fires... with data? with null? not at all?
8. ❌ App state not updated with loaded data
9. ✅ Auto-save runs and saves default data (overwriting real data)

## Debugging Checklist

### Check Portal Side

```typescript
// In IFrameWrapper.tsx, add logs:
console.log('[Portal] Sending FIREBASE_CONFIG:', firebaseConfig);
console.log('[Portal] Sending AUTH_TOKEN:', { userId, email, tier });
```

**Verify:**
- [ ] Config has actual values (not empty strings)
- [ ] userId is real Firebase auth ID (starts with alphanumeric, ~28 chars)
- [ ] Messages are sent (check Network tab for postMessage)

### Check Tool Side

```typescript
// In firebaseToolData.ts setupPortalListener, add logs:
console.log('[Tool] Received FIREBASE_CONFIG:', config);
console.log('[Tool] Received AUTH_TOKEN:', { userId });
console.log('[Tool] Calling getLatestScenarios for userId:', userId);

const savedData = await getLatestScenarios(userId);
console.log('[Tool] getLatestScenarios returned:', savedData);
console.log('[Tool] Document count:', savedData ? 1 : 0);
console.log('[Tool] Scenarios:', savedData?.scenariosState?.scenarios);

console.log('[Tool] Calling onDataReceived callback');
onDataReceived(userId, savedData?.scenariosState, savedData?.appSettings);
console.log('[Tool] onDataReceived callback complete');
```

**Verify:**
- [ ] FIREBASE_CONFIG received with valid config
- [ ] AUTH_TOKEN received with valid userId
- [ ] getLatestScenarios is called
- [ ] Firestore query executes (check Firebase Console logs)
- [ ] Query returns document (or null if no data)
- [ ] onDataReceived callback is called
- [ ] Callback receives data (or null)

### Check App Component

```typescript
// In App.tsx useFirebaseSync callback, add logs:
onScenariosLoaded: (loadedScenarios, loadedSettings) => {
  console.log('[App] onScenariosLoaded CALLED');
  console.log('[App] loadedScenarios:', loadedScenarios);
  console.log('[App] loadedSettings:', loadedSettings);
  console.log('[App] Scenarios count:', loadedScenarios?.scenarios ? 
    Object.keys(loadedScenarios.scenarios).length : 0);
  
  if (loadedScenarios) {
    console.log('[App] Calling uploadScenarios');
    uploadScenarios(loadedScenarios);
    console.log('[App] uploadScenarios complete');
  }
}
```

**Verify:**
- [ ] Callback is called
- [ ] loadedScenarios has data (or is null)
- [ ] uploadScenarios is called if data exists
- [ ] State updates after uploadScenarios
- [ ] UI reflects loaded scenarios

## Common Problems

### Problem: Portal sends empty Firebase config

**Symptom:** `apiKey: "", projectId: ""` in FIREBASE_CONFIG message

**Cause:** `process.env.NEXT_PUBLIC_FIREBASE_*` returns empty strings in component (only works in `lib/` files in Next.js)

**Fix:** Export config from `lib/firebase.ts` and import in `IFrameWrapper.tsx`

```typescript
// lib/firebase.ts
export { firebaseConfig };

// IFrameWrapper.tsx
import { firebaseConfig } from '@/lib/firebase';
```

### Problem: Tool receives uid but not userId

**Symptom:** `event.data.userId` is undefined, `event.data.uid` exists

**Fix:** Check both fields

```typescript
const userId = event.data.userId || event.data.uid;
```

### Problem: Message event.data is nested

**Symptom:** `event.data.data.type` instead of `event.data.type`

**Fix:** Access correct level

```typescript
const data = event.data || {};
if (data.type === 'AUTH_TOKEN') { ... }
```

### Problem: Auto-save runs before load completes

**Symptom:** Default data saves immediately, overwriting real data

**Fix:** Use flag to prevent auto-save until initial load completes

```typescript
const hasLoadedInitialDataRef = useRef(false);

// In setupPortalListener callback
hasLoadedInitialDataRef.current = true;

// In auto-save effect
if (!hasLoadedInitialDataRef.current) return;
```

## Message Security

### Origin Checking (Recommended for Production)

```typescript
window.addEventListener('message', (event) => {
  // Only accept messages from trusted origins
  const trustedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://your-production-domain.com'
  ];
  
  if (!trustedOrigins.includes(event.origin)) {
    console.warn('Rejected message from untrusted origin:', event.origin);
    return;
  }
  
  // Process message
  if (event.data?.type === 'FIREBASE_CONFIG') { ... }
});
```

### Token Validation

Portal should:
1. Verify Firebase auth token before sending to tool
2. Refresh token if expired
3. Send token with short expiration
4. Not send token if user not authenticated

Tool should:
5. Validate token with Firebase Admin SDK (if using server-side)
6. Use token to authenticate Firestore requests
7. Handle token expiration gracefully

## Testing

### Manual Testing

1. Open browser DevTools Console
2. Load tool in portal
3. Check Console tab for message logs
4. Check Network tab → WS (WebSocket) for postMessage activity
5. Verify message structure matches expected format
6. Test timing by throttling network

### Automated Testing

```typescript
// Mock window.postMessage in tests
const mockPostMessage = jest.fn();
window.parent.postMessage = mockPostMessage;

// Trigger component mount
render(<Component />);

// Verify messages sent
expect(mockPostMessage).toHaveBeenCalledWith(
  { type: 'REQUEST_AUTH' },
  '*'
);

// Simulate receiving message
window.dispatchEvent(new MessageEvent('message', {
  data: { type: 'AUTH_TOKEN', userId: 'test-user-id' }
}));
```

---

**Remember:** All postMessage communication is asynchronous. Always handle race conditions and missing data gracefully.
