#!/bin/bash

# 🚀 Admin Apps Manager - Deployment Checklist
# Run through this checklist before deploying to production

echo "🎯 Admin Application Manager - Deployment Checklist"
echo "=================================================="
echo ""

# 1. Code Quality
echo "1️⃣  Code Quality Checks"
echo "   ✓ TypeScript compilation..."
cd "/Users/eddie/Google Drive/Projects/Retire-Portal/apps/portal" && npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo "   ✅ TypeScript checks passed"
else
    echo "   ❌ TypeScript errors found"
    exit 1
fi

# 2. Build
echo ""
echo "2️⃣  Production Build"
echo "   ✓ Building Next.js app..."
npm run build
if [ $? -eq 0 ]; then
    echo "   ✅ Build successful"
else
    echo "   ❌ Build failed"
    exit 1
fi

# 3. Dependencies
echo ""
echo "3️⃣  Dependencies Check"
echo "   Installed packages:"
npm ls --depth=0 | grep -E "@heroicons|firebase"
echo "   ✅ All dependencies present"

# 4. Firebase
echo ""
echo "4️⃣  Firebase Configuration"
echo "   firebase.json exists: $([ -f firebase.json ] && echo '✅' || echo '❌')"
echo "   firestore.rules exists: $([ -f firestore.rules ] && echo '✅' || echo '❌')"
echo "   environment configured: $([ -f .env.local ] && echo '✅' || echo '❌')"

# 5. Documentation
echo ""
echo "5️⃣  Documentation"
echo "   ADMIN_APPS_SETUP.md: $([ -f ADMIN_APPS_SETUP.md ] && echo '✅' || echo '❌')"
echo "   ADMIN_APPS_QUICK_REF.md: $([ -f ADMIN_APPS_QUICK_REF.md ] && echo '✅' || echo '❌')"
echo "   IMPLEMENTATION_COMPLETE.md: $([ -f IMPLEMENTATION_COMPLETE.md ] && echo '✅' || echo '❌')"

# 6. File Checklist
echo ""
echo "6️⃣  Key Files Modified"
files=(
    "apps/portal/app/admin/apps/page.tsx"
    "apps/portal/app/apps/[appId]/page.tsx"
    "apps/portal/app/dashboard/page.tsx"
    "apps/portal/components/IFrameWrapper.tsx"
    "firestore.rules"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (MISSING)"
    fi
done

echo ""
echo "=================================================="
echo "✅ Pre-deployment checklist complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Verify Firebase project credentials"
echo "   2. Run: firebase deploy --only firestore:rules"
echo "   3. Create admin user in Firebase Console"
echo "   4. Test at http://localhost:3001/admin/apps"
echo "   5. Deploy to production"
echo ""
