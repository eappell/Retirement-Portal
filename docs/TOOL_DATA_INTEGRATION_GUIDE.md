# Tool Data Integration Guide

This guide shows how to integrate Firebase data saving into existing retirement planning tools using the shared utilities.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Step-by-Step Integration](#step-by-step-integration)
3. [Implementation Examples](#implementation-examples)
4. [Best Practices](#best-practices)
5. [Testing](#testing)

---

## Quick Start

### 1. Import the Utilities

```typescript
import { saveToolData, getLatestToolData, TOOL_IDS } from '@/lib/firebaseToolData';
import type { IncomeEstimatorData } from '@/lib/toolDataTypes';
import { useAuth } from '@/contexts/AuthContext';
```

### 2. Add Save Function

```typescript
const { user } = useAuth();

const handleSaveResults = async () => {
  if (!user) return;
  
  try {
    await saveToolData(user.uid, TOOL_IDS.INCOME_ESTIMATOR, {
      totalIncome: 75000,
      socialSecurity: 32000,
      pension: 18000,
      // ... other fields
    });
    
    toast.success('Results saved successfully!');
  } catch (error) {
    console.error('Save error:', error);
    toast.error('Failed to save results');
  }
};
```

### 3. Load Previous Data

```typescript
useEffect(() => {
  const loadPreviousData = async () => {
    if (!user) return;
    
    try {
      const data = await getLatestToolData<IncomeEstimatorData>(
        user.uid,
        TOOL_IDS.INCOME_ESTIMATOR
      );
      
      if (data) {
        // Populate form fields
        setSocialSecurity(data.socialSecurity);
        setPension(data.pension);
        // ... etc
      }
    } catch (error) {
      console.error('Load error:', error);
    }
  };
  
  loadPreviousData();
}, [user]);
```

---

## Step-by-Step Integration

### Example: Income Estimator Tool

#### Step 1: Add Imports

```typescript
// At the top of your component file
import { saveToolData, getLatestToolData, TOOL_IDS } from '@/lib/firebaseToolData';
import type { IncomeEstimatorData } from '@/lib/toolDataTypes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
```

#### Step 2: Get Auth Context

```typescript
export default function IncomeEstimator() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // ... existing state
```

#### Step 3: Create Save Handler

```typescript
const saveCalculation = async () => {
  if (!user) {
    toast.error('Please sign in to save your results');
    return;
  }
  
  try {
    const dataToSave = {
      totalIncome,
      socialSecurity,
      pension,
      partnerships,
      investments,
      rentalIncome,
      partTimeWork,
      other,
      retirementAge,
      currency: 'USD',
    };
    
    await saveToolData(user.uid, TOOL_IDS.INCOME_ESTIMATOR, dataToSave);
    toast.success('✓ Income estimate saved');
  } catch (error) {
    console.error('Failed to save:', error);
    toast.error('Failed to save calculation');
  }
};
```

#### Step 4: Auto-Save or Manual Save

**Option A: Auto-save on calculation**
```typescript
const calculateTotal = () => {
  const total = 
    socialSecurity + 
    pension + 
    partnerships + 
    investments + 
    rentalIncome + 
    partTimeWork + 
    other;
  
  setTotalIncome(total);
  
  // Auto-save after calculation
  if (user && total > 0) {
    saveCalculation();
  }
};
```

**Option B: Manual save button**
```tsx
<button
  onClick={saveCalculation}
  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
>
  Save Results
</button>
```

#### Step 5: Load Previous Data

```typescript
useEffect(() => {
  const loadPreviousCalculation = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const previousData = await getLatestToolData<IncomeEstimatorData>(
        user.uid,
        TOOL_IDS.INCOME_ESTIMATOR
      );
      
      if (previousData) {
        setSocialSecurity(previousData.socialSecurity);
        setPension(previousData.pension);
        setPartnerships(previousData.partnerships);
        setInvestments(previousData.investments);
        setRentalIncome(previousData.rentalIncome);
        setPartTimeWork(previousData.partTimeWork);
        setOther(previousData.other);
        setTotalIncome(previousData.totalIncome);
        
        toast.info('Previous calculation loaded');
      }
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };
  
  loadPreviousCalculation();
}, [user]);
```

---

## Implementation Examples

### Example 1: Social Security Optimizer

```typescript
'use client';

import { useState, useEffect } from 'react';
import { saveToolData, getLatestToolData, TOOL_IDS } from '@/lib/firebaseToolData';
import type { SocialSecurityData } from '@/lib/toolDataTypes';
import { useAuth } from '@/contexts/AuthContext';

export default function SocialSecurityOptimizer() {
  const { user } = useAuth();
  
  // Form state
  const [claimAge, setClaimAge] = useState(67);
  const [birthYear, setBirthYear] = useState(1960);
  const [estimatedBenefit, setEstimatedBenefit] = useState(0);
  
  // Results state
  const [optimalAge, setOptimalAge] = useState<number | null>(null);
  const [lifetimeValue, setLifetimeValue] = useState<number | null>(null);
  
  // Load previous data
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      const data = await getLatestToolData<SocialSecurityData>(
        user.uid,
        TOOL_IDS.SOCIAL_SECURITY
      );
      
      if (data) {
        setClaimAge(data.claimAge);
        setBirthYear(data.birthYear);
        setEstimatedBenefit(data.estimatedBenefit);
        if (data.optimalClaimAge) setOptimalAge(data.optimalClaimAge);
        if (data.lifetimeValue) setLifetimeValue(data.lifetimeValue);
      }
    };
    
    loadData();
  }, [user]);
  
  // Calculate and save
  const handleCalculate = async () => {
    // ... calculation logic ...
    const calculated = performOptimization(claimAge, birthYear, estimatedBenefit);
    
    setOptimalAge(calculated.optimalAge);
    setLifetimeValue(calculated.lifetimeValue);
    
    // Auto-save results
    if (user) {
      await saveToolData(user.uid, TOOL_IDS.SOCIAL_SECURITY, {
        claimAge,
        birthYear,
        estimatedBenefit,
        fullRetirementAge: 67,
        optimalClaimAge: calculated.optimalAge,
        lifetimeValue: calculated.lifetimeValue,
        optimizationPotential: calculated.potentialGain,
      });
    }
  };
  
  return (
    <div>
      {/* Your UI here */}
    </div>
  );
}
```

### Example 2: Tax Impact Analyzer

```typescript
'use client';

import { useState } from 'react';
import { saveToolData, TOOL_IDS, createDebouncedSave } from '@/lib/firebaseToolData';
import type { TaxImpactData } from '@/lib/toolDataTypes';
import { useAuth } from '@/contexts/AuthContext';

// Create debounced save (saves 1 second after user stops typing)
const debouncedSave = createDebouncedSave(1000);

export default function TaxImpactAnalyzer() {
  const { user } = useAuth();
  
  const [currentState, setCurrentState] = useState('CA');
  const [filingStatus, setFilingStatus] = useState<'single' | 'married-joint'>('single');
  const [agi, setAgi] = useState(0);
  const [results, setResults] = useState<any>(null);
  
  // Handle state change with debounced save
  const handleStateChange = (newState: string) => {
    setCurrentState(newState);
    
    // Recalculate
    const newResults = calculateTaxes(newState, filingStatus, agi);
    setResults(newResults);
    
    // Debounced save
    if (user) {
      debouncedSave(user.uid, TOOL_IDS.TAX_IMPACT, {
        currentState: newState,
        filingStatus,
        adjustedGrossIncome: agi,
        federalTax: newResults.federalTax,
        stateTax: newResults.stateTax,
        effectiveTaxRate: newResults.effectiveTaxRate,
        potentialSavings: newResults.potentialSavings,
        recommendedStates: newResults.recommendedStates,
      });
    }
  };
  
  return (
    <div>
      <select value={currentState} onChange={(e) => handleStateChange(e.target.value)}>
        {/* State options */}
      </select>
      
      {results && (
        <div>
          <p>Federal Tax: ${results.federalTax.toLocaleString()}</p>
          <p>State Tax: ${results.stateTax.toLocaleString()}</p>
          <p>Effective Rate: {results.effectiveTaxRate}%</p>
        </div>
      )}
    </div>
  );
}
```

### Example 3: Healthcare Cost Estimator

```typescript
'use client';

import { useState, useEffect } from 'react';
import { saveToolData, getLatestToolData, TOOL_IDS } from '@/lib/firebaseToolData';
import type { HealthcareCostData } from '@/lib/toolDataTypes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function HealthcareCostEstimator() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [age, setAge] = useState(65);
  const [planType, setPlanType] = useState<'medicare' | 'aca' | 'private'>('medicare');
  const [monthlyPremium, setMonthlyPremium] = useState(0);
  const [hsaBalance, setHsaBalance] = useState(0);
  
  // Load previous data
  useEffect(() => {
    if (!user) return;
    
    getLatestToolData<HealthcareCostData>(user.uid, TOOL_IDS.HEALTHCARE)
      .then(data => {
        if (data) {
          setAge(data.age);
          setPlanType(data.planType);
          setMonthlyPremium(data.monthlyPremium);
          setHsaBalance(data.hsaBalance || 0);
        }
      });
  }, [user]);
  
  // Save with validation
  const saveResults = async () => {
    if (!user) {
      toast.error('Please sign in to save');
      return;
    }
    
    // Validate required fields
    if (age < 50 || age > 100) {
      toast.error('Please enter a valid age (50-100)');
      return;
    }
    
    if (monthlyPremium < 0) {
      toast.error('Premium must be a positive number');
      return;
    }
    
    try {
      await saveToolData(user.uid, TOOL_IDS.HEALTHCARE, {
        age,
        planType,
        monthlyPremium,
        hasHSA: hsaBalance > 0,
        hsaBalance,
        lifetimeHealthcareCost: calculateLifetimeCost(age, monthlyPremium),
        yearsUntilMedicare: Math.max(0, 65 - age),
      });
      
      toast.success('Healthcare estimate saved!');
    } catch (error) {
      toast.error('Failed to save estimate');
    }
  };
  
  return (
    <div>
      {/* Form fields */}
      <button onClick={saveResults}>
        Save Estimate
      </button>
    </div>
  );
}
```

---

## Best Practices

### 1. **Always Check Authentication**
```typescript
if (!user) {
  toast.error('Please sign in to save your results');
  return;
}
```

### 2. **Validate Before Saving**
```typescript
// Use the validation utility
import { validateToolData } from '@/lib/firebaseToolData';

try {
  validateToolData(dataToSave, ['totalIncome', 'socialSecurity', 'pension']);
  await saveToolData(user.uid, toolId, dataToSave);
} catch (error) {
  toast.error(error.message);
}
```

### 3. **Handle Errors Gracefully**
```typescript
try {
  await saveToolData(user.uid, toolId, data);
  toast.success('Saved successfully');
} catch (error) {
  console.error('Save failed:', error);
  toast.error('Failed to save. Please try again.');
  // Don't block the user from continuing
}
```

### 4. **Use Debouncing for Real-Time Input**
```typescript
// For forms with multiple fields that update frequently
const debouncedSave = createDebouncedSave(1500);

const handleFieldChange = (field: string, value: any) => {
  // Update local state immediately
  setState(prev => ({ ...prev, [field]: value }));
  
  // Save after 1.5s of no changes
  if (user) {
    debouncedSave(user.uid, toolId, { ...state, [field]: value });
  }
};
```

### 5. **Provide Visual Feedback**
```typescript
const [saving, setSaving] = useState(false);

const save = async () => {
  setSaving(true);
  try {
    await saveToolData(user.uid, toolId, data);
    toast.success('✓ Saved');
  } finally {
    setSaving(false);
  }
};

// In JSX:
<button disabled={saving}>
  {saving ? 'Saving...' : 'Save Results'}
</button>
```

### 6. **Load Data Only Once**
```typescript
useEffect(() => {
  let isMounted = true;
  
  const loadData = async () => {
    if (!user) return;
    
    const data = await getLatestToolData(user.uid, toolId);
    
    // Only update state if component is still mounted
    if (isMounted && data) {
      populateForm(data);
    }
  };
  
  loadData();
  
  return () => {
    isMounted = false;
  };
}, [user]); // Only run when user changes
```

---

## Testing

### Manual Testing Checklist

- [ ] Tool saves data correctly when logged in
- [ ] Tool shows error message when not logged in
- [ ] Previous data loads correctly on page refresh
- [ ] Data persists in Firebase console
- [ ] Multiple saves don't create issues
- [ ] Debouncing works (only saves after delay)
- [ ] Validation prevents invalid data
- [ ] Toast messages show appropriate feedback

### Firebase Console Verification

1. Open Firebase Console → Firestore Database
2. Navigate to `userToolData` collection
3. Find documents with your `userId`
4. Verify `toolId` matches expected value
5. Check all fields are present and correct
6. Verify `timestamp` is recent

### Testing Different Tools

```typescript
// Test script (run in browser console)
import { TOOL_IDS, saveToolData } from '@/lib/firebaseToolData';

const testUserId = 'your-test-user-id';

// Test Income Estimator
await saveToolData(testUserId, TOOL_IDS.INCOME_ESTIMATOR, {
  totalIncome: 75000,
  socialSecurity: 32000,
  pension: 18000,
  partnerships: 10000,
  investments: 8000,
  rentalIncome: 5000,
  partTimeWork: 2000,
  other: 0,
});

// Test Social Security
await saveToolData(testUserId, TOOL_IDS.SOCIAL_SECURITY, {
  claimAge: 67,
  estimatedBenefit: 2500,
  fullRetirementAge: 67,
  birthYear: 1960,
});

// Test Tax Impact
await saveToolData(testUserId, TOOL_IDS.TAX_IMPACT, {
  currentState: 'CA',
  filingStatus: 'married-joint',
  adjustedGrossIncome: 120000,
  federalTax: 18500,
  stateTax: 9200,
  effectiveTaxRate: 23,
});

console.log('✓ Test data saved successfully');
```

---

## Troubleshooting

### Issue: "Collection not found"
**Solution:** Make sure Firestore is initialized and the collection exists.

### Issue: "Permission denied"
**Solution:** Check Firestore security rules allow authenticated users to write.

### Issue: Data not persisting
**Solution:** Verify `timestamp: serverTimestamp()` is included.

### Issue: Type errors
**Solution:** Import correct type from `toolDataTypes.ts` and ensure all required fields are present.

---

## Next Steps

1. Start with **Batch 1** tools (Income, Social Security, Tax)
2. Test each tool thoroughly after integration
3. Verify AI Coach can read and analyze the data
4. Move to **Batch 2** once Batch 1 is validated
5. Document any tool-specific quirks or edge cases
