import { apiJson } from "@/api/client";
import type { MemberAuthResponse } from "@/types/member";

export function loginMember(fullName: string, password: string) {
  return apiJson<MemberAuthResponse>("/api/member-auth/login", {
    method: "POST",
    body: JSON.stringify({ fullName: fullName.trim(), password: password.trim() }),
  });
}

export function registerMember(input: {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  favoriteTeam: string;
  teamEmoji: string;
}) {
  return apiJson<MemberAuthResponse>("/api/member-auth/register", {
    method: "POST",
    body: JSON.stringify({ ...input, email: input.email?.trim().toLowerCase() || "" }),
  });
}

export function getMemberAuthStatus() {
  return apiJson<{ ok: boolean; service?: string; method?: string }>("/api/member-auth/status");
}
