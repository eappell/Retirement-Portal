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

    if (!["free", "paid"].includes(tier)) {
      throw new Error("Invalid tier. Must be 'free' or 'paid'");
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
