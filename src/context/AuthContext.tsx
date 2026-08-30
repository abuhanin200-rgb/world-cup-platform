"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  AppUser,
  getUserById,
  loginUser,
  LoginUserInput,
  registerUser,
  RegisterUserInput,
} from "@/lib/users";

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  isLoggedIn: boolean;
  login: (input: LoginUserInput) => Promise<AppUser>;
  register: (input: RegisterUserInput) => Promise<AppUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  secureSession: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "worldcup_2026_user_id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);

  async function refreshUser() {
    const storedUserId = localStorage.getItem(STORAGE_KEY);

    if (!storedUserId) {
      setUser(null);
      return;
    }

    const freshUser = await getUserById(storedUserId);

    if (!freshUser) {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      return;
    }

    setUser(freshUser);
  }


  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setFirebaseUid(firebaseUser?.uid || null);
    });
  }, []);

  useEffect(() => {
    async function loadStoredUser() {
      try {
        await refreshUser();
      } catch (error) {
        console.error("فشل تحميل جلسة العضو:", error);
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadStoredUser();
  }, []);

  async function login(input: LoginUserInput) {
    const loggedUser = await loginUser(input);

    localStorage.setItem(STORAGE_KEY, loggedUser.id);
    setUser(loggedUser);

    return loggedUser;
  }

  async function register(input: RegisterUserInput) {
    const newUser = await registerUser(input);

    localStorage.setItem(STORAGE_KEY, newUser.id);
    setUser(newUser);

    return newUser;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setFirebaseUid(null);
    void signOut(auth);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isLoggedIn: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
      secureSession: Boolean(user && firebaseUid === user.id),
    }),
    [user, loading, firebaseUid]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth يجب استخدامه داخل AuthProvider");
  }

  return context;
}