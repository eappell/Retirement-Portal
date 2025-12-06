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
  tier?: "free" | "paid";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
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
              const tier = (userData?.tier as "free" | "paid") || "free";

              setUser({
                ...firebaseUser,
                tier,
              });
              // Persist the role for child apps and other windows
              try {
                localStorage.setItem("userRole", tier);
              } catch (err) {
                console.warn("Could not write userRole to localStorage", err);
              }
            } catch (firestoreErr) {
              console.error("Error fetching user tier from Firestore:", firestoreErr);
              // Set user anyway, but with default tier
              setUser({
                ...firebaseUser,
                tier: "free",
              });
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
      });

      setUser({...userCredential.user, tier: "free"});
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
        });
      }

      setUser({...userCredential.user, tier: "free"});
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
