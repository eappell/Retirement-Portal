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

async function createUser(email, password, tier = "free") {
  try {
    if (!["free", "paid", "admin"].includes(tier)) {
      console.error("Error: Tier must be 'free', 'paid', or 'admin'");
      process.exit(1);
    }

    console.log(`Creating ${tier} user: ${email}...`);

    // Create auth user
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: false,
    });

    console.log(`✓ Auth user created: ${userRecord.uid}`);

    // Calculate subscription expiry for paid users
    let subscriptionExpiry = null;
    if (tier === "paid") {
      subscriptionExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    // Create Firestore user document
    await db.collection("users").doc(userRecord.uid).set({
      email,
      tier,
      createdAt: admin.firestore.Timestamp.now(),
      lastLogin: admin.firestore.Timestamp.now(),
      subscriptionExpiry,
      isAdmin: tier === "admin",
    });

    console.log(`✓ Firestore document created`);

    // Set custom claims
    if (tier === "admin") {
      await auth.setCustomUserClaims(userRecord.uid, {admin: true});
      console.log(`✓ Custom claims set`);
    }

    console.log("\n✅ User created successfully!");
    console.log(`   Email: ${email}`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Tier: ${tier.toUpperCase()}`);
    if (subscriptionExpiry) {
      console.log(`   Subscription Expiry: ${subscriptionExpiry.toISOString()}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating user:", error.message);
    process.exit(1);
  }
}

// Get email, password, and tier from command line arguments
const email = process.argv[2];
const password = process.argv[3];
const tierIndex = process.argv.indexOf("--tier");
const tier = tierIndex !== -1 ? process.argv[tierIndex + 1] : "free";

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.js <email> <password> [--tier free|paid|admin]");
  console.error("Examples:");
  console.error("  node scripts/create-admin.js user@example.com MyPassword123");
  console.error("  node scripts/create-admin.js user@example.com MyPassword123 --tier paid");
  console.error("  node scripts/create-admin.js admin@example.com MyPassword123 --tier admin");
  process.exit(1);
}

createUser(email, password, tier);

