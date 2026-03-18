import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  getAuthStatus,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  setAuthTokenProvider,
} from "@/lib/api";
import { firebaseEnabled, getFirebaseAuth, mapFirebaseUser } from "@/lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [hasUsers, setHasUsers] = useState(firebaseEnabled);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    if (firebaseEnabled) {
      const auth = getFirebaseAuth();

      setAuthTokenProvider(async () => {
        if (!auth?.currentUser) {
          return null;
        }
        return auth.currentUser.getIdToken();
      });

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!active) {
          return;
        }
        setCurrentUser(mapFirebaseUser(user));
        setReady(true);
      });

      return () => {
        active = false;
        setAuthTokenProvider(null);
        unsubscribe();
      };
    }

    const initialize = async () => {
      try {
        const status = await getAuthStatus();
        if (!active) {
          return;
        }
        setHasUsers(Boolean(status.has_users));

        try {
          const session = await getCurrentUser();
          if (!active) {
            return;
          }
          setCurrentUser(session?.user || null);
        } catch (error) {
          if (!active) {
            return;
          }
          setCurrentUser(null);
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    };

    const handleUnauthorized = () => {
      if (!active) {
        return;
      }
      setCurrentUser(null);
    };

    initialize();
    window.addEventListener("adps:unauthorized", handleUnauthorized);

    return () => {
      active = false;
      setAuthTokenProvider(null);
      window.removeEventListener("adps:unauthorized", handleUnauthorized);
    };
  }, []);

  const value = useMemo(
    () => ({
      ready,
      currentUser,
      hasUsers,
      authProvider: firebaseEnabled ? "firebase" : "local",
      register: async ({ name, email, password }) => {
        if (firebaseEnabled) {
          const auth = getFirebaseAuth();
          const credentials = await createUserWithEmailAndPassword(auth, email, password);
          if (name.trim()) {
            await updateProfile(credentials.user, { displayName: name.trim() });
          }
          const user = mapFirebaseUser({
            ...credentials.user,
            displayName: name.trim() || credentials.user.displayName,
          });
          setHasUsers(true);
          setCurrentUser(user);
          return user;
        }

        const session = await registerUser({ name, email, password });
        setHasUsers(true);
        setCurrentUser(session.user);
        return session.user;
      },
      login: async ({ email, password }) => {
        if (firebaseEnabled) {
          const auth = getFirebaseAuth();
          const credentials = await signInWithEmailAndPassword(auth, email, password);
          const user = mapFirebaseUser(credentials.user);
          setCurrentUser(user);
          return user;
        }

        const session = await loginUser({ email, password });
        setCurrentUser(session.user);
        return session.user;
      },
      logout: async () => {
        if (firebaseEnabled) {
          const auth = getFirebaseAuth();
          await signOut(auth);
          setCurrentUser(null);
          return;
        }

        await logoutUser();
        setCurrentUser(null);
      },
    }),
    [currentUser, hasUsers, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
