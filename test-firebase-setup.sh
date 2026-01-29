#!/bin/bash
# Firebase Integration Test Script
# Run this to verify current setup and test Firebase operations

echo "🔥 Firebase Integration Test Script"
echo "===================================="
echo ""

# Check if Firebase is installed in all projects
echo "📦 Checking Firebase Dependencies..."
cd "/Users/eddie/Google Drive/Projects/Retirement-Planner-AI"
if grep -q '"firebase": "\^11.0.0"' package.json; then
    echo "✅ Retirement-Planner-AI: Firebase 11.0.0 installed"
else
    echo "❌ Retirement-Planner-AI: Firebase NOT installed"
fi

cd "/Users/eddie/Google Drive/Projects/Social-Security-Optimizer"
if grep -q '"firebase": "\^11.0.0"' package.json; then
    echo "✅ Social Security Optimizer: Firebase 11.0.0 installed"
else
    echo "❌ Social Security Optimizer: Firebase NOT installed"
fi

cd "/Users/eddie/Google Drive/Projects/Tax-Impact-Analyzer"
if grep -q '"firebase": "\^11.0.0"' package.json; then
    echo "✅ Tax Impact Analyzer: Firebase 11.0.0 installed"
else
    echo "❌ Tax Impact Analyzer: Firebase NOT installed"
fi

echo ""
echo "📁 Checking Firebase Service Files..."
if [ -f "/Users/eddie/Google Drive/Projects/Retirement-Planner-AI/services/firebaseToolData.ts" ]; then
    echo "✅ Retirement-Planner-AI: firebaseToolData.ts exists"
else
    echo "❌ Retirement-Planner-AI: firebaseToolData.ts MISSING"
fi

if [ -f "/Users/eddie/Google Drive/Projects/Social-Security-Optimizer/lib/firebaseToolData.ts" ]; then
    echo "✅ Social Security Optimizer: firebaseToolData.ts exists"  
else
    echo "❌ Social Security Optimizer: firebaseToolData.ts MISSING"
fi

if [ -f "/Users/eddie/Google Drive/Projects/Tax-Impact-Analyzer/src/lib/firebaseToolData.ts" ]; then
    echo "✅ Tax Impact Analyzer: firebaseToolData.ts exists"
else
    echo "❌ Tax Impact Analyzer: firebaseToolData.ts MISSING"
fi

echo ""
echo "🔧 Checking Portal Integration..."
cd "/Users/eddie/Google Drive/Projects/Retire-Portal"

if grep -q "export { firebaseConfig }" apps/portal/lib/firebase.ts; then
    echo "✅ Portal: firebase.ts exports config"
else
    echo "❌ Portal: firebase.ts does NOT export config"
fi

if grep -q "FIREBASE_CONFIG" apps/portal/components/IFrameWrapper.tsx; then
    echo "✅ Portal: IFrameWrapper sends FIREBASE_CONFIG"
else
    echo "❌ Portal: IFrameWrapper does NOT send FIREBASE_CONFIG"
fi

echo ""
echo "🌐 Checking Dev Servers..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ Port 3000 (Portal): RUNNING"
else
    echo "❌ Port 3000 (Portal): NOT RUNNING"
fi

if lsof -i :5173 > /dev/null 2>&1; then
    echo "✅ Port 5173 (Income Estimator dev): RUNNING"
else
    echo "⚠️  Port 5173 (Income Estimator dev): NOT RUNNING (needed for dev mode)"
fi

echo ""
echo "📝 Test Checklist:"
echo "=================="
echo ""
echo "1. Start Portal: cd Retire-Portal && npm run dev"
echo "2. Start Income Estimator: cd Retirement-Planner-AI && npm run dev"
echo "3. Enable dev mode in portal admin (localhost:3000/admin/apps)"
echo "4. Open Income Estimator: localhost:3000/apps/income-estimator"
echo ""
echo "Expected Console Logs:"
echo "-----------------------"
echo "[useFirebaseSync] Auto-save skipped - waiting for initial Firebase load"
echo "[useFirebaseSync] Portal listener received data"
echo "[App] Loading scenarios from Firebase... Found saved data"
echo "[App] Uploading Firebase scenarios to state"
echo ""
echo "5. Create new scenario, modify values"
echo "6. Wait 3 seconds for auto-save"
echo "7. Check console for: 'Debounced save executing now...'"
echo "8. Check console for: '✓ Saved to Firebase with ID: ...'"
echo ""
echo "9. Hard refresh (Cmd+Shift+R)"
echo "10. Check if saved scenarios appear (NOT default)"
echo ""
echo "If step 10 fails, the load issue still exists."
echo ""
echo "🔍 Debugging Steps:"
echo "==================="
echo ""
echo "Add verbose logging to:"
echo "- Retirement-Planner-AI/services/firebaseToolData.ts (getLatestScenarios)"
echo "- Retirement-Planner-AI/hooks/useFirebaseSync.ts (setupPortalListener)"
echo "- Retirement-Planner-AI/App.tsx (onScenariosLoaded callback)"
echo ""
echo "Log:"
echo "- When getLatestScenarios is called"
echo "- What userId is being queried"
echo "- How many documents Firestore returns"
echo "- Whether callback fires with data or null"
echo "- Whether uploadScenarios is called"
echo ""
echo "🚀 Ready to debug!"
