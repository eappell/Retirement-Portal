"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { functions as firebaseFunctions, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "@/components/ToastProvider";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const uid = params?.uid as string | undefined;
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tier, setTier] = useState("free");
  const toast = useToast();
  useEffect(() => {
    fetchUser();
  }, [uid]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      if (!uid) {
        throw new Error("missing uid");
      }
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setEmail((data as any).email || "");
        setName((data as any).name || "");
        setTier((data as any).tier || "free");
      } else {
        throw new Error("user doc not found");
      }
    } catch (err) {
      console.error(err);
      toast.showToast("Failed to load user", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const fn = httpsCallable(firebaseFunctions, "adminUpdateUser");
      await fn({ uid, email, name });
      toast.showToast("User updated", "success");
      router.push('/admin/manage-users');
    } catch (err) {
      console.error(err);
      toast.showToast("Failed to update user", "error");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete user? This cannot be undone.")) return;
    try {
      const fn = httpsCallable(firebaseFunctions, "adminDeleteUser");
      await fn({ uid });
      toast.showToast("User deleted", "success");
      router.push('/admin/manage-users');
    } catch (err) {
      console.error(err);
      toast.showToast("Failed to delete user", "error");
    }
  };

  const handleResetPassword = async () => {
    if (!confirm("Reset password? A temporary password will be returned.")) return;
    try {
      const fn = httpsCallable(firebaseFunctions, "adminResetUserPassword");
      const res = await fn({ uid });
      const temp = res.data?.tempPassword;
      if (temp) {
        try {
          await navigator.clipboard.writeText(temp);
          toast.showToast("Temporary password copied to clipboard", "success");
        } catch {
          toast.showToast("Temporary password: " + temp, "info");
        }
      } else {
        toast.showToast("Password reset but no temporary password returned.", "info");
      }
    } catch (err) {
      console.error(err);
      toast.showToast("Failed to reset password", "error");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Edit User</h1>
          <p className="text-sm text-gray-600">User ID: {uid}</p>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="bg-white p-6 rounded shadow">
            <div className="grid grid-cols-1 gap-4">
              <label className="block">
                <div className="text-sm font-medium">Email</div>
                <input className="mt-1 block w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>

              <label className="block">
                <div className="text-sm font-medium">Name</div>
                <input className="mt-1 block w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
              </label>

              <label className="block">
                <div className="text-sm font-medium">Tier</div>
                <select value={tier} onChange={(e) => setTier(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2">
                  <option value="free">free</option>
                  <option value="paid">paid</option>
                  <option value="admin">admin</option>
                </select>
              </label>

              <div className="flex gap-2 justify-end">
                <button className="px-4 py-2 bg-gray-100 rounded cursor-pointer" onClick={() => router.push('/admin/manage-users')}>Cancel</button>
                <button className="px-4 py-2 bg-yellow-500 text-white rounded cursor-pointer" onClick={handleResetPassword}>Reset Password</button>
                <button className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer" onClick={handleDelete}>Delete</button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer" onClick={handleSave}>Save</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
