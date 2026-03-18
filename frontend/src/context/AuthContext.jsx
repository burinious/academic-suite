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
  const [hasUsers, setHasUsers] = useState(false);
  const [authProvider, setAuthProvider] = useState("local");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    const handleUnauthorized = () => {
      if (!active) {
        return;
      }
      setCurrentUser(null);
    };

    const initialize = async () => {
      let waitingForFirebaseState = false;

      try {
        const status = await getAuthStatus();
        if (!active) {
          return;
        }

        const resolvedProvider = firebaseEnabled && status.auth_provider === "firebase" ? "firebase" : "local";
        setAuthProvider(resolvedProvider);
        setHasUsers(Boolean(status.has_users));

        if (resolvedProvider === "firebase") {
          waitingForFirebaseState = true;
          const auth = getFirebaseAuth();

          setAuthTokenProvider(async () => {
            if (!auth?.currentUser) {
              return null;
            }
            return auth.currentUser.getIdToken();
          });

          unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!active) {
              return;
            }
            setCurrentUser(mapFirebaseUser(user));
            setReady(true);
          });

          return;
        }

        setAuthTokenProvider(null);

        try {
          const session = await getCurrentUser();
          if (!active) {
            return;
          }
          setCurrentUser(session?.user || null);
        } catch {
          if (!active) {
            return;
          }
          setCurrentUser(null);
        }
      } finally {
        if (active && !waitingForFirebaseState) {
          setReady(true);
        }
      }
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
      authProvider,
      register: async ({ name, email, password }) => {
        if (authProvider === "firebase") {
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
        if (authProvider === "firebase") {
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
        if (authProvider === "firebase") {
          const auth = getFirebaseAuth();
          await signOut(auth);
          setCurrentUser(null);
          return;
        }

        await logoutUser();
        setCurrentUser(null);
      },
    }),
    [authProvider, currentUser, hasUsers, ready],
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
