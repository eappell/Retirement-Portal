# Cloud Functions - Quick Reference Guide

All 7 Cloud Functions are now **live and ready to use** from your Next.js frontend!

## 📍 Functions Location

```
Region: us-central1
Runtime: Node.js 24 (2nd Gen)
Project: retirement-portal-prod
```

---

## 🚀 How to Call Functions from Next.js

### Setup (One Time)

**`lib/firebase.ts`** - Initialize Firebase:
```typescript
import { initializeApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  // Your config from Firebase Console
};

const app = initializeApp(firebaseConfig);
export const functions = getFunctions(app, "us-central1");

// For local development with emulator (optional)
if (process.env.NODE_ENV === "development") {
  connectFunctionsEmulator(functions, "localhost", 5001);
}
```

---

## 📚 Available Functions

### 1️⃣ **getUserTier** - Get user's current tier (FREE/PAID)

**Purpose**: Check if user is on free or paid tier

**Call from Client**:
```typescript
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const getUserTier = httpsCallable(functions, "getUserTier");

// Call it
const result = await getUserTier();

// Returns
{
  tier: "free" | "paid",  // User's tier
  subscriptionExpiry: timestamp | null
}
```

**When to Use**:
- Load user dashboard
- Determine UI features to show
- Control ad display
- Check premium features access

---

### 2️⃣ **checkQueryLimit** - Check if free user can make AI queries

**Purpose**: Enforce daily query limits (5/day for free tier)

**Call from Client**:
```typescript
const checkQueryLimit = httpsCallable(functions, "checkQueryLimit");

// Call it with optional dailyLimit override
const result = await checkQueryLimit({
  dailyLimit: 5  // Optional, defaults to 5
});

// Returns
{
  canQuery: boolean,      // true if under limit
  remaining: number       // Queries left today (-1 if paid)
}
```

**When to Use**:
- Before showing "Ask AI" button
- Validate query before submission
- Display remaining queries to user
- Enforce limits client-side

**Example**:
```typescript
if (result.data.canQuery) {
  // Allow AI query
  await sendAIQuery();
} else {
  // Show "upgrade to remove limits" message
  showUpgradePrompt();
}
```

---

### 3️⃣ **incrementQueryCount** - Track an AI query (free tier only)

**Purpose**: Increment daily query counter for free users

**Call from Client**:
```typescript
const incrementQueryCount = httpsCallable(functions, "incrementQueryCount");

// Call AFTER successful query
await incrementQueryCount();

// Returns
{ success: true }
```

**When to Use**:
- After successful AI query completes
- Only called for free tier users (function checks tier)
- Part of query limiting system

---

### 4️⃣ **trackEvent** - Log analytics events (REQUIRED!)

**Purpose**: Track user behavior for analytics

**Call from Client**:
```typescript
const trackEvent = httpsCallable(functions, "trackEvent");

// Call it
await trackEvent({
  eventType: "login" | "query" | "save" | "click" | "view",
  application: "income-estimator" | "retire-abroad" | "portal",
  metadata: {
    // Optional custom data
    buttonName: "calculate",
    resultValue: 12345,
    // etc.
  }
});

// Returns
{ success: true }
```

**Event Types to Track**:
```
"login"         - User login/authentication
"logout"        - User logout
"query"         - AI query made
"save"          - Calculation/recommendation saved
"click"         - Button clicked
"view"          - Page/feature viewed
"upgrade"       - Tier upgrade attempt
"error"         - Error occurred
```

**When to Use**:
- **User authenticates** → track "login"
- **User clicks button** → track "click"
- **User submits form** → track "query" or custom
- **User saves result** → track "save"
- **User navigates** → track "view"

**Example - Track Login**:
```typescript
const handleLogin = async (email: string) => {
  // ... login logic
  
  await trackEvent({
    eventType: "login",
    application: "portal",
    metadata: { 
      method: "email",
      timestamp: new Date().toISOString()
    }
  });
};
```

**Example - Track AI Query**:
```typescript
const handleAIQuery = async (question: string) => {
  // First check limit
  const limitCheck = await checkQueryLimit();
  if (!limitCheck.data.canQuery) return;
  
  // Make the query to external app
  const response = await callExternalAI(question);
  
  // Track the query
  await trackEvent({
    eventType: "query",
    application: "income-estimator",
    metadata: { 
      question,
      resultLength: response.length
    }
  });
  
  // Increment counter (if free tier)
  await incrementQueryCount();
};
```

---

### 5️⃣ **updateUserTier** - Upgrade user to paid

**Purpose**: Upgrade free user to paid tier after payment

**Call from Client** (After Stripe payment succeeds):
```typescript
const updateUserTier = httpsCallable(functions, "updateUserTier");

const result = await updateUserTier({
  tier: "paid"
});

// Returns
{
  success: true,
  message: "User upgraded to paid tier",
  tier: "paid",
  subscriptionExpiry: timestamp  // 1 year from now
}
```

**When to Use**:
- User completes Stripe payment
- User clicks "Upgrade to Premium"
- Admin manually upgrades user

**Example - After Stripe Success**:
```typescript
const handlePaymentSuccess = async (paymentIntentId: string) => {
  // Verify payment on backend (optional)
  
  // Upgrade user tier
  const result = await updateUserTier({ tier: "paid" });
  
  // Track the upgrade
  await trackEvent({
    eventType: "upgrade",
    application: "portal",
    metadata: { paymentIntentId }
  });
  
  // Refresh user data
  reloadUserTier();
  
  // Show success message
  showSuccessNotification("Welcome to Premium!");
};
```

---

### 6️⃣ **onUserCreated** - Auto-initialize new users

**Purpose**: Automatically create user document in Firestore

**When it Triggers**:
- Automatically when you create a user in Firebase Auth
- Runs on server, you don't call it
- Creates `/users/{userId}` document with defaults

**What it Does**:
```
Creates: users/{userId}
{
  createdAt: timestamp,
  tier: "free",
  subscriptionExpiry: null
}
```

**No action needed** - This function runs automatically!

---

### 7️⃣ **getAnalyticsReport** - Get analytics for admin dashboard

**Purpose**: Fetch aggregated analytics data for admins only

**Call from Client** (Admin only):
```typescript
const getAnalyticsReport = httpsCallable(functions, "getAnalyticsReport");

const result = await getAnalyticsReport();

// Returns (admin access required)
{
  totalEvents: 1234,
  eventsByType: {
    "login": 450,
    "query": 200,
    "save": 150,
    // ...
  },
  eventsByApplication: {
    "income-estimator": 600,
    "retire-abroad": 400,
    "portal": 234
  },
  eventsByTier: {
    "free": 800,
    "paid": 434
  },
  uniqueUserCount: 156
}
```

**When to Use**:
- Admin dashboard page
- Business metrics display
- User engagement reports
- Revenue tracking

**Note**: Requires user to have `isAdmin` custom claim

---

## 🔄 Complete User Flow Example

```typescript
// 1. User signs up
const handleSignup = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // onUserCreated fires automatically, creates user doc
  
  // Track signup
  await trackEvent({
    eventType: "login",
    application: "portal"
  });
};

// 2. User loads dashboard
const DashboardPage = () => {
  const [userTier, setUserTier] = useState<"free" | "paid">("free");
  
  useEffect(() => {
    const fetchTier = async () => {
      const result = await getUserTier();
      setUserTier(result.data.tier);
      
      // Track page view
      await trackEvent({
        eventType: "view",
        application: "portal",
        metadata: { page: "dashboard", tier: result.data.tier }
      });
    };
    fetchTier();
  }, []);
};

// 3. User clicks "Use Income Estimator"
const handleAppClick = async (appId: string) => {
  // Track app access
  await trackEvent({
    eventType: "click",
    application: "portal",
    metadata: { app: appId }
  });
  
  // Navigate to app
  router.push(`/apps/${appId}`);
};

// 4. User tries to use AI feature
const handleAIQuery = async (question: string) => {
  // Check limit
  const limit = await checkQueryLimit();
  
  if (!limit.data.canQuery) {
    // Show upgrade prompt
    showUpgradeModal();
    return;
  }
  
  // Call external app's AI
  const response = await income-estimator-api(question);
  
  // Track query
  await trackEvent({
    eventType: "query",
    application: "income-estimator",
    metadata: { question }
  });
  
  // Increment query count
  await incrementQueryCount();
  
  // Track result saved (if applicable)
  if (userSaved) {
    await trackEvent({
      eventType: "save",
      application: "income-estimator",
      metadata: { resultId: response.id }
    });
  }
};

// 5. User upgrades to paid
const handleUpgrade = async () => {
  // Stripe payment...
  const paymentResult = await stripe.confirmCardPayment(...);
  
  if (paymentResult.paymentIntent.status === "succeeded") {
    // Upgrade user
    await updateUserTier({ tier: "paid" });
    
    // Track upgrade
    await trackEvent({
      eventType: "upgrade",
      application: "portal"
    });
    
    // Refresh tier
    const newTier = await getUserTier();
    // Update UI...
  }
};
```

---

## 🛡️ Error Handling

```typescript
import { FunctionsError } from "firebase/functions";

const trackEvent = httpsCallable(functions, "trackEvent");

try {
  await trackEvent({
    eventType: "click",
    application: "portal"
  });
} catch (error) {
  if (error instanceof FunctionsError) {
    const code = error.code;
    const message = error.message;
    
    if (code === "unauthenticated") {
      // User not logged in
      redirectToLogin();
    } else if (code === "resource-exhausted") {
      // Free tier limit exceeded
      showUpgradePrompt();
    } else {
      console.error("Function error:", message);
    }
  }
}
```

---

## 📊 Analytics Best Practices

**What to track**:
- ✅ Every user action (click, view, submit)
- ✅ Errors and failures
- ✅ Feature usage
- ✅ Query counts
- ✅ Tier-specific actions

**What NOT to track**:
- ❌ Sensitive data (passwords, SSNs)
- ❌ Personally identifiable info
- ❌ Credit card data
- ❌ Too much custom metadata (bloats database)

**Sample event metadata**:
```typescript
{
  page: "dashboard",
  button: "calculate",
  duration: 1234,
  success: true,
  error: null
}
```

---

## ✅ Testing Checklist

Before launching frontend:

- [ ] Can call `getUserTier()` - returns correct tier
- [ ] Can call `trackEvent()` - events appear in Firestore
- [ ] `checkQueryLimit()` returns correct remaining
- [ ] `incrementQueryCount()` increments counter
- [ ] `updateUserTier()` upgrades tier (test as admin)
- [ ] `onUserCreated` fires on new user signup
- [ ] Error handling works for unauthenticated calls

---

## 🔗 Useful Links

- [Firebase Functions Client SDK](https://firebase.google.com/docs/functions/callable)
- [Your Functions List](https://console.firebase.google.com/project/retirement-portal-prod/functions)
- [Firebase Console](https://console.firebase.google.com/project/retirement-portal-prod)

---

**Status**: All 7 functions deployed and ready to use! 🚀
