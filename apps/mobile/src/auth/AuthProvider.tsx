import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth";
import * as Haptics from "expo-haptics";
import { loginMember } from "@/api/memberAuth";
import { auth } from "@/firebase/client";
import { loadMemberProfile } from "@/firebase/memberProfile";
import { clearCachedMember, readCachedMember, writeCachedMember } from "@/auth/memberCache";
import type { Member } from "@/types/member";

type AuthContextValue = {
  member: Member | null;
  loading: boolean;
  login: (fullName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function cacheProfile(profile: Member | null) {
  if (profile) {
    await writeCachedMember(profile);
  } else {
    await clearCachedMember();
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setMember(null);
      await clearCachedMember();
      return;
    }

    const profile = await loadMemberProfile(uid);
    setMember(profile);
    await cacheProfile(profile);
  }, []);

  useEffect(() => {
    let active = true;

    void readCachedMember().then((cached) => {
      if (active && cached) setMember(cached);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          if (active) setMember(null);
          return;
        }

        try {
          const profile = await loadMemberProfile(firebaseUser.uid);
          if (active) setMember(profile);
          await cacheProfile(profile);
        } catch {
          const cached = await readCachedMember();
          if (active) {
            setMember(cached?.id === firebaseUser.uid ? cached : null);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (fullName: string, password: string) => {
    const result = await loginMember(fullName, password);
    await signInWithCustomToken(auth, result.customToken);
    setMember(result.user);
    await writeCachedMember(result.user);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    await clearCachedMember();
    setMember(null);
    await Haptics.selectionAsync();
  }, []);

  const value = useMemo(
    () => ({ member, loading, login, logout, refresh }),
    [member, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth يجب أن يعمل داخل AuthProvider");
  return value;
}
