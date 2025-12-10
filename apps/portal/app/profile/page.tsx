"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updateProfile,
} from "firebase/auth";
import { sendEmailVerification } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/components/ToastProvider";

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateUserProfile } = useAuth();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Password change form
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Preferences
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    marketingEmails: false,
    twoFactorEnabled: false,
  });

  // Editable profile fields
  const [editingProfile, setEditingProfile] = useState(false);
  const [editableName, setEditableName] = useState(user?.displayName || "");
  const [editableEmail, setEditableEmail] = useState(user?.email || "");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");
  const [editableDob, setEditableDob] = useState<string | null>(user?.dob || null);
  const [editableRetirementAge, setEditableRetirementAge] = useState<number | null>(user?.retirementAge || null);
  const [editableCurrentAnnualIncome, setEditableCurrentAnnualIncome] = useState<number | null>(user?.currentAnnualIncome || null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setEditableDob(user?.dob || null);
    setEditableRetirementAge(user?.retirementAge || null);
    setEditableCurrentAnnualIncome(user?.currentAnnualIncome || null);
  }, [user]);

  useEffect(() => {
    if (mounted && !user) {
      router.push("/");
    }
  }, [user, mounted, router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error("Please fill in all fields");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("New passwords don't match");
      }

      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      if (!user?.email) {
        throw new Error("Email not found");
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser!, credential);

      // Update password
      await updatePassword(auth.currentUser!, newPassword);

      setSuccess("Password updated successfully!");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesChange = async (
    key: keyof typeof preferences
  ) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(newPreferences);
    setLoading(true);

    try {
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          preferences: newPreferences,
        });
        setSuccess("Preferences updated!");
      }
    } catch (err) {
      setError("Failed to update preferences");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Account Information */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Account Information</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
                Email Address
              </label>
              {editingProfile ? (
                <input
                  type="email"
                  value={editableEmail}
                  onChange={(e) => setEditableEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-100"
                />
              ) : (
                <input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-100"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
                Account ID
              </label>
              <input
                type="text"
                value={user.uid}
                disabled
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-100 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
                Account Created
              </label>
              <input
                type="text"
                value={new Date(user.metadata?.creationTime || "").toLocaleDateString()}
                disabled
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Edit profile (name / email) */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Profile</h2>
            {!editingProfile ? (
              <button className="text-indigo-600" onClick={() => setEditingProfile(true)}>Edit</button>
            ) : (
              <button className="text-gray-600" onClick={() => { setEditingProfile(false); setEditableName(user.displayName || ""); setEditableEmail(user.email || ""); setCurrentPasswordForEmail(""); }}>Cancel</button>
            )}
          </div>

          {editingProfile ? (
            <form onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setSuccess("");
              setLoading(true);
              try {
                // If email changed, require current password for reauth
                if (editableEmail !== user.email) {
                  if (!currentPasswordForEmail) throw new Error('Provide current password to change email');
                  const credential = EmailAuthProvider.credential(user.email || '', currentPasswordForEmail);
                  await reauthenticateWithCredential(auth.currentUser!, credential);
                  await updateEmail(auth.currentUser!, editableEmail);
                  // Send verification link to the new email
                  try {
                    await sendEmailVerification(auth.currentUser!);
                    toast.showToast('Verification email sent to new address', 'success');
                  } catch (err) {
                    console.error(err);
                    toast.showToast('Failed to send verification email', 'error');
                  }
                }

                // Update display name
                if (editableName !== user.displayName) {
                  await updateProfile(auth.currentUser!, { displayName: editableName });
                }

                // Update Firestore user doc
                await updateDoc(doc(db, 'users', user.uid), { name: editableName, email: editableEmail, dob: editableDob, retirementAge: editableRetirementAge, currentAnnualIncome: editableCurrentAnnualIncome });
                // Update AuthProvider managed profile too
                try {
                  await updateUserProfile({ dob: editableDob, retirementAge: editableRetirementAge, currentAnnualIncome: editableCurrentAnnualIncome });
                } catch (e) {
                  console.warn('Failed to update user profile in context', e);
                }

                setSuccess('Profile updated');
                setEditingProfile(false);
                setCurrentPasswordForEmail("");
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to update profile');
              } finally {
                setLoading(false);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">Name</label>
                  <input value={editableName} onChange={(e) => setEditableName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">Date of Birth</label>
                  <input type="date" value={editableDob || ''} onChange={(e) => setEditableDob(e.target.value || null)} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">Retirement Age</label>
                  <input type="number" min={40} max={100} value={editableRetirementAge ?? ''} onChange={(e) => setEditableRetirementAge(e.target.value ? Number(e.target.value) : null)} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">Current Annual Income</label>
                  <input type="number" step="0.01" value={editableCurrentAnnualIncome ?? ''} onChange={(e) => setEditableCurrentAnnualIncome(e.target.value ? Number(e.target.value) : null)} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">Email</label>
                  <input value={editableEmail} onChange={(e) => setEditableEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-100" />
                </div>
                {editableEmail !== user.email && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">Current Password (required to change email)</label>
                    <input type="password" value={currentPasswordForEmail} onChange={(e) => setCurrentPasswordForEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-100" />
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg">Save</button>
                  <button type="button" onClick={() => { setEditingProfile(false); setEditableName(user.displayName || ''); setEditableEmail(user.email || ''); setCurrentPasswordForEmail(''); }} className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-6 rounded-lg">Cancel</button>
                </div>
              </div>
            </form>
          ) : (
            <div>
              <p className="text-sm text-gray-700 dark:text-slate-200">Name: {user.displayName || '(no name)'}</p>
              <p className="text-sm text-gray-700 dark:text-slate-200">Email: {user.email}</p>
            </div>
          )}
        </div>

        {/* Password Management */}
        {!user.isAnonymous && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Security</h2>
              {!showPasswordForm && (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Change Password
                </button>
              )}
            </div>

            {showPasswordForm ? (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-6 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
                <div className="text-gray-600 dark:text-slate-300">
                <p className="mb-4">Secure your account with a strong password.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    ✓ Use a unique password<br />
                    ✓ Include uppercase and lowercase letters<br />
                    ✓ Include numbers and special characters
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preferences */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Preferences</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-100">Email Notifications</p>
                <p className="text-sm text-gray-600 dark:text-slate-300">Receive notifications about your account</p>
              </div>
              <button
                onClick={() => handlePreferencesChange("emailNotifications")}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.emailNotifications ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.emailNotifications ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-100">Marketing Emails</p>
                <p className="text-sm text-gray-600 dark:text-slate-300">Hear about new features and updates</p>
              </div>
              <button
                onClick={() => handlePreferencesChange("marketingEmails")}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.marketingEmails ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.marketingEmails ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 opacity-50">
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-100">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600 dark:text-slate-300">Coming soon</p>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
