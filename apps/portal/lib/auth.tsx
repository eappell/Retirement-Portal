import {useEffect, useState, useCallback, useContext, createContext, ReactNode} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  signInAnonymously,
} from "firebase/auth";
import {setDoc, doc, getDoc} from "firebase/firestore";
import {auth, db} from "@/lib/firebase";

export interface User extends FirebaseUser {
  tier?: "free" | "paid" | "admin";
  // Optional profile fields available to apps
  dob?: string | null;
  retirementAge?: number | null;
  currentAnnualIncome?: number | null;
  filingStatus?: 'single' | 'married' | null;
  spouseDob?: string | null;
  spouseName?: string | null;
  lifeExpectancy?: number | null;
  currentState?: string | null;
  retirementState?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profile: { dob?: string | null; retirementAge?: number | null; currentAnnualIncome?: number | null; filingStatus?: 'single' | 'married' | null; spouseDob?: string | null; spouseName?: string | null; lifeExpectancy?: number | null; currentState?: string | null; retirementState?: string | null; }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({children}: {children: ReactNode}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (firebaseUser) {
            try {
              // Get user tier from Firestore
              const userDocRef = doc(db, "users", firebaseUser.uid);
              const userDocSnap = await getDoc(userDocRef);

              const userData = userDocSnap.data();
              const tier = (userData?.tier as "free" | "paid" | "admin") || "free";

              const dob = (userData?.dob as string) || null;
              const retirementAge = (userData?.retirementAge as number) || null;
              const currentAnnualIncome = (userData?.currentAnnualIncome as number) || null;
              const filingStatus = (userData?.filingStatus as 'single' | 'married') || null;
              const spouseDob = (userData?.spouseDob as string) || null;
              const spouseName = (userData?.spouseName as string) || null;
              const lifeExpectancy = (userData?.lifeExpectancy as number) || null;
              const currentState = (userData?.currentState as string) || null;
              const retirementState = (userData?.retirementState as string) || null;

              const newUser = {
                ...firebaseUser,
                tier,
                dob,
                retirementAge,
                currentAnnualIncome,
                filingStatus,
                spouseDob,
                spouseName,
                lifeExpectancy,
                currentState,
                retirementState,
              } as User;
              setUser(newUser);
              // Persist a compact portal user object for same-origin read
              try {
                localStorage.setItem(
                  'portalUser',
                  JSON.stringify({
                    userId: firebaseUser.uid,
                    email: firebaseUser.email,
                    tier,
                    dob,
                    retirementAge,
                    currentAnnualIncome,
                  })
                );
              } catch (err) {
                console.warn('Could not write portalUser to localStorage', err);
              }
              // Persist the role for child apps and other windows
              try {
                localStorage.setItem("userRole", tier);
              } catch (err) {
                console.warn("Could not write userRole to localStorage", err);
              }
            } catch (firestoreErr) {
              console.error("Error fetching user tier from Firestore:", firestoreErr);
              // Set user anyway, but with default tier
              const newUser2 = {
                ...firebaseUser,
                tier: "free",
                dob: null,
                retirementAge: null,
                currentAnnualIncome: null,
              } as User;
              setUser(newUser2);
              try {
                localStorage.setItem(
                  'portalUser',
                  JSON.stringify({
                    userId: firebaseUser.uid,
                    email: firebaseUser.email,
                    tier: 'free',
                    dob: null,
                    retirementAge: null,
                    currentAnnualIncome: null,
                  })
                );
              } catch (err) {
                console.warn('Could not write portalUser to localStorage', err);
              }
              try {
                localStorage.setItem("userRole", "free");
              } catch (err) {
                console.warn("Could not write userRole to localStorage", err);
              }
            }
          } else {
            setUser(null);
            try {
              localStorage.removeItem("userRole");
            } catch (err) {
              console.warn("Could not remove userRole from localStorage", err);
            }
            try {
              localStorage.removeItem('portalUser');
            } catch (err) {
              console.warn('Could not remove portalUser from localStorage', err);
            }
          }
        } catch (err) {
          console.error("Auth state change error:", err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Auth listener error:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const {uid} = userCredential.user;

      // Create user document in Firestore
      await setDoc(doc(db, "users", uid), {
        email,
        tier: "free",
        createdAt: new Date(),
        subscriptionExpiry: null,
        dob: null,
        retirementAge: null,
        currentAnnualIncome: null,
      });

      const newUserSignup = {...userCredential.user, tier: "free", dob: null, retirementAge: null, currentAnnualIncome: null} as User;
      setUser(newUserSignup);
      try {
        localStorage.setItem('portalUser', JSON.stringify({
          userId: newUserSignup.uid,
          email: newUserSignup.email,
          tier: newUserSignup.tier,
          dob: newUserSignup.dob,
          retirementAge: newUserSignup.retirementAge,
          currentAnnualIncome: newUserSignup.currentAnnualIncome,
        }));
      } catch (err) {
        console.warn('Could not write portalUser to localStorage', err);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Signup failed";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const loginAnonymously = useCallback(async () => {
    setError(null);
    try {
      const userCredential = await signInAnonymously(auth);
      const {uid} = userCredential.user;

      // Check if user doc exists, if not create it
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          email: "anonymous",
          tier: "free",
          createdAt: new Date(),
          subscriptionExpiry: null,
          dob: null,
          retirementAge: null,
          currentAnnualIncome: null,
        });
      }

      const newUserAnon = {...userCredential.user, tier: "free", dob: null, retirementAge: null, currentAnnualIncome: null} as User;
      setUser(newUserAnon);
      try {
        localStorage.setItem('portalUser', JSON.stringify({
          userId: newUserAnon.uid,
          email: newUserAnon.email,
          tier: newUserAnon.tier,
          dob: newUserAnon.dob,
          retirementAge: newUserAnon.retirementAge,
          currentAnnualIncome: newUserAnon.currentAnnualIncome,
        }));
      } catch (err) {
        console.warn('Could not write portalUser to localStorage', err);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Anonymous login failed";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Logout failed";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateUserProfile = useCallback(async (profile: { dob?: string | null; retirementAge?: number | null; currentAnnualIncome?: number | null; filingStatus?: 'single' | 'married' | null; spouseDob?: string | null; spouseName?: string | null; lifeExpectancy?: number | null; currentState?: string | null; retirementState?: string | null; }) => {
    setError(null);
    try {
      if (!auth.currentUser) throw new Error('Not authenticated');
      const uid = auth.currentUser.uid;
      await setDoc(doc(db, 'users', uid), profile, { merge: true });

      // Update local state and localStorage (portalUser)
      setUser((prev) => {
        const next = prev ? { ...prev, ...profile } as User : prev;
        try {
          const portalUser = {
            userId: next?.uid,
            email: next?.email,
            tier: next?.tier,
            dob: next?.dob || null,
            retirementAge: next?.retirementAge || null,
            currentAnnualIncome: next?.currentAnnualIncome || null,
            filingStatus: next?.filingStatus || null,
            spouseDob: next?.spouseDob || null,
            spouseName: next?.spouseName || null,
            lifeExpectancy: next?.lifeExpectancy || null,
            currentState: next?.currentState || null,
            retirementState: next?.retirementState || null,
          };
          localStorage.setItem('portalUser', JSON.stringify(portalUser));
        } catch (err) {
          console.warn('Could not persist portalUser to localStorage', err);
        }
        return next;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        signup,
        loginAnonymously,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
