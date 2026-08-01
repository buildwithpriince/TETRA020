import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from '@/config';

interface AuthContextValue {
  user: User | null;
  displayName: string | null;
  photoURL: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  enabled: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let app: FirebaseApp | null = null;
function getApp(): FirebaseApp {
  if (!app) app = initializeApp(FIREBASE_CONFIG);
  return app;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!FIREBASE_ENABLED) {
      setLoading(false);
      return;
    }
    const auth = getAuth(getApp());
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        u.getIdToken().then((token) => sessionStorage.setItem('prism_auth_token', token));
      } else {
        sessionStorage.removeItem('prism_auth_token');
      }
    });
    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      displayName: user?.displayName ?? null,
      photoURL: user?.photoURL ?? null,
      loading,
      enabled: FIREBASE_ENABLED,
      signInWithGoogle: async () => {
        if (!FIREBASE_ENABLED) {
          // Demo-mode fallback: simulate a signed-in analyst.
          setUser({
            uid: 'demo-analyst',
            displayName: 'Demo Analyst',
            photoURL: null,
            email: 'analyst@demo.local',
          } as unknown as User);
          sessionStorage.setItem('prism_auth_token', 'demo-token');
          return;
        }
        const provider = new GoogleAuthProvider();
        await signInWithPopup(getAuth(getApp()), provider);
      },
      signOut: async () => {
        if (!FIREBASE_ENABLED) {
          setUser(null);
          sessionStorage.removeItem('prism_auth_token');
          return;
        }
        await firebaseSignOut(getAuth(getApp()));
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
