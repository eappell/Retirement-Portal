# Firebase Setup Guide - Retirement Portal

## Project Overview

This document covers the Firebase configuration for the Retirement Portal project.

**Project ID**: `retirement-portal-prod`  
**Region**: `us-west2`  
**Current Status**: ✅ Firestore Rules & Indexes Deployed | ⏳ Cloud Functions (requires Blaze plan)

---

## What Has Been Set Up

### 1. ✅ Firestore Database
- **Status**: Created and Active
- **Location**: us-west2
- **Configuration**: Production mode with security rules

### 2. ✅ Firestore Security Rules (`firestore.rules`)
Comprehensive security rules that enforce:
- **User Data Privacy**: Users can only access their own data
- **Freemium Tier Logic**: 
  - Free users can read/save calculations but cannot persist them
  - Paid users can create, write, and delete saved calculations/recommendations
- **Admin Access**: Admins can read analytics data
- **Anonymous Users**: Read-only access to public data

### 3. ✅ Firestore Indexes (`firestore.indexes.json`)
Optimized indexes for queries:
- `users/analytics` - indexed by userId + timestamp (for analytics queries)
- `savedCalculations` - indexed by userId + createdAt (for user's saved items)

### 4. ✅ Cloud Functions (TypeScript)
**Location**: `functions/src/index.ts`

**Deployed Functions**:
- `onUserCreated` - Trigger: New user document created
- `updateUserTier` - Update user's tier (free → paid)
- `getUserTier` - Fetch user's current tier
- `trackEvent` - Log user actions (clicks, views, queries)
- `getAnalyticsReport` - Admin dashboard analytics
- `checkQueryLimit` - Check if free user exceeded daily limit
- `incrementQueryCount` - Track free user queries

**Note**: Cloud Functions require Firebase Blaze plan (pay-as-you-go). See "Cloud Functions Deployment" section below.

---

## Firestore Data Structure

```
users/
  {userId}/
    ├── email: string
    ├── tier: "free" | "paid"
    ├── createdAt: timestamp
    ├── subscriptionExpiry: timestamp (null if free)
    │
    ├── profile/
    │   ├── name: string
    │   ├── dateOfBirth: date
    │   └── preferences: {...}
    │
    ├── applications/
    │   ├── income-estimator/
    │   │   ├── preferences: {...}
    │   │   └── savedCalculations/ (paid only)
    │   │       └── {calcId}/
    │   │           ├── input: {...}
    │   │           ├── result: {...}
    │   │           └── createdAt: timestamp
    │   │
    │   └── retire-abroad/
    │       ├── preferences: {...}
    │       └── savedRecommendations/ (paid only)
    │           └── {recId}/
    │               ├── data: {...}
    │               └── createdAt: timestamp
    │
    ├── analytics/ (user-specific events)
    │   └── {eventId}/
    │       ├── eventType: "login" | "query" | "save" | "click"
    │       ├── application: "income-estimator" | "retire-abroad"
    │       ├── metadata: {...}
    │       ├── tier: "free" | "paid"
    │       └── timestamp: timestamp
    │
    └── usage/
        └── queries/
            ├── count: number
            └── resetDate: timestamp (daily reset)

analytics/ (global aggregated events)
  └── {eventId}/
      ├── userId: string
      ├── eventType: string
      ├── application: string
      ├── tier: "free" | "paid"
      ├── metadata: {...}
      └── timestamp: timestamp
```

---

## Firebase Configuration for Next.js

Your Next.js app will need Firebase credentials. Get them from Firebase Console:

1. Go to: https://console.firebase.google.com/project/retirement-portal-prod/settings/general
2. Look for "Your apps" section
3. If no web app exists, click "Add app" and select "Web" (</> icon)
4. Copy the Firebase config

**Create `.env.local` in your Next.js root**:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=retirement-portal-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=retirement-portal-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=retirement-portal-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
```

**Note**: `NEXT_PUBLIC_` prefix means these are public - only share non-sensitive values.

---

## Cloud Functions Deployment

### Current Blocker: Requires Blaze Plan

Firebase Cloud Functions require the **Blaze (pay-as-you-go) plan**.

**To Upgrade**:
1. Visit: https://console.firebase.google.com/project/retirement-portal-prod/usage/details
2. Click "Upgrade to Blaze"
3. Add billing information

**Why Blaze?**
- Free Spark plan only supports Firestore/Authentication
- Cloud Functions require Cloud Build & Artifact Registry (Blaze-only)
- Cost: You only pay for what you use. Many functions stay within free tier limits

### Deploy Cloud Functions

Once upgraded to Blaze:

```powershell
cd c:\projects\Retire-Portal
firebase deploy --only functions
```

**Expected Output**:
```
✔ Deploy complete!
Function URL: https://us-west2-retirement-portal-prod.cloudfunctions.net/functionName
```

---

## Client-Side Firebase Integration

### Initialize Firebase in Your Next.js App

**`lib/firebase.ts`**:
```typescript
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-west2");

// Emulator setup (development only)
if (process.env.NODE_ENV === "development") {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", {disableWarnings: true});
    connectFirestoreEmulator(db, "localhost", 8080);
    connectFunctionsEmulator(functions, "localhost", 5001);
  } catch (e) {
    // Already initialized
  }
}
```

### Call Cloud Functions from Client

```typescript
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

// Track an event
const trackEvent = httpsCallable(functions, "trackEvent");
await trackEvent({
  eventType: "query",
  application: "income-estimator",
  metadata: {query: "How much will I have at 65?"}
});

// Check query limit
const checkQueryLimit = httpsCallable(functions, "checkQueryLimit");
const result = await checkQueryLimit({dailyLimit: 5});
console.log(`Can query: ${result.data.canQuery}, Remaining: ${result.data.remaining}`);

// Get user tier
const getUserTier = httpsCallable(functions, "getUserTier");
const tierResult = await getUserTier();
console.log(`User tier: ${tierResult.data.tier}`);
```

---

## Authentication Setup (Next Steps)

Firebase Authentication needs to be configured:

1. **Enable Authentication Methods** in Firebase Console:
   - Email/Password
   - Google Sign-In
   - Anonymous (for free tier users)

2. **Set up Sign-In Domain**:
   - Add your Namecheap domain to authorized domains

3. **Create Auth Context** in Next.js:
   - Wrap app with Firebase auth provider
   - Create hook for checking user tier
   - Implement signup/login pages

---

## Security Rules Explained

### Free Tier Users
- ✅ Can read their profile and preferences
- ✅ Can write their preferences
- ❌ Cannot create/update/delete calculations (blocked at Firestore level)
- ✅ Can read analytics of their own events
- ✅ Can write analytics events

### Paid Tier Users
- ✅ Everything free tier can do
- ✅ Can create, update, delete saved calculations
- ✅ Can create, update, delete saved recommendations
- ✅ No query limits on backend

### Admin Users
- ✅ Can read all analytics data
- ✅ Can write public data

### Key Functions
```javascript
function isAuthenticated() {
  return request.auth != null;
}

function isOwner(userId) {
  return request.auth.uid == userId;
}

function isPaidUser(userId) {
  return getUserTier(userId) == 'paid';
}
```

---

## Testing & Development

### Option 1: Firebase Local Emulator Suite (Recommended)

```bash
# Install emulator
firebase init emulators

# Start emulator
firebase emulators:start

# Emulator runs on:
# - Firestore: localhost:8080
# - Functions: localhost:5001
# - Auth: localhost:9099
```

### Option 2: Development Firebase Project

Use a separate Firebase project for development:

```powershell
# Create dev project
firebase projects:create retirement-portal-dev --display-name="Retirement Portal Dev"

# Use dev project
firebase use dev
```

---

## Next Steps

1. **📝 Create Next.js App** with Firebase integration
2. **🔐 Implement Authentication**:
   - Signup page
   - Login page
   - Logout functionality
   - Auth context/hooks

3. **💳 Set up Payment Integration**:
   - Stripe integration for paid tier
   - Payment webhook handling

4. **🎨 Build Portal UI**:
   - Dashboard
   - App launcher
   - User profile
   - Settings

5. **📱 Integrate External Apps**:
   - iFrame wrapper for Income Estimator
   - iFrame wrapper for Retire Abroad
   - Token passing mechanism

6. **📊 Build Analytics Dashboard**:
   - Admin view for analytics
   - Report generation

---

## Useful Links

- **Firebase Console**: https://console.firebase.google.com/project/retirement-portal-prod
- **Blaze Pricing**: https://firebase.google.com/pricing
- **Firestore Documentation**: https://firebase.google.com/docs/firestore
- **Cloud Functions Documentation**: https://firebase.google.com/docs/functions

---

## Troubleshooting

### Cloud Functions Won't Deploy
- ✅ **Solution**: Upgrade to Blaze plan

### Firestore Rules Rejected Write
- ✅ **Check**: User is authenticated
- ✅ **Check**: User tier is "paid" (for save operations)
- ✅ **Check**: User is writing to their own document

### Functions Not Being Called
- ✅ **Check**: Functions are deployed (`firebase deploy --only functions`)
- ✅ **Check**: User is authenticated before calling
- ✅ **Check**: Check browser console for errors

---

**Last Updated**: December 3, 2025  
**Project Status**: Firebase Backend Ready | Portal Frontend Next
