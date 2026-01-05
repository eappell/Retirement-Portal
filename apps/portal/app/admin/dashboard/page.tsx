"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useUserTier } from "@/lib/useUserTier";
import { useTheme } from "@/lib/theme";
import { Header } from "@/components/Header";
import UserInfoDialog from "@/components/UserInfoDialog";
import { db, functions as firebaseFunctions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useToast } from "@/components/ToastProvider";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  ArrowDownTrayIcon,
  UsersIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { AppIcon, getIconColor, ICON_MAP } from "@/components/icon-map";

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
  const { theme } = useTheme();
  const forcedTextColor = theme === 'dark' ? '#F9F8F6' : '#2A354A';
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersList, setUsersList] = useState<Array<Record<string, any>>>([]);
  // Create user modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [currentTab, setCurrentTab] = useState<'site'|'users'|'apps'>('site');
  const toast = useToast();

  // users tab state
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  // apps tab state
  type SimpleApp = { id: string; name: string; url: string; description?: string; icon?: string; badge?: string; gradient?: string; freeAllowed?: boolean; firestoreId?: string; disabled?: boolean };
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsList, setAppsList] = useState<SimpleApp[]>([]);
  const [showNewAppForm, setShowNewAppForm] = useState(false);
  const [newApp, setNewApp] = useState<Partial<SimpleApp>>({ id: '', name: '', url: '' });

  // Dev settings (persisted in localStorage)
  const DEV_SETTINGS_KEY = 'portal-dev-settings';
  type DevSettings = { [appId: string]: { enabled: boolean; port: string } };
  function getDevSettings(): DevSettings {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(DEV_SETTINGS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }
  function saveDevSettings(settings: DevSettings) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DEV_SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('dev-settings-changed', { detail: settings }));
  }
  const [devSettings, setDevSettings] = useState<DevSettings>(getDevSettings());

  // editing app state
  const [editingAppFirestoreId, setEditingAppFirestoreId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<Partial<SimpleApp> | null>(null);
  // icon search filter (for edit modal)
  const [iconFilter, setIconFilter] = useState('');
  const ICON_OPTIONS = Array.from(new Set(Object.keys(ICON_MAP))).sort();

  // Per-user tier selection map
  const [tierSelections, setTierSelections] = useState<Record<string, string>>({});

  // Analytics UI state (merged from remote and local changes)
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsLoadingEvents, setAnalyticsLoadingEvents] = useState(false);
  const [analyticsEventsList, setAnalyticsEventsList] = useState<Array<Record<string, any>>>([]);
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

  useEffect(() => {
    if (currentTab === 'users' && usersList.length === 0) {
      loadUsers();
    }
    if (currentTab === 'apps' && appsList.length === 0) {
      loadApps();
    }
  }, [currentTab]);

  // listen for dev settings changes from other pages
  useEffect(() => {
    const handler = (e: any) => setDevSettings(e.detail || getDevSettings());
    window.addEventListener('dev-settings-changed', handler as EventListener);
    return () => window.removeEventListener('dev-settings-changed', handler as EventListener);
  }, []);

  // focus first field when edit modal opens
  useEffect(() => {
    if (editingAppFirestoreId) {
      const t = setTimeout(() => {
        const el = document.getElementById('edit-app-name') as HTMLInputElement | null;
        el?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [editingAppFirestoreId]);

  // editing gradient color matches (safer computed variable used by modal inputs)
  const editingGradientMatches = editingForm && editingForm.gradient ? (editingForm.gradient.match(new RegExp('#(?:[0-9a-fA-F]{3}){1,2}','g')) || []) : [];
  // create modal gradient matches
  const createGradientMatches = newApp && newApp.gradient ? (newApp.gradient.match(new RegExp('#(?:[0-9a-fA-F]{3}){1,2}','g')) || []) : [];

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

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const usersRef = collection(db, "users");
      const snap = await getDocs(usersRef);
      const rows: Array<any> = [];
      snap.forEach((doc) => {
        const d = doc.data();
        if (!d?.email) return;
        if (typeof d.email === 'string' && d.email.trim().toLowerCase() === 'anonymous') return;
        rows.push({ id: doc.id, ...d });
      });
      rows.sort((a, b) => ((a.name || "").toLowerCase() < (b.name || "").toLowerCase() ? -1 : 1));
      setUsersList(rows);
    } catch (err) {
      console.error("Failed to load users", err);
      toast.showToast("Failed to load users. See console.", "error");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadApps = async () => {
    setAppsLoading(true);
    try {
      const appsRef = collection(db, "apps");
      const snap = await getDocs(appsRef);
      const rows: SimpleApp[] = [];
      snap.forEach((docu) => {
        const d = docu.data();
        rows.push({
          id: d.id,
          name: d.name,
          url: d.url,
          description: d.description || '',
          icon: d.icon || 'Calculator',
          badge: d.badge || '',
          gradient: d.gradient || '',
          freeAllowed: d.freeAllowed ?? true,
          disabled: d.disabled,
          firestoreId: docu.id,
        });
      });
      setAppsList(rows);
    } catch (err) {
      console.error("Error loading apps:", err);
      toast.showToast("Failed to load apps. See console.", "error");
    } finally {
      setAppsLoading(false);
    }
  };

  const handleAddApp = async () => {
    if (!newApp.id || !newApp.name || !newApp.url) {
      toast.showToast('Please fill in ID, Name and URL', 'error');
      return;
    }
    try {
      setAppsLoading(true);
      const appsRef = collection(db, 'apps');
      const docRef = await addDoc(appsRef, {
        id: newApp.id,
        name: newApp.name,
        url: newApp.url,
        icon: newApp.icon || 'Calculator',
        freeAllowed: newApp.freeAllowed ?? true,
        gradient: newApp.gradient || '',
        disabled: newApp.disabled ?? false,
        badge: newApp.badge || '',
        createdAt: new Date(),
      });
      setAppsList(prev => [...prev, { id: newApp.id as string, name: newApp.name as string, url: newApp.url as string, firestoreId: docRef.id, icon: newApp.icon || 'Calculator', badge: newApp.badge || '', gradient: newApp.gradient || '', freeAllowed: newApp.freeAllowed ?? true, disabled: newApp.disabled ?? false }]);
      setNewApp({ id: '', name: '', url: '' });
      setShowNewAppForm(false);
      toast.showToast('App created', 'success');
    } catch (err) {
      console.error('Error creating app', err);
      toast.showToast('Failed to create app. See console.', 'error');
    } finally {
      setAppsLoading(false);
    }
  };

  const handleToggleAppDisabled = async (app: SimpleApp) => {
    if (!app.firestoreId) return;
    try {
      setAppsLoading(true);
      const ref = doc(db, 'apps', app.firestoreId);
      await updateDoc(ref, { disabled: !app.disabled });
      setAppsList(prev => prev.map(a => a.firestoreId === app.firestoreId ? ({...a, disabled: !a.disabled}) : a));
    } catch (err) {
      console.error('Error toggling app', err);
      toast.showToast('Failed to update app. See console.', 'error');
    } finally {
      setAppsLoading(false);
    }
  };

  const handleDeleteApp = async (app: SimpleApp) => {
    if (!confirm('Delete app?')) return;
    if (!app.firestoreId) return;
    try {
      setAppsLoading(true);
      await deleteDoc(doc(db, 'apps', app.firestoreId));
      setAppsList(prev => prev.filter(a => a.firestoreId !== app.firestoreId));
      toast.showToast('App deleted', 'success');
    } catch (err) {
      console.error('Error deleting app', err);
      toast.showToast('Failed to delete app. See console.', 'error');
    } finally {
      setAppsLoading(false);
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
    <div className={`min-h-screen admin-dashboard ${theme === 'dark' ? 'bg-[#0a1628]' : 'bg-[#f8f9fa]'}`}>
      <style jsx>{`
        .admin-dashboard :where(*) {
          color: ${forcedTextColor} !important;
        }
        .admin-dashboard a {
          color: #0B5394 !important;
        }
        .admin-dashboard .force-light-text {
          color: #ffffff !important;
        }
        .admin-dashboard .force-light-text svg {
          color: inherit !important;
        }
        .admin-dashboard .force-dark-text {
          color: ${theme === 'dark' ? '#111827' : 'inherit'} !important;
        }
      `}</style>
      <Header />

      <main className={`max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
        <div className="mb-8">
          <h1
            className={`text-3xl font-bold admin-heading no-text-clip ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
            style={{
              color: forcedTextColor,
              opacity: 1,
              WebkitTextFillColor: forcedTextColor,
              WebkitBackgroundClip: 'initial',
              backgroundClip: 'initial',
            }}
          >
            Admin Dashboard
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>System analytics and user management</p>
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
                    {analytics.recentEvents.length === 0 ? (
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

        {/* Analytics Events Modal */}
        {showAnalytics && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowAnalytics(false)} />
            <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-lg w-full max-w-4xl mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Analytics Events</h3>
                <button className="text-sm text-gray-600 dark:text-gray-300" onClick={() => setShowAnalytics(false)}>Close</button>
              </div>
              <div className="overflow-auto max-h-96">
                {analyticsLoadingEvents ? (
                  <p className="text-gray-600 dark:text-gray-300">Loading events...</p>
                ) : analyticsEventsList.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-300">No events found.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="py-2 pr-4">ID</th>
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Application</th>
                        <th className="py-2 pr-4">Timestamp</th>
                        <th className="py-2 pr-4">Metadata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsEventsList.map((e) => (
                        <tr key={e.id} className="border-b border-gray-100 dark:border-slate-700">
                          <td className="py-2 pr-4 text-xs text-gray-600 dark:text-gray-300">{e.id}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">{e.eventType}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">{e.application}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">{e.timestamp}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200"><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(e.metadata || {}, null, 2)}</pre></td>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <button
            onClick={() => { if (!exportLoading) handleExportUsers(); }}
            disabled={exportLoading}
            className={`inline-flex items-center justify-center gap-2 force-light-text text-white font-semibold py-3 px-6 rounded-lg transition-colors cursor-pointer ${exportLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            style={{ backgroundColor: '#0B5394' }}
            onMouseEnter={(e) => { if (!exportLoading) e.currentTarget.style.backgroundColor = '#094170'; }}
            onMouseLeave={(e) => { if (!exportLoading) e.currentTarget.style.backgroundColor = '#0B5394'; }}
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            {exportLoading ? 'Exporting...' : 'Export User Data'}
          </button>

          <button
            className="inline-flex items-center justify-center gap-2 force-light-text text-white font-semibold py-3 px-6 rounded-lg transition-colors cursor-pointer"
            style={{ backgroundColor: '#0B5394' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#094170'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0B5394'}
            onClick={async () => {
              if (analyticsLoadingEvents) return;
              setShowAnalyticsModal(true);
              if (analyticsEventsList.length === 0) {
                setAnalyticsLoadingEvents(true);
                try {
                  const eventsRef = collection(db, "analytics");
                  const q = query(eventsRef, orderBy("timestamp", "desc"));
                  const snapshot = await getDocs(q);
                  const rows: Array<Record<string, any>> = [];
                  snapshot.forEach((doc) => {
                    const d = doc.data();
                    rows.push({
                      id: doc.id,
                      eventType: d.eventType || "",
                      application: d.application || d.metadata?.appId || "",
                      metadata: d.metadata || {},
                      timestamp: d.timestamp && d.timestamp.toDate ? d.timestamp.toDate().toISOString() : (d.timestamp ? String(d.timestamp) : ""),
                    });
                  });
                  setAnalyticsEventsList(rows);
                } catch (err) {
                  console.error("Error fetching analytics events:", err);
                  alert("Failed to load analytics events. See console for details.");
                } finally {
                  setAnalyticsLoadingEvents(false);
                }
              }
            }}
          >
            <ChartBarIcon className="h-5 w-5" />
            {analyticsLoadingEvents ? 'Loading...' : 'View Analytics Events'}
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200 dark:border-slate-700">
          <nav className="flex space-x-4" aria-label="Tabs">
            <button onClick={() => setCurrentTab('site')} className={`py-2 px-3 -mb-px ${currentTab === 'site' ? 'border-b-2 border-slate-900 dark:border-slate-200 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>Site Stats</button>
            <button onClick={() => setCurrentTab('users')} className={`py-2 px-3 -mb-px ${currentTab === 'users' ? 'border-b-2 border-slate-900 dark:border-slate-200 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>Manage Users</button>
            <button onClick={() => setCurrentTab('apps')} className={`py-2 px-3 -mb-px ${currentTab === 'apps' ? 'border-b-2 border-slate-900 dark:border-slate-200 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>Manage Applications</button>
          </nav>
        </div>

        {currentTab === 'site' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className={`${theme === 'dark' ? 'bg-slate-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`}>
                <h3 className="text-gray-600 dark:text-gray-300 text-sm font-semibold uppercase">Total Users</h3>
                <p className="text-3xl font-bold mt-2" style={{color: '#0B5394'}}>{stats.totalUsers}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {stats.paidUsers} paid • {stats.freeUsers} free
                </p>
              </div>

              <div className={`${theme === 'dark' ? 'bg-slate-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`}>
                <h3 className="text-gray-600 dark:text-gray-300 text-sm font-semibold uppercase">Active Users</h3>
                <p className="text-3xl font-bold mt-2" style={{color: '#0B5394'}}>{analytics.monthlyActiveUsers}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {analytics.dailyActiveUsers} daily • {analytics.weeklyActiveUsers} weekly
                </p>
              </div>

              <div className={`${theme === 'dark' ? 'bg-slate-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`}>
                <h3 className="text-gray-600 dark:text-gray-300 text-sm font-semibold uppercase">Total Queries</h3>
                <p className="text-3xl font-bold mt-2" style={{color: '#0B5394'}}>{stats.totalQueries}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Avg {stats.averageQueriesPerUser} per user
                </p>
              </div>

              <div className={`${theme === 'dark' ? 'bg-slate-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`}>
                <h3 className="text-gray-600 dark:text-gray-300 text-sm font-semibold uppercase">Total Events</h3>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats.totalEvents}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Tracked analytics events</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* User Tier Distribution */}
              <div className={`${theme === 'dark' ? 'bg-slate-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-8`}>
                <h2 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>User Distribution by Tier</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Free Tier</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Paid Tier</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin Users</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
              <div className={`${theme === 'dark' ? 'bg-slate-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-8`}>
                <h2 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Most Used Applications</h2>
                <div className="space-y-3">
                  {analytics.topApps.length > 0 ? (
                    analytics.topApps.map((app, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">
                          {index + 1}. {app.name}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{backgroundColor: '#BFCDE0', color: '#6b5e62'}}>
                          {app.count} launches
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No data available yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Activity Summary */}
            <div className={`${theme === 'dark' ? 'bg-slate-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-8 mb-8`}>
              <h2 className="text-xl font-bold mb-6">Event Activity</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {analytics.recentEvents.map((event, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gradient-to-br from-slate-600 to-slate-700 border-slate-600' : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'}`}
                  >
                    <p className={`text-sm font-medium capitalize ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{event.type}</p>
                    <p className={`text-2xl font-bold mt-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{event.count}</p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>events</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Users Tab Content */}
        {currentTab === 'users' && (
          <div className={`${theme === 'dark' ? 'bg-slate-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6 mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Manage Users</h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Create, edit, and set tiers for users</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-blue-600 text-white force-light-text rounded">Create User</button>
                <button onClick={() => loadUsers()} className={`px-4 py-2 rounded ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-800'}`}>Refresh</button>
              </div>
            </div>

            

            <div>
              <h3 className="text-lg font-semibold mb-4">Users ({usersList.length})</h3>
              {usersLoading ? (
                <p>Loading...</p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Tier</th>
                        <th className="py-2 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((u) => (
                        <tr key={u.id} className="border-b border-gray-100 dark:border-slate-700">
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">{u.name || '(no name)'}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">{u.email}</td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">
                            <select
                              defaultValue={u.tier || 'free'}
                              onChange={async (e) => {
                                try {
                                  const fn = httpsCallable(firebaseFunctions, 'adminSetUserTier');
                                  await fn({ uid: u.id, tier: e.target.value });
                                  setUsersList(prev => prev.map(row => row.id === u.id ? { ...row, tier: e.target.value } : row));
                                  toast.showToast('Tier updated', 'success');
                                } catch (err) {
                                  console.error('Failed to set tier', err);
                                  toast.showToast('Failed to set tier. See console.', 'error');
                                }
                              }}
                              className="border rounded px-2 py-1 text-sm"
                            >
                              <option value="free">free</option>
                              <option value="paid">paid</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="px-3 py-1 bg-gray-100 dark:bg-slate-700 force-light-text rounded"
                              >
                                Details
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm('Delete user? This cannot be undone.')) return;
                                  try {
                                    const fn = httpsCallable(firebaseFunctions, 'adminDeleteUser');
                                    await fn({ uid: u.id });
                                    setUsersList(prev => prev.filter(row => row.id !== u.id));
                                    toast.showToast('User deleted', 'success');
                                  } catch (err) {
                                    console.error(err);
                                    toast.showToast('Failed to delete user. See console.', 'error');
                                  }
                                }}
                                className="px-3 py-1 bg-red-100 text-red-700 force-dark-text rounded"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Apps Tab Content */}
        {currentTab === 'apps' && (
          <div className={`${theme === 'dark' ? 'bg-slate-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6 mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Manage Applications</h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Create and manage applications</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => loadApps()} className={`px-4 py-2 rounded ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-800'}`}>Refresh</button>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Applications ({appsList.length})</h3>
                <div>
                  <button onClick={() => setShowNewAppForm(prev => !prev)} className="px-3 py-1 bg-blue-600 text-white force-light-text rounded">{showNewAppForm ? 'Cancel' : 'Create New App'}</button>
                </div>
              </div>

              {showNewAppForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => { setShowNewAppForm(false); setNewApp({ id: '', name: '', url: '' }); }} />
                  <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-lg w-full max-w-3xl mx-4 p-6 z-50">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Create Application</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="block">
                        <div className="text-sm text-gray-600 mb-1">App ID</div>
                        <input value={newApp.id || ''} onChange={(e) => setNewApp(prev => ({ ...prev, id: e.target.value }))} className="w-full border rounded px-3 py-2" />
                      </label>

                      <label className="block">
                        <div className="text-sm text-gray-600 mb-1">Application Name</div>
                        <input value={newApp.name || ''} onChange={(e) => setNewApp(prev => ({ ...prev, name: e.target.value }))} className="w-full border rounded px-3 py-2" />
                      </label>

                      <label className="block md:col-span-2">
                        <div className="text-sm text-gray-600 mb-1">Description</div>
                        <textarea value={newApp.description || ''} onChange={(e) => setNewApp(prev => ({ ...prev, description: e.target.value }))} className="w-full border rounded px-3 py-2 h-24" />
                      </label>

                      <label className="block md:col-span-2">
                        <div className="text-sm text-gray-600 mb-1">Badge Text</div>
                        <input value={newApp.badge || ''} onChange={(e) => setNewApp(prev => ({ ...prev, badge: e.target.value }))} className="w-full border rounded px-3 py-2" placeholder="e.g., AI-Powered, Personalized" />
                      </label>

                      <label className="block md:col-span-2">
                        <div className="text-sm text-gray-600 mb-1">Icon</div>
                        <input value={iconFilter} onChange={(e) => setIconFilter(e.target.value)} placeholder="Search icons..." className="mb-2 w-full border rounded px-3 py-2" />
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
                          {ICON_OPTIONS.filter(k => k.toLowerCase().includes(iconFilter.toLowerCase())).map((key) => (
                            <button key={key} type="button" onClick={() => setNewApp(prev => ({ ...prev, icon: key }))} className={`p-2 rounded border ${newApp?.icon === key ? 'ring-2 ring-offset-2 ring-slate-300 dark:ring-slate-600' : ''}`} title={key}>
                              <div className="w-6 h-6 flex items-center justify-center" style={{ background: getIconColor(key) }}>
                                <AppIcon icon={key} className="h-4 w-4 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </label>

                      <label className="block md:col-span-2">
                        <div className="text-sm text-gray-600 mb-1">URL</div>
                        <input value={newApp.url || ''} onChange={(e) => setNewApp(prev => ({ ...prev, url: e.target.value }))} className="w-full border rounded px-3 py-2" />
                      </label>

                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={newApp.freeAllowed ?? true} onChange={(e) => setNewApp(prev => ({ ...prev, freeAllowed: e.target.checked }))} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm text-gray-600">Allow free tier users</span>
                        </label>

                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={newApp.disabled ?? false} onChange={(e) => setNewApp(prev => ({ ...prev, disabled: e.target.checked }))} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm text-gray-600">Disabled (hide from portal)</span>
                        </label>
                      </div>

                      <label className="block md:col-span-2">
                        <div className="text-sm text-gray-600 mb-1">Gradient</div>
                        <div className="flex items-center gap-2">
                          <input type="color" value={createGradientMatches[0] || '#34d399'} onChange={(e) => {
                            const start = e.target.value;
                            const end = createGradientMatches[1] || '#10b981';
                            setNewApp(prev => ({ ...prev, gradient: `linear-gradient(135deg, ${start} 0%, ${end} 100%)` }));
                          }} />
                          <input type="color" value={createGradientMatches[1] || '#10b981'} onChange={(e) => {
                            const end = e.target.value;
                            const start = createGradientMatches[0] || '#34d399';
                            setNewApp(prev => ({ ...prev, gradient: `linear-gradient(135deg, ${start} 0%, ${end} 100%)` }));
                          }} />
                          <input value={newApp.gradient || ''} onChange={(e) => setNewApp(prev => ({ ...prev, gradient: e.target.value }))} className="flex-1 border rounded px-3 py-2" />
                          <div className="w-16 h-8 rounded ml-2" style={{ background: newApp.gradient || '#34d399' }} />
                        </div>
                      </label>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <button className="px-4 py-2 bg-gray-200 dark:bg-slate-700 dark:text-white rounded" onClick={() => { setShowNewAppForm(false); setNewApp({ id: '', name: '', url: '' }); }}>Cancel</button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleAddApp}>Create</button>
                    </div>
                  </div>
                </div>
              )}

              {appsLoading ? (
                <p>Loading apps...</p>
              ) : (
                <div className="space-y-4">
                  {appsList.map((app) => {
                    const port = (devSettings[app.id]?.port) || '3000';
                    const openLocalHref = 'http://localhost:' + port;
                    return (
                      <div key={app.firestoreId} className="border border-gray-100 dark:border-slate-700 rounded-lg p-4">
                        <div className="md:flex md:items-start md:gap-6">
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: app.gradient || '#0B5394' }}>
                              <AppIcon icon={app.icon} className="h-8 w-8 text-white" />
                            </div>
                          </div>

                          <div className="flex-1 mt-3 md:mt-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                  {app.name}
                                  <span className="text-xs text-gray-500 ml-2 inline-flex items-center">
                                    <span>{app.id}</span>
                                    <button type="button" onClick={async () => {
                                      try {
                                        const text = app.id || '';
                                        if (navigator.clipboard && text) {
                                          await navigator.clipboard.writeText(text);
                                        } else if (text) {
                                          const el = document.createElement('input');
                                          el.value = text;
                                          document.body.appendChild(el);
                                          el.select();
                                          document.execCommand('copy');
                                          el.remove();
                                        }
                                        toast.showToast('App ID copied', 'success');
                                      } catch (err) {
                                        console.error('Copy failed', err);
                                        toast.showToast('Failed to copy App ID', 'error');
                                      }
                                    }} className="ml-2 p-1 rounded bg-gray-100 dark:bg-slate-700" title="Copy App ID">
                                      <ClipboardDocumentIcon className="h-3 w-3 text-gray-700 dark:text-gray-200" />
                                    </button>
                                  </span>
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{app.description || 'No description'}</p>
                                <p className="text-xs text-gray-500 mt-2">URL: <a href={app.url} target="_blank" rel="noreferrer" className="underline">{app.url}</a></p>
                                {app.badge && <p className="text-xs inline-block mt-2 px-2 py-1 bg-slate-100 text-sm rounded force-dark-text" style={{color: '#6b5e62'}}>{app.badge}</p>}
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex flex-col items-end">
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => { setEditingAppFirestoreId(app.firestoreId || null); setEditingForm({ ...app }); }} className="px-3 py-1 bg-indigo-600 text-white force-light-text rounded">Edit</button>
                                    <button onClick={() => handleToggleAppDisabled(app)} className={`px-3 py-1 rounded force-light-text ${app.disabled ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                                      {app.disabled ? 'Offline' : 'Online'}
                                    </button>
                                  </div>
                                  {app.freeAllowed && (
                                    <div className="mt-2">
                                      <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-800 force-dark-text rounded text-sm font-medium">Free Allowed</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                            </div>

                            <div className="mt-2 flex items-center gap-4">
                              <div className="flex items-center gap-2 justify-end">
                                <input id={`dev-${app.id}`} type="checkbox" checked={(devSettings[app.id]?.enabled) ?? false} onChange={(e) => {
                                  const next = { ...devSettings, [app.id]: { ...(devSettings[app.id] || { enabled: false, port: '3000' }), enabled: e.target.checked } };
                                  setDevSettings(next); saveDevSettings(next);
                                }} className="h-4 w-4" />
                                <label htmlFor={`dev-${app.id}`} className="text-sm text-gray-600">Dev mode</label>
                              </div>

                              {devSettings[app.id]?.enabled && (
                                <div className="flex items-center gap-2">
                                  <input value={devSettings[app.id]?.port || ''} onChange={(e) => { const next = { ...devSettings, [app.id]: { ...(devSettings[app.id] || { enabled: true, port: '3000' }), port: e.target.value } }; setDevSettings(next); saveDevSettings(next); }} placeholder="port" className="border rounded px-2 py-1 w-24" />
                                  <a href={openLocalHref} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">Open local</a>
                                </div>
                              )}
                            </div>

                            {/* gradient preview details (optional) - removed color hex list */}

                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Edit Modal */}
                  {editingForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/40" onClick={() => { setEditingForm(null); setEditingAppFirestoreId(null); }} />
                      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-lg w-full max-w-3xl mx-4 p-6 z-50">
                        <h3 id="edit-app-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Application</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="block">
                            <div className="text-sm text-gray-600 mb-1">App ID</div>
                            <div className="flex items-center gap-2">
                              <input readOnly value={editingForm.id || ''} className="flex-1 border rounded px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white opacity-70" title="App ID is read-only" />
                              <button type="button" onClick={async () => {
                                try {
                                  const text = editingForm?.id || '';
                                  if (navigator.clipboard && text) {
                                    await navigator.clipboard.writeText(text);
                                  } else if (text) {
                                    const el = document.createElement('input');
                                    el.value = text;
                                    document.body.appendChild(el);
                                    el.select();
                                    document.execCommand('copy');
                                    el.remove();
                                  }
                                  toast.showToast('App ID copied', 'success');
                                } catch (err) {
                                  console.error('Copy failed', err);
                                  toast.showToast('Failed to copy App ID', 'error');
                                }
                              }} className="px-2 py-2 bg-gray-100 dark:bg-slate-700 rounded" title="Copy App ID">
                                <ClipboardDocumentIcon className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                              </button>
                            </div>
                          </label>

                          <label className="block">
                            <div className="text-sm text-gray-600 mb-1">Application Name</div>
                            <input id="edit-app-name" value={editingForm.name || ''} onChange={(e) => setEditingForm(prev => (prev ? { ...prev, name: e.target.value } : prev))} className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                          </label>

                          <label className="block md:col-span-2">
                            <div className="text-sm text-gray-600 mb-1">Description</div>
                            <textarea value={editingForm.description || ''} onChange={(e) => setEditingForm(prev => (prev ? { ...prev, description: e.target.value } : prev))} className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white h-24" />
                          </label>

                          <label className="block md:col-span-2">
                            <div className="text-sm text-gray-600 mb-1">Badge Text</div>
                            <input value={editingForm.badge || ''} onChange={(e) => setEditingForm(prev => (prev ? { ...prev, badge: e.target.value } : prev))} className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" placeholder="e.g., AI-Powered, Personalized" />
                          </label>

                          <label className="block md:col-span-2">
                            <div className="text-sm text-gray-600 mb-1">Icon</div>
                            <input value={iconFilter} onChange={(e) => setIconFilter(e.target.value)} placeholder="Search icons..." className="mb-2 w-full border rounded px-3 py-2" />
                            <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
                              {ICON_OPTIONS.filter(k => k.toLowerCase().includes(iconFilter.toLowerCase())).map((key) => (
                                <button key={key} type="button" onClick={() => setEditingForm(prev => (prev ? { ...prev, icon: key } : prev))} className={`p-2 rounded border ${editingForm?.icon === key ? 'ring-2 ring-offset-2 ring-slate-300 dark:ring-slate-600' : ''}`} title={key}>
                                  <div className="w-6 h-6 flex items-center justify-center" style={{ background: getIconColor(key) }}>
                                    <AppIcon icon={key} className="h-4 w-4 text-white" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </label>

                          <label className="block md:col-span-2">
                            <div className="text-sm text-gray-600 mb-1">URL</div>
                            <input value={editingForm.url || ''} onChange={(e) => setEditingForm(prev => (prev ? { ...prev, url: e.target.value } : prev))} className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                          </label>



                          <label className="flex items-center gap-2">
                            <input id="edit-app-free" type="checkbox" checked={editingForm.freeAllowed ?? true} onChange={(e) => setEditingForm(prev => (prev ? { ...prev, freeAllowed: e.target.checked } : prev))} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm text-gray-600">Allow free tier users</span>
                          </label>

                          {/* Free tier is shown as a badge on the listing; no separate status line */}

                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={editingForm.disabled ?? false} onChange={(e) => setEditingForm(prev => (prev ? { ...prev, disabled: e.target.checked } : prev))} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm text-gray-600">Disabled (hide from portal)</span>
                          </label>

                          <label className="block md:col-span-2">
                            <div className="text-sm text-gray-600 mb-1">Gradient</div>
                            <div className="flex items-center gap-2">
                              <input type="color" value={editingGradientMatches[0] || '#34d399'} onChange={(e) => {
                                const start = e.target.value;
                                const end = editingGradientMatches[1] || '#10b981';
                                setEditingForm(prev => (prev ? { ...prev, gradient: `linear-gradient(135deg, ${start} 0%, ${end} 100%)` } : prev));
                              }} />
                              <input type="color" value={editingGradientMatches[1] || '#10b981'} onChange={(e) => {
                                const end = e.target.value;
                                const start = editingGradientMatches[0] || '#34d399';
                                setEditingForm(prev => (prev ? { ...prev, gradient: `linear-gradient(135deg, ${start} 0%, ${end} 100%)` } : prev));
                              }} />
                              <input value={editingForm.gradient || ''} onChange={(e) => setEditingForm(prev => (prev ? { ...prev, gradient: e.target.value } : prev))} className="flex-1 border rounded px-3 py-2" />
                              <div className="w-16 h-8 rounded ml-2" style={{ background: editingForm.gradient || '#34d399' }} />
                            </div>
                          </label>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                          <button className="px-4 py-2 bg-gray-200 dark:bg-slate-700 dark:text-white rounded" onClick={() => { setEditingForm(null); setEditingAppFirestoreId(null); }}>Cancel</button>
                          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={async () => {
                            if (!editingForm) return;
                            try {
                              if (!editingAppFirestoreId) throw new Error('Missing app ref');
                              const ref = doc(db, 'apps', editingAppFirestoreId);
                              await updateDoc(ref, {
                                id: editingForm.id,
                                name: editingForm.name,
                                description: editingForm.description || '',
                                url: editingForm.url,
                                icon: editingForm.icon || 'Calculator',
                                freeAllowed: editingForm.freeAllowed ?? true,
                                gradient: editingForm.gradient || '',
                                badge: editingForm.badge || '',
                                disabled: editingForm.disabled ?? false,
                              });
                              // update local list
                              setAppsList(prev => prev.map(a => a.firestoreId === editingAppFirestoreId ? ({ ...a, ...(editingForm as SimpleApp) }) : a));
                              setEditingForm(null); setEditingAppFirestoreId(null);
                              toast.showToast('App updated', 'success');
                            } catch (err) {
                              console.error('Failed to save app', err);
                              toast.showToast('Failed to save app. See console.', 'error');
                            }
                          }}>Save Changes</button>
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        )}

        {selectedUser && (
          <UserInfoDialog
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onSaved={() => { setSelectedUser(null); loadUsers(); }}
          />
        )}

      </main>
    </div>
  );
}
