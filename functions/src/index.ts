import {setGlobalOptions} from "firebase-functions";
import {onCall} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin
admin.initializeApp();

setGlobalOptions({maxInstances: 10});

const db = admin.firestore();

// ==================== USER MANAGEMENT ====================

/**
 * Triggered when a new user is created in Firebase Auth
 * Creates a Firestore user document with default free tier
 */
export const onUserCreated = onDocumentCreated(
  "users/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const userData = event.data?.data();

    logger.info(`User document created: ${userId}`, {userData});

    try {
      // Update user with creation timestamp if not present
      if (!userData?.createdAt) {
        await db.collection("users").doc(userId).update({
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          tier: userData?.tier || "free",
          subscriptionExpiry: null,
        });
      }
    } catch (error) {
      logger.error(`Error processing user creation for ${userId}:`, error);
    }
  }
);

/**
 * Admin callable: update a user's profile (email, display name)
 * request.data: { uid, email?, name? }
 */
export const adminUpdateUser = onCall(
  {enforceAppCheck: false},
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new Error("Authentication required");

    const caller = await admin.auth().getUser(callerUid);
    const isAdmin = caller.customClaims?.isAdmin || caller.customClaims?.admin;
    if (!isAdmin) throw new Error("Admin access required");

    const {uid, email, name} = request.data || {};
    if (!uid) throw new Error("uid is required");

    try {
      const updateAuth: Record<string, unknown> = {};
      if (email) updateAuth.email = email;
      if (name) updateAuth.displayName = name;

      if (Object.keys(updateAuth).length > 0) {
        await admin.auth().updateUser(
          uid,
            updateAuth as admin.auth.UpdateRequest
        );
      }

      const updateData: Record<string, unknown> = {};
      if (email) updateData.email = email;
      if (name) updateData.name = name;
      if (Object.keys(updateData).length > 0) {
        await db
          .collection("users")
          .doc(uid)
          .set(updateData, {merge: true});
      }

      return {success: true};
    } catch (error) {
      logger.error("Error updating user via adminUpdateUser:", error);
      throw new Error("Failed to update user");
    }
  }
);

/**
 * Admin callable: delete a user (auth + firestore)
 * request.data: { uid }
 */
export const adminDeleteUser = onCall(
  {enforceAppCheck: false},
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new Error("Authentication required");

    const caller = await admin.auth().getUser(callerUid);
    const isAdmin = caller.customClaims?.isAdmin || caller.customClaims?.admin;
    if (!isAdmin) throw new Error("Admin access required");

    const {uid} = request.data || {};
    if (!uid) throw new Error("uid is required");

    try {
      // Delete auth user if exists
      try {
        await admin.auth().deleteUser(uid);
      } catch (err: unknown) {
        // if user not found, log and continue
        const warnMsg = "Auth deleteUser failed for uid=" + uid + ".";
        logger.warn(warnMsg, err as Error);
      }

      // Delete Firestore user document
      await db.collection("users").doc(uid).delete();

      return {success: true};
    } catch (error) {
      logger.error("Error deleting user via adminDeleteUser:", error);
      throw new Error("Failed to delete user");
    }
  }
);

/**
 * Admin callable: reset a user's password to a random temporary password
 * request.data: { uid }
 * Returns: { success: true, tempPassword }
 */
export const adminResetUserPassword = onCall(
  {enforceAppCheck: false},
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new Error("Authentication required");

    const caller = await admin.auth().getUser(callerUid);
    const isAdmin = caller.customClaims?.isAdmin || caller.customClaims?.admin;
    if (!isAdmin) throw new Error("Admin access required");

    const {uid} = request.data || {};
    if (!uid) throw new Error("uid is required");

    // Generate a random temp password
    const tempPassword = Math.random().toString(36).slice(-12) + "A1!";

    try {
      await admin.auth().updateUser(
        uid,
        {password: tempPassword}
      );

      return {
        success: true,
        tempPassword,
      };
    } catch (error) {
      const errMsg = "Error resetting password via adminResetUserPassword:";
      logger.error(errMsg, error);
      throw new Error("Failed to reset password");
    }
  }
);

/**
 * Callable function to update user tier
 * Can be called from the client to upgrade to paid tier
 */
export const updateUserTier = onCall(
  {enforceAppCheck: false},
  async (request) => {
    const userId = request.auth?.uid;

    if (!userId) {
      throw new Error("Authentication required");
    }

    const {tier} = request.data;

    if (!["free", "paid", "admin"].includes(tier)) {
      throw new Error("Invalid tier. Must be 'free', 'paid', or 'admin'");
    }

    try {
      const subscriptionExpiry = (tier === "paid") ?
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) :
        null;

      await db.collection("users").doc(userId).update({
        tier,
        subscriptionExpiry,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`User ${userId} upgraded to ${tier} tier`);

      return {
        success: true,
        message: `User upgraded to ${tier} tier`,
        tier,
        subscriptionExpiry,
      };
    } catch (error) {
      logger.error(`Error updating tier for ${userId}:`, error);
      throw new Error("Failed to update user tier");
    }
  }
);

/**
 * Get user tier information
 */
export const getUserTier = onCall(
  {enforceAppCheck: false},
  async (request) => {
    const userId = request.auth?.uid;

    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        return {
          tier: "free",
          subscriptionExpiry: null,
        };
      }

      const data = userDoc.data();
      return {
        tier: data?.tier || "free",
        subscriptionExpiry: data?.subscriptionExpiry,
      };
    } catch (error) {
      logger.error(`Error fetching tier for ${userId}:`, error);
      throw new Error("Failed to fetch user tier");
    }
  }
);

// ==================== ANALYTICS ====================

/**
 * Track user analytics events
 * Called from client apps to log user actions
 */
export const trackEvent = onCall(
  {enforceAppCheck: false},
  async (request) => {
    const userId = request.auth?.uid;

    if (!userId) {
      throw new Error("Authentication required");
    }

    const {
      eventType,
      application,
      metadata,
    } = request.data;

    if (!eventType || !application) {
      throw new Error("eventType and application are required");
    }

    try {
      // Get user tier for event logging
      const userDoc = await db.collection("users").doc(userId).get();
      const tier = userDoc.data()?.tier || "free";

      // Store event in user's analytics subcollection
      await db
        .collection("users")
        .doc(userId)
        .collection("analytics")
        .add({
          eventType,
          application,
          metadata: metadata || {},
          tier,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          userId, // Denormalized for querying
        });

      // Also log to a global analytics collection for dashboards
      await db
        .collection("analytics")
        .add({
          userId,
          eventType,
          application,
          tier,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          metadata: metadata || {},
        });

      logger.info(`Event tracked for user ${userId}:`, {
        eventType,
        application,
      });

      return {success: true};
    } catch (error) {
      logger.error(`Error tracking event for ${userId}:`, error);
      throw new Error("Failed to track event");
    }
  }
);

/**
 * Get analytics report for admin dashboard
 * Returns aggregated analytics data
 */
export const getAnalyticsReport = onCall(
  {enforceAppCheck: false},
  async (request) => {
    const userId = request.auth?.uid;

    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check if user is admin (you'd need to set custom claims)
    const customClaims = (await admin.auth().getUser(userId)).customClaims;
    const isAdmin = customClaims?.isAdmin;

    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    try {
      const analyticsSnapshot = await db
        .collection("analytics")
        .limit(1000)
        .get();

      const events = analyticsSnapshot.docs.map((doc) => doc.data());

      // Aggregate stats
      const stats = {
        totalEvents: events.length,
        eventsByType: {} as Record<string, number>,
        eventsByApplication: {} as Record<string, number>,
        eventsByTier: {} as Record<string, number>,
        uniqueUsers: new Set<string>(),
      };

      events.forEach((event) => {
        stats.eventsByType[event.eventType] =
          (stats.eventsByType[event.eventType] || 0) + 1;
        stats.eventsByApplication[event.application] =
          (stats.eventsByApplication[event.application] || 0) + 1;
        stats.eventsByTier[event.tier] =
          (stats.eventsByTier[event.tier] || 0) + 1;
        stats.uniqueUsers.add(event.userId);
      });

      return {
        ...stats,
        uniqueUserCount: stats.uniqueUsers.size,
      };
    } catch (error) {
      logger.error("Error fetching analytics report:", error);
      throw new Error("Failed to fetch analytics report");
    }
  }
);

/**
 * Admin callable: create a new user (admin only)
 * request.data: { email, password, tier, name }
 */
export const adminCreateUser = onCall(
  {enforceAppCheck: false},
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new Error("Authentication required");

    // Only allow callers with isAdmin claim
    const caller = await admin.auth().getUser(callerUid);
    const isAdmin = caller.customClaims?.isAdmin || caller.customClaims?.admin;
    if (!isAdmin) throw new Error("Admin access required");

    const {
      email,
      password,
      tier = "free",
      name,
    } = request.data || {};
    if (!email || !password) {
      throw new Error("email and password are required");
    }

    const allowedTiers = ["free", "paid", "admin"];
    if (!allowedTiers.includes(tier)) {
      throw new Error("Invalid tier");
    }

    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name || undefined,
        emailVerified: false,
      });

      const subscriptionExpiry =
        tier === "paid" ?
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) :
          null;

      await db.collection("users").doc(userRecord.uid).set({
        email,
        name: name || null,
        tier,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        subscriptionExpiry,
        isAdmin: tier === "admin",
      });

      // Set custom claims for admin
      if (tier === "admin") {
        await admin.auth().setCustomUserClaims(userRecord.uid, {
          isAdmin: true,
          admin: true,
        });
      }

      return {success: true, uid: userRecord.uid};
    } catch (error) {
      logger.error("Error creating user via adminCreateUser:", error);
      throw new Error("Failed to create user");
    }
  }
);

/**
 * Admin callable: set another user's tier (admin only)
 * request.data: { uid, tier }
 */
export const adminSetUserTier = onCall(
  {enforceAppCheck: false},
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new Error("Authentication required");

    const caller = await admin.auth().getUser(callerUid);
    const isAdmin = caller.customClaims?.isAdmin || caller.customClaims?.admin;
    if (!isAdmin) throw new Error("Admin access required");

    const {
      uid,
      tier,
    } = request.data || {};
    if (!uid || !tier) {
      throw new Error("uid and tier are required");
    }

    const allowedTiers = ["free", "paid", "admin"];
    if (!allowedTiers.includes(tier)) {
      throw new Error("Invalid tier");
    }

    try {
      const updateData: Record<string, unknown> = {
        tier,
        isAdmin: tier === "admin",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (tier === "paid") {
        updateData.subscriptionExpiry =
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      } else {
        updateData.subscriptionExpiry = null;
      }

      await db.collection("users").doc(uid).set(updateData, {merge: true});

      // Attempt to update custom claims.
      // If the auth user doesn't exist, skip claims update and continue.
      try {
        const user = await admin.auth().getUser(uid);
        const existingClaims = user.customClaims || {};
        if (tier === "admin") {
          existingClaims.isAdmin = true;
        } else {
          if (Object.prototype.hasOwnProperty.call(existingClaims, "isAdmin")) {
            delete existingClaims.isAdmin;
          }
          if (Object.prototype.hasOwnProperty.call(existingClaims, "admin")) {
            delete existingClaims.admin;
          }
        }

        await admin.auth().setCustomUserClaims(uid, existingClaims);
      } catch (err: unknown) {
        // If the user isn't found in Auth, log and continue.
        const msg = "Unable to update custom claims for uid=" + uid + ".";
        logger.warn(msg, err as Error);
      }

      return {success: true};
    } catch (error) {
      logger.error("Error setting user tier via adminSetUserTier:", error);
      throw new Error("Failed to set user tier");
    }
  }
);

// ==================== QUERY RATE LIMITING (Free Tier) ====================

/**
 * Check if free user has exceeded daily AI query limit
 */
export const checkQueryLimit = onCall(
  {enforceAppCheck: false},
  async (request) => {
    const userId = request.auth?.uid;

    if (!userId) {
      throw new Error("Authentication required");
    }

    const {dailyLimit} = request.data;

    try {
      const userDoc = await db.collection("users").doc(userId).get();
      const tier = userDoc.data()?.tier || "free";

      // Paid users have no limit
      if (tier === "paid") {
        return {canQuery: true, remaining: -1};
      }

      // Get today's usage for free tier
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const usageDoc = await db
        .collection("users")
        .doc(userId)
        .collection("usage")
        .doc("queries")
        .get();

      const usageData = usageDoc.data();
      const lastResetDate = usageData?.resetDate?.toDate();

      const limit = dailyLimit || 5;

      // Reset counter if it's a new day
      if (!lastResetDate || lastResetDate < today) {
        await db
          .collection("users")
          .doc(userId)
          .collection("usage")
          .doc("queries")
          .set({
            count: 0,
            resetDate: admin.firestore.FieldValue.serverTimestamp(),
          });

        return {canQuery: true, remaining: limit};
      }

      const currentCount = usageData?.count || 0;
      const canQuery = currentCount < limit;
      const remaining = Math.max(0, limit - currentCount);

      return {canQuery, remaining};
    } catch (error) {
      logger.error(`Error checking query limit for ${userId}:`, error);
      throw new Error("Failed to check query limit");
    }
  }
);

/**
 * Increment query count for free tier users
 */
export const incrementQueryCount = onCall(
  {enforceAppCheck: false},
  async (request) => {
    const userId = request.auth?.uid;

    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      const userDoc = await db.collection("users").doc(userId).get();
      const tier = userDoc.data()?.tier || "free";

      // Only track for free tier
      if (tier === "free") {
        await db
          .collection("users")
          .doc(userId)
          .collection("usage")
          .doc("queries")
          .update({
            count: admin.firestore.FieldValue.increment(1),
          });
      }

      return {success: true};
    } catch (error) {
      logger.error(`Error incrementing query count for ${userId}:`, error);
      throw new Error("Failed to increment query count");
    }
  }
);
