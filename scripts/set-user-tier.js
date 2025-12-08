#!/usr/bin/env node

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, "../firebase-adminsdk.json");
if (!require("fs").existsSync(serviceAccountPath)) {
  console.error(
    "Error: firebase-adminsdk.json not found. Please download it from Firebase Console."
  );
  console.error("Steps:");
  console.error("1. Go to Firebase Console > Project Settings > Service Accounts");
  console.error("2. Click 'Generate New Private Key'");
  console.error("3. Save it as 'firebase-adminsdk.json' in the project root");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "retirement-portal-prod",
});

const db = admin.firestore();
const auth = admin.auth();

async function setUserTier(uid, tier) {
  try {
    if (!uid) {
      console.error("Error: UID is required");
      process.exit(1);
    }

    if (!["free", "paid", "admin"].includes(tier)) {
      console.error("Error: Tier must be 'free', 'paid', or 'admin'");
      process.exit(1);
    }

    console.log(`Setting tier '${tier}' for user ${uid}...`);

    // Prepare update fields
    const updateData = {
      tier,
      isAdmin: tier === "admin",
      lastUpdated: admin.firestore.Timestamp.now(),
    };

    if (tier === "paid") {
      updateData.subscriptionExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    } else {
      updateData.subscriptionExpiry = null;
    }

    // Update Firestore user document (create if missing)
    await db.collection("users").doc(uid).set(updateData, { merge: true });
    console.log(`✓ Firestore document updated for ${uid}`);

    // Preserve other custom claims: add or remove the 'admin' flag
    const user = await auth.getUser(uid);
    const existingClaims = user.customClaims || {};

    if (tier === "admin") {
      existingClaims.admin = true;
    } else {
      if (existingClaims.hasOwnProperty("admin")) {
        delete existingClaims.admin;
      }
    }

    await auth.setCustomUserClaims(uid, existingClaims);
    console.log(`✓ Custom claims updated for ${uid}`);

    console.log("\n✅ Tier updated successfully!");
    console.log(`   UID: ${uid}`);
    console.log(`   Tier: ${tier.toUpperCase()}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting tier:", error.message || error);
    process.exit(1);
  }
}

const uid = process.argv[2];
const tier = process.argv[3] || "free";

if (!uid) {
  console.error("Usage: node scripts/set-user-tier.js <uid> <free|paid|admin>");
  console.error("Example: node scripts/set-user-tier.js uid12345 paid");
  process.exit(1);
}

setUserTier(uid, tier);
