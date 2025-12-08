"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { db, functions as firebaseFunctions } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

export default function ManageUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Array<any>>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [refreshKey]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const snap = await getDocs(usersRef);
      const rows: Array<any> = [];
      snap.forEach((doc) => {
        const d = doc.data();
        rows.push({ id: doc.id, ...d });
      });
      rows.sort((a, b) => {
        const an = (a.name || "").toLowerCase();
        const bn = (b.name || "").toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
      setUsers(rows);
    } catch (err) {
      console.error("Failed to load users", err);
      alert("Failed to load users. See console.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm("Delete user? This cannot be undone.")) return;
    try {
      const fn = httpsCallable(firebaseFunctions, "adminDeleteUser");
      await fn({ uid });
      alert("User deleted");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      alert("Failed to delete user. See console.");
    }
  };

  const handleResetPassword = async (uid: string) => {
    if (!confirm("Reset password for this user? A temporary password will be returned.")) return;
    try {
      const fn = httpsCallable(firebaseFunctions, "adminResetUserPassword");
      const res = await fn({ uid });
      const temp = res.data?.tempPassword;
      if (temp) {
        // Copy to clipboard if available
        try {
          await navigator.clipboard.writeText(temp);
          alert("Temporary password copied to clipboard: " + temp);
        } catch (e) {
          alert("Temporary password: " + temp);
        }
      } else {
        alert("Password reset but no temp password returned.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reset password. See console.");
    }
  };

  const handleSetTier = async (uid: string, tier: string) => {
    try {
      const fn = httpsCallable(firebaseFunctions, "adminSetUserTier");
      await fn({ uid, tier });
      alert("Tier updated");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      alert("Failed to set tier. See console.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
            <p className="text-gray-600 mt-2">Create, edit, delete, and manage user tiers</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="px-4 py-2 bg-gray-200 rounded cursor-pointer"
            >
              Refresh
            </button>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 bg-gray-200 rounded cursor-pointer"
            >
              Back
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Create New User</h2>
          <CreateUserInline onCreated={() => setRefreshKey((k) => k + 1)} />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Users ({users.length})</h2>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Tier</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4">{u.name || '(no name)'}</td>
                      <td className="py-2 pr-4">{u.email}</td>
                      <td className="py-2 pr-4">
                        <select
                          defaultValue={u.tier || 'free'}
                          onChange={(e) => handleSetTier(u.id, e.target.value)}
                          className="border rounded px-2 py-1"
                        >
                          <option value="free">free</option>
                          <option value="paid">paid</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-1 bg-gray-100 rounded cursor-pointer" onClick={() => router.push(`/admin/manage-users/edit/${u.id}`)}>Edit</button>
                          <button className="px-2 py-1 bg-yellow-100 rounded cursor-pointer" onClick={() => handleResetPassword(u.id)}>Reset Password</button>
                          <button className="px-2 py-1 bg-red-100 rounded cursor-pointer" onClick={() => handleDelete(u.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function CreateUserInline({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [tier, setTier] = useState("free");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e?: any) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const fn = httpsCallable(firebaseFunctions, "adminCreateUser");
      await fn({ email, password, name, tier });
      alert("User created");
      setEmail("");
      setPassword("");
      setName("");
      setTier("free");
      onCreated();
    } catch (err) {
      console.error(err);
      alert("Failed to create user. See console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="border rounded px-3 py-2" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="border rounded px-3 py-2" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="border rounded px-3 py-2" />
      <div className="flex items-center gap-2">
        <select value={tier} onChange={(e) => setTier(e.target.value)} className="border rounded px-2 py-2">
          <option value="free">free</option>
          <option value="paid">paid</option>
          <option value="admin">admin</option>
        </select>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer">
          {loading ? 'Creating...' : 'Create'}
        </button>
      </div>
    </form>
  );
}
