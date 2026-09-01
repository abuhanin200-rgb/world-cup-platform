import * as SecureStore from "expo-secure-store";
import type { Member } from "@/types/member";

const MEMBER_CACHE_KEY = "altahaddi_member_snapshot_v1";

export async function readCachedMember(): Promise<Member | null> {
  try {
    const value = await SecureStore.getItemAsync(MEMBER_CACHE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<Member>;
    if (!parsed.id || !parsed.fullName) return null;
    return parsed as Member;
  } catch {
    return null;
  }
}

export async function writeCachedMember(member: Member) {
  try {
    await SecureStore.setItemAsync(MEMBER_CACHE_KEY, JSON.stringify(member));
  } catch {
    // Firebase Auth persistence remains authoritative. This cache is only an offline UX fallback.
  }
}

export async function clearCachedMember() {
  try {
    await SecureStore.deleteItemAsync(MEMBER_CACHE_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}
