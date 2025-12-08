"use client";

import React from "react";
import { httpsCallable } from "firebase/functions";
import { functions as firebaseFunctions, auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/components/ToastProvider";

type UserDoc = {
  id: string;
  email?: string;
  name?: string;
  tier?: string;
  createdAt?: any;
};

export default function UserInfoDialog({
  user,
  onClose,
  onSaved,
}: {
  user: UserDoc | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [local, setLocal] = React.useState<UserDoc | null>(user);

  React.useEffect(() => setLocal(user), [user]);

  if (!user || !local) return null;

  const handleReset = async () => {
    if (!confirm("Reset password? A temporary password will be returned.")) return;
    try {
      const fn = httpsCallable(firebaseFunctions, "adminResetUserPassword");
      const res = await fn({ uid: local.id });
      const temp = res.data?.tempPassword;
      if (temp) {
        try {
          await navigator.clipboard.writeText(temp);
          toast.showToast("Temporary password copied to clipboard", "success");
        } catch (_) {
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

  const handleSendResetEmail = async () => {
    if (!local?.email) {
      toast.showToast("User has no email", "error");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, local.email);
      toast.showToast("Password reset email sent", "success");
    } catch (err) {
      console.error(err);
      toast.showToast("Failed to send reset email", "error");
    }
  };

  const handleSave = async () => {
    try {
      const fn = httpsCallable(firebaseFunctions, "adminUpdateUser");
      await fn({ uid: local.id, email: local.email, name: local.name });
      const fnTier = httpsCallable(firebaseFunctions, "adminSetUserTier");
      await fnTier({ uid: local.id, tier: local.tier });
      toast.showToast("User updated", "success");
      onSaved && onSaved();
    } catch (err) {
      console.error(err);
      toast.showToast("Failed to update user", "error");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete user? This cannot be undone.")) return;
    try {
      const fn = httpsCallable(firebaseFunctions, "adminDeleteUser");
      await fn({ uid: local.id });
      toast.showToast("User deleted", "success");
      onSaved && onSaved();
    } catch (err) {
      console.error(err);
      toast.showToast("Failed to delete user", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-xl w-full mx-4 p-6 z-50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">User Info</h3>
        <p className="text-sm text-gray-600 dark:text-slate-300">ID: {local.id}</p>
        <p className="text-sm text-gray-600 dark:text-slate-300">Created: {local.createdAt ? (local.createdAt?.seconds ? new Date(local.createdAt.seconds * 1000).toLocaleString() : String(local.createdAt)) : 'unknown'}</p>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <label className="block">
            <div className="text-sm font-medium text-gray-700 dark:text-slate-200">Email</div>
            <input className="mt-1 block w-full border rounded px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value={local.email || ''} onChange={(e) => setLocal({...local, email: e.target.value})} />
          </label>
          <label className="block">
            <div className="text-sm font-medium text-gray-700 dark:text-slate-200">Name</div>
            <input className="mt-1 block w-full border rounded px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value={local.name || ''} onChange={(e) => setLocal({...local, name: e.target.value})} />
          </label>
          <label className="block">
            <div className="text-sm font-medium text-gray-700 dark:text-slate-200">Tier</div>
            <select value={local.tier || 'free'} onChange={(e) => setLocal({...local, tier: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
              <option value="free">free</option>
              <option value="paid">paid</option>
              <option value="admin">admin</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 dark:bg-slate-700 dark:text-white rounded" onClick={onClose}>Close</button>
          <button className="px-4 py-2 bg-yellow-500 text-white rounded" onClick={handleReset}>Reset Password</button>
          {local.email && local.email !== "anonymous" && (
            <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={handleSendResetEmail}>Send Reset Email</button>
          )}
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSave}>Save</button>
          <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={handleDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
}
