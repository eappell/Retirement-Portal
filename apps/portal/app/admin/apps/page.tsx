"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useUserTier } from "@/lib/useUserTier";
import { Header } from "@/components/Header";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import * as HeroiconsOutline from "@heroicons/react/24/outline";
import { AppIcon, getIconColor } from "@/components/icon-map";

// UI icons used directly in this component
const {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  PowerIcon,
  CheckCircleIcon,
} = HeroiconsOutline;

// Build the full list of available Heroicons for app selection
// Format icon names for display (e.g., "AcademicCapIcon" -> "Academic Cap")
function formatIconName(name: string): string {
  return name
    .replace(/Icon$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

// Get all outline icons and create the AVAILABLE_ICONS array
const AVAILABLE_ICONS = Object.entries(HeroiconsOutline)
  .filter(([name]) => name.endsWith('Icon'))
  .map(([name, component]) => ({
    name: formatIconName(name),
    component: component as React.ComponentType<React.SVGProps<SVGSVGElement>>,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

interface App {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  freeAllowed: boolean;
  firestoreId?: string; // Firestore document ID
  gradient?: string;
  disabled?: boolean;
  badge?: string;
  sortOrder?: number;
}

// Dev mode settings stored in localStorage
interface DevSettings {
  [appId: string]: {
    enabled: boolean;
    port: string;
  };
}

const DEV_SETTINGS_KEY = 'portal-dev-settings';

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
  // Dispatch event so other components (like dashboard) can react
  window.dispatchEvent(new CustomEvent('dev-settings-changed', { detail: settings }));
}

export default function AdminAppsPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // redirect to admin dashboard where Manage Applications is now a tab
    router.replace('/admin/dashboard');
  }, [router]);
  const { tier, loading: tierLoading } = useUserTier();
  const [mounted, setMounted] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<App | null>(null);
  const [editGradientStart, setEditGradientStart] = useState('#34d399');
  const [editGradientEnd, setEditGradientEnd] = useState('#10b981');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newApp, setNewApp] = useState<Partial<App>>({
    id: "",
    name: "",
    description: "",
    url: "",
    icon: "Calculator",
    freeAllowed: true,
    gradient: ''
    , disabled: false,
    badge: "",
    sortOrder: 0,
  });
  const [newGradientStart, setNewGradientStart] = useState('#34d399');
  const [newGradientEnd, setNewGradientEnd] = useState('#10b981');
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [updateLoadingAppId, setUpdateLoadingAppId] = useState<string | null>(null);
  
  // Dev mode state
  const [devSettings, setDevSettings] = useState<DevSettings>({});
  const [showDevPopover, setShowDevPopover] = useState<string | null>(null);

  // Icon search state
  const [iconSearch, setIconSearch] = useState("");
  const [editIconSearch, setEditIconSearch] = useState("");

  // Filter icons based on search
  const filteredIcons = AVAILABLE_ICONS.filter(icon =>
    icon.name.toLowerCase().includes(iconSearch.toLowerCase())
  );
  const filteredEditIcons = AVAILABLE_ICONS.filter(icon =>
    icon.name.toLowerCase().includes(editIconSearch.toLowerCase())
  );

  useEffect(() => {
    setMounted(true);
    // Load dev settings from localStorage
    setDevSettings(getDevSettings());
  }, []);

  const updateDevSetting = (appId: string, enabled: boolean, port: string) => {
    const newSettings = {
      ...devSettings,
      [appId]: { enabled, port }
    };
    setDevSettings(newSettings);
    saveDevSettings(newSettings);
  };

  useEffect(() => {
    if (mounted && (!user || tierLoading)) {
      return;
    }

    if (mounted && user && tier !== "admin") {
      router.push("/dashboard");
    }
  }, [user, tier, tierLoading, mounted, router]);

  // Load apps from Firestore
  useEffect(() => {
    if (mounted && user && tier === "admin") {
      loadApps();
    }
  }, [mounted, user, tier]);

  const loadApps = async () => {
    try {
      setLoading(true);
      setError("");
      const appsRef = collection(db, "apps");
      const snapshot = await getDocs(appsRef);
      const loadedApps: App[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedApps.push({
          id: data.id,
          name: data.name,
          description: data.description,
          url: data.url,
          icon: data.icon,
          freeAllowed: data.freeAllowed,
          gradient: data.gradient,
          disabled: data.disabled,
          badge: data.badge,
          sortOrder: data.sortOrder || 0,
          firestoreId: doc.id,
        });
      });

      // Sort by sortOrder, then by name
      loadedApps.sort((a, b) => {
        const orderA = a.sortOrder || 0;
        const orderB = b.sortOrder || 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });

      setApps(loadedApps);
    } catch (err) {
      console.error("Error loading apps:", err);
      setError("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (app: App) => {
    setIsEditing(app.id);
    setEditForm({ ...app });
    if (app.gradient) {
      const match = app.gradient.match(/#(?:[0-9a-fA-F]{3}){1,2}/g);
      if (match && match.length >= 2) {
        setEditGradientStart(match[0]);
        setEditGradientEnd(match[1]);
      }
    }
  };

  const handleSave = async (appId: string) => {
    if (!editForm) return;

    try {
      setError("");
      if (editForm.firestoreId) {
        const appDocRef = doc(db, "apps", editForm.firestoreId);
        await updateDoc(appDocRef, {
          name: editForm.name,
          description: editForm.description,
          url: editForm.url,
          icon: editForm.icon,
          freeAllowed: editForm.freeAllowed,
            gradient: editForm.gradient || `linear-gradient(135deg, ${editGradientStart} 0%, ${editGradientEnd} 100%)`,
            disabled: !!editForm.disabled,          badge: editForm.badge || "",        sortOrder: Number(editForm.sortOrder) || 0,});
      }

      setApps(apps.map((app) => (app.id === appId ? editForm : app)).sort((a, b) => {
        const orderA = a.id === appId ? (editForm.sortOrder || 0) : (a.sortOrder || 0);
        const orderB = b.id === appId ? (editForm.sortOrder || 0) : (b.sortOrder || 0);
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      }));
      setSuccess("Application updated successfully");
      setTimeout(() => setSuccess(""), 3000);
      setIsEditing(null);
      setEditForm(null);
    } catch (err) {
      console.error("Error saving app:", err);
      setError("Failed to save application");
    }
  };

  const handleCancel = () => {
    setIsEditing(null);
    setEditForm(null);
    setError("");
  };

  const handleDelete = async (appId: string, firestoreId?: string) => {
    if (confirm(`Are you sure you want to delete this app?`)) {
      try {
        setError("");
        if (firestoreId) {
          await deleteDoc(doc(db, "apps", firestoreId));
        }

        setApps(apps.filter((app) => app.id !== appId));
        setSuccess("Application deleted successfully");
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        console.error("Error deleting app:", err);
        setError("Failed to delete application");
      }
    }
  };

  const handleToggleDisabled = async (appId: string, firestoreId?: string, currentDisabled?: boolean) => {
    setError("");
    setUpdateLoadingAppId(appId);
    try {
      if (firestoreId) {
        const appDocRef = doc(db, "apps", firestoreId);
        await updateDoc(appDocRef, { disabled: !currentDisabled });
      }

      setApps((prev) => prev.map((app) => (app.id === appId ? { ...app, disabled: !currentDisabled } : app)));
      setSuccess(`Application ${currentDisabled ? 're-enabled' : 'taken offline'} successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error("Error toggling app status:", err);
      setError("Failed to update application status");
    } finally {
      setUpdateLoadingAppId(null);
    }
  };

  const handleAddNew = async () => {
    if (!newApp.id || !newApp.name || !newApp.url) {
      setError("Please fill in all required fields");
      return;
    }

    // Check for duplicate ID
    if (apps.some((app) => app.id === newApp.id)) {
      setError("An app with this ID already exists");
      return;
    }

    try {
      setError("");
      const appsRef = collection(db, "apps");
      const docRef = await addDoc(appsRef, {
        id: newApp.id,
        name: newApp.name,
        description: newApp.description || "",
        url: newApp.url,
        icon: newApp.icon || "📦",
        freeAllowed: newApp.freeAllowed ?? true,
        gradient: newApp.gradient || `linear-gradient(135deg, ${newGradientStart} 0%, ${newGradientEnd} 100%)`,
        disabled: !!newApp.disabled,
        badge: newApp.badge || "",
        sortOrder: Number(newApp.sortOrder) || 0,
        createdAt: new Date(),
      });

      const app: App = {
        id: newApp.id as string,
        name: newApp.name as string,
        description: newApp.description || "",
        url: newApp.url as string,
        icon: newApp.icon || "📦",
        freeAllowed: newApp.freeAllowed ?? true,
        gradient: newApp.gradient || `linear-gradient(135deg, ${newGradientStart} 0%, ${newGradientEnd} 100%)`,
        disabled: !!newApp.disabled,
        badge: newApp.badge || "",
        sortOrder: Number(newApp.sortOrder) || 0,
        firestoreId: docRef.id,
      };

      setApps([...apps, app].sort((a, b) => {
        const orderA = a.sortOrder || 0;
        const orderB = b.sortOrder || 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      }));
      setSuccess("Application created successfully");
      setTimeout(() => setSuccess(""), 3000);
      setShowNewForm(false);
      setNewApp({
        id: "",
        name: "",
        description: "",
        url: "",
        icon: "📦",
        freeAllowed: true,
        gradient: '',
        badge: "",
        sortOrder: 0,
      });
      setNewGradientStart('#34d399');
      setNewGradientEnd('#10b981');
    } catch (err) {
      console.error("Error creating app:", err);
      setError("Failed to create application");
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
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 px-4 py-3 rounded-lg" style={{backgroundColor: '#E8E3DF', borderColor: '#D2CAC1', borderWidth: '1px', color: '#6b5e62'}}>
            {success}
          </div>
        )}

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold admin-heading">Application Manager</h1>
            <p className="mt-2 admin-subheading">Manage available applications and their settings</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 dark:text-white rounded cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => setShowNewForm(true)}
              className="inline-flex items-center gap-2 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              style={{backgroundColor: '#0B5394'}}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#094170'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0B5394'}
            >
              <PlusIcon className="h-5 w-5" />
              Add Application
            </button>
          </div>
        </div>

        {/* New App Form */}
        {showNewForm && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Application</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App ID (unique identifier) *
                </label>
                <input
                  type="text"
                  value={newApp.id || ""}
                  onChange={(e) => setNewApp({ ...newApp, id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., income-estimator"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Name *
                </label>
                <input
                  type="text"
                  value={newApp.name || ""}
                  onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Monthly Retirement Income AI"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={newApp.description || ""}
                onChange={(e) => setNewApp({ ...newApp, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Brief description of what this app does"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={newApp.badge || ""}
                  onChange={(e) => setNewApp({ ...newApp, badge: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., AI-Powered, Personalized, Data-Driven"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order (Low to High)
                </label>
                <input
                  type="number"
                  value={newApp.sortOrder || 0}
                  onChange={(e) => setNewApp({ ...newApp, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  value={newApp.url || ""}
                  onChange={(e) => setNewApp({ ...newApp, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., http://localhost:5173/"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <input
                  type="text"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder="Search icons..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 mb-2"
                />
                <div className="flex gap-2 flex-wrap max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-md bg-gray-50">
                  {filteredIcons.slice(0, 100).map((iconOption) => {
                    const IconComponent = iconOption.component;
                    return (
                      <button
                        key={iconOption.name}
                        type="button"
                        onClick={() => setNewApp({ ...newApp, icon: iconOption.name })}
                        className={`p-2 rounded border-2 transition-all ${
                          newApp.icon === iconOption.name
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                        title={iconOption.name}
                        style={{
                          borderColor: newApp.icon === iconOption.name ? '#0B5394' : undefined,
                          backgroundColor: newApp.icon === iconOption.name ? '#BFCDE0' : undefined,
                        }}
                      >
                        <IconComponent className="h-6 w-6" style={{color: '#6b5e62'}} />
                      </button>
                    );
                  })}
                  {filteredIcons.length === 0 && (
                    <p className="text-sm text-gray-500 p-2">No icons found matching "{iconSearch}"</p>
                  )}
                  {filteredIcons.length > 100 && (
                    <p className="text-xs text-gray-400 w-full text-center pt-2">Showing first 100 of {filteredIcons.length} icons. Refine your search.</p>
                  )}
                </div>
                {newApp.icon && (
                  <p className="text-xs text-gray-500 mt-1">Selected: {newApp.icon}</p>
                )}
              </div>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newApp.freeAllowed ?? true}
                  onChange={(e) => setNewApp({ ...newApp, freeAllowed: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Allow free tier users</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newApp.disabled ?? false}
                  onChange={(e) => setNewApp({ ...newApp, disabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Disabled (hide from portal)</span>
              </label>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Gradient</label>
              <div className="flex items-center gap-3">
                <input aria-label="Gradient start color" type="color" className="w-10 h-8 p-0 border-0" value={newGradientStart} onChange={(e) => {
                  const start = e.target.value;
                  setNewGradientStart(start);
                  const end = newGradientEnd || '#10b981';
                  setNewApp({ ...newApp, gradient: `linear-gradient(135deg, ${start} 0%, ${end} 100%)` });
                }} />
                <input aria-label="Gradient end color" type="color" className="w-10 h-8 p-0 border-0" value={newGradientEnd} onChange={(e) => {
                  const end = e.target.value;
                  setNewGradientEnd(end);
                  const start = newGradientStart || '#34d399';
                  setNewApp({ ...newApp, gradient: `linear-gradient(135deg, ${start} 0%, ${end} 100%)` });
                }} />
                <input title="gradient-css" type="text" className="flex-1 px-3 py-2 border border-gray-300 rounded-md" placeholder="CSS gradient (optional)" value={newApp.gradient || ''} onChange={(e) => setNewApp({ ...newApp, gradient: e.target.value })} />
                <div className="w-24 h-8 rounded" style={{background: newApp.gradient || `linear-gradient(135deg, ${newGradientStart} 0%, ${newGradientEnd} 100%)`, backgroundImage: newApp.gradient || `linear-gradient(135deg, ${newGradientStart} 0%, ${newGradientEnd} 100%)`}} />
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" className="w-8 h-8 rounded" title="Green preset" onClick={() => {
                  const g = 'linear-gradient(135deg, #34d399 0%, #10b981 100%)';
                  setNewApp({ ...newApp, gradient: g }); setNewGradientStart('#34d399'); setNewGradientEnd('#10b981');
                }} style={{background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', backgroundImage: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)'}}></button>
                <button type="button" className="w-8 h-8 rounded" title="Blue preset" onClick={() => {
                  const g = 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)';
                  setNewApp({ ...newApp, gradient: g }); setNewGradientStart('#60a5fa'); setNewGradientEnd('#3b82f6');
                }} style={{background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', backgroundImage: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)'}}></button>
                <button type="button" className="w-8 h-8 rounded" title="Red preset" onClick={() => {
                  const g = 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)';
                  setNewApp({ ...newApp, gradient: g }); setNewGradientStart('#fca5a5'); setNewGradientEnd('#ef4444');
                }} style={{background: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)', backgroundImage: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)'}}></button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddNew}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                <CheckIcon className="h-5 w-5" />
                Create App
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="inline-flex items-center gap-2 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Apps List */}
        <div className="space-y-4">
          {apps.map((app) => (
            <div key={app.id} className={`bg-white rounded-lg shadow-lg ${isEditing === app.id ? 'overflow-hidden' : 'overflow-visible'}`}>
              {isEditing === app.id && editForm ? (
                // Edit Mode
                <div className="p-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Edit Application</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        App ID
                      </label>
                      <input
                        type="text"
                        value={editForm.id}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Application Name
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Badge Text
                      </label>
                      <input
                        type="text"
                        value={editForm.badge || ""}
                        onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., AI-Powered, Personalized, Data-Driven"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sort Order (Low to High)
                      </label>
                      <input
                        type="number"
                        value={editForm.sortOrder || 0}
                        onChange={(e) => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL
                      </label>
                      <input
                        type="url"
                        value={editForm.url}
                        onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Icon
                      </label>
                      <input
                        type="text"
                        value={editIconSearch}
                        onChange={(e) => setEditIconSearch(e.target.value)}
                        placeholder="Search icons..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 mb-2"
                      />
                      <div className="flex gap-2 flex-wrap max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-md bg-gray-50">
                        {filteredEditIcons.slice(0, 100).map((iconOption) => {
                          const IconComponent = iconOption.component;
                          return (
                            <button
                              key={iconOption.name}
                              type="button"
                              onClick={() => setEditForm({ ...editForm, icon: iconOption.name })}
                              className={`p-2 rounded border-2 transition-all ${
                                editForm.icon === iconOption.name
                                  ? "border-blue-600 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300 bg-white"
                              }`}
                              title={iconOption.name}
                              style={{
                                borderColor: editForm.icon === iconOption.name ? '#0B5394' : undefined,
                                backgroundColor: editForm.icon === iconOption.name ? '#BFCDE0' : undefined,
                              }}
                            >
                              <IconComponent className="h-6 w-6" style={{color: '#6b5e62'}} />
                            </button>
                          );
                        })}
                        {filteredEditIcons.length === 0 && (
                          <p className="text-sm text-gray-500 p-2">No icons found matching "{editIconSearch}"</p>
                        )}
                        {filteredEditIcons.length > 100 && (
                          <p className="text-xs text-gray-400 w-full text-center pt-2">Showing first 100 of {filteredEditIcons.length} icons. Refine your search.</p>
                        )}
                      </div>
                      {editForm.icon && (
                        <p className="text-xs text-gray-500 mt-1">Selected: {editForm.icon}</p>
                      )}
                    </div>
                  </div>

                  <div className="mb-6 flex flex-col sm:flex-row items-center gap-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.freeAllowed}
                        onChange={(e) => setEditForm({ ...editForm, freeAllowed: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Allow free tier users</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!editForm.disabled}
                        onChange={(e) => setEditForm({ ...editForm, disabled: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Disabled (hide from portal)</span>
                    </label>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gradient</label>
                    <div className="flex items-center gap-3">
                      <input aria-label="Gradient start color" type="color" className="w-10 h-8 p-0 border-0" value={editGradientStart} onChange={(e) => {
                        const start = e.target.value;
                        setEditGradientStart(start);
                        const end = editGradientEnd || '#10b981';
                        setEditForm({ ...editForm!, gradient: `linear-gradient(135deg, ${start} 0%, ${end} 100%)` });
                      }} />
                      <input aria-label="Gradient end color" type="color" className="w-10 h-8 p-0 border-0" value={editGradientEnd} onChange={(e) => {
                        const end = e.target.value;
                        setEditGradientEnd(end);
                        const start = editGradientStart || '#34d399';
                        setEditForm({ ...editForm!, gradient: `linear-gradient(135deg, ${start} 0%, ${end} 100%)` });
                      }} />
                      <input title="gradient-css" type="text" className="flex-1 px-3 py-2 border border-gray-300 rounded-md" placeholder="CSS gradient (optional)" value={editForm?.gradient || ''} onChange={(e) => setEditForm({ ...editForm!, gradient: e.target.value })} />
                      <div className="w-24 h-8 rounded" style={{background: editForm?.gradient || `linear-gradient(135deg, ${editGradientStart} 0%, ${editGradientEnd} 100%)`, backgroundImage: editForm?.gradient || `linear-gradient(135deg, ${editGradientStart} 0%, ${editGradientEnd} 100%)`}} />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button type="button" className="w-8 h-8 rounded" title="Green preset" onClick={() => {
                        const g = 'linear-gradient(135deg, #34d399 0%, #10b981 100%)';
                        setEditForm({ ...editForm!, gradient: g }); setEditGradientStart('#34d399'); setEditGradientEnd('#10b981');
                      }} style={{background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', backgroundImage: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)'}}></button>
                      <button type="button" className="w-8 h-8 rounded" title="Blue preset" onClick={() => {
                        const g = 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)';
                        setEditForm({ ...editForm!, gradient: g }); setEditGradientStart('#60a5fa'); setEditGradientEnd('#3b82f6');
                      }} style={{background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', backgroundImage: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)'}}></button>
                      <button type="button" className="w-8 h-8 rounded" title="Red preset" onClick={() => {
                        const g = 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)';
                        setEditForm({ ...editForm!, gradient: g }); setEditGradientStart('#fca5a5'); setEditGradientEnd('#ef4444');
                      }} style={{background: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)', backgroundImage: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)'}}></button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSave(app.id)}
                      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      <CheckIcon className="h-5 w-5" />
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center gap-2 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="">
                          <div className="p-2 rounded-lg app-tile-icon">
                            <AppIcon icon={app.icon} appId={app.id} className="h-6 w-6" color={getIconColor(app.id || app.name)} />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">{app.name}</h3>
                            {app.disabled && (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">Disabled</span>
                            )}
                            {devSettings[app.id]?.enabled && (
                              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold">
                                🔧 Dev: localhost:{devSettings[app.id]?.port || '3000'}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600">{app.description}</p>
                          <div className="mt-2 flex gap-4 text-xs text-gray-500">
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                              {app.id}
                            </span>
                            <a
                              href={devSettings[app.id]?.enabled ? `http://localhost:${devSettings[app.id]?.port || '3000'}` : app.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-700 underline"
                            >
                              {devSettings[app.id]?.enabled ? `http://localhost:${devSettings[app.id]?.port || '3000'}` : app.url}
                            </a>
                            {app.freeAllowed && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                Free allowed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 items-start">
                      {/* Dev Mode Button */}
                      <div className="relative">
                        <button
                          onClick={() => setShowDevPopover(showDevPopover === app.id ? null : app.id)}
                          className={`inline-flex items-center gap-1 font-semibold py-2 px-3 rounded-lg transition-colors text-sm ${
                            devSettings[app.id]?.enabled 
                              ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                          style={{ color: devSettings[app.id]?.enabled ? undefined : '#374151' }}
                          title="Development Mode Settings"
                        >
                          🔧 Dev
                        </button>
                        {showDevPopover === app.id && (
                          <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 p-4 z-[9999]">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Dev Mode</span>
                              <button
                                onClick={() => setShowDevPopover(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={devSettings[app.id]?.enabled || false}
                                  onChange={(e) => updateDevSetting(
                                    app.id, 
                                    e.target.checked, 
                                    devSettings[app.id]?.port || '3000'
                                  )}
                                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-200">localhost:</span>
                              </label>
                              <input
                                type="text"
                                maxLength={5}
                                value={devSettings[app.id]?.port || '3000'}
                                onChange={(e) => updateDevSetting(
                                  app.id,
                                  devSettings[app.id]?.enabled || false,
                                  e.target.value
                                )}
                                placeholder="3000"
                                className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                              />
                            </div>
                            {devSettings[app.id]?.enabled && (
                              <p className="text-xs text-orange-600 dark:text-orange-400">
                                Portal will load: http://localhost:{devSettings[app.id]?.port || '3000'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleEdit(app)}
                        className="inline-flex items-center gap-2 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        style={{backgroundColor: '#0B5394'}}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#094170'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0B5394'}
                      >
                        <PencilIcon className="h-5 w-5" />
                        Edit
                      </button>
                          <button
                        onClick={() => handleDelete(app.id, app.firestoreId)}
                        className="inline-flex items-center gap-2 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        style={{backgroundColor: '#6b5e62'}}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a4e52'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b5e62'}
                      >
                        <TrashIcon className="h-5 w-5" />
                        Delete
                      </button>                    <button
                      onClick={() => handleToggleDisabled(app.id, app.firestoreId, !!app.disabled)}
                      disabled={updateLoadingAppId === app.id}
                      aria-label={app.disabled ? `Bring ${app.name} online` : `Take ${app.name} offline`}
                      title={app.disabled ? `Bring ${app.name} online` : `Take ${app.name} offline`}
                      data-testid={`toggle-disabled-${app.id}`}
                      className={`inline-flex items-center gap-2 ${app.disabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white font-semibold py-2 px-4 rounded-lg transition-colors`}
                    >
                      {updateLoadingAppId === app.id ? (
                        'Updating...'
                      ) : (
                        <>
                          {app.disabled ? (
                            <>
                              <PowerIcon className="h-5 w-5" aria-hidden="true" />
                              <span className="sr-only">Offline</span>
                              <span aria-hidden="true">Offline</span>
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                              <span className="sr-only">Online</span>
                              <span aria-hidden="true">Online</span>
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {apps.length === 0 && !showNewForm && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600 text-lg">No applications configured yet</p>
            <button
              onClick={() => setShowNewForm(true)}
              className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Add First Application
            </button>
          </div>
        )}

        {/* Note about changes */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> All changes are automatically saved to the database. If you want to use these applications in the portal, you'll need to update the APP_REGISTRY in the app pages to load apps dynamically from Firestore.
          </p>
        </div>
      </main>
    </div>
  );
}
