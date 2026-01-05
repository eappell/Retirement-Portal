"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { useTheme } from '@/lib/theme';
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
import { useAnalytics } from "@/lib/useAnalytics";
import { validateDob, validateRetirementAge, validateCurrentAnnualIncome, validateSpouseDob, validateLifeExpectancy } from '@/lib/profileValidation';

// US States for dropdown selection
const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

export default function ProfilePage() {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState(false);
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
  const [editableFilingStatus, setEditableFilingStatus] = useState<'single' | 'married' | null>(user?.filingStatus || null);
  const [editableSpouseDob, setEditableSpouseDob] = useState<string | null>(user?.spouseDob || null);
  const [editableSpouseName, setEditableSpouseName] = useState<string | null>(user?.spouseName || null);
  const [editableLifeExpectancy, setEditableLifeExpectancy] = useState<number | null>(user?.lifeExpectancy || null);
  const [editableCurrentState, setEditableCurrentState] = useState<string | null>(user?.currentState || null);
  const [editableRetirementState, setEditableRetirementState] = useState<string | null>(user?.retirementState || null);
  // Validation errors
  const [dobError, setDobError] = useState<string | null>(null);
  const [retirementAgeError, setRetirementAgeError] = useState<string | null>(null);
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [spouseDobError, setSpouseDobError] = useState<string | null>(null);
  const [lifeExpectancyError, setLifeExpectancyError] = useState<string | null>(null);
  const { trackEvent } = useAnalytics();
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
    // Check onboarding query param in the client
    try {
      const params = new URLSearchParams(window.location.search);
      setOnboarding(params.get('onboard') === 'true');
    } catch (_) {
      // ignore
    }
  }, []);

  useEffect(() => {
    setEditableDob(user?.dob || null);
    setEditableRetirementAge(user?.retirementAge || null);
    setEditableCurrentAnnualIncome(user?.currentAnnualIncome || null);
    setEditableFilingStatus(user?.filingStatus || null);
    setEditableSpouseDob(user?.spouseDob || null);
    setEditableSpouseName(user?.spouseName || null);
    setEditableLifeExpectancy(user?.lifeExpectancy || null);
    setEditableCurrentState(user?.currentState || null);
    setEditableRetirementState(user?.retirementState || null);
  }, [user]);

  // Validate fields when edited
  useEffect(() => {
    setDobError(validateDob(editableDob));
    setRetirementAgeError(validateRetirementAge(editableRetirementAge, editableDob));
    setIncomeError(validateCurrentAnnualIncome(editableCurrentAnnualIncome));
    setSpouseDobError(validateSpouseDob(editableSpouseDob, editableFilingStatus));
    setLifeExpectancyError(validateLifeExpectancy(editableLifeExpectancy, editableDob));
  }, [editableDob, editableRetirementAge, editableCurrentAnnualIncome, editableFilingStatus, editableSpouseDob, editableLifeExpectancy]);

  useEffect(() => {
    if (mounted && !user) {
      router.push("/");
    }
  }, [user, mounted, router]);

  // If user landed here as part of onboarding, and missing profile fields, open edit mode
  useEffect(() => {
    if (!mounted) return;
    if (onboarding) {
      if (!user?.dob || !user?.retirementAge || !user?.currentAnnualIncome) {
        setEditingProfile(true);
      } else {
        // If profile already complete, move to dashboard
        router.push('/dashboard');
      }
    }
  }, [onboarding, mounted, user, router]);

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
    <div className="min-h-screen" style={{ backgroundColor: theme === 'light' ? '#f3f4f6' : '#0f172a' }}>
      <Header />

      <main className="mx-auto px-4 py-12 sm:px-6 lg:px-8" style={{ maxWidth: 1340 }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ 
            color: theme === 'light' ? '#111827' : '#f8fafc',
            background: 'none',
            WebkitBackgroundClip: 'unset',
            WebkitTextFillColor: theme === 'light' ? '#111827' : '#f8fafc',
            backgroundClip: 'unset',
            fontFamily: "Segoe UI, -apple-system, Roboto, \"Helvetica Neue\", Arial, sans-serif"
          }}>My Profile</h1>
          <p className="mt-2" style={{ color: theme === 'light' ? '#4b5563' : '#94a3b8' }}>Manage your account settings and preferences</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left column: Account Info, Security, Preferences */}
          <div className="space-y-6">
            <div className={`${theme === 'light' ? 'bg-white text-gray-900' : 'bg-slate-800 text-slate-100'} rounded-lg shadow-lg p-6`}>
              <h2 className={`text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-slate-100'} mb-4`}>Account Information</h2>
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                <div className="py-3 flex justify-between items-start">
                  <div>
                    <p className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'}`}>Name</p>
                    <p className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-slate-300'}`}>Full name on account</p>
                  </div>
                  <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-slate-100'}`}>{user.displayName || '(no name)'}</div>
                </div>

                <div className="py-3 flex justify-between items-start">
                  <div>
                    <p className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'}`}>Email</p>
                    <p className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-slate-300'}`}>Primary account email</p>
                  </div>
                  <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-slate-100'}`}>{user.email}</div>
                </div>

                {user?.tier === 'admin' && (
                  <div className="py-3 flex justify-between items-start">
                    <div>
                      <p className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'}`}>Account ID</p>
                      <p className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-slate-300'}`}>Visible to admins only</p>
                    </div>
                    <div className={`text-sm font-mono ${theme === 'light' ? 'text-gray-700' : 'text-slate-100'} text-xs`}>{user.uid}</div>
                  </div>
                )}

                <div className="py-3 flex justify-between items-start">
                  <div>
                    <p className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'}`}>Account Created</p>
                  </div>
                  <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-slate-100'}`}>{new Date(user.metadata?.creationTime || "").toLocaleDateString()}</div>
                </div>

                <div className="py-3 flex justify-between items-start">
                  <div>
                    <p className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'}`}>Tier</p>
                  </div>
                  <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-slate-100'}`}>{user.tier || 'free'}</div>
                </div>
              </div>
            </div>

            {/* Security */}
            {!user.isAnonymous && (
              <div className={`${theme === 'light' ? 'bg-white text-gray-900' : 'bg-slate-800 text-slate-100'} rounded-lg shadow-lg p-6`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className={`text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-slate-100'}`}>Security</h2>
                  {!showPasswordForm && (
                    <button onClick={() => setShowPasswordForm(true)} className="text-indigo-600 hover:text-indigo-700 font-medium">Change Password</button>
                  )}
                </div>

                {showPasswordForm ? (
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Current Password</label>
                      <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={loading} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">New Password</label>
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm New Password</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>

                    <div className="flex gap-3">
                      <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors">{loading ? "Updating..." : "Update Password"}</button>
                      <button type="button" onClick={() => { setShowPasswordForm(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }} className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-6 rounded-lg transition-colors">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div style={{ color: theme === 'light' ? '#1f2937' : '#cbd5e1' }}>
                    <p className="mb-4">Secure your account with a strong password.</p>
                    <div style={{ backgroundColor: theme === 'light' ? '#eff6ff' : '#1e3a5f', borderColor: theme === 'light' ? '#bfdbfe' : '#3b82f6' }} className="border rounded-lg p-4">
                      <p className="text-sm" style={{ color: theme === 'light' ? '#1e3a8a' : '#93c5fd' }}>
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
            <div className={`${theme === 'light' ? 'bg-white text-gray-900' : 'bg-slate-800 text-slate-100'} rounded-lg shadow-lg p-6`}>
              <h2 className={`text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-slate-100'} mb-4`}>Preferences</h2>

              <div className="space-y-4">
                <div className="preference-row group flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                  <div>
                    <p className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-100'} dark:group-hover:text-white`}>Email Notifications</p>
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'} dark:group-hover:text-slate-300`}>Receive notifications about your account</p>
                  </div>
                  <button onClick={() => handlePreferencesChange("emailNotifications")} disabled={loading} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.emailNotifications ? "bg-indigo-600" : "bg-gray-300"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.emailNotifications ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="preference-row group flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                  <div>
                    <p className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-100'} dark:group-hover:text-white`}>Marketing Emails</p>
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'} dark:group-hover:text-slate-300`}>Hear about new features and updates</p>
                  </div>
                  <button onClick={() => handlePreferencesChange("marketingEmails")} disabled={loading} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.marketingEmails ? "bg-indigo-600" : "bg-gray-300"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.marketingEmails ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="preference-row group flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 opacity-50">
                  <div>
                    <p className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-100'} dark:group-hover:text-white`}>Two-Factor Authentication</p>
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-800' : 'text-slate-300'} dark:group-hover:text-slate-300`}>Coming soon</p>
                  </div>
                  <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Profile (editable) */}
          <div>
            {onboarding && editingProfile && (
              <div className="mb-4 rounded-lg border-l-4 border-indigo-600 bg-indigo-50 p-4 text-indigo-900">
                <p className="font-semibold">Complete your profile</p>
                <p className="text-sm">Tell us your Date of Birth, Retirement Age and Current Annual Income so we can tailor recommendations for you.</p>
              </div>
            )}

            <div className={`${theme === 'light' ? 'bg-white text-gray-900' : 'bg-slate-800 text-slate-100'} rounded-lg shadow-lg p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-slate-100'}`}>Profile</h2>
                {!editingProfile ? (
                  <button className="text-indigo-600" onClick={() => setEditingProfile(true)}>Edit</button>
                ) : (
                  <button className="text-gray-800" onClick={() => { setEditingProfile(false); setEditableName(user.displayName || ""); setEditableEmail(user.email || ""); setCurrentPasswordForEmail(""); }}>Cancel</button>
                )}
              </div>

              <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>We collect these profile details to pre-fill your information across our apps so you don’t need to re-enter them — used only to personalize recommendations and calculations.</p>

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
                    await updateDoc(doc(db, 'users', user.uid), { name: editableName, email: editableEmail, dob: editableDob, retirementAge: editableRetirementAge, currentAnnualIncome: editableCurrentAnnualIncome, filingStatus: editableFilingStatus, spouseDob: editableSpouseDob, spouseName: editableSpouseName, lifeExpectancy: editableLifeExpectancy, currentState: editableCurrentState, retirementState: editableRetirementState });
                    // Update AuthProvider managed profile too
                    try {
                      await updateUserProfile({ dob: editableDob, retirementAge: editableRetirementAge, currentAnnualIncome: editableCurrentAnnualIncome, filingStatus: editableFilingStatus, spouseDob: editableSpouseDob, spouseName: editableSpouseName, lifeExpectancy: editableLifeExpectancy, currentState: editableCurrentState, retirementState: editableRetirementState });
                    } catch (e) {
                      console.warn('Failed to update user profile in context', e);
                    }

                    setSuccess('Profile updated');
                    setEditingProfile(false);
                    setCurrentPasswordForEmail("");
                    if (onboarding) {
                      try {
                        const fieldsCompleted = [] as string[];
                        if (editableDob) fieldsCompleted.push('dob');
                        if (editableRetirementAge) fieldsCompleted.push('retirementAge');
                        if (editableCurrentAnnualIncome) fieldsCompleted.push('currentAnnualIncome');
                        await trackEvent({ eventType: 'onboarding_complete', application: 'portal', metadata: { fields_completed: fieldsCompleted, userId: user.uid } });
                      } catch (e) {
                        // Analytics failure shouldn't prevent navigation
                        console.warn('Failed to track onboarding event', e);
                      }
                      // Redirect to dashboard now that onboarding profile is complete
                      router.push('/dashboard');
                    }
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to update profile');
                  } finally {
                    setLoading(false);
                  }
                }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <label className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} sm:text-right`}>Name</label>
                    <div>
                      <input value={editableName} onChange={(e) => setEditableName(e.target.value)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-slate-700 text-slate-100'}`} />
                    </div>

                    <label className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} sm:text-right`}>Date of Birth</label>
                    <div>
                      <input type="date" value={editableDob || ''} onChange={(e) => setEditableDob(e.target.value || null)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-slate-700 text-slate-100'}`} />
                      {dobError && <p className="text-xs text-red-600 mt-1">{dobError}</p>}
                    </div>

                    <label className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} sm:text-right`}>Retirement Age</label>
                    <div>
                      <input type="number" min={40} max={100} value={editableRetirementAge ?? ''} onChange={(e) => setEditableRetirementAge(e.target.value ? Number(e.target.value) : null)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-slate-700 text-slate-100'}`} />
                      {retirementAgeError && <p className="text-xs text-red-600 mt-1">{retirementAgeError}</p>}
                    </div>

                    <label className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} sm:text-right`}>Current Annual Income</label>
                    <div>
                      <input type="number" step="0.01" value={editableCurrentAnnualIncome ?? ''} onChange={(e) => setEditableCurrentAnnualIncome(e.target.value ? Number(e.target.value) : null)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-slate-700 text-slate-100'}`} />
                      {incomeError && <p className="text-xs text-red-600 mt-1">{incomeError}</p>}
                    </div>

                    <label className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} sm:text-right`}>Life Expectancy</label>
                    <div>
                      <input type="number" min={50} max={120} value={editableLifeExpectancy ?? ''} onChange={(e) => setEditableLifeExpectancy(e.target.value ? Number(e.target.value) : null)} placeholder="Default: 90" className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-slate-700 text-slate-100'}`} />
                      {lifeExpectancyError && <p className="text-xs text-red-600 mt-1">{lifeExpectancyError}</p>}
                    </div>

                    <label className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} sm:text-right`}>Current State</label>
                    <div>
                      <select value={editableCurrentState || ''} onChange={(e) => setEditableCurrentState(e.target.value || null)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-slate-700 text-slate-100'}`}>
                        <option value="">Select...</option>
                        {Object.entries(US_STATES).map(([code, name]) => (
                          <option key={code} value={code}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <label className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} sm:text-right`}>Planned Retirement State</label>
                    <div>
                      <select value={editableRetirementState || ''} onChange={(e) => setEditableRetirementState(e.target.value || null)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-slate-700 text-slate-100'}`}>
                        <option value="">Select...</option>
                        {Object.entries(US_STATES).map(([code, name]) => (
                          <option key={code} value={code}>{name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Leave blank if same as current state</p>
                    </div>

                    <label className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} sm:text-right`}>Filing Status</label>
                    <div>
                      <select value={editableFilingStatus || ''} onChange={(e) => setEditableFilingStatus(e.target.value as 'single' | 'married' || null)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-slate-700 text-slate-100'}`}>
                        <option value="">Select...</option>
                        <option value="single">Single</option>
                        <option value="married">Married Filing Jointly</option>
                      </select>
                    </div>

                    {editableFilingStatus === 'married' && (
                      <>
                        <label className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} sm:text-right`}>Spouse Name</label>
                        <div>
                          <input type="text" value={editableSpouseName || ''} onChange={(e) => setEditableSpouseName(e.target.value || null)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-slate-700 text-slate-100'}`} />
                        </div>

                        <label className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} sm:text-right`}>Spouse DOB</label>
                        <div>
                          <input type="date" value={editableSpouseDob || ''} onChange={(e) => setEditableSpouseDob(e.target.value || null)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-slate-700 text-slate-100'}`} />
                          {spouseDobError && <p className="text-xs text-red-600 mt-1">{spouseDobError}</p>}
                        </div>
                      </>
                    )}

                    <label className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} sm:text-right`}>Email</label>
                    <div>
                      <input value={editableEmail} onChange={(e) => setEditableEmail(e.target.value)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-slate-700 text-slate-100'}`} />
                      {editableEmail !== user.email && (
                        <div className="mt-2">
                          <label className={`block text-sm font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} mb-2`}>Current Password (required to change email)</label>
                          <input type="password" value={currentPasswordForEmail} onChange={(e) => setCurrentPasswordForEmail(e.target.value)} className={`w-full px-4 py-3 border border-gray-300 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-slate-700 text-slate-100'}`} />
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
                      <button type="submit" disabled={loading || !!dobError || !!retirementAgeError || !!incomeError || !!spouseDobError || !!lifeExpectancyError} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg">Save</button>
                      <button type="button" onClick={() => { setEditingProfile(false); setEditableName(user.displayName || ''); setEditableEmail(user.email || ''); setCurrentPasswordForEmail(''); }} className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-6 rounded-lg">Cancel</button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-2">
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} text-sm`}>Name: {user.displayName || '(no name)'}</p>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} text-sm`}>Email: {user.email}</p>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} text-sm`}>Date of Birth: {user.dob || '(not set)'}</p>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} text-sm`}>Retirement Age: {user.retirementAge ?? '(not set)'}</p>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} text-sm`}>Current Annual Income: {typeof user.currentAnnualIncome === 'number' ? `$${user.currentAnnualIncome.toLocaleString()}` : '(not set)'}</p>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} text-sm`}>Filing Status: {user.filingStatus || '(not set)'}</p>
                  {user.spouseName && <p className={`${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} text-sm`}>Spouse: {user.spouseName}</p>}
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} text-sm`}>Current State: {user.currentState || '(not set)'}</p>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} text-sm`}>Planned Retirement State: {user.retirementState || '(not set)'}</p>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-slate-200'} text-sm`}>Life Expectancy: {user.lifeExpectancy ?? '(not set)'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
