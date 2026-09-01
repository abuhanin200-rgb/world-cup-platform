export type SocialProvider = "google" | "facebook" | "apple";

const PROVIDER_IDS: Record<SocialProvider, string> = {
  google: "google.com",
  facebook: "facebook.com",
  apple: "apple.com",
};

type LookupUser = {
  localId?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  providerUserInfo?: Array<{ providerId?: string; email?: string; displayName?: string }>;
};

export async function verifyFirebaseSocialSession(idToken: string, provider: SocialProvider) {
  const apiKey = String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
  if (!apiKey) throw new Error("FIREBASE_API_KEY_MISSING");

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );

  const data = (await response.json().catch(() => ({}))) as { users?: LookupUser[] };
  const user = data.users?.[0];
  if (!response.ok || !user) throw new Error("SOCIAL_SESSION_INVALID");

  const providerId = PROVIDER_IDS[provider];
  const providerInfo = user.providerUserInfo?.find((item) => item.providerId === providerId);
  if (!providerInfo) throw new Error("SOCIAL_PROVIDER_MISMATCH");

  const email = String(user.email || providerInfo.email || "").trim().toLowerCase();
  if (!email) throw new Error("SOCIAL_EMAIL_MISSING");

  // Google and Apple assert control over the returned email. Keep the explicit
  // verification check when Firebase exposes it; Facebook may not populate it.
  if ((provider === "google" || provider === "apple") && user.emailVerified === false) {
    throw new Error("SOCIAL_EMAIL_UNVERIFIED");
  }

  return {
    email,
    displayName: String(user.displayName || providerInfo.displayName || "").trim(),
    provider,
    providerId,
  };
}
