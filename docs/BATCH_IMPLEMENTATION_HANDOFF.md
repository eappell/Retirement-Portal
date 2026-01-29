# Firebase Integration - Batch Implementation Handoff

**Date:** January 28, 2026  
**Status:** Batch 1 In Progress - Firebase saving implemented but loading not working correctly

## 🎯 Overall Goal

Integrate all retirement planning tools with Firebase to enable the AI Coach to analyze real user data instead of hypothetical scenarios. This requires implementing Firebase persistence for 9 tools across 3 batches.

## 📊 Batch Organization

### Batch 1: Core Financial Planning (IN PROGRESS)
- ✅ Income Estimator / Retirement Planner AI
- ✅ Social Security Optimizer  
- ✅ Tax Impact Analyzer

### Batch 2: Healthcare & International
- Healthcare Cost Estimator
- Retire Abroad AI
- Pension vs Lump Sum Calculator

### Batch 3: Advanced Planning
- Budget Burn Rate Calculator
- Estate Planning Helper
- Withdrawal Strategy Optimizer

---

## 🔧 Batch 1: Current Status

### What Was Implemented

**1. Firebase Service Layers Created** (~814 lines total)
- `Retirement-Planner-AI/services/firebaseToolData.ts` (241 lines)
- `Social-Security-Optimizer/lib/firebaseToolData.ts` (230 lines)  
- `Tax-Impact-Analyzer/src/lib/firebaseToolData.ts` (223 lines)

Each includes:
- `initializeFirebase(config)` - Sets up Firebase with config from portal
- `save*()` functions - Saves tool data to Firestore `userToolData` collection
- `getLatest*()` functions - Retrieves most recent saved data
- `setupPortalListener()` - Listens for portal messages (FIREBASE_CONFIG, AUTH_TOKEN)
- `createDebouncedSave()` - 3-second debounce wrapper

**2. React Integration Hooks**
- `Retirement-Planner-AI/hooks/useFirebaseSync.ts` (117 lines)
- Auto-save with debouncing
- Load data on authentication
- Coordinates Firebase with app state

**3. Portal-Side Changes**
- `apps/portal/components/IFrameWrapper.tsx` - Sends FIREBASE_CONFIG and AUTH_TOKEN messages to embedded apps
- `apps/portal/app/apps/[appId]/page.tsx` - Dev mode implementation for testing localhost
- `apps/portal/lib/firebase.ts` - Exports firebase config for IFrameWrapper

**4. Dependencies Installed**
- Firebase 11.0.0 added to all 3 projects

### ✅ Problem FIXED (January 29, 2026)

**Issue:** Firebase saves were working but data did not load on page refresh.

**Root Cause:** Race condition in message handling. The portal's IFrameWrapper sends both FIREBASE_CONFIG and AUTH_TOKEN messages on iframe load, but AUTH_TOKEN was being received and processed before Firebase initialization completed. When AUTH_TOKEN handler tried to load data, `isFirebaseReady()` returned false and the load was skipped.

**Solution:** Added `pendingAuthLoad` flag that tracks when AUTH_TOKEN is received before Firebase is ready. When FIREBASE_CONFIG completes initialization, it checks for pending auth loads and executes them. This ensures data always loads regardless of message arrival order.

**Files Fixed:**
- `Retirement-Planner-AI/services/firebaseToolData.ts` (commits 630fdd7, e5b63ec)
- `Social-Security-Optimizer/lib/firebaseToolData.ts` (commits 58a4ce0, 69a9fcc)
- `Tax-Impact-Analyzer/src/lib/firebaseToolData.ts` (commits 4f0e861, 923cc3f)
- `Retire-Portal/firestore.rules` (commit c3d74a0) - Added security rules for `userToolData` collection

**Additional Fix (January 29, 2026):** Added `removeUndefined()` helper function to all three tools to strip undefined values before saving to Firestore. Firestore rejects documents with undefined field values, causing "Unsupported field value: undefined" errors. The helper recursively cleans objects before calling `addDoc()`.

**Security Rules Added:**
```
match /userToolData/{documentId} {
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
  allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
}
```

### Console Logs You'll See

When working (expected):
```
[useFirebaseSync] Auto-save skipped - waiting for initial Firebase load
[useFirebaseSync] Portal listener received data
[App] Loading scenarios from Firebase... Found saved data
[App] Uploading Firebase scenarios to state
```

Currently happening (problem):
- Data saves successfully
- Page refresh shows default scenario instead of saved data
- Not clear if load is failing or if data is being overwritten

---

## 🚀 Instructions for Copilot (New Session)

### Context to Provide

```
I'm continuing Firebase integration work for a retirement planning portal. 
We're implementing Firebase data persistence for 9 retirement tools across 3 batches.

Batch 1 Status (3 tools):
- Firebase save functions implemented and working
- Portal sends FIREBASE_CONFIG and AUTH_TOKEN messages
- Problem: Page refresh doesn't load saved data from Firebase
- Suspect timing issue where default data saves before Firebase data loads

Current code state:
- Removed localStorage saving to eliminate conflicts (Firebase-only now)
- Added hasLoadedInitialDataRef flag to prevent premature saves
- All code compiles without errors

The workspace has these projects:
- Retire-Portal (Next.js portal that embeds tools via iframe)
- Retirement-Planner-AI (Vite + React 19)
- Social-Security-Optimizer (Next.js 15)  
- Tax-Impact-Analyzer (Next.js 16)

Please review the current Firebase integration setup and help fix the 
data loading issue so page refreshes correctly restore saved data.
```

### Files to Review First

1. `/Users/eddie/Google Drive/Projects/Retire-Portal/docs/BATCH_IMPLEMENTATION_HANDOFF.md` (this file)
2. `Retirement-Planner-AI/hooks/useFirebaseSync.ts` - Main coordination logic
3. `Retirement-Planner-AI/services/firebaseToolData.ts` - Firebase service layer
4. `Retirement-Planner-AI/App.tsx` - Look for useFirebaseSync usage (around line 85-120)
5. `Retire-Portal/apps/portal/components/IFrameWrapper.tsx` - Portal message sending

### Debugging Steps

1. **Test Save Flow:**
   - Open Income Estimator in portal (localhost:3000/apps/income-estimator)
   - Create new scenario, modify values
   - Check console for: "Scheduling auto-save", "Debounced save executing", "✓ Saved to Firebase"
   - Verify save in Firebase Console → Firestore → userToolData collection

2. **Test Load Flow:**
   - Hard refresh page (Cmd+Shift+R)
   - Check console logs:
     - Should see: "waiting for initial Firebase load"
     - Should see: "Portal listener received data"
     - Should see: "Loading scenarios from Firebase..."
     - Should see: "Found saved data" or "No data found"
   - Check if scenarios load or if defaults appear

3. **Key Questions:**
   - Is `setupPortalListener` callback firing on page load?
   - Is `getLatestScenarios()` being called?
   - Is Firestore query returning data?
   - Is `onScenariosLoaded` callback executing?
   - Is `uploadScenarios()` being called with loaded data?

### Quick Fixes to Try

1. **Add more detailed logging in firebaseToolData.ts:**
   ```typescript
   // In setupPortalListener AUTH_TOKEN handler
   console.log('[Firebase] Loading data for user:', userId);
   const savedData = await getLatestScenarios(userId);
   console.log('[Firebase] Query returned:', savedData ? 'DATA FOUND' : 'NO DATA');
   console.log('[Firebase] Scenarios count:', savedData?.scenariosState?.scenarios ? Object.keys(savedData.scenariosState.scenarios).length : 0);
   ```

2. **Check if callback is called even when no data exists:**
   - Already implemented - callback should fire with `null` if no data
   - Verify this is happening

3. **Verify Firestore query is correct:**
   - Check `getLatestScenarios()` function
   - Ensure query uses correct field names: userId, toolId, timestamp
   - Verify data structure matches what's being saved

---

## 📋 Batch 2: Implementation Plan

Once Batch 1 is working, implement Firebase for:

### 1. Healthcare Cost Estimator
**Project:** Healthcare-Cost-Estimator  
**Framework:** Vite + React (likely similar to Retirement-Planner-AI)

**Steps:**
1. Create `lib/firebaseToolData.ts`:
   ```typescript
   export const TOOL_ID = 'healthcare-cost-estimator';
   export async function saveHealthcareData(userId, inputs, projections) { ... }
   export async function getLatestHealthcareData(userId) { ... }
   ```

2. Data to save:
   - Current age, retirement age
   - Current premium, deductible, out-of-pocket max
   - Health status estimates
   - Medicare assumptions
   - Projected costs over time

3. Create `hooks/useFirebaseSync.ts` (copy pattern from Retirement-Planner-AI)

4. Update main component to use hook

### 2. Retire Abroad AI
**Project:** Retire-Abroad-AI  
**Framework:** Next.js (likely)

**Steps:**
1. Create `lib/firebaseToolData.ts` with `TOOL_ID = 'retire-abroad'`

2. Data to save:
   - Selected countries for comparison
   - Budget inputs (housing, food, healthcare, etc.)
   - Living preferences (climate, culture, healthcare quality)
   - Visa/residency status
   - Currency exchange rate assumptions

3. Integrate with portal listener pattern

### 3. Pension vs Lump Sum Calculator
**Project:** Pension-Lump-Sum-Calculator  
**Framework:** TBD

**Steps:**
1. Create Firebase service with `TOOL_ID = 'pension-lump-sum'`

2. Data to save:
   - Pension offer details (monthly amount, COLA, survivor benefits)
   - Lump sum offer amount
   - Investment assumptions (return rate, risk tolerance)
   - Life expectancy estimates
   - Break-even analysis results
   - Recommendation

3. Follow same integration pattern

---

## 📋 Batch 3: Implementation Plan

### Tools:
- Budget Burn Rate Calculator (`TOOL_ID = 'burn-rate'`)
- Estate Planning Helper (`TOOL_ID = 'estate-planning'`)
- Withdrawal Strategy Optimizer (`TOOL_ID = 'withdrawal-strategy'`)

**Process:** Follow exact same pattern as Batch 2:
1. Create `firebaseToolData.ts` service layer
2. Create/adapt `useFirebaseSync` hook if needed
3. Integrate with main component
4. Test save/load cycle
5. Verify data appears in Firebase Console

---

## 🔥 Firebase Configuration

### Firestore Structure
**Collection:** `userToolData`

**Document Fields:**
- `userId` (string) - User's Firebase auth ID
- `toolId` (string) - Tool identifier (e.g., "income-estimator")
- `timestamp` (Firestore serverTimestamp)
- `data` (object) - Tool-specific data structure

### Required Composite Indexes

Create in Firebase Console → Firestore → Indexes:

1. **Index 1:**
   - Collection: `userToolData`
   - Fields: `userId` (Ascending), `toolId` (Ascending), `timestamp` (Descending)

2. **Index 2:**
   - Collection: `userToolData`  
   - Fields: `userId` (Ascending), `timestamp` (Descending)

Queries will fail without these indexes once collection has ~200+ documents.

---

## 🧪 Testing Checklist

### Per Tool:
- [ ] Tool saves data to Firebase on user action
- [ ] Console shows successful save with document ID
- [ ] Firebase Console shows document in userToolData collection
- [ ] Page refresh loads saved data correctly
- [ ] Multiple scenarios/variations can be saved
- [ ] Old data is preserved (query returns latest by timestamp)
- [ ] Saves work in both dev mode (localhost) and production
- [ ] No console errors or warnings

### Portal Integration:
- [ ] Portal sends FIREBASE_CONFIG message on iframe load
- [ ] Portal sends AUTH_TOKEN message with userId
- [ ] Tool receives and logs both messages
- [ ] Tool initializes Firebase successfully
- [ ] Tool can query Firestore for user's data

### AI Coach Integration (End-to-End):
- [ ] Open AI Coach in portal
- [ ] Use tool to save real data
- [ ] Ask AI Coach about that tool's topic
- [ ] Verify AI response includes user's actual data (not generic advice)
- [ ] Check `retirementContext.tsx` queries userToolData correctly

---

## 📁 Key Files Reference

### Retirement Planner AI (Reference Implementation)
```
Retirement-Planner-AI/
├── services/
│   └── firebaseToolData.ts          # Firebase service layer
├── hooks/
│   ├── useFirebaseSync.ts           # React integration hook
│   └── index.ts                     # Export hook
├── App.tsx                          # useFirebaseSync usage
└── package.json                     # firebase@^11.0.0 dependency
```

### Portal
```
Retire-Portal/apps/portal/
├── components/
│   └── IFrameWrapper.tsx            # Sends FIREBASE_CONFIG, AUTH_TOKEN
├── app/apps/[appId]/
│   └── page.tsx                     # Dev mode support
├── lib/
│   ├── firebase.ts                  # Config export
│   └── toolDataTypes.ts             # TypeScript interfaces
└── .env.local                       # Firebase env vars
```

### Tool Data Types (for AI Coach queries)
```typescript
// apps/portal/lib/toolDataTypes.ts
export interface IncomeEstimatorData {
  scenariosState: {
    scenarios: Record<string, Scenario>;
    activeScenarioId: string;
  };
  appSettings?: any;
}

export interface SocialSecurityData {
  personalInfo: { birthDate, currentAge, PIAAmount, FRA, retirementAge };
  spouseInfo?: { ... };
  recommendation: { age, monthlyBenefit, reason };
  breakEvenAnalyses: Array<{...}>;
}

export interface TaxAnalysisData {
  incomeSources: { ... };
  accountDetails: { ... };
  projections: Array<TaxProjection>; // First 10 years
  summary: { avgFederalTax, avgStateTax, avgEffectiveRate, totalIncome };
}
```

---

## 🐛 Known Issues

1. **Date:** Load on refresh not working
   - **Status:** Under investigation  
   - **Symptoms:** Saves work, but refresh loads defaults
   - **Theories:** Timing issue, query returning empty, callback not firing
   - **Next Steps:** Add verbose logging to trace load flow

2. **Date:** Firestore indexes not created
   - **Status:** Not blocking (< 200 docs)
   - **Impact:** Queries will fail at scale
   - **Fix:** Create indexes in Firebase Console before production

3. **Dev Mode:** Port conflicts
   - If localhost:5173 (Income Estimator) is in use, dev mode won't work
   - Check with `lsof -i :5173` and kill process if needed

---

## 📞 AI Coach Integration (Final Step)

After all batches complete, update:

### `apps/portal/lib/retirementContext.tsx`

```typescript
export async function fetchUserRetirementData(userId: string) {
  const db = getFirestore();
  
  // Query all tools for this user
  const q = query(
    collection(db, 'userToolData'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );
  
  const snapshot = await getDocs(q);
  
  const toolData: Record<string, any> = {};
  const seenTools = new Set<string>();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const toolId = data.toolId;
    
    // Only keep most recent data per tool
    if (!seenTools.has(toolId)) {
      toolData[toolId] = data.data;
      seenTools.add(toolId);
    }
  });
  
  return toolData;
}
```

### Update AI Coach prompt to include:
- User's actual retirement scenarios from Income Estimator
- User's Social Security claiming strategy
- User's tax projections
- User's healthcare cost estimates
- User's international retirement research
- User's pension analysis
- Etc.

---

## 🎬 Getting Started Tomorrow

1. **Pull latest code** on new computer
2. **Install dependencies:** `npm install` in all project folders
3. **Copy this handoff doc** to Copilot
4. **Provide the context message** from "Instructions for Copilot" section above
5. **Start debugging** the load issue with suggested steps
6. **Once Batch 1 works**, proceed to Batch 2

---

## ✅ Success Criteria

**Batch 1 Complete When:**
- All 3 tools save to Firebase on user action
- All 3 tools load from Firebase on page refresh
- No console errors
- Data persists across sessions

**Batch 2 & 3 Complete When:**
- Same criteria met for all 9 tools
- Firestore indexes created
- AI Coach successfully queries and uses real user data
- End-to-end testing shows AI provides personalized advice based on user's actual tool data

---

## 💾 Backup Current State

Before starting tomorrow, run:
```bash
cd "/Users/eddie/Google Drive/Projects"
git status  # In each project folder
```

Consider creating a branch for this work:
```bash
git checkout -b firebase-integration-batch1
git add .
git commit -m "WIP: Batch 1 Firebase integration - saving works, loading issue"
git push origin firebase-integration-batch1
```

---

**Good luck tomorrow! The framework is all in place, just need to solve the loading issue.** 🚀
