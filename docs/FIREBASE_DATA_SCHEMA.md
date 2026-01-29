# Firebase Data Storage Schema for RetireWise Apps

## Overview
All retirement planning tools save user data to a unified Firestore collection for cross-tool analysis by the AI Coach.

## Collection Structure

### Collection: `userToolData`

Each document represents a snapshot of data from a specific tool for a specific user.

```typescript
{
  // Required fields (all tools)
  userId: string;              // Firebase Auth UID
  toolId: string;              // Standardized tool identifier (see list below)
  timestamp: Timestamp;        // When this data was saved
  version: string;             // Schema version (e.g., "1.0")
  
  // Tool-specific data (varies by tool)
  // ... fields specific to each tool
}
```

## Standardized Tool IDs

```typescript
const TOOL_IDS = {
  INCOME_ESTIMATOR: "income-estimator",
  SOCIAL_SECURITY: "social-security-optimizer",
  TAX_IMPACT: "tax-impact-analyzer",
  HEALTHCARE: "healthcare-cost-estimator",
  RETIRE_ABROAD: "retire-abroad",
  PENSION_LUMPSUM: "pension-vs-lumpsum",
  RETIREMENT_AGE: "retirement-age-calculator",
  SAVINGS_GOAL: "savings-goal-calculator",
  WITHDRAWAL_STRATEGY: "withdrawal-strategy",
  LEGACY_PLANNING: "legacy-planning",
  ACTIVITY_BUDGET: "activity-budget",
  INVESTMENT_ALLOCATION: "investment-allocation",
} as const;
```

## Tool-Specific Schemas

### 1. Income Estimator (`income-estimator`)

```typescript
{
  userId: string;
  toolId: "income-estimator";
  timestamp: Timestamp;
  version: "1.0";
  
  // Income breakdown
  totalIncome: number;              // Annual total
  socialSecurity: number;           // Annual SS benefits
  pension: number;                  // Annual pension income
  partnerships: number;             // Annual partnership income
  investments: number;              // Annual investment income (dividends, interest)
  rentalIncome: number;             // Annual rental property income
  partTimeWork: number;             // Annual part-time work income
  other: number;                    // Other annual income
  
  // Metadata
  retirementAge: number;            // Age at retirement
  currentAge: number;               // Current age
  notes?: string;                   // User notes
}
```

### 2. Social Security Optimizer (`social-security-optimizer`)

```typescript
{
  userId: string;
  toolId: "social-security-optimizer";
  timestamp: Timestamp;
  version: "1.0";
  
  // Current strategy
  claimAge: number;                 // Age user plans to claim (62-70)
  estimatedBenefit: number;         // Annual benefit at claim age
  
  // Optimization data
  optimizationPotential: number;    // Lifetime $ increase from optimal strategy
  optimalClaimAge: number;          // Recommended claim age
  optimalBenefit: number;           // Annual benefit at optimal age
  
  // User details
  currentAge: number;
  birthYear: number;
  estimatedLifeExpectancy: number;
  
  // Spousal data (if applicable)
  hasSpouse: boolean;
  spouseClaimAge?: number;
  spouseEstimatedBenefit?: number;
  
  notes?: string;
}
```

### 3. Tax Impact Analyzer (`tax-impact-analyzer`)

```typescript
{
  userId: string;
  toolId: "tax-impact-analyzer";
  timestamp: Timestamp;
  version: "1.0";
  
  // Current situation
  currentState: string;             // Two-letter state code (e.g., "CA", "TX")
  filingStatus: string;             // "single" | "married-joint" | "married-separate" | "head-of-household"
  annualIncome: number;             // Gross annual income
  
  // Tax calculations
  federalTax: number;               // Annual federal tax
  stateTax: number;                 // Annual state tax
  localTax: number;                 // Annual local tax
  totalTax: number;                 // Total annual tax burden
  effectiveTaxRate: number;         // Percentage (e.g., 22.5)
  
  // Optimization
  potentialSavings: number;         // Annual savings from tax-friendly relocation
  recommendedStates: string[];      // Array of state codes (e.g., ["FL", "TX", "NV"])
  
  // Deductions & credits
  standardDeduction: number;
  itemizedDeductions?: number;
  taxCredits?: number;
  
  notes?: string;
}
```

### 4. Healthcare Cost Estimator (`healthcare-cost-estimator`)

```typescript
{
  userId: string;
  toolId: "healthcare-cost-estimator";
  timestamp: Timestamp;
  version: "1.0";
  
  // User info
  age: number;
  state: string;                    // Two-letter state code
  
  // Insurance details
  planType: string;                 // "medicare-advantage" | "medigap" | "aca-marketplace" | "employer"
  monthlyPremium: number;           // Monthly insurance premium
  annualDeductible: number;
  maxOutOfPocket: number;           // Annual max OOP
  
  // Estimated costs
  estimatedAnnualCost: number;      // Premium + expected OOP
  prescriptionCosts: number;        // Annual prescription costs
  dentalVisionCosts: number;        // Annual dental/vision costs
  
  // HSA
  hasHSA: boolean;
  hsaBalance?: number;
  hsaAnnualContribution?: number;
  
  // Projected lifetime costs
  lifetimeHealthcareCost?: number;  // Total projected through retirement
  
  notes?: string;
}
```

### 5. Retire Abroad (`retire-abroad`)

```typescript
{
  userId: string;
  toolId: "retire-abroad";
  timestamp: Timestamp;
  version: "1.0";
  
  // Selected location
  country: string;                  // ISO country code (e.g., "MX", "PT", "CR")
  city?: string;
  
  // Cost comparison
  currentCostOfLiving: number;      // Monthly in current location
  destinationCostOfLiving: number;  // Monthly in destination
  monthlySavings: number;           // Difference
  
  // Additional factors
  healthcareCost: number;           // Monthly healthcare in destination
  housingCost: number;              // Monthly housing in destination
  visaRequirements: string;         // Brief description
  taxImplications: string;          // Brief description
  
  // Quality of life scores (1-10)
  climateScore?: number;
  healthcareQuality?: number;
  safetyScore?: number;
  expatCommunitySize?: number;
  
  notes?: string;
}
```

### 6. Pension vs Lump Sum (`pension-vs-lumpsum`)

```typescript
{
  userId: string;
  toolId: "pension-vs-lumpsum";
  timestamp: Timestamp;
  version: "1.0";
  
  // Pension option
  monthlyPension: number;           // Monthly pension amount
  annualPension: number;            // Annual pension amount
  pensionCOLA: number;              // COLA % (e.g., 2.5)
  survivorBenefit: boolean;
  survivorPercentage?: number;      // % spouse receives (e.g., 50, 75, 100)
  
  // Lump sum option
  lumpSumAmount: number;
  
  // Analysis
  recommendedChoice: string;        // "pension" | "lump-sum"
  breakEvenAge: number;             // Age where values equal
  lifetimeValue: {
    pension: number;
    lumpSum: number;
  };
  
  // Assumptions used
  expectedReturn: number;           // Investment return % for lump sum
  inflationRate: number;
  lifeExpectancy: number;
  
  notes?: string;
}
```

### Template for Remaining Tools

```typescript
{
  userId: string;
  toolId: "[tool-id]";
  timestamp: Timestamp;
  version: "1.0";
  
  // Tool-specific fields
  // ... add relevant data fields for each tool
  
  notes?: string;
}
```

## Implementation Guidelines

### 1. Saving Data (From Apps)

```typescript
import { db } from '@/lib/firebase'; // or your Firebase config
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

async function saveToolData(userId: string, toolId: string, data: object) {
  try {
    await addDoc(collection(db, 'userToolData'), {
      userId,
      toolId,
      timestamp: serverTimestamp(),
      version: '1.0',
      ...data,
    });
    console.log(`Saved ${toolId} data for user ${userId}`);
  } catch (error) {
    console.error('Error saving tool data:', error);
    throw error;
  }
}
```

### 2. Reading Data (From AI Coach)

```typescript
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

async function getLatestToolData(userId: string, toolId: string) {
  const q = query(
    collection(db, 'userToolData'),
    where('userId', '==', userId),
    where('toolId', '==', toolId),
    orderBy('timestamp', 'desc'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : snapshot.docs[0].data();
}
```

### 3. When to Save

**Save data when:**
- ✅ User completes a calculation
- ✅ User explicitly clicks "Save" or "Update"
- ✅ User navigates away after making changes (auto-save)
- ✅ Every time results change (debounced)

**Don't save:**
- ❌ On every keystroke
- ❌ Intermediate calculation steps
- ❌ Invalid/incomplete data

### 4. Data Retention

- Keep **latest 10 entries** per tool per user
- Use Cloud Functions to clean up old data (optional)
- Allow users to view history (future feature)

## Firestore Indexes Required

```
Collection: userToolData
- userId (Ascending) + toolId (Ascending) + timestamp (Descending)
- userId (Ascending) + timestamp (Descending)
```

Create in Firebase Console or via `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "userToolData",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "toolId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userToolData/{docId} {
      // Users can only read/write their own data
      allow read, write: if request.auth != null 
                         && request.resource.data.userId == request.auth.uid;
      
      // Validate required fields on write
      allow create: if request.resource.data.keys().hasAll(['userId', 'toolId', 'timestamp', 'version']);
    }
  }
}
```

## Migration Path

For existing apps with data:
1. Create migration script to transform existing data
2. Run once per user on first load of updated app
3. Mark migration complete in user profile
4. Continue with new schema going forward

## Versioning

When schema changes:
1. Increment version number (e.g., "1.1", "2.0")
2. AI Coach handles multiple versions gracefully
3. Apps can read old versions and save new versions
4. Eventually migrate all data to latest version
