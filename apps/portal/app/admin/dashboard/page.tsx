"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useUserTier } from "@/lib/useUserTier";
import { Header } from "@/components/Header";
import { db, functions as firebaseFunctions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useToast } from "@/components/ToastProvider";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  ArrowDownTrayIcon,
  UsersIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

interface UserStats {
  totalUsers: number;
  freeUsers: number;
  paidUsers: number;
  adminUsers: number;
  totalQueries: number;
  totalEvents: number;
  averageQueriesPerUser: number;
}

interface Analytics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  topApps: Array<{ name: string; count: number }>;
  recentEvents: Array<{ type: string; count: number; timestamp: Date }>;
}

function CreateUserForm({ onSuccess, onError }: { onSuccess: (uid: string) => void; onError: (msg: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [tier, setTier] = useState("free");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: any) => {
    e?.preventDefault();
    setLoading(true);
    try {
      if (!email || !password) throw new Error('Email and password are required');
      const fn = httpsCallable(firebaseFunctions, 'adminCreateUser');
      const res = await fn({ email, password, name, tier });
      const uid = (res?.data as any)?.uid;
      onSuccess(uid);
    } catch (err: any) {
      console.error('create user failed', err);
      const msg = err?.message || String(err);
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
        <input className="mt-1 block w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
        <input type="password" className="mt-1 block w-full border rounded px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
        <input className="mt-1 block w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Tier</label>
        <select value={tier} onChange={(e) => setTier(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2">
          <option value="free">free</option>
          <option value="paid">paid</option>
          <option value="admin">admin</option>
        </select>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => { setEmail(''); setPassword(''); setName(''); setTier('free'); }} className="px-4 py-2 rounded border">Reset</button>
        <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white">
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { tier, loading: tierLoading } = useUserTier();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersList, setUsersList] = useState<Array<Record<string, any>>>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const toast = useToast();

  // Per-user tier selection map
  const [tierSelections, setTierSelections] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    freeUsers: 0,
    paidUsers: 0,
    adminUsers: 0,
    totalQueries: 0,
    totalEvents: 0,
    averageQueriesPerUser: 0,
  });
  const [analytics, setAnalytics] = useState<Analytics>({
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    topApps: [],
    recentEvents: [],
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && (!user || tierLoading)) {
      return;
    }

    if (mounted && user && tier !== "admin") {
      router.push("/dashboard");
    }
  }, [user, tier, tierLoading, mounted, router]);

  useEffect(() => {
    if (mounted && user && tier === "admin") {
      fetchAdminData();
    }
  }, [mounted, user, tier]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch user statistics
      const usersRef = collection(db, "users");
      const allUsersSnapshot = await getDocs(usersRef);
      const totalUsers = allUsersSnapshot.size;

      let freeUsers = 0;
      let paidUsers = 0;
      let adminUsers = 0;
      let totalQueries = 0;

      allUsersSnapshot.forEach((doc) => {
        const data = doc.data();
        const userTier = data.tier || "free";
        if (userTier === "free") freeUsers++;
        else if (userTier === "paid") paidUsers++;
        else if (userTier === "admin") adminUsers++;

        totalQueries += data.queryCount || 0;
      });

      // Fetch analytics events
      const eventsRef = collection(db, "analytics");
      const eventsSnapshot = await getDocs(eventsRef);
      const totalEvents = eventsSnapshot.size;

      // Calculate top apps
      const appStats: { [key: string]: number } = {};
      eventsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.eventType === "app_launch") {
          const appId = data.metadata?.appId || "unknown";
          appStats[appId] = (appStats[appId] || 0) + 1;
        }
      });

      const topApps = Object.entries(appStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalUsers,
        freeUsers,
        paidUsers,
        adminUsers,
        totalQueries,
        totalEvents,
        averageQueriesPerUser:
          totalUsers > 0 ? Math.round(totalQueries / totalUsers) : 0,
      });

      setAnalytics({
        dailyActiveUsers: Math.round(totalUsers * 0.3),
        weeklyActiveUsers: Math.round(totalUsers * 0.6),
        monthlyActiveUsers: totalUsers,
        topApps,
        recentEvents: [
          { type: "login", count: Math.round(totalEvents * 0.4), timestamp: new Date() },
          { type: "logout", count: Math.round(totalEvents * 0.15), timestamp: new Date() },
          { type: "app_launch", count: Math.round(totalEvents * 0.3), timestamp: new Date() },
          { type: "query", count: Math.round(totalEvents * 0.15), timestamp: new Date() },
        ],
      });
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsers = async () => {
    setExportLoading(true);
    try {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const rows: Array<Record<string, any>> = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        rows.push({
          id: doc.id,
          email: data.email || "",
          name: data.name || "",
          tier: data.tier || "",
          queryCount: data.queryCount || 0,
          createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : String(data.createdAt)) : "",
        });
      });

      // Build CSV
      const header = ["id", "email", "name", "tier", "queryCount", "createdAt"];
      const csv = [header.join(",")];
      for (const r of rows) {
        const line = header.map((h) => {
          const v = r[h] ?? "";
          const s = typeof v === "string" ? v : String(v);
          // escape quotes
          return `"${s.replace(/"/g, '""')}"`;
        }).join(",");
        csv.push(line);
      }

      const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0,10);
      a.href = url;
      a.download = `users-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting users:", err);
      toast.showToast("Failed to export users. Check console for details.", "error");
    } finally {
      setExportLoading(false);
    }
  };

  const [recentEventsLoading, setRecentEventsLoading] = useState(false);

  const fetchRecentEventsFromFirestore = async () => {
    setRecentEventsLoading(true);
    try {
      const eventsRef = collection(db, "analytics");
      const q = query(eventsRef, orderBy("timestamp", "desc"), limit(200));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => {
        const data = doc.data() as any;
        let ts: any = data.timestamp;
        if (ts && typeof ts.toDate === "function") {
          ts = ts.toDate();
        } else if (ts && typeof ts.seconds === "number") {
          ts = new Date(ts.seconds * 1000);
        } else if (ts) {
          ts = new Date(ts);
        } else {
          ts = new Date();
        }

        return {
          type: data.eventType || data.type || "event",
          count: data.count || 1,
          timestamp: ts,
        };
      });

      setAnalytics((prev) => ({ ...prev, recentEvents: items }));
    } catch (err) {
      console.error("Error fetching analytics events:", err);
      toast.showToast("Failed to fetch analytics events. See console.", "error");
    } finally {
      setRecentEventsLoading(false);
    }
  };

  if (!mounted || tierLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: '#0B5394'}}></div>
      </div>
    );
  }

  if (!user || tier !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">System analytics and user management</p>
        </div>

        {/* Users Modal */}
        {showUsers && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowUsers(false)} />
            <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-lg w-full max-w-3xl mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">User List</h3>
                <button className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer" onClick={() => setShowUsers(false)}>Close</button>
              </div>
              <div className="overflow-auto max-h-96">
                {usersLoading ? (
                  <p className="text-gray-600 dark:text-gray-300">Loading users...</p>
                ) : usersList.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-300">No users found.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="py-2 pr-4">ID</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Tier</th>
                        <th className="py-2 pr-4">Queries</th>
                        <th className="py-2 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((u) => (
                        <tr key={u.id} className="border-b border-gray-100 dark:border-slate-700">
                          <td className="py-2 pr-4 text-xs text-gray-600 dark:text-gray-300">{u.id}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">{u.email}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">{u.name}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">{u.tier}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">{u.queryCount}</td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={tierSelections[u.id] ?? u.tier}
                                onChange={(e) => setTierSelections(prev => ({ ...prev, [u.id]: e.target.value }))}
                                className="border rounded px-2 py-1 text-sm"
                              >
                                <option value="free">free</option>
                                <option value="paid">paid</option>
                                <option value="admin">admin</option>
                              </select>
                              <button
                                onClick={async () => {
                                  const newTier = tierSelections[u.id] ?? u.tier;
                                  if (!newTier || newTier === u.tier) return;
                                  try {
                                    const fn = httpsCallable(firebaseFunctions, 'adminSetUserTier');
                                    await fn({ uid: u.id, tier: newTier });
                                    // update UI
                                    setUsersList(prev => prev.map(row => row.id === u.id ? { ...row, tier: newTier } : row));
                                    toast.showToast('Tier updated', 'success');
                                  } catch (err) {
                                    console.error('Failed to set tier', err);
                                    toast.showToast('Failed to set tier. See console.', 'error');
                                  }
                                }}
                                className="bg-gray-100 hover:bg-gray-200 rounded px-2 py-1 text-sm"
                              >
                                Set
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create New User</h3>
                <button className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer" onClick={() => setShowCreateModal(false)}>Close</button>
              </div>
              <CreateUserForm
                onSuccess={(uid) => {
                  setCreateSuccess(`Created ${uid}`);
                  setShowCreateModal(false);
                }}
                onError={(msg) => setCreateError(msg)}
              />
            </div>
          </div>
        )}

        {/* Analytics Events Modal */}
        {showAnalyticsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowAnalyticsModal(false)} />
            <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-lg w-full max-w-3xl mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Analytics Events</h3>
                <button className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer" onClick={() => setShowAnalyticsModal(false)}>Close</button>
              </div>

                  <div className="overflow-auto max-h-96">
                    {recentEventsLoading ? (
                      <p className="text-gray-600 dark:text-gray-300">Loading recent events...</p>
                    ) : analytics.recentEvents.length === 0 ? (
                      <p className="text-gray-600 dark:text-gray-300">No recent events.</p>
                    ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Count</th>
                        <th className="py-2 pr-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.recentEvents.map((ev, idx) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-slate-700">
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">{ev.type}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">{ev.count}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">{ev.timestamp?.toString?.() ?? String(ev.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => { if (!exportLoading) handleExportUsers(); }}
            disabled={exportLoading}
            className={`inline-flex items-center justify-center gap-2 text-white font-semibold py-3 px-6 rounded-lg transition-colors cursor-pointer ${exportLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            style={{ backgroundColor: '#0B5394' }}
            onMouseEnter={(e) => { if (!exportLoading) e.currentTarget.style.backgroundColor = '#094170'; }}
            onMouseLeave={(e) => { if (!exportLoading) e.currentTarget.style.backgroundColor = '#0B5394'; }}
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            {exportLoading ? 'Exporting...' : 'Export User Data'}
          </button>

          <button
            onClick={() => router.push('/admin/manage-users')}
            className="inline-flex items-center justify-center gap-2 text-white font-semibold py-3 px-6 rounded-lg transition-colors cursor-pointer"
            style={{ backgroundColor: '#6b5e62' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5a4e52')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6b5e62')}
          >
            <UsersIcon className="h-5 w-5" />
            Manage Users
          </button>

          <button
            onClick={async () => { setShowAnalyticsModal(true); await fetchRecentEventsFromFirestore(); }}
            className="inline-flex items-center justify-center gap-2 text-white font-semibold py-3 px-6 rounded-lg transition-colors cursor-pointer"
            style={{ backgroundColor: '#0B5394' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#094170')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0B5394')}
          >
            <ChartBarIcon className="h-5 w-5" />
            View Analytics Events
          </button>

          <a
            href="/admin/apps"
            className="inline-flex items-center justify-center gap-2 text-white font-semibold py-3 px-6 rounded-lg transition-colors cursor-pointer"
            style={{ backgroundColor: '#6b5e62' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5a4e52')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6b5e62')}
          >
            <Cog6ToothIcon className="h-5 w-5" />
            Manage Applications
          </a>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-semibold uppercase">Total Users</h3>
            <p className="text-3xl font-bold mt-2" style={{color: '#0B5394'}}>{stats.totalUsers}</p>
            <p className="text-xs text-gray-500 mt-2">
              {stats.paidUsers} paid • {stats.freeUsers} free
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-semibold uppercase">Active Users</h3>
            <p className="text-3xl font-bold mt-2" style={{color: '#0B5394'}}>{analytics.monthlyActiveUsers}</p>
            <p className="text-xs text-gray-500 mt-2">
              {analytics.dailyActiveUsers} daily • {analytics.weeklyActiveUsers} weekly
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-semibold uppercase">Total Queries</h3>
            <p className="text-3xl font-bold mt-2" style={{color: '#0B5394'}}>{stats.totalQueries}</p>
            <p className="text-xs text-gray-500 mt-2">
              Avg {stats.averageQueriesPerUser} per user
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-semibold uppercase">Total Events</h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">{stats.totalEvents}</p>
            <p className="text-xs text-gray-500 mt-2">Tracked analytics events</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* User Tier Distribution */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">User Distribution by Tier</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Free Tier</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.freeUsers} ({Math.round((stats.freeUsers / stats.totalUsers) * 100)}%)
                  </span>
                </div>
                <div className="w-full rounded-full h-2" style={{backgroundColor: '#E8E3DF'}}>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor: '#0B5394',
                      width: `${(stats.freeUsers / stats.totalUsers) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Paid Tier</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.paidUsers} ({Math.round((stats.paidUsers / stats.totalUsers) * 100)}%)
                  </span>
                </div>
                <div className="w-full rounded-full h-2" style={{backgroundColor: '#E8E3DF'}}>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor: '#BFCDE0',
                      width: `${(stats.paidUsers / stats.totalUsers) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Admin Users</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.adminUsers} ({Math.round((stats.adminUsers / stats.totalUsers) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{
                      width: `${(stats.adminUsers / stats.totalUsers) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Applications */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Most Used Applications</h2>
            <div className="space-y-3">
              {analytics.topApps.length > 0 ? (
                analytics.topApps.map((app, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-700">
                      {index + 1}. {app.name}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{backgroundColor: '#BFCDE0', color: '#6b5e62'}}>
                      {app.count} launches
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No data available yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Event Activity</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.recentEvents.map((event, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
              >
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 capitalize">{event.type}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{event.count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">events</p>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
