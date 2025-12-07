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
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  CubeIcon,
  SparklesIcon,
  BoltIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  CalculatorIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  HomeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  ShoppingCartIcon,
  HeartIcon,
  BellIcon,
  ChartPieIcon,
  CalendarIcon,
  BookmarkIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

// Available HeroIcons for app selection
const AVAILABLE_ICONS = [
  { name: "Calculator", component: CalculatorIcon },
  { name: "Chart Bar", component: ChartBarIcon },
  { name: "Currency Dollar", component: CurrencyDollarIcon },
  { name: "Credit Card", component: CreditCardIcon },
  { name: "Globe", component: GlobeAltIcon },
  { name: "Rocket", component: RocketLaunchIcon },
  { name: "Building", component: BuildingOfficeIcon },
  { name: "Home", component: HomeIcon },
  { name: "User Group", component: UserGroupIcon },
  { name: "Document", component: DocumentTextIcon },
  { name: "Chat", component: ChatBubbleLeftIcon },
  { name: "Shopping", component: ShoppingCartIcon },
  { name: "Cube", component: CubeIcon },
  { name: "Sparkles", component: SparklesIcon },
  { name: "Bolt", component: BoltIcon },
  { name: "Heart", component: HeartIcon },
  { name: "Bell", component: BellIcon },
  { name: "Chart Pie", component: ChartPieIcon },
  { name: "Calendar", component: CalendarIcon },
  { name: "Bookmark", component: BookmarkIcon },
  { name: "Check Circle", component: CheckCircleIcon },
  { name: "Clipboard", component: ClipboardDocumentIcon },
  { name: "Code", component: CodeBracketIcon },
  { name: "Cog", component: Cog6ToothIcon },
];

interface App {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  freeAllowed: boolean;
  firestoreId?: string; // Firestore document ID
}

export default function AdminAppsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { tier, loading: tierLoading } = useUserTier();
  const [mounted, setMounted] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<App | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newApp, setNewApp] = useState<Partial<App>>({
    id: "",
    name: "",
    description: "",
    url: "",
    icon: "Calculator",
    freeAllowed: true,
  });
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

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
          firestoreId: doc.id,
        });
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
        });
      }

      setApps(apps.map((app) => (app.id === appId ? editForm : app)));
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
        createdAt: new Date(),
      });

      const app: App = {
        id: newApp.id as string,
        name: newApp.name as string,
        description: newApp.description || "",
        url: newApp.url as string,
        icon: newApp.icon || "📦",
        freeAllowed: newApp.freeAllowed ?? true,
        firestoreId: docRef.id,
      };

      setApps([...apps, app]);
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
      });
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
            <h1 className="text-3xl font-bold text-gray-900">Application Manager</h1>
            <p className="text-gray-600 mt-2">Manage available applications and their settings</p>
          </div>
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
                <div className="flex gap-2 flex-wrap">
                  {AVAILABLE_ICONS.map((iconOption) => {
                    const IconComponent = iconOption.component;
                    return (
                      <button
                        key={iconOption.name}
                        type="button"
                        onClick={() => setNewApp({ ...newApp, icon: iconOption.name })}
                        className={`p-2 rounded border-2 transition-all ${
                          newApp.icon === iconOption.name
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
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
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newApp.freeAllowed ?? true}
                  onChange={(e) => setNewApp({ ...newApp, freeAllowed: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Allow free tier users</span>
              </label>
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
            <div key={app.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
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
                        <div className="flex gap-2 flex-wrap">
                        {AVAILABLE_ICONS.map((iconOption) => {
                          const IconComponent = iconOption.component;
                          return (
                            <button
                              key={iconOption.name}
                              type="button"
                              onClick={() => setEditForm({ ...editForm, icon: iconOption.name })}
                              className={`p-2 rounded border-2 transition-all ${
                                editForm.icon === iconOption.name
                                  ? "border-blue-600 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
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
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.freeAllowed}
                        onChange={(e) => setEditForm({ ...editForm, freeAllowed: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Allow free tier users</span>
                    </label>
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
                        <div className="p-2 rounded-lg" style={{backgroundColor: '#BFCDE0'}}>
                          {(() => {
                            const iconData = AVAILABLE_ICONS.find(i => i.name === app.icon);
                            if (iconData) {
                              const IconComponent = iconData.component;
                              return <IconComponent className="h-8 w-8" style={{color: '#6b5e62'}} />;
                            }
                            return <CubeIcon className="h-8 w-8" style={{color: '#6b5e62'}} />;
                          })()}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{app.name}</h3>
                          <p className="text-gray-600">{app.description}</p>
                          <div className="mt-2 flex gap-4 text-xs text-gray-500">
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                              {app.id}
                            </span>
                            <a
                              href={app.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-700 underline"
                            >
                              {app.url}
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
                    <div className="flex gap-2">
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
