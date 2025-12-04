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

async function promoteToAdmin(email) {
  try {
    console.log(`Promoting ${email} to admin...`);

    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✓ Found user: ${userRecord.uid}`);

    // Update Firestore document
    await db.collection("users").doc(userRecord.uid).update({
      tier: "admin",
      isAdmin: true,
    });
    console.log(`✓ Firestore document updated`);

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });
    console.log(`✓ Custom claims set`);

    console.log("\n✅ User promoted to admin successfully!");
    console.log(`   Email: ${email}`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Tier: ADMIN`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error promoting user:", error.message);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/promote-to-admin.js <email>");
  console.error("Example: node scripts/promote-to-admin.js admin@example.com");
  process.exit(1);
}

promoteToAdmin(email);
