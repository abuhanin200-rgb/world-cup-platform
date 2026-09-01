import * as SecureStore from "expo-secure-store";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import type { Auth, Persistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

type ReactNativeStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

type ReactNativeAuthModule = typeof FirebaseAuth & {
  getReactNativePersistence?: (storage: ReactNativeStorage) => Persistence;
};

function secureKey(key: string) {
  return `altahaddi_fb_${Array.from(key, (char) => char.charCodeAt(0).toString(16).padStart(4, "0")).join("")}`;
}

const secureStoreAdapter: ReactNativeStorage = {
  getItem: (key) => SecureStore.getItemAsync(secureKey(key)),
  setItem: (key, value) => SecureStore.setItemAsync(secureKey(key), value),
  removeItem: (key) => SecureStore.deleteItemAsync(secureKey(key)),
};

const { getAuth, initializeAuth } = FirebaseAuth;
const getReactNativePersistence = (FirebaseAuth as unknown as ReactNativeAuthModule).getReactNativePersistence;

function isAlreadyInitializedError(error: unknown) {
  return Boolean(
    error
      && typeof error === "object"
      && "code" in error
      && (error as { code?: unknown }).code === "auth/already-initialized",
  );
}

function createNativeAuth(): Auth {
  if (typeof getReactNativePersistence !== "function") return getAuth(app);
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(secureStoreAdapter),
    });
  } catch (error) {
    if (!isAlreadyInitializedError(error)) throw error;
    return getAuth(app);
  }
}

// Browser preview uses Firebase's normal web persistence. iOS/Android use SecureStore.
const auth: Auth = Platform.OS === "web" ? getAuth(app) : createNativeAuth();

export { auth };
export const db = getFirestore(app);
