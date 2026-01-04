"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { db, functions as firebaseFunctions } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useToast } from "@/components/ToastProvider";
import UserInfoDialog from "@/components/UserInfoDialog";

export default function ManageUsersPage() {
  const router = useRouter();

  useEffect(() => {
    // redirect to admin dashboard where Manage Users is now a tab
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold admin-heading">Manage Users</h1>
          <p className="mt-2 admin-subheading">This page has moved into the Admin Dashboard as a tab. Redirecting...</p>
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
  const toast = useToast();

  const handleCreate = async (e?: any) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const fn = httpsCallable(firebaseFunctions, "adminCreateUser");
      await fn({ email, password, name, tier });
      toast.showToast("User created", "success");
      setEmail("");
      setPassword("");
      setName("");
      setTier("free");
      onCreated();
    } catch (err) {
      console.error(err);
      toast.showToast("Failed to create user. See console.", "error");
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
