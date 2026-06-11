"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithPhone: (phone: string, name: string, country: string, favoriteTeam: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  loginWithPhone: async () => {},
  logout: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, "Users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const loginWithPhone = async (phone: string, name: string, country: string, favoriteTeam: string) => {
    // التأكد من أن رقم الجوال فريد ولا يتكرر
    const usersRef = collection(db, "Users");
    const q = query(usersRef, where("phone", "==", phone));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const existingUser = querySnapshot.docs[0].data() as UserProfile;
      setProfile(existingUser);
      // ملاحظة: في النسخة النهائية هنا يتم ربط التحقق من رقم الجوال (OTP)
      return;
    }

    const newUserId = "user_" + Math.random().toString(36).substr(2, 9);
    const newProfile: UserProfile = {
      id: newUserId,
      name,
      phone,
      country,
      favoriteTeam,
      points: 0,
      correctPredictionsCount: 0
    };

    await setDoc(doc(db, "Users", newUserId), newProfile);
    setProfile(newProfile);
  };

  const logout = async () => {
    await fbSignOut(auth);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithPhone, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);