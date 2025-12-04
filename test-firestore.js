#!/usr/bin/env node

/**
 * Test Firestore connectivity and app management
 * This script tests if the apps collection can be read/written
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin SDK
// Make sure you have GOOGLE_APPLICATION_CREDENTIALS set or a service account key
try {
  const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.log(
    "Note: Service account key not found. Make sure GOOGLE_APPLICATION_CREDENTIALS is set."
  );
  console.log("Or place serviceAccountKey.json in the project root.");
  process.exit(1);
}

const db = admin.firestore();

async function testFirestore() {
  try {
    console.log("Testing Firestore connectivity...\n");

    // Test 1: Read existing apps
    console.log("📖 Test 1: Reading existing apps...");
    const appsRef = db.collection("apps");
    const snapshot = await appsRef.get();
    console.log(`  Found ${snapshot.size} apps in Firestore`);
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`    - ${data.id}: ${data.name}`);
    });

    // Test 2: Create a test app if none exist
    if (snapshot.size === 0) {
      console.log("\n📝 Test 2: Creating default apps...");
      const defaultApps = [
        {
          id: "income-estimator",
          name: "Monthly Retirement Income Estimator",
          description: "Estimate your retirement income from various sources",
          url: "http://localhost:5173/",
          icon: "🧮",
          freeAllowed: true,
          createdAt: new Date(),
        },
        {
          id: "retire-abroad",
          name: "Retire Abroad AI",
          description:
            "Plan your retirement in another country with AI recommendations",
          url: "https://retire-abroad-ai.vercel.app/",
          icon: "🌍",
          freeAllowed: true,
          createdAt: new Date(),
        },
      ];

      for (const app of defaultApps) {
        await appsRef.add(app);
        console.log(`  ✅ Created: ${app.name}`);
      }
    }

    // Test 3: Verify read after write
    console.log("\n✅ Test 3: Verifying apps after write...");
    const updated = await appsRef.get();
    console.log(`  Total apps: ${updated.size}`);

    console.log("\n✅ All Firestore tests passed!");
    console.log("\n📋 Next steps:");
    console.log("   1. Visit http://localhost:3001/admin/apps to manage apps");
    console.log("   2. Add, edit, or delete applications");
    console.log("   3. Visit http://localhost:3001/dashboard to see them");
    console.log("   4. Deploy rules: firebase deploy --only firestore:rules");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

testFirestore();
